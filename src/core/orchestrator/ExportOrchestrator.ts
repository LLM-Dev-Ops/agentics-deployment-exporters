/**
 * ExportOrchestrator - Main orchestrator for deployment export operations.
 *
 * This module implements IExportOrchestrator and coordinates the entire
 * export process:
 * - Determining required exporters based on intent sections
 * - Building execution dependency graph (DAG)
 * - Managing parallel execution
 * - Handling partial failures (configurable)
 * - Coordinating artifact collection
 *
 * Key principles from SPARC_REFINEMENT.md:
 * - Atomic operations: all-or-nothing unless continueOnError
 * - Traceability: track which exporter produced which artifact
 * - Determinism: same execution order for same input
 */

import { randomUUID } from 'node:crypto';

import { ConcurrencyManager } from './ConcurrencyManager.js';
import { ExecutionPlanner } from './ExecutionPlanner.js';
import type {
  ExportArtifact,
  ExportError,
  ExporterId,
  ExporterExecutionInfo,
  ExportMetadata,
  ExportResult,
  ExportWarning,
  ExecutionPlan,
  IExporter,
  IExportOrchestrator,
  NormalizedIntent,
  OrchestrationOptions,
  ProgressEvent,
  ProgressHandler,
} from './types.js';

/**
 * Default orchestration options.
 */
const DEFAULT_ORCHESTRATION_OPTIONS: Required<OrchestrationOptions> = {
  formats: [],
  concurrency: 4,
  continueOnError: false,
  dryRun: false,
  exportOptions: {},
};

/**
 * Main export orchestrator implementation.
 */
export class ExportOrchestrator implements IExportOrchestrator {
  private readonly exporters = new Map<ExporterId, IExporter>();
  private readonly planner: ExecutionPlanner;
  private readonly concurrencyManager: ConcurrencyManager;
  private readonly progressHandlers = new Set<ProgressHandler>();

  constructor() {
    this.planner = new ExecutionPlanner();
    this.concurrencyManager = new ConcurrencyManager();

    // Forward progress events from concurrency manager
    this.concurrencyManager.onProgress((event) => {
      this.emitProgress(event);
    });
  }

  /**
   * Execute export process for the given intent.
   *
   * @param intent - The normalized deployment intent
   * @param options - Orchestration options
   * @returns Export result containing all artifacts or errors
   */
  async execute(
    intent: NormalizedIntent,
    options?: OrchestrationOptions
  ): Promise<ExportResult> {
    const opts = this.mergeOptions(options);
    const exportId = randomUUID();
    const correlationId = randomUUID();
    const startedAt = new Date().toISOString();

    this.emitProgress({
      type: 'planning',
      timestamp: startedAt,
      progress: 0,
      message: 'Building execution plan...',
    });

    // Build execution plan
    const plan = this.plan(intent, options);

    if (!plan.valid) {
      const errors: ExportError[] = (plan.validationErrors ?? []).map((msg) => ({
        code: 'T3004',
        message: msg,
        exporterId: 'orchestrator',
        stage: 'planning' as const,
        recoverable: false,
        timestamp: new Date().toISOString(),
      }));

      return this.createFailedResult(
        intent,
        errors,
        [],
        exportId,
        correlationId,
        startedAt
      );
    }

    this.emitProgress({
      type: 'plan-complete',
      timestamp: new Date().toISOString(),
      progress: 5,
      message: `Execution plan ready: ${plan.order.length} exporters in ${plan.phases.length} phases`,
      totalPhases: plan.phases.length,
    });

    // Handle dry run
    if (opts.dryRun) {
      return this.createDryRunResult(
        intent,
        plan,
        exportId,
        correlationId,
        startedAt
      );
    }

    // Execute the plan
    try {
      const executionResults = await this.concurrencyManager.executeParallel(
        plan,
        this.exporters,
        intent,
        {
          options: opts.exportOptions,
          correlationId,
          exportId,
        },
        {
          maxConcurrency: opts.concurrency,
          continueOnError: opts.continueOnError,
          timeoutMs: 0,
        }
      );

      // Collect results
      const artifacts: ExportArtifact[] = [];
      const errors: ExportError[] = [];
      const warnings: ExportWarning[] = [];
      const executedExporters: ExporterExecutionInfo[] = [];

      for (const result of executionResults) {
        const exporter = this.exporters.get(result.exporterId);

        executedExporters.push({
          exporterId: result.exporterId,
          version: exporter?.version ?? '0.0.0',
          status: result.success ? 'success' : 'failed',
          artifactCount: result.artifacts.length,
          durationMs: result.durationMs,
          error: result.error?.message,
        });

        if (result.success) {
          artifacts.push(...result.artifacts);
        } else if (result.error !== undefined) {
          errors.push(result.error);
        }
      }

      // Validate all artifacts
      const validationErrors = await this.validateArtifacts(artifacts);
      errors.push(...validationErrors);

      // Determine overall success
      const success = opts.continueOnError
        ? true // Always succeed if continueOnError is set
        : errors.length === 0;

      const completedAt = new Date().toISOString();
      const durationMs = Date.now() - new Date(startedAt).getTime();

      return {
        success,
        artifacts: success || opts.continueOnError ? artifacts : [],
        errors,
        warnings,
        metadata: {
          exportId,
          correlationId,
          startedAt,
          completedAt,
          durationMs,
          intentHash: intent.hash,
          intentVersion: intent.metadata.version,
          executedExporters,
        },
      };
    } catch (error) {
      // Handle unrecoverable errors
      const exportError: ExportError = {
        code: 'T3001',
        message: error instanceof Error ? error.message : String(error),
        exporterId: 'orchestrator',
        stage: 'execution',
        recoverable: false,
        cause: error instanceof Error ? error : undefined,
        timestamp: new Date().toISOString(),
      };

      return this.createFailedResult(
        intent,
        [exportError],
        [],
        exportId,
        correlationId,
        startedAt
      );
    }
  }

