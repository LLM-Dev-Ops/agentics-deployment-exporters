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
] as const;

export type FinancialSource = (typeof FinancialSourceValues)[number];

export const FinancialSourceSchema = z.enum(FinancialSourceValues);

// =============================================================================
// FINANCIAL ARTIFACT TYPES
// =============================================================================

/**
 * Types of financial artifacts that can be recognized.
 */
export const FinancialArtifactTypeValues = [
  'roi-calculation',        // Return on Investment calculation
  'tco-analysis',           // Total Cost of Ownership analysis
  'cost-breakdown',         // Detailed cost breakdown
  'budget-projection',      // Budget projections
  'savings-analysis',       // Savings/cost avoidance analysis
  'payback-period',         // Payback period calculation
  'npv-analysis',           // Net Present Value analysis
  'irr-calculation',        // Internal Rate of Return
  'cost-comparison',        // Cost comparison between options
  'resource-costing',       // Resource-specific costing
  'license-cost',           // License cost analysis
  'operational-cost',       // OpEx analysis
  'capital-cost',           // CapEx analysis
  'migration-cost',         // Migration cost estimates
  'risk-adjusted-return',   // Risk-adjusted financial returns
] as const;

export type FinancialArtifactType = (typeof FinancialArtifactTypeValues)[number];

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
] as const;

export type Currency = (typeof CurrencyValues)[number];

export const CurrencySchema = z.enum(CurrencyValues);

/**
 * Time period units for financial projections.
 */
export const TimePeriodUnitValues = [
  'monthly',
  'quarterly',
  'annual',
  'multi-year',
] as const;

export type TimePeriodUnit = (typeof TimePeriodUnitValues)[number];

export const TimePeriodUnitSchema = z.enum(TimePeriodUnitValues);

// =============================================================================
// FINANCIAL ARTIFACT REFERENCE
// =============================================================================

/**
 * Represents a detected financial artifact reference within a deployment intent.
 */
export interface FinancialArtifactReference {
  /**
   * Unique identifier for this reference within the intent.
   */
  readonly referenceId: string;

  /**
   * Source system that produced this financial artifact.
   */
  readonly source: FinancialSource;

  /**
   * Type of financial artifact.
   */
  readonly artifactType: FinancialArtifactType;

  /**
   * Resource type string that triggered detection.
   */
  readonly sourceType: string;

  /**
   * JSONPath to the resource within the intent.
   */
  readonly sourcePath: string;

  /**
   * Name of the resource containing this reference.
   */
  readonly resourceName: string;

  /**
   * Original properties associated with this financial artifact.
   */
  readonly originalProperties: Readonly<Record<string, unknown>>;

  /**
   * Primary currency for financial values.
   */
  readonly currency: Currency;

  /**
   * Time period for projections.
   */
  readonly timePeriod?: TimePeriodUnit;

  /**
   * Projection duration (number of periods).
   */
  readonly projectionHorizon?: number;

  /**
   * Calculation timestamp (if available).
   */
  readonly calculatedAt?: string;

  /**
   * Confidence score for this detection (0.0 - 1.0).
   */
  readonly confidence: number;
}

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

// =============================================================================
// MONETARY VALUE
// =============================================================================

/**
 * A monetary value with currency and period context.
 */
export interface MonetaryValue {
  /**
   * The numeric amount.
   */
  readonly amount: number;

  /**
   * Currency code.
   */
  readonly currency: Currency;

  /**
   * Time period this value applies to.
   */
  readonly period?: TimePeriodUnit;

  /**
   * Whether this is an estimated/projected value.
   */
  readonly isEstimate: boolean;

  /**
   * Confidence range (low, high) if estimated.
   */
  readonly confidenceRange?: readonly [number, number];
}

export const MonetaryValueSchema = z.object({
  amount: z.number(),
  currency: CurrencySchema,
  period: TimePeriodUnitSchema.optional(),
  isEstimate: z.boolean(),
  confidenceRange: z.tuple([z.number(), z.number()]).optional(),
});

// =============================================================================
// ROI METRICS
// =============================================================================

/**
 * ROI calculation results extracted from financial artifacts.
 */
export interface ROIMetrics {
  /**
   * Return on Investment percentage.
   */
  readonly roiPercentage?: number;

  /**
   * Net Present Value.
   */
  readonly npv?: MonetaryValue;

