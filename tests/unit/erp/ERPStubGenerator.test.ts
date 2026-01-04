/**
 * ERP Stub Generator Tests
 *
 * Tests for generating format-specific placeholder stubs for ERP integration
 * slots. Validates that stubs are deterministic, properly formatted, and
 * contain all required metadata.
 *
 * @module tests/unit/erp/ERPStubGenerator.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ERPStubGenerator,
  createERPStubGenerator,
  generateStubHeader,
  type StubArtifactOptions,
} from '../../../src/core/erp/stub-generator.js';
import type {
  IntegrationSlot,
  ERPSurfaceReference,
  IntegrationSlotAudit,
  IntegrationStub,
  IntegrationMarker,
} from '../../../src/core/erp/types.js';

// =============================================================================
// TEST FIXTURES
// =============================================================================

/**
 * Create a test ERP surface reference.
 */
function createTestReference(
  overrides?: Partial<ERPSurfaceReference>
): ERPSurfaceReference {
  return {
    referenceId: 'erp-ref-abc123',
    vendor: 'sap',
    integrationType: 'rfc',
    sourceType: 'sap:rfc:BAPI_ORDER',
    sourcePath: '$.spec.resources[0]',
    resourceName: 'order-create',
    originalProperties: { systemId: 'PRD', client: '100' },
    endpoint: 'sap.example.com',
    entityType: 'ORDERS',
    operation: 'BAPI_ORDER_CREATE',
    confidence: 0.95,
    ...overrides,
  };
}

/**
 * Create a test integration slot.
 */
function createTestSlot(
  overrides?: Partial<IntegrationSlot>
): IntegrationSlot {
  const reference = createTestReference(overrides?.reference);
  const marker: IntegrationMarker = {
    prefix: 'AGENTICS_ERP_INTEGRATION',
    slotId: 'erp-slot:sap:order-create:12345678',
    vendor: reference.vendor,
    integrationType: reference.integrationType,
    status: 'unresolved',
    createdAt: '2024-01-15T10:00:00Z',
    markerVersion: '1.0.0',
  };

  const stub: IntegrationStub = {
    format: 'json-stub',
    content: {},
    contentHash: 'abcdef1234567890',
    comments: ['Test stub'],
    marker,
  };

  const auditInfo: IntegrationSlotAudit = {
    intentId: 'test-intent-001',
    intentVersion: '1.0.0',
    intentHash: 'abc123def456',
    detectedAt: '2024-01-15T10:00:00Z',
    detectionMethod: 'type-pattern',
    matchedPattern: 'type:sap:rfc:BAPI_ORDER',
  };

  return {
    slotId: 'erp-slot:sap:order-create:12345678',
    reference,
    status: 'unresolved',
    stub,
    requiredAdapter: 'sap-adapter',
    configurationSchema: { type: 'object' },
    resolutionInstructions: [
      '1. Install the sap adapter package',
      '2. Configure authentication credentials',
    ],
    auditInfo,
    ...overrides,
  };
}

// =============================================================================
// GENERATOR TESTS
// =============================================================================

