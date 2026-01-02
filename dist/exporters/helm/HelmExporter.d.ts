/**
 * Helm Chart Exporter
 *
 * Main exporter implementing IExporter interface for generating Helm charts
 * from NormalizedIntent. Produces deterministic, reproducible Helm chart
 * artifacts following the Helm v3 specification.
 *
 * @module exporters/helm/HelmExporter
 * @version 1.0.0
 */
import type { ExportArtifact, ExporterId, ExportFormat, ExportOptions, NormalizedIntent, SemanticVersion, SerializerType, ValidatedIntent, ValidationResult } from '../../core/types.js';
import type { IExporter } from '../../core/interfaces.js';
/**
 * HelmExporter transforms NormalizedIntent into Helm chart artifacts.
 *
 * The exporter generates a complete Helm chart structure including:
 * - Chart.yaml (chart metadata)
 * - values.yaml (default configuration values)
 * - values.schema.json (JSON Schema for values validation)
 * - templates/ (Kubernetes manifests with Go templating)
 *
 * Design principles:
 * - Deterministic output (same intent = byte-identical chart)
 * - Pure transformation (no side effects, no external dependencies)
 * - Follows Helm v3 best practices
 */
export declare class HelmExporter implements IExporter {
    /**
     * Unique identifier for this exporter.
     */
    readonly id: ExporterId;
    /**
     * Human-readable name.
     */
    readonly name: string;
    /**
     * Exporter version.
     */
    readonly version: SemanticVersion;
    /**
     * Target export format.
     */
    readonly targetFormat: ExportFormat;
    /**
     * Chart generator instance.
     */
    private readonly chartGenerator;
    /**
     * Values mapper instance.
     */
    private readonly valuesMapper;
    /**
     * Template generator instance.
     */
    private readonly templateGenerator;
    /**
     * Create a new HelmExporter instance.
     */
    constructor();
    /**
     * Transform a normalized intent into Helm chart artifacts.
     *
     * Generates a complete Helm chart with all required files.
     * Output is deterministic - same intent always produces identical output.
     *
     * @param intent - Normalized, validated DeploymentIntent
     * @param options - Optional export configuration
     * @returns Array of export artifacts representing the Helm chart
     */
    transform(intent: NormalizedIntent, options?: ExportOptions): readonly ExportArtifact[];
    /**
     * Validate that an intent can be exported by this exporter.
     *
     * Performs Helm-specific validation including:
     * - Resource type compatibility
     * - Required fields presence
     * - Kubernetes-compatible naming
     *
     * @param intent - Intent to validate
     * @returns Validation result with errors/warnings
     */
    validate(intent: ValidatedIntent): ValidationResult;
    /**
     * Check if this exporter can handle the given intent.
     *
     * Quick check for exporter selection. Returns true if the intent
     * contains resources that can be exported to Helm chart format.
     *
     * @param intent - Intent to check
     * @returns true if this exporter can handle the intent
     */
    canHandle(intent: ValidatedIntent): boolean;
    /**
     * Get the serializers required by this exporter.
     *
     * Helm charts require YAML for most files and JSON for the schema.
     *
     * @returns Array of serializer types needed
     */
    getRequiredSerializers(): readonly SerializerType[];
    /**
     * Extract Helm-specific options from generic export options.
     *
     * @param options - Generic export options
     * @returns Helm export options
     */
    private extractHelmOptions;
    /**
     * Sanitize a name for Helm chart naming conventions.
     *
     * @param name - Input name
     * @returns Sanitized chart name
     */
    private sanitizeChartName;
    /**
     * Check if a resource type is compatible with Helm export.
     *
     * @param resourceType - Resource type URN
     * @returns true if compatible
     */
    private isCompatibleResourceType;
    /**
     * Check if a name is valid for Kubernetes.
     *
     * @param name - Name to validate
     * @returns true if valid
     */
    private isValidKubernetesName;
    /**
     * Check if a version string is valid semver.
     *
     * @param version - Version string
     * @returns true if valid semver
     */
    private isValidSemver;
    /**
     * Create a single export artifact.
     *
     * @param path - Relative path for the artifact
     * @param content - Artifact content
     * @param format - Serializer format
     * @param metadata - Additional metadata
     * @returns Export artifact
     */
    private createArtifact;
    /**
     * Create artifacts for all templates.
     *
     * @param basePath - Base path for chart
     * @param templates - Generated templates
     * @returns Array of template artifacts
     */
    private createTemplateArtifacts;
    /**
     * Create a template artifact with raw content (not to be serialized).
     *
     * @param path - Template file path
     * @param content - Raw template content
     * @returns Export artifact
     */
    private createTemplateArtifact;
}
/**
 * Create a new HelmExporter instance.
 *
 * Factory function for creating exporter instances.
 *
 * @returns New HelmExporter instance
 */
export declare function createHelmExporter(): IExporter;
//# sourceMappingURL=HelmExporter.d.ts.map