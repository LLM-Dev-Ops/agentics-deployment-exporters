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

import { createHash } from 'crypto';
import type { IntentResource, ValidatedIntent, SemanticVersion } from '../types.js';
import type {
  FinancialArtifactReference,
  FinancialArtifactType,
  FinancialDetectionResult,
  FinancialDetectionSummary,
  FinancialSource,
  Currency,
  TimePeriodUnit,
  EnterpriseROIReport,
  ROIMetrics,
  CostBreakdown,
  CostLineItem,
  CostCategory,
  SavingsItem,
  MonetaryValue,
  FinancialHighlight,
  RiskFactor,
  FinancialReportAudit,
} from './types.js';

// =============================================================================
// DETECTION PATTERNS
// =============================================================================

/**
 * Patterns for detecting financial source references in resource types.
 */
interface FinancialPattern {
  readonly pattern: RegExp;
  readonly source: FinancialSource;
  readonly artifactType?: FinancialArtifactType;
  readonly confidence: number;
}

const SOURCE_TYPE_PATTERNS: readonly FinancialPattern[] = [
  // enterprise-roi-engine patterns (primary target)
  { pattern: /^roi:/i, source: 'enterprise-roi-engine', confidence: 1.0 },
  { pattern: /^enterprise[-_]?roi/i, source: 'enterprise-roi-engine', confidence: 1.0 },
  { pattern: /roi[-_]?engine:/i, source: 'enterprise-roi-engine', confidence: 0.95 },
  { pattern: /^roi[-_]?calculation/i, source: 'enterprise-roi-engine', artifactType: 'roi-calculation', confidence: 0.9 },
  { pattern: /^tco[-_]?analysis/i, source: 'enterprise-roi-engine', artifactType: 'tco-analysis', confidence: 0.9 },
  { pattern: /^cost[-_]?breakdown/i, source: 'enterprise-roi-engine', artifactType: 'cost-breakdown', confidence: 0.9 },

  // Cost calculator patterns
  { pattern: /^cost[-_]?calculator/i, source: 'cost-calculator', confidence: 0.95 },
  { pattern: /pricing[-_]?calculator/i, source: 'cost-calculator', confidence: 0.85 },
  { pattern: /cost[-_]?estimate/i, source: 'cost-calculator', artifactType: 'cost-breakdown', confidence: 0.8 },

  // TCO analyzer patterns
  { pattern: /^tco[-_]?analyzer/i, source: 'tco-analyzer', confidence: 0.95 },
  { pattern: /total[-_]?cost[-_]?ownership/i, source: 'tco-analyzer', artifactType: 'tco-analysis', confidence: 0.9 },

  // Budget planner patterns
  { pattern: /^budget[-_]?planner/i, source: 'budget-planner', confidence: 0.95 },
  { pattern: /budget[-_]?projection/i, source: 'budget-planner', artifactType: 'budget-projection', confidence: 0.85 },

  // Financial modeler patterns
  { pattern: /^financial[-_]?model/i, source: 'financial-modeler', confidence: 0.95 },
  { pattern: /npv[-_]?analysis/i, source: 'financial-modeler', artifactType: 'npv-analysis', confidence: 0.85 },
  { pattern: /irr[-_]?calculation/i, source: 'financial-modeler', artifactType: 'irr-calculation', confidence: 0.85 },

  // Generic financial patterns (lower confidence)
  { pattern: /^financial[-_]?analysis/i, source: 'unknown', confidence: 0.7 },
  { pattern: /cost[-_]?analysis/i, source: 'unknown', artifactType: 'cost-breakdown', confidence: 0.7 },
  { pattern: /savings[-_]?analysis/i, source: 'unknown', artifactType: 'savings-analysis', confidence: 0.7 },
];

/**
 * Patterns for detecting financial references in property keys and values.
 */
interface PropertyPattern {
  readonly keyPattern?: RegExp;
  readonly valuePattern?: RegExp;
  readonly source: FinancialSource;
  readonly artifactType?: FinancialArtifactType;
  readonly confidence: number;
}

