/**
 * ERP Surface Detector
 *
 * Detects ERP (Enterprise Resource Planning) surface references within
 * deployment intents. This module identifies resource types, properties,
 * and dependencies that indicate ERP integration requirements.
 *
 * The detector is deterministic - same input always produces identical output.
 * No network calls or external services are used.
 *
 * @module core/erp/detector
 * @version 1.0.0
 */

import { createHash } from 'crypto';
import type { IntentResource, ValidatedIntent, SemanticVersion } from '../types.js';
import type {
  ERPDetectionResult,
  ERPDetectionSummary,
  ERPIntegrationType,
  ERPSurfaceReference,
  ERPVendor,
  IntegrationSlot,
  IntegrationSlotAudit,
  IntegrationStub,
  IntegrationMarker,
  StubOutputFormat,
} from './types.js';

// =============================================================================
// DETECTION PATTERNS
// =============================================================================

/**
 * Patterns for detecting ERP vendor references in resource types.
 * Each pattern maps to a vendor and optional integration type.
 */
interface VendorPattern {
  readonly pattern: RegExp;
  readonly vendor: ERPVendor;
  readonly integrationType?: ERPIntegrationType;
  readonly confidence: number;
}

const VENDOR_TYPE_PATTERNS: readonly VendorPattern[] = [
  // SAP patterns
  { pattern: /^sap:/i, vendor: 'sap', confidence: 1.0 },
  { pattern: /sap[-_]?(rfc|bapi|idoc)/i, vendor: 'sap', integrationType: 'rfc', confidence: 0.95 },
  { pattern: /sap[-_]?odata/i, vendor: 'sap', integrationType: 'odata', confidence: 0.95 },
  { pattern: /sap[-_]?s4hana/i, vendor: 'sap', confidence: 0.9 },
  { pattern: /sap[-_]?ecc/i, vendor: 'sap', confidence: 0.9 },
  { pattern: /sap[-_]?bw/i, vendor: 'sap', confidence: 0.85 },
  { pattern: /bapi:/i, vendor: 'sap', integrationType: 'bapi', confidence: 1.0 },
  { pattern: /rfc:/i, vendor: 'sap', integrationType: 'rfc', confidence: 1.0 },
  { pattern: /idoc:/i, vendor: 'sap', integrationType: 'idoc', confidence: 1.0 },

  // Oracle ERP patterns
  { pattern: /^oracle[-_]?erp:/i, vendor: 'oracle-erp', confidence: 1.0 },
  { pattern: /oracle[-_]?fusion/i, vendor: 'oracle-erp', confidence: 0.9 },
  { pattern: /oracle[-_]?cloud[-_]?erp/i, vendor: 'oracle-erp', confidence: 0.95 },
  { pattern: /oracle[-_]?ebs/i, vendor: 'oracle-erp', confidence: 0.9 },

  // NetSuite patterns
  { pattern: /^netsuite:/i, vendor: 'oracle-netsuite', confidence: 1.0 },
  { pattern: /oracle[-_]?netsuite/i, vendor: 'oracle-netsuite', confidence: 0.95 },
  { pattern: /netsuite[-_]?suitetalk/i, vendor: 'oracle-netsuite', integrationType: 'api', confidence: 0.9 },

  // Microsoft Dynamics patterns
  { pattern: /^dynamics:/i, vendor: 'microsoft-dynamics', confidence: 1.0 },
  { pattern: /dynamics[-_]?365/i, vendor: 'microsoft-dynamics', confidence: 0.95 },
  { pattern: /dynamics[-_]?crm/i, vendor: 'microsoft-dynamics', confidence: 0.9 },
  { pattern: /dynamics[-_]?nav/i, vendor: 'microsoft-dynamics', confidence: 0.85 },
  { pattern: /dynamics[-_]?ax/i, vendor: 'microsoft-dynamics', confidence: 0.85 },
  { pattern: /d365[-_]?fo/i, vendor: 'microsoft-dynamics', confidence: 0.9 },

  // Salesforce patterns
  { pattern: /^salesforce:/i, vendor: 'salesforce', confidence: 1.0 },
  { pattern: /sfdc:/i, vendor: 'salesforce', confidence: 0.95 },
  { pattern: /salesforce[-_]?commerce/i, vendor: 'salesforce', confidence: 0.9 },
  { pattern: /salesforce[-_]?cpq/i, vendor: 'salesforce', confidence: 0.9 },

  // Workday patterns
  { pattern: /^workday:/i, vendor: 'workday', confidence: 1.0 },
  { pattern: /workday[-_]?hcm/i, vendor: 'workday', confidence: 0.9 },
  { pattern: /workday[-_]?financials/i, vendor: 'workday', confidence: 0.9 },

  // Infor patterns
  { pattern: /^infor:/i, vendor: 'infor', confidence: 1.0 },
  { pattern: /infor[-_]?ln/i, vendor: 'infor', confidence: 0.9 },
  { pattern: /infor[-_]?m3/i, vendor: 'infor', confidence: 0.9 },

  // Sage patterns
  { pattern: /^sage:/i, vendor: 'sage', confidence: 1.0 },
  { pattern: /sage[-_]?intacct/i, vendor: 'sage', confidence: 0.9 },
  { pattern: /sage[-_]?x3/i, vendor: 'sage', confidence: 0.9 },

  // Epicor patterns
  { pattern: /^epicor:/i, vendor: 'epicor', confidence: 1.0 },
  { pattern: /epicor[-_]?erp/i, vendor: 'epicor', confidence: 0.9 },
  { pattern: /epicor[-_]?kinetic/i, vendor: 'epicor', confidence: 0.9 },

  // IFS patterns
  { pattern: /^ifs:/i, vendor: 'ifs', confidence: 1.0 },
  { pattern: /ifs[-_]?applications/i, vendor: 'ifs', confidence: 0.9 },
  { pattern: /ifs[-_]?cloud/i, vendor: 'ifs', confidence: 0.9 },

  // Generic ERP patterns (lower confidence)
  { pattern: /^erp:/i, vendor: 'generic-erp', confidence: 0.8 },
  { pattern: /erp[-_]?integration/i, vendor: 'generic-erp', confidence: 0.7 },
  { pattern: /erp[-_]?connector/i, vendor: 'generic-erp', confidence: 0.7 },
  { pattern: /enterprise[-_]?resource/i, vendor: 'generic-erp', confidence: 0.6 },
];

