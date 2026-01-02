/**
 * Core Interface Contracts for Agentics Deployment Exporters
 *
 * This module defines all interface contracts that components must implement.
 * These interfaces ensure consistent behavior across all exporters, serializers,
 * signers, and orchestration components.
 *
 * All interfaces are designed for:
 * - Deterministic behavior (same input = same output)
 * - Immutability (no side effects)
 * - Testability (pure functions)
 *
 * @module core/interfaces
 * @version 1.0.0
 */

import type { Readable } from 'stream';
import type {
  ExportArtifact,
  ExporterId,
  ExportFormat,
  ExportOptions,
  IntentFormat,
  IntentResource,
  NormalizedIntent,
  ParsedIntent,
  SemanticVersion,
  SerializerId,
  SerializerOptions,
  SerializerType,
  SignerId,
  SigningAlgorithm,
  ValidatedIntent,
  ValidationResult,
  ValidationSeverity,
} from './types.js';

// =============================================================================
// EXPORTER INTERFACE
// =============================================================================

/**
 * Core exporter interface.
 *
 * Exporters transform validated DeploymentIntent artifacts into specific
 * infrastructure-as-code formats. All exporters must be:
 *
 * - **Deterministic**: Same input always produces identical output
 * - **Pure**: No side effects, no network calls, no file system access
 * - **Stateless**: No internal state between invocations
 *
 * @example
 * ```typescript
 * class TerraformExporter implements IExporter {
 *   readonly id = 'terraform' as ExporterId;
 *   readonly name = 'Terraform HCL Exporter';
 *   readonly version = '1.0.0' as SemanticVersion;
 *   readonly targetFormat = 'terraform';
 *
 *   transform(intent: NormalizedIntent, options?: ExportOptions): ExportArtifact[] {
 *     // Pure transformation logic
 *     return artifacts;
 *   }
 * }
 * ```
 */
export interface IExporter {
  /**
   * Unique identifier for this exporter.
   * Must be stable across versions.
   */
  readonly id: ExporterId;

  /**
   * Human-readable name.
   */
  readonly name: string;

  /**
   * Exporter version following semantic versioning.
   */
  readonly version: SemanticVersion;

  /**
   * Target export format this exporter produces.
   */
  readonly targetFormat: ExportFormat;

  /**
   * Transform a normalized intent into export artifacts.
   *
   * This is the core transformation function. It must be:
   * - Pure (no side effects)
   * - Deterministic (same input = same output)
   * - Complete (produces all artifacts for the format)
   *
   * @param intent - Normalized, validated DeploymentIntent
   * @param options - Optional export configuration
   * @returns Array of export artifacts
   * @throws TransformError if transformation fails
   */
  transform(
    intent: NormalizedIntent,
    options?: ExportOptions
  ): readonly ExportArtifact[];

  /**
   * Validate that an intent can be exported by this exporter.
   *
   * This performs exporter-specific validation beyond the general
   * intent validation. For example, checking that all resource types
   * are supported by the target format.
   *
   * @param intent - Intent to validate
   * @returns Validation result with errors/warnings
   */
  validate(intent: ValidatedIntent): ValidationResult;

  /**
   * Check if this exporter can handle the given intent.
   *
   * This is a quick check used for exporter selection.
   * It should not perform full validation.
   *
   * @param intent - Intent to check
   * @returns true if this exporter can handle the intent
   */
  canHandle(intent: ValidatedIntent): boolean;

  /**
   * Get the serializers required by this exporter.
   *
   * @returns Array of serializer types needed for artifact serialization
   */
  getRequiredSerializers(): readonly SerializerType[];
}

// =============================================================================
// SERIALIZER INTERFACE
// =============================================================================

/**
 * Format options for serialization.
 */
export interface FormatOptions extends SerializerOptions {
  /** Validate content before formatting */
  readonly validateFirst?: boolean;
}

