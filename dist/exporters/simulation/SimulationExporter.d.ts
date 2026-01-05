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
import type { ExportArtifact, ExporterId, ExportFormat, ExportOptions, NormalizedIntent, SemanticVersion, SerializerType, ValidatedIntent, ValidationResult } from '../../core/types.js';
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
/**
 * Simulation Exporter class.
 *
 * Transforms simulation artifacts detected in deployment intents into
 * implementation plans and reports for enterprise review.
 */
export declare class SimulationExporter implements IExporter {
    readonly id: ExporterId;
    readonly name = "Simulation Artifact Exporter";
    readonly version: SemanticVersion;
    readonly targetFormat: ExportFormat;
    private readonly detector;
    private readonly options;
    constructor(options?: SimulationExportOptions);
    /**
     * Transform a normalized intent into simulation export artifacts.
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
     * Generate implementation plan JSON artifact.
     */
    private generatePlanJsonArtifact;
    /**
     * Generate implementation plan YAML artifact.
     */
    private generatePlanYamlArtifact;
    /**
     * Generate executive summary Markdown artifact.
     */
    private generateExecutiveSummaryArtifact;
    /**
     * Generate detailed report Markdown artifact.
     */
    private generateDetailedReportArtifact;
    /**
     * Generate timeline visualization artifact.
     */
    private generateTimelineArtifact;
    /**
     * Generate manifest artifact.
     */
    private generateManifestArtifact;
    /**
     * Render executive summary Markdown.
     */
    private renderExecutiveSummary;
    /**
     * Render detailed report Markdown.
     */
    private renderDetailedReport;
    /**
     * Count items by priority.
     */
    private countByPriority;
    /**
     * Format priority for display.
     */
    private formatPriority;
}
/**
 * Factory function to create a Simulation Exporter.
 */
export declare function createSimulationExporter(options?: SimulationExportOptions): SimulationExporter;
//# sourceMappingURL=SimulationExporter.d.ts.map