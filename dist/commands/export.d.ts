/**
 * Export Command with Executive Synthesis Integration
 *
 * This module provides export operations for generating infrastructure-as-code
 * artifacts with integrated executive synthesis for artifact validation.
 *
 * ## Features
 *
 * - Multi-format export (Terraform, Kubernetes, Helm)
 * - Artifact validation with blocking issue detection
 * - Production risk elevation for sensitive exports
 * - Executive summary generation for approval workflows
 *
 * @module commands/export
 * @version 1.0.0
 */
import type { ExecutiveSummary, RiskLevel } from '../synthesis/index.js';
/**
 * Supported export formats.
 */
export declare const ExportFormatValues: readonly ["terraform", "kubernetes", "helm", "cloudformation"];
export type ExportFormat = (typeof ExportFormatValues)[number];
/**
 * Export command input configuration.
 */
export interface ExportInput {
    /** Source intent path or object */
    readonly source: string | Record<string, unknown>;
    /** Target export formats */
    readonly formats: readonly ExportFormat[];
    /** Target environment for the export */
    readonly environment?: string;
    /** Output directory */
    readonly outputDir?: string;
    /** Export options */
    readonly options?: ExportOptions;
}
/**
 * Export options.
 */
export interface ExportOptions {
    /** Validate artifacts after generation */
    readonly validate?: boolean;
    /** Include metadata in artifacts */
    readonly includeMetadata?: boolean;
    /** Pretty print output */
    readonly prettyPrint?: boolean;
    /** Strict mode - fail on warnings */
    readonly strict?: boolean;
    /** Maximum concurrent exports */
    readonly concurrency?: number;
    /** Dry run - validate only */
    readonly dryRun?: boolean;
}
/**
 * Single exported artifact.
 */
export interface ExportArtifact {
    /** Artifact file path */
    readonly path: string;
    /** Artifact content */
    readonly content: unknown;
    /** Export format */
    readonly format: ExportFormat;
    /** Content checksum */
    readonly checksum?: string;
    /** Size in bytes */
    readonly sizeBytes?: number;
}
/**
 * Export validation issue.
 */
export interface ExportValidationIssue {
    /** Issue severity */
    readonly severity: 'error' | 'warning';
    /** Issue code */
    readonly code: string;
    /** Issue message */
    readonly message: string;
    /** Affected artifact path */
    readonly artifactPath?: string;
    /** Location in artifact */
    readonly location?: string;
}
/**
 * Export step log entry.
 */
export interface ExportStepLog {
    /** Step name */
    readonly step: string;
    /** Step status */
    readonly status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    /** Timestamp */
    readonly timestamp: string;
    /** Duration in milliseconds */
    readonly durationMs?: number;
    /** Artifacts produced in this step */
    readonly artifactsProduced?: number;
    /** Error message if failed */
    readonly error?: string;
}
/**
 * Base result for export operations.
 */
export interface ExportCommandResult {
    /** Whether the export succeeded */
    readonly success: boolean;
    /** Error message if failed */
    readonly error?: string;
    /** Generated artifacts */
    readonly artifacts: readonly ExportArtifact[];
    /** Validation issues */
    readonly issues: readonly ExportValidationIssue[];
    /** Execution synthesis */
    readonly synthesis?: ExecutiveSummary;
}
/**
 * Result of a local export operation.
 */
export interface LocalExportResult extends ExportCommandResult {
    /** Output directory */
    readonly outputDir: string;
    /** Execution logs */
    readonly logs: readonly ExportStepLog[];
    /** Export metadata */
    readonly metadata: ExportMetadata;
}
/**
 * Export metadata.
 */
export interface ExportMetadata {
    /** Export session ID */
    readonly exportId: string;
    /** Start timestamp */
    readonly startedAt: string;
    /** Completion timestamp */
    readonly completedAt: string;
    /** Duration in milliseconds */
    readonly durationMs: number;
    /** Formats exported */
    readonly formats: readonly ExportFormat[];
    /** Total artifact count */
    readonly artifactCount: number;
    /** Total size in bytes */
    readonly totalSizeBytes: number;
}
/**
 * Type guard for ExportFormat.
 */