/**
 * Serializer interface for converting objects to string formats.
 *
 * Serializers handle the conversion of structured data to specific
 * text formats (YAML, JSON, HCL, etc.). All serializers must:
 *
 * - Produce deterministic output (stable key ordering)
 * - Support round-trip (serialize -> deserialize -> serialize = same result)
 * - Handle all valid inputs for their format
 */
export interface ISerializer {
  /**
   * Unique identifier for this serializer.
   */
  readonly id: SerializerId;

  /**
   * The format this serializer produces.
   */
  readonly format: SerializerType;

  /**
   * Serialize data to string format.
   *
   * The output must be deterministic - same input data must
   * always produce byte-identical output.
   *
   * @param data - Data to serialize
   * @param options - Serialization options
   * @returns Serialized string
   * @throws SerializationError if serialization fails
   */
  serialize(data: unknown, options?: SerializerOptions): string;

  /**
   * Deserialize string to structured data.
   *
   * @param content - String content to parse
   * @returns Parsed data structure
   * @throws ParseError if parsing fails
   */
  deserialize(content: string): unknown;

  /**
   * Reformat existing content for consistency.
   *
   * This normalizes whitespace, ordering, and formatting
   * without changing the semantic content.
   *
   * @param content - Content to reformat
   * @param options - Formatting options
   * @returns Reformatted content
   */
  reformat(content: string, options?: FormatOptions): string;

  /**
   * Validate that content is valid for this format.
   *
   * @param content - Content to validate
   * @returns Validation result
   */
  validate(content: string): ValidationResult;
}

// =============================================================================
// SIGNER INTERFACE
// =============================================================================

/**
 * Options for signing operations.
 */
export interface SignOptions {
  /** Key identifier */
  readonly keyId?: string;
  /** Include timestamp in signature */
  readonly timestamp?: boolean;
  /** Additional metadata to include */
  readonly metadata?: Readonly<Record<string, string>>;
}

/**
 * Result of a signing operation.
 */
export interface SignatureResult {
  /** Base64-encoded signature */
  readonly signature: string;
  /** Algorithm used */
  readonly algorithm: SigningAlgorithm;
  /** Key identifier */
  readonly keyId: string;
  /** Signing timestamp (if requested) */
  readonly timestamp?: string;
  /** Public key (for verification) */
  readonly publicKey?: string;
}

/**
 * Options for signature verification.
 */
export interface VerifyOptions {
  /** Expected key ID */
  readonly expectedKeyId?: string;
  /** Public key to use */
  readonly publicKey?: string;
  /** Allow expired signatures */
  readonly allowExpired?: boolean;
}

/**
 * Result of signature verification.
 */
export interface VerificationResult {
  readonly valid: boolean;
  readonly keyId?: string;
  readonly timestamp?: string;
  readonly error?: string;
}

/**
 * Signer interface for cryptographic signing operations.
 *
 * Signers provide artifact signing and verification capabilities.
 * They support multiple algorithms and key management approaches.
 */
export interface ISigner {
  /**
   * Unique identifier for this signer.
   */
  readonly id: SignerId;

  /**
   * Signing algorithm used.
   */
  readonly algorithm: SigningAlgorithm;

  /**
   * Sign data and return signature.
   *
   * @param data - Data to sign
   * @param options - Signing options
   * @returns Signature result with metadata
   * @throws SignatureError if signing fails
   */
  sign(data: Buffer, options?: SignOptions): Promise<SignatureResult>;

  /**
   * Verify a signature against data.
   *
   * @param data - Original data
   * @param signature - Signature to verify
   * @param options - Verification options
   * @returns Verification result
   */
  verify(
    data: Buffer,
    signature: string,
    options?: VerifyOptions
  ): Promise<VerificationResult>;

  /**
   * Get the public key for this signer.
   *
   * @returns Base64-encoded public key
   */
  getPublicKey(): string;

