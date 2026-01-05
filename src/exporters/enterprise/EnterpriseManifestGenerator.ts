/**
 * Enterprise Manifest Generator
 *
 * Generates unified enterprise manifests combining simulation and financial
 * artifacts into comprehensive deployment packages suitable for enterprise review.
 *
 * This generator creates consolidated outputs that include:
 * - Combined implementation plans
 * - Unified cost-benefit analyses
 * - Cross-referenced recommendations
 * - Enterprise-ready manifests
 *
 * @module exporters/enterprise/EnterpriseManifestGenerator
 * @version 1.0.0
 */

import { createHash } from 'crypto';
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
} from '../../core/simulation/index.js';
import {
  FinancialArtifactDetector,
  type FinancialDetectionResult,
} from '../../core/financial/index.js';

// =============================================================================
// ENTERPRISE MANIFEST TYPES
// =============================================================================

/**
 * Unified enterprise manifest combining all export data.
 */
export interface EnterpriseManifest {
  /**
   * Manifest identifier.
   */
  readonly manifestId: string;

  /**
   * Manifest version.
   */
  readonly version: string;

  /**
   * Generation timestamp.
   */
  readonly generatedAt: string;

  /**
   * Source intent information.
   */
  readonly sourceIntent: {
    readonly intentId: string;
    readonly intentHash: string;
    readonly intentVersion: string;
  };

  /**
   * Simulation artifacts summary.
   */
  readonly simulation: EnterpriseSimulationSummary;

  /**
   * Financial artifacts summary.
   */
  readonly financial: EnterpriseFinancialSummary;

  /**
   * Combined recommendations.
   */
  readonly recommendations: readonly EnterpriseRecommendation[];

  /**
   * Deployment readiness assessment.
   */
  readonly readinessAssessment: ReadinessAssessment;

  /**
   * Generated artifacts list.
   */
  readonly artifacts: readonly ArtifactManifestEntry[];

  /**
   * Audit trail.
   */
  readonly audit: EnterpriseManifestAudit;
}

/**
 * Simulation summary for enterprise manifest.
 */
export interface EnterpriseSimulationSummary {
  readonly hasArtifacts: boolean;
  readonly artifactCount: number;
  readonly planId?: string;
  readonly implementationItemCount: number;
  readonly phaseCount: number;
  readonly topPriorities: readonly string[];
}

/**
 * Financial summary for enterprise manifest.
 */
export interface EnterpriseFinancialSummary {
  readonly hasArtifacts: boolean;
  readonly artifactCount: number;
  readonly reportId?: string;
  readonly roiPercentage?: number;
  readonly paybackMonths?: number;
  readonly totalInvestment?: string;
  readonly projectedSavings?: string;
  readonly primaryCurrency: string;
}

/**
 * Combined recommendation.
 */
export interface EnterpriseRecommendation {
  readonly id: string;
  readonly category: 'simulation' | 'financial' | 'combined';
  readonly priority: 'critical' | 'high' | 'medium' | 'low';
  readonly title: string;
  readonly description: string;
  readonly source: string;
  readonly actionItems: readonly string[];
}

/**
 * Deployment readiness assessment.
 */
export interface ReadinessAssessment {
  readonly overallScore: number; // 0-100
  readonly status: 'ready' | 'ready-with-warnings' | 'needs-review' | 'not-ready';
  readonly checklist: readonly ChecklistItem[];
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Checklist item for readiness assessment.
 */
export interface ChecklistItem {
  readonly id: string;
  readonly category: string;
  readonly description: string;
  readonly status: 'pass' | 'fail' | 'warning' | 'pending';
  readonly details?: string;
}

/**
 * Artifact manifest entry.
 */
export interface ArtifactManifestEntry {
  readonly path: string;
  readonly type: string;
  readonly format: string;
  readonly category: 'simulation' | 'financial' | 'enterprise';
}

/**
 * Enterprise manifest audit information.
 */
export interface EnterpriseManifestAudit {
  readonly generatedAt: string;
  readonly exporterVersion: string;
  readonly intentId: string;
  readonly intentVersion: string;
  readonly intentHash: string;
  readonly simulationExports: number;
  readonly financialExports: number;
  readonly totalExports: number;
}

// =============================================================================
// GENERATOR OPTIONS
// =============================================================================

/**
 * Options for enterprise manifest generation.
 */
export interface EnterpriseManifestOptions {
  /**
   * Generate unified manifest JSON.
   * @default true
   */
  readonly generateManifestJson?: boolean;