/**
 * Patterns for detecting ERP references in property keys and values.
 */
interface PropertyPattern {
  readonly keyPattern?: RegExp;
  readonly valuePattern?: RegExp;
  readonly vendor: ERPVendor;
  readonly integrationType?: ERPIntegrationType;
  readonly confidence: number;
}

const PROPERTY_PATTERNS: readonly PropertyPattern[] = [
  // SAP connection properties
  { keyPattern: /sap[-_]?host/i, vendor: 'sap', integrationType: 'rfc', confidence: 0.9 },
  { keyPattern: /sap[-_]?client/i, vendor: 'sap', integrationType: 'rfc', confidence: 0.85 },
  { keyPattern: /sap[-_]?system[-_]?id/i, vendor: 'sap', confidence: 0.85 },
  { keyPattern: /bapi[-_]?name/i, vendor: 'sap', integrationType: 'bapi', confidence: 0.95 },
  { keyPattern: /rfc[-_]?destination/i, vendor: 'sap', integrationType: 'rfc', confidence: 0.95 },
  { keyPattern: /idoc[-_]?type/i, vendor: 'sap', integrationType: 'idoc', confidence: 0.95 },
  { valuePattern: /^BAPI_/i, vendor: 'sap', integrationType: 'bapi', confidence: 0.9 },

  // Oracle ERP properties
  { keyPattern: /oracle[-_]?erp[-_]?endpoint/i, vendor: 'oracle-erp', integrationType: 'api', confidence: 0.9 },
  { keyPattern: /fusion[-_]?api/i, vendor: 'oracle-erp', integrationType: 'api', confidence: 0.85 },

  // NetSuite properties
  { keyPattern: /netsuite[-_]?account/i, vendor: 'oracle-netsuite', confidence: 0.9 },
  { keyPattern: /netsuite[-_]?token/i, vendor: 'oracle-netsuite', integrationType: 'api', confidence: 0.85 },

  // Dynamics properties
  { keyPattern: /dynamics[-_]?org/i, vendor: 'microsoft-dynamics', confidence: 0.85 },
  { keyPattern: /d365[-_]?tenant/i, vendor: 'microsoft-dynamics', confidence: 0.85 },
  { keyPattern: /dataverse[-_]?url/i, vendor: 'microsoft-dynamics', integrationType: 'odata', confidence: 0.9 },

  // Salesforce properties
  { keyPattern: /sf[-_]?instance/i, vendor: 'salesforce', confidence: 0.85 },
  { keyPattern: /salesforce[-_]?org/i, vendor: 'salesforce', confidence: 0.9 },
  { keyPattern: /sfdc[-_]?api/i, vendor: 'salesforce', integrationType: 'api', confidence: 0.85 },

  // Workday properties
  { keyPattern: /workday[-_]?tenant/i, vendor: 'workday', confidence: 0.9 },
  { keyPattern: /workday[-_]?raas/i, vendor: 'workday', integrationType: 'api', confidence: 0.85 },

  // Generic ERP patterns
  { keyPattern: /erp[-_]?connection/i, vendor: 'generic-erp', confidence: 0.7 },
  { keyPattern: /erp[-_]?endpoint/i, vendor: 'generic-erp', integrationType: 'api', confidence: 0.7 },
];

