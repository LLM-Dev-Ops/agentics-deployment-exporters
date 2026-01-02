/**
 * Kubernetes Exporter
 *
 * Transforms normalized DeploymentIntent into Kubernetes YAML manifests.
 * Implements the IExporter interface with deterministic, pure transformations.
 *
 * @module exporters/kubernetes/KubernetesExporter
 * @version 1.0.0
 */
import type { IExporter } from '../../core/interfaces.js';
import type { ExportArtifact, ExporterId, ExportFormat, ExportOptions, NormalizedIntent, SemanticVersion, SerializerType, ValidatedIntent, ValidationResult } from '../../core/types.js';
/**
 * KubernetesExporter transforms normalized DeploymentIntent into Kubernetes manifests.
 *
 * Features:
 * - Deterministic output with sorted keys
 * - RFC 1123 compliant resource names
 * - apiVersion and kind always appear first in output
 * - Pure transformation with no side effects
 *
 * Output Structure:
 * ```
 * kubernetes/
 *   +-- namespace.yaml
 *   +-- deployments/
 *   |     +-- <service-name>-deployment.yaml
 *   +-- services/
 *   |     +-- <service-name>-service.yaml
 *   +-- configmaps/
 *   |     +-- <config-name>-configmap.yaml
 *   +-- secrets/
 *   |     +-- <secret-name>-secret.yaml
 *   +-- ingress/
 *   |     +-- <ingress-name>-ingress.yaml
 *   +-- rbac/
 *         +-- roles.yaml
 *         +-- bindings.yaml
 * ```
 */
export declare class KubernetesExporter implements IExporter {
    /**
     * Unique identifier for this exporter.
     */
    readonly id: ExporterId;
    /**
     * Human-readable name.
     */
    readonly name = "Kubernetes Manifest Exporter";
    /**
     * Exporter version.
     */
    readonly version: SemanticVersion;
    /**
     * Target export format.
     */
    readonly targetFormat: ExportFormat;
    /**
     * Manifest generator instance.
     */
    private readonly manifestGenerator;
    /**
     * Resource quota mapper instance.
     */
    private readonly resourceQuotaMapper;
    /**
     * Create a new KubernetesExporter instance.
     */
    constructor();
    /**
     * Transform a normalized intent into Kubernetes manifest artifacts.
     *
     * @param intent - Normalized, validated DeploymentIntent
     * @param options - Optional export configuration
     * @returns Array of export artifacts containing YAML manifests
     */
    transform(intent: NormalizedIntent, _options?: ExportOptions): readonly ExportArtifact[];
    /**
     * Validate that an intent can be exported.
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
     * Create an export artifact with standard metadata.
     */
    private createArtifact;
    /**
     * Extract service specifications from intent.
     */
    private extractServices;
    /**
     * Extract configuration specifications from intent.
     */
    private extractConfigs;
    /**
     * Extract networking specifications from intent.
     */
    private extractNetworking;
    /**
     * Extract security specifications from intent.
     */
    private extractSecurity;
    /**
     * Extract storage specifications from intent.
     */
    private extractStorage;
    /**
     * Extract scaling specifications from intent.
     */
    private extractScaling;
}
/**
 * Factory function to create a new KubernetesExporter instance.
 */
export declare function createKubernetesExporter(): KubernetesExporter;
//# sourceMappingURL=KubernetesExporter.d.ts.map