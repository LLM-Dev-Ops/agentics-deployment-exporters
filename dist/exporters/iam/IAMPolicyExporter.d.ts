/**
 * IAM Policy Exporter
 *
 * Main exporter implementation that transforms NormalizedIntent into
 * IAM policy documents (AWS format). Supports roles, policies, and
 * service accounts.
 *
 * All exports are deterministic and produce byte-identical output for the
 * same input, regardless of execution environment.
 *
 * @module exporters/iam/IAMPolicyExporter
 * @version 1.0.0
 */
import type { ExportArtifact, ExporterId, ExportFormat, ExportOptions, NormalizedIntent, SemanticVersion, SerializerType, ValidatedIntent, ValidationResult } from '../../core/types.js';
import type { IExporter } from '../../core/interfaces.js';
/**
 * Exports deployment intents to IAM policy documents.
 *
 * Generates AWS-compatible IAM policy JSON files including:
 * - Trust policies (AssumeRolePolicyDocument)
 * - Permission policies (inline and standalone)
 * - Service account policies
 *
 * All output is deterministic with sorted keys and stable ordering.
 *
 * @example
 * ```typescript
 * const exporter = new IAMPolicyExporter();
 * const artifacts = exporter.transform(normalizedIntent);
 * // artifacts contains trust-policy.json, permissions-policy.json, etc.
 * ```
 */
export declare class IAMPolicyExporter implements IExporter {
    readonly id: ExporterId;
    readonly name: string;
    readonly version: SemanticVersion;
    readonly targetFormat: ExportFormat;
    /**
     * Transform a normalized intent into IAM policy artifacts.
     *
     * @param intent - Normalized, validated DeploymentIntent
     * @param options - Optional export configuration
     * @returns Array of export artifacts (JSON policy files)
     */
    transform(intent: NormalizedIntent, options?: ExportOptions): readonly ExportArtifact[];
    /**
     * Validate that an intent can be exported by this exporter.
     *
     * @param intent - Intent to validate
     * @returns Validation result with errors/warnings
     */
    validate(intent: ValidatedIntent): ValidationResult;
    /**
     * Check if this exporter can handle the given intent.
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
    /**
     * Extract IAM configuration from intent.
     */
    private extractIAMResources;
    /**
     * Generate artifacts for an IAM role.
     */
    private generateRoleArtifacts;
    /**
     * Generate artifact for a standalone IAM policy.
     */
    private generatePolicyArtifact;
    /**
     * Generate artifacts for a service account.
     */
    private generateServiceAccountArtifacts;
    /**
     * Add traceability metadata to policy document.
     */
    private addTraceabilityToPolicy;
    /**
     * Generate role metadata document.
     */
    private generateRoleMetadata;
    /**
     * Generate service account metadata document.
     */
    private generateServiceAccountMetadata;
}
/**
 * Create a new IAMPolicyExporter instance.
 *
 * @returns New IAMPolicyExporter instance
 */
export declare function createIAMPolicyExporter(): IAMPolicyExporter;
//# sourceMappingURL=IAMPolicyExporter.d.ts.map