  /**
   * Internal Rate of Return percentage.
   */
  readonly irr?: number;

  /**
   * Payback period in months.
   */
  readonly paybackPeriodMonths?: number;

  /**
   * Total investment required.
   */
  readonly totalInvestment?: MonetaryValue;

  /**
   * Total expected returns.
   */
  readonly totalReturns?: MonetaryValue;

  /**
   * Net benefit (returns - investment).
   */
  readonly netBenefit?: MonetaryValue;

  /**
   * Break-even point timestamp.
   */
  readonly breakEvenDate?: string;
}

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
] as const;

export type CostCategory = (typeof CostCategoryValues)[number];

export const CostCategorySchema = z.enum(CostCategoryValues);

/**
 * A single cost line item.
 */
export interface CostLineItem {
  /**
   * Item identifier.
   */
  readonly itemId: string;

  /**
   * Category of cost.
   */
  readonly category: CostCategory;

  /**
   * Human-readable description.
   */
  readonly description: string;

  /**
   * The cost amount.
   */
  readonly amount: MonetaryValue;

  /**
   * Whether this is a one-time or recurring cost.
   */
  readonly isRecurring: boolean;

  /**
   * Associated resource (if applicable).
   */
  readonly resourceName?: string;

  /**
   * Notes or justification.
   */
  readonly notes?: string;
}

export const CostLineItemSchema = z.object({
  itemId: z.string(),
  category: CostCategorySchema,
  description: z.string(),
  amount: MonetaryValueSchema,
  isRecurring: z.boolean(),
  resourceName: z.string().optional(),
  notes: z.string().optional(),
});

// =============================================================================
// COST BREAKDOWN
// =============================================================================

/**
 * Complete cost breakdown analysis.
 */
export interface CostBreakdown {
  /**
   * Total capital expenditure (one-time costs).
   */
  readonly capex: MonetaryValue;

  /**
   * Total operational expenditure (recurring costs).
   */
  readonly opex: MonetaryValue;

  /**
   * Total cost of ownership.
   */
  readonly tco: MonetaryValue;

  /**
   * Individual line items.
   */
  readonly lineItems: readonly CostLineItem[];

  /**
   * Costs grouped by category.
   */
  readonly byCategory: Readonly<Record<CostCategory, MonetaryValue>>;

  /**
   * Projection period in months.
   */
  readonly projectionMonths: number;
}

export const CostBreakdownSchema = z.object({
  capex: MonetaryValueSchema,
  opex: MonetaryValueSchema,
  tco: MonetaryValueSchema,
  lineItems: z.array(CostLineItemSchema),
  byCategory: z.record(MonetaryValueSchema),
  projectionMonths: z.number(),
});

// =============================================================================
// SAVINGS ITEM
// =============================================================================

/**
 * A savings or cost avoidance item.
 */
export interface SavingsItem {
  /**
   * Item identifier.
   */
  readonly itemId: string;

  /**
   * Type of savings.
   */
  readonly type: 'direct-savings' | 'cost-avoidance' | 'efficiency-gain' | 'risk-reduction';

  /**
   * Human-readable description.
   */
  readonly description: string;

  /**
   * The savings amount.
   */
  readonly amount: MonetaryValue;

  /**
   * Category this saving applies to.
   */
  readonly category: CostCategory;

  /**
   * Calculation methodology.
   */
  readonly methodology?: string;

  /**
   * Confidence level (0.0 - 1.0).
   */
  readonly confidence: number;
}