const PROPERTY_PATTERNS: readonly PropertyPattern[] = [
  // ROI engine identifiers
  { keyPattern: /roi[-_]?engine/i, source: 'enterprise-roi-engine', confidence: 0.9 },
  { keyPattern: /roi[-_]?calculation[-_]?id/i, source: 'enterprise-roi-engine', artifactType: 'roi-calculation', confidence: 0.85 },
  { valuePattern: /^roi[-_]?[0-9a-f]{8}/i, source: 'enterprise-roi-engine', confidence: 0.8 },

  // ROI specific patterns
  { keyPattern: /return[-_]?on[-_]?investment/i, source: 'enterprise-roi-engine', artifactType: 'roi-calculation', confidence: 0.9 },
  { keyPattern: /roi[-_]?percentage/i, source: 'enterprise-roi-engine', artifactType: 'roi-calculation', confidence: 0.9 },
  { keyPattern: /payback[-_]?period/i, source: 'enterprise-roi-engine', artifactType: 'payback-period', confidence: 0.85 },

  // NPV/IRR patterns
  { keyPattern: /net[-_]?present[-_]?value/i, source: 'financial-modeler', artifactType: 'npv-analysis', confidence: 0.9 },
  { keyPattern: /internal[-_]?rate[-_]?return/i, source: 'financial-modeler', artifactType: 'irr-calculation', confidence: 0.9 },
  { keyPattern: /discount[-_]?rate/i, source: 'financial-modeler', artifactType: 'npv-analysis', confidence: 0.8 },

  // TCO patterns
  { keyPattern: /total[-_]?cost[-_]?ownership/i, source: 'tco-analyzer', artifactType: 'tco-analysis', confidence: 0.9 },
  { keyPattern: /tco[-_]?breakdown/i, source: 'tco-analyzer', artifactType: 'tco-analysis', confidence: 0.85 },

  // Cost breakdown patterns
  { keyPattern: /capex/i, source: 'cost-calculator', artifactType: 'capital-cost', confidence: 0.85 },
  { keyPattern: /opex/i, source: 'cost-calculator', artifactType: 'operational-cost', confidence: 0.85 },
  { keyPattern: /infrastructure[-_]?cost/i, source: 'cost-calculator', artifactType: 'cost-breakdown', confidence: 0.8 },
  { keyPattern: /license[-_]?cost/i, source: 'cost-calculator', artifactType: 'license-cost', confidence: 0.8 },

  // Savings patterns
  { keyPattern: /projected[-_]?savings/i, source: 'enterprise-roi-engine', artifactType: 'savings-analysis', confidence: 0.85 },
  { keyPattern: /cost[-_]?avoidance/i, source: 'enterprise-roi-engine', artifactType: 'savings-analysis', confidence: 0.85 },
  { keyPattern: /efficiency[-_]?gain/i, source: 'enterprise-roi-engine', artifactType: 'savings-analysis', confidence: 0.8 },

  // Migration cost patterns
  { keyPattern: /migration[-_]?cost/i, source: 'cost-calculator', artifactType: 'migration-cost', confidence: 0.85 },
  { keyPattern: /transition[-_]?cost/i, source: 'cost-calculator', artifactType: 'migration-cost', confidence: 0.8 },

  // Resource costing patterns
  { keyPattern: /resource[-_]?cost/i, source: 'cost-calculator', artifactType: 'resource-costing', confidence: 0.8 },
  { keyPattern: /compute[-_]?cost/i, source: 'cost-calculator', artifactType: 'resource-costing', confidence: 0.8 },
  { keyPattern: /storage[-_]?cost/i, source: 'cost-calculator', artifactType: 'resource-costing', confidence: 0.8 },

  // Budget patterns
  { keyPattern: /budget[-_]?allocation/i, source: 'budget-planner', artifactType: 'budget-projection', confidence: 0.85 },
  { keyPattern: /annual[-_]?budget/i, source: 'budget-planner', artifactType: 'budget-projection', confidence: 0.8 },

  // Generic financial patterns
  { keyPattern: /financial[-_]?metrics/i, source: 'unknown', confidence: 0.7 },
  { keyPattern: /cost[-_]?model/i, source: 'unknown', artifactType: 'cost-breakdown', confidence: 0.7 },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Detect financial source from a resource type string.
 */
function detectSourceFromType(
  resourceType: string
): { source: FinancialSource; artifactType: FinancialArtifactType; confidence: number } | null {
  for (const pattern of SOURCE_TYPE_PATTERNS) {
    if (pattern.pattern.test(resourceType)) {
      return {
        source: pattern.source,
        artifactType: pattern.artifactType ?? 'roi-calculation',
        confidence: pattern.confidence,
      };
    }
  }
  return null;
}

/**
 * Detect financial references from resource properties.
 */
function detectSourceFromProperties(
  properties: Readonly<Record<string, unknown>>
): Array<{ source: FinancialSource; artifactType: FinancialArtifactType; confidence: number; matchedPattern: string }> {
  const results: Array<{ source: FinancialSource; artifactType: FinancialArtifactType; confidence: number; matchedPattern: string }> = [];

  function scanValue(key: string, value: unknown, path: string): void {
    for (const pattern of PROPERTY_PATTERNS) {
      if (pattern.keyPattern && pattern.keyPattern.test(key)) {
        results.push({
          source: pattern.source,
          artifactType: pattern.artifactType ?? 'roi-calculation',
          confidence: pattern.confidence,
          matchedPattern: `key:${key} at ${path}`,
        });
      }

      if (pattern.valuePattern && typeof value === 'string' && pattern.valuePattern.test(value)) {
        results.push({
          source: pattern.source,
          artifactType: pattern.artifactType ?? 'roi-calculation',
          confidence: pattern.confidence,
          matchedPattern: `value:${value} at ${path}.${key}`,
        });
      }
    }

    // Recursively scan nested objects
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
        scanValue(nestedKey, nestedValue, `${path}.${key}`);
      }
    }

    // Scan array elements
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item !== null && typeof item === 'object') {
          for (const [nestedKey, nestedValue] of Object.entries(item as Record<string, unknown>)) {
            scanValue(nestedKey, nestedValue, `${path}.${key}[${index}]`);
          }
        }
      });
    }
  }

  for (const [key, value] of Object.entries(properties)) {
    scanValue(key, value, '$');
  }

  return results;
}