  /**
   * Generate unified manifest YAML.
   * @default true
   */
  readonly generateManifestYaml?: boolean;

  /**
   * Generate enterprise executive summary.
   * @default true
   */
  readonly generateExecutiveSummary?: boolean;

  /**
   * Generate deployment readiness report.
   * @default true
   */
  readonly generateReadinessReport?: boolean;

  /**
   * Base output path for artifacts.
   * @default 'enterprise-exports'
   */
  readonly basePath?: string;

  /**
   * Minimum confidence threshold.
   * @default 0.5
   */
  readonly minConfidence?: number;
}

// =============================================================================
// MAIN GENERATOR CLASS
// =============================================================================

/**
 * Enterprise Manifest Generator class.
 *
 * Creates unified enterprise manifests combining simulation and financial
 * artifact exports into comprehensive deployment packages.
 */
export class EnterpriseManifestGenerator implements IExporter {
  readonly id: ExporterId = 'enterprise' as ExporterId;
  readonly name = 'Enterprise Manifest Generator';
  readonly version: SemanticVersion = '1.0.0';
  readonly targetFormat: ExportFormat = 'config';

  private readonly simulationDetector: SimulationArtifactDetector;
  private readonly financialDetector: FinancialArtifactDetector;
  private readonly options: Required<EnterpriseManifestOptions>;

  constructor(options: EnterpriseManifestOptions = {}) {
    this.options = {
      generateManifestJson: options.generateManifestJson ?? true,
      generateManifestYaml: options.generateManifestYaml ?? true,
      generateExecutiveSummary: options.generateExecutiveSummary ?? true,
      generateReadinessReport: options.generateReadinessReport ?? true,
      basePath: options.basePath ?? 'enterprise-exports',
      minConfidence: options.minConfidence ?? 0.5,
    };

    this.simulationDetector = new SimulationArtifactDetector({
      minConfidence: this.options.minConfidence,
      generatePlan: true,
    });

    this.financialDetector = new FinancialArtifactDetector({
      minConfidence: this.options.minConfidence,
      generateReport: true,
    });
  }

  /**
   * Transform a normalized intent into enterprise manifest artifacts.
   */
  transform(
    intent: NormalizedIntent,
    _options?: ExportOptions
  ): readonly ExportArtifact[] {
    const simResult = this.simulationDetector.detect(intent);
    const finResult = this.financialDetector.detect(intent);

    // Only generate if we have at least one type of artifact
    if (!simResult.hasSimulationArtifacts && !finResult.hasFinancialArtifacts) {
      return [];
    }

    const artifacts: ExportArtifact[] = [];
    const basePath = this.options.basePath;
    const manifest = this.generateManifest(intent, simResult, finResult);

    if (this.options.generateManifestJson) {
      artifacts.push({
        path: `${basePath}/enterprise-manifest.json`,
        content: manifest,
        format: 'json',
        encoding: 'utf-8',
        metadata: {
          artifactType: 'enterprise-manifest',
          format: 'json',
          manifestId: manifest.manifestId,
        },
      });
    }

    if (this.options.generateManifestYaml) {
      artifacts.push({
        path: `${basePath}/enterprise-manifest.yaml`,
        content: manifest,
        format: 'yaml',
        encoding: 'utf-8',
        metadata: {
          artifactType: 'enterprise-manifest',
          format: 'yaml',
          manifestId: manifest.manifestId,
        },
      });
    }

    if (this.options.generateExecutiveSummary) {
      artifacts.push({
        path: `${basePath}/enterprise-summary.md`,
        content: this.renderExecutiveSummary(manifest, simResult, finResult),
        format: 'yaml', // Raw text
        encoding: 'utf-8',
        metadata: {
          artifactType: 'executive-summary',
          format: 'markdown',
        },
      });
    }

    if (this.options.generateReadinessReport) {
      artifacts.push({
        path: `${basePath}/readiness-report.md`,
        content: this.renderReadinessReport(manifest),
        format: 'yaml', // Raw text
        encoding: 'utf-8',
        metadata: {
          artifactType: 'readiness-report',
          format: 'markdown',
        },
      });
    }

    return artifacts;
  }