export const SavingsItemSchema = z.object({
  itemId: z.string(),
  type: z.enum(['direct-savings', 'cost-avoidance', 'efficiency-gain', 'risk-reduction']),
  description: z.string(),
  amount: MonetaryValueSchema,
  category: CostCategorySchema,
  methodology: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

// =============================================================================
// ENTERPRISE ROI REPORT
// =============================================================================

/**
 * Complete ROI report suitable for enterprise review.
 */
export interface EnterpriseROIReport {
  /**
   * Report identifier.
   */
  readonly reportId: string;

  /**
   * Report version.
   */
  readonly version: string;

  /**
   * Report title.
   */
  readonly title: string;

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
   * Executive summary.
   */
  readonly executiveSummary: string;

  /**
   * Key financial highlights.
   */
  readonly highlights: readonly FinancialHighlight[];

  /**
   * ROI metrics.
   */
  readonly roiMetrics: ROIMetrics;

  /**
   * Cost breakdown.
   */
  readonly costBreakdown: CostBreakdown;

  /**
   * Identified savings.
   */
  readonly savings: readonly SavingsItem[];

  /**
   * Total projected savings.
   */
  readonly totalSavings: MonetaryValue;

  /**
   * Risk factors considered.
   */
  readonly riskFactors: readonly RiskFactor[];

  /**
   * Assumptions made in calculations.
   */
  readonly assumptions: readonly string[];

  /**
   * Financial artifact references used.
   */
  readonly financialReferences: readonly string[];

  /**
   * Audit information.
   */
  readonly audit: FinancialReportAudit;
}

/**
 * A financial highlight for executive summary.
 */
export interface FinancialHighlight {
  /**
   * Highlight category.
   */
  readonly category: 'roi' | 'savings' | 'cost' | 'risk' | 'timeline';

  /**
   * Title.
   */
  readonly title: string;

  /**
   * Value or description.
   */
  readonly value: string;

  /**
   * Trend indicator.
   */
  readonly trend?: 'positive' | 'negative' | 'neutral';

  /**
   * Supporting detail.
   */
  readonly detail?: string;
}

/**
 * A risk factor with financial impact.
 */
export interface RiskFactor {
  /**
   * Risk identifier.
   */
  readonly riskId: string;

  /**
   * Risk description.
   */
  readonly description: string;

  /**
   * Likelihood (0.0 - 1.0).
   */
  readonly likelihood: number;

  /**
   * Potential financial impact.
   */
  readonly impact: MonetaryValue;

  /**
   * Mitigation strategy.
   */
  readonly mitigation?: string;
}

/**
 * Audit information for financial report.
 */
export interface FinancialReportAudit {
  /**
   * Intent ID that generated this report.
   */
  readonly intentId: string;

  /**
   * Intent version.
   */
  readonly intentVersion: string;

  /**
   * Intent hash.
   */
  readonly intentHash: string;

  /**
   * Generation timestamp.
   */
  readonly generatedAt: string;

  /**
   * Exporter version.
   */
  readonly exporterVersion: string;

  /**
   * Financial artifact count.
   */
  readonly artifactCount: number;

  /**
   * Primary currency used.
   */
  readonly primaryCurrency: Currency;

  /**
   * Projection horizon in months.
   */
  readonly projectionHorizonMonths: number;
}

// =============================================================================
// DETECTION RESULT
// =============================================================================

/**
 * Result of financial artifact detection on an intent.
 */
export interface FinancialDetectionResult {
  /**
   * Whether any financial artifacts were detected.
   */
  readonly hasFinancialArtifacts: boolean;

  /**
   * All detected financial artifact references.
   */
  readonly references: readonly FinancialArtifactReference[];

  /**
   * Generated ROI report (if sufficient artifacts found).
   */
  readonly roiReport?: EnterpriseROIReport;

  /**
   * Summary statistics.
   */
  readonly summary: FinancialDetectionSummary;
}

/**
 * Summary statistics for financial detection.
 */
export interface FinancialDetectionSummary {
  readonly totalReferences: number;
  readonly bySource: Readonly<Record<FinancialSource, number>>;
  readonly byArtifactType: Readonly<Record<FinancialArtifactType, number>>;
  readonly primaryCurrency: Currency;
  readonly highConfidenceCount: number;
  readonly hasSufficientDataForROI: boolean;
}

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
] as const;

export type FinancialExportFormat = (typeof FinancialExportFormatValues)[number];

export const FinancialExportFormatSchema = z.enum(FinancialExportFormatValues);

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for FinancialSource.
 */
export function isFinancialSource(value: unknown): value is FinancialSource {
  return typeof value === 'string' && FinancialSourceValues.includes(value as FinancialSource);
}

/**
 * Type guard for FinancialArtifactType.
 */
export function isFinancialArtifactType(value: unknown): value is FinancialArtifactType {
  return typeof value === 'string' && FinancialArtifactTypeValues.includes(value as FinancialArtifactType);
}

/**
 * Type guard for Currency.
 */
export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && CurrencyValues.includes(value as Currency);
}

/**
 * Type guard for CostCategory.
 */
export function isCostCategory(value: unknown): value is CostCategory {
  return typeof value === 'string' && CostCategoryValues.includes(value as CostCategory);
}
