/**
 * Execution Proof Generation for Agentics Deployment Exporters
 *
 * Provides cryptographic proof of successful intent validation and artifact generation.
 * All operations are deterministic and produce reproducible results.
 *
 * @module contracts/execution-proof
 * @version 1.0.0
 */
import type { Intent, ExporterRequest } from './types.js';
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
/**
 * Computes SHA-256 hash of a string or buffer.
 * Pure function - deterministic output.
 *
 * @param data - The data to hash
 * @returns Hex-encoded SHA-256 hash
 */
export declare function computeSHA256(data: string | Buffer): string;
/**
 * Computes hash of an intent object.
 * Canonicalizes the intent before hashing for determinism.
 *
 * @param intent - The intent to hash
 * @returns Hex-encoded SHA-256 hash
 */
export declare function computeIntentHash(intent: Intent): string;
/**
 * Canonicalizes an object for deterministic hashing.
 * Sorts all keys alphabetically and uses consistent JSON formatting.
 *
 * @param obj - The object to canonicalize
 * @returns Canonical JSON string
 */
export declare function canonicalizeObject(obj: unknown): string;
/**
 * Generator for execution proofs.
 * Creates cryptographic proofs of successful intent processing.
 */
export declare class ExecutionProofGenerator {
    private readonly defaultSchemaVersion;
    /**
     * Creates a new ExecutionProofGenerator.
     *
     * @param defaultSchemaVersion - Default schema version to use
     */
    constructor(defaultSchemaVersion?: string);
    /**
     * Generates an execution proof for a validated intent.
     *
     * @param intent - The validated intent
     * @param options - Proof generation options
     * @returns The execution proof
     */
    generate(intent: Intent, options: ExecutionProofOptions): ExecutionProof;
    /**
     * Generates a proof from an exporter request.
     *
     * @param request - The exporter request
     * @param options - Proof generation options
     * @returns The execution proof
     */
    generateFromRequest(request: ExporterRequest, options: Omit<ExecutionProofOptions, 'validationPassed'> & {
        validationPassed?: boolean;
    }): ExecutionProof;
    /**
     * Verifies an execution proof against an intent.
     * Recomputes the intent hash and compares.
     *
     * @param proof - The execution proof to verify
     * @param intent - The intent to verify against
     * @returns true if the proof is valid
     */
    verify(proof: ExecutionProof, intent: Intent): boolean;
    /**
     * Verifies artifact checksums in a proof.
     *
     * @param proof - The execution proof
     * @param artifacts - Map of artifact paths to content
     * @returns Object with verification result and any mismatches
     */
    verifyArtifacts(proof: ExecutionProof, artifacts: Readonly<Record<string, string | Buffer>>): {
        valid: boolean;
        mismatches: string[];
    };
}
/**
 * Creates a new ExecutionProofGenerator.
 *
 * @param schemaVersion - Default schema version
 * @returns A new generator instance
 */
export declare function createExecutionProofGenerator(schemaVersion?: string): ExecutionProofGenerator;
/**
 * Gets the default proof generator instance.
 *
 * @returns The default generator
 */
export declare function getDefaultProofGenerator(): ExecutionProofGenerator;
/**
 * Generates an execution proof using the default generator.
 *
 * @param intent - The validated intent
 * @param options - Proof generation options
 * @returns The execution proof
 */
export declare function generateExecutionProof(intent: Intent, options: ExecutionProofOptions): ExecutionProof;
/**
 * Verifies an execution proof against an intent.
 *
 * @param proof - The proof to verify
 * @param intent - The intent to verify against
 * @returns true if valid
 */
export declare function verifyExecutionProof(proof: ExecutionProof, intent: Intent): boolean;
//# sourceMappingURL=execution-proof.d.ts.map