describe('ERPStubGenerator', () => {
  let generator: ERPStubGenerator;

  beforeEach(() => {
    generator = createERPStubGenerator();
  });

  describe('constructor', () => {
    it('should create generator with factory function', () => {
      const gen = createERPStubGenerator();
      expect(gen).toBeInstanceOf(ERPStubGenerator);
    });
  });

  describe('generateStubArtifact - JSON format', () => {
    it('should generate JSON stub artifact', () => {
      const slot = createTestSlot();
      const options: StubArtifactOptions = {
        format: 'json-stub',
        basePath: 'erp-integrations',
      };

      const result = generator.generateStubArtifact(slot, options);

      expect(result.artifact.path).toBe('erp-integrations/order-create.json');
      expect(result.artifact.format).toBe('json');
      expect(result.artifact.encoding).toBe('utf-8');
      expect(result.contentHash).toBeTruthy();
    });

    it('should include slot metadata in JSON stub', () => {
      const slot = createTestSlot();
      const options: StubArtifactOptions = { format: 'json-stub' };

      const result = generator.generateStubArtifact(slot, options);
      const content = result.artifact.content as Record<string, unknown>;

      expect(content.slotId).toBe(slot.slotId);
      expect(content.status).toBe('unresolved');
      expect(content.vendor).toBe('sap');
      expect(content.requiredAdapter).toBe('sap-adapter');
    });

    it('should include reference details in JSON stub', () => {
      const slot = createTestSlot();
      const options: StubArtifactOptions = {
        format: 'json-stub',
        includeOriginalProperties: true,
      };

      const result = generator.generateStubArtifact(slot, options);
      const content = result.artifact.content as Record<string, unknown>;
      const reference = content.reference as Record<string, unknown>;

      expect(reference.referenceId).toBe(slot.reference.referenceId);
      expect(reference.resourceName).toBe('order-create');
      expect(reference.endpoint).toBe('sap.example.com');
      expect(reference.originalProperties).toEqual({ systemId: 'PRD', client: '100' });
    });

    it('should exclude original properties when disabled', () => {
      const slot = createTestSlot();
      const options: StubArtifactOptions = {
        format: 'json-stub',
        includeOriginalProperties: false,
      };

      const result = generator.generateStubArtifact(slot, options);
      const content = result.artifact.content as Record<string, unknown>;
      const reference = content.reference as Record<string, unknown>;

      expect(reference.originalProperties).toBeUndefined();
    });
  });

  describe('generateStubArtifact - Terraform format', () => {
    it('should generate Terraform null_resource stub', () => {
      const slot = createTestSlot();
      const options: StubArtifactOptions = {
        format: 'terraform-null',
        basePath: 'terraform',
      };

      const result = generator.generateStubArtifact(slot, options);

      expect(result.artifact.path).toBe('terraform/terraform/order-create.tf.json');
      expect(result.artifact.format).toBe('json');
    });

    it('should include Terraform resource structure', () => {
      const slot = createTestSlot();
      const options: StubArtifactOptions = { format: 'terraform-null' };

      const result = generator.generateStubArtifact(slot, options);
      const content = result.artifact.content as Record<string, unknown>;

      expect(content.resource).toBeDefined();
      expect(content.locals).toBeDefined();
      expect(content.output).toBeDefined();
    });

    it('should include correct triggers in Terraform resource', () => {
      const slot = createTestSlot();
      const options: StubArtifactOptions = { format: 'terraform-null' };

      const result = generator.generateStubArtifact(slot, options);
      const content = result.artifact.content as Record<string, unknown>;
      const resource = content.resource as Record<string, unknown>;
      const nullResource = resource.null_resource as Record<string, unknown>;
      const integration = nullResource.erp_integration_order_create as Record<string, unknown>;
      const triggers = integration.triggers as Record<string, unknown>;

      expect(triggers.erp_vendor).toBe('sap');
      expect(triggers.erp_integration_type).toBe('rfc');
      expect(triggers.erp_slot_id).toBe(slot.slotId);
      expect(triggers.status).toBe('UNRESOLVED');
    });
  });

  describe('generateStubArtifact - Kubernetes ConfigMap format', () => {
    it('should generate Kubernetes ConfigMap stub', () => {
      const slot = createTestSlot();
      const options: StubArtifactOptions = {
        format: 'kubernetes-configmap',
        basePath: 'k8s',
      };

      const result = generator.generateStubArtifact(slot, options);

      expect(result.artifact.path).toBe('k8s/kubernetes/order-create-configmap.yaml');
      expect(result.artifact.format).toBe('yaml');
    });

    it('should include correct ConfigMap structure', () => {
      const slot = createTestSlot();
      const options: StubArtifactOptions = { format: 'kubernetes-configmap' };

      const result = generator.generateStubArtifact(slot, options);
      const content = result.artifact.content as Record<string, unknown>;

      expect(content.apiVersion).toBe('v1');
      expect(content.kind).toBe('ConfigMap');
      expect(content.metadata).toBeDefined();
      expect(content.data).toBeDefined();
    });

    it('should include Agentics labels', () => {
      const slot = createTestSlot();
      const options: StubArtifactOptions = { format: 'kubernetes-configmap' };

      const result = generator.generateStubArtifact(slot, options);
      const content = result.artifact.content as Record<string, unknown>;
      const metadata = content.metadata as Record<string, unknown>;
      const labels = metadata.labels as Record<string, unknown>;

      expect(labels['agentics.io/erp-integration']).toBe('true');
      expect(labels['agentics.io/erp-vendor']).toBe('sap');
      expect(labels['agentics.io/erp-status']).toBe('unresolved');
    });

    it('should include annotations with slot details', () => {
      const slot = createTestSlot();
      const options: StubArtifactOptions = { format: 'kubernetes-configmap' };

      const result = generator.generateStubArtifact(slot, options);
      const content = result.artifact.content as Record<string, unknown>;
      const metadata = content.metadata as Record<string, unknown>;
      const annotations = metadata.annotations as Record<string, unknown>;

      expect(annotations['agentics.io/slot-id']).toBe(slot.slotId);
      expect(annotations['agentics.io/required-adapter']).toBe('sap-adapter');
    });
  });

  describe('generateStubArtifact - Kubernetes Secret format', () => {
    it('should generate Kubernetes Secret stub', () => {
      const slot = createTestSlot();
      const options: StubArtifactOptions = {
        format: 'kubernetes-secret',
        basePath: 'k8s',
      };

      const result = generator.generateStubArtifact(slot, options);

      expect(result.artifact.path).toBe('k8s/kubernetes/order-create-secret.yaml');
      expect(result.artifact.format).toBe('yaml');
    });

    it('should include placeholder credentials', () => {
      const slot = createTestSlot();
      const options: StubArtifactOptions = { format: 'kubernetes-secret' };

      const result = generator.generateStubArtifact(slot, options);
      const content = result.artifact.content as Record<string, unknown>;
      const stringData = content.stringData as Record<string, unknown>;

      expect(stringData.ERP_VENDOR).toBe('sap');
      expect(stringData.ERP_SLOT_ID).toBe(slot.slotId);
      expect(stringData.ERP_STATUS).toBe('UNRESOLVED');
      expect(stringData.ERP_ENDPOINT).toContain('PLACEHOLDER');
    });
  });

  describe('generateStubArtifact - CloudFormation format', () => {
    it('should generate CloudFormation custom resource stub', () => {
      const slot = createTestSlot();
      const options: StubArtifactOptions = {
        format: 'cloudformation-custom',
        basePath: 'cfn',
      };

      const result = generator.generateStubArtifact(slot, options);

      expect(result.artifact.path).toBe('cfn/cloudformation/order-create.yaml');
      expect(result.artifact.format).toBe('yaml');
    });

    it('should include CloudFormation structure', () => {
      const slot = createTestSlot();
      const options: StubArtifactOptions = { format: 'cloudformation-custom' };

      const result = generator.generateStubArtifact(slot, options);
      const content = result.artifact.content as Record<string, unknown>;

      expect(content.AWSTemplateFormatVersion).toBe('2010-09-09');
      expect(content.Description).toContain('ERP Integration Placeholder');
      expect(content.Metadata).toBeDefined();
      expect(content.Parameters).toBeDefined();
      expect(content.Resources).toBeDefined();
      expect(content.Outputs).toBeDefined();
    });

    it('should include Agentics metadata', () => {
      const slot = createTestSlot();
      const options: StubArtifactOptions = { format: 'cloudformation-custom' };

      const result = generator.generateStubArtifact(slot, options);
      const content = result.artifact.content as Record<string, unknown>;
      const metadata = content.Metadata as Record<string, unknown>;
      const erpIntegration = metadata['Agentics::ERPIntegration'] as Record<string, unknown>;

      expect(erpIntegration.SlotId).toBe(slot.slotId);
      expect(erpIntegration.Vendor).toBe('sap');
      expect(erpIntegration.Status).toBe('UNRESOLVED');
    });
  });

  describe('generateStubArtifact - Helm values format', () => {
    it('should generate Helm values stub', () => {
      const slot = createTestSlot();
      const options: StubArtifactOptions = {
        format: 'helm-values',
        basePath: 'chart',
      };

      const result = generator.generateStubArtifact(slot, options);

      expect(result.artifact.path).toBe('chart/helm/values-order-create.yaml');
      expect(result.artifact.format).toBe('yaml');
    });

    it('should include Helm values structure', () => {
      const slot = createTestSlot();
      const options: StubArtifactOptions = { format: 'helm-values' };

      const result = generator.generateStubArtifact(slot, options);
      const content = result.artifact.content as Record<string, unknown>;
      const erpIntegrations = content.erpIntegrations as Record<string, unknown>;
      const integration = erpIntegrations.order_create as Record<string, unknown>;

      expect(integration.enabled).toBe(false);
      expect(integration.vendor).toBe('sap');
      expect(integration.slotId).toBe(slot.slotId);
      expect(integration.status).toBe('unresolved');
      expect(integration.endpoint).toBeDefined();
      expect(integration.authentication).toBeDefined();
    });
  });

  describe('generateStubArtifact - ENV file format', () => {
    it('should generate env file stub', () => {
      const slot = createTestSlot();
      const options: StubArtifactOptions = {
        format: 'env-file',
        basePath: 'config',
      };

      const result = generator.generateStubArtifact(slot, options);

      expect(result.artifact.path).toBe('config/env/order-create.env');
    });

    it('should include environment variables', () => {
      const slot = createTestSlot();
      const options: StubArtifactOptions = { format: 'env-file' };

      const result = generator.generateStubArtifact(slot, options);
      const content = result.artifact.content as Record<string, string>;

      expect(content.ERP_ORDER_CREATE_VENDOR).toBe('sap');
      expect(content.ERP_ORDER_CREATE_SLOT_ID).toBe(slot.slotId);
      expect(content.ERP_ORDER_CREATE_STATUS).toBe('UNRESOLVED');
      expect(content.ERP_ORDER_CREATE_ENDPOINT).toContain('PLACEHOLDER');
    });
  });

  describe('generateStubArtifacts', () => {
    it('should generate multiple stub artifacts', () => {
      const slots = [
        createTestSlot({ slotId: 'erp-slot:sap:a-resource:11111111' }),
        createTestSlot({
          slotId: 'erp-slot:salesforce:b-resource:22222222',
          reference: createTestReference({ vendor: 'salesforce', resourceName: 'b-resource' }),
        }),
      ];
      const options: StubArtifactOptions = { format: 'json-stub' };

      const results = generator.generateStubArtifacts(slots, options);

      expect(results).toHaveLength(2);
      // Results are sorted by slotId, so salesforce comes before sap alphabetically
      expect(results[0]!.slot.slotId).toBe('erp-slot:salesforce:b-resource:22222222');
      expect(results[1]!.slot.slotId).toBe('erp-slot:sap:a-resource:11111111');
    });

    it('should sort results by slot ID', () => {
      const slots = [
        createTestSlot({ slotId: 'erp-slot:z:last:99999999' }),
        createTestSlot({ slotId: 'erp-slot:a:first:00000000' }),
        createTestSlot({ slotId: 'erp-slot:m:middle:55555555' }),
      ];
      const options: StubArtifactOptions = { format: 'json-stub' };

      const results = generator.generateStubArtifacts(slots, options);

      expect(results[0]!.slot.slotId).toBe('erp-slot:a:first:00000000');
      expect(results[1]!.slot.slotId).toBe('erp-slot:m:middle:55555555');
      expect(results[2]!.slot.slotId).toBe('erp-slot:z:last:99999999');
    });
  });

  describe('generateManifest', () => {
    it('should generate manifest for all slots', () => {
      const slots = [
        createTestSlot({ slotId: 'erp-slot:sap:resource1:11111111' }),
        createTestSlot({
          slotId: 'erp-slot:salesforce:resource2:22222222',
          reference: createTestReference({ vendor: 'salesforce' }),
        }),
      ];

      const result = generator.generateManifest(slots, 'test-intent', 'abc123');

      expect(result.path).toBe('erp-integrations/manifest.json');
      expect(result.format).toBe('json');
    });

    it('should include summary statistics in manifest', () => {
      const slots = [
        createTestSlot({ slotId: 'erp-slot:sap:r1:11111111' }),
        createTestSlot({ slotId: 'erp-slot:sap:r2:22222222' }),
        createTestSlot({
          slotId: 'erp-slot:salesforce:r3:33333333',
          reference: createTestReference({ vendor: 'salesforce' }),
        }),
      ];

      const result = generator.generateManifest(slots, 'test-intent', 'abc123');
      const content = result.content as Record<string, unknown>;

      expect(content.totalSlots).toBe(3);
      expect(content.unresolvedCount).toBe(3);
      expect((content.byVendor as Record<string, number>)['sap']).toBe(2);
      expect((content.byVendor as Record<string, number>)['salesforce']).toBe(1);
    });

    it('should include slot summaries in manifest', () => {
      const slot = createTestSlot();
      const result = generator.generateManifest([slot], 'test-intent', 'abc123');
      const content = result.content as Record<string, unknown>;
      const slots = content.slots as Array<Record<string, unknown>>;

      expect(slots).toHaveLength(1);
      expect(slots[0]!.slotId).toBe(slot.slotId);
      expect(slots[0]!.vendor).toBe('sap');
      expect(slots[0]!.resourceName).toBe('order-create');
    });
  });

  describe('determinism', () => {
    it('should produce identical output for identical input', () => {
      const slot = createTestSlot();
      const options: StubArtifactOptions = { format: 'json-stub' };

      const result1 = generator.generateStubArtifact(slot, options);
      const result2 = generator.generateStubArtifact(slot, options);

      expect(result1.contentHash).toBe(result2.contentHash);
      expect(JSON.stringify(result1.artifact.content)).toBe(
        JSON.stringify(result2.artifact.content)
      );
    });

    it('should produce different output for different input', () => {
      const slot1 = createTestSlot({ slotId: 'erp-slot:sap:a:11111111' });
      const slot2 = createTestSlot({ slotId: 'erp-slot:sap:b:22222222' });
      const options: StubArtifactOptions = { format: 'json-stub' };

      const result1 = generator.generateStubArtifact(slot1, options);
      const result2 = generator.generateStubArtifact(slot2, options);

      expect(result1.contentHash).not.toBe(result2.contentHash);
    });
  });
});

describe('generateStubHeader', () => {
  it('should generate header comments for stub', () => {
    const slot = createTestSlot();
    const header = generateStubHeader(slot);

    expect(header).toContain('AGENTICS ERP INTEGRATION STUB');
    expect(header).toContain(`Slot ID: ${slot.slotId}`);
    expect(header).toContain('Vendor: sap');
    expect(header).toContain('Status: UNRESOLVED');
    expect(header).toContain('Resolution Instructions:');
  });

  it('should include resource information', () => {
    const slot = createTestSlot();
    const header = generateStubHeader(slot);

    expect(header).toContain('Resource: order-create');
    expect(header).toContain('Integration Type: rfc');
    expect(header).toContain('Required Adapter: sap-adapter');
  });

  it('should include confidence percentage', () => {
    const slot = createTestSlot();
    const header = generateStubHeader(slot);

    expect(header.join('\n')).toContain('95%');
  });
});