  /**
   * Check if the signer is properly configured.
   *
   * @returns true if signer has valid keys and is ready to use
   */
  isConfigured(): boolean;
}

// =============================================================================
// INTENT LOADER INTERFACE
// =============================================================================

/**
 * Intent loader interface for loading DeploymentIntent artifacts.
 *
 * Loaders handle reading intent files from various sources and
 * parsing them into structured data. They detect formats automatically
 * and provide source location metadata for error reporting.
 */
export interface IIntentLoader {
  /**
   * Load intent from a file path.
   *
   * @param path - Path to the intent file
   * @returns Parsed intent with source metadata
   * @throws ParseError if file cannot be read or parsed
   */
  loadFromFile(path: string): Promise<ParsedIntent>;

  /**
   * Load intent from a string.
   *
   * @param content - Intent content as string
   * @param format - Optional format hint (auto-detected if not provided)
   * @returns Parsed intent
   * @throws ParseError if content cannot be parsed
   */
  loadFromString(content: string, format?: IntentFormat): ParsedIntent;

  /**
   * Load intent from a readable stream.
   *
   * @param stream - Readable stream containing intent data
   * @param format - Optional format hint
   * @returns Parsed intent
   * @throws ParseError if stream cannot be read or parsed
   */
  loadFromStream(stream: Readable, format?: IntentFormat): Promise<ParsedIntent>;

  /**
   * Detect the format of intent content.
   *
   * @param content - Content to analyze
   * @returns Detected format
   */
  detectFormat(content: string): IntentFormat;
}

// =============================================================================
// INTENT VALIDATOR INTERFACE
// =============================================================================

/**
 * Validation rule result.
 */
export interface ValidationRuleResult {
  readonly passed: boolean;
  readonly message?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Validation rule definition.
 */
export interface ValidationRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly severity: ValidationSeverity;
  validate(intent: ParsedIntent): ValidationRuleResult;
}

/**
 * Options for validation operations.
 */
export interface ValidationOptions {
  /** Strict mode - fail on warnings */
  readonly strict?: boolean;
  /** Rule IDs to skip */
  readonly skipRules?: readonly string[];
  /** Additional context for validation */
  readonly context?: Readonly<Record<string, unknown>>;
}

/**
 * Result of intent validation.
 */
export interface IntentValidationResult extends ValidationResult {
  /** Validated intent (if valid) */
  readonly intent?: ValidatedIntent;
}

/**
 * Intent validator interface for validating DeploymentIntent artifacts.
 *
 * Validators perform comprehensive validation including:
 * - Structural validation (JSON Schema)
 * - Semantic validation (business rules)
 * - Reference validation (cross-references)
 */
export interface IIntentValidator {
  /**
   * Validate a parsed intent.
   *
   * Performs complete validation including structural, semantic,
   * and reference checks. Returns a validated intent on success.
   *
   * @param intent - Parsed intent to validate
   * @param options - Validation options
   * @returns Validation result with validated intent if valid
   */
  validate(intent: ParsedIntent, options?: ValidationOptions): IntentValidationResult;

  /**
   * Register a custom validation rule.
   *
   * @param rule - Validation rule to register
   */
  registerRule(rule: ValidationRule): void;

  /**
   * Get all registered validation rules.
   *
   * @returns Array of registered rules
   */
  getRules(): readonly ValidationRule[];
}

// =============================================================================
// EXPORT ORCHESTRATOR INTERFACE
// =============================================================================

/**
 * Options for orchestration operations.
 */
export interface OrchestrationOptions {
  /** Export formats to include */
  readonly formats?: readonly ExportFormat[];
  /** Maximum parallel exporters */
  readonly concurrency?: number;
  /** Continue on exporter failure */
  readonly continueOnError?: boolean;
  /** Dry run (plan only, no execution) */
  readonly dryRun?: boolean;
}

/**
 * Export metadata.
 */