/**
 * Generate a deterministic reference ID.
 */
function generateReferenceId(
  intentHash: string,
  resourceName: string,
  source: FinancialSource,
  index: number
): string {
  const input = `${intentHash}:fin:${resourceName}:${source}:${index}`;
  const hash = createHash('sha256').update(input).digest('hex').substring(0, 12);
  return `fin-ref-${hash}`;
}

/**
 * Find a property value by key (case-insensitive).
 */
function findProperty(properties: Readonly<Record<string, unknown>>, key: string): unknown {
  const lowerKey = key.toLowerCase();
  for (const [k, v] of Object.entries(properties)) {
    if (k.toLowerCase() === lowerKey || k.toLowerCase().replace(/[-_]/g, '') === lowerKey.replace(/[-_]/g, '')) {
      return v;
    }
  }
  return undefined;
}

/**
 * Detect currency from properties.
 */
function detectCurrency(properties: Readonly<Record<string, unknown>>, defaultCurrency: Currency = 'USD'): Currency {
  const currencyKeys = ['currency', 'currencyCode', 'currency_code'];
  for (const key of currencyKeys) {
    const value = findProperty(properties, key);
    if (typeof value === 'string') {
      const upper = value.toUpperCase();
      const currencies: Currency[] = [
        'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CHF', 'CAD', 'AUD',
        'INR', 'BRL', 'KRW', 'SGD', 'HKD',
      ];
      if (currencies.includes(upper as Currency)) {
        return upper as Currency;
      }
    }
  }
  return defaultCurrency; // Use provided default
}

/**
 * Detect time period from properties.
 */
function detectTimePeriod(properties: Readonly<Record<string, unknown>>): TimePeriodUnit | undefined {
  const periodKeys = ['timePeriod', 'period', 'periodUnit', 'time_period'];
  for (const key of periodKeys) {
    const value = findProperty(properties, key);
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower.includes('month')) return 'monthly';
      if (lower.includes('quarter')) return 'quarterly';
      if (lower.includes('annual') || lower.includes('year')) return 'annual';
      if (lower.includes('multi')) return 'multi-year';
    }
  }
  return undefined;
}

// =============================================================================
// DETECTOR OPTIONS
// =============================================================================

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

// =============================================================================
// MAIN DETECTOR CLASS
// =============================================================================

/**
 * Financial Artifact Detector class.
 *
 * Detects financial artifacts in deployment intents and optionally generates
 * ROI reports from the detected artifacts.
 *
 * All operations are deterministic and produce identical output for
 * identical input.
 */
export class FinancialArtifactDetector {
  private readonly options: Required<FinancialDetectorOptions>;

  constructor(options: FinancialDetectorOptions = {}) {
    this.options = {
      minConfidence: options.minConfidence ?? 0.5,
      generateReport: options.generateReport ?? true,
      includeOriginalProperties: options.includeOriginalProperties ?? true,
      defaultCurrency: options.defaultCurrency ?? 'USD',
    };
  }