  /**
   * Validate that an intent can be exported.
   */
  validate(intent: ValidatedIntent): ValidationResult {
    const simResult = this.simulationDetector.detect(intent);
    const finResult = this.financialDetector.detect(intent);

    const warnings = [];

    if (!simResult.hasSimulationArtifacts && !finResult.hasFinancialArtifacts) {
      warnings.push({
        code: 'ENT_NO_ARTIFACTS',
        message: 'No simulation or financial artifacts detected',
      });
    }

    if (!simResult.hasSimulationArtifacts) {
      warnings.push({
        code: 'ENT_NO_SIMULATION',
        message: 'No simulation artifacts - implementation plan will not be included',
      });
    }

    if (!finResult.hasFinancialArtifacts) {
      warnings.push({
        code: 'ENT_NO_FINANCIAL',
        message: 'No financial artifacts - ROI analysis will not be included',
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
    const simResult = this.simulationDetector.detect(intent);
    const finResult = this.financialDetector.detect(intent);
    return simResult.hasSimulationArtifacts || finResult.hasFinancialArtifacts;
  }

  /**
   * Get required serializers.
   */
  getRequiredSerializers(): readonly SerializerType[] {
    return ['json', 'yaml'];
  }

  // ===========================================================================
  // MANIFEST GENERATION
  // ===========================================================================

  /**
   * Generate the unified enterprise manifest.
   */
  private generateManifest(
    intent: NormalizedIntent,
    simResult: SimulationDetectionResult,
    finResult: FinancialDetectionResult
  ): EnterpriseManifest {
    const manifestId = this.generateManifestId(intent.checksum);
    const timestamp = intent.createdAt;

    const simulationSummary = this.generateSimulationSummary(simResult);
    const financialSummary = this.generateFinancialSummary(finResult);
    const recommendations = this.generateCombinedRecommendations(simResult, finResult);
    const readinessAssessment = this.generateReadinessAssessment(simResult, finResult);
    const artifacts = this.generateArtifactsList(simResult, finResult);

    return {
      manifestId,
      version: '1.0.0',
      generatedAt: timestamp,
      sourceIntent: {
        intentId: intent.intentId,
        intentHash: intent.checksum,
        intentVersion: intent.version,
      },
      simulation: simulationSummary,
      financial: financialSummary,
      recommendations,
      readinessAssessment,
      artifacts,
      audit: {
        generatedAt: timestamp,
        exporterVersion: this.version,
        intentId: intent.intentId,
        intentVersion: intent.version,
        intentHash: intent.checksum,
        simulationExports: simResult.hasSimulationArtifacts ? 5 : 0,
        financialExports: finResult.hasFinancialArtifacts ? 6 : 0,
        totalExports: artifacts.length,
      },
    };
  }

  /**
   * Generate manifest ID.
   */
  private generateManifestId(intentHash: string): string {
    const hash = createHash('sha256')
      .update(`enterprise:${intentHash}`)
      .digest('hex')
      .substring(0, 16);
    return `ent-manifest-${hash}`;
  }

  /**
   * Generate simulation summary.
   */
  private generateSimulationSummary(
    result: SimulationDetectionResult
  ): EnterpriseSimulationSummary {
    const plan = result.implementationPlan;
    const topPriorities: string[] = [];

    if (plan) {
      const criticalItems = plan.items.filter(i => i.priority === 'critical' || i.priority === 'high');
      topPriorities.push(...criticalItems.slice(0, 3).map(i => i.title));
    }

    const summary: EnterpriseSimulationSummary = {
      hasArtifacts: result.hasSimulationArtifacts,
      artifactCount: result.references.length,
      implementationItemCount: plan?.items.length ?? 0,
      phaseCount: plan?.phases.length ?? 0,
      topPriorities,
      ...(plan?.planId !== undefined && { planId: plan.planId }),
    };
    return summary;
  }

  /**
   * Generate financial summary.
   */
  private generateFinancialSummary(
    result: FinancialDetectionResult
  ): EnterpriseFinancialSummary {
    const report = result.roiReport;

    const summary: EnterpriseFinancialSummary = {
      hasArtifacts: result.hasFinancialArtifacts,
      artifactCount: result.references.length,
      primaryCurrency: result.summary.primaryCurrency,
      ...(report?.reportId !== undefined && { reportId: report.reportId }),
      ...(report?.roiMetrics.roiPercentage !== undefined && { roiPercentage: report.roiMetrics.roiPercentage }),
      ...(report?.roiMetrics.paybackPeriodMonths !== undefined && { paybackMonths: report.roiMetrics.paybackPeriodMonths }),
      ...(report?.roiMetrics.totalInvestment !== undefined && {
        totalInvestment: this.formatCurrency(report.roiMetrics.totalInvestment.amount, report.roiMetrics.totalInvestment.currency),
      }),
      ...(report?.totalSavings !== undefined && {
        projectedSavings: this.formatCurrency(report.totalSavings.amount, report.totalSavings.currency),
      }),
    };
    return summary;
  }

  /**
   * Generate combined recommendations.
   */
  private generateCombinedRecommendations(
    simResult: SimulationDetectionResult,
    finResult: FinancialDetectionResult
  ): readonly EnterpriseRecommendation[] {
    const recommendations: EnterpriseRecommendation[] = [];

    // Add simulation recommendations
    if (simResult.implementationPlan) {
      for (const rec of simResult.implementationPlan.recommendations) {
        recommendations.push({
          id: rec.recommendationId,
          category: 'simulation',
          priority: rec.priority as 'critical' | 'high' | 'medium' | 'low',
          title: rec.title,
          description: rec.description,
          source: 'Simulation Analysis',
          actionItems: rec.actionItems,
        });
      }
    }

    // Add financial-based recommendations
    if (finResult.roiReport) {
      const report = finResult.roiReport;

      // ROI recommendation
      if (report.roiMetrics.roiPercentage !== undefined) {
        const priority = report.roiMetrics.roiPercentage > 100 ? 'high' :
          report.roiMetrics.roiPercentage > 50 ? 'medium' : 'low';

        recommendations.push({
          id: `fin-roi-${report.reportId}`,
          category: 'financial',
          priority,
          title: 'ROI Analysis Complete',
          description: `Projected ROI of ${report.roiMetrics.roiPercentage.toFixed(1)}% based on financial analysis.`,
          source: 'Financial Analysis',
          actionItems: [
            'Review ROI projections with finance team',
            'Validate assumptions in financial model',
            'Approve budget allocation for implementation',
          ],
        });
      }

      // Risk recommendations
      for (const risk of report.riskFactors) {
        if (risk.likelihood > 0.5) {
          recommendations.push({
            id: risk.riskId,
            category: 'financial',
            priority: risk.likelihood > 0.7 ? 'high' : 'medium',
            title: `Risk: ${risk.description.substring(0, 50)}...`,
            description: risk.description,
            source: 'Risk Assessment',
            actionItems: risk.mitigation ? [risk.mitigation] : ['Develop mitigation strategy'],
          });
        }
      }
    }

    // Sort by priority
    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Generate readiness assessment.
   */
  private generateReadinessAssessment(
    simResult: SimulationDetectionResult,
    finResult: FinancialDetectionResult
  ): ReadinessAssessment {
    const checklist: ChecklistItem[] = [];
    const blockers: string[] = [];
    const warnings: string[] = [];
    let score = 0;
    let totalChecks = 0;

    // Simulation checks
    totalChecks++;
    if (simResult.hasSimulationArtifacts) {
      score += 20;
      checklist.push({
        id: 'sim-artifacts',
        category: 'Simulation',
        description: 'Simulation artifacts present',
        status: 'pass',
      });
    } else {
      checklist.push({
        id: 'sim-artifacts',
        category: 'Simulation',
        description: 'Simulation artifacts present',
        status: 'warning',
        details: 'No simulation data - consider running simulations before deployment',
      });
      warnings.push('No simulation artifacts - implementation risks not assessed');
    }

    // Implementation plan check
    totalChecks++;
    if (simResult.implementationPlan) {
      score += 20;
      checklist.push({
        id: 'impl-plan',
        category: 'Planning',
        description: 'Implementation plan generated',
        status: 'pass',
      });
    } else {
      checklist.push({
        id: 'impl-plan',
        category: 'Planning',
        description: 'Implementation plan generated',
        status: simResult.hasSimulationArtifacts ? 'fail' : 'pending',
      });
    }

    // Financial checks
    totalChecks++;
    if (finResult.hasFinancialArtifacts) {
      score += 20;
      checklist.push({
        id: 'fin-artifacts',
        category: 'Financial',
        description: 'Financial artifacts present',
        status: 'pass',
      });
    } else {
      checklist.push({
        id: 'fin-artifacts',
        category: 'Financial',
        description: 'Financial artifacts present',
        status: 'warning',
        details: 'No financial data - ROI not calculated',
      });
      warnings.push('No financial artifacts - ROI and cost analysis not available');
    }

    // ROI check
    totalChecks++;
    if (finResult.roiReport) {
      score += 20;
      checklist.push({
        id: 'roi-report',
        category: 'Financial',
        description: 'ROI report generated',
        status: 'pass',
      });

      // Check ROI positivity
      if (finResult.roiReport.roiMetrics.roiPercentage !== undefined) {
        totalChecks++;
        if (finResult.roiReport.roiMetrics.roiPercentage > 0) {
          score += 20;
          checklist.push({
            id: 'roi-positive',
            category: 'Financial',
            description: 'Positive ROI projected',
            status: 'pass',
          });
        } else {
          checklist.push({
            id: 'roi-positive',
            category: 'Financial',
            description: 'Positive ROI projected',
            status: 'fail',
            details: 'Negative ROI - review investment decision',
          });
          blockers.push('Negative ROI projected - requires business justification');
        }
      }
    } else {
      checklist.push({
        id: 'roi-report',
        category: 'Financial',
        description: 'ROI report generated',
        status: finResult.hasFinancialArtifacts ? 'fail' : 'pending',
      });
    }

    // Confidence check
    totalChecks++;
    const highConfidenceRefs = [
      ...simResult.references.filter(r => r.confidence >= 0.8),
      ...finResult.references.filter(r => r.confidence >= 0.8),
    ];
    const totalRefs = simResult.references.length + finResult.references.length;
    const highConfidenceRatio = totalRefs > 0 ? highConfidenceRefs.length / totalRefs : 0;

    if (highConfidenceRatio >= 0.7) {
      score += 10;
      checklist.push({
        id: 'confidence',
        category: 'Quality',
        description: 'High confidence detection rate',
        status: 'pass',
      });
    } else if (highConfidenceRatio >= 0.4) {
      score += 5;
      checklist.push({
        id: 'confidence',
        category: 'Quality',
        description: 'High confidence detection rate',
        status: 'warning',
        details: 'Some artifacts have lower confidence - validate manually',
      });
      warnings.push('Some artifact detections have lower confidence');
    } else {
      checklist.push({
        id: 'confidence',
        category: 'Quality',
        description: 'High confidence detection rate',
        status: 'fail',
        details: 'Low confidence across most detections',
      });
    }

    // Calculate normalized score (0-100)
    const normalizedScore = Math.min(100, Math.round((score / (totalChecks * 20)) * 100));

    // Determine status
    let status: 'ready' | 'ready-with-warnings' | 'needs-review' | 'not-ready';
    if (blockers.length > 0) {
      status = 'not-ready';
    } else if (normalizedScore >= 80 && warnings.length === 0) {
      status = 'ready';
    } else if (normalizedScore >= 60) {
      status = 'ready-with-warnings';
    } else {
      status = 'needs-review';
    }

    return {
      overallScore: normalizedScore,
      status,
      checklist,
      blockers,
      warnings,
    };
  }

  /**
   * Generate artifacts list.
   */
  private generateArtifactsList(
    simResult: SimulationDetectionResult,
    finResult: FinancialDetectionResult
  ): readonly ArtifactManifestEntry[] {
    const artifacts: ArtifactManifestEntry[] = [];

    if (simResult.hasSimulationArtifacts) {
      artifacts.push(
        { path: 'simulation-exports/implementation-plan.json', type: 'implementation-plan', format: 'json', category: 'simulation' },
        { path: 'simulation-exports/implementation-plan.yaml', type: 'implementation-plan', format: 'yaml', category: 'simulation' },
        { path: 'simulation-exports/executive-summary.md', type: 'executive-summary', format: 'markdown', category: 'simulation' },
        { path: 'simulation-exports/detailed-report.md', type: 'detailed-report', format: 'markdown', category: 'simulation' },
        { path: 'simulation-exports/manifest.json', type: 'manifest', format: 'json', category: 'simulation' }
      );
    }

    if (finResult.hasFinancialArtifacts) {
      artifacts.push(
        { path: 'financial-exports/roi-report.json', type: 'roi-report', format: 'json', category: 'financial' },
        { path: 'financial-exports/roi-report.yaml', type: 'roi-report', format: 'yaml', category: 'financial' },
        { path: 'financial-exports/executive-summary.md', type: 'executive-summary', format: 'markdown', category: 'financial' },
        { path: 'financial-exports/detailed-report.md', type: 'detailed-report', format: 'markdown', category: 'financial' },
        { path: 'financial-exports/cost-breakdown.csv', type: 'cost-breakdown', format: 'csv', category: 'financial' },
        { path: 'financial-exports/savings-analysis.csv', type: 'savings-analysis', format: 'csv', category: 'financial' },
        { path: 'financial-exports/manifest.json', type: 'manifest', format: 'json', category: 'financial' }
      );
    }

    artifacts.push(
      { path: 'enterprise-exports/enterprise-manifest.json', type: 'enterprise-manifest', format: 'json', category: 'enterprise' },
      { path: 'enterprise-exports/enterprise-manifest.yaml', type: 'enterprise-manifest', format: 'yaml', category: 'enterprise' },
      { path: 'enterprise-exports/enterprise-summary.md', type: 'executive-summary', format: 'markdown', category: 'enterprise' },
      { path: 'enterprise-exports/readiness-report.md', type: 'readiness-report', format: 'markdown', category: 'enterprise' }
    );

    return artifacts;
  }

  // ===========================================================================
  // MARKDOWN RENDERING
  // ===========================================================================

  /**
   * Render executive summary.
   */
  private renderExecutiveSummary(
    manifest: EnterpriseManifest,
    _simResult: SimulationDetectionResult,
    _finResult: FinancialDetectionResult
  ): string {
    const lines: string[] = [];

    lines.push('# Enterprise Deployment Summary');
    lines.push('');
    lines.push(`**Manifest ID:** ${manifest.manifestId}`);
    lines.push(`**Generated:** ${manifest.generatedAt}`);
    lines.push(`**Readiness Score:** ${manifest.readinessAssessment.overallScore}/100 (${this.formatStatus(manifest.readinessAssessment.status)})`);
    lines.push('');

    // Overview
    lines.push('## Overview');
    lines.push('');
    lines.push(`This enterprise deployment package includes ${manifest.artifacts.length} artifacts covering:`);
    lines.push('');
    if (manifest.simulation.hasArtifacts) {
      lines.push(`- **Simulation Analysis:** ${manifest.simulation.artifactCount} simulation artifact(s) analyzed`);
      lines.push(`  - ${manifest.simulation.implementationItemCount} implementation items across ${manifest.simulation.phaseCount} phases`);
    }
    if (manifest.financial.hasArtifacts) {
      lines.push(`- **Financial Analysis:** ${manifest.financial.artifactCount} financial artifact(s) analyzed`);
      if (manifest.financial.roiPercentage !== undefined) {
        lines.push(`  - Projected ROI: ${manifest.financial.roiPercentage.toFixed(1)}%`);
      }
      if (manifest.financial.projectedSavings) {
        lines.push(`  - Projected Savings: ${manifest.financial.projectedSavings}/year`);
      }
    }
    lines.push('');

    // Key Metrics
    lines.push('## Key Metrics');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Readiness Score | ${manifest.readinessAssessment.overallScore}/100 |`);
    if (manifest.financial.roiPercentage !== undefined) {
      lines.push(`| ROI | ${manifest.financial.roiPercentage.toFixed(1)}% |`);
    }
    if (manifest.financial.paybackMonths !== undefined) {
      lines.push(`| Payback Period | ${manifest.financial.paybackMonths} months |`);
    }
    if (manifest.financial.totalInvestment) {
      lines.push(`| Total Investment | ${manifest.financial.totalInvestment} |`);
    }
    lines.push(`| Implementation Items | ${manifest.simulation.implementationItemCount} |`);
    lines.push(`| Recommendations | ${manifest.recommendations.length} |`);
    lines.push('');

    // Top Recommendations
    if (manifest.recommendations.length > 0) {
      lines.push('## Top Recommendations');
      lines.push('');
      const topRecs = manifest.recommendations.slice(0, 5);
      for (const rec of topRecs) {
        lines.push(`### ${rec.title}`);
        lines.push('');
        lines.push(`**Priority:** ${this.formatPriority(rec.priority)} | **Source:** ${rec.source}`);
        lines.push('');
        lines.push(rec.description);
        lines.push('');
      }
    }

    // Readiness Summary
    lines.push('## Deployment Readiness');
    lines.push('');
    lines.push(`**Status:** ${this.formatStatus(manifest.readinessAssessment.status)}`);
    lines.push('');

    if (manifest.readinessAssessment.blockers.length > 0) {
      lines.push('### Blockers');
      for (const blocker of manifest.readinessAssessment.blockers) {
        lines.push(`- ❌ ${blocker}`);
      }
      lines.push('');
    }

    if (manifest.readinessAssessment.warnings.length > 0) {
      lines.push('### Warnings');
      for (const warning of manifest.readinessAssessment.warnings) {
        lines.push(`- ⚠️ ${warning}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('*Generated by Agentics Deployment Exporters - Enterprise Module*');

    return lines.join('\n');
  }

  /**
   * Render readiness report.
   */
  private renderReadinessReport(manifest: EnterpriseManifest): string {
    const lines: string[] = [];
    const assessment = manifest.readinessAssessment;

    lines.push('# Deployment Readiness Report');
    lines.push('');
    lines.push(`**Manifest ID:** ${manifest.manifestId}`);
    lines.push(`**Generated:** ${manifest.generatedAt}`);
    lines.push('');

    // Score Banner
    lines.push('## Overall Score');
    lines.push('');
    lines.push(`### ${assessment.overallScore}/100`);
    lines.push('');
    lines.push(`**Status:** ${this.formatStatus(assessment.status)}`);
    lines.push('');

    // Checklist
    lines.push('## Readiness Checklist');
    lines.push('');
    lines.push('| Check | Category | Status | Details |');
    lines.push('|-------|----------|--------|---------|');
    for (const item of assessment.checklist) {
      const statusIcon = item.status === 'pass' ? '✅' :
        item.status === 'fail' ? '❌' :
          item.status === 'warning' ? '⚠️' : '⏳';
      lines.push(`| ${item.description} | ${item.category} | ${statusIcon} ${item.status} | ${item.details ?? '-'} |`);
    }
    lines.push('');

    // Blockers
    if (assessment.blockers.length > 0) {
      lines.push('## Blockers');
      lines.push('');
      lines.push('The following issues must be resolved before deployment:');
      lines.push('');
      for (const blocker of assessment.blockers) {
        lines.push(`- ❌ **${blocker}**`);
      }
      lines.push('');
    }

    // Warnings
    if (assessment.warnings.length > 0) {
      lines.push('## Warnings');
      lines.push('');
      lines.push('The following issues should be reviewed:');
      lines.push('');
      for (const warning of assessment.warnings) {
        lines.push(`- ⚠️ ${warning}`);
      }
      lines.push('');
    }

    // Next Steps
    lines.push('## Recommended Next Steps');
    lines.push('');
    if (assessment.status === 'ready') {
      lines.push('1. Review the implementation plan with stakeholders');
      lines.push('2. Confirm budget approval based on ROI analysis');
      lines.push('3. Schedule deployment timeline');
      lines.push('4. Proceed with implementation');
    } else if (assessment.status === 'ready-with-warnings') {
      lines.push('1. Review and address warnings listed above');
      lines.push('2. Validate assumptions with subject matter experts');
      lines.push('3. Obtain stakeholder sign-off');
      lines.push('4. Proceed with implementation after review');
    } else if (assessment.status === 'needs-review') {
      lines.push('1. Schedule review meeting with technical and business teams');
      lines.push('2. Address low confidence detections with additional data');
      lines.push('3. Complete missing simulation or financial analysis');
      lines.push('4. Re-run assessment after improvements');
    } else {
      lines.push('1. **Resolve blockers before proceeding**');
      lines.push('2. Address all failed checklist items');
      lines.push('3. Re-run deployment assessment');
      lines.push('4. Do not proceed until blockers are cleared');
    }
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('*Generated by Agentics Deployment Exporters - Enterprise Module*');

    return lines.join('\n');
  }

  /**
   * Format currency value.
   */
  private formatCurrency(amount: number, currency: string): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return formatter.format(amount);
  }

  /**
   * Format priority.
   */
  private formatPriority(priority: string): string {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }

  /**
   * Format status.
   */
  private formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'ready': '✅ Ready for Deployment',
      'ready-with-warnings': '⚠️ Ready with Warnings',
      'needs-review': '🔍 Needs Review',
      'not-ready': '❌ Not Ready',
    };
    return statusMap[status] ?? status;
  }
}

/**
 * Factory function to create an Enterprise Manifest Generator.
 */
export function createEnterpriseManifestGenerator(
  options?: EnterpriseManifestOptions
): EnterpriseManifestGenerator {
  return new EnterpriseManifestGenerator(options);
}
