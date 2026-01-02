/**
 * ExecutionPlanner - Builds execution DAG for export orchestration.
 *
 * This module is responsible for:
 * - Determining which exporters are applicable for a given intent
 * - Building a dependency graph between exporters
 * - Computing topological order for execution
 * - Grouping exporters into phases for parallel execution
 *
 * The planner ensures deterministic execution order - same input always
 * produces the same execution plan.
 */

import type {
  ExecutionPlan,
  ExporterId,
  ExporterPlanItem,
  IExporter,
  IntentSection,
  NormalizedIntent,
  OrchestrationOptions,
} from './types.js';

/**
 * Error thrown when a circular dependency is detected in the execution graph.
 */
export class CircularDependencyError extends Error {
  constructor(
    public readonly cycle: readonly ExporterId[],
    message?: string
  ) {
    super(message ?? `Circular dependency detected: ${cycle.join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}

/**
 * Error thrown when a dependency references an unknown exporter.
 */
export class UnknownDependencyError extends Error {
  constructor(
    public readonly exporterId: ExporterId,
    public readonly dependency: ExporterId,
    message?: string
  ) {
    super(
      message ??
        `Exporter "${exporterId}" depends on unknown exporter "${dependency}"`
    );
    this.name = 'UnknownDependencyError';
  }
}

/**
 * Builds execution plans from intents and registered exporters.
 */
export class ExecutionPlanner {
  /**
   * Build an execution plan for the given intent.
   *
   * @param intent - The normalized intent to export
   * @param exporters - Available exporters
   * @param options - Orchestration options
   * @returns ExecutionPlan describing how to execute the export
   */
  buildPlan(
    intent: NormalizedIntent,
    exporters: readonly IExporter[],
    options?: OrchestrationOptions
  ): ExecutionPlan {
    // Step 1: Filter to applicable exporters
    const applicableExporters = this.filterApplicableExporters(
      intent,
      exporters,
      options?.formats
    );

    // Step 2: Build exporter ID set for validation
    const exporterIds = new Set(applicableExporters.map((e) => e.id));

    // Step 3: Build dependency graph
    const { dependencies, dependents, validationErrors } = this.buildDependencyGraph(
      applicableExporters,
      exporterIds
    );

    // Step 4: Check for validation errors
    if (validationErrors.length > 0) {
      return this.createInvalidPlan(validationErrors);
    }

    // Step 5: Topological sort to get execution order
    const orderResult = this.topologicalSort(applicableExporters, dependencies);
    if (!orderResult.success) {
      return this.createInvalidPlan(['error' in orderResult ? orderResult.error : 'Topological sort failed']);
    }

    const order = orderResult.order;

    // Step 6: Compute execution phases
    const phases = this.computePhases(order, dependencies);

    // Step 7: Build plan items
    const planItems = this.buildPlanItems(
      applicableExporters,
      intent,
      dependencies,
      dependents,
      phases
    );

    // Step 8: Calculate estimated artifacts
    const estimatedArtifacts = planItems.reduce(
      (sum, item) => sum + item.estimatedArtifacts,
      0
    );

    return {
      exporters: planItems,
      order,
      dependencies,
      dependents,
      estimatedArtifacts,
      phases,
      valid: true,
    };
  }

  /**
   * Filter exporters to only those applicable for the intent.
   */
  private filterApplicableExporters(
    intent: NormalizedIntent,
    exporters: readonly IExporter[],
    formats?: readonly string[]
  ): readonly IExporter[] {
    return exporters
      .filter((exporter) => {
        // Check if format is requested (if formats filter is specified)
        if (formats !== undefined && formats.length > 0) {
          if (!formats.includes(exporter.targetFormat)) {
            return false;
          }
        }

        // Check if exporter can handle this intent
        return exporter.canHandle(intent);
      })
      .sort((a, b) => a.id.localeCompare(b.id)); // Stable sorting for determinism
  }

  /**
   * Build the dependency graph between exporters.
   */
  private buildDependencyGraph(
    exporters: readonly IExporter[],
    validExporterIds: ReadonlySet<ExporterId>
  ): {
    dependencies: ReadonlyMap<ExporterId, readonly ExporterId[]>;
    dependents: ReadonlyMap<ExporterId, readonly ExporterId[]>;
    validationErrors: readonly string[];
  } {
    const dependencies = new Map<ExporterId, readonly ExporterId[]>();
    const dependents = new Map<ExporterId, ExporterId[]>();
    const validationErrors: string[] = [];

    // Initialize maps
    for (const exporter of exporters) {
      dependencies.set(exporter.id, []);
      dependents.set(exporter.id, []);
    }

    // Build dependency relationships
    for (const exporter of exporters) {
      const deps = exporter.dependencies ?? [];
      const validDeps: ExporterId[] = [];

      for (const dep of deps) {
        if (validExporterIds.has(dep)) {
          validDeps.push(dep);
          // Add to dependents map
          const currentDependents = dependents.get(dep);
          if (currentDependents !== undefined) {
            currentDependents.push(exporter.id);
          }
        } else {
          // Check if the dependency exists at all but was filtered out
          validationErrors.push(
            `Exporter "${exporter.id}" depends on "${dep}" which is not available or was filtered out`
          );
        }
      }

      dependencies.set(exporter.id, validDeps);
    }

    // Sort dependents for determinism
    for (const [key, value] of Array.from(dependents.entries())) {
      dependents.set(key, value.sort());
    }

    return {
      dependencies: dependencies as ReadonlyMap<ExporterId, readonly ExporterId[]>,
      dependents: dependents as ReadonlyMap<ExporterId, readonly ExporterId[]>,
      validationErrors,
    };
  }

  /**
   * Perform topological sort using Kahn's algorithm.
   * Returns exporters in execution order (dependencies first).
   */
  private topologicalSort(
    exporters: readonly IExporter[],
    dependencies: ReadonlyMap<ExporterId, readonly ExporterId[]>
  ): { success: true; order: readonly ExporterId[] } | { success: false; error: string } {
    // Create mutable copy of in-degree counts
    const inDegree = new Map<ExporterId, number>();
    for (const exporter of exporters) {
      inDegree.set(exporter.id, 0);
    }

    // Count in-degrees
    for (const exporter of exporters) {
      const deps = dependencies.get(exporter.id) ?? [];
      inDegree.set(exporter.id, deps.length);
    }

    // Find all nodes with no dependencies
    const queue: ExporterId[] = [];
    for (const [id, degree] of Array.from(inDegree.entries())) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    // Sort queue for determinism
    queue.sort();

    const result: ExporterId[] = [];
    const processed = new Set<ExporterId>();

    while (queue.length > 0) {
      // Take first element (already sorted)
      const current = queue.shift()!;
      result.push(current);
      processed.add(current);

      // Find all exporters that depend on current
      for (const exporter of exporters) {
        const deps = dependencies.get(exporter.id) ?? [];
        if (deps.includes(current)) {
          const newDegree = (inDegree.get(exporter.id) ?? 0) - 1;
          inDegree.set(exporter.id, newDegree);

          if (newDegree === 0 && !processed.has(exporter.id)) {
            // Insert in sorted order for determinism
            const insertIndex = queue.findIndex((id) => id > exporter.id);
            if (insertIndex === -1) {
              queue.push(exporter.id);
            } else {
              queue.splice(insertIndex, 0, exporter.id);
            }
          }
        }
      }
    }

    // Check if all nodes were processed
    if (result.length !== exporters.length) {
      // Find the cycle
      const remaining = exporters
        .filter((e) => !processed.has(e.id))
        .map((e) => e.id);
      return {
        success: false,
        error: `Circular dependency detected involving: ${remaining.join(', ')}`,
      };
    }

    return { success: true, order: result };
  }

  /**
   * Compute execution phases for parallel execution.
   * Exporters in the same phase have no dependencies on each other
   * and can be executed in parallel.
   */
  private computePhases(
    order: readonly ExporterId[],
    dependencies: ReadonlyMap<ExporterId, readonly ExporterId[]>
  ): readonly (readonly ExporterId[])[] {
    if (order.length === 0) {
      return [];
    }

    // Compute the longest path to each node (phase number)
    const phaseMap = new Map<ExporterId, number>();

    for (const id of order) {
      const deps = dependencies.get(id) ?? [];
      if (deps.length === 0) {
        phaseMap.set(id, 0);
      } else {
        // Phase is 1 + max phase of all dependencies
        let maxDepPhase = 0;
        for (const dep of deps) {
          const depPhase = phaseMap.get(dep) ?? 0;
          maxDepPhase = Math.max(maxDepPhase, depPhase);
        }
        phaseMap.set(id, maxDepPhase + 1);
      }
    }

    // Group by phase
    const phaseValues = Array.from(phaseMap.values());
    const maxPhase = phaseValues.length > 0 ? Math.max(...phaseValues) : 0;
    const phases: ExporterId[][] = [];

    for (let i = 0; i <= maxPhase; i++) {
      const phaseExporters: ExporterId[] = [];
      for (const [id, phase] of Array.from(phaseMap.entries())) {
        if (phase === i) {
          phaseExporters.push(id);
        }
      }
      // Sort for determinism
      phaseExporters.sort();
      phases.push(phaseExporters);
    }

    return phases;
  }

  /**
   * Build plan items with all metadata.
   */
  private buildPlanItems(
    exporters: readonly IExporter[],
    intent: NormalizedIntent,
    dependencies: ReadonlyMap<ExporterId, readonly ExporterId[]>,
    dependents: ReadonlyMap<ExporterId, readonly ExporterId[]>,
    phases: readonly (readonly ExporterId[])[]
  ): readonly ExporterPlanItem[] {
    // Build phase lookup
    const phaseMap = new Map<ExporterId, number>();
    for (let i = 0; i < phases.length; i++) {
      for (const id of phases[i] ?? []) {
        phaseMap.set(id, i);
      }
    }

    return exporters
      .map((exporter): ExporterPlanItem => {
        // Determine which sections this exporter will process
        const sections = this.getApplicableSections(exporter, intent);

        // Estimate artifacts based on sections
        const estimatedArtifacts = this.estimateArtifactCount(exporter, sections);

        return {
          exporterId: exporter.id,
          name: exporter.name,
          version: exporter.version,
          targetFormat: exporter.targetFormat,
          estimatedArtifacts,
          sections,
          dependsOn: dependencies.get(exporter.id) ?? [],
          dependedOnBy: dependents.get(exporter.id) ?? [],
          phase: phaseMap.get(exporter.id) ?? 0,
        };
      })
      .sort((a, b) => a.exporterId.localeCompare(b.exporterId));
  }

  /**
   * Get the sections that an exporter will process from the intent.
   */
  private getApplicableSections(
    exporter: IExporter,
    intent: NormalizedIntent
  ): readonly IntentSection[] {
    const sections: IntentSection[] = [];

    for (const section of exporter.supportedSections) {
      const value = intent.spec[section as keyof typeof intent.spec];
      if (value !== undefined && value !== null) {
        sections.push(section);
      }
    }

    return sections.sort();
  }

  /**
   * Estimate the number of artifacts an exporter will produce.
   * This is a heuristic based on the exporter type and sections.
   */
  private estimateArtifactCount(
    exporter: IExporter,
    sections: readonly IntentSection[]
  ): number {
    // Base estimate: 1 artifact per section
    const baseCount = Math.max(1, sections.length);

    // Adjust based on format
    switch (exporter.targetFormat) {
      case 'terraform':
        // Terraform typically produces multiple files
        return Math.max(3, sections.length * 2);
      case 'kubernetes':
        // Kubernetes produces many manifest files
        return Math.max(2, sections.length * 3);
      case 'helm':
        // Helm chart structure
        return Math.max(5, sections.length * 2);
      case 'cloudformation':
        // CFN can be a single template or nested
        return Math.max(1, sections.length);
      case 'iam':
        // IAM policies per provider
        return Math.max(1, sections.length);
      default:
        return baseCount;
    }
  }

  /**
   * Create an invalid plan with validation errors.
   */
  private createInvalidPlan(errors: readonly string[]): ExecutionPlan {
    return {
      exporters: [],
      order: [],
      dependencies: new Map(),
      dependents: new Map(),
      estimatedArtifacts: 0,
      phases: [],
      valid: false,
      validationErrors: errors,
    };
  }

  /**
   * Validate that a plan is executable.
   * This performs additional checks beyond what buildPlan does.
   */
  validatePlan(plan: ExecutionPlan): readonly string[] {
    const errors: string[] = [];

    // Check that all phases have at least one exporter
    for (let i = 0; i < plan.phases.length; i++) {
      const phase = plan.phases[i];
      if (phase === undefined || phase.length === 0) {
        errors.push(`Phase ${i} is empty`);
      }
    }

    // Check that all exporters in order are in exactly one phase
    const exporterPhases = new Map<ExporterId, number[]>();
    for (let i = 0; i < plan.phases.length; i++) {
      for (const id of plan.phases[i] ?? []) {
        const phases = exporterPhases.get(id) ?? [];
        phases.push(i);
        exporterPhases.set(id, phases);
      }
    }

    for (const id of plan.order) {
      const phases = exporterPhases.get(id);
      if (phases === undefined || phases.length === 0) {
        errors.push(`Exporter "${id}" is in order but not in any phase`);
      } else if (phases.length > 1) {
        errors.push(
          `Exporter "${id}" is in multiple phases: ${phases.join(', ')}`
        );
      }
    }

    // Check that dependencies are satisfied by phase ordering
    for (const item of plan.exporters) {
      for (const dep of item.dependsOn) {
        const depItem = plan.exporters.find((e) => e.exporterId === dep);
        if (depItem === undefined) {
          errors.push(
            `Exporter "${item.exporterId}" depends on unknown exporter "${dep}"`
          );
        } else if (depItem.phase >= item.phase) {
          errors.push(
            `Exporter "${item.exporterId}" (phase ${item.phase}) depends on ` +
              `"${dep}" (phase ${depItem.phase}) which runs in same or later phase`
          );
        }
      }
    }

    return errors;
  }
}
