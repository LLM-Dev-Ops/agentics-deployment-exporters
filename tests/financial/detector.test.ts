/**
 * Tests for Financial Artifact Detector
 *
 * @module tests/financial/detector
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FinancialArtifactDetector,
  createFinancialArtifactDetector,
} from '../../src/core/financial/detector.js';
import type { ValidatedIntent, SemanticVersion } from '../../src/core/types.js';

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createMockIntent(resources: Array<{
  type: string;
  name: string;
  properties: Record<string, unknown>;
}>): ValidatedIntent {
  return {
    intentId: 'test-intent-001',
    version: '1.0.0' as SemanticVersion,
    schemaVersion: '1.0.0' as SemanticVersion,
    createdAt: '2024-01-15T10:00:00Z',
    checksum: 'abc123def456',
    spec: {
      target: {
        provider: 'aws',
        region: 'us-east-1',
        environment: 'production',
      },
      resources: resources.map(r => ({
        type: r.type,
        name: r.name,
        properties: r.properties,
        dependencies: [],
        outputs: [],
      })),
    },
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('FinancialArtifactDetector', () => {
  let detector: FinancialArtifactDetector;

  beforeEach(() => {
    detector = new FinancialArtifactDetector();
  });

  describe('factory function', () => {
    it('should create detector with default options', () => {
      const d = createFinancialArtifactDetector();
      expect(d).toBeInstanceOf(FinancialArtifactDetector);
    });

    it('should create detector with custom options', () => {
      const d = createFinancialArtifactDetector({
        minConfidence: 0.8,
        generateReport: false,
        defaultCurrency: 'EUR',
      });
      expect(d).toBeInstanceOf(FinancialArtifactDetector);
    });
  });

  describe('detect - no financial artifacts', () => {
    it('should return empty result for intent without financial resources', () => {
      const intent = createMockIntent([
        {
          type: 'container:web-service',
          name: 'api-service',
          properties: {
            image: 'nginx:latest',
            port: 8080,
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasFinancialArtifacts).toBe(false);
      expect(result.references).toHaveLength(0);
      expect(result.roiReport).toBeUndefined();
    });
  });

  describe('detect - financial type patterns', () => {
    it('should detect roi: prefixed resource types', () => {
      const intent = createMockIntent([
        {
          type: 'roi:calculation',
          name: 'project-roi',
          properties: {
            roiPercentage: 150,
            currency: 'USD',
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasFinancialArtifacts).toBe(true);
      expect(result.references).toHaveLength(1);
      expect(result.references[0]!.source).toBe('enterprise-roi-engine');
      expect(result.references[0]!.confidence).toBe(1.0);
    });

    it('should detect enterprise-roi prefixed types', () => {
      const intent = createMockIntent([
        {
          type: 'enterprise-roi:analysis',
          name: 'financial-analysis',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasFinancialArtifacts).toBe(true);
      expect(result.references[0]!.source).toBe('enterprise-roi-engine');
    });

    it('should detect cost-calculator types', () => {
      const intent = createMockIntent([
        {
          type: 'cost-calculator:estimate',
          name: 'cost-estimate',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasFinancialArtifacts).toBe(true);
      expect(result.references[0]!.source).toBe('cost-calculator');
    });

    it('should detect tco-analyzer types', () => {
      const intent = createMockIntent([
        {
          type: 'tco-analyzer:report',
          name: 'tco-report',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasFinancialArtifacts).toBe(true);
      expect(result.references[0]!.source).toBe('tco-analyzer');
    });

    it('should detect budget-planner types', () => {
      const intent = createMockIntent([
        {
          type: 'budget-planner:projection',
          name: 'budget-2024',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasFinancialArtifacts).toBe(true);
      expect(result.references[0]!.source).toBe('budget-planner');
    });
  });

  describe('detect - financial property patterns', () => {
    it('should detect ROI engine in properties', () => {
      const intent = createMockIntent([
        {
          type: 'analysis:financial',
          name: 'financial-result',
          properties: {
            roiEngine: 'enterprise-roi-engine',
            roiPercentage: 125,
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasFinancialArtifacts).toBe(true);
      expect(result.references[0]!.source).toBe('enterprise-roi-engine');
    });

    it('should detect return on investment patterns', () => {
      const intent = createMockIntent([
        {
          type: 'analysis:project',
          name: 'project-analysis',
          properties: {
            returnOnInvestment: 150,
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasFinancialArtifacts).toBe(true);
      expect(result.references[0]!.artifactType).toBe('roi-calculation');
    });

    it('should detect NPV patterns', () => {
      const intent = createMockIntent([
        {
          type: 'analysis:financial',
          name: 'npv-analysis',
          properties: {
            netPresentValue: 500000,
            discountRate: 0.08,
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasFinancialArtifacts).toBe(true);
      expect(result.references[0]!.artifactType).toBe('npv-analysis');
    });

    it('should detect TCO patterns', () => {
      const intent = createMockIntent([
        {
          type: 'analysis:costs',
          name: 'tco-breakdown',
          properties: {
            totalCostOwnership: 1000000,
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasFinancialArtifacts).toBe(true);
      expect(result.references[0]!.artifactType).toBe('tco-analysis');
    });

    it('should detect CapEx/OpEx patterns', () => {
      const intent = createMockIntent([
        {
          type: 'analysis:costs',
          name: 'cost-breakdown',
          properties: {
            capex: 500000,
            opex: 100000,
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasFinancialArtifacts).toBe(true);
    });

    it('should detect savings patterns', () => {
      const intent = createMockIntent([
        {
          type: 'analysis:savings',
          name: 'savings-analysis',
          properties: {
            projectedSavings: 250000,
            costAvoidance: 100000,
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasFinancialArtifacts).toBe(true);
    });
  });

  describe('detect - artifact type inference', () => {
    it('should infer roi-calculation artifact type', () => {
      const intent = createMockIntent([
        {
          type: 'roi-calculation:project',
          name: 'roi-calc',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      expect(result.references[0]!.artifactType).toBe('roi-calculation');
    });

    it('should infer tco-analysis artifact type', () => {
      const intent = createMockIntent([
        {
          type: 'tco-analysis:infrastructure',
          name: 'infra-tco',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      expect(result.references[0]!.artifactType).toBe('tco-analysis');
    });

    it('should infer cost-breakdown artifact type', () => {
      const intent = createMockIntent([
        {
          type: 'cost-breakdown:detailed',
          name: 'detailed-costs',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      expect(result.references[0]!.artifactType).toBe('cost-breakdown');
    });
  });

  describe('detect - currency detection', () => {
    it('should detect currency from properties', () => {
      const intent = createMockIntent([
        {
          type: 'roi:calculation',
          name: 'roi-eur',
          properties: {
            currency: 'EUR',
            roiPercentage: 100,
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.references[0]!.currency).toBe('EUR');
    });

    it('should default to USD when currency not specified', () => {
      const intent = createMockIntent([
        {
          type: 'roi:calculation',
          name: 'roi-default',
          properties: {
            roiPercentage: 100,
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.references[0]!.currency).toBe('USD');
    });

    it('should use detector default currency option', () => {
      const detector = new FinancialArtifactDetector({
        defaultCurrency: 'GBP',
      });

      const intent = createMockIntent([
        {
          type: 'roi:calculation',
          name: 'roi-gbp',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      expect(result.summary.primaryCurrency).toBe('GBP');
    });
  });

  describe('detect - time period detection', () => {
    it('should detect monthly time period', () => {
      const intent = createMockIntent([
        {
          type: 'roi:calculation',
          name: 'monthly-roi',
          properties: {
            timePeriod: 'monthly',
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.references[0]!.timePeriod).toBe('monthly');
    });

    it('should detect annual time period', () => {
      const intent = createMockIntent([
        {
          type: 'roi:calculation',
          name: 'annual-roi',
          properties: {
            period: 'annual',
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.references[0]!.timePeriod).toBe('annual');
    });
  });

  describe('detect - ROI report generation', () => {
    it('should generate ROI report when sufficient data found', () => {
      const intent = createMockIntent([
        {
          type: 'roi:calculation',
          name: 'project-roi',
          properties: {
            roiPercentage: 150,
            npv: 500000,
            paybackPeriodMonths: 18,
            totalInvestment: 200000,
            currency: 'USD',
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.roiReport).toBeDefined();
      expect(result.roiReport!.reportId).toBeDefined();
      expect(result.roiReport!.roiMetrics.roiPercentage).toBe(150);
    });

    it('should not generate report when disabled', () => {
      const detector = new FinancialArtifactDetector({
        generateReport: false,
      });

      const intent = createMockIntent([
        {
          type: 'roi:calculation',
          name: 'roi-calc',
          properties: {
            roiPercentage: 100,
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasFinancialArtifacts).toBe(true);
      expect(result.roiReport).toBeUndefined();
    });

    it('should extract ROI metrics correctly', () => {
      const intent = createMockIntent([
        {
          type: 'roi:calculation',
          name: 'full-roi',
          properties: {
            roiPercentage: 125.5,
            npv: 750000,
            irr: 18.5,
            paybackPeriodMonths: 24,
            totalInvestment: 300000,
            totalReturns: 675000,
            currency: 'USD',
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.roiReport?.roiMetrics.roiPercentage).toBe(125.5);
      expect(result.roiReport?.roiMetrics.npv?.amount).toBe(750000);
      expect(result.roiReport?.roiMetrics.irr).toBe(18.5);
      expect(result.roiReport?.roiMetrics.paybackPeriodMonths).toBe(24);
      expect(result.roiReport?.roiMetrics.totalInvestment?.amount).toBe(300000);
      expect(result.roiReport?.roiMetrics.totalReturns?.amount).toBe(675000);
    });

    it('should calculate net benefit from investment and returns', () => {
      const intent = createMockIntent([
        {
          type: 'roi:calculation',
          name: 'net-benefit-calc',
          properties: {
            totalInvestment: 100000,
            totalReturns: 150000,
            currency: 'USD',
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.roiReport?.roiMetrics.netBenefit?.amount).toBe(50000);
    });
  });

  describe('detect - cost breakdown extraction', () => {
    it('should extract CapEx costs', () => {
      // Note: type pattern and property pattern both match, creating 2 references
      // Each reference contributes to capex total
      const intent = createMockIntent([
        {
          type: 'cost-breakdown:project',
          name: 'project-costs',
          properties: {
            capex: 500000,
            currency: 'USD',
          },
        },
      ]);

      const result = detector.detect(intent);

      // 2 references (type + property), each contributing 500000 = 1000000
      expect(result.roiReport?.costBreakdown.capex.amount).toBe(1000000);
    });

    it('should extract OpEx costs', () => {
      // Note: type pattern and property pattern both match, creating 2 references
      // Each reference contributes to opex total
      const intent = createMockIntent([
        {
          type: 'cost-breakdown:project',
          name: 'project-costs',
          properties: {
            opex: 100000,
            currency: 'USD',
          },
        },
      ]);

      const result = detector.detect(intent);

      // 2 references (type + property), each contributing 100000 = 200000
      expect(result.roiReport?.costBreakdown.opex.amount).toBe(200000);
    });

    it('should extract category-specific costs', () => {
      const intent = createMockIntent([
        {
          type: 'cost-breakdown:detailed',
          name: 'detailed-costs',
          properties: {
            computeCost: 50000,
            storageCost: 20000,
            networkCost: 10000,
            licenseCost: 30000,
            currency: 'USD',
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.roiReport?.costBreakdown.lineItems.length).toBeGreaterThan(0);
    });
  });

  describe('detect - savings extraction', () => {
    it('should extract direct savings', () => {
      // Need roi-calculation type to trigger ROI report generation
      const intent = createMockIntent([
        {
          type: 'roi-calculation:savings',
          name: 'savings',
          properties: {
            roiPercentage: 50,
            directSavings: 100000,
            currency: 'USD',
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.roiReport?.savings.some(s => s.type === 'direct-savings')).toBe(true);
    });

    it('should extract cost avoidance', () => {
      // Need roi-calculation type to trigger ROI report generation
      const intent = createMockIntent([
        {
          type: 'roi-calculation:avoidance',
          name: 'avoidance',
          properties: {
            roiPercentage: 25,
            costAvoidance: 50000,
            currency: 'USD',
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.roiReport?.savings.some(s => s.type === 'cost-avoidance')).toBe(true);
    });

    it('should calculate total savings', () => {
      // Need roi-calculation type to trigger ROI report generation
      const intent = createMockIntent([
        {
          type: 'roi-calculation:combined',
          name: 'total-savings',
          properties: {
            roiPercentage: 75,
            directSavings: 100000,
            costAvoidance: 50000,
            efficiencyGain: 25000,
            currency: 'USD',
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.roiReport?.totalSavings.amount).toBe(175000);
    });
  });

  describe('detect - risk extraction', () => {
    it('should extract risk factors from properties', () => {
      const intent = createMockIntent([
        {
          type: 'roi:analysis',
          name: 'risk-analysis',
          properties: {
            roiPercentage: 100,
            risks: [
              {
                description: 'Market volatility risk',
                likelihood: 0.3,
                impact: 50000,
                mitigation: 'Diversify investments',
              },
            ],
            currency: 'USD',
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.roiReport?.riskFactors).toHaveLength(1);
      expect(result.roiReport?.riskFactors[0]!.description).toBe('Market volatility risk');
    });
  });

  describe('detect - summary generation', () => {
    it('should generate accurate summary statistics', () => {
      const intent = createMockIntent([
        {
          type: 'roi:calculation',
          name: 'roi-1',
          properties: { currency: 'USD' },
        },
        {
          type: 'cost-calculator:estimate',
          name: 'cost-1',
          properties: { currency: 'USD' },
        },
        {
          type: 'tco-analyzer:report',
          name: 'tco-1',
          properties: { currency: 'EUR' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.summary.totalReferences).toBe(3);
      expect(result.summary.bySource['enterprise-roi-engine']).toBe(1);
      expect(result.summary.bySource['cost-calculator']).toBe(1);
      expect(result.summary.bySource['tco-analyzer']).toBe(1);
    });

    it('should determine primary currency by frequency', () => {
      const intent = createMockIntent([
        {
          type: 'roi:calc-1',
          name: 'roi-1',
          properties: { currency: 'USD' },
        },
        {
          type: 'roi:calc-2',
          name: 'roi-2',
          properties: { currency: 'USD' },
        },
        {
          type: 'roi:calc-3',
          name: 'roi-3',
          properties: { currency: 'EUR' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.summary.primaryCurrency).toBe('USD');
    });

    it('should indicate sufficient data for ROI when appropriate', () => {
      const intent = createMockIntent([
        {
          type: 'roi:calculation',
          name: 'roi-calc',
          properties: { roiPercentage: 100 },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.summary.hasSufficientDataForROI).toBe(true);
    });
  });

  describe('detect - determinism', () => {
    it('should produce identical output for identical input', () => {
      const intent = createMockIntent([
        {
          type: 'roi:calculation',
          name: 'project-roi',
          properties: {
            roiPercentage: 150,
            currency: 'USD',
          },
        },
      ]);

      const result1 = detector.detect(intent);
      const result2 = detector.detect(intent);

      expect(result1.references[0]!.referenceId).toBe(result2.references[0]!.referenceId);
      expect(result1.roiReport?.reportId).toBe(result2.roiReport?.reportId);
    });

    it('should sort references deterministically', () => {
      const intent = createMockIntent([
        {
          type: 'roi:calc-b',
          name: 'roi-b',
          properties: {},
        },
        {
          type: 'roi:calc-a',
          name: 'roi-a',
          properties: {},
        },
      ]);

      const result1 = detector.detect(intent);
      const result2 = detector.detect(intent);

      expect(result1.references.map(r => r.referenceId)).toEqual(
        result2.references.map(r => r.referenceId)
      );
    });
  });

  describe('detect - highlights generation', () => {
    it('should generate ROI highlight', () => {
      const intent = createMockIntent([
        {
          type: 'roi:calculation',
          name: 'roi-calc',
          properties: {
            roiPercentage: 150,
            currency: 'USD',
          },
        },
      ]);

      const result = detector.detect(intent);

      const roiHighlight = result.roiReport?.highlights.find(h => h.category === 'roi');
      expect(roiHighlight).toBeDefined();
      expect(roiHighlight?.trend).toBe('positive');
    });

    it('should generate payback period highlight', () => {
      const intent = createMockIntent([
        {
          type: 'roi:calculation',
          name: 'roi-calc',
          properties: {
            paybackPeriodMonths: 12,
            currency: 'USD',
          },
        },
      ]);

      const result = detector.detect(intent);

      const paybackHighlight = result.roiReport?.highlights.find(h => h.category === 'timeline');
      expect(paybackHighlight).toBeDefined();
    });

    it('should generate savings highlight', () => {
      const intent = createMockIntent([
        {
          type: 'roi:calculation',
          name: 'roi-calc',
          properties: {
            directSavings: 100000,
            currency: 'USD',
          },
        },
      ]);

      const result = detector.detect(intent);

      const savingsHighlight = result.roiReport?.highlights.find(h => h.category === 'savings');
      expect(savingsHighlight).toBeDefined();
      expect(savingsHighlight?.trend).toBe('positive');
    });
  });

  describe('detect - assumptions extraction', () => {
    it('should extract assumptions from properties', () => {
      const intent = createMockIntent([
        {
          type: 'roi:calculation',
          name: 'roi-calc',
          properties: {
            roiPercentage: 100,
            assumptions: [
              'Stable market conditions',
              'No major regulatory changes',
            ],
            currency: 'USD',
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.roiReport?.assumptions).toContain('Stable market conditions');
      expect(result.roiReport?.assumptions).toContain('No major regulatory changes');
    });

    it('should provide default assumptions when none specified', () => {
      const intent = createMockIntent([
        {
          type: 'roi:calculation',
          name: 'roi-calc',
          properties: {
            roiPercentage: 100,
            currency: 'USD',
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.roiReport?.assumptions.length).toBeGreaterThan(0);
    });
  });
});
