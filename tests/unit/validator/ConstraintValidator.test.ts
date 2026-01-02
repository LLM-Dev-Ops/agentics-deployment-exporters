/**
 * ConstraintValidator Unit Tests
 *
 * Tests for the ConstraintValidator component.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConstraintValidator } from '../../../src/core/validator/ConstraintValidator.js';
import type { ParsedIntent } from '../../../src/core/validator/types.js';
import { ValidationErrorCodes } from '../../../src/core/validator/types.js';

describe('ConstraintValidator', () => {
  let validator: ConstraintValidator;

  beforeEach(() => {
    validator = new ConstraintValidator();
  });

  describe('validateConstraints', () => {
    it('should pass for valid intent', () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'valid-app' },
          spec: {
            targetFormat: 'kubernetes',
            services: [
              {
                name: 'web',
                replicas: 3,
                ports: [
                  { containerPort: 8080 },
                ],
                resources: {
                  requests: { cpu: '100m', memory: '128Mi' },
                  limits: { cpu: '500m', memory: '512Mi' },
                },
              },
            ],
            env: [
              { name: 'NODE_ENV', value: 'production' },
            ],
          },
        },
        format: 'json',
      };

      const issues = validator.validateConstraints(intent);

      expect(issues.filter(i => i.severity === 'error')).toHaveLength(0);
    });

    it('should detect negative replica count', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            services: [
              {
                name: 'web',
                replicas: -1,
              },
            ],
          },
        },
        format: 'json',
      };

      const issues = validator.validateConstraints(intent);

      expect(issues.some(i => i.code === ValidationErrorCodes.CONSTRAINT_REPLICA_COUNT)).toBe(true);
    });

    it('should allow zero replicas (suspended)', () => {
      const intent: ParsedIntent = {
        data: {
          metadata: { name: 'valid-app' },
          spec: {
            services: [
              {
                name: 'web',
                replicas: 0,
              },
            ],
          },
        },
        format: 'json',
      };

      const issues = validator.validateConstraints(intent);

      expect(issues.filter(i => i.code === ValidationErrorCodes.CONSTRAINT_REPLICA_COUNT)).toHaveLength(0);
    });

    it('should detect invalid container port (too low)', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            services: [
              {
                name: 'web',
                ports: [
                  { containerPort: 0 },
                ],
              },
            ],
          },
        },
        format: 'json',
      };

      const issues = validator.validateConstraints(intent);

      expect(issues.some(i => i.code === ValidationErrorCodes.CONSTRAINT_PORT_RANGE)).toBe(true);
    });

    it('should detect invalid container port (too high)', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            services: [
              {
                name: 'web',
                ports: [
                  { containerPort: 70000 },
                ],
              },
            ],
          },
        },
        format: 'json',
      };

      const issues = validator.validateConstraints(intent);

      expect(issues.some(i => i.code === ValidationErrorCodes.CONSTRAINT_PORT_RANGE)).toBe(true);
    });

    it('should detect invalid service port', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            services: [
              {
                name: 'web',
                ports: [
                  { containerPort: 8080, servicePort: 99999 },
                ],
              },
            ],
          },
        },
        format: 'json',
      };

      const issues = validator.validateConstraints(intent);

      expect(issues.some(i =>
        i.code === ValidationErrorCodes.CONSTRAINT_PORT_RANGE &&
        i.path.includes('servicePort')
      )).toBe(true);
    });

    it('should detect invalid metadata name format', () => {
      const intent: ParsedIntent = {
        data: {
          metadata: { name: 'Invalid_Name_With_Uppercase' },
          spec: {},
        },
        format: 'json',
      };

      const issues = validator.validateConstraints(intent);

      expect(issues.some(i => i.code === ValidationErrorCodes.CONSTRAINT_NAME_FORMAT)).toBe(true);
    });

    it('should detect name that is too long', () => {
      const intent: ParsedIntent = {
        data: {
          metadata: { name: 'a'.repeat(260) },
          spec: {},
        },
        format: 'json',
      };

      const issues = validator.validateConstraints(intent);

      expect(issues.some(i =>
        i.code === ValidationErrorCodes.CONSTRAINT_NAME_FORMAT &&
        i.message.includes('length')
      )).toBe(true);
    });

    it('should warn for lowercase env var names', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            env: [
              { name: 'lowercase_var', value: 'test' },
            ],
          },
        },
        format: 'json',
      };

      const issues = validator.validateConstraints(intent);

      expect(issues.some(i =>
        i.code === ValidationErrorCodes.CONSTRAINT_ENV_VAR_FORMAT &&
        i.severity === 'warning'
      )).toBe(true);
    });

    it('should error for invalid env var name format', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            env: [
              { name: '123_invalid', value: 'test' },
            ],
          },
        },
        format: 'json',
      };

      const issues = validator.validateConstraints(intent);

      expect(issues.some(i =>
        i.code === ValidationErrorCodes.CONSTRAINT_ENV_VAR_FORMAT &&
        i.severity === 'error'
      )).toBe(true);
    });

    it('should detect resource requests exceeding limits (CPU)', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            services: [
              {
                name: 'web',
                resources: {
                  requests: { cpu: '1000m' },
                  limits: { cpu: '500m' },
                },
              },
            ],
          },
        },
        format: 'json',
      };

      const issues = validator.validateConstraints(intent);

      expect(issues.some(i => i.code === ValidationErrorCodes.CONSTRAINT_RESOURCE_LIMIT)).toBe(true);
    });

    it('should detect resource requests exceeding limits (memory)', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            services: [
              {
                name: 'web',
                resources: {
                  requests: { memory: '1Gi' },
                  limits: { memory: '512Mi' },
                },
              },
            ],
          },
        },
        format: 'json',
      };

      const issues = validator.validateConstraints(intent);

      expect(issues.some(i => i.code === ValidationErrorCodes.CONSTRAINT_RESOURCE_LIMIT)).toBe(true);
    });

    it('should pass when requests equal limits', () => {
      const intent: ParsedIntent = {
        data: {
          metadata: { name: 'valid-app' },
          spec: {
            services: [
              {
                name: 'web',
                resources: {
                  requests: { cpu: '500m', memory: '512Mi' },
                  limits: { cpu: '500m', memory: '512Mi' },
                },
              },
            ],
          },
        },
        format: 'json',
      };

      const issues = validator.validateConstraints(intent);

      expect(issues.filter(i => i.code === ValidationErrorCodes.CONSTRAINT_RESOURCE_LIMIT)).toHaveLength(0);
    });

    it('should handle missing resources gracefully', () => {
      const intent: ParsedIntent = {
        data: {
          metadata: { name: 'valid-app' },
          spec: {
            services: [
              {
                name: 'web',
                // No resources defined
              },
            ],
          },
        },
        format: 'json',
      };

      const issues = validator.validateConstraints(intent);

      expect(issues.filter(i => i.code === ValidationErrorCodes.CONSTRAINT_RESOURCE_LIMIT)).toHaveLength(0);
    });
  });

  describe('addConstraint', () => {
    it('should add custom constraint', () => {
      const customConstraint = {
        id: 'CUSTOM_CONSTRAINT',
        description: 'Custom constraint',
        fields: ['custom'],
        validate: () => true,
        errorMessage: 'Custom error',
      };

      validator.addConstraint(customConstraint);

      const constraints = validator.getConstraints();
      expect(constraints.some(c => c.id === 'CUSTOM_CONSTRAINT')).toBe(true);
    });
  });

  describe('getConstraints', () => {
    it('should return built-in constraints', () => {
      const constraints = validator.getConstraints();

      expect(constraints.length).toBeGreaterThan(0);
    });
  });
});