  /**
   * Detect financial artifacts in a validated intent.
   *
   * @param intent - The validated deployment intent to scan
   * @returns Detection result with all found references and optional report
   */
  detect(intent: ValidatedIntent): FinancialDetectionResult {
    const references: FinancialArtifactReference[] = [];
    const timestamp = intent.createdAt;
    const intentHash = intent.checksum;

    // Scan all resources
    const resources = intent.spec.resources;
    for (let i = 0; i < resources.length; i++) {
      const resource = resources[i]!;
      const resourceRefs = this.detectResourceReferences(
        resource,
        i,
        intentHash
      );
      references.push(...resourceRefs);
    }

    // Sort for determinism
    references.sort((a, b) => a.referenceId.localeCompare(b.referenceId, 'en'));

    // Generate summary
    const summary = this.generateSummary(references);

    // Generate ROI report if enabled and sufficient artifacts found
    let roiReport: EnterpriseROIReport | undefined;
    if (this.options.generateReport && summary.hasSufficientDataForROI) {
      roiReport = this.generateROIReport(
        references,
        intent.intentId,
        intent.version,
        intentHash,
        timestamp,
        summary.primaryCurrency
      );
    }

    const result: FinancialDetectionResult = {
      hasFinancialArtifacts: references.length > 0,
      references,
      summary,
      ...(roiReport !== undefined && { roiReport }),
    };
    return result;
  }

  /**
   * Detect financial references in a single resource.
   */
  private detectResourceReferences(
    resource: IntentResource,
    resourceIndex: number,
    intentHash: string
  ): FinancialArtifactReference[] {
    const references: FinancialArtifactReference[] = [];
    let refIndex = 0;

    // Check resource type
    const typeMatch = detectSourceFromType(resource.type);
    if (typeMatch && typeMatch.confidence >= this.options.minConfidence) {
      const reference = this.createReference(
        resource,
        resourceIndex,
        refIndex++,
        intentHash,
        typeMatch.source,
        typeMatch.artifactType,
        typeMatch.confidence
      );
      references.push(reference);
    }

    // Check properties
    const propertyMatches = detectSourceFromProperties(resource.properties);
    for (const match of propertyMatches) {
      if (match.confidence >= this.options.minConfidence) {
        // Avoid duplicates by checking if we already have a higher confidence match
        const existingRef = references.find(
          r => r.source === match.source && r.resourceName === resource.name
        );
        if (!existingRef || existingRef.confidence < match.confidence) {
          if (existingRef) {
            // Remove lower confidence duplicate
            const idx = references.indexOf(existingRef);
            references.splice(idx, 1);
          }
          const reference = this.createReference(
            resource,
            resourceIndex,
            refIndex++,
            intentHash,
            match.source,
            match.artifactType,
            match.confidence
          );
          references.push(reference);
        }
      }
    }

    return references;
  }

  /**
   * Create a financial artifact reference.
   */
  private createReference(
    resource: IntentResource,
    resourceIndex: number,
    refIndex: number,
    intentHash: string,
    source: FinancialSource,
    artifactType: FinancialArtifactType,
    confidence: number
  ): FinancialArtifactReference {
    const properties = this.options.includeOriginalProperties
      ? resource.properties
      : {};

    const currency = detectCurrency(resource.properties, this.options.defaultCurrency);
    const timePeriod = detectTimePeriod(resource.properties);
    const projectionHorizon = this.extractNumberProperty(resource.properties, ['projectionHorizon', 'projection_horizon', 'horizonMonths']);
    const calculatedAt = this.extractStringProperty(resource.properties, ['calculatedAt', 'calculated_at', 'timestamp']);

    const baseReference = {
      referenceId: generateReferenceId(intentHash, resource.name, source, refIndex),
      source,
      artifactType,
      sourceType: resource.type,
      sourcePath: `$.spec.resources[${resourceIndex}]`,
      resourceName: resource.name,
      originalProperties: properties,
      currency,
      confidence,
    };

    // Build complete reference with conditional optional properties
    const result: FinancialArtifactReference = {
      ...baseReference,
      ...(timePeriod !== undefined && { timePeriod }),
      ...(projectionHorizon !== undefined && { projectionHorizon }),
      ...(calculatedAt !== undefined && { calculatedAt }),
    };

    return result;
  }

