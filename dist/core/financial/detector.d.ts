/**
 * Financial Artifact Detector
 *
 * Detects financial artifacts produced by enterprise-roi-engine within
 * deployment intents. This module identifies ROI calculations, cost analyses,
 * and budget projections.
 *
 * The detector is deterministic - same input always produces identical output.
 * No network calls or external services are used.
 *
 * @module core/financial/detector
 * @version 1.0.0
 */
import type { ValidatedIntent } from '../types.js';
import type { FinancialDetectionResult, Currency } from './types.js';
/**
 * Options for financial detection.
 */
export interface FinancialDetectorOptions {
    /**
     * Minimum confidence threshold for including references.
     * @default 0.5
     */
    readonly minConfidence?: number;
    /**
     * Generate ROI report if sufficient artifacts found.
     * @default true
     */
    readonly generateReport?: boolean;
    /**
     * Include original properties in references.
     * @default true
     */
    readonly includeOriginalProperties?: boolean;
    /**
     * Default currency if not detected.
     * @default 'USD'
     */
    readonly defaultCurrency?: Currency;
}
/**
 * Financial Artifact Detector class.
 *
 * Detects financial artifacts in deployment intents and optionally generates
 * ROI reports from the detected artifacts.
 *
 * All operations are deterministic and produce identical output for
 * identical input.
 */
export declare class FinancialArtifactDetector {
    private readonly options;
    constructor(options?: FinancialDetectorOptions);
    /**
     * Detect financial artifacts in a validated intent.
     *
     * @param intent - The validated deployment intent to scan
     * @returns Detection result with all found references and optional report
     */
    detect(intent: ValidatedIntent): FinancialDetectionResult;
    /**
     * Detect financial references in a single resource.
     */
    private detectResourceReferences;
    /**
     * Create a financial artifact reference.
     */
    private createReference;
    /**
     * Extract string property from properties object.
     */
    private extractStringProperty;
    /**
     * Extract number property from properties object.
     */
    private extractNumberProperty;
    /**
     * Generate detection summary.
     */
    private generateSummary;
    /**
     * Generate enterprise ROI report from detected financial artifacts.
     */
    private generateROIReport;
    /**
     * Generate a deterministic report ID.
     */
    private generateReportId;
    /**
     * Extract ROI metrics from references.
     */
    private extractROIMetrics;
    /**
     * Extract cost breakdown from references.
     */
    private extractCostBreakdown;
    /**
     * Extract category-specific cost items.
     */
    private extractCategoryItems;
    /**
     * Extract savings items from references.
     */
    private extractSavings;
    /**
     * Calculate total savings.
     */
    private calculateTotalSavings;
    /**
     * Generate financial highlights.
     */
    private generateHighlights;
    /**
     * Extract risk factors from references.
     */
    private extractRiskFactors;
    /**
     * Extract assumptions from references.
     */
    private extractAssumptions;
    /**
     * Get projection horizon from references.
     */
    private getProjectionHorizon;
    /**
     * Generate executive summary.
     */
    private generateExecutiveSummary;
    /**
     * Create a monetary value.
     */
    private createMonetaryValue;
    /**
     * Format currency value.
     */
    private formatCurrency;
}
/**
 * Factory function to create a Financial Artifact Detector.
 */
export declare function createFinancialArtifactDetector(options?: FinancialDetectorOptions): FinancialArtifactDetector;
//# sourceMappingURL=detector.d.ts.map