/**
 * Orchestrator-specific types for the ExportOrchestrator module.
 *
 * These types define the contracts for export orchestration, execution planning,
 * concurrency management, and progress tracking.
 */

/**
 * Unique identifier for an exporter.
 */
export type ExporterId = string;

/**
 * Supported export formats.
 */
export type ExportFormat =
  | 'terraform'
  | 'kubernetes'
  | 'helm'
  | 'cloudformation'
  | 'arm'
  | 'gcp-dm'
  | 'iam'
  | 'sql'
  | 'docker-compose'
  | 'config';

/**
 * Semantic version string.
 */
export type SemanticVersion = `${number}.${number}.${number}`;

/**
 * Supported intent sections.
 */
export type IntentSection =
  | 'compute'
  | 'network'
  | 'storage'
  | 'database'
  | 'kubernetes'
  | 'security'
  | 'config'
  | 'iam';

/**
 * Serializer types supported by the system.
 */
export type SerializerType = 'hcl' | 'yaml' | 'json' | 'sql' | 'toml' | 'ini' | 'env';

/**
 * Options for export operations.
 */
export interface ExportOptions {
  /** Target cloud provider */
  readonly provider?: 'aws' | 'gcp' | 'azure' | 'multi';
  /** Target environment */
  readonly environment?: string;
  /** Additional variables */
  readonly variables?: Readonly<Record<string, unknown>>;
  /** Enable verbose output */
  readonly verbose?: boolean;
}

/**
 * Validation error details.
 */
export interface ValidationError {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
  readonly expected?: unknown;
  readonly actual?: unknown;
}

/**
 * Validation warning details.
 */
export interface ValidationWarning {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

/**
 * Result of a validation operation.
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
}

/**
 * Single artifact produced by an exporter.
 */
export interface ExportArtifact {
  /** Relative path within output directory */
  readonly path: string;
  /** Raw content (pre-serialization) */
  readonly content: unknown;
  /** Target format for serialization */
  readonly format: SerializerType;
  /** Content encoding */
  readonly encoding: 'utf-8' | 'binary';
  /** Optional metadata */
  readonly metadata?: Readonly<Record<string, unknown>>;
  /** Exporter that produced this artifact */
  readonly exporterId: ExporterId;
  /** Timestamp when artifact was created */
  readonly createdAt: string;
}

/**
 * Normalized deployment intent structure.
 * This represents the canonical form after validation and normalization.
 */
export interface NormalizedIntent {
  readonly apiVersion: string;
  readonly kind: string;
  readonly metadata: {
    readonly name: string;
    readonly version: string;
    readonly createdAt: string;
    readonly labels?: Readonly<Record<string, string>>;
    readonly annotations?: Readonly<Record<string, string>>;
  };
  readonly spec: {
    readonly compute?: unknown;
    readonly network?: unknown;
    readonly storage?: unknown;
    readonly database?: unknown;
    readonly kubernetes?: unknown;
    readonly security?: unknown;
    readonly config?: unknown;
    readonly iam?: unknown;
  };
  /** Hash of the canonical intent for traceability */
  readonly hash: string;
}

/**
 * Core exporter interface that all exporters must implement.
 */
export interface IExporter {
  /** Unique identifier for this exporter */
  readonly id: ExporterId;
  /** Human-readable name */
  readonly name: string;
  /** Target output format */
  readonly targetFormat: ExportFormat;
  /** Exporter version */
  readonly version: SemanticVersion;
  /** Supported intent sections */
  readonly supportedSections: readonly IntentSection[];
  /** Exporters this one depends on (must run first) */
  readonly dependencies?: readonly ExporterId[];

  /**
   * Transform normalized intent into export artifacts.
   * Must be a pure function - same input always produces same output.
   */
  transform(
    intent: NormalizedIntent,
    options?: ExportOptions
  ): Promise<readonly ExportArtifact[]>;

  /**
   * Validate a produced artifact against format-specific rules.
   */
  validate(artifact: ExportArtifact): Promise<ValidationResult>;

  /**
   * Check if this exporter can handle the given intent.
   */
  canHandle(intent: NormalizedIntent): boolean;

