/**
 * Values Mapper for Helm Charts
 *
 * Generates deterministic values.yaml and values.schema.json from NormalizedIntent.
 * All configurable parameters are extracted and exposed as Helm values.
 *
 * @module exporters/helm/ValuesMapper
 * @version 1.0.0
 */
import type { NormalizedIntent } from '../../core/types.js';
import type { HelmValues, HelmValuesSchema } from './types.js';
/**
 * ValuesMapper generates Helm values.yaml and values.schema.json from NormalizedIntent.
 *
 * Design principles:
 * - Deterministic output (sorted keys, consistent formatting)
 * - All configurable parameters extracted from intent
 * - JSON Schema generated alongside values for validation
 */
export declare class ValuesMapper {
    /**
     * Generate Helm values.yaml content from normalized intent.
     *
     * @param intent - Normalized deployment intent
     * @returns HelmValues structure ready for serialization
     */
    generateValues(intent: NormalizedIntent): HelmValues;
    /**
     * Generate JSON Schema for values.yaml validation.
     *
     * @param intent - Normalized deployment intent
     * @returns JSON Schema for values validation
     */
    generateValuesSchema(intent: NormalizedIntent): HelmValuesSchema;
    /**
     * Find the primary compute/deployment resource from the intent.
     *
     * @param intent - Normalized intent
     * @returns Primary resource or undefined
     */
    private findPrimaryResource;
    /**
     * Extract replica count from properties or scaling config.
     *
     * @param props - Resource properties
     * @param scaling - Scaling configuration
     * @returns Replica count
     */
    private extractReplicaCount;
    /**
     * Extract image pull secrets from properties.
     *
     * @param props - Resource properties
     * @returns Array of image pull secret references
     */
    private extractImagePullSecrets;
    /**
     * Extract pod annotations from properties and intent metadata.
     *
     * @param props - Resource properties
     * @param intent - Normalized intent
     * @returns Pod annotations
     */
    private extractPodAnnotations;
    /**
     * Extract pod labels from properties and intent metadata.
     *
     * @param props - Resource properties
     * @param _intent - Normalized intent (unused but kept for API consistency)
     * @returns Pod labels
     */
    private extractPodLabels;
    /**
     * Extract pod security context from security config.
     *
     * @param security - Security configuration
     * @returns Pod security context or undefined
     */
    private extractPodSecurityContext;
    /**
     * Extract container security context from security config.
     *
     * @param security - Security configuration
     * @returns Container security context
     */
    private extractSecurityContext;
    /**
     * Extract ingress configuration from networking config.
     *
     * @param networking - Networking configuration
     * @returns Ingress configuration
     */
    private extractIngress;
    /**
     * Extract autoscaling configuration from scaling config.
     *
     * @param scaling - Scaling configuration
     * @returns Autoscaling configuration
     */
    private extractAutoscaling;
    /**
     * Extract node selector from properties.
     *
     * @param props - Resource properties
     * @returns Node selector or undefined
     */
    private extractNodeSelector;
    /**
     * Extract tolerations from properties.
     *
     * @param props - Resource properties
     * @returns Tolerations array or undefined
     */
    private extractTolerations;
    /**
     * Extract affinity from properties.
     *
     * @param props - Resource properties
     * @returns Affinity configuration or undefined
     */
    private extractAffinity;
    /**
     * Extract volume mounts from properties.
     *
     * @param props - Resource properties
     * @returns Volume mounts array or undefined
     */
    private extractVolumeMounts;
    /**
     * Extract volumes from properties.
     *
     * @param props - Resource properties
     * @returns Volumes array or undefined
     */
    private extractVolumes;
    /**
     * Clean values object by removing undefined/empty properties.
     *
     * @param values - Values object to clean
     * @returns Cleaned values object
     */
    private cleanValues;
}
//# sourceMappingURL=ValuesMapper.d.ts.map