// =============================================================================
// DETECTION FUNCTIONS
// =============================================================================

/**
 * Detect ERP vendor from a resource type string.
 */
function detectVendorFromType(
  resourceType: string
): { vendor: ERPVendor; integrationType: ERPIntegrationType; confidence: number } | null {
  for (const pattern of VENDOR_TYPE_PATTERNS) {
    if (pattern.pattern.test(resourceType)) {
      return {
        vendor: pattern.vendor,
        integrationType: pattern.integrationType ?? 'unknown',
        confidence: pattern.confidence,
      };
    }
  }
  return null;
}

/**
 * Detect ERP references from resource properties.
 */
function detectVendorFromProperties(
  properties: Readonly<Record<string, unknown>>
): Array<{ vendor: ERPVendor; integrationType: ERPIntegrationType; confidence: number; matchedPattern: string }> {
  const results: Array<{ vendor: ERPVendor; integrationType: ERPIntegrationType; confidence: number; matchedPattern: string }> = [];

  function scanValue(key: string, value: unknown, path: string): void {
    for (const pattern of PROPERTY_PATTERNS) {
      if (pattern.keyPattern && pattern.keyPattern.test(key)) {
        results.push({
          vendor: pattern.vendor,
          integrationType: pattern.integrationType ?? 'unknown',
          confidence: pattern.confidence,
          matchedPattern: `key:${key} at ${path}`,
        });
      }

      if (pattern.valuePattern && typeof value === 'string' && pattern.valuePattern.test(value)) {
        results.push({
          vendor: pattern.vendor,
          integrationType: pattern.integrationType ?? 'unknown',
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
  vendor: ERPVendor,
  index: number
): string {
  const input = `${intentHash}:${resourceName}:${vendor}:${index}`;
  const hash = createHash('sha256').update(input).digest('hex').substring(0, 12);
  return `erp-ref-${hash}`;
}

/**
 * Generate a deterministic slot ID.
 */
function generateSlotId(
  vendor: ERPVendor,
  resourceName: string,
  referenceId: string
): string {
  const hash = createHash('sha256')
    .update(`${vendor}:${resourceName}:${referenceId}`)
    .digest('hex')
    .substring(0, 8);
  return `erp-slot:${vendor}:${resourceName.toLowerCase().replace(/[^a-z0-9]/g, '-')}:${hash}`;
}

/**
 * Generate stub content hash.
 */
function generateContentHash(content: Record<string, unknown>): string {
  const serialized = JSON.stringify(content, Object.keys(content).sort());
  return createHash('sha256').update(serialized).digest('hex').substring(0, 16);
}

// =============================================================================
// STUB GENERATION
// =============================================================================

/**
 * Generate an integration stub for an ERP reference.
 */
function generateIntegrationStub(
  reference: ERPSurfaceReference,
  format: StubOutputFormat,
  timestamp: string
): IntegrationStub {
  const marker: IntegrationMarker = {
    prefix: 'AGENTICS_ERP_INTEGRATION',
    slotId: generateSlotId(reference.vendor, reference.resourceName, reference.referenceId),
    vendor: reference.vendor,
    integrationType: reference.integrationType,
    status: 'unresolved',
    createdAt: timestamp,
    markerVersion: '1.0.0',
  };

  const comments = [
    '='.repeat(78),
    'AGENTICS ERP INTEGRATION SLOT',
    '='.repeat(78),
    `Vendor: ${reference.vendor}`,
    `Integration Type: ${reference.integrationType}`,
    `Resource: ${reference.resourceName}`,
    `Source Type: ${reference.sourceType}`,
    `Status: UNRESOLVED - Requires ERP adapter configuration`,
    '',
    'This is a placeholder stub marking an ERP integration dependency.',
    'The actual ERP adapter must be configured before deployment.',
    '',
    `Reference ID: ${reference.referenceId}`,
    `Confidence: ${(reference.confidence * 100).toFixed(0)}%`,
    '='.repeat(78),
  ];

  const content = generateStubContent(reference, marker, format);

  return {
    format,
    content,
    contentHash: generateContentHash(content),
    comments,
    marker,
  };
}

/**
 * Generate format-specific stub content.
 */
function generateStubContent(
  reference: ERPSurfaceReference,
  marker: IntegrationMarker,
  format: StubOutputFormat
): Record<string, unknown> {
  const baseContent = {
    _agentics_erp_integration: {
      marker: marker.prefix,
      slotId: marker.slotId,
      vendor: marker.vendor,
      integrationType: marker.integrationType,
      status: marker.status,
      markerVersion: marker.markerVersion,
      createdAt: marker.createdAt,
    },
    _integration_metadata: {
      resourceName: reference.resourceName,
      sourceType: reference.sourceType,
      sourcePath: reference.sourcePath,
      referenceId: reference.referenceId,
      confidence: reference.confidence,
      originalProperties: reference.originalProperties,
    },
  };

  switch (format) {
    case 'terraform-null':
      return {
        ...baseContent,
        resource_type: 'null_resource',
        triggers: {
          erp_vendor: reference.vendor,
          erp_integration_type: reference.integrationType,
          erp_slot_id: marker.slotId,
          resource_name: reference.resourceName,
        },
        lifecycle: {
          create_before_destroy: false,
        },
      };

    case 'terraform-local':
      return {
        ...baseContent,
        resource_type: 'null_resource',
        provisioner_local_exec: {
          command: `echo "ERP Integration Slot: ${marker.slotId} - Requires ${reference.vendor} adapter"`,
          on_failure: 'continue',
        },
      };

    case 'kubernetes-configmap':
      return {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
          name: `erp-integration-${reference.resourceName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          labels: {
            'agentics.io/erp-integration': 'true',
            'agentics.io/erp-vendor': reference.vendor,
            'agentics.io/erp-slot-id': marker.slotId,
          },
          annotations: {
            'agentics.io/integration-status': 'unresolved',
            'agentics.io/requires-adapter': 'true',
          },
        },
        data: {
          'integration.json': JSON.stringify(baseContent, null, 2),
        },
      };

    case 'kubernetes-secret':
      return {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: `erp-credentials-${reference.resourceName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          labels: {
            'agentics.io/erp-integration': 'true',
            'agentics.io/erp-vendor': reference.vendor,
          },
        },
        type: 'Opaque',
        stringData: {
          'PLACEHOLDER_NOTE': 'This secret requires ERP adapter configuration',
          'ERP_VENDOR': reference.vendor,
          'ERP_SLOT_ID': marker.slotId,
        },
      };

    case 'cloudformation-custom':
      return {
        Type: 'AWS::CloudFormation::WaitConditionHandle',
        Metadata: {
          'Agentics::ERPIntegration': baseContent._agentics_erp_integration,
          'Agentics::IntegrationMetadata': baseContent._integration_metadata,
          Comment: `ERP Integration Slot - Requires ${reference.vendor} adapter`,
        },
      };

    case 'helm-values':
      return {
        erpIntegration: {
          enabled: false,
          slot: marker.slotId,
          vendor: reference.vendor,
          integrationType: reference.integrationType,
          status: 'unresolved',
          config: {
            placeholder: true,
            requiresAdapter: true,
            ...baseContent._integration_metadata,
          },
        },
      };

    case 'env-file':
      return {
        [`ERP_${reference.resourceName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_VENDOR`]: reference.vendor,
        [`ERP_${reference.resourceName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_SLOT_ID`]: marker.slotId,
        [`ERP_${reference.resourceName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_STATUS`]: 'UNRESOLVED',
        [`ERP_${reference.resourceName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_TYPE`]: reference.integrationType,
      };

    case 'json-stub':
    case 'yaml-stub':
    default:
      return baseContent;
  }
}

// =============================================================================
// MAIN DETECTOR CLASS
// =============================================================================

/**
 * Options for ERP detection.
 */
export interface ERPDetectorOptions {
  /**
   * Minimum confidence threshold for including references.
   * @default 0.5
   */
  readonly minConfidence?: number;

  /**
   * Output format for generated stubs.
   * @default 'json-stub'
   */
  readonly stubFormat?: StubOutputFormat;

  /**
   * Whether to include original properties in stubs.
   * @default true
   */
  readonly includeOriginalProperties?: boolean;
}

/**
 * ERP Surface Detector class.
 *
 * Detects ERP surface references in deployment intents and generates
 * appropriate placeholder stubs for unresolved dependencies.
 *
 * All operations are deterministic and produce identical output for
 * identical input.
 */
export class ERPSurfaceDetector {
  private readonly options: Required<ERPDetectorOptions>;

  constructor(options: ERPDetectorOptions = {}) {
    this.options = {
      minConfidence: options.minConfidence ?? 0.5,
      stubFormat: options.stubFormat ?? 'json-stub',
      includeOriginalProperties: options.includeOriginalProperties ?? true,
    };
  }

  /**
   * Detect ERP surface references in a validated intent.
   *
   * @param intent - The validated deployment intent to scan
   * @returns Detection result with all found references and generated slots
   */
  detect(intent: ValidatedIntent): ERPDetectionResult {
    const references: ERPSurfaceReference[] = [];
    const integrationSlots: IntegrationSlot[] = [];
    const timestamp = intent.createdAt;
    const intentHash = intent.checksum;

    // Scan all resources
    const resources = intent.spec.resources;
    for (let i = 0; i < resources.length; i++) {
      const resource = resources[i]!;
      const resourceRefs = this.detectResourceReferences(
        resource,
        i,
        intentHash,
        timestamp,
        intent.intentId,
        intent.version
      );
      references.push(...resourceRefs.references);
      integrationSlots.push(...resourceRefs.slots);
    }

    // Sort for determinism
    references.sort((a, b) => a.referenceId.localeCompare(b.referenceId, 'en'));
    integrationSlots.sort((a, b) => a.slotId.localeCompare(b.slotId, 'en'));

    // Generate summary
    const summary = this.generateSummary(references);

    return {
      hasERPReferences: references.length > 0,
      references,
      integrationSlots,
      summary,
    };
  }

  /**
   * Detect ERP references in a single resource.
   */
  private detectResourceReferences(
    resource: IntentResource,
    resourceIndex: number,
    intentHash: string,
    timestamp: string,
    intentId: string,
    intentVersion: SemanticVersion
  ): { references: ERPSurfaceReference[]; slots: IntegrationSlot[] } {
    const references: ERPSurfaceReference[] = [];
    const slots: IntegrationSlot[] = [];
    let refIndex = 0;

    // Check resource type
    const typeMatch = detectVendorFromType(resource.type);
    if (typeMatch && typeMatch.confidence >= this.options.minConfidence) {
      const reference = this.createReference(
        resource,
        resourceIndex,
        refIndex++,
        intentHash,
        typeMatch.vendor,
        typeMatch.integrationType,
        typeMatch.confidence
      );
      references.push(reference);
      slots.push(this.createIntegrationSlot(reference, timestamp, intentId, intentVersion, intentHash, `type:${resource.type}`));
    }

    // Check properties
    const propertyMatches = detectVendorFromProperties(resource.properties);
    for (const match of propertyMatches) {
      if (match.confidence >= this.options.minConfidence) {
        // Avoid duplicates by checking if we already have a higher confidence match for this vendor
        const existingRef = references.find(
          r => r.vendor === match.vendor && r.resourceName === resource.name
        );
        if (!existingRef || existingRef.confidence < match.confidence) {
          if (existingRef) {
            // Remove lower confidence duplicate
            const idx = references.indexOf(existingRef);
            references.splice(idx, 1);
            slots.splice(idx, 1);
          }
          const reference = this.createReference(
            resource,
            resourceIndex,
            refIndex++,
            intentHash,
            match.vendor,
            match.integrationType,
            match.confidence
          );
          references.push(reference);
          slots.push(this.createIntegrationSlot(reference, timestamp, intentId, intentVersion, intentHash, match.matchedPattern));
        }
      }
    }

    return { references, slots };
  }

  /**
   * Create an ERP surface reference.
   */
  private createReference(
    resource: IntentResource,
    resourceIndex: number,
    refIndex: number,
    intentHash: string,
    vendor: ERPVendor,
    integrationType: ERPIntegrationType,
    confidence: number
  ): ERPSurfaceReference {
    const properties = this.options.includeOriginalProperties
      ? resource.properties
      : {};

    const endpoint = this.extractEndpoint(resource.properties);
    const entityType = this.extractEntityType(resource.properties);
    const operation = this.extractOperation(resource.properties);

    // Build the base reference
    const baseReference = {
      referenceId: generateReferenceId(intentHash, resource.name, vendor, refIndex),
      vendor,
      integrationType,
      sourceType: resource.type,
      sourcePath: `$.spec.resources[${resourceIndex}]`,
      resourceName: resource.name,
      originalProperties: properties,
      confidence,
    };

    // Build optional properties object only with defined values
    const optionalProps: {
      endpoint?: string;
      entityType?: string;
      operation?: string;
    } = {};

    if (endpoint !== undefined) {
      optionalProps.endpoint = endpoint;
    }
    if (entityType !== undefined) {
      optionalProps.entityType = entityType;
    }
    if (operation !== undefined) {
      optionalProps.operation = operation;
    }

    return { ...baseReference, ...optionalProps } as ERPSurfaceReference;
  }

  /**
   * Create an integration slot for a reference.
   */
  private createIntegrationSlot(
    reference: ERPSurfaceReference,
    timestamp: string,
    intentId: string,
    intentVersion: SemanticVersion,
    intentHash: string,
    matchedPattern: string
  ): IntegrationSlot {
    const slotId = generateSlotId(reference.vendor, reference.resourceName, reference.referenceId);
    const stub = generateIntegrationStub(reference, this.options.stubFormat, timestamp);

    const auditInfo: IntegrationSlotAudit = {
      intentId,
      intentVersion,
      intentHash,
      detectedAt: timestamp,
      detectionMethod: matchedPattern.startsWith('type:') ? 'type-pattern' : 'property-pattern',
      matchedPattern,
    };

    const resolutionInstructions = this.generateResolutionInstructions(reference);

    return {
      slotId,
      reference,
      status: 'unresolved',
      stub,
      requiredAdapter: `${reference.vendor}-adapter`,
      configurationSchema: this.getConfigurationSchema(reference.vendor),
      resolutionInstructions,
      auditInfo,
    };
  }

  /**
   * Extract endpoint information from properties.
   */
  private extractEndpoint(properties: Readonly<Record<string, unknown>>): string | undefined {
    const endpointKeys = ['endpoint', 'host', 'url', 'baseUrl', 'apiUrl', 'sapHost', 'serverUrl'];
    for (const key of endpointKeys) {
      const value = this.findProperty(properties, key);
      if (typeof value === 'string') {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Extract entity type information from properties.
   */
  private extractEntityType(properties: Readonly<Record<string, unknown>>): string | undefined {
    const entityKeys = ['entityType', 'entity', 'objectType', 'bapiName', 'idocType', 'tableType'];
    for (const key of entityKeys) {
      const value = this.findProperty(properties, key);
      if (typeof value === 'string') {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Extract operation information from properties.
   */
  private extractOperation(properties: Readonly<Record<string, unknown>>): string | undefined {
    const operationKeys = ['operation', 'method', 'action', 'function', 'functionName'];
    for (const key of operationKeys) {
      const value = this.findProperty(properties, key);
      if (typeof value === 'string') {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Find a property value by key (case-insensitive).
   */
  private findProperty(properties: Readonly<Record<string, unknown>>, key: string): unknown {
    const lowerKey = key.toLowerCase();
    for (const [k, v] of Object.entries(properties)) {
      if (k.toLowerCase() === lowerKey) {
        return v;
      }
    }
    return undefined;
  }

  /**
   * Generate resolution instructions for a reference.
   */
  private generateResolutionInstructions(reference: ERPSurfaceReference): readonly string[] {
    const instructions: string[] = [
      `1. Install the ${reference.vendor} adapter package`,
      `2. Configure authentication credentials for ${reference.vendor}`,
      `3. Set the connection endpoint for ${reference.integrationType} integration`,
      `4. Validate connectivity before deployment`,
      `5. Update this integration slot status to 'configured'`,
    ];

    if (reference.vendor === 'sap') {
      instructions.push(
        '6. Ensure SAP JCo libraries are available (for RFC/BAPI)',
        '7. Configure SAP system ID and client number'
      );
    }

    return instructions;
  }

  /**
   * Get configuration schema for a vendor.
   */
  private getConfigurationSchema(vendor: ERPVendor): Record<string, unknown> {
    const baseSchema = {
      type: 'object',
      required: ['endpoint', 'authentication'],
      properties: {
        endpoint: { type: 'string', description: 'ERP system endpoint URL' },
        authentication: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['basic', 'oauth2', 'certificate', 'api-key'] },
          },
        },
        timeout: { type: 'number', default: 30000 },
        retryPolicy: {
          type: 'object',
          properties: {
            maxRetries: { type: 'number', default: 3 },
            backoffMs: { type: 'number', default: 1000 },
          },
        },
      },
    };

    if (vendor === 'sap') {
      return {
        ...baseSchema,
        properties: {
          ...baseSchema.properties,
          systemId: { type: 'string', description: 'SAP System ID' },
          client: { type: 'string', description: 'SAP Client number' },
          language: { type: 'string', default: 'EN' },
        },
      };
    }

    return baseSchema;
  }

  /**
   * Generate detection summary.
   */
  private generateSummary(references: readonly ERPSurfaceReference[]): ERPDetectionSummary {
    const byVendor: Record<ERPVendor, number> = {} as Record<ERPVendor, number>;
    const byIntegrationType: Record<ERPIntegrationType, number> = {} as Record<ERPIntegrationType, number>;

    for (const ref of references) {
      byVendor[ref.vendor] = (byVendor[ref.vendor] ?? 0) + 1;
      byIntegrationType[ref.integrationType] = (byIntegrationType[ref.integrationType] ?? 0) + 1;
    }

    return {
      totalReferences: references.length,
      byVendor,
      byIntegrationType,
      unresolvedCount: references.length, // All are unresolved by default
      highConfidenceCount: references.filter(r => r.confidence >= 0.9).length,
    };
  }
}

/**
 * Factory function to create an ERP Surface Detector.
 */
export function createERPSurfaceDetector(options?: ERPDetectorOptions): ERPSurfaceDetector {
  return new ERPSurfaceDetector(options);
}
