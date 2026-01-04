/**
 * ERP Surface Detector Tests
 *
 * Tests for ERP surface reference detection in deployment intents.
 * Validates that the detector correctly identifies ERP vendor references,
 * integration types, and generates appropriate integration slots.
 *
 * @module tests/unit/erp/ERPSurfaceDetector.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ERPSurfaceDetector,
  createERPSurfaceDetector,
  type ERPDetectorOptions,
} from '../../../src/core/erp/detector.js';
import type { ValidatedIntent, SemanticVersion } from '../../../src/core/types.js';

// =============================================================================
// TEST FIXTURES
// =============================================================================

/**
 * Create a minimal valid intent for testing.
 */
function createTestIntent(
  resources: Array<{
    type: string;
    name: string;
    properties: Record<string, unknown>;
  }>,
  overrides?: Partial<ValidatedIntent>
): ValidatedIntent {
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
        environment: 'test',
      },
      resources: resources.map((r, i) => ({
        type: r.type,
        name: r.name,
        properties: r.properties,
        dependencies: [],
        outputs: [],
      })),
    },
    ...overrides,
  };
}

// =============================================================================
// DETECTION TESTS
// =============================================================================

describe('ERPSurfaceDetector', () => {
  let detector: ERPSurfaceDetector;

  beforeEach(() => {
    detector = createERPSurfaceDetector();
  });

  describe('constructor', () => {
    it('should create detector with default options', () => {
      const detector = new ERPSurfaceDetector();
      expect(detector).toBeInstanceOf(ERPSurfaceDetector);
    });

    it('should create detector with custom options', () => {
      const detector = new ERPSurfaceDetector({
        minConfidence: 0.8,
        stubFormat: 'terraform-null',
        includeOriginalProperties: false,
      });
      expect(detector).toBeInstanceOf(ERPSurfaceDetector);
    });
  });

  describe('detect - SAP references', () => {
    it('should detect sap: prefixed resource types', () => {
      const intent = createTestIntent([
        {
          type: 'sap:rfc:BAPI_MATERIAL_GET',
          name: 'material-lookup',
          properties: { systemId: 'PRD' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasERPReferences).toBe(true);
      expect(result.references).toHaveLength(1);
      expect(result.references[0]!.vendor).toBe('sap');
      expect(result.references[0]!.confidence).toBe(1.0);
    });

    it('should detect SAP BAPI patterns', () => {
      const intent = createTestIntent([
        {
          type: 'sap-bapi-call',
          name: 'customer-create',
          properties: { bapiName: 'BAPI_CUSTOMER_CREATE' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasERPReferences).toBe(true);
      expect(result.references[0]!.vendor).toBe('sap');
      expect(result.references[0]!.integrationType).toBe('rfc');
    });

    it('should detect SAP RFC destination properties', () => {
      const intent = createTestIntent([
        {
          type: 'integration:connector',
          name: 'sap-connector',
          properties: {
            rfcDestination: 'SAP_PRD_001',
            sapClient: '100',
          },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasERPReferences).toBe(true);
      expect(result.references[0]!.vendor).toBe('sap');
      expect(result.references[0]!.integrationType).toBe('rfc');
    });

    it('should detect SAP IDoc patterns', () => {
      const intent = createTestIntent([
        {
          type: 'idoc:ORDERS05',
          name: 'order-sync',
          properties: { idocType: 'ORDERS05' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasERPReferences).toBe(true);
      expect(result.references[0]!.vendor).toBe('sap');
      expect(result.references[0]!.integrationType).toBe('idoc');
    });

    it('should detect SAP OData patterns', () => {
      const intent = createTestIntent([
        {
          type: 'sap-odata-service',
          name: 'product-service',
          properties: { endpoint: '/sap/opu/odata/sap/API_PRODUCT' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasERPReferences).toBe(true);
      expect(result.references[0]!.integrationType).toBe('odata');
    });
  });

  describe('detect - Oracle ERP references', () => {
    it('should detect oracle-erp: prefixed resource types', () => {
      const intent = createTestIntent([
        {
          type: 'oracle-erp:financials',
          name: 'gl-sync',
          properties: { module: 'GeneralLedger' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasERPReferences).toBe(true);
      expect(result.references[0]!.vendor).toBe('oracle-erp');
      expect(result.references[0]!.confidence).toBe(1.0);
    });

    it('should detect Oracle Fusion patterns', () => {
      const intent = createTestIntent([
        {
          type: 'oracle-fusion-cloud',
          name: 'hr-integration',
          properties: { fusionApi: '/hcmRestApi/resources/11.13.18.05' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasERPReferences).toBe(true);
      expect(result.references[0]!.vendor).toBe('oracle-erp');
    });
  });

  describe('detect - NetSuite references', () => {
    it('should detect netsuite: prefixed resource types', () => {
      const intent = createTestIntent([
        {
          type: 'netsuite:restlet',
          name: 'inventory-sync',
          properties: { scriptId: 'customscript_inv_sync' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasERPReferences).toBe(true);
      expect(result.references[0]!.vendor).toBe('oracle-netsuite');
    });

    it('should detect NetSuite account properties', () => {
      const intent = createTestIntent([
        {
          type: 'integration:api',
          name: 'netsuite-api',
          properties: { netsuiteAccount: '1234567' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasERPReferences).toBe(true);
      expect(result.references[0]!.vendor).toBe('oracle-netsuite');
    });
  });

  describe('detect - Microsoft Dynamics references', () => {
    it('should detect dynamics: prefixed resource types', () => {
      const intent = createTestIntent([
        {
          type: 'dynamics:crm:contact',
          name: 'contact-sync',
          properties: { entity: 'contact' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasERPReferences).toBe(true);
      expect(result.references[0]!.vendor).toBe('microsoft-dynamics');
    });

    it('should detect Dynamics 365 patterns', () => {
      const intent = createTestIntent([
        {
          type: 'dynamics-365-fo',
          name: 'erp-connector',
          properties: { d365Tenant: 'contoso.onmicrosoft.com' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasERPReferences).toBe(true);
      expect(result.references[0]!.vendor).toBe('microsoft-dynamics');
    });

    it('should detect Dataverse OData properties', () => {
      const intent = createTestIntent([
        {
          type: 'integration:dataverse',
          name: 'dataverse-sync',
          properties: { dataverseUrl: 'https://org.crm.dynamics.com' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasERPReferences).toBe(true);
      expect(result.references[0]!.vendor).toBe('microsoft-dynamics');
      expect(result.references[0]!.integrationType).toBe('odata');
    });
  });

  describe('detect - Salesforce references', () => {
    it('should detect salesforce: prefixed resource types', () => {
      const intent = createTestIntent([
        {
          type: 'salesforce:sobject',
          name: 'account-sync',
          properties: { object: 'Account' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasERPReferences).toBe(true);
      expect(result.references[0]!.vendor).toBe('salesforce');
    });

    it('should detect SFDC patterns', () => {
      const intent = createTestIntent([
        {
          type: 'sfdc:bulk-api',
          name: 'bulk-load',
          properties: { sfdcApi: 'v55.0' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasERPReferences).toBe(true);
      expect(result.references[0]!.vendor).toBe('salesforce');
    });
  });

  describe('detect - Workday references', () => {
    it('should detect workday: prefixed resource types', () => {
      const intent = createTestIntent([
        {
          type: 'workday:hcm:worker',
          name: 'worker-sync',
          properties: { tenant: 'impl' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasERPReferences).toBe(true);
      expect(result.references[0]!.vendor).toBe('workday');
    });

    it('should detect Workday tenant properties', () => {
      const intent = createTestIntent([
        {
          type: 'integration:api',
          name: 'wd-integration',
          properties: { workdayTenant: 'wd2-impl' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasERPReferences).toBe(true);
      expect(result.references[0]!.vendor).toBe('workday');
    });
  });

  describe('detect - Generic ERP references', () => {
    it('should detect generic erp: prefixed resource types', () => {
      const intent = createTestIntent([
        {
          type: 'erp:custom-connector',
          name: 'legacy-erp',
          properties: { endpoint: 'http://erp.internal' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasERPReferences).toBe(true);
      expect(result.references[0]!.vendor).toBe('generic-erp');
    });

    it('should detect ERP connection properties', () => {
      const intent = createTestIntent([
        {
          type: 'integration:connector',
          name: 'erp-link',
          properties: { erpConnection: 'jdbc:erp://server:1234' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasERPReferences).toBe(true);
      expect(result.references[0]!.vendor).toBe('generic-erp');
    });
  });

  describe('detect - No ERP references', () => {
    it('should return empty results for non-ERP resources', () => {
      const intent = createTestIntent([
        {
          type: 'aws:ec2:instance',
          name: 'web-server',
          properties: { instanceType: 't3.medium' },
        },
        {
          type: 'kubernetes:deployment',
          name: 'api-service',
          properties: { replicas: 3 },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasERPReferences).toBe(false);
      expect(result.references).toHaveLength(0);
      expect(result.integrationSlots).toHaveLength(0);
    });

    it('should handle empty resource list', () => {
      const intent = createTestIntent([]);

      const result = detector.detect(intent);

      expect(result.hasERPReferences).toBe(false);
      expect(result.summary.totalReferences).toBe(0);
    });
  });

  describe('detect - Multiple ERP references', () => {
    it('should detect multiple vendors in same intent', () => {
      const intent = createTestIntent([
        {
          type: 'sap:rfc:BAPI_ORDER_CREATE',
          name: 'sap-orders',
          properties: { systemId: 'PRD' },
        },
        {
          type: 'salesforce:sobject',
          name: 'sf-accounts',
          properties: { object: 'Account' },
        },
        {
          type: 'workday:hcm:worker',
          name: 'wd-workers',
          properties: { tenant: 'prod' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasERPReferences).toBe(true);
      expect(result.references).toHaveLength(3);
      expect(result.summary.byVendor['sap']).toBe(1);
      expect(result.summary.byVendor['salesforce']).toBe(1);
      expect(result.summary.byVendor['workday']).toBe(1);
    });

    it('should detect same vendor multiple times', () => {
      const intent = createTestIntent([
        {
          type: 'sap:rfc:BAPI_MATERIAL_GET',
          name: 'material-lookup',
          properties: {},
        },
        {
          type: 'sap:idoc:ORDERS05',
          name: 'order-sync',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      expect(result.hasERPReferences).toBe(true);
      expect(result.references).toHaveLength(2);
      expect(result.summary.byVendor['sap']).toBe(2);
    });
  });

  describe('detect - Confidence filtering', () => {
    it('should filter by minimum confidence', () => {
      const highConfidenceDetector = createERPSurfaceDetector({
        minConfidence: 0.95,
      });

      const intent = createTestIntent([
        {
          type: 'sap:rfc:BAPI_ORDER', // High confidence (1.0)
          name: 'high-conf',
          properties: {},
        },
        {
          type: 'enterprise-resource-planning', // Low confidence (0.6)
          name: 'low-conf',
          properties: {},
        },
      ]);

      const result = highConfidenceDetector.detect(intent);

      expect(result.hasERPReferences).toBe(true);
      expect(result.references).toHaveLength(1);
      expect(result.references[0]!.confidence).toBeGreaterThanOrEqual(0.95);
    });
  });

  describe('detect - Integration slots', () => {
    it('should generate integration slots for all references', () => {
      const intent = createTestIntent([
        {
          type: 'sap:rfc:BAPI_ORDER_CREATE',
          name: 'order-create',
          properties: { systemId: 'PRD' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.integrationSlots).toHaveLength(1);
      const slot = result.integrationSlots[0]!;
      expect(slot.slotId).toMatch(/^erp-slot:sap:/);
      expect(slot.status).toBe('unresolved');
      expect(slot.requiredAdapter).toBe('sap-adapter');
      expect(slot.resolutionInstructions.length).toBeGreaterThan(0);
    });

    it('should include audit information in slots', () => {
      const intent = createTestIntent([
        {
          type: 'salesforce:sobject',
          name: 'account-sync',
          properties: {},
        },
      ]);

      const result = detector.detect(intent);

      const slot = result.integrationSlots[0]!;
      expect(slot.auditInfo.intentId).toBe('test-intent-001');
      expect(slot.auditInfo.intentVersion).toBe('1.0.0');
      expect(slot.auditInfo.intentHash).toBe('abc123def456');
      expect(slot.auditInfo.detectionMethod).toBe('type-pattern');
    });

    it('should generate stub content in slots', () => {
      const intent = createTestIntent([
        {
          type: 'dynamics:crm:contact',
          name: 'contact-sync',
          properties: { entity: 'contact' },
        },
      ]);

      const result = detector.detect(intent);

      const slot = result.integrationSlots[0]!;
      expect(slot.stub).toBeDefined();
      expect(slot.stub.format).toBe('json-stub');
      expect(slot.stub.contentHash).toBeTruthy();
      expect(slot.stub.marker.prefix).toBe('AGENTICS_ERP_INTEGRATION');
    });
  });

  describe('detect - Summary statistics', () => {
    it('should generate accurate summary statistics', () => {
      const intent = createTestIntent([
        { type: 'sap:rfc:BAPI_1', name: 'sap1', properties: {} },
        { type: 'sap:rfc:BAPI_2', name: 'sap2', properties: {} },
        { type: 'salesforce:sobject', name: 'sf1', properties: {} },
        { type: 'workday:hcm:worker', name: 'wd1', properties: {} },
      ]);

      const result = detector.detect(intent);

      expect(result.summary.totalReferences).toBe(4);
      expect(result.summary.byVendor['sap']).toBe(2);
      expect(result.summary.byVendor['salesforce']).toBe(1);
      expect(result.summary.byVendor['workday']).toBe(1);
      expect(result.summary.unresolvedCount).toBe(4);
    });

    it('should count high confidence references', () => {
      const intent = createTestIntent([
        { type: 'sap:rfc:BAPI_1', name: 'high1', properties: {} }, // 1.0
        { type: 'salesforce:sobject', name: 'high2', properties: {} }, // 1.0
      ]);

      const result = detector.detect(intent);

      expect(result.summary.highConfidenceCount).toBe(2);
    });
  });

  describe('detect - Determinism', () => {
    it('should produce identical output for identical input', () => {
      const intent = createTestIntent([
        { type: 'sap:rfc:BAPI_ORDER', name: 'order-api', properties: { x: 1 } },
        { type: 'salesforce:sobject', name: 'sf-sync', properties: { y: 2 } },
      ]);

      const result1 = detector.detect(intent);
      const result2 = detector.detect(intent);

      expect(result1.references.length).toBe(result2.references.length);
      expect(result1.references[0]!.referenceId).toBe(result2.references[0]!.referenceId);
      expect(result1.integrationSlots[0]!.slotId).toBe(result2.integrationSlots[0]!.slotId);
      expect(result1.integrationSlots[0]!.stub.contentHash).toBe(
        result2.integrationSlots[0]!.stub.contentHash
      );
    });

    it('should produce sorted output', () => {
      const intent = createTestIntent([
        { type: 'workday:hcm:worker', name: 'z-workday', properties: {} },
        { type: 'sap:rfc:BAPI', name: 'a-sap', properties: {} },
        { type: 'salesforce:sobject', name: 'm-salesforce', properties: {} },
      ]);

      const result = detector.detect(intent);

      // References should be sorted by referenceId
      for (let i = 1; i < result.references.length; i++) {
        expect(
          result.references[i - 1]!.referenceId.localeCompare(result.references[i]!.referenceId)
        ).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('detect - Property extraction', () => {
    it('should extract endpoint from properties', () => {
      const intent = createTestIntent([
        {
          type: 'sap:odata',
          name: 'product-api',
          properties: { endpoint: 'https://sap.example.com/odata' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.references[0]!.endpoint).toBe('https://sap.example.com/odata');
    });

    it('should extract entity type from properties', () => {
      const intent = createTestIntent([
        {
          type: 'salesforce:sobject',
          name: 'contact-sync',
          properties: { entityType: 'Contact' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.references[0]!.entityType).toBe('Contact');
    });

    it('should extract operation from properties', () => {
      const intent = createTestIntent([
        {
          type: 'sap:rfc',
          name: 'material-get',
          properties: { operation: 'BAPI_MATERIAL_GET' },
        },
      ]);

      const result = detector.detect(intent);

      expect(result.references[0]!.operation).toBe('BAPI_MATERIAL_GET');
    });
  });
});

describe('createERPSurfaceDetector', () => {
  it('should create detector with factory function', () => {
    const detector = createERPSurfaceDetector();
    expect(detector).toBeInstanceOf(ERPSurfaceDetector);
  });

  it('should pass options to detector', () => {
    const options: ERPDetectorOptions = {
      minConfidence: 0.9,
      stubFormat: 'kubernetes-configmap',
    };

    const detector = createERPSurfaceDetector(options);
    expect(detector).toBeInstanceOf(ERPSurfaceDetector);
  });
});
