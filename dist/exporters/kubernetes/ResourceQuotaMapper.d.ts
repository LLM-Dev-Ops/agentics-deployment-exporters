/**
 * Kubernetes Resource Quota Mapper
 *
 * Maps intent resource specifications to Kubernetes resource requirements,
 * quotas, and limit ranges. Ensures deterministic output with stable ordering.
 *
 * @module exporters/kubernetes/ResourceQuotaMapper
 * @version 1.0.0
 */
import type { NormalizedIntent } from '../../core/types.js';
import type { K8sLimitRange, K8sResourceQuota, K8sResourceRequirements, IntentResourceSpec } from './types.js';
/**
 * Parse a CPU value string to millicores.
 * @param value - CPU value (e.g., "100m", "0.5", "2")
 * @returns Value in millicores
 */
declare function parseCPU(value: string): number;
/**
 * Parse a memory value string to bytes.
 * @param value - Memory value (e.g., "128Mi", "1Gi", "1000000")
 * @returns Value in bytes
 */
declare function parseMemory(value: string): number;
/**
 * Format millicores to CPU string.
 * @param millicores - Value in millicores
 * @returns Formatted CPU string
 */
declare function formatCPU(millicores: number): string;
/**
 * Format bytes to memory string.
 * @param bytes - Value in bytes
 * @returns Formatted memory string
 */
declare function formatMemory(bytes: number): string;
/**
 * ResourceQuotaMapper handles the conversion of intent resource specifications
 * to Kubernetes resource requirements, quotas, and limit ranges.
 *
 * All output is deterministic with sorted keys and stable ordering.
 */
export declare class ResourceQuotaMapper {
    /**
     * Map intent resources to Kubernetes resource requirements.
     * @param resources - Intent resource specification
     * @returns K8s resource requirements with requests and limits
     */
    mapResources(resources?: IntentResourceSpec): K8sResourceRequirements;
    /**
     * Generate a ResourceQuota from a normalized intent.
     * @param intent - Normalized deployment intent
     * @returns K8s ResourceQuota resource
     */
    generateResourceQuota(intent: NormalizedIntent): K8sResourceQuota;
    /**
     * Generate a LimitRange from a normalized intent.
     * @param intent - Normalized deployment intent
     * @returns K8s LimitRange resource
     */
    generateLimitRange(intent: NormalizedIntent): K8sLimitRange;
    /**
     * Calculate aggregated resource requirements for multiple services.
     * @param services - Array of service resource specs
     * @returns Aggregated K8s resource requirements
     */
    aggregateResources(services: readonly (IntentResourceSpec | undefined)[]): K8sResourceRequirements;
    /**
     * Validate that resource requirements are within quota limits.
     * @param requirements - Resource requirements to validate
     * @param quota - Resource quota to check against
     * @returns True if requirements are within quota
     */
    validateAgainstQuota(requirements: K8sResourceRequirements, quota: K8sResourceQuota): boolean;
    /**
     * Validate that resource requirements are within limit range.
     * @param requirements - Resource requirements to validate
     * @param limitRange - Limit range to check against
     * @returns True if requirements are within range
     */
    validateAgainstLimitRange(requirements: K8sResourceRequirements, limitRange: K8sLimitRange): boolean;
    /**
     * Calculate a limit from a request value.
     * Applies a multiplier based on resource type.
     */
    private calculateLimit;
    /**
     * Calculate total resources across all services in an intent.
     */
    private calculateTotalResources;
    /**
     * Estimate the pod count from an intent.
     */
    private estimatePodCount;
    /**
     * Calculate container limit range based on intent.
     */
    private calculateContainerLimits;
    /**
     * Calculate pod limit range based on intent.
     */
    private calculatePodLimits;
}
/**
 * Singleton instance for the resource quota mapper.
 */
export declare const resourceQuotaMapper: ResourceQuotaMapper;
export { parseCPU, parseMemory, formatCPU, formatMemory, };
//# sourceMappingURL=ResourceQuotaMapper.d.ts.map