/**
 * Execution Proof Generation for Agentics Deployment Exporters
 *
 * Provides cryptographic proof of successful intent validation and artifact generation.
 * All operations are deterministic and produce reproducible results.
 *
 * @module contracts/execution-proof
 * @version 1.0.0
 */

import { createHash, randomUUID } from 'crypto';

import type { Intent, ExporterRequest } from './types.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Artifact checksum entry
 */
export interface ArtifactChecksum {
  /** Relative path to the artifact */
  readonly path: string;
  /** SHA-256 hash of the artifact content */
  readonly checksum: string;
  /** Size of the artifact in bytes */
  readonly sizeBytes: number;
}

/**
 * Execution proof for validated intent processing
 */
export interface ExecutionProof {
  /** Unique execution identifier */
  readonly executionId: string;
  /** ISO 8601 timestamp of execution */
  readonly timestamp: string;
  /** Schema version used for validation */
  readonly schemaVersion: string;
  /** SHA-256 hash of the validated intent */
  readonly intentHash: string;
  /** Whether validation passed */
  readonly validationPassed: boolean;
  /** Map of artifact path to SHA-256 checksum */
  readonly artifactChecksums: Readonly<Record<string, string>>;
  /** Optional list of detailed artifact checksums */
  readonly artifacts?: readonly ArtifactChecksum[];
  /** Optional metadata about the execution */
  readonly metadata?: ExecutionMetadata;
}

/**
 * Metadata about the execution
 */
export interface ExecutionMetadata {
  /** Duration of execution in milliseconds */
  readonly durationMs?: number;
  /** Number of artifacts generated */
  readonly artifactCount?: number;
  /** Export formats requested */
  readonly formats?: readonly string[];
  /** Node.js version used */
  readonly nodeVersion?: string;
  /** Platform identifier */
  readonly platform?: string;
}

/**
 * Options for execution proof generation
 */
export interface ExecutionProofOptions {
  /** Schema version to include in proof */
  readonly schemaVersion: string;
  /** Whether validation passed */
  readonly validationPassed: boolean;
  /** Map of artifact paths to their content */
  readonly artifacts?: Readonly<Record<string, string | Buffer>>;
  /** Additional execution metadata */
  readonly metadata?: ExecutionMetadata;
  /** Custom execution ID (generated if not provided) */
  readonly executionId?: string;
  /** Custom timestamp (current time if not provided) */
  readonly timestamp?: string;
}

// =============================================================================
// HASHING FUNCTIONS
// =============================================================================

/**
 * Computes SHA-256 hash of a string or buffer.
 * Pure function - deterministic output.
 *
 * @param data - The data to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function computeSHA256(data: string | Buffer): string {
  const hash = createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
}

/**
 * Computes hash of an intent object.
 * Canonicalizes the intent before hashing for determinism.
 *
 * @param intent - The intent to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function computeIntentHash(intent: Intent): string {
  // Canonicalize by sorting keys and using consistent JSON serialization
  const canonical = canonicalizeObject(intent);
  return computeSHA256(canonical);
}

/**
 * Canonicalizes an object for deterministic hashing.
 * Sorts all keys alphabetically and uses consistent JSON formatting.
 *
 * @param obj - The object to canonicalize
 * @returns Canonical JSON string
 */
export function canonicalizeObject(obj: unknown): string {
  return JSON.stringify(sortObjectKeys(obj));
}

/**
 * Recursively sorts object keys for canonical representation.
 *
 * @param obj - The object to sort
 * @returns Object with sorted keys
 */