export declare function isExportFormat(value: unknown): value is ExportFormat;
/**
 * Determines environment from export input.
 */
export declare function determineExportEnvironment(input: ExportInput): string;
/**
 * Checks if export targets production infrastructure.
 */
export declare function isProductionExport(input: ExportInput): boolean;
/**
 * Detects secrets in artifact content.
 */
export declare function detectSecrets(content: unknown): readonly string[];
/**
 * Detects invalid resource references in artifact content.
 */
export declare function detectInvalidReferences(content: unknown): readonly string[];
/**
 * Checks for missing required fields based on format.
 */
export declare function detectMissingFields(content: unknown, format: ExportFormat): readonly string[];
/**
 * Validates a single artifact and returns blocking issues.
 */
export declare function validateArtifact(artifact: ExportArtifact): readonly string[];
/**
 * Extracts all blocking issues from export result.
 */
export declare function extractExportBlockingIssues(result: {
    artifacts?: readonly ExportArtifact[];
    issues?: readonly ExportValidationIssue[];
    error?: string;
}): readonly string[];
/**
 * Calculates export success rate.
 */
export declare function calculateExportSuccessRate(result: {
    artifacts?: readonly ExportArtifact[];
    logs?: readonly ExportStepLog[];
}): number;
/**
 * Counts failed iterations in export.
 */
export declare function countExportFailures(result: {
    logs?: readonly ExportStepLog[];
    issues?: readonly ExportValidationIssue[];
}): number;
/**
 * Determines risk level for export based on format and environment.
 */
export declare function assessExportRisk(input: ExportInput, result: {
    artifacts?: readonly ExportArtifact[];
    issues?: readonly ExportValidationIssue[];
}): RiskLevel;
/**
 * Exports intent to infrastructure-as-code artifacts.
 * Generates synthesis for artifact validation and approval workflows.
 *
 * @param input - Export input configuration
 * @returns Export result with synthesis
 */
export declare function exportArtifacts(input: ExportInput): Promise<LocalExportResult>;
/**
 * Exports to Terraform format only.
 */
export declare function exportTerraform(source: ExportInput['source'], options?: ExportOptions & {
    environment?: string;
    outputDir?: string;
}): Promise<LocalExportResult>;
/**
 * Exports to Kubernetes format only.
 */
export declare function exportKubernetes(source: ExportInput['source'], options?: ExportOptions & {
    environment?: string;
    outputDir?: string;
}): Promise<LocalExportResult>;
/**
 * Exports to Helm format only.
 */
export declare function exportHelm(source: ExportInput['source'], options?: ExportOptions & {
    environment?: string;
    outputDir?: string;
}): Promise<LocalExportResult>;
/**
 * Exports to all supported formats.
 */
export declare function exportAll(source: ExportInput['source'], options?: ExportOptions & {
    environment?: string;
    outputDir?: string;
}): Promise<LocalExportResult>;
declare const _default: {
    exportArtifacts: typeof exportArtifacts;
    exportTerraform: typeof exportTerraform;
    exportKubernetes: typeof exportKubernetes;
    exportHelm: typeof exportHelm;
    exportAll: typeof exportAll;
    isExportFormat: typeof isExportFormat;
    determineExportEnvironment: typeof determineExportEnvironment;
    isProductionExport: typeof isProductionExport;
    detectSecrets: typeof detectSecrets;
    detectInvalidReferences: typeof detectInvalidReferences;
    detectMissingFields: typeof detectMissingFields;
    validateArtifact: typeof validateArtifact;
    extractExportBlockingIssues: typeof extractExportBlockingIssues;
    calculateExportSuccessRate: typeof calculateExportSuccessRate;
    countExportFailures: typeof countExportFailures;
    assessExportRisk: typeof assessExportRisk;
};
export default _default;
//# sourceMappingURL=export.d.ts.map