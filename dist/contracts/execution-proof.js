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
export function computeSHA256(data) {
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
export function computeIntentHash(intent) {
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
export function canonicalizeObject(obj) {
    return JSON.stringify(sortObjectKeys(obj));
}
/**
 * Recursively sorts object keys for canonical representation.
 *
 * @param obj - The object to sort
 * @returns Object with sorted keys
 */
function sortObjectKeys(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(sortObjectKeys);
    }
    if (typeof obj === 'object') {
        const sorted = {};
        const keys = Object.keys(obj).sort();
        for (const key of keys) {
            sorted[key] = sortObjectKeys(obj[key]);
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
    defaultSchemaVersion;
    /**
     * Creates a new ExecutionProofGenerator.
     *
     * @param defaultSchemaVersion - Default schema version to use
     */
    constructor(defaultSchemaVersion = 'v1') {
        this.defaultSchemaVersion = defaultSchemaVersion;
    }
    /**
     * Generates an execution proof for a validated intent.
     *
     * @param intent - The validated intent
     * @param options - Proof generation options
     * @returns The execution proof
     */
    generate(intent, options) {
        const executionId = options.executionId || randomUUID();
        const timestamp = options.timestamp || new Date().toISOString();
        const intentHash = computeIntentHash(intent);
        // Compute artifact checksums
        const artifactChecksums = {};
        const artifacts = [];
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
        const proof = {
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
    generateFromRequest(request, options) {
        const formats = request.formats ? [...request.formats] : undefined;
        const metadata = formats
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
    verify(proof, intent) {
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
    verifyArtifacts(proof, artifacts) {
        const mismatches = [];
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
export function createExecutionProofGenerator(schemaVersion) {
    return new ExecutionProofGenerator(schemaVersion);
}
// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================
let _defaultGenerator = null;
/**
 * Gets the default proof generator instance.
 *
 * @returns The default generator
 */
export function getDefaultProofGenerator() {
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
export function generateExecutionProof(intent, options) {
    return getDefaultProofGenerator().generate(intent, options);
}
/**
 * Verifies an execution proof against an intent.
 *
 * @param proof - The proof to verify
 * @param intent - The intent to verify against
 * @returns true if valid
 */
export function verifyExecutionProof(proof, intent) {
    return getDefaultProofGenerator().verify(proof, intent);
}
//# sourceMappingURL=execution-proof.js.map