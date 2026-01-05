/**
 * Financial Exporter
 *
 * Exports financial artifacts as ROI reports, cost breakdowns, and
 * executive summaries suitable for enterprise review.
 *
 * This exporter is a passive translator - it transforms detected financial
 * artifacts into structured output formats without modifying financial logic.
 *
 * @module exporters/financial/FinancialExporter
 * @version 1.0.0
 */
import type { IExporter } from '../../core/interfaces.js';
import type { ExportArtifact, ExporterId, ExportFormat, ExportOptions, NormalizedIntent, SemanticVersion, SerializerType, ValidatedIntent, ValidationResult } from '../../core/types.js';
/**
 * Options for financial export.
 */
export interface FinancialExportOptions {
    /**
     * Generate ROI report in JSON format.
     * @default true
     */
    readonly generateReportJson?: boolean;
    /**
     * Generate ROI report in YAML format.
     * @default true
     */
    readonly generateReportYaml?: boolean;
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
     * Generate cost breakdown CSV.
     * @default true
     */
    readonly generateCostCsv?: boolean;
    /**
     * Generate savings analysis CSV.
     * @default true
     */
    readonly generateSavingsCsv?: boolean;
    /**
     * Base output path for artifacts.
     * @default 'financial-exports'
     */
    readonly basePath?: string;
    /**
     * Minimum confidence threshold for including references.
     * @default 0.5
     */
    readonly minConfidence?: number;
}
/**
 * Financial Exporter class.
 *
 * Transforms financial artifacts detected in deployment intents into
 * ROI reports and cost analyses for enterprise review.
 */
export declare class FinancialExporter implements IExporter {
    readonly id: ExporterId;
    readonly name = "Financial Artifact Exporter";
    readonly version: SemanticVersion;
    readonly targetFormat: ExportFormat;
    private readonly detector;
    private readonly options;
    constructor(options?: FinancialExportOptions);
    /**
     * Transform a normalized intent into financial export artifacts.
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
     * Generate ROI report JSON artifact.
     */
    private generateReportJsonArtifact;
    /**
     * Generate ROI report YAML artifact.
     */
    private generateReportYamlArtifact;
    /**
     * Generate executive summary Markdown artifact.
     */
    private generateExecutiveSummaryArtifact;
    /**
     * Generate detailed report Markdown artifact.
     */
    private generateDetailedReportArtifact;
    /**
     * Generate cost breakdown CSV artifact.
     */
    private generateCostCsvArtifact;
    /**
     * Generate savings analysis CSV artifact.
     */
    private generateSavingsCsvArtifact;
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
     * Format currency value.
     */
    private formatCurrency;
    /**
     * Escape CSV value.
     */
    private escapeCsv;
}
/**
 * Factory function to create a Financial Exporter.
 */
export declare function createFinancialExporter(options?: FinancialExportOptions): FinancialExporter;
//# sourceMappingURL=FinancialExporter.d.ts.map