/**
 * Simulation Exporter
 *
 * Exports simulation artifacts as implementation plans, executive summaries,
 * and detailed reports suitable for enterprise review.
 *
 * This exporter is a passive translator - it transforms detected simulation
 * artifacts into structured output formats without modifying simulation logic.
 *
 * @module exporters/simulation/SimulationExporter
 * @version 1.0.0
 */

import type { IExporter } from '../../core/interfaces.js';
import type {
  ExportArtifact,
  ExporterId,
  ExportFormat,
  ExportOptions,
  NormalizedIntent,
  SemanticVersion,
  SerializerType,
  ValidatedIntent,
  ValidationResult,
} from '../../core/types.js';
import {
  SimulationArtifactDetector,
  type SimulationDetectionResult,
  type ImplementationPlan,
} from '../../core/simulation/index.js';

// =============================================================================
// EXPORTER OPTIONS
// =============================================================================

/**
 * Options for simulation export.
 */
export interface SimulationExportOptions {
  /**
   * Generate implementation plan in JSON format.
   * @default true
   */
  readonly generatePlanJson?: boolean;

  /**
   * Generate implementation plan in YAML format.
   * @default true
   */
  readonly generatePlanYaml?: boolean;

  /**
   * Generate executive summary in Markdown.
   * @default true
   */
  readonly generateExecutiveSummary?: boolean;

  /**
   * Generate detailed report in Markdown.
   * @default true
   */
  readonly generateDetailedReport?: boolean;

  /**
   * Generate timeline visualization data.
   * @default false
   */
  readonly generateTimeline?: boolean;

  /**
   * Base output path for artifacts.
   * @default 'simulation-exports'
   */
  readonly basePath?: string;

  /**
   * Minimum confidence threshold for including references.
   * @default 0.5
   */
  readonly minConfidence?: number;
}

// =============================================================================
// MAIN EXPORTER CLASS
// =============================================================================

/**
 * Simulation Exporter class.
 *
 * Transforms simulation artifacts detected in deployment intents into
 * implementation plans and reports for enterprise review.
 */
export class SimulationExporter implements IExporter {
  readonly id: ExporterId = 'simulation' as ExporterId;
  readonly name = 'Simulation Artifact Exporter';
  readonly version: SemanticVersion = '1.0.0';
  readonly targetFormat: ExportFormat = 'config';

  private readonly detector: SimulationArtifactDetector;
  private readonly options: Required<SimulationExportOptions>;

  constructor(options: SimulationExportOptions = {}) {
    this.options = {
      generatePlanJson: options.generatePlanJson ?? true,
      generatePlanYaml: options.generatePlanYaml ?? true,
      generateExecutiveSummary: options.generateExecutiveSummary ?? true,
      generateDetailedReport: options.generateDetailedReport ?? true,
      generateTimeline: options.generateTimeline ?? false,
      basePath: options.basePath ?? 'simulation-exports',
      minConfidence: options.minConfidence ?? 0.5,
    };

    this.detector = new SimulationArtifactDetector({
      minConfidence: this.options.minConfidence,
      generatePlan: true,
      includeOriginalProperties: true,
    });
  }

  /**
   * Transform a normalized intent into simulation export artifacts.
   */
  transform(
    intent: NormalizedIntent,
    _options?: ExportOptions
  ): readonly ExportArtifact[] {
    const detectionResult = this.detector.detect(intent);

    if (!detectionResult.hasSimulationArtifacts) {
      return [];
    }

    const artifacts: ExportArtifact[] = [];
    const basePath = this.options.basePath;

    // Generate implementation plan artifacts
    if (detectionResult.implementationPlan) {
      if (this.options.generatePlanJson) {
        artifacts.push(this.generatePlanJsonArtifact(
          detectionResult.implementationPlan,
          basePath
        ));
      }

      if (this.options.generatePlanYaml) {
        artifacts.push(this.generatePlanYamlArtifact(
          detectionResult.implementationPlan,
          basePath
        ));
      }

      if (this.options.generateExecutiveSummary) {
        artifacts.push(this.generateExecutiveSummaryArtifact(
          detectionResult,
          basePath
        ));
      }

      if (this.options.generateDetailedReport) {
        artifacts.push(this.generateDetailedReportArtifact(
          detectionResult,
          basePath
        ));
      }

      if (this.options.generateTimeline) {
        artifacts.push(this.generateTimelineArtifact(
          detectionResult.implementationPlan,
          basePath
        ));
      }
    }

    // Generate manifest
    artifacts.push(this.generateManifestArtifact(detectionResult, basePath));

    return artifacts;
  }