  /**
   * Register an exporter with the orchestrator.
   */
  registerExporter(exporter: IExporter): void {
    if (this.exporters.has(exporter.id)) {
      throw new Error(`Exporter with ID "${exporter.id}" is already registered`);
    }
    this.exporters.set(exporter.id, exporter);
  }

  /**
   * Unregister an exporter.
   */
  unregisterExporter(exporterId: ExporterId): boolean {
    return this.exporters.delete(exporterId);
  }

  /**
   * Get all registered exporters.
   */
  getExporters(): readonly IExporter[] {
    return Array.from(this.exporters.values()).sort((a, b) =>
      a.id.localeCompare(b.id)
    );
  }

  /**
   * Get a registered exporter by ID.
   */
  getExporter(exporterId: ExporterId): IExporter | undefined {
    return this.exporters.get(exporterId);
  }

  /**
   * Build an execution plan without executing it.
   */
  plan(intent: NormalizedIntent, options?: OrchestrationOptions): ExecutionPlan {
    return this.planner.buildPlan(
      intent,
      Array.from(this.exporters.values()),
      options
    );
  }

  /**
   * Subscribe to export progress events.
   * @returns Unsubscribe function
   */
  onProgress(handler: ProgressHandler): () => void {
    this.progressHandlers.add(handler);
    return () => {
      this.progressHandlers.delete(handler);
    };
  }

  /**
   * Merge provided options with defaults.
   */
  private mergeOptions(
    options?: OrchestrationOptions
  ): Required<OrchestrationOptions> {
    return {
      ...DEFAULT_ORCHESTRATION_OPTIONS,
      ...options,
      exportOptions: {
        ...DEFAULT_ORCHESTRATION_OPTIONS.exportOptions,
        ...options?.exportOptions,
      },
    };
  }

