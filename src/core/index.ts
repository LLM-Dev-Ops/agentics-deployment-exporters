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

export {
  // Branded types
  type ExporterId,
  type SerializerId,
  type SignerId,

  // Semantic version
  type SemanticVersion,
  type ParsedSemanticVersion,
  SemanticVersionSchema,
  parseSemanticVersion,

  // Export format
  ExportFormatValues,
  type ExportFormat,
  ExportFormatSchema,

  // Serializer type
  SerializerTypeValues,
  type SerializerType,
  SerializerTypeSchema,

  // Signing algorithm
  SigningAlgorithmValues,
  type SigningAlgorithm,
  SigningAlgorithmSchema,

  // Intent section
  IntentSectionValues,
  type IntentSection,
  IntentSectionSchema,

  // Cloud provider
  CloudProviderValues,
  type CloudProvider,
  CloudProviderSchema,

  // Content encoding
  ContentEncodingValues,
  type ContentEncoding,
  ContentEncodingSchema,

  // Export artifact
  type ExportArtifact,
  ExportArtifactSchema,

  // Export options
  type ExportOptions,
  ExportOptionsSchema,

  // Validation
  ValidationSeverityValues,
  type ValidationSeverity,
  type ValidationError as ValidationErrorType,
  type ValidationWarning,
  type ValidationResult,
  ValidationErrorSchema,
  ValidationWarningSchema,
  ValidationResultSchema,

  // Intent types
  IntentFormatValues,
  type IntentFormat,
  type SourceLocation,
  type SourceMap,
  type ParsedIntent,
  type ValidatedIntent,
  type ValidatedIntentSpec,
  type IntentTarget,
  type IntentResource,
  type IntentProvenance,
  type AuditEntry,
  type NormalizedIntent,
  type NormalizationMetadata,

  // Error stage
  ErrorStageValues,
  type ErrorStage,
  ErrorStageSchema,

  // Error codes
  ErrorCodeRanges,
  type ErrorCodeRange,
  ValidationErrorCodes,
  SchemaErrorCodes,
  TransformErrorCodes,
  SerializationErrorCodes,
  IntegrityErrorCodes,

  // Serializer options
  type SerializerOptions,
  SerializerOptionsSchema,

  // Deterministic utilities
  UUID_NAMESPACE_AGENTICS,
  generateDeterministicUUID,
  deepFreeze,

  // Type guards
  isExportFormat,
  isSerializerType,
  isSigningAlgorithm,
  isIntentSection,
  isCloudProvider,
  isErrorStage,
} from './types.js';

// =============================================================================
// INTERFACES
// =============================================================================

export type {
  // Core interfaces
  IExporter,
  ISerializer,
  ISigner,
  IIntentLoader,
  IIntentValidator,
  IIntentNormalizer,
  IExportOrchestrator,

  // Packager interfaces
  IArtifactPackager,
  IChecksumCalculator,

  // Mapper interfaces
  IResourceMapper,
  IDependencyResolver,

  // Registry interfaces
  IExporterRegistry,
  ISerializerRegistry,

  // Supporting types from interfaces
  FormatOptions,
  SignOptions,
  SignatureResult,
  VerifyOptions,
  VerificationResult,
  ValidationRuleResult,
  ValidationRule,
  ValidationOptions,
  IntentValidationResult,
  OrchestrationOptions,
  ExportMetadata,
  ExportError,
  ExportWarning,
  ExportResult,
  ExporterPlanItem,
  ExecutionPlan,
  ProgressEventType,
  ProgressEvent,
  ProgressHandler,
  ManifestFile,
  PackageManifest,
  ArtifactPackage,
  MappingContext,
  MappedResource,
  ResolvedDependencies,
} from './interfaces.js';

// =============================================================================
// ERRORS
// =============================================================================

export {
  // Error context types
  type ErrorSourceLocation,
  type ErrorContext,
  type ErrorRemediation,

  // Base error
  BaseExportError,

  // Validation errors (V1xxx)
  ValidationError,
  MissingRequiredFieldError,
  InvalidTypeError,
  ValueOutOfRangeError,
  PatternMismatchError,
  ArrayLengthViolationError,
  InvalidReferenceError,
  ConstraintViolationError,
  SemanticValidationError,

  // Schema errors (S2xxx)
  SchemaError,
  UnsupportedVersionError,
  VersionTooOldError,
  VersionTooNewError,
  UnknownKindError,
  SchemaMismatchError,

  // Transform errors (T3xxx)
  TransformError,
  TemplateRenderError,
  ResourceMappingError,
  ComputationOverflowError,
  CircularDependencyError,
  UnsupportedFeatureError,
  ResourceConflictError,

  // Serialization errors (E4xxx)
  SerializationError,
  OutputSyntaxError,
  EncodingError,
  SizeLimitExceededError,
  InvalidUtf8Error,
  FormatError,

  // Integrity errors (I5xxx)
  IntegrityError,
  ChecksumMismatchError,
  SignatureVerificationError,
  HashComputationError,
  ManifestInconsistencyError,

  // Other errors
  ParseError,
  PackagingError,

  // Error utilities
  ErrorCategories,
  type ErrorCategory,
  getErrorCategory,
  isErrorInCategory,
  isExportError,
  isRecoverableError,
  extractErrorDetails,
} from './errors.js';

// =============================================================================
// ERP SURFACE DETECTION
// =============================================================================

export {
  // ERP Vendor types
  ERPVendorValues,
  type ERPVendor,
  ERPVendorSchema,
  isERPVendor,

  // Integration types
  ERPIntegrationTypeValues,
  type ERPIntegrationType,
  ERPIntegrationTypeSchema,
  isERPIntegrationType,

  // Surface reference
  type ERPSurfaceReference,
  ERPSurfaceReferenceSchema,

  // Integration slot
  IntegrationSlotStatusValues,
  type IntegrationSlotStatus,
  IntegrationSlotStatusSchema,
  isIntegrationSlotStatus,
  type IntegrationSlot,
  IntegrationSlotSchema,

  // Stub types
  StubOutputFormatValues,
  type StubOutputFormat,
  StubOutputFormatSchema,
  type IntegrationStub,
  IntegrationStubSchema,

  // Marker
  type IntegrationMarker,
  IntegrationMarkerSchema,

  // Audit
  type IntegrationSlotAudit,
  IntegrationSlotAuditSchema,

  // Detection result
  type ERPDetectionResult,
  type ERPDetectionSummary,
  ERPDetectionResultSchema,

  // Detector
  ERPSurfaceDetector,
  createERPSurfaceDetector,
  type ERPDetectorOptions,

  // Stub generator
  ERPStubGenerator,
  createERPStubGenerator,
  generateStubHeader,
  type StubArtifactOptions,
  type StubArtifactResult,
} from './erp/index.js';
