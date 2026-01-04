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
];
export const ERPVendorSchema = z.enum(ERPVendorValues);
// =============================================================================
// ERP INTEGRATION TYPES
// =============================================================================
/**
 * Types of ERP integration patterns.
 */
export const ERPIntegrationTypeValues = [
    'api', // REST/SOAP API call
    'rfc', // SAP RFC call
    'bapi', // SAP BAPI call
    'idoc', // SAP IDoc message
    'odata', // OData service endpoint
    'jdbc', // Database connection
    'file-exchange', // File-based integration
    'message-queue', // Message queue integration
    'webhook', // Webhook callback
    'event', // Event-driven integration
    'unknown', // Unrecognized pattern
];
export const ERPIntegrationTypeSchema = z.enum(ERPIntegrationTypeValues);
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
    'unresolved', // No adapter configured
    'placeholder', // Placeholder stub generated
    'configured', // Adapter configuration present (but not validated)
    'validated', // Adapter validated (would require runtime)
];
export const IntegrationSlotStatusSchema = z.enum(IntegrationSlotStatusValues);
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
    'terraform-null', // Terraform null_resource with ERP metadata
    'terraform-local', // Terraform local-exec with placeholder
    'kubernetes-configmap', // K8s ConfigMap with integration config
    'kubernetes-secret', // K8s Secret placeholder
    'cloudformation-custom', // CFN custom resource placeholder
    'helm-values', // Helm values placeholder
    'env-file', // Environment variable placeholder
    'json-stub', // Generic JSON stub
    'yaml-stub', // Generic YAML stub
];
export const StubOutputFormatSchema = z.enum(StubOutputFormatValues);
export const IntegrationStubSchema = z.object({
    format: StubOutputFormatSchema,
    content: z.record(z.unknown()),
    contentHash: z.string(),
    comments: z.array(z.string()),
    marker: z.lazy(() => IntegrationMarkerSchema),
});
export const IntegrationMarkerSchema = z.object({
    prefix: z.literal('AGENTICS_ERP_INTEGRATION'),
    slotId: z.string(),
    vendor: ERPVendorSchema,
    integrationType: ERPIntegrationTypeSchema,
    status: IntegrationSlotStatusSchema,
    createdAt: z.string(),
    markerVersion: z.literal('1.0.0'),
});
export const IntegrationSlotAuditSchema = z.object({
    intentId: z.string(),
    intentVersion: z.string(),
    intentHash: z.string(),
    detectedAt: z.string(),
    detectionMethod: z.enum(['type-pattern', 'property-pattern', 'reference-pattern']),
    matchedPattern: z.string(),
});
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
export function isERPVendor(value) {
    return typeof value === 'string' && ERPVendorValues.includes(value);
}
/**
 * Type guard for ERPIntegrationType.
 */
export function isERPIntegrationType(value) {
    return typeof value === 'string' && ERPIntegrationTypeValues.includes(value);
}
/**
 * Type guard for IntegrationSlotStatus.
 */
export function isIntegrationSlotStatus(value) {
    return typeof value === 'string' && IntegrationSlotStatusValues.includes(value);
}
//# sourceMappingURL=types.js.map