  /**
   * Validate all produced artifacts.
   */
  private async validateArtifacts(
    artifacts: readonly ExportArtifact[]
  ): Promise<ExportError[]> {
    const errors: ExportError[] = [];

    for (const artifact of artifacts) {
      const exporter = this.exporters.get(artifact.exporterId);
      if (exporter === undefined) {
        continue;
      }

      try {
        const result = await exporter.validate(artifact);
        if (!result.valid) {
          for (const validationError of result.errors) {
            errors.push({
              code: validationError.code,
              message: `Validation failed for ${artifact.path}: ${validationError.message}`,
              exporterId: artifact.exporterId,
              stage: 'validation',
              recoverable: false,
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        errors.push({
          code: 'V1001',
          message: `Validation error for ${artifact.path}: ${error instanceof Error ? error.message : String(error)}`,
          exporterId: artifact.exporterId,
          stage: 'validation',
          recoverable: true,
          cause: error instanceof Error ? error : undefined,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return errors;
  }

  /**
   * Create a failed export result.
   */
  private createFailedResult(
    intent: NormalizedIntent,
    errors: readonly ExportError[],
    warnings: readonly ExportWarning[],
    exportId: string,
    correlationId: string,
    startedAt: string
  ): ExportResult {
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - new Date(startedAt).getTime();

    return {
      success: false,
      artifacts: [],
      errors,
      warnings,
      metadata: {
        exportId,
        correlationId,
        startedAt,
        completedAt,
        durationMs,
        intentHash: intent.hash,
        intentVersion: intent.metadata.version,
        executedExporters: [],
      },
    };
  }

  /**
   * Create a dry run result (plan only, no execution).
   */
  private createDryRunResult(
    intent: NormalizedIntent,
    plan: ExecutionPlan,
    exportId: string,
    correlationId: string,
    startedAt: string
  ): ExportResult {
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - new Date(startedAt).getTime();

    const executedExporters: ExporterExecutionInfo[] = plan.exporters.map(
      (item) => ({
        exporterId: item.exporterId,
        version: item.version,
        status: 'skipped' as const,
        artifactCount: 0,
        durationMs: 0,
      })
    );

    const warnings: ExportWarning[] = [
      {
        code: 'DRY_RUN',
        message: `Dry run: ${plan.order.length} exporters would be executed in ${plan.phases.length} phases. Estimated ${plan.estimatedArtifacts} artifacts.`,
        timestamp: new Date().toISOString(),
      },
    ];

    return {
      success: true,
      artifacts: [],
      errors: [],
      warnings,
      metadata: {
        exportId,
        correlationId,
        startedAt,
        completedAt,
        durationMs,
        intentHash: intent.hash,
        intentVersion: intent.metadata.version,
        executedExporters,
      },
    };
  }

  /**
   * Emit a progress event to all handlers.
   */
  private emitProgress(event: ProgressEvent): void {
    for (const handler of Array.from(this.progressHandlers)) {
      try {
        handler(event);
      } catch {
        // Ignore handler errors
      }
    }
  }

  /**
   * Get the execution planner for advanced use cases.
   */
  getPlanner(): ExecutionPlanner {
    return this.planner;
  }

  /**
   * Get the concurrency manager for advanced use cases.
   */
  getConcurrencyManager(): ConcurrencyManager {
    return this.concurrencyManager;
  }

  /**
   * Abort the current execution.
   */
  abort(): void {
    this.concurrencyManager.abort();
  }

  /**
   * Reset the orchestrator state.
   */
  reset(): void {
    this.concurrencyManager.reset();
  }

  /**
   * Check if any exporters can handle the given intent.
   */
  canExport(intent: NormalizedIntent): boolean {
    for (const exporter of Array.from(this.exporters.values())) {
      if (exporter.canHandle(intent)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get exporters that can handle the given intent.
   */
  getApplicableExporters(intent: NormalizedIntent): readonly IExporter[] {
    return Array.from(this.exporters.values())
      .filter((exporter) => exporter.canHandle(intent))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Validate that all exporter dependencies are registered.
   */
  validateDependencies(): readonly string[] {
    const errors: string[] = [];
    const exporterIds = new Set(Array.from(this.exporters.keys()));

    for (const exporter of Array.from(this.exporters.values())) {
      for (const dep of exporter.dependencies ?? []) {
        if (!exporterIds.has(dep)) {
          errors.push(
            `Exporter "${exporter.id}" depends on unregistered exporter "${dep}"`
          );
        }
      }
    }

    return errors;
  }
}

/**
 * Create a new ExportOrchestrator instance.
 */
export function createOrchestrator(): ExportOrchestrator {
  return new ExportOrchestrator();
}
