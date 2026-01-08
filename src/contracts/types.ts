/**
 * Contract Types for Agentics Deployment Exporters
 *
 * TypeScript type definitions derived from the JSON Schema contracts.
 * These types provide compile-time type safety for request/response contracts.
 *
 * @module contracts/types
 * @version 1.0.0
 */

// =============================================================================
// INTENT TYPES
// =============================================================================

/**
 * API version format: agentics.io/v{major}[alpha|beta]{minor}
 */
export type ApiVersion =
  | `agentics.io/v${number}`
  | `agentics.io/v${number}alpha${number}`
  | `agentics.io/v${number}beta${number}`;

/**
 * Supported intent kinds
 */
export type IntentKind = 'DeploymentIntent' | 'InfrastructureIntent' | 'ApplicationIntent';

/**
 * Intent metadata structure
 */
export interface IntentMetadata {
  /** Unique name for the intent (required) */
  readonly name: string;
  /** Optional namespace for the intent */
  readonly namespace?: string;
  /** Key-value labels for categorization */
  readonly labels?: Readonly<Record<string, string>>;
  /** Key-value annotations for additional metadata */
  readonly annotations?: Readonly<Record<string, string>>;
  /** Version of this intent specification */
  readonly version?: string;
  /** ISO 8601 timestamp of creation */
  readonly createdAt?: string;
  /** ISO 8601 timestamp of last update */
  readonly updatedAt?: string;
}

/**
 * Cloud provider enumeration
 */
export type CloudProvider = 'aws' | 'gcp' | 'azure' | 'multi';

/**
 * Target environment
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * Target specification for deployment
 */
export interface IntentTarget {
  /** Cloud provider target */
  readonly provider?: CloudProvider;
  /** Primary deployment region */
  readonly region?: string;
  /** Target environment */
  readonly environment?: Environment;
}

/**
 * Resource definition in the intent spec
 */
export interface IntentResource {
  /** Resource type identifier */
  readonly type: string;
  /** Resource name */
  readonly name: string;
  /** Resource-specific configuration */
  readonly config?: Readonly<Record<string, unknown>>;
}

/**
 * Intent specification structure
 */
export interface IntentSpec {
  /** Target environment specification */
  readonly target?: IntentTarget;
  /** List of resources to deploy */
  readonly resources?: readonly IntentResource[];
  /** Additional spec properties */
  readonly [key: string]: unknown;
}

/**
 * Complete intent structure
 */
export interface Intent {
  /** API version (required) */
  readonly apiVersion: ApiVersion;
  /** Kind of resource (required) */
  readonly kind: IntentKind;
  /** Metadata about the intent (required) */
  readonly metadata: IntentMetadata;
  /** The specification of the deployment intent */
  readonly spec?: IntentSpec;
}

// =============================================================================
// EXPORT FORMAT TYPES
// =============================================================================

/**
 * Supported export formats
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
 * All supported export format values as array
 */
export const ExportFormatValues: readonly ExportFormat[] = [
  'terraform',
  'kubernetes',
  'helm',
  'cloudformation',
  'arm',
  'gcp-dm',
  'iam',
  'sql',
  'docker-compose',
  'config',
] as const;

// =============================================================================
// OPTIONS TYPES
// =============================================================================

/**
 * Checksum algorithm options
 */
export type ChecksumAlgorithm = 'sha256' | 'sha384' | 'sha512';

/**
 * Export options structure
 */
export interface ExportOptions {
  /** Output directory for generated artifacts */
  readonly outputDir?: string;
  /** If true, validate only without generating artifacts */
  readonly dryRun?: boolean;
  /** If true, validate the generated artifacts */
  readonly validate?: boolean;
  /** If true, sign the generated artifacts */
  readonly sign?: boolean;
  /** If true, include metadata in output artifacts */
  readonly includeMetadata?: boolean;
  /** If true, format output for readability */
  readonly prettyPrint?: boolean;
  /** Algorithm for checksum generation */
  readonly checksumAlgorithm?: ChecksumAlgorithm;
  /** If true, fail on any validation warning */
  readonly strictMode?: boolean;
  /** Maximum concurrent export operations */
  readonly concurrency?: number;
  /** Timeout in milliseconds for export operations */
  readonly timeout?: number;
  /** Provider-specific options */
  readonly providerOptions?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
}

// =============================================================================
// REQUEST TYPES
// =============================================================================

/**
 * Complete exporter request structure
 * Matches the request.schema.json definition
 */
export interface ExporterRequest {
  /** The deployment intent specification (required) */
  readonly intent: Intent;
  /** Target export formats */
  readonly formats?: readonly ExportFormat[];
  /** Export options */
  readonly options?: ExportOptions;
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

/**
 * Validation error detail
 */
export interface ValidationErrorDetail {
  /** JSON pointer to the invalid field */
  readonly path: string;
  /** Error message */
  readonly message: string;
  /** Expected value or schema */
  readonly expected?: unknown;
  /** Actual value received */
  readonly actual?: unknown;
  /** Error keyword from JSON Schema */
  readonly keyword?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  readonly valid: boolean;
  /** List of validation errors if any */
  readonly errors: readonly ValidationErrorDetail[];
  /** Schema version used for validation */
  readonly schemaVersion: string;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for Intent
 */
export function isIntent(value: unknown): value is Intent {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.apiVersion === 'string' &&
    typeof obj.kind === 'string' &&
    typeof obj.metadata === 'object' &&
    obj.metadata !== null &&
    typeof (obj.metadata as Record<string, unknown>).name === 'string'
  );
}

/**
 * Type guard for ExportFormat
 */
export function isExportFormat(value: unknown): value is ExportFormat {
  return typeof value === 'string' && ExportFormatValues.includes(value as ExportFormat);
}

/**
 * Type guard for ExporterRequest
 */
export function isExporterRequest(value: unknown): value is ExporterRequest {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return isIntent(obj.intent);
}
