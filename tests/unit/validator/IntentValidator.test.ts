/**
 * IntentValidator Unit Tests
 *
 * Tests for the main IntentValidator module.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  IntentValidator,
  createIntentValidator,
  type ParsedIntent,
  type ValidationRule,
  ValidationErrorCodes,
} from '../../../src/core/validator/index.js';

describe('IntentValidator', () => {
  let validator: IntentValidator;

  beforeEach(() => {
    validator = new IntentValidator();
  });

  describe('validate', () => {
    it('should validate a correct intent', async () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: {
            name: 'test-app',
          },
          spec: {
            targetFormat: 'terraform',
          },
        },
        format: 'json',
      };

      const result = await validator.validate(intent);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.intent).toBeDefined();
      expect(result.intent?.apiVersion).toBe('agentics.io/v1');
      expect(result.metadata.rulesApplied).toBeGreaterThan(0);
    });

    it('should reject intent with missing apiVersion', async () => {
      const intent: ParsedIntent = {
        data: {
          kind: 'DeploymentIntent',
          metadata: {
            name: 'test-app',
          },
          spec: {
            targetFormat: 'terraform',
          },
        },
        format: 'json',
      };

      const result = await validator.validate(intent);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.category === 'SCHEMA_ERROR')).toBe(true);
      expect(result.intent).toBeUndefined();
    });

    it('should reject intent with invalid apiVersion', async () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'invalid/v999',
          kind: 'DeploymentIntent',
          metadata: {
            name: 'test-app',
          },
          spec: {
            targetFormat: 'terraform',
          },
        },
        format: 'json',
      };

      const result = await validator.validate(intent);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCodes.SCHEMA_PATTERN_MISMATCH)).toBe(true);
    });

    it('should reject intent with invalid kind', async () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'WrongKind',
          metadata: {
            name: 'test-app',
          },
          spec: {
            targetFormat: 'terraform',
          },
        },
        format: 'json',
      };

      const result = await validator.validate(intent);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.category === 'SCHEMA_ERROR')).toBe(true);
    });

    it('should reject intent with invalid metadata name format', async () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: {
            name: 'Invalid_Name_With_Uppercase',
          },
          spec: {
            targetFormat: 'terraform',
          },
        },
        format: 'json',
      };

      const result = await validator.validate(intent);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path.includes('metadata.name'))).toBe(true);
    });

    it('should collect ALL errors instead of fail-fast', async () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'invalid/v999',
          kind: 'WrongKind',
          metadata: {
            name: 'Invalid_Name',
          },
          spec: {
            targetFormat: '',
          },
        },
        format: 'json',
      };

      const result = await validator.validate(intent);

      expect(result.valid).toBe(false);
      // Should have multiple errors, not just the first one
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should validate services with correct port ranges', async () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: {
            name: 'test-app',
          },
          spec: {
            targetFormat: 'kubernetes',
            services: [
              {
                name: 'web',
                ports: [
                  { containerPort: 8080 },
                ],
              },
            ],
          },
        },
        format: 'json',
      };

      const result = await validator.validate(intent);

      expect(result.valid).toBe(true);
    });

    it('should reject services with invalid port ranges', async () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: {
            name: 'test-app',
          },
          spec: {
            targetFormat: 'kubernetes',
            services: [
              {
                name: 'web',
                ports: [
                  { containerPort: 99999 },
                ],
              },
            ],
          },
        },
        format: 'json',
      };

      const result = await validator.validate(intent);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCodes.SCHEMA_VALUE_OUT_OF_RANGE)).toBe(true);
    });

    it('should detect undefined resource references', async () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: {
            name: 'test-app',
          },
          spec: {
            targetFormat: 'terraform',
            resources: [
              {
                type: 'aws_instance',
                name: 'web',
                dependsOn: ['aws_vpc/nonexistent'],
              },
            ],
          },
        },
        format: 'json',
      };

      const result = await validator.validate(intent);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCodes.REF_UNDEFINED_RESOURCE)).toBe(true);
    });

    it('should detect undefined secret references', async () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: {
            name: 'test-app',
          },
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

      const result = await validator.validate(intent);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCodes.REF_UNDEFINED_SECRET)).toBe(true);
    });

    it('should detect SQL injection attempts', async () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: {
            name: 'test-app',
          },
          spec: {
            targetFormat: 'terraform',
            config: {
              query: "SELECT * FROM users WHERE id = '1' OR '1'='1'",
            },
          },
        },
        format: 'json',
      };

      const result = await validator.validate(intent);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCodes.SECURITY_SQL_INJECTION)).toBe(true);
    });

    it('should detect shell injection attempts', async () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: {
            name: 'test-app',
          },
          spec: {
            targetFormat: 'terraform',
            config: {
              command: 'echo $(cat /etc/passwd)',
            },
          },
        },
        format: 'json',
      };

      const result = await validator.validate(intent);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCodes.SECURITY_SHELL_INJECTION)).toBe(true);
    });

    it('should detect path traversal attempts', async () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: {
            name: 'test-app',
          },
          spec: {
            targetFormat: 'terraform',
            config: {
              path: '../../../etc/passwd',
            },
          },
        },
        format: 'json',
      };

      const result = await validator.validate(intent);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCodes.SECURITY_PATH_TRAVERSAL)).toBe(true);
    });

    it('should skip security validation when disabled', async () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: {
            name: 'test-app',
          },
          spec: {
            targetFormat: 'terraform',
            config: {
              query: "SELECT * FROM users WHERE id = '1' OR '1'='1'",
            },
          },
        },
        format: 'json',
      };

      const result = await validator.validate(intent, {
        enableSecurityValidation: false,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should skip specific rules when requested', async () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: {
            name: 'test-app',
          },
          spec: {
            targetFormat: 'terraform',
            config: {
              query: "SELECT * FROM users",
            },
          },
        },
        format: 'json',
      };

      const result = await validator.validate(intent, {
        skipRules: ['security'],
      });

      expect(result.valid).toBe(true);
    });

    it('should treat warnings as errors in strict mode', async () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: {
            name: 'test-app',
          },
          spec: {
            targetFormat: 'kubernetes',
            env: [
              {
                name: 'lowercase_var',
                value: 'test',
              },
            ],
          },
        },
        format: 'json',
      };

      // Without strict mode - should be valid (warning only)
      const normalResult = await validator.validate(intent);
      expect(normalResult.valid).toBe(true);
      expect(normalResult.warnings.length).toBeGreaterThan(0);

      // With strict mode - should be invalid (warnings become errors)
      const strictResult = await validator.validate(intent, { strict: true });
      expect(strictResult.valid).toBe(false);
      expect(strictResult.errors.length).toBeGreaterThan(0);
    });

    it('should include validation metadata', async () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: {
            name: 'test-app',
          },
          spec: {
            targetFormat: 'terraform',
          },
        },
        format: 'json',
      };

      const result = await validator.validate(intent);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.schemaVersion).toBeDefined();
      expect(result.metadata.validatedAt).toBeDefined();
      expect(result.metadata.rulesApplied).toBeGreaterThan(0);
      expect(result.metadata.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should sort errors deterministically', async () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'invalid/v999',
          kind: 'WrongKind',
          metadata: {
            name: 'test-app',
          },
          spec: {
            targetFormat: '',
          },
        },
        format: 'json',
      };

      const result1 = await validator.validate(intent);
      const result2 = await validator.validate(intent);

      // Errors should be in same order for determinism
      expect(result1.errors.map(e => e.path)).toEqual(result2.errors.map(e => e.path));
      expect(result1.errors.map(e => e.code)).toEqual(result2.errors.map(e => e.code));
    });
  });

  describe('registerRule', () => {
    it('should register a custom rule', () => {
      const customRule: ValidationRule = {
        id: 'custom-test-rule',
        name: 'Custom Test Rule',
        description: 'A custom test rule',
        severity: 'error',
        category: 'CONSTRAINT_ERROR',
        validate: () => [],
      };

      validator.registerRule(customRule);

      const rules = validator.getRules();
      expect(rules.some(r => r.id === 'custom-test-rule')).toBe(true);
    });

    it('should throw when registering duplicate rule', () => {
      const customRule: ValidationRule = {
        id: 'duplicate-rule',
        name: 'Duplicate Rule',
        description: 'A duplicate rule',
        severity: 'error',
        category: 'CONSTRAINT_ERROR',
        validate: () => [],
      };

      validator.registerRule(customRule);

      expect(() => validator.registerRule(customRule)).toThrow(
        'Validation rule with id "duplicate-rule" is already registered'
      );
    });

    it('should apply custom rules during validation', async () => {
      const customRule: ValidationRule = {
        id: 'no-production-in-name',
        name: 'No Production in Name',
        description: 'Prevents production word in names',
        severity: 'error',
        category: 'CONSTRAINT_ERROR',
        validate: (intent) => {
          const data = intent.data as Record<string, unknown>;
          const metadata = data.metadata as Record<string, string> | undefined;
          const name = metadata?.name ?? '';

          if (name.includes('production')) {
            return [{
              code: ValidationErrorCodes.CONSTRAINT_NAME_FORMAT,
              category: 'CONSTRAINT_ERROR',
              severity: 'error',
              message: 'Name cannot contain "production"',
              path: '$.metadata.name',
            }];
          }
          return [];
        },
      };

      validator.registerRule(customRule);

      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: {
            name: 'production-app',
          },
          spec: {
            targetFormat: 'terraform',
          },
        },
        format: 'json',
      };

      const result = await validator.validate(intent);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message === 'Name cannot contain "production"')).toBe(true);
    });
  });

  describe('getRules', () => {
    it('should return built-in rules', () => {
      const rules = validator.getRules();

      expect(rules.some(r => r.id === 'schema')).toBe(true);
      expect(rules.some(r => r.id === 'constraints')).toBe(true);
      expect(rules.some(r => r.id === 'references')).toBe(true);
      expect(rules.some(r => r.id === 'security')).toBe(true);
    });

    it('should return both built-in and custom rules', () => {
      const customRule: ValidationRule = {
        id: 'custom-rule',
        name: 'Custom Rule',
        description: 'A custom rule',
        severity: 'error',
        category: 'CONSTRAINT_ERROR',
        validate: () => [],
      };

      validator.registerRule(customRule);

      const rules = validator.getRules();

      // Built-in rules
      expect(rules.some(r => r.id === 'schema')).toBe(true);
      // Custom rule
      expect(rules.some(r => r.id === 'custom-rule')).toBe(true);
    });
  });

  describe('createIntentValidator', () => {
    it('should create a new validator instance', () => {
      const validator = createIntentValidator();

      expect(validator).toBeInstanceOf(IntentValidator);
    });
  });
});