  /**
   * Validate that an intent can be exported.
   */
  validate(intent: ValidatedIntent): ValidationResult {
    const detectionResult = this.detector.detect(intent);

    if (!detectionResult.hasSimulationArtifacts) {
      return {
        valid: true,
        errors: [],
        warnings: [{
          code: 'SIM_NO_ARTIFACTS',
          message: 'No simulation artifacts detected in intent',
        }],
      };
    }

    const warnings = [];
    const lowConfidenceCount = detectionResult.references.filter(
      r => r.confidence < 0.7
    ).length;

    if (lowConfidenceCount > 0) {
      warnings.push({
        code: 'SIM_LOW_CONFIDENCE',
        message: `${lowConfidenceCount} simulation reference(s) have confidence below 0.7`,
      });
    }

    return {
      valid: true,
      errors: [],
      warnings,
    };
  }

  /**
   * Check if this exporter can handle the given intent.
   */
  canHandle(intent: ValidatedIntent): boolean {
    const detectionResult = this.detector.detect(intent);
    return detectionResult.hasSimulationArtifacts;
  }

  /**
   * Get required serializers.
   */
  getRequiredSerializers(): readonly SerializerType[] {
    return ['json', 'yaml'];
  }

  // ===========================================================================
  // ARTIFACT GENERATION
  // ===========================================================================

  /**
   * Generate implementation plan JSON artifact.
   */
  private generatePlanJsonArtifact(
    plan: ImplementationPlan,
    basePath: string
  ): ExportArtifact {
    return {
      path: `${basePath}/implementation-plan.json`,
      content: plan,
      format: 'json',
      encoding: 'utf-8',
      metadata: {
        artifactType: 'implementation-plan',
        format: 'json',
        planId: plan.planId,
        itemCount: plan.items.length,
        phaseCount: plan.phases.length,
      },
    };
  }

  /**
   * Generate implementation plan YAML artifact.
   */
  private generatePlanYamlArtifact(
    plan: ImplementationPlan,
    basePath: string
  ): ExportArtifact {
    return {
      path: `${basePath}/implementation-plan.yaml`,
      content: plan,
      format: 'yaml',
      encoding: 'utf-8',
      metadata: {
        artifactType: 'implementation-plan',
        format: 'yaml',
        planId: plan.planId,
        itemCount: plan.items.length,
        phaseCount: plan.phases.length,
      },
    };
  }

  /**
   * Generate executive summary Markdown artifact.
   */
  private generateExecutiveSummaryArtifact(
    result: SimulationDetectionResult,
    basePath: string
  ): ExportArtifact {
    const plan = result.implementationPlan!;
    const content = this.renderExecutiveSummary(plan, result);

    return {
      path: `${basePath}/executive-summary.md`,
      content,
      format: 'yaml', // Will be treated as raw text
      encoding: 'utf-8',
      metadata: {
        artifactType: 'executive-summary',
        format: 'markdown',
        planId: plan.planId,
      },
    };
  }

  /**
   * Generate detailed report Markdown artifact.
   */
  private generateDetailedReportArtifact(
    result: SimulationDetectionResult,
    basePath: string
  ): ExportArtifact {
    const plan = result.implementationPlan!;
    const content = this.renderDetailedReport(plan, result);

    return {
      path: `${basePath}/detailed-report.md`,
      content,
      format: 'yaml', // Will be treated as raw text
      encoding: 'utf-8',
      metadata: {
        artifactType: 'detailed-report',
        format: 'markdown',
        planId: plan.planId,
      },
    };
  }

  /**
   * Generate timeline visualization artifact.
   */
  private generateTimelineArtifact(
    plan: ImplementationPlan,
    basePath: string
  ): ExportArtifact {
    const timeline = {
      planId: plan.planId,
      phases: plan.phases.map(phase => ({
        phaseId: phase.phaseId,
        name: phase.name,
        order: phase.order,
        items: phase.itemIds.map(itemId => {
          const item = plan.items.find(i => i.itemId === itemId);
          return {
            itemId,
            title: item?.title ?? 'Unknown',
            priority: item?.priority ?? 'medium',
            status: item?.status ?? 'proposed',
          };
        }),
      })),
      dependencies: plan.items.map(item => ({
        itemId: item.itemId,
        prerequisites: item.prerequisites,
      })).filter(d => d.prerequisites.length > 0),
    };

    return {
      path: `${basePath}/timeline.json`,
      content: timeline,
      format: 'json',
      encoding: 'utf-8',
      metadata: {
        artifactType: 'timeline',
        planId: plan.planId,
      },
    };
  }

