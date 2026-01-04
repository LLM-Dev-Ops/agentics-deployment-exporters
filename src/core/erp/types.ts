/**
 * ERP Surface Reference Types
 *
 * Type definitions for ERP (Enterprise Resource Planning) surface detection
 * and integration slot generation. These types enable the exporter to recognize
 * ERP dependencies without implementing actual ERP adapters.
 *
 * The goal is convertibility proof - demonstrating that deployment intents
 * can identify ERP integration points and emit placeholder stubs that clearly
 * mark where future ERP adapters would be needed.
 *
 * @module core/erp/types
 * @version 1.0.0
 */

import { z } from 'zod';

// =============================================================================
// ERP VENDOR TYPES
// =============================================================================

/**
 * Known ERP vendor identifiers.
 * These are used to classify detected ERP references.
 */
export const ERPVendorValues = [
  'sap',
  'oracle-erp',
  'oracle-netsuite',
  'microsoft-dynamics',
  'salesforce',
  'workday',
  'infor',
  'sage',
  'epicor',
  'ifs',
  'generic-erp',
] as const;

export type ERPVendor = (typeof ERPVendorValues)[number];

export const ERPVendorSchema = z.enum(ERPVendorValues);

// =============================================================================
// ERP INTEGRATION TYPES
// =============================================================================

/**
 * Types of ERP integration patterns.
 */
export const ERPIntegrationTypeValues = [
  'api',          // REST/SOAP API call
  'rfc',          // SAP RFC call
  'bapi',         // SAP BAPI call
  'idoc',         // SAP IDoc message
  'odata',        // OData service endpoint
  'jdbc',         // Database connection
  'file-exchange', // File-based integration
  'message-queue', // Message queue integration
  'webhook',      // Webhook callback
  'event',        // Event-driven integration
  'unknown',      // Unrecognized pattern
] as const;

export type ERPIntegrationType = (typeof ERPIntegrationTypeValues)[number];

export const ERPIntegrationTypeSchema = z.enum(ERPIntegrationTypeValues);

// =============================================================================
// ERP SURFACE REFERENCE
// =============================================================================

/**
 * Represents a detected ERP surface reference within a deployment intent.
 * This captures the metadata needed to generate appropriate placeholder stubs.
 */
export interface ERPSurfaceReference {
  /**
   * Unique identifier for this reference within the intent.
   * Generated deterministically from the reference path.
   */
  readonly referenceId: string;

  /**
   * The detected ERP vendor.
   */
  readonly vendor: ERPVendor;

  /**
   * The type of integration pattern detected.
   */
  readonly integrationType: ERPIntegrationType;

  /**
   * The resource type string that triggered detection.
   */
  readonly sourceType: string;

  /**
   * Path to the resource within the intent (e.g., "$.spec.resources[0]").
   */
  readonly sourcePath: string;

  /**
   * Name of the resource containing this reference.
   */
  readonly resourceName: string;

  /**
   * Original properties associated with this ERP reference.
   * These are preserved for audit purposes.
   */
  readonly originalProperties: Readonly<Record<string, unknown>>;

  /**
   * Detected endpoint or connection information (if available).
   */
  readonly endpoint?: string;

  /**
   * Detected entity or object type (if available).
   */
  readonly entityType?: string;

  /**
   * Detected operation or method (if available).
   */
  readonly operation?: string;

  /**
   * Confidence score for this detection (0.0 - 1.0).
   * Higher scores indicate more certain matches.
   */
  readonly confidence: number;
}

