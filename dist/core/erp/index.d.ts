/**
 * ERP Surface Detection Module
 *
 * This module provides functionality for detecting ERP (Enterprise Resource
 * Planning) surface references within deployment intents and generating
 * appropriate placeholder stubs for unresolved dependencies.
 *
 * Key capabilities:
 * - Detect ERP vendor references (SAP, Oracle, Dynamics, etc.)
 * - Identify integration patterns (RFC, BAPI, OData, API, etc.)
 * - Generate deterministic placeholder stubs
 * - Create auditable integration slots
 *
 * The module does NOT implement actual ERP adapters or connectors.
 * It proves convertibility by identifying integration points and marking
 * them clearly for future resolution.
 *
 * @module core/erp
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * import { createERPSurfaceDetector, type ERPDetectionResult } from './core/erp';
 *
 * const detector = createERPSurfaceDetector({ minConfidence: 0.7 });
 * const result = detector.detect(validatedIntent);
 *
 * if (result.hasERPReferences) {
 *   console.log(`Found ${result.summary.totalReferences} ERP references`);
 *   for (const slot of result.integrationSlots) {
 *     console.log(`Slot: ${slot.slotId} - ${slot.reference.vendor}`);
 *   }
 * }
 * ```
 */
export { ERPVendorValues, type ERPVendor, ERPVendorSchema, isERPVendor, ERPIntegrationTypeValues, type ERPIntegrationType, ERPIntegrationTypeSchema, isERPIntegrationType, type ERPSurfaceReference, ERPSurfaceReferenceSchema, IntegrationSlotStatusValues, type IntegrationSlotStatus, IntegrationSlotStatusSchema, isIntegrationSlotStatus, type IntegrationSlot, IntegrationSlotSchema, StubOutputFormatValues, type StubOutputFormat, StubOutputFormatSchema, type IntegrationStub, IntegrationStubSchema, type IntegrationMarker, IntegrationMarkerSchema, type IntegrationSlotAudit, IntegrationSlotAuditSchema, type ERPDetectionResult, type ERPDetectionSummary, ERPDetectionResultSchema, } from './types.js';
export { ERPSurfaceDetector, createERPSurfaceDetector, type ERPDetectorOptions, } from './detector.js';
export { ERPStubGenerator, createERPStubGenerator, generateStubHeader, type StubArtifactOptions, type StubArtifactResult, } from './stub-generator.js';
//# sourceMappingURL=index.d.ts.map