function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  if (typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    for (const key of keys) {
      sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  return obj;
}

// =============================================================================
// EXECUTION PROOF GENERATOR
// =============================================================================

/**
 * Generator for execution proofs.
 * Creates cryptographic proofs of successful intent processing.
 */
export class ExecutionProofGenerator {
  private readonly defaultSchemaVersion: string;

  /**
   * Creates a new ExecutionProofGenerator.
   *
   * @param defaultSchemaVersion - Default schema version to use
   */
  constructor(defaultSchemaVersion: string = 'v1') {
    this.defaultSchemaVersion = defaultSchemaVersion;
  }

  /**
   * Generates an execution proof for a validated intent.
   *
   * @param intent - The validated intent
   * @param options - Proof generation options
   * @returns The execution proof
   */
  generate(intent: Intent, options: ExecutionProofOptions): ExecutionProof {
    const executionId = options.executionId || randomUUID();
    const timestamp = options.timestamp || new Date().toISOString();
    const intentHash = computeIntentHash(intent);

    // Compute artifact checksums
    const artifactChecksums: Record<string, string> = {};
    const artifacts: ArtifactChecksum[] = [];

    if (options.artifacts) {
      for (const [path, content] of Object.entries(options.artifacts)) {
        const data = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
        const checksum = computeSHA256(data);
        artifactChecksums[path] = checksum;
        artifacts.push({
          path,
          checksum,
          sizeBytes: data.length,
        });
      }
    }

    const proof: ExecutionProof = {
      executionId,
      timestamp,
      schemaVersion: options.schemaVersion || this.defaultSchemaVersion,
      intentHash,
      validationPassed: options.validationPassed,
      artifactChecksums: Object.freeze(artifactChecksums),
      ...(artifacts.length > 0 && { artifacts: Object.freeze(artifacts) }),
      ...(options.metadata && { metadata: Object.freeze(options.metadata) }),
    };

    return Object.freeze(proof);
  }

  /**
   * Generates a proof from an exporter request.
   *
   * @param request - The exporter request
   * @param options - Proof generation options
   * @returns The execution proof
   */
  generateFromRequest(
    request: ExporterRequest,
    options: Omit<ExecutionProofOptions, 'validationPassed'> & { validationPassed?: boolean }
  ): ExecutionProof {
    const formats = request.formats ? [...request.formats] : undefined;
    const metadata: ExecutionMetadata | undefined = formats
      ? { ...options.metadata, formats }
      : options.metadata;

    return this.generate(request.intent, {
      ...options,
      validationPassed: options.validationPassed ?? true,
      ...(metadata && { metadata }),
    });
  }

  /**
   * Verifies an execution proof against an intent.
   * Recomputes the intent hash and compares.
   *
   * @param proof - The execution proof to verify
   * @param intent - The intent to verify against
   * @returns true if the proof is valid
   */
  verify(proof: ExecutionProof, intent: Intent): boolean {
    const computedHash = computeIntentHash(intent);
    return proof.intentHash === computedHash;
  }

  /**
   * Verifies artifact checksums in a proof.
   *
   * @param proof - The execution proof
   * @param artifacts - Map of artifact paths to content
   * @returns Object with verification result and any mismatches
   */
  verifyArtifacts(
    proof: ExecutionProof,
    artifacts: Readonly<Record<string, string | Buffer>>
  ): { valid: boolean; mismatches: string[] } {
    const mismatches: string[] = [];

    for (const [path, content] of Object.entries(artifacts)) {
      const expectedChecksum = proof.artifactChecksums[path];
      if (!expectedChecksum) {
        mismatches.push(`Missing checksum for artifact: ${path}`);
        continue;
      }

      const data = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
      const actualChecksum = computeSHA256(data);

      if (actualChecksum !== expectedChecksum) {
        mismatches.push(`Checksum mismatch for ${path}: expected ${expectedChecksum}, got ${actualChecksum}`);
      }
    }

    // Check for artifacts in proof that are missing from provided artifacts
    for (const path of Object.keys(proof.artifactChecksums)) {
      if (!(path in artifacts)) {
        mismatches.push(`Artifact missing: ${path}`);
      }
    }

    return {
      valid: mismatches.length === 0,
      mismatches,
    };
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Creates a new ExecutionProofGenerator.
 *
 * @param schemaVersion - Default schema version
 * @returns A new generator instance
 */
export function createExecutionProofGenerator(schemaVersion?: string): ExecutionProofGenerator {
  return new ExecutionProofGenerator(schemaVersion);
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

let _defaultGenerator: ExecutionProofGenerator | null = null;

/**
 * Gets the default proof generator instance.
 *
 * @returns The default generator
 */
export function getDefaultProofGenerator(): ExecutionProofGenerator {
  if (!_defaultGenerator) {
    _defaultGenerator = createExecutionProofGenerator();
  }
  return _defaultGenerator;
}

/**
 * Generates an execution proof using the default generator.
 *
 * @param intent - The validated intent
 * @param options - Proof generation options
 * @returns The execution proof
 */
export function generateExecutionProof(
  intent: Intent,
  options: ExecutionProofOptions
): ExecutionProof {
  return getDefaultProofGenerator().generate(intent, options);
}

/**
 * Verifies an execution proof against an intent.
 *
 * @param proof - The proof to verify
 * @param intent - The intent to verify against
 * @returns true if valid
 */
export function verifyExecutionProof(proof: ExecutionProof, intent: Intent): boolean {
  return getDefaultProofGenerator().verify(proof, intent);
}