export interface ExportMetadata {
  /** Export session ID */
  readonly sessionId: string;
  /** Start timestamp (from intent metadata, not runtime) */
  readonly startedAt: string;
  /** Completion timestamp (from intent metadata, not runtime) */
  readonly completedAt: string;
  /** Duration in milliseconds */
  readonly durationMs: number;
  /** Exporter versions used */
  readonly exporterVersions: Readonly<Record<string, SemanticVersion>>;
}

/**
 * Export error with context.
 */
export interface ExportError {
  readonly exporterId: ExporterId;
  readonly code: string;
  readonly message: string;
  readonly stage: string;
  readonly recoverable: boolean;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Export warning.
 */
export interface ExportWarning {
  readonly exporterId: ExporterId;
  readonly code: string;
  readonly message: string;
}

/**
 * Result of an export operation.
 */
export interface ExportResult {
  readonly success: boolean;
  readonly artifacts: readonly ExportArtifact[];
  readonly errors: readonly ExportError[];
  readonly warnings: readonly ExportWarning[];
  readonly metadata: ExportMetadata;
}

/**
 * Single exporter in an execution plan.
 */
export interface ExporterPlanItem {
  readonly exporterId: ExporterId;
  readonly exporterName: string;
  readonly targetFormat: ExportFormat;
  readonly estimatedArtifacts: number;
  readonly dependencies: readonly ExporterId[];
}

/**
 * Execution plan for export operations.
 */
export interface ExecutionPlan {
  /** Exporters to execute */
  readonly exporters: readonly ExporterPlanItem[];
  /** Execution order */
  readonly order: readonly ExporterId[];
  /** Dependencies between exporters */
  readonly dependencies: ReadonlyMap<ExporterId, readonly ExporterId[]>;
  /** Estimated total artifacts */
  readonly estimatedArtifacts: number;
}

/**
 * Progress event types.
 */
export type ProgressEventType = 'start' | 'progress' | 'complete' | 'error';

/**
 * Progress event for export operations.
 */
export interface ProgressEvent {
  readonly type: ProgressEventType;
  readonly exporterId?: ExporterId;
  readonly progress?: number;
  readonly message?: string;
  readonly artifact?: ExportArtifact;
  readonly error?: Error;
}

/**
 * Progress handler function type.
 */
export type ProgressHandler = (event: ProgressEvent) => void;

/**
 * Export orchestrator interface for coordinating export operations.
 *
 * The orchestrator manages the full export pipeline:
 * 1. Intent loading and validation
 * 2. Exporter selection and planning
 * 3. Parallel/sequential execution
 * 4. Result aggregation
 * 5. Progress reporting
 */
export interface IExportOrchestrator {
  /**
   * Execute export for a validated intent.
   *
   * This is the main entry point for export operations.
   * It coordinates all registered exporters and produces
   * the final export result.
   *
   * @param intent - Validated intent to export
   * @param options - Orchestration options
   * @returns Export result with all artifacts
   */
  execute(
    intent: ValidatedIntent,
    options?: OrchestrationOptions
  ): Promise<ExportResult>;

  /**
   * Register an exporter with the orchestrator.
   *
   * @param exporter - Exporter to register
   * @throws Error if exporter with same ID already registered
   */
  registerExporter(exporter: IExporter): void;

  /**
   * Plan export execution without executing.
   *
   * Creates an execution plan showing which exporters will run,
   * in what order, and what artifacts will be produced.
   *
   * @param intent - Intent to plan for
   * @param options - Orchestration options
   * @returns Execution plan
   */
  plan(intent: ValidatedIntent, options?: OrchestrationOptions): ExecutionPlan;

