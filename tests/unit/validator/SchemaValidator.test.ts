/**
 * SchemaValidator Unit Tests
 *
 * Tests for the SchemaValidator component.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SchemaValidator } from '../../../src/core/validator/SchemaValidator.js';
import type { ParsedIntent } from '../../../src/core/validator/types.js';

describe('SchemaValidator', () => {
  let validator: SchemaValidator;

  beforeEach(() => {
    validator = new SchemaValidator();
  });

  describe('validate', () => {
    it('should validate a minimal valid intent', () => {
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

      const result = validator.validate(intent);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.data).toBeDefined();
    });

    it('should validate a full intent with all sections', () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: {
            name: 'full-app',
            namespace: 'production',
            labels: {
              app: 'myapp',
              env: 'prod',
            },
            annotations: {
              'example.com/version': '1.0.0',
            },
            version: '1.0.0',
          },
          spec: {
            targetFormat: 'kubernetes',
            provider: 'aws',
            services: [
              {
                name: 'web',
                image: {
                  repository: 'nginx',
                  tag: 'latest',
                },
                replicas: 3,
                ports: [
                  { name: 'http', containerPort: 80, protocol: 'TCP' },
                ],
                resources: {
                  requests: { cpu: '100m', memory: '128Mi' },
                  limits: { cpu: '500m', memory: '512Mi' },
                },
                healthCheck: {
                  type: 'http',
                  path: '/health',
                  port: 80,
                  initialDelaySeconds: 10,
                  periodSeconds: 5,
                },
              },
            ],
            env: [
              { name: 'NODE_ENV', value: 'production' },
            ],
            secrets: [
              { name: 'db-credentials', type: 'Opaque' },
            ],
            networking: {
              ingress: {
                enabled: true,
                host: 'example.com',
                path: '/',
                tls: true,
              },
            },
            storage: [
              { name: 'data', type: 'persistentVolumeClaim', size: '10Gi', mountPath: '/data' },
            ],
          },
        },
        format: 'json',
      };

      const result = validator.validate(intent);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should reject invalid API version', () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'invalid/v999',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
          spec: { targetFormat: 'terraform' },
        },
        format: 'json',
      };

      const result = validator.validate(intent);

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]?.category).toBe('SCHEMA_ERROR');
    });

    it('should reject missing required fields', () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          // Missing metadata and spec
        },
        format: 'json',
      };

      const result = validator.validate(intent);

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should reject invalid port numbers', () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
          spec: {
            targetFormat: 'kubernetes',
            services: [
              {
                name: 'web',
                ports: [
                  { containerPort: 0 }, // Invalid: 0 is not allowed
                ],
              },
            ],
          },
        },
        format: 'json',
      };

      const result = validator.validate(intent);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.path.includes('containerPort'))).toBe(true);
    });

    it('should reject invalid image digest format', () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
          spec: {
            targetFormat: 'kubernetes',
            services: [
              {
                name: 'web',
                image: {
                  repository: 'nginx',
                  digest: 'invalid-digest', // Should be sha256:xxxx
                },
              },
            ],
          },
        },
        format: 'json',
      };

      const result = validator.validate(intent);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.path.includes('digest'))).toBe(true);
    });

    it('should accept image as string', () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
          spec: {
            targetFormat: 'kubernetes',
            services: [
              {
                name: 'web',
                image: 'nginx:latest',
              },
            ],
          },
        },
        format: 'json',
      };

      const result = validator.validate(intent);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid resource format', () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
          spec: {
            targetFormat: 'kubernetes',
            services: [
              {
                name: 'web',
                resources: {
                  requests: {
                    cpu: 'invalid-cpu', // Should be like 100m or 1
                  },
                },
              },
            ],
          },
        },
        format: 'json',
      };

      const result = validator.validate(intent);

      expect(result.valid).toBe(false);
    });

    it('should reject unknown fields in strict mode', () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
          spec: {
            targetFormat: 'terraform',
            unknownField: 'value', // Should be rejected
          },
        },
        format: 'json',
      };

      const result = validator.validate(intent);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.message.includes('Unrecognized'))).toBe(true);
    });

    it('should validate env var requiring value or valueFrom', () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'test-app' },
          spec: {
            targetFormat: 'kubernetes',
            env: [
              { name: 'EMPTY_VAR' }, // Neither value nor valueFrom
            ],
          },
        },
        format: 'json',
      };

      const result = validator.validate(intent);

      expect(result.valid).toBe(false);
    });

    it('should validate correct env var with valueFrom', () => {
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
                    name: 'db-secret',
                    key: 'password',
                  },
                },
              },
            ],
            secrets: [
              { name: 'db-secret' },
            ],
          },
        },
        format: 'json',
      };

      const result = validator.validate(intent);

      expect(result.valid).toBe(true);
    });
  });

  describe('getSchemaVersion', () => {
    it('should return version info for v1', () => {
      const version = validator.getSchemaVersion('agentics.io/v1');

      expect(version).toBeDefined();
      expect(version?.version).toBe('agentics.io/v1');
      expect(version?.deprecated).toBe(false);
    });

    it('should return deprecated info for v1alpha1', () => {
      const version = validator.getSchemaVersion('agentics.io/v1alpha1');

      expect(version).toBeDefined();
      expect(version?.deprecated).toBe(true);
      expect(version?.deprecatedAt).toBeDefined();
    });

    it('should return undefined for unknown version', () => {
      const version = validator.getSchemaVersion('unknown/v1');

      expect(version).toBeUndefined();
    });
  });

  describe('isVersionSupported', () => {
    it('should return true for supported versions', () => {
      expect(validator.isVersionSupported('agentics.io/v1')).toBe(true);
      expect(validator.isVersionSupported('agentics.io/v1beta1')).toBe(true);
      expect(validator.isVersionSupported('agentics.io/v1alpha1')).toBe(true);
    });

    it('should return false for unsupported versions', () => {
      expect(validator.isVersionSupported('unknown/v1')).toBe(false);
      expect(validator.isVersionSupported('agentics.io/v2')).toBe(false);
    });
  });

  describe('getSupportedVersions', () => {
    it('should return all supported versions', () => {
      const versions = validator.getSupportedVersions();

      expect(versions).toContain('agentics.io/v1');
      expect(versions).toContain('agentics.io/v1beta1');
      expect(versions).toContain('agentics.io/v1alpha1');
    });
  });
});
