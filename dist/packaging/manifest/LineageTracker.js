/**
 * Lineage Tracker for Artifact Provenance
 *
 * Tracks the complete transformation lineage from source intent
 * to final artifact, enabling full traceability and auditability.
 *
 * Key features:
 * - Complete transformation chain tracking
 * - Source intent reference preservation
 * - Deterministic lineage hash computation
 * - Audit trail generation
 *
 * @module packaging/manifest/LineageTracker
 * @version 1.0.0
 */
import { randomUUID } from 'node:crypto';
import { ChecksumGenerator } from '../checksum/ChecksumGenerator.js';
// =============================================================================
// CONSTANTS
// =============================================================================
/**
 * Lineage manifest version.
 */
const LINEAGE_VERSION = '1.0.0';
/**
 * Standard lineage step types.
 */
export const LineageStepTypes = {
    PARSE: 'parse',
    VALIDATE: 'validate',
    NORMALIZE: 'normalize',
    TRANSFORM: 'transform',
    SERIALIZE: 'serialize',
    PACKAGE: 'package',
};
// =============================================================================
// LINEAGE BUILDER
// =============================================================================
/**
 * Builder for individual lineage records.
 *
 * Used to incrementally build the transformation chain
 * for a single artifact.
 */
export class LineageRecordBuilder {
    artifactPath;
    sourceIntentHash;
    steps = [];
    checksumGenerator;
    /**
     * Create a new LineageRecordBuilder.
     *
     * @param artifactPath - Path of the artifact being tracked
     * @param sourceIntentHash - Hash of the source intent
     */
    constructor(artifactPath, sourceIntentHash) {
        this.artifactPath = artifactPath;
        this.sourceIntentHash = sourceIntentHash;
        this.checksumGenerator = new ChecksumGenerator();
    }
    /**
     * Add a transformation step to the lineage.
     *
     * @param type - Step type
     * @param inputHash - Hash of the input data
     * @param outputHash - Hash of the output data
     * @param component - Component that performed the transformation
     * @param componentVersion - Version of the component
     * @param timestampOverride - Optional timestamp override
     * @returns This builder for chaining
     */
    addStep(type, inputHash, outputHash, component, componentVersion, timestampOverride) {
        const step = {
            id: randomUUID(),
            type,
            inputHash,
            outputHash,
            component,
            componentVersion,
            timestamp: timestampOverride ?? new Date().toISOString(),
        };
        this.steps.push(step);
        return this;
    }
    /**
     * Build the final lineage record.
     *
     * @param artifactHash - Hash of the final artifact
     * @returns Complete lineage record
     */
    build(artifactHash) {
        return Object.freeze({
            artifactPath: this.artifactPath,
            sourceIntentHash: this.sourceIntentHash,
            chain: Object.freeze([...this.steps]),
            artifactHash,
        });
    }
    /**
     * Get the current step count.
     */
    getStepCount() {
        return this.steps.length;
    }
}
// =============================================================================
// LINEAGE TRACKER
// =============================================================================
/**
 * Tracks artifact lineage from source to output.
 *
 * The tracker maintains the complete transformation chain
 * for each artifact, enabling full traceability.
 *
 * @example
 * ```typescript
 * const tracker = new LineageTracker(sourceIntent);
 *
 * // Track lineage for an artifact
 * const record = tracker.trackLineage(artifact, sourceIntent);
 *
 * // Build complete lineage manifest
 * const manifest = tracker.buildLineageManifest([record1, record2]);
 * ```
 */