  /**
   * Register a progress handler.
   *
   * Progress handlers receive events during execution.
   *
   * @param handler - Progress event handler
   */
  onProgress(handler: ProgressHandler): void;
}

// =============================================================================
// INTENT NORMALIZER INTERFACE
// =============================================================================

/**
 * Intent normalizer interface for canonicalizing intents.
 *
 * Normalizers convert validated intents to canonical form:
 * - Apply defaults
 * - Expand references
 * - Sort keys
 * - Compute canonical hash
 */
export interface IIntentNormalizer {
  /**
   * Normalize a validated intent to canonical form.
   *
   * @param intent - Validated intent to normalize
   * @returns Normalized intent with canonical hash
   */
  normalize(intent: ValidatedIntent): NormalizedIntent;

  /**
   * Compute canonical hash for an intent.
   *
   * @param intent - Intent to hash
   * @returns SHA-256 hash of canonical representation
   */
  computeHash(intent: ValidatedIntent): string;
}

// =============================================================================
// ARTIFACT PACKAGER INTERFACE
// =============================================================================

/**
 * Single file entry in manifest.
 */
export interface ManifestFile {
  readonly path: string;
  readonly checksum: string;
  readonly size: number;
}

/**
 * Package manifest with artifact listings.
 */
export interface PackageManifest {
  /** Manifest version */
  readonly version: SemanticVersion;
  /** Source intent reference */
  readonly sourceIntent: {
    readonly intentId: string;
    readonly checksum: string;
    readonly version: SemanticVersion;
  };
  /** Package creation timestamp */
  readonly createdAt: string;
  /** Exporter version */
  readonly exporterVersion: SemanticVersion;
  /** Included files */
  readonly files: readonly ManifestFile[];
  /** Total package checksum */
  readonly totalChecksum: string;
}

/**
 * Represents a packaged artifact bundle.
 */
export interface ArtifactPackage {
  /** Package content as buffer */
  readonly content: Buffer;
  /** Package checksum */
  readonly checksum: string;
  /** Package manifest */
  readonly manifest: PackageManifest;
}

/**
 * Artifact packager interface for bundling export artifacts.
 *
 * Packagers combine multiple artifacts into distributable packages
 * with manifests, checksums, and optional signatures.
 */
export interface IArtifactPackager {
  /**
   * Package artifacts into a distributable bundle.
   *
   * @param artifacts - Artifacts to package
   * @param metadata - Additional metadata for manifest
   * @returns Packaged artifact bundle
   */
  package(
    artifacts: readonly ExportArtifact[],
    metadata: {
      readonly intentId: string;
      readonly intentChecksum: string;
      readonly intentVersion: SemanticVersion;
      readonly exporterVersion: SemanticVersion;
    }
  ): Promise<ArtifactPackage>;

  /**
   * Extract artifacts from a package.
   *
   * @param pkg - Package to extract
   * @returns Extracted artifacts
   */
  extract(pkg: ArtifactPackage): Promise<readonly ExportArtifact[]>;

  /**
   * Verify package integrity.
   *
   * @param pkg - Package to verify
   * @returns Validation result
   */
  verify(pkg: ArtifactPackage): ValidationResult;
}

// =============================================================================
// CHECKSUM CALCULATOR INTERFACE
// =============================================================================

/**
 * Checksum calculator interface for computing content hashes.
 */
export interface IChecksumCalculator {
  /**
   * Calculate checksum for data.
   *
   * @param data - Data to hash
   * @returns Hex-encoded checksum
   */
  calculate(data: Buffer): string;

  /**
   * Verify data matches expected checksum.
   *
   * @param data - Data to verify
   * @param expected - Expected checksum
   * @returns true if checksums match
   */
  verify(data: Buffer, expected: string): boolean;