export const ERPSurfaceReferenceSchema = z.object({
  referenceId: z.string(),
  vendor: ERPVendorSchema,
  integrationType: ERPIntegrationTypeSchema,
  sourceType: z.string(),
  sourcePath: z.string(),
  resourceName: z.string(),
  originalProperties: z.record(z.unknown()),
  endpoint: z.string().optional(),
  entityType: z.string().optional(),
  operation: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

// =============================================================================
// INTEGRATION SLOT
// =============================================================================

/**
 * Status of an integration slot.
 */
export const IntegrationSlotStatusValues = [
  'unresolved',   // No adapter configured
  'placeholder',  // Placeholder stub generated
  'configured',   // Adapter configuration present (but not validated)
  'validated',    // Adapter validated (would require runtime)
] as const;

export type IntegrationSlotStatus = (typeof IntegrationSlotStatusValues)[number];

export const IntegrationSlotStatusSchema = z.enum(IntegrationSlotStatusValues);

/**
 * Represents an integration slot - a placeholder for an unresolved ERP dependency.
 * These slots are deterministic markers that indicate where future integration
 * adapters would need to be configured.
 */
export interface IntegrationSlot {
  /**
   * Unique, deterministic identifier for this slot.
   * Format: "erp-slot:<vendor>:<resource-name>:<hash>"
   */
  readonly slotId: string;

  /**
   * The ERP surface reference that created this slot.
   */
  readonly reference: ERPSurfaceReference;

  /**
   * Current status of this slot.
   */
  readonly status: IntegrationSlotStatus;

  /**
   * Placeholder stub content to be emitted.
   * This is the actual content that will appear in exports.
   */
  readonly stub: IntegrationStub;

  /**
   * Required adapter type for resolution.
   */
  readonly requiredAdapter: string;

  /**
   * Configuration schema for the required adapter (JSON Schema).
   */
  readonly configurationSchema?: Readonly<Record<string, unknown>>;

  /**
   * Human-readable resolution instructions.
   */
  readonly resolutionInstructions: readonly string[];

  /**
   * Audit trail for this slot.
   */
  readonly auditInfo: IntegrationSlotAudit;
}

export const IntegrationSlotSchema = z.object({
  slotId: z.string(),
  reference: ERPSurfaceReferenceSchema,
  status: IntegrationSlotStatusSchema,
  stub: z.lazy(() => IntegrationStubSchema),
  requiredAdapter: z.string(),
  configurationSchema: z.record(z.unknown()).optional(),
  resolutionInstructions: z.array(z.string()),
  auditInfo: z.lazy(() => IntegrationSlotAuditSchema),
});

// =============================================================================
// INTEGRATION STUB
// =============================================================================

/**
 * Output format for the stub content.
 */
export const StubOutputFormatValues = [
  'terraform-null',      // Terraform null_resource with ERP metadata
  'terraform-local',     // Terraform local-exec with placeholder
  'kubernetes-configmap', // K8s ConfigMap with integration config
  'kubernetes-secret',   // K8s Secret placeholder
  'cloudformation-custom', // CFN custom resource placeholder
  'helm-values',         // Helm values placeholder
  'env-file',            // Environment variable placeholder
  'json-stub',           // Generic JSON stub
  'yaml-stub',           // Generic YAML stub
] as const;

export type StubOutputFormat = (typeof StubOutputFormatValues)[number];

export const StubOutputFormatSchema = z.enum(StubOutputFormatValues);

/**
 * Represents the placeholder stub content for an unresolved ERP dependency.
 * Stubs are deterministic, auditable, and clearly marked as integration points.
 */
export interface IntegrationStub {
  /**
   * Output format for this stub.
   */
  readonly format: StubOutputFormat;

  /**
   * The structured content of the stub.
   */
  readonly content: Readonly<Record<string, unknown>>;

  /**
   * Canonical hash of the stub content for verification.
   */
  readonly contentHash: string;

  /**
   * Comments to include in the generated output.
   */
  readonly comments: readonly string[];

  /**
   * Marker indicating this is an unresolved integration point.
   */
  readonly marker: IntegrationMarker;
}

export const IntegrationStubSchema = z.object({
  format: StubOutputFormatSchema,
  content: z.record(z.unknown()),
  contentHash: z.string(),
  comments: z.array(z.string()),
  marker: z.lazy(() => IntegrationMarkerSchema),
});

// =============================================================================
// INTEGRATION MARKER
// =============================================================================

/**
 * A standard marker embedded in stubs to clearly identify integration points.
 * This provides a consistent, searchable pattern across all export formats.
 */
export interface IntegrationMarker {
  /**
   * Marker prefix (always "AGENTICS_ERP_INTEGRATION").
   */
  readonly prefix: 'AGENTICS_ERP_INTEGRATION';

  /**
   * Unique slot identifier.
   */
  readonly slotId: string;

  /**
   * ERP vendor.
   */
  readonly vendor: ERPVendor;

  /**
   * Integration type.
   */
  readonly integrationType: ERPIntegrationType;

  /**
   * Resolution status.
   */
  readonly status: IntegrationSlotStatus;

  /**
   * Timestamp of marker creation (from intent metadata for determinism).
   */
  readonly createdAt: string;

  /**
   * Version of the marker format.
   */
  readonly markerVersion: '1.0.0';
}

export const IntegrationMarkerSchema = z.object({
  prefix: z.literal('AGENTICS_ERP_INTEGRATION'),
  slotId: z.string(),
  vendor: ERPVendorSchema,
  integrationType: ERPIntegrationTypeSchema,
  status: IntegrationSlotStatusSchema,
  createdAt: z.string(),
  markerVersion: z.literal('1.0.0'),
});

// =============================================================================
// AUDIT INFORMATION
// =============================================================================

/**
 * Audit information for integration slot tracking.
 */
export interface IntegrationSlotAudit {
  /**
   * Intent ID that generated this slot.
   */
  readonly intentId: string;

  /**
   * Intent version.
   */
  readonly intentVersion: string;

  /**
   * Canonical hash of the intent.
   */
  readonly intentHash: string;

  /**
   * Detection timestamp (from intent metadata for determinism).
   */
  readonly detectedAt: string;

  /**
   * Detection method used.
   */
  readonly detectionMethod: 'type-pattern' | 'property-pattern' | 'reference-pattern';

  /**
   * Pattern that matched.
   */
  readonly matchedPattern: string;
}

export const IntegrationSlotAuditSchema = z.object({
  intentId: z.string(),
  intentVersion: z.string(),
  intentHash: z.string(),
  detectedAt: z.string(),
  detectionMethod: z.enum(['type-pattern', 'property-pattern', 'reference-pattern']),
  matchedPattern: z.string(),
});

// =============================================================================
// DETECTION RESULT
// =============================================================================

/**
 * Result of ERP surface detection on an intent.
 */
export interface ERPDetectionResult {
  /**
   * Whether any ERP surfaces were detected.
   */
  readonly hasERPReferences: boolean;

  /**
   * All detected ERP surface references.
   */
  readonly references: readonly ERPSurfaceReference[];

  /**
   * Generated integration slots for unresolved references.
   */
  readonly integrationSlots: readonly IntegrationSlot[];

  /**
   * Summary statistics.
   */
  readonly summary: ERPDetectionSummary;
}

export interface ERPDetectionSummary {
  readonly totalReferences: number;
  readonly byVendor: Readonly<Record<ERPVendor, number>>;
  readonly byIntegrationType: Readonly<Record<ERPIntegrationType, number>>;
  readonly unresolvedCount: number;
  readonly highConfidenceCount: number;
}

export const ERPDetectionResultSchema = z.object({
  hasERPReferences: z.boolean(),
  references: z.array(ERPSurfaceReferenceSchema),
  integrationSlots: z.array(IntegrationSlotSchema),
  summary: z.object({
    totalReferences: z.number(),
    byVendor: z.record(z.number()),
    byIntegrationType: z.record(z.number()),
    unresolvedCount: z.number(),
    highConfidenceCount: z.number(),
  }),
});

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for ERPVendor.
 */
export function isERPVendor(value: unknown): value is ERPVendor {
  return typeof value === 'string' && ERPVendorValues.includes(value as ERPVendor);
}

/**
 * Type guard for ERPIntegrationType.
 */
export function isERPIntegrationType(value: unknown): value is ERPIntegrationType {
  return typeof value === 'string' && ERPIntegrationTypeValues.includes(value as ERPIntegrationType);
}

/**
 * Type guard for IntegrationSlotStatus.
 */
export function isIntegrationSlotStatus(value: unknown): value is IntegrationSlotStatus {
  return typeof value === 'string' && IntegrationSlotStatusValues.includes(value as IntegrationSlotStatus);
}
