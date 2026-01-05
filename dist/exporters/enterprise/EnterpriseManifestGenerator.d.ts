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
import type { IExporter } from '../../core/interfaces.js';
import type { ExportArtifact, ExporterId, ExportFormat, ExportOptions, NormalizedIntent, SemanticVersion, SerializerType, ValidatedIntent, ValidationResult } from '../../core/types.js';
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
    readonly overallScore: number;
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
/**
 * Enterprise Manifest Generator class.
 *
 * Creates unified enterprise manifests combining simulation and financial
 * artifact exports into comprehensive deployment packages.
 */
export declare class EnterpriseManifestGenerator implements IExporter {
    readonly id: ExporterId;
    readonly name = "Enterprise Manifest Generator";
    readonly version: SemanticVersion;
    readonly targetFormat: ExportFormat;
    private readonly simulationDetector;
    private readonly financialDetector;
    private readonly options;
    constructor(options?: EnterpriseManifestOptions);
    /**
     * Transform a normalized intent into enterprise manifest artifacts.
     */
    transform(intent: NormalizedIntent, _options?: ExportOptions): readonly ExportArtifact[];
    /**
     * Validate that an intent can be exported.
     */
    validate(intent: ValidatedIntent): ValidationResult;
    /**
     * Check if this exporter can handle the given intent.
     */
    canHandle(intent: ValidatedIntent): boolean;
    /**
     * Get required serializers.
     */
    getRequiredSerializers(): readonly SerializerType[];
    /**
     * Generate the unified enterprise manifest.
     */
    private generateManifest;
    /**
     * Generate manifest ID.
     */
    private generateManifestId;
    /**
     * Generate simulation summary.
     */
    private generateSimulationSummary;
    /**
     * Generate financial summary.
     */
    private generateFinancialSummary;
    /**
     * Generate combined recommendations.
     */
    private generateCombinedRecommendations;
    /**
     * Generate readiness assessment.
     */
    private generateReadinessAssessment;
    /**
     * Generate artifacts list.
     */
    private generateArtifactsList;
    /**
     * Render executive summary.
     */
    private renderExecutiveSummary;
    /**
     * Render readiness report.
     */
    private renderReadinessReport;
    /**
     * Format currency value.
     */
    private formatCurrency;
    /**
     * Format priority.
     */
    private formatPriority;
    /**
     * Format status.
     */
    private formatStatus;
}
/**
 * Factory function to create an Enterprise Manifest Generator.
 */
export declare function createEnterpriseManifestGenerator(options?: EnterpriseManifestOptions): EnterpriseManifestGenerator;
//# sourceMappingURL=EnterpriseManifestGenerator.d.ts.map