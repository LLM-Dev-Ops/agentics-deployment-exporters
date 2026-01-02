/**
 * RefValidator Unit Tests
 *
 * Tests for the RefValidator component.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RefValidator } from '../../../src/core/validator/RefValidator.js';
import type { ParsedIntent } from '../../../src/core/validator/types.js';
import { ValidationErrorCodes } from '../../../src/core/validator/types.js';

describe('RefValidator', () => {
  let validator: RefValidator;

  beforeEach(() => {
    validator = new RefValidator();
  });

  describe('validateReferences', () => {
    it('should pass for intent with no references', () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
          spec: {
            targetFormat: 'terraform',
          },
        },
        format: 'json',
      };

      const issues = validator.validateReferences(intent);

      expect(issues).toHaveLength(0);
    });

    it('should pass for valid resource dependencies', () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
          spec: {
            targetFormat: 'terraform',
            resources: [
              { type: 'aws_vpc', name: 'main' },
              { type: 'aws_subnet', name: 'public', dependsOn: ['aws_vpc/main'] },
              { type: 'aws_instance', name: 'web', dependsOn: ['aws_subnet/public'] },
            ],
          },
        },
        format: 'json',
      };

      const issues = validator.validateReferences(intent);

      expect(issues).toHaveLength(0);
    });

    it('should detect undefined resource dependencies', () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
          spec: {
            targetFormat: 'terraform',
            resources: [
              { type: 'aws_instance', name: 'web', dependsOn: ['aws_vpc/nonexistent'] },
            ],
          },
        },
        format: 'json',
      };

      const issues = validator.validateReferences(intent);

      expect(issues).toHaveLength(1);
      expect(issues[0]?.code).toBe(ValidationErrorCodes.REF_UNDEFINED_RESOURCE);
      expect(issues[0]?.message).toContain('nonexistent');
    });

    it('should pass for valid secret references', () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
          spec: {
            targetFormat: 'kubernetes',
            secrets: [
              { name: 'db-credentials' },
            ],
            env: [
              {
                name: 'DB_PASSWORD',
                valueFrom: {
                  secretKeyRef: {
                    name: 'db-credentials',
                    key: 'password',
                  },
                },
              },
            ],
          },
        },
        format: 'json',
      };

      const issues = validator.validateReferences(intent);

      expect(issues).toHaveLength(0);
    });

    it('should detect undefined secret references', () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
          spec: {
            targetFormat: 'kubernetes',
            env: [
              {
                name: 'DB_PASSWORD',
                valueFrom: {
                  secretKeyRef: {
                    name: 'nonexistent-secret',
                    key: 'password',
                  },
                },
              },
            ],
          },
        },
        format: 'json',
      };

      const issues = validator.validateReferences(intent);

      expect(issues).toHaveLength(1);
      expect(issues[0]?.code).toBe(ValidationErrorCodes.REF_UNDEFINED_SECRET);
      expect(issues[0]?.message).toContain('nonexistent-secret');
    });

    it('should detect circular dependencies', () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
          spec: {
            targetFormat: 'terraform',
            resources: [
              { type: 'resource', name: 'a', dependsOn: ['resource/b'] },
              { type: 'resource', name: 'b', dependsOn: ['resource/c'] },
              { type: 'resource', name: 'c', dependsOn: ['resource/a'] },
            ],
          },
        },
        format: 'json',
      };

      const issues = validator.validateReferences(intent);

      expect(issues.some(i => i.code === ValidationErrorCodes.REF_CIRCULAR_DEPENDENCY)).toBe(true);
    });

    it('should handle multiple undefined references', () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
          spec: {
            targetFormat: 'terraform',
            resources: [
              { type: 'resource', name: 'a', dependsOn: ['resource/missing1', 'resource/missing2'] },
            ],
          },
        },
        format: 'json',
      };

      const issues = validator.validateReferences(intent);

      expect(issues.filter(i => i.code === ValidationErrorCodes.REF_UNDEFINED_RESOURCE)).toHaveLength(2);
    });
  });

  describe('detectCircularDependencies', () => {
    it('should return no cycles for acyclic graph', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            resources: [
              { type: 'resource', name: 'a' },
              { type: 'resource', name: 'b', dependsOn: ['resource/a'] },
              { type: 'resource', name: 'c', dependsOn: ['resource/b'] },
            ],
          },
        },
        format: 'json',
      };

      const result = validator.detectCircularDependencies(intent);

      expect(result.hasCircular).toBe(false);
      expect(result.cycles).toHaveLength(0);
    });

    it('should detect simple cycle', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            resources: [
              { type: 'resource', name: 'a', dependsOn: ['resource/b'] },
              { type: 'resource', name: 'b', dependsOn: ['resource/a'] },
            ],
          },
        },
        format: 'json',
      };

      const result = validator.detectCircularDependencies(intent);

      expect(result.hasCircular).toBe(true);
      expect(result.cycles.length).toBeGreaterThan(0);
    });

    it('should detect self-referencing cycle', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            resources: [
              { type: 'resource', name: 'a', dependsOn: ['resource/a'] },
            ],
          },
        },
        format: 'json',
      };

      const result = validator.detectCircularDependencies(intent);

      expect(result.hasCircular).toBe(true);
    });

    it('should handle empty resources', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {},
        },
        format: 'json',
      };

      const result = validator.detectCircularDependencies(intent);

      expect(result.hasCircular).toBe(false);
      expect(result.cycles).toHaveLength(0);
    });
  });

  describe('extractAllReferences', () => {
    it('should extract resource dependency references', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            resources: [
              { type: 'aws_instance', name: 'web', dependsOn: ['aws_vpc/main', 'aws_subnet/public'] },
            ],
          },
        },
        format: 'json',
      };

      const references = validator.extractAllReferences(intent);

      expect(references).toHaveLength(2);
      expect(references.every(r => r.type === 'resource')).toBe(true);
      expect(references.some(r => r.name === 'aws_vpc/main')).toBe(true);
      expect(references.some(r => r.name === 'aws_subnet/public')).toBe(true);
    });

    it('should extract secret references from env vars', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            env: [
              {
                name: 'DB_PASSWORD',
                valueFrom: {
                  secretKeyRef: {
                    name: 'db-secret',
                    key: 'password',
                  },
                },
              },
            ],
          },
        },
        format: 'json',
      };

      const references = validator.extractAllReferences(intent);

      expect(references).toHaveLength(1);
      expect(references[0]?.type).toBe('secret');
      expect(references[0]?.name).toBe('db-secret');
    });

    it('should handle intent with no references', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            targetFormat: 'terraform',
          },
        },
        format: 'json',
      };

      const references = validator.extractAllReferences(intent);

      expect(references).toHaveLength(0);
    });
  });
});
