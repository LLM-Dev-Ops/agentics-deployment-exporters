/**
 * Tests for Simulation Artifact Detector
 *
 * @module tests/simulation/detector
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SimulationArtifactDetector,
  createSimulationArtifactDetector,
} from '../../src/core/simulation/detector.js';
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

describe('SimulationArtifactDetector', () => {
  let detector: SimulationArtifactDetector;

  beforeEach(() => {
    detector = new SimulationArtifactDetector();
  });

  describe('factory function', () => {
    it('should create detector with default options', () => {
      const d = createSimulationArtifactDetector();
      expect(d).toBeInstanceOf(SimulationArtifactDetector);
    });

    it('should create detector with custom options', () => {
      const d = createSimulationArtifactDetector({
        minConfidence: 0.8,
        generatePlan: false,
      });
      expect(d).toBeInstanceOf(SimulationArtifactDetector);
    });
  });

  describe('detect - no simulation artifacts', () => {
    it('should return empty result for intent without simulation resources', () => {
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

      expect(result.hasSimulationArtifacts).toBe(false);
      expect(result.references).toHaveLength(0);
      expect(result.implementationPlan).toBeUndefined();
    });
  });

  describe('detect - simulation type patterns', () => {
    it('should detect simulation: prefixed resource types', () => {
      const intent = createMockIntent([
        {
          type: 'simulation:scenario-result',
          name: 'load-test-results',
          properties: {
            simulationId: 'sim-12345678',
            status: 'completed',
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasSimulationArtifacts).toBe(true);
      expect(result.references).toHaveLength(1);
      expect(result.references[0]!.source).toBe('agentics-simulation-engine');
      expect(result.references[0]!.confidence).toBe(1.0);
    });

    it('should detect agentics-simulation prefixed types', () => {
      const intent = createMockIntent([
        {
          type: 'agentics-simulation:capacity-model',
          name: 'capacity-analysis',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasSimulationArtifacts).toBe(true);
      expect(result.references[0]!.source).toBe('agentics-simulation-engine');
    });

    it('should detect monte-carlo simulation types', () => {
      const intent = createMockIntent([
        {
          type: 'monte-carlo:risk-analysis',
          name: 'risk-model',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasSimulationArtifacts).toBe(true);
      expect(result.references[0]!.source).toBe('monte-carlo');
    });

    it('should detect discrete-event simulation types', () => {
      const intent = createMockIntent([
        {
          type: 'discrete-event:workflow',
          name: 'workflow-sim',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasSimulationArtifacts).toBe(true);
      expect(result.references[0]!.source).toBe('discrete-event');
    });

    it('should detect agent-based simulation types', () => {
      const intent = createMockIntent([
        {
          type: 'agent-based:behavior-model',
          name: 'agent-sim',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasSimulationArtifacts).toBe(true);
      expect(result.references[0]!.source).toBe('agent-based');
    });
  });

  describe('detect - simulation property patterns', () => {
    it('should detect simulation engine in properties', () => {
      const intent = createMockIntent([
        {
          type: 'analysis:result',
          name: 'capacity-result',
          properties: {
            simulationEngine: 'agentics-simulation-engine',
            simulationId: 'sim-abcd1234',
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasSimulationArtifacts).toBe(true);
      expect(result.references[0]!.source).toBe('agentics-simulation-engine');
    });

    it('should detect capacity threshold patterns', () => {
      const intent = createMockIntent([
        {
          type: 'analysis:capacity',
          name: 'capacity-model',
          properties: {
            capacityThreshold: 1000,
            maxConcurrent: 500,
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasSimulationArtifacts).toBe(true);
      expect(result.references[0]!.artifactType).toBe('capacity-model');
    });

    it('should detect load distribution patterns', () => {
      const intent = createMockIntent([
        {
          type: 'analysis:load',
          name: 'load-profile',
          properties: {
            loadDistribution: {
              p50: 100,
              p95: 500,
              p99: 1000,
            },
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasSimulationArtifacts).toBe(true);
      expect(result.references[0]!.artifactType).toBe('load-profile');
    });

    it('should detect nested simulation properties', () => {
      const intent = createMockIntent([
        {
          type: 'config:app',
          name: 'app-config',
          properties: {
            metadata: {
              source: {
                simulationEngine: 'agentics-simulation',
              },
            },
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasSimulationArtifacts).toBe(true);
    });
  });

  describe('detect - artifact type inference', () => {
    it('should infer scenario-result artifact type', () => {
      const intent = createMockIntent([
        {
          type: 'scenario-result:analysis',
          name: 'scenario-1',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      expect(result.references[0]!.artifactType).toBe('scenario-result');
    });

    it('should infer capacity-model artifact type', () => {
      const intent = createMockIntent([
        {
          type: 'capacity-model:compute',
          name: 'compute-capacity',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      expect(result.references[0]!.artifactType).toBe('capacity-model');
    });

    it('should infer load-profile artifact type', () => {
      const intent = createMockIntent([
        {
          type: 'load-profile:api',
          name: 'api-load',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      expect(result.references[0]!.artifactType).toBe('load-profile');
    });
  });

  describe('detect - status extraction', () => {
    it('should extract completed status', () => {
      const intent = createMockIntent([
        {
          type: 'simulation:result',
          name: 'sim-result',
          properties: {
            status: 'completed',
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.references[0]!.status).toBe('completed');
    });

    it('should extract partial status', () => {
      const intent = createMockIntent([
        {
          type: 'simulation:result',
          name: 'sim-result',
          properties: {
            simulationStatus: 'partial',
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.references[0]!.status).toBe('partial');
    });

    it('should extract failed status', () => {
      const intent = createMockIntent([
        {
          type: 'simulation:result',
          name: 'sim-result',
          properties: {
            status: 'failed',
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.references[0]!.status).toBe('failed');
    });

    it('should default to completed for unknown status', () => {
      const intent = createMockIntent([
        {
          type: 'simulation:result',
          name: 'sim-result',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      expect(result.references[0]!.status).toBe('completed');
    });
  });

  describe('detect - metadata extraction', () => {
    it('should extract simulation ID', () => {
      const intent = createMockIntent([
        {
          type: 'simulation:result',
          name: 'sim-result',
          properties: {
            simulationId: 'sim-12345678',
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.references[0]!.simulationId).toBe('sim-12345678');
    });

    it('should extract scenario ID', () => {
      const intent = createMockIntent([
        {
          type: 'simulation:result',
          name: 'sim-result',
          properties: {
            scenarioId: 'scenario-001',
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.references[0]!.scenarioId).toBe('scenario-001');
    });

    it('should extract execution timestamp', () => {
      const intent = createMockIntent([
        {
          type: 'simulation:result',
          name: 'sim-result',
          properties: {
            executedAt: '2024-01-15T12:00:00Z',
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.references[0]!.executedAt).toBe('2024-01-15T12:00:00Z');
    });

    it('should extract duration', () => {
      const intent = createMockIntent([
        {
          type: 'simulation:result',
          name: 'sim-result',
          properties: {
            durationMs: 5000,
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.references[0]!.durationMs).toBe(5000);
    });
  });

  describe('detect - confidence filtering', () => {
    it('should filter out low confidence matches by default', () => {
      const detector = new SimulationArtifactDetector({
        minConfidence: 0.9,
      });

      const intent = createMockIntent([
        {
          type: 'simulation-output:data', // Lower confidence pattern
          name: 'output-data',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      // May or may not detect based on pattern confidence
      // This tests that confidence filtering is applied
      expect(result.hasSimulationArtifacts === false ||
             result.references.every(r => r.confidence >= 0.9)).toBe(true);
    });
  });

  describe('detect - implementation plan generation', () => {
    it('should generate implementation plan when artifacts are found', () => {
      const intent = createMockIntent([
        {
          type: 'simulation:capacity-model',
          name: 'compute-capacity',
          properties: {
            capacityThreshold: 1000,
          },
        },
        {
          type: 'simulation:load-profile',
          name: 'api-load',
          properties: {
            peakLoad: 500,
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.implementationPlan).toBeDefined();
      expect(result.implementationPlan!.planId).toBeDefined();
      expect(result.implementationPlan!.items.length).toBeGreaterThan(0);
      expect(result.implementationPlan!.phases.length).toBeGreaterThan(0);
    });

    it('should not generate plan when disabled', () => {
      const detector = new SimulationArtifactDetector({
        generatePlan: false,
      });

      const intent = createMockIntent([
        {
          type: 'simulation:result',
          name: 'sim-result',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasSimulationArtifacts).toBe(true);
      expect(result.implementationPlan).toBeUndefined();
    });

    it('should include recommendations in implementation plan', () => {
      const intent = createMockIntent([
        {
          type: 'simulation:capacity-model',
          name: 'compute-capacity',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      expect(result.implementationPlan?.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('detect - summary generation', () => {
    it('should generate accurate summary statistics', () => {
      const intent = createMockIntent([
        {
          type: 'simulation:capacity-model',
          name: 'capacity-1',
          properties: {},
        },
        {
          type: 'simulation:load-profile',
          name: 'load-1',
          properties: {},
        },
        {
          type: 'monte-carlo:risk-analysis',
          name: 'risk-1',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      expect(result.summary.totalReferences).toBe(3);
      expect(result.summary.bySource['agentics-simulation-engine']).toBe(2);
      expect(result.summary.bySource['monte-carlo']).toBe(1);
    });

    it('should count high confidence references', () => {
      const intent = createMockIntent([
        {
          type: 'simulation:result', // High confidence (1.0)
          name: 'sim-1',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      expect(result.summary.highConfidenceCount).toBe(1);
    });
  });

  describe('detect - determinism', () => {
    it('should produce identical output for identical input', () => {
      const intent = createMockIntent([
        {
          type: 'simulation:capacity-model',
          name: 'capacity',
          properties: {
            simulationId: 'sim-123',
          },
        },
      ]);

      const result1 = detector.detect(intent);
      const result2 = detector.detect(intent);

      expect(result1.references[0]!.referenceId).toBe(result2.references[0]!.referenceId);
      expect(result1.implementationPlan?.planId).toBe(result2.implementationPlan?.planId);
    });

    it('should sort references deterministically', () => {
      const intent = createMockIntent([
        {
          type: 'simulation:result-b',
          name: 'result-b',
          properties: {},
        },
        {
          type: 'simulation:result-a',
          name: 'result-a',
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

  describe('detect - multiple resources', () => {
    it('should detect simulation artifacts from multiple resources', () => {
      const intent = createMockIntent([
        {
          type: 'simulation:scenario-result',
          name: 'scenario-1',
          properties: {},
        },
        {
          type: 'container:service',
          name: 'api-service',
          properties: {},
        },
        {
          type: 'simulation:capacity-model',
          name: 'capacity-1',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasSimulationArtifacts).toBe(true);
      expect(result.references).toHaveLength(2);
    });

    it('should avoid duplicate references from same resource', () => {
      const intent = createMockIntent([
        {
          type: 'simulation:result',
          name: 'sim-result',
          properties: {
            simulationEngine: 'agentics-simulation-engine',
            capacityThreshold: 1000,
          },
        },
      ]);

      const result = detector.detect(intent);

      // Should have at most one reference per resource per source
      const uniqueResourceSources = new Set(
        result.references.map(r => `${r.resourceName}:${r.source}`)
      );
      expect(uniqueResourceSources.size).toBe(result.references.length);
    });
  });
});
