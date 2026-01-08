/**
 * Contract Validator Tests
 *
 * Tests for the @agentics/contracts module ensuring:
 * - Strict JSON Schema validation at request entry
 * - Rejection of invalid manifests/export configurations
 * - No fallback behavior or default injection
 * - Mandatory execution proof generation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  ContractValidator,
  createContractValidator,
  validateRequest,
  validateRequestOrThrow,
  generateExecutionProof,
  verifyExecutionProof,
  computeSHA256,
  computeIntentHash,
  type ExporterRequest,
  type Intent,
  type ValidationResult,
  type ExecutionProof,
} from '../../../src/contracts/index.js';

describe('ContractValidator', () => {
  let validator: ContractValidator;

  beforeAll(async () => {
    validator = createContractValidator();
    await validator.init();
  });

  describe('Strict Validation - No Fallbacks', () => {
    it('should reject requests without required intent field', async () => {
      const request = {};
      const result = await validator.validate(request);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.message.includes('intent'))).toBe(true);
    });

    it('should reject intent without required apiVersion', async () => {
      const request = {
        intent: {
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
        },
      };
      const result = await validator.validate(request);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('apiVersion'))).toBe(true);
    });

    it('should reject intent without required kind', async () => {
      const request = {
        intent: {
          apiVersion: 'agentics.io/v1',
          metadata: { name: 'test-app' },
        },
      };
      const result = await validator.validate(request);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('kind'))).toBe(true);
    });

    it('should reject intent without required metadata', async () => {
      const request = {
        intent: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
        },
      };
      const result = await validator.validate(request);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('metadata'))).toBe(true);
    });

    it('should reject intent without required metadata.name', async () => {
      const request = {
        intent: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: {},
        },
      };
      const result = await validator.validate(request);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('name'))).toBe(true);
    });

    it('should reject invalid apiVersion format', async () => {
      const request = {
        intent: {
          apiVersion: 'invalid-version',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
        },
      };
      const result = await validator.validate(request);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path.includes('apiVersion'))).toBe(true);
    });

    it('should reject invalid kind value', async () => {
      const request = {
        intent: {
          apiVersion: 'agentics.io/v1',
          kind: 'InvalidKind',
          metadata: { name: 'test-app' },
        },
      };
      const result = await validator.validate(request);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path.includes('kind'))).toBe(true);
    });

    it('should reject invalid metadata.name format', async () => {
      const request = {
        intent: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'Invalid Name With Spaces' },
        },
      };
      const result = await validator.validate(request);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path.includes('name'))).toBe(true);
    });
  });

  describe('Strict Mode - No Additional Properties', () => {
    it('should reject additional properties on request root', async () => {
      const request = {
        intent: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
        },
        unknownProperty: 'value',
      };
      const result = await validator.validate(request);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.message.includes('additional') || e.message.includes('unknownProperty')
        )
      ).toBe(true);
    });

    it('should reject additional properties on intent', async () => {
      const request = {
        intent: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
          unknownField: 'value',
        },
      };
      const result = await validator.validate(request);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.message.includes('additional') || e.message.includes('unknownField')
        )
      ).toBe(true);
    });

    it('should reject additional properties on metadata', async () => {
      const request = {
        intent: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: {
            name: 'test-app',
            unknownMetadata: 'value',
          },
        },
      };
      const result = await validator.validate(request);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.message.includes('additional') || e.message.includes('unknownMetadata')
        )
      ).toBe(true);
    });
  });

  describe('Valid Requests', () => {
    it('should accept minimal valid request', async () => {
      const request = {
        intent: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
        },
      };
      const result = await validator.validate(request);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept request with all optional fields', async () => {
      const request: ExporterRequest = {
        intent: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: {
            name: 'test-app',
            namespace: 'production',
            labels: { app: 'test', env: 'prod' },
            annotations: { note: 'test annotation' },
            version: '1.0.0',
          },
          spec: {
            target: {
              provider: 'aws',
              region: 'us-west-2',
              environment: 'production',
            },
          },
        },
        formats: ['terraform', 'kubernetes'],
        options: {
          outputDir: './output',
          dryRun: false,
          validate: true,
        },
      };
      const result = await validator.validate(request);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept all valid apiVersion formats', async () => {
      const versions = [
        'agentics.io/v1',
        'agentics.io/v1alpha1',
        'agentics.io/v1beta1',
        'agentics.io/v2',
      ];

      for (const version of versions) {
        const request = {
          intent: {
            apiVersion: version,
            kind: 'DeploymentIntent',
            metadata: { name: 'test-app' },
          },
        };
        const result = await validator.validate(request);
        expect(result.valid).toBe(true);
      }
    });

    it('should accept all valid kind values', async () => {
      const kinds = ['DeploymentIntent', 'InfrastructureIntent', 'ApplicationIntent'];

      for (const kind of kinds) {
        const request = {
          intent: {
            apiVersion: 'agentics.io/v1',
            kind,
            metadata: { name: 'test-app' },
          },
        };
        const result = await validator.validate(request);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('Format Validation', () => {
    it('should accept valid export formats', async () => {
      const request = {
        intent: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
        },
        formats: ['terraform', 'kubernetes', 'helm'],
      };
      const result = await validator.validate(request);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid export format', async () => {
      const request = {
        intent: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
        },
        formats: ['invalid-format'],
      };
      const result = await validator.validate(request);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path.includes('formats'))).toBe(true);
    });

    it('should reject empty formats array', async () => {
      const request = {
        intent: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
        },
        formats: [],
      };
      const result = await validator.validate(request);

      expect(result.valid).toBe(false);
    });
  });

  describe('Options Validation', () => {
    it('should accept valid options', async () => {
      const request = {
        intent: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
        },
        options: {
          outputDir: './output',
          dryRun: true,
          validate: true,
          strictMode: true,
          concurrency: 4,
          timeout: 30000,
        },
      };
      const result = await validator.validate(request);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid concurrency value', async () => {
      const request = {
        intent: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
        },
        options: {
          concurrency: 100, // Max is 16
        },
      };
      const result = await validator.validate(request);

      expect(result.valid).toBe(false);
    });

    it('should reject additional properties in options', async () => {
      const request = {
        intent: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
        },
        options: {
          unknownOption: 'value',
        },
      };
      const result = await validator.validate(request);

      expect(result.valid).toBe(false);
    });
  });

  describe('validateOrThrow', () => {
    it('should return typed request on valid input', async () => {
      const request = {
        intent: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
        },
      };

      const result = await validator.validateOrThrow(request);
      expect(result.intent.metadata.name).toBe('test-app');
    });

    it('should throw on invalid input', async () => {
      const request = {};

      await expect(validator.validateOrThrow(request)).rejects.toThrow(
        'Contract validation failed'
      );
    });
  });
});

describe('ExecutionProof', () => {
  describe('Proof Generation', () => {
    it('should generate valid execution proof', () => {
      const intent: Intent = {
        apiVersion: 'agentics.io/v1',
        kind: 'DeploymentIntent',
        metadata: { name: 'test-app' },
      };

      const proof = generateExecutionProof(intent, {
        schemaVersion: 'v1',
        validationPassed: true,
        artifacts: {
          'terraform/main.tf': 'resource "aws_instance" "example" {}',
        },
      });

      expect(proof.executionId).toBeDefined();
      expect(proof.timestamp).toBeDefined();
      expect(proof.schemaVersion).toBe('v1');
      expect(proof.intentHash).toBeDefined();
      expect(proof.validationPassed).toBe(true);
      expect(proof.artifactChecksums['terraform/main.tf']).toBeDefined();
    });

    it('should generate deterministic intent hash', () => {
      const intent: Intent = {
        apiVersion: 'agentics.io/v1',
        kind: 'DeploymentIntent',
        metadata: { name: 'test-app' },
      };

      const hash1 = computeIntentHash(intent);
      const hash2 = computeIntentHash(intent);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different intents', () => {
      const intent1: Intent = {
        apiVersion: 'agentics.io/v1',
        kind: 'DeploymentIntent',
        metadata: { name: 'test-app-1' },
      };
      const intent2: Intent = {
        apiVersion: 'agentics.io/v1',
        kind: 'DeploymentIntent',
        metadata: { name: 'test-app-2' },
      };

      const hash1 = computeIntentHash(intent1);
      const hash2 = computeIntentHash(intent2);

      expect(hash1).not.toBe(hash2);
    });

    it('should include artifact checksums', () => {
      const intent: Intent = {
        apiVersion: 'agentics.io/v1',
        kind: 'DeploymentIntent',
        metadata: { name: 'test-app' },
      };

      const artifacts = {
        'file1.tf': 'content1',
        'file2.yaml': 'content2',
      };

      const proof = generateExecutionProof(intent, {
        schemaVersion: 'v1',
        validationPassed: true,
        artifacts,
      });

      expect(Object.keys(proof.artifactChecksums)).toHaveLength(2);
      expect(proof.artifactChecksums['file1.tf']).toBe(computeSHA256('content1'));
      expect(proof.artifactChecksums['file2.yaml']).toBe(computeSHA256('content2'));
    });
  });

  describe('Proof Verification', () => {
    it('should verify valid proof', () => {
      const intent: Intent = {
        apiVersion: 'agentics.io/v1',
        kind: 'DeploymentIntent',
        metadata: { name: 'test-app' },
      };

      const proof = generateExecutionProof(intent, {
        schemaVersion: 'v1',
        validationPassed: true,
      });

      const isValid = verifyExecutionProof(proof, intent);
      expect(isValid).toBe(true);
    });

    it('should reject proof with modified intent', () => {
      const intent: Intent = {
        apiVersion: 'agentics.io/v1',
        kind: 'DeploymentIntent',
        metadata: { name: 'test-app' },
      };

      const proof = generateExecutionProof(intent, {
        schemaVersion: 'v1',
        validationPassed: true,
      });

      // Modify the intent
      const modifiedIntent: Intent = {
        ...intent,
        metadata: { name: 'modified-app' },
      };

      const isValid = verifyExecutionProof(proof, modifiedIntent);
      expect(isValid).toBe(false);
    });
  });
});

describe('Convenience Functions', () => {
  describe('validateRequest', () => {
    it('should validate using default validator', async () => {
      const request = {
        intent: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
        },
      };

      const result = await validateRequest(request);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateRequestOrThrow', () => {
    it('should throw on invalid request using default validator', async () => {
      await expect(validateRequestOrThrow({})).rejects.toThrow();
    });
  });
});
