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
import type { ExportArtifact, NormalizedIntent, SemanticVersion } from '../../core/types.js';
import type { LineageManifest, LineageRecord, IntentReference } from '../types.js';
/**
 * Standard lineage step types.
 */
export declare const LineageStepTypes: {
    readonly PARSE: "parse";
    readonly VALIDATE: "validate";
    readonly NORMALIZE: "normalize";
    readonly TRANSFORM: "transform";
    readonly SERIALIZE: "serialize";
    readonly PACKAGE: "package";
};
export type LineageStepType = (typeof LineageStepTypes)[keyof typeof LineageStepTypes];
/**
 * Builder for individual lineage records.
 *
 * Used to incrementally build the transformation chain
 * for a single artifact.
 */
export declare class LineageRecordBuilder {
    private readonly artifactPath;
    private readonly sourceIntentHash;
    private readonly steps;
    private readonly checksumGenerator;
    /**
     * Create a new LineageRecordBuilder.
     *
     * @param artifactPath - Path of the artifact being tracked
     * @param sourceIntentHash - Hash of the source intent
     */
    constructor(artifactPath: string, sourceIntentHash: string);
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
    addStep(type: LineageStepType | string, inputHash: string, outputHash: string, component: string, componentVersion: SemanticVersion, timestampOverride?: string): LineageRecordBuilder;
    /**
     * Build the final lineage record.
     *
     * @param artifactHash - Hash of the final artifact
     * @returns Complete lineage record
     */
    build(artifactHash: string): LineageRecord;
    /**
     * Get the current step count.
     */
    getStepCount(): number;
}
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
export declare class LineageTracker {
    private readonly checksumGenerator;
    private readonly records;
    /**
     * Create a new LineageTracker.
     */
    constructor();
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
    trackLineage(artifact: ExportArtifact, source: NormalizedIntent, exporterName: string, exporterVersion: SemanticVersion, timestampOverride?: string): LineageRecord;
    /**
     * Get a lineage record by artifact path.
     *
     * @param path - Artifact path
     * @returns Lineage record or undefined
     */
    getRecord(path: string): LineageRecord | undefined;
    /**
     * Get all tracked lineage records.
     *
     * @returns Array of lineage records
     */
    getAllRecords(): readonly LineageRecord[];
    /**
     * Build a complete lineage manifest.
     *
     * @param records - Lineage records to include
     * @param sourceIntent - Source intent reference
     * @param timestampOverride - Optional timestamp override
     * @returns Lineage manifest
     */
    buildLineageManifest(records: readonly LineageRecord[], sourceIntent: IntentReference, timestampOverride?: string): LineageManifest;
    /**
     * Verify lineage integrity.
     *
     * Checks that each step's output hash matches the next step's input hash.
     *
     * @param record - Lineage record to verify
     * @returns Array of verification errors (empty if valid)
     */
    verifyLineage(record: LineageRecord): readonly string[];
    /**
     * Create a lineage record builder for manual lineage construction.
     *
     * @param artifactPath - Path of the artifact
     * @param sourceIntentHash - Hash of the source intent
     * @returns Lineage record builder
     */
    createRecordBuilder(artifactPath: string, sourceIntentHash: string): LineageRecordBuilder;
    /**
     * Clear all tracked records.
     */
    clear(): void;
    /**
     * Compute intermediate hash for transform output.
     */
    private computeIntermediateHash;
    /**
     * Serialize content to string.
     */
    private serializeContent;
    /**
     * JSON replacer that sorts object keys for determinism.
     */
    private sortedReplacer;
}
/**
 * Create a LineageTracker.
 */
export declare function createLineageTracker(): LineageTracker;
/**
 * Create a LineageRecordBuilder.
 *
 * @param artifactPath - Path of the artifact
 * @param sourceIntentHash - Hash of the source intent
 * @returns Lineage record builder
 */
export declare function createLineageRecordBuilder(artifactPath: string, sourceIntentHash: string): LineageRecordBuilder;
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
export declare function trackLineage(artifact: ExportArtifact, source: NormalizedIntent, exporterName: string, exporterVersion: SemanticVersion): LineageRecord;
//# sourceMappingURL=LineageTracker.d.ts.map