  /**
   * Extract string property from properties object.
   */
  private extractStringProperty(
    properties: Readonly<Record<string, unknown>>,
    keys: readonly string[]
  ): string | undefined {
    for (const key of keys) {
      const value = findProperty(properties, key);
      if (typeof value === 'string') {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Extract number property from properties object.
   */
  private extractNumberProperty(
    properties: Readonly<Record<string, unknown>>,
    keys: readonly string[]
  ): number | undefined {
    for (const key of keys) {
      const value = findProperty(properties, key);
      if (typeof value === 'number') {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Generate detection summary.
   */
  private generateSummary(
    references: readonly FinancialArtifactReference[]
  ): FinancialDetectionSummary {
    const bySource: Record<FinancialSource, number> = {} as Record<FinancialSource, number>;
    const byArtifactType: Record<FinancialArtifactType, number> = {} as Record<FinancialArtifactType, number>;

    // Count by source and type
    for (const ref of references) {
      bySource[ref.source] = (bySource[ref.source] ?? 0) + 1;
      byArtifactType[ref.artifactType] = (byArtifactType[ref.artifactType] ?? 0) + 1;
    }

    // Determine primary currency
    const currencyCount = new Map<Currency, number>();
    for (const ref of references) {
      const count = currencyCount.get(ref.currency) ?? 0;
      currencyCount.set(ref.currency, count + 1);
    }
    let primaryCurrency: Currency = this.options.defaultCurrency;
    let maxCount = 0;
    for (const [currency, count] of currencyCount) {
      if (count > maxCount) {
        primaryCurrency = currency;
        maxCount = count;
      }
    }

    // Determine if sufficient data for ROI report
    const hasSufficientDataForROI = references.length >= 1 && (
      (byArtifactType['roi-calculation'] ?? 0) > 0 ||
      (byArtifactType['cost-breakdown'] ?? 0) > 0 ||
      (byArtifactType['tco-analysis'] ?? 0) > 0
    );

    return {
      totalReferences: references.length,
      bySource,
      byArtifactType,
      primaryCurrency,
      highConfidenceCount: references.filter(r => r.confidence >= 0.9).length,
      hasSufficientDataForROI,
    };
  }

  /**
   * Generate enterprise ROI report from detected financial artifacts.
   */
  private generateROIReport(
    references: readonly FinancialArtifactReference[],
    intentId: string,
    intentVersion: SemanticVersion,
    intentHash: string,
    timestamp: string,
    primaryCurrency: Currency
  ): EnterpriseROIReport {
    const reportId = this.generateReportId(intentHash);
    const roiMetrics = this.extractROIMetrics(references, primaryCurrency);
    const costBreakdown = this.extractCostBreakdown(references, primaryCurrency);
    const savings = this.extractSavings(references, primaryCurrency);
    const totalSavings = this.calculateTotalSavings(savings, primaryCurrency);
    const highlights = this.generateHighlights(roiMetrics, costBreakdown, totalSavings);
    const riskFactors = this.extractRiskFactors(references, primaryCurrency);

    const audit: FinancialReportAudit = {
      intentId,
      intentVersion,
      intentHash,
      generatedAt: timestamp,
      exporterVersion: '1.0.0',
      artifactCount: references.length,
      primaryCurrency,
      projectionHorizonMonths: this.getProjectionHorizon(references),
    };

    return {
      reportId,
      version: '1.0.0',
      title: 'Enterprise ROI Analysis Report',
      generatedAt: timestamp,
      sourceIntent: {
        intentId,
        intentHash,
        intentVersion,
      },
      executiveSummary: this.generateExecutiveSummary(references, roiMetrics, totalSavings),
      highlights,
      roiMetrics,
      costBreakdown,
      savings,
      totalSavings,
      riskFactors,
      assumptions: this.extractAssumptions(references),
      financialReferences: references.map(r => r.referenceId),
      audit,
    };
  }

  /**
   * Generate a deterministic report ID.
   */
  private generateReportId(intentHash: string): string {
    const hash = createHash('sha256')
      .update(`roi-report:${intentHash}`)
      .digest('hex')
      .substring(0, 16);
    return `roi-report-${hash}`;
  }

  /**
   * Extract ROI metrics from references.
   */
  private extractROIMetrics(
    references: readonly FinancialArtifactReference[],
    currency: Currency
  ): ROIMetrics {
    // Collect values as mutable data first
    let roiPercentage: number | undefined;
    let npv: MonetaryValue | undefined;
    let irr: number | undefined;
    let paybackPeriodMonths: number | undefined;
    let totalInvestment: MonetaryValue | undefined;
    let totalReturns: MonetaryValue | undefined;

    for (const ref of references) {
      const props = ref.originalProperties;

      // Extract ROI percentage
      const roi = this.extractNumberProperty(props, ['roiPercentage', 'roi', 'returnOnInvestment']);
      if (roi !== undefined && roiPercentage === undefined) {
        roiPercentage = roi;
      }

      // Extract NPV
      const npvVal = this.extractNumberProperty(props, ['npv', 'netPresentValue', 'net_present_value']);
      if (npvVal !== undefined && npv === undefined) {
        npv = this.createMonetaryValue(npvVal, currency);
      }

      // Extract IRR
      const irrVal = this.extractNumberProperty(props, ['irr', 'internalRateOfReturn', 'internal_rate_return']);
      if (irrVal !== undefined && irr === undefined) {
        irr = irrVal;
      }

      // Extract payback period
      const payback = this.extractNumberProperty(props, ['paybackPeriodMonths', 'payback_months', 'paybackPeriod']);
      if (payback !== undefined && paybackPeriodMonths === undefined) {
        paybackPeriodMonths = payback;
      }

      // Extract total investment
      const investment = this.extractNumberProperty(props, ['totalInvestment', 'total_investment', 'investmentAmount']);
      if (investment !== undefined && totalInvestment === undefined) {
        totalInvestment = this.createMonetaryValue(investment, currency);
      }

      // Extract total returns
      const returns = this.extractNumberProperty(props, ['totalReturns', 'total_returns', 'projectedReturns']);
      if (returns !== undefined && totalReturns === undefined) {
        totalReturns = this.createMonetaryValue(returns, currency);
      }
    }

    // Calculate net benefit if we have investment and returns
    const netBenefit = (totalInvestment && totalReturns)
      ? this.createMonetaryValue(totalReturns.amount - totalInvestment.amount, currency)
      : undefined;

    // Build the final ROIMetrics object with only defined values
    const result: ROIMetrics = {
      ...(roiPercentage !== undefined && { roiPercentage }),
      ...(npv !== undefined && { npv }),
      ...(irr !== undefined && { irr }),
      ...(paybackPeriodMonths !== undefined && { paybackPeriodMonths }),
      ...(totalInvestment !== undefined && { totalInvestment }),
      ...(totalReturns !== undefined && { totalReturns }),
      ...(netBenefit !== undefined && { netBenefit }),
    };

    return result;
  }

  /**
   * Extract cost breakdown from references.
   */
  private extractCostBreakdown(
    references: readonly FinancialArtifactReference[],
    currency: Currency
  ): CostBreakdown {
    let capexTotal = 0;
    let opexTotal = 0;
    const lineItems: CostLineItem[] = [];
    const byCategory: Partial<Record<CostCategory, MonetaryValue>> = {};

    for (const ref of references) {
      const props = ref.originalProperties;

      // Extract CapEx
      const capex = this.extractNumberProperty(props, ['capex', 'capitalExpenditure', 'capital_cost']);
      if (capex !== undefined) {
        capexTotal += capex;
        lineItems.push({
          itemId: `capex-${ref.referenceId}`,
          category: 'infrastructure',
          description: `Capital expenditure from ${ref.resourceName}`,
          amount: this.createMonetaryValue(capex, currency, false),
          isRecurring: false,
          resourceName: ref.resourceName,
        });
      }

      // Extract OpEx
      const opex = this.extractNumberProperty(props, ['opex', 'operationalExpenditure', 'operational_cost']);
      if (opex !== undefined) {
        opexTotal += opex;
        lineItems.push({
          itemId: `opex-${ref.referenceId}`,
          category: 'maintenance',
          description: `Operational expenditure from ${ref.resourceName}`,
          amount: this.createMonetaryValue(opex, currency, false, 'annual'),
          isRecurring: true,
          resourceName: ref.resourceName,
        });
      }

      // Extract specific cost categories
      this.extractCategoryItems(ref, props, currency, lineItems, byCategory);
    }

    const tco = capexTotal + opexTotal;

    return {
      capex: this.createMonetaryValue(capexTotal, currency, false),
      opex: this.createMonetaryValue(opexTotal, currency, false, 'annual'),
      tco: this.createMonetaryValue(tco, currency, true),
      lineItems,
      byCategory: byCategory as Readonly<Record<CostCategory, MonetaryValue>>,
      projectionMonths: this.getProjectionHorizon(references),
    };
  }

  /**
   * Extract category-specific cost items.
   */
  private extractCategoryItems(
    ref: FinancialArtifactReference,
    props: Readonly<Record<string, unknown>>,
    currency: Currency,
    lineItems: CostLineItem[],
    byCategory: Partial<Record<CostCategory, MonetaryValue>>
  ): void {
    const categoryMappings: Array<{ keys: readonly string[]; category: CostCategory; isRecurring: boolean }> = [
      { keys: ['computeCost', 'compute_cost'], category: 'compute', isRecurring: true },
      { keys: ['storageCost', 'storage_cost'], category: 'storage', isRecurring: true },
      { keys: ['networkCost', 'network_cost'], category: 'network', isRecurring: true },
      { keys: ['databaseCost', 'database_cost'], category: 'database', isRecurring: true },
      { keys: ['licenseCost', 'license_cost', 'licensingCost'], category: 'licensing', isRecurring: true },
      { keys: ['personnelCost', 'personnel_cost', 'laborCost'], category: 'personnel', isRecurring: true },
      { keys: ['trainingCost', 'training_cost'], category: 'training', isRecurring: false },
      { keys: ['migrationCost', 'migration_cost'], category: 'migration', isRecurring: false },
      { keys: ['integrationCost', 'integration_cost'], category: 'integration', isRecurring: false },
      { keys: ['maintenanceCost', 'maintenance_cost'], category: 'maintenance', isRecurring: true },
      { keys: ['supportCost', 'support_cost'], category: 'support', isRecurring: true },
      { keys: ['securityCost', 'security_cost'], category: 'security', isRecurring: true },
      { keys: ['complianceCost', 'compliance_cost'], category: 'compliance', isRecurring: true },
    ];

    for (const mapping of categoryMappings) {
      const value = this.extractNumberProperty(props, mapping.keys);
      if (value !== undefined) {
        const amount = this.createMonetaryValue(value, currency, false, mapping.isRecurring ? 'annual' : undefined);
        lineItems.push({
          itemId: `${mapping.category}-${ref.referenceId}`,
          category: mapping.category,
          description: `${mapping.category} cost from ${ref.resourceName}`,
          amount,
          isRecurring: mapping.isRecurring,
          resourceName: ref.resourceName,
        });

        // Aggregate by category
        const existing = byCategory[mapping.category];
        if (existing) {
          byCategory[mapping.category] = this.createMonetaryValue(
            existing.amount + value,
            currency,
            existing.isEstimate || amount.isEstimate,
            existing.period
          );
        } else {
          byCategory[mapping.category] = amount;
        }
      }
    }
  }

  /**
   * Extract savings items from references.
   */
  private extractSavings(
    references: readonly FinancialArtifactReference[],
    currency: Currency
  ): readonly SavingsItem[] {
    const savings: SavingsItem[] = [];

    for (const ref of references) {
      const props = ref.originalProperties;

      // Direct savings
      const directSavings = this.extractNumberProperty(props, ['directSavings', 'direct_savings', 'savings']);
      if (directSavings !== undefined) {
        savings.push({
          itemId: `savings-direct-${ref.referenceId}`,
          type: 'direct-savings',
          description: `Direct cost savings from ${ref.resourceName}`,
          amount: this.createMonetaryValue(directSavings, currency, true, 'annual'),
          category: 'infrastructure',
          confidence: ref.confidence,
        });
      }

      // Cost avoidance
      const costAvoidance = this.extractNumberProperty(props, ['costAvoidance', 'cost_avoidance', 'avoidedCost']);
      if (costAvoidance !== undefined) {
        savings.push({
          itemId: `savings-avoidance-${ref.referenceId}`,
          type: 'cost-avoidance',
          description: `Cost avoidance from ${ref.resourceName}`,
          amount: this.createMonetaryValue(costAvoidance, currency, true, 'annual'),
          category: 'infrastructure',
          confidence: ref.confidence,
        });
      }

      // Efficiency gains
      const efficiencyGain = this.extractNumberProperty(props, ['efficiencyGain', 'efficiency_gain', 'productivityGain']);
      if (efficiencyGain !== undefined) {
        savings.push({
          itemId: `savings-efficiency-${ref.referenceId}`,
          type: 'efficiency-gain',
          description: `Efficiency gains from ${ref.resourceName}`,
          amount: this.createMonetaryValue(efficiencyGain, currency, true, 'annual'),
          category: 'personnel',
          confidence: ref.confidence * 0.9, // Lower confidence for efficiency gains
        });
      }
    }

    return savings;
  }

  /**
   * Calculate total savings.
   */
  private calculateTotalSavings(
    savings: readonly SavingsItem[],
    currency: Currency
  ): MonetaryValue {
    let total = 0;
    for (const item of savings) {
      total += item.amount.amount;
    }
    return this.createMonetaryValue(total, currency, true, 'annual');
  }

  /**
   * Generate financial highlights.
   */
  private generateHighlights(
    roiMetrics: ROIMetrics,
    costBreakdown: CostBreakdown,
    totalSavings: MonetaryValue
  ): readonly FinancialHighlight[] {
    const highlights: FinancialHighlight[] = [];

    if (roiMetrics.roiPercentage !== undefined) {
      highlights.push({
        category: 'roi',
        title: 'Return on Investment',
        value: `${roiMetrics.roiPercentage.toFixed(1)}%`,
        trend: roiMetrics.roiPercentage > 0 ? 'positive' : roiMetrics.roiPercentage < 0 ? 'negative' : 'neutral',
      });
    }

    if (roiMetrics.paybackPeriodMonths !== undefined) {
      highlights.push({
        category: 'timeline',
        title: 'Payback Period',
        value: `${roiMetrics.paybackPeriodMonths} months`,
        trend: roiMetrics.paybackPeriodMonths <= 12 ? 'positive' : roiMetrics.paybackPeriodMonths <= 24 ? 'neutral' : 'negative',
      });
    }

    if (totalSavings.amount > 0) {
      highlights.push({
        category: 'savings',
        title: 'Annual Savings',
        value: this.formatCurrency(totalSavings.amount, totalSavings.currency),
        trend: 'positive',
      });
    }

    if (costBreakdown.tco.amount > 0) {
      highlights.push({
        category: 'cost',
        title: 'Total Cost of Ownership',
        value: this.formatCurrency(costBreakdown.tco.amount, costBreakdown.tco.currency),
        trend: 'neutral',
      });
    }

    return highlights;
  }

  /**
   * Extract risk factors from references.
   */
  private extractRiskFactors(
    references: readonly FinancialArtifactReference[],
    currency: Currency
  ): readonly RiskFactor[] {
    const risks: RiskFactor[] = [];

    for (const ref of references) {
      const props = ref.originalProperties;

      // Look for risk-related properties
      const riskArray = findProperty(props, 'risks') as unknown[] | undefined;
      if (Array.isArray(riskArray)) {
        for (let i = 0; i < riskArray.length; i++) {
          const risk = riskArray[i] as Record<string, unknown>;
          if (typeof risk === 'object' && risk !== null) {
            const description = (risk.description ?? risk.name ?? 'Unknown risk') as string;
            const likelihood = (risk.likelihood ?? risk.probability ?? 0.5) as number;
            const impactAmount = (risk.impact ?? risk.financialImpact ?? 0) as number;

            const riskEntry: RiskFactor = {
              riskId: `risk-${ref.referenceId}-${i}`,
              description: String(description),
              likelihood: Number(likelihood),
              impact: this.createMonetaryValue(Number(impactAmount), currency, true),
              ...(typeof risk.mitigation === 'string' && { mitigation: risk.mitigation }),
            };
            risks.push(riskEntry);
          }
        }
      }
    }

    return risks;
  }

  /**
   * Extract assumptions from references.
   */
  private extractAssumptions(
    references: readonly FinancialArtifactReference[]
  ): readonly string[] {
    const assumptions = new Set<string>();

    for (const ref of references) {
      const props = ref.originalProperties;
      const assumptionArray = findProperty(props, 'assumptions') as unknown[] | undefined;
      if (Array.isArray(assumptionArray)) {
        for (const assumption of assumptionArray) {
          if (typeof assumption === 'string') {
            assumptions.add(assumption);
          }
        }
      }
    }

    // Add default assumptions if none found
    if (assumptions.size === 0) {
      assumptions.add('Financial projections based on current pricing');
      assumptions.add('Assumes stable market conditions');
      assumptions.add('Currency values are in nominal terms');
    }

    return Array.from(assumptions).sort();
  }

  /**
   * Get projection horizon from references.
   */
  private getProjectionHorizon(references: readonly FinancialArtifactReference[]): number {
    for (const ref of references) {
      if (ref.projectionHorizon !== undefined) {
        return ref.projectionHorizon;
      }
    }
    return 36; // Default 3-year projection
  }

  /**
   * Generate executive summary.
   */
  private generateExecutiveSummary(
    references: readonly FinancialArtifactReference[],
    roiMetrics: ROIMetrics,
    totalSavings: MonetaryValue
  ): string {
    const sources = new Set(references.map(r => r.source));
    let summary = `Financial analysis derived from ${references.length} artifact(s) from ${sources.size} source(s). `;

    if (roiMetrics.roiPercentage !== undefined) {
      summary += `Projected ROI of ${roiMetrics.roiPercentage.toFixed(1)}%. `;
    }

    if (roiMetrics.paybackPeriodMonths !== undefined) {
      summary += `Expected payback period of ${roiMetrics.paybackPeriodMonths} months. `;
    }

    if (totalSavings.amount > 0) {
      summary += `Total annual savings of ${this.formatCurrency(totalSavings.amount, totalSavings.currency)}. `;
    }

    return summary.trim();
  }

  /**
   * Create a monetary value.
   */
  private createMonetaryValue(
    amount: number,
    currency: Currency,
    isEstimate: boolean = false,
    period?: TimePeriodUnit
  ): MonetaryValue {
    const result: MonetaryValue = {
      amount,
      currency,
      isEstimate,
      ...(period !== undefined && { period }),
    };
    return result;
  }

  /**
   * Format currency value.
   */
  private formatCurrency(amount: number, currency: Currency): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return formatter.format(amount);
  }
}

/**
 * Factory function to create a Financial Artifact Detector.
 */
export function createFinancialArtifactDetector(
  options?: FinancialDetectorOptions
): FinancialArtifactDetector {
  return new FinancialArtifactDetector(options);
}