  /**
   * Get the required serializers for this exporter's output.
   */
  getRequiredSerializers(): readonly SerializerType[];
}

/**
 * Options for orchestration.
 */
export interface OrchestrationOptions {
  /** Export formats to include (undefined means all applicable) */
  readonly formats?: readonly ExportFormat[];
  /** Maximum parallel exporters (default: 4) */
  readonly concurrency?: number;
  /** Continue on exporter failure (default: false) */
  readonly continueOnError?: boolean;
  /** Dry run - plan only, don't execute (default: false) */
  readonly dryRun?: boolean;
  /** Export options passed to individual exporters */
  readonly exportOptions?: ExportOptions;
}

/**
 * Error that occurred during export.
 */
export interface ExportError {
  readonly code: string;
  readonly message: string;
  readonly exporterId: ExporterId;
  readonly stage: 'planning' | 'execution' | 'validation' | 'collection';
  readonly recoverable: boolean;
  readonly cause?: Error;
  readonly timestamp: string;
}

/**
 * Warning from export process.
 */
export interface ExportWarning {
  readonly code: string;
  readonly message: string;
  readonly exporterId?: ExporterId;
  readonly timestamp: string;
}

/**
 * Metadata about the export operation.
 */
export interface ExportMetadata {
  /** Unique export session ID */
  readonly exportId: string;
  /** Correlation ID for tracing */
  readonly correlationId: string;
  /** Export start timestamp */
  readonly startedAt: string;
  /** Export completion timestamp */
  readonly completedAt: string;
  /** Duration in milliseconds */
  readonly durationMs: number;
  /** Hash of the source intent */
  readonly intentHash: string;
  /** Intent version */
  readonly intentVersion: string;
  /** Exporters that were executed */
  readonly executedExporters: readonly ExporterExecutionInfo[];
}

/**
 * Information about a single exporter's execution.
 */
export interface ExporterExecutionInfo {
  readonly exporterId: ExporterId;
  readonly version: SemanticVersion;
  readonly status: 'success' | 'failed' | 'skipped';
  readonly artifactCount: number;
  readonly durationMs: number;
  readonly error?: string;
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
 * Plan item for a single exporter.
 */
export interface ExporterPlanItem {
  readonly exporterId: ExporterId;
  readonly name: string;
  readonly version: SemanticVersion;
  readonly targetFormat: ExportFormat;
  /** Estimated number of artifacts this exporter will produce */
  readonly estimatedArtifacts: number;
  /** Sections this exporter will process */
  readonly sections: readonly IntentSection[];
  /** Other exporters this one depends on */
  readonly dependsOn: readonly ExporterId[];
  /** Other exporters that depend on this one */
  readonly dependedOnBy: readonly ExporterId[];
  /** Execution phase (exporters in same phase can run in parallel) */
  readonly phase: number;
}

/**
 * Execution plan describing how exporters will be run.
 */
export interface ExecutionPlan {
  /** All exporters to execute */
  readonly exporters: readonly ExporterPlanItem[];
  /** Execution order (topologically sorted) */
  readonly order: readonly ExporterId[];
  /** Dependencies between exporters */
  readonly dependencies: ReadonlyMap<ExporterId, readonly ExporterId[]>;
  /** Reverse dependencies (who depends on whom) */
  readonly dependents: ReadonlyMap<ExporterId, readonly ExporterId[]>;
  /** Estimated total artifacts */
  readonly estimatedArtifacts: number;
  /** Phases for parallel execution (exporters in same phase can run in parallel) */
  readonly phases: readonly (readonly ExporterId[])[];
  /** Whether the plan is valid */
  readonly valid: boolean;
  /** Validation errors if plan is invalid */
  readonly validationErrors?: readonly string[];
}

/**
 * Progress event types.
 */
export type ProgressEventType =
  | 'planning'
  | 'plan-complete'
  | 'execution-start'
  | 'exporter-start'
  | 'exporter-progress'
  | 'exporter-complete'
  | 'exporter-error'
  | 'phase-start'
  | 'phase-complete'
  | 'execution-complete'
  | 'execution-error';

/**
 * Progress event emitted during export.
 */
export interface ProgressEvent {
  readonly type: ProgressEventType;
  readonly timestamp: string;
  /** Overall progress (0-100) */
  readonly progress: number;
  /** Current phase being executed */
  readonly phase?: number;
  /** Total phases */
  readonly totalPhases?: number;
  /** Exporter ID if event is exporter-specific */
  readonly exporterId?: ExporterId;
  /** Exporter name if event is exporter-specific */
  readonly exporterName?: string;
  /** Human-readable message */
  readonly message: string;
  /** Artifact produced (for exporter-progress events) */
  readonly artifact?: ExportArtifact;
  /** Error if event is an error type */
  readonly error?: ExportError;
}

/**
 * Handler for progress events.
 */
export type ProgressHandler = (event: ProgressEvent) => void;

/**
 * Options for concurrent execution.
 */
export interface ConcurrencyOptions {
  /** Maximum concurrent exporters */
  readonly maxConcurrency: number;
  /** Continue execution on individual exporter failure */
  readonly continueOnError: boolean;
  /** Timeout per exporter in milliseconds (0 = no timeout) */
  readonly timeoutMs: number;
}

/**
 * Result of a single exporter execution.
 */
export interface ExporterExecutionResult {
  readonly exporterId: ExporterId;
  readonly success: boolean;
  readonly artifacts: readonly ExportArtifact[];
  readonly error?: ExportError;
  readonly durationMs: number;
}

/**
 * Context passed to exporters during execution.
 */
export interface ExporterContext {
  /** The normalized intent being exported */
  readonly intent: NormalizedIntent;
  /** Export options */
  readonly options: ExportOptions;
  /** Artifacts from dependency exporters (keyed by exporter ID) */
  readonly dependencyArtifacts: ReadonlyMap<ExporterId, readonly ExportArtifact[]>;
  /** Correlation ID for tracing */
  readonly correlationId: string;
  /** Export session ID */
  readonly exportId: string;
}

/**
 * Interface for the export orchestrator.
 */
export interface IExportOrchestrator {
  /**
   * Execute export process.
   */
  execute(
    intent: NormalizedIntent,
    options?: OrchestrationOptions
  ): Promise<ExportResult>;

  /**
   * Register an exporter.
   */
  registerExporter(exporter: IExporter): void;

  /**
   * Unregister an exporter.
   */
  unregisterExporter(exporterId: ExporterId): boolean;

  /**
   * Get all registered exporters.
   */
  getExporters(): readonly IExporter[];

  /**
   * Get execution plan without executing.
   */
  plan(intent: NormalizedIntent, options?: OrchestrationOptions): ExecutionPlan;

  /**
   * Subscribe to export progress events.
   * Returns an unsubscribe function.
   */
  onProgress(handler: ProgressHandler): () => void;
}