  /**
   * Get the algorithm name.
   */
  readonly algorithm: string;
}

// =============================================================================
// RESOURCE MAPPER INTERFACE
// =============================================================================

/**
 * Context for resource mapping operations.
 */
export interface MappingContext {
  readonly provider: string;
  readonly region?: string;
  readonly environment?: string;
  readonly variables: Readonly<Record<string, unknown>>;
}

/**
 * Mapped resource for target format.
 */
export interface MappedResource {
  readonly type: string;
  readonly name: string;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly dependencies: readonly string[];
}

/**
 * Resource mapper interface for converting intent resources.
 *
 * Mappers handle the conversion of abstract intent resources
 * to target-specific resource definitions.
 */
export interface IResourceMapper {
  /**
   * Map an intent resource to target format.
   *
   * @param resource - Intent resource to map
   * @param context - Mapping context with additional info
   * @returns Mapped resource for target format
   */
  map(resource: IntentResource, context: MappingContext): MappedResource;

  /**
   * Check if this mapper supports a resource type.
   *
   * @param resourceType - Resource type URN
   * @returns true if supported
   */
  supports(resourceType: string): boolean;
}

// =============================================================================
// DEPENDENCY RESOLVER INTERFACE
// =============================================================================

/**
 * Resolved dependency information.
 */
export interface ResolvedDependencies {
  /** Execution order (resource names) */
  readonly order: readonly string[];
  /** Dependency graph (resource -> dependencies) */
  readonly graph: ReadonlyMap<string, readonly string[]>;
  /** Reverse dependencies (resource -> dependents) */
  readonly reverseDependencies: ReadonlyMap<string, readonly string[]>;
}

/**
 * Dependency resolver interface for ordering resources.
 *
 * Resolvers analyze resource dependencies and compute
 * valid execution orders.
 */
export interface IDependencyResolver {
  /**
   * Resolve dependencies and compute execution order.
   *
   * @param resources - Resources to analyze
   * @returns Resolved dependencies with ordering
   * @throws CircularDependencyError if cycles detected
   */
  resolve(resources: readonly IntentResource[]): ResolvedDependencies;

  /**
   * Validate that no circular dependencies exist.
   *
   * @param resources - Resources to check
   * @returns Validation result
   */
  validate(resources: readonly IntentResource[]): ValidationResult;
}

// =============================================================================
// EXPORTER REGISTRY INTERFACE
// =============================================================================

/**
 * Registry for managing exporters.
 */
export interface IExporterRegistry {
  /**
   * Register an exporter.
   *
   * @param exporter - Exporter to register
   */
  register(exporter: IExporter): void;

  /**
   * Get exporter by ID.
   *
   * @param id - Exporter ID
   * @returns Exporter or undefined
   */
  get(id: ExporterId): IExporter | undefined;

  /**
   * Get exporter by target format.
   *
   * @param format - Target format
   * @returns Exporter or undefined
   */
  getByFormat(format: ExportFormat): IExporter | undefined;

  /**
   * List all registered exporters.
   *
   * @returns Array of registered exporters
   */
  list(): readonly IExporter[];

  /**
   * Check if an exporter is registered.
   *
   * @param id - Exporter ID
   * @returns true if registered
   */
  has(id: ExporterId): boolean;
}

// =============================================================================
// SERIALIZER REGISTRY INTERFACE
// =============================================================================

/**
 * Registry for managing serializers.
 */
export interface ISerializerRegistry {
  /**
   * Register a serializer.
   *
   * @param serializer - Serializer to register
   */
  register(serializer: ISerializer): void;

  /**
   * Get serializer by ID.
   *
   * @param id - Serializer ID
   * @returns Serializer or undefined
   */
  get(id: SerializerId): ISerializer | undefined;

  /**
   * Get serializer by format type.
   *
   * @param format - Serializer format
   * @returns Serializer or undefined
   */
  getByFormat(format: SerializerType): ISerializer | undefined;

  /**
   * List all registered serializers.
   *
   * @returns Array of registered serializers
   */
  list(): readonly ISerializer[];

  /**
   * Check if a serializer is registered.
   *
   * @param id - Serializer ID
   * @returns true if registered
   */
  has(id: SerializerId): boolean;
}