  /**
   * Generate manifest artifact.
   */
  private generateManifestArtifact(
    result: SimulationDetectionResult,
    basePath: string
  ): ExportArtifact {
    const manifest = {
      _agentics_simulation_export: {
        version: '1.0.0',
        exporterVersion: this.version,
      },
      summary: result.summary,
      referenceCount: result.references.length,
      hasPlan: !!result.implementationPlan,
      planId: result.implementationPlan?.planId,
      artifacts: [
        this.options.generatePlanJson && 'implementation-plan.json',
        this.options.generatePlanYaml && 'implementation-plan.yaml',
        this.options.generateExecutiveSummary && 'executive-summary.md',
        this.options.generateDetailedReport && 'detailed-report.md',
        this.options.generateTimeline && 'timeline.json',
      ].filter(Boolean),
    };

    return {
      path: `${basePath}/manifest.json`,
      content: manifest,
      format: 'json',
      encoding: 'utf-8',
      metadata: {
        artifactType: 'manifest',
      },
    };
  }

  // ===========================================================================
  // MARKDOWN RENDERING
  // ===========================================================================

  /**
   * Render executive summary Markdown.
   */
  private renderExecutiveSummary(
    plan: ImplementationPlan,
    result: SimulationDetectionResult
  ): string {
    const lines: string[] = [];

    lines.push('# Executive Summary: Implementation Plan');
    lines.push('');
    lines.push(`**Plan ID:** ${plan.planId}`);
    lines.push(`**Generated:** ${plan.createdAt}`);
    lines.push(`**Source Intent:** ${plan.sourceIntentId}`);
    lines.push('');
    lines.push('## Overview');
    lines.push('');
    lines.push(plan.summary);
    lines.push('');

    // Key Statistics
    lines.push('## Key Statistics');
    lines.push('');
    lines.push(`- **Total Simulation Artifacts:** ${result.summary.totalReferences}`);
    lines.push(`- **High Confidence Detections:** ${result.summary.highConfidenceCount}`);
    lines.push(`- **Implementation Items:** ${plan.items.length}`);
    lines.push(`- **Implementation Phases:** ${plan.phases.length}`);
    lines.push('');

    // Priority Distribution
    lines.push('## Priority Distribution');
    lines.push('');
    const priorityCounts = this.countByPriority(plan.items);
    for (const [priority, count] of Object.entries(priorityCounts)) {
      lines.push(`- **${this.formatPriority(priority)}:** ${count} item(s)`);
    }
    lines.push('');

    // Top Recommendations
    if (plan.recommendations.length > 0) {
      lines.push('## Top Recommendations');
      lines.push('');
      const topRecs = plan.recommendations.slice(0, 5);
      for (const rec of topRecs) {
        lines.push(`### ${rec.title}`);
        lines.push('');
        lines.push(`**Priority:** ${this.formatPriority(rec.priority)}`);
        lines.push('');
        lines.push(rec.description);
        lines.push('');
      }
    }

    // Phase Overview
    lines.push('## Implementation Phases');
    lines.push('');
    for (const phase of plan.phases) {
      lines.push(`### Phase ${phase.order}: ${phase.name}`);
      lines.push('');
      lines.push(`${phase.itemIds.length} implementation item(s)`);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('*Generated by Agentics Deployment Exporters - Simulation Module*');

    return lines.join('\n');
  }

  /**
   * Render detailed report Markdown.
   */
  private renderDetailedReport(
    plan: ImplementationPlan,
    result: SimulationDetectionResult
  ): string {
    const lines: string[] = [];

    lines.push('# Detailed Implementation Report');
    lines.push('');
    lines.push(`**Plan ID:** ${plan.planId}`);
    lines.push(`**Version:** ${plan.version}`);
    lines.push(`**Generated:** ${plan.createdAt}`);
    lines.push('');

    // Table of Contents
    lines.push('## Table of Contents');
    lines.push('');
    lines.push('1. [Overview](#overview)');
    lines.push('2. [Simulation Artifacts](#simulation-artifacts)');
    lines.push('3. [Implementation Phases](#implementation-phases)');
    lines.push('4. [Implementation Items](#implementation-items)');
    lines.push('5. [Recommendations](#recommendations)');
    lines.push('6. [Metrics](#metrics)');
    lines.push('7. [Audit Information](#audit-information)');
    lines.push('');

    // Overview
    lines.push('## Overview');
    lines.push('');
    lines.push(plan.summary);
    lines.push('');

    // Simulation Artifacts
    lines.push('## Simulation Artifacts');
    lines.push('');
    lines.push('The following simulation artifacts were detected:');
    lines.push('');
    lines.push('| Reference ID | Source | Type | Confidence |');
    lines.push('|-------------|--------|------|------------|');
    for (const ref of result.references) {
      lines.push(`| ${ref.referenceId} | ${ref.source} | ${ref.artifactType} | ${(ref.confidence * 100).toFixed(0)}% |`);
    }
    lines.push('');

    // Implementation Phases
    lines.push('## Implementation Phases');
    lines.push('');
    for (const phase of plan.phases) {
      lines.push(`### Phase ${phase.order}: ${phase.name}`);
      lines.push('');
      lines.push(phase.description);
      lines.push('');
      lines.push('**Items in this phase:**');
      lines.push('');
      for (const itemId of phase.itemIds) {
        const item = plan.items.find(i => i.itemId === itemId);
        if (item) {
          lines.push(`- ${item.title} (${this.formatPriority(item.priority)})`);
        }
      }
      lines.push('');
    }

    // Implementation Items
    lines.push('## Implementation Items');
    lines.push('');
    for (const item of plan.items) {
      lines.push(`### ${item.title}`);
      lines.push('');
      lines.push(`**ID:** ${item.itemId}`);
      lines.push(`**Phase:** ${item.phase}`);
      lines.push(`**Priority:** ${this.formatPriority(item.priority)}`);
      lines.push(`**Status:** ${item.status}`);
      lines.push('');
      lines.push(item.description);
      lines.push('');

      if (item.affectedResources.length > 0) {
        lines.push('**Affected Resources:**');
        for (const resource of item.affectedResources) {
          lines.push(`- ${resource}`);
        }
        lines.push('');
      }

      if (item.successCriteria.length > 0) {
        lines.push('**Success Criteria:**');
        for (const criteria of item.successCriteria) {
          lines.push(`- ${criteria}`);
        }
        lines.push('');
      }

      if (item.risks.length > 0) {
        lines.push('**Risks:**');
        for (const risk of item.risks) {
          lines.push(`- ${risk}`);
        }
        lines.push('');
      }
    }

    // Recommendations
    lines.push('## Recommendations');
    lines.push('');
    for (const rec of plan.recommendations) {
      lines.push(`### ${rec.title}`);
      lines.push('');
      lines.push(`**Priority:** ${this.formatPriority(rec.priority)}`);
      lines.push(`**Category:** ${rec.category}`);
      lines.push('');
      lines.push(rec.description);
      lines.push('');
      lines.push('**Action Items:**');
      for (const action of rec.actionItems) {
        lines.push(`- ${action}`);
      }
      lines.push('');
    }

    // Metrics
    lines.push('## Metrics');
    lines.push('');
    if (plan.metrics.performance && Object.keys(plan.metrics.performance).length > 0) {
      lines.push('### Performance Metrics');
      lines.push('');
      for (const [key, value] of Object.entries(plan.metrics.performance)) {
        lines.push(`- **${key}:** ${value}`);
      }
      lines.push('');
    }

    if (plan.metrics.resourceUtilization && Object.keys(plan.metrics.resourceUtilization).length > 0) {
      lines.push('### Resource Utilization');
      lines.push('');
      for (const [key, value] of Object.entries(plan.metrics.resourceUtilization)) {
        lines.push(`- **${key}:** ${value}`);
      }
      lines.push('');
    }

    // Audit Information
    lines.push('## Audit Information');
    lines.push('');
    lines.push(`- **Intent ID:** ${plan.audit.intentId}`);
    lines.push(`- **Intent Version:** ${plan.audit.intentVersion}`);
    lines.push(`- **Intent Hash:** ${plan.audit.intentHash}`);
    lines.push(`- **Generated At:** ${plan.audit.generatedAt}`);
    lines.push(`- **Exporter Version:** ${plan.audit.exporterVersion}`);
    lines.push(`- **Simulation Count:** ${plan.audit.simulationCount}`);
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('*Generated by Agentics Deployment Exporters - Simulation Module*');

    return lines.join('\n');
  }

  /**
   * Count items by priority.
   */
  private countByPriority(items: readonly { priority: string }[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.priority] = (counts[item.priority] ?? 0) + 1;
    }
    return counts;
  }

  /**
   * Format priority for display.
   */
  private formatPriority(priority: string): string {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }
}

/**
 * Factory function to create a Simulation Exporter.
 */
export function createSimulationExporter(
  options?: SimulationExportOptions
): SimulationExporter {
  return new SimulationExporter(options);
}
