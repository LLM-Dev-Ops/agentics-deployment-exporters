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
export { type ExporterId, type SerializerId, type SignerId, type SemanticVersion, type ParsedSemanticVersion, SemanticVersionSchema, parseSemanticVersion, ExportFormatValues, type ExportFormat, ExportFormatSchema, SerializerTypeValues, type SerializerType, SerializerTypeSchema, SigningAlgorithmValues, type SigningAlgorithm, SigningAlgorithmSchema, IntentSectionValues, type IntentSection, IntentSectionSchema, CloudProviderValues, type CloudProvider, CloudProviderSchema, ContentEncodingValues, type ContentEncoding, ContentEncodingSchema, type ExportArtifact, ExportArtifactSchema, type ExportOptions, ExportOptionsSchema, ValidationSeverityValues, type ValidationSeverity, type ValidationError as ValidationErrorType, type ValidationWarning, type ValidationResult, ValidationErrorSchema, ValidationWarningSchema, ValidationResultSchema, IntentFormatValues, type IntentFormat, type SourceLocation, type SourceMap, type ParsedIntent, type ValidatedIntent, type ValidatedIntentSpec, type IntentTarget, type IntentResource, type IntentProvenance, type AuditEntry, type NormalizedIntent, type NormalizationMetadata, ErrorStageValues, type ErrorStage, ErrorStageSchema, ErrorCodeRanges, type ErrorCodeRange, ValidationErrorCodes, SchemaErrorCodes, TransformErrorCodes, SerializationErrorCodes, IntegrityErrorCodes, type SerializerOptions, SerializerOptionsSchema, UUID_NAMESPACE_AGENTICS, generateDeterministicUUID, deepFreeze, isExportFormat, isSerializerType, isSigningAlgorithm, isIntentSection, isCloudProvider, isErrorStage, } from './types.js';
export type { IExporter, ISerializer, ISigner, IIntentLoader, IIntentValidator, IIntentNormalizer, IExportOrchestrator, IArtifactPackager, IChecksumCalculator, IResourceMapper, IDependencyResolver, IExporterRegistry, ISerializerRegistry, FormatOptions, SignOptions, SignatureResult, VerifyOptions, VerificationResult, ValidationRuleResult, ValidationRule, ValidationOptions, IntentValidationResult, OrchestrationOptions, ExportMetadata, ExportError, ExportWarning, ExportResult, ExporterPlanItem, ExecutionPlan, ProgressEventType, ProgressEvent, ProgressHandler, ManifestFile, PackageManifest, ArtifactPackage, MappingContext, MappedResource, ResolvedDependencies, } from './interfaces.js';
export { type ErrorSourceLocation, type ErrorContext, type ErrorRemediation, BaseExportError, ValidationError, MissingRequiredFieldError, InvalidTypeError, ValueOutOfRangeError, PatternMismatchError, ArrayLengthViolationError, InvalidReferenceError, ConstraintViolationError, SemanticValidationError, SchemaError, UnsupportedVersionError, VersionTooOldError, VersionTooNewError, UnknownKindError, SchemaMismatchError, TransformError, TemplateRenderError, ResourceMappingError, ComputationOverflowError, CircularDependencyError, UnsupportedFeatureError, ResourceConflictError, SerializationError, OutputSyntaxError, EncodingError, SizeLimitExceededError, InvalidUtf8Error, FormatError, IntegrityError, ChecksumMismatchError, SignatureVerificationError, HashComputationError, ManifestInconsistencyError, ParseError, PackagingError, ErrorCategories, type ErrorCategory, getErrorCategory, isErrorInCategory, isExportError, isRecoverableError, extractErrorDetails, } from './errors.js';
//# sourceMappingURL=index.d.ts.map