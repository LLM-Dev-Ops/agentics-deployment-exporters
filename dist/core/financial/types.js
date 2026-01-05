/**
 * Financial Artifact Types
 *
 * Type definitions for recognizing and processing financial artifacts
 * produced by enterprise-roi-engine. These types enable the exporter
 * to identify ROI calculations and transform them into enterprise reports.
 *
 * The exporter remains a passive translator - it does NOT modify financial
 * calculations or generate new ROI projections. It only recognizes and
 * exports existing financial artifacts.
 *
 * @module core/financial/types
 * @version 1.0.0
 */
import { z } from 'zod';
// =============================================================================
// FINANCIAL SOURCE TYPES
// =============================================================================
/**
 * Types of financial sources that can be detected.
 */
export const FinancialSourceValues = [
    'enterprise-roi-engine',
    'cost-calculator',
    'tco-analyzer',
    'budget-planner',
    'financial-modeler',
    'custom',
    'unknown',
];
export const FinancialSourceSchema = z.enum(FinancialSourceValues);
// =============================================================================
// FINANCIAL ARTIFACT TYPES
// =============================================================================
/**
 * Types of financial artifacts that can be recognized.
 */
export const FinancialArtifactTypeValues = [
    'roi-calculation', // Return on Investment calculation
    'tco-analysis', // Total Cost of Ownership analysis
    'cost-breakdown', // Detailed cost breakdown
    'budget-projection', // Budget projections
    'savings-analysis', // Savings/cost avoidance analysis
    'payback-period', // Payback period calculation
    'npv-analysis', // Net Present Value analysis
    'irr-calculation', // Internal Rate of Return
    'cost-comparison', // Cost comparison between options
    'resource-costing', // Resource-specific costing
    'license-cost', // License cost analysis
    'operational-cost', // OpEx analysis
    'capital-cost', // CapEx analysis
    'migration-cost', // Migration cost estimates
    'risk-adjusted-return', // Risk-adjusted financial returns
];
export const FinancialArtifactTypeSchema = z.enum(FinancialArtifactTypeValues);
// =============================================================================
// CURRENCY AND TIME PERIOD
// =============================================================================
/**
 * Supported currencies.
 */
export const CurrencyValues = [
    'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CHF', 'CAD', 'AUD',
    'INR', 'BRL', 'KRW', 'SGD', 'HKD', 'OTHER',
];
export const CurrencySchema = z.enum(CurrencyValues);
/**
 * Time period units for financial projections.
 */
export const TimePeriodUnitValues = [
    'monthly',
    'quarterly',
    'annual',
    'multi-year',
];
export const TimePeriodUnitSchema = z.enum(TimePeriodUnitValues);
export const FinancialArtifactReferenceSchema = z.object({
    referenceId: z.string(),
    source: FinancialSourceSchema,
    artifactType: FinancialArtifactTypeSchema,
    sourceType: z.string(),
    sourcePath: z.string(),
    resourceName: z.string(),
    originalProperties: z.record(z.unknown()),
    currency: CurrencySchema,
    timePeriod: TimePeriodUnitSchema.optional(),
    projectionHorizon: z.number().optional(),
    calculatedAt: z.string().optional(),
    confidence: z.number().min(0).max(1),
});
export const MonetaryValueSchema = z.object({
    amount: z.number(),
    currency: CurrencySchema,
    period: TimePeriodUnitSchema.optional(),
    isEstimate: z.boolean(),
    confidenceRange: z.tuple([z.number(), z.number()]).optional(),
});
export const ROIMetricsSchema = z.object({
    roiPercentage: z.number().optional(),
    npv: MonetaryValueSchema.optional(),
    irr: z.number().optional(),
    paybackPeriodMonths: z.number().optional(),
    totalInvestment: MonetaryValueSchema.optional(),
    totalReturns: MonetaryValueSchema.optional(),
    netBenefit: MonetaryValueSchema.optional(),
    breakEvenDate: z.string().optional(),
});
// =============================================================================
// COST CATEGORY
// =============================================================================
/**
 * Cost categories for breakdown analysis.
 */
export const CostCategoryValues = [
    'infrastructure',
    'compute',
    'storage',
    'network',
    'database',
    'licensing',
    'personnel',
    'training',
    'migration',
    'integration',
    'maintenance',
    'support',
    'security',
    'compliance',
    'other',
];
export const CostCategorySchema = z.enum(CostCategoryValues);
export const CostLineItemSchema = z.object({
    itemId: z.string(),
    category: CostCategorySchema,
    description: z.string(),
    amount: MonetaryValueSchema,
    isRecurring: z.boolean(),
    resourceName: z.string().optional(),
    notes: z.string().optional(),
});
export const CostBreakdownSchema = z.object({
    capex: MonetaryValueSchema,
    opex: MonetaryValueSchema,
    tco: MonetaryValueSchema,
    lineItems: z.array(CostLineItemSchema),
    byCategory: z.record(MonetaryValueSchema),
    projectionMonths: z.number(),
});
export const SavingsItemSchema = z.object({
    itemId: z.string(),
    type: z.enum(['direct-savings', 'cost-avoidance', 'efficiency-gain', 'risk-reduction']),
    description: z.string(),
    amount: MonetaryValueSchema,
    category: CostCategorySchema,
    methodology: z.string().optional(),
    confidence: z.number().min(0).max(1),
});
export const FinancialDetectionResultSchema = z.object({
    hasFinancialArtifacts: z.boolean(),
    references: z.array(FinancialArtifactReferenceSchema),
    roiReport: z.any().optional(),
    summary: z.object({
        totalReferences: z.number(),
        bySource: z.record(z.number()),
        byArtifactType: z.record(z.number()),
        primaryCurrency: CurrencySchema,
        highConfidenceCount: z.number(),
        hasSufficientDataForROI: z.boolean(),
    }),
});
// =============================================================================
// EXPORT FORMAT OPTIONS
// =============================================================================
/**
 * Output format options for financial artifact exports.
 */
export const FinancialExportFormatValues = [
    'roi-report-json',
    'roi-report-yaml',
    'executive-summary-md',
    'detailed-report-md',
    'cost-breakdown-csv',
    'savings-analysis-csv',
    'financial-dashboard-json',
];
export const FinancialExportFormatSchema = z.enum(FinancialExportFormatValues);
// =============================================================================
// TYPE GUARDS
// =============================================================================
/**
 * Type guard for FinancialSource.
 */
export function isFinancialSource(value) {
    return typeof value === 'string' && FinancialSourceValues.includes(value);
}
/**
 * Type guard for FinancialArtifactType.
 */
export function isFinancialArtifactType(value) {
    return typeof value === 'string' && FinancialArtifactTypeValues.includes(value);
}
/**
 * Type guard for Currency.
 */
export function isCurrency(value) {
    return typeof value === 'string' && CurrencyValues.includes(value);
}
/**
 * Type guard for CostCategory.
 */
export function isCostCategory(value) {
    return typeof value === 'string' && CostCategoryValues.includes(value);
}
//# sourceMappingURL=types.js.map