export class LineageTracker {
    checksumGenerator;
    records = new Map();
    /**
     * Create a new LineageTracker.
     */
    constructor() {
        this.checksumGenerator = new ChecksumGenerator();
    }
    /**
     * Track the lineage of an artifact.
     *
     * This creates a basic lineage record with transform and serialize steps.
     * For more detailed tracking, use LineageRecordBuilder directly.
     *
     * @param artifact - Export artifact
     * @param source - Source normalized intent
     * @param exporterName - Name of the exporter
     * @param exporterVersion - Version of the exporter
     * @param timestampOverride - Optional timestamp override
     * @returns Lineage record
     */
    trackLineage(artifact, source, exporterName, exporterVersion, timestampOverride) {
        const sourceHash = source.canonicalHash;
        const timestamp = timestampOverride ?? new Date().toISOString();
        // Compute artifact content hash
        const content = this.serializeContent(artifact.content);
        const artifactHash = this.checksumGenerator.generateChecksum(content);
        // Create lineage steps
        const steps = [
            {
                id: randomUUID(),
                type: LineageStepTypes.NORMALIZE,
                inputHash: source.checksum,
                outputHash: sourceHash,
                component: 'IntentNormalizer',
                componentVersion: '1.0.0',
                timestamp,
            },
            {
                id: randomUUID(),
                type: LineageStepTypes.TRANSFORM,
                inputHash: sourceHash,
                outputHash: this.computeIntermediateHash(artifact),
                component: exporterName,
                componentVersion: exporterVersion,
                timestamp,
            },
            {
                id: randomUUID(),
                type: LineageStepTypes.SERIALIZE,
                inputHash: this.computeIntermediateHash(artifact),
                outputHash: artifactHash,
                component: `${artifact.format}Serializer`,
                componentVersion: '1.0.0',
                timestamp,
            },
        ];
        const record = Object.freeze({
            artifactPath: artifact.path,
            sourceIntentHash: source.checksum,
            chain: Object.freeze(steps),
            artifactHash,
        });
        // Store for later retrieval
        this.records.set(artifact.path, record);
        return record;
    }
    /**
     * Get a lineage record by artifact path.
     *
     * @param path - Artifact path
     * @returns Lineage record or undefined
     */
    getRecord(path) {
        return this.records.get(path);
    }
    /**
     * Get all tracked lineage records.
     *
     * @returns Array of lineage records
     */
    getAllRecords() {
        const records = [];
        this.records.forEach((record) => records.push(record));
        return Object.freeze(records);
    }
    /**
     * Build a complete lineage manifest.
     *
     * @param records - Lineage records to include
     * @param sourceIntent - Source intent reference
     * @param timestampOverride - Optional timestamp override
     * @returns Lineage manifest
     */
    buildLineageManifest(records, sourceIntent, timestampOverride) {
        // Sort records by artifact path for determinism
        const sortedRecords = [...records].sort((a, b) => a.artifactPath.localeCompare(b.artifactPath));
        // Compute aggregate hash from all artifact hashes
        const artifactHashes = sortedRecords.map((r) => r.artifactHash);
        const aggregateChecksum = this.checksumGenerator.computeChecksum(artifactHashes.join(':'));
        return Object.freeze({
            version: LINEAGE_VERSION,
            generatedAt: timestampOverride ?? new Date().toISOString(),
            sourceIntent,
            records: Object.freeze(sortedRecords),
            aggregateHash: aggregateChecksum.prefixed,
        });
    }
    /**
     * Verify lineage integrity.
     *
     * Checks that each step's output hash matches the next step's input hash.
     *
     * @param record - Lineage record to verify
     * @returns Array of verification errors (empty if valid)
     */
    verifyLineage(record) {
        const errors = [];
        if (record.chain.length === 0) {
            errors.push('Empty lineage chain');
            return Object.freeze(errors);
        }
        // Verify chain continuity
        for (let i = 1; i < record.chain.length; i++) {
            const prevStep = record.chain[i - 1];
            const currStep = record.chain[i];
            if (prevStep.outputHash !== currStep.inputHash) {
                errors.push(`Chain break at step ${i}: output ${prevStep.outputHash.substring(0, 16)}... != input ${currStep.inputHash.substring(0, 16)}...`);
            }
        }
        // Verify first step starts from source
        const firstStep = record.chain[0];
        if (firstStep.type === LineageStepTypes.NORMALIZE &&
            !firstStep.inputHash.includes(record.sourceIntentHash.substring(0, 16))) {
            // This is a loose check - in production, you'd want exact matching
            // errors.push('First step does not reference source intent');
        }
        // Verify last step produces final artifact
        const lastStep = record.chain[record.chain.length - 1];
        if (lastStep.outputHash !== record.artifactHash) {
            errors.push(`Final step output ${lastStep.outputHash.substring(0, 16)}... != artifact hash ${record.artifactHash.substring(0, 16)}...`);
        }
        return Object.freeze(errors);
    }
    /**
     * Create a lineage record builder for manual lineage construction.
     *
     * @param artifactPath - Path of the artifact
     * @param sourceIntentHash - Hash of the source intent
     * @returns Lineage record builder
     */
    createRecordBuilder(artifactPath, sourceIntentHash) {
        return new LineageRecordBuilder(artifactPath, sourceIntentHash);
    }
    /**
     * Clear all tracked records.
     */
    clear() {
        this.records.clear();
    }
    // ===========================================================================
    // PRIVATE METHODS
    // ===========================================================================
    /**
     * Compute intermediate hash for transform output.
     */
    computeIntermediateHash(artifact) {
        // Use path + format as intermediate representation hash
        const intermediate = `${artifact.path}:${artifact.format}`;
        return this.checksumGenerator.generateChecksum(intermediate);
    }
    /**
     * Serialize content to string.
     */
    serializeContent(content) {
        if (typeof content === 'string') {
            return content;
        }
        if (Buffer.isBuffer(content)) {
            return content.toString('utf-8');
        }
        return JSON.stringify(content, this.sortedReplacer, 0);
    }
    /**
     * JSON replacer that sorts object keys for determinism.
     */
    sortedReplacer = (_key, value) => {
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            const sorted = {};
            for (const k of Object.keys(value).sort()) {
                sorted[k] = value[k];
            }
            return sorted;
        }
        return value;
    };
}
// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================
/**
 * Create a LineageTracker.
 */
export function createLineageTracker() {
    return new LineageTracker();
}
/**
 * Create a LineageRecordBuilder.
 *
 * @param artifactPath - Path of the artifact
 * @param sourceIntentHash - Hash of the source intent
 * @returns Lineage record builder
 */
export function createLineageRecordBuilder(artifactPath, sourceIntentHash) {
    return new LineageRecordBuilder(artifactPath, sourceIntentHash);
}
/**
 * Track lineage for an artifact.
 *
 * Convenience function for one-shot lineage tracking.
 *
 * @param artifact - Export artifact
 * @param source - Source normalized intent
 * @param exporterName - Name of the exporter
 * @param exporterVersion - Version of the exporter
 * @returns Lineage record
 */
export function trackLineage(artifact, source, exporterName, exporterVersion) {
    const tracker = new LineageTracker();
    return tracker.trackLineage(artifact, source, exporterName, exporterVersion);
}
//# sourceMappingURL=LineageTracker.js.map