/**
 * Core Module - Agentics Deployment Exporters
 *
 * This module provides the core type definitions, interfaces, and error
 * handling for the Agentics Deployment Exporters system.
 *
 * The module is organized into:
 * - **Types**: Core type definitions and Zod schemas
 * - **Interfaces**: Interface contracts for exporters, serializers, etc.
 * - **Errors**: Error hierarchy with categorized error codes
 *
 * All types and functions are designed for:
 * - Deterministic behavior (same input = same output)
 * - Immutability (no side effects)
 * - Type safety (branded types, strict validation)
 *
 * @example
 * ```typescript
 * import {
 *   // Types
 *   ExportFormat,
 *   SemanticVersion,
 *   ParsedIntent,
 *   ValidatedIntent,
 *   NormalizedIntent,
 *   ExportArtifact,
 *   ValidationResult,
 *
 *   // Interfaces
 *   IExporter,
 *   ISerializer,
 *   ISigner,
 *   IIntentLoader,
 *   IIntentValidator,
 *   IExportOrchestrator,
 *
 *   // Errors
 *   BaseExportError,
 *   ValidationError,
 *   TransformError,
 *   isExportError,
 *
 *   // Utilities
 *   generateDeterministicUUID,
 *   parseSemanticVersion,
 * } from '@agentics/deployment-exporters/core';
 *
 * // Load and validate an intent
 * const loader: IIntentLoader = ...;
 * const parsed = await loader.loadFromFile('/path/to/intent.yaml');
 *
 * // Export to multiple formats
 * const orchestrator: IExportOrchestrator = ...;
 * const result = await orchestrator.execute(validatedIntent, {
 *   formats: ['terraform', 'kubernetes'],
 * });
 * ```
 *
 * @module core
 * @version 1.0.0
 */
// =============================================================================
// CORE TYPES
// =============================================================================
export { SemanticVersionSchema, parseSemanticVersion, 
// Export format
ExportFormatValues, ExportFormatSchema, 
// Serializer type
SerializerTypeValues, SerializerTypeSchema, 
// Signing algorithm
SigningAlgorithmValues, SigningAlgorithmSchema, 
// Intent section
IntentSectionValues, IntentSectionSchema, 
// Cloud provider
CloudProviderValues, CloudProviderSchema, 
// Content encoding
ContentEncodingValues, ContentEncodingSchema, ExportArtifactSchema, ExportOptionsSchema, 
// Validation
ValidationSeverityValues, ValidationErrorSchema, ValidationWarningSchema, ValidationResultSchema, 
// Intent types
IntentFormatValues, 
// Error stage
ErrorStageValues, ErrorStageSchema, 
// Error codes
ErrorCodeRanges, ValidationErrorCodes, SchemaErrorCodes, TransformErrorCodes, SerializationErrorCodes, IntegrityErrorCodes, SerializerOptionsSchema, 
// Deterministic utilities
UUID_NAMESPACE_AGENTICS, generateDeterministicUUID, deepFreeze, 
// Type guards
isExportFormat, isSerializerType, isSigningAlgorithm, isIntentSection, isCloudProvider, isErrorStage, } from './types.js';
// =============================================================================
// ERRORS
// =============================================================================
export { 
// Base error
BaseExportError, 
// Validation errors (V1xxx)
ValidationError, MissingRequiredFieldError, InvalidTypeError, ValueOutOfRangeError, PatternMismatchError, ArrayLengthViolationError, InvalidReferenceError, ConstraintViolationError, SemanticValidationError, 
// Schema errors (S2xxx)
SchemaError, UnsupportedVersionError, VersionTooOldError, VersionTooNewError, UnknownKindError, SchemaMismatchError, 
// Transform errors (T3xxx)
TransformError, TemplateRenderError, ResourceMappingError, ComputationOverflowError, CircularDependencyError, UnsupportedFeatureError, ResourceConflictError, 
// Serialization errors (E4xxx)
SerializationError, OutputSyntaxError, EncodingError, SizeLimitExceededError, InvalidUtf8Error, FormatError, 
// Integrity errors (I5xxx)
IntegrityError, ChecksumMismatchError, SignatureVerificationError, HashComputationError, ManifestInconsistencyError, 
// Other errors
ParseError, PackagingError, 
// Error utilities
ErrorCategories, getErrorCategory, isErrorInCategory, isExportError, isRecoverableError, extractErrorDetails, } from './errors.js';
// =============================================================================
// ERP SURFACE DETECTION
// =============================================================================
export { 
// ERP Vendor types
ERPVendorValues, ERPVendorSchema, isERPVendor, 
// Integration types
ERPIntegrationTypeValues, ERPIntegrationTypeSchema, isERPIntegrationType, ERPSurfaceReferenceSchema, 
// Integration slot
IntegrationSlotStatusValues, IntegrationSlotStatusSchema, isIntegrationSlotStatus, IntegrationSlotSchema, 
// Stub types
StubOutputFormatValues, StubOutputFormatSchema, IntegrationStubSchema, IntegrationMarkerSchema, IntegrationSlotAuditSchema, ERPDetectionResultSchema, 
// Detector
ERPSurfaceDetector, createERPSurfaceDetector, 
// Stub generator
ERPStubGenerator, createERPStubGenerator, generateStubHeader, } from './erp/index.js';
//# sourceMappingURL=index.js.map