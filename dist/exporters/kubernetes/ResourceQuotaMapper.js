/**
 * Kubernetes Resource Quota Mapper
 *
 * Maps intent resource specifications to Kubernetes resource requirements,
 * quotas, and limit ranges. Ensures deterministic output with stable ordering.
 *
 * @module exporters/kubernetes/ResourceQuotaMapper
 * @version 1.0.0
 */
// =============================================================================
// CONSTANTS
// =============================================================================
/**
 * Default resource values when not specified.
 */
const RESOURCE_DEFAULTS = {
    cpu: {
        request: '100m',
        limit: '500m',
        min: '50m',
        max: '2',
    },
    memory: {
        request: '128Mi',
        limit: '256Mi',
        min: '64Mi',
        max: '2Gi',
    },
};
/**
 * CPU unit multipliers for conversion.
 */
const CPU_UNITS = {
    m: 0.001,
    '': 1,
};
/**
 * Memory unit multipliers for conversion (to bytes).
 */
const MEMORY_UNITS = {
    Ki: 1024,
    Mi: 1024 ** 2,
    Gi: 1024 ** 3,
    Ti: 1024 ** 4,
    K: 1000,
    M: 1000 ** 2,
    G: 1000 ** 3,
    T: 1000 ** 4,
    '': 1,
};
/**
 * Default managed-by label.
 */
const DEFAULT_MANAGED_BY = 'agentics-deployment-exporters';
// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
/**
 * Sort object keys alphabetically for deterministic output.
 */
function sortKeys(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
        const value = obj[key];
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            sorted[key] = sortKeys(value);
        }
        else if (Array.isArray(value)) {
            sorted[key] = value.map((item) => item !== null && typeof item === 'object' && !Array.isArray(item)
                ? sortKeys(item)
                : item);
        }
        else {
            sorted[key] = value;
        }
    }
    return sorted;
}
/**
 * Parse a CPU value string to millicores.
 * @param value - CPU value (e.g., "100m", "0.5", "2")
 * @returns Value in millicores
 */
function parseCPU(value) {
    const match = value.match(/^(\d+(?:\.\d+)?)(m?)$/);
    if (!match) {
        throw new Error(`Invalid CPU value: ${value}`);
    }
    const [, numStr, unit] = match;
    const num = parseFloat(numStr);
    const multiplier = CPU_UNITS[unit] ?? 1;
    return num * multiplier * 1000; // Convert to millicores
}
/**
 * Parse a memory value string to bytes.
 * @param value - Memory value (e.g., "128Mi", "1Gi", "1000000")
 * @returns Value in bytes
 */
function parseMemory(value) {
    const match = value.match(/^(\d+(?:\.\d+)?)(Ki|Mi|Gi|Ti|K|M|G|T)?$/);
    if (!match) {
        throw new Error(`Invalid memory value: ${value}`);
    }
    const [, numStr, unit] = match;
    const num = parseFloat(numStr);
    const multiplier = MEMORY_UNITS[unit ?? ''] ?? 1;
    return num * multiplier;
}
/**
 * Format millicores to CPU string.
 * @param millicores - Value in millicores
 * @returns Formatted CPU string
 */
function formatCPU(millicores) {
    if (millicores >= 1000 && millicores % 1000 === 0) {
        return `${millicores / 1000}`;
    }
    return `${Math.round(millicores)}m`;
}
/**
 * Format bytes to memory string.
 * @param bytes - Value in bytes
 * @returns Formatted memory string
 */
function formatMemory(bytes) {
    const units = ['Ti', 'Gi', 'Mi', 'Ki'];
    const thresholds = [1024 ** 4, 1024 ** 3, 1024 ** 2, 1024];
    for (let i = 0; i < units.length; i++) {
        const threshold = thresholds[i];
        if (bytes >= threshold && bytes % threshold === 0) {
            return `${bytes / threshold}${units[i]}`;
        }
    }
    return `${bytes}`;
}
/**
 * Validate and normalize a name to RFC 1123 DNS label format.
 */
function toDNSLabel(name) {
    let normalized = name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    if (normalized.length > 63) {
        normalized = normalized.substring(0, 63).replace(/-$/, '');
    }
    return normalized;
}
/**
 * Create sorted labels object.
 */
function createLabels(name, additionalLabels) {
    const labels = {
        'app.kubernetes.io/managed-by': DEFAULT_MANAGED_BY,
        'app.kubernetes.io/name': toDNSLabel(name),
    };
    if (additionalLabels) {
        for (const key of Object.keys(additionalLabels).sort()) {
            labels[key] = additionalLabels[key];
        }
    }
    return sortKeys(labels);
}
// =============================================================================
// RESOURCE QUOTA MAPPER CLASS
// =============================================================================
/**
 * ResourceQuotaMapper handles the conversion of intent resource specifications
 * to Kubernetes resource requirements, quotas, and limit ranges.
 *
 * All output is deterministic with sorted keys and stable ordering.
 */
export class ResourceQuotaMapper {
    /**
     * Map intent resources to Kubernetes resource requirements.
     * @param resources - Intent resource specification
     * @returns K8s resource requirements with requests and limits
     */
    mapResources(resources) {
        if (!resources) {
            return sortKeys({
                limits: sortKeys({
                    cpu: RESOURCE_DEFAULTS.cpu.limit,
                    memory: RESOURCE_DEFAULTS.memory.limit,
                }),
                requests: sortKeys({
                    cpu: RESOURCE_DEFAULTS.cpu.request,
                    memory: RESOURCE_DEFAULTS.memory.request,
                }),
            });
        }
        const cpuRequest = resources.cpu ?? RESOURCE_DEFAULTS.cpu.request;
        const memoryRequest = resources.memory ?? RESOURCE_DEFAULTS.memory.request;
        const cpuLimit = resources.cpuLimit ?? this.calculateLimit(cpuRequest, 'cpu');
        const memoryLimit = resources.memoryLimit ?? this.calculateLimit(memoryRequest, 'memory');
        return sortKeys({
            limits: sortKeys({
                cpu: cpuLimit,
                memory: memoryLimit,
            }),
            requests: sortKeys({
                cpu: cpuRequest,
                memory: memoryRequest,
            }),
        });
    }
    /**
     * Generate a ResourceQuota from a normalized intent.
     * @param intent - Normalized deployment intent
     * @returns K8s ResourceQuota resource
     */
    generateResourceQuota(intent) {
        const name = toDNSLabel(`${intent.intentId}-quota`);
        const namespace = toDNSLabel(intent.intentId);
        // Calculate total resources based on all services in the intent
        const totalResources = this.calculateTotalResources(intent);
        // Build hard limits only with defined values
        const hard = {
            'configmaps': '20',
            'persistentvolumeclaims': '10',
            'pods': this.estimatePodCount(intent).toString(),
            'secrets': '20',
            'services': '10',
        };
        if (totalResources.limits?.cpu) {
            hard['limits.cpu'] = totalResources.limits.cpu;
        }
        if (totalResources.limits?.memory) {
            hard['limits.memory'] = totalResources.limits.memory;
        }
        if (totalResources.requests?.cpu) {
            hard['requests.cpu'] = totalResources.requests.cpu;
        }
        if (totalResources.requests?.memory) {
            hard['requests.memory'] = totalResources.requests.memory;
        }
        return sortKeys({
            apiVersion: 'v1',
            kind: 'ResourceQuota',
            metadata: {
                name,
                namespace,
                labels: createLabels(name, {
                    'app.kubernetes.io/instance': intent.intentId,
                }),
            },
            spec: {
                hard: sortKeys(hard),
            },
        });
    }
    /**
     * Generate a LimitRange from a normalized intent.
     * @param intent - Normalized deployment intent
     * @returns K8s LimitRange resource
     */
    generateLimitRange(intent) {
        const name = toDNSLabel(`${intent.intentId}-limits`);
        const namespace = toDNSLabel(intent.intentId);
        const containerLimits = this.calculateContainerLimits(intent);
        const podLimits = this.calculatePodLimits(intent);
        const limits = [
            sortKeys({
                type: 'Container',
                default: containerLimits.default,
                defaultRequest: containerLimits.defaultRequest,
                max: containerLimits.max,
                min: containerLimits.min,
            }),
            sortKeys({
                type: 'Pod',
                max: podLimits.max,
                min: podLimits.min,
            }),
        ];
        return sortKeys({
            apiVersion: 'v1',
            kind: 'LimitRange',
            metadata: {
                name,
                namespace,
                labels: createLabels(name, {
                    'app.kubernetes.io/instance': intent.intentId,
                }),
            },
            spec: {
                limits,
            },
        });
    }
    /**
     * Calculate aggregated resource requirements for multiple services.
     * @param services - Array of service resource specs
     * @returns Aggregated K8s resource requirements
     */
    aggregateResources(services) {
        let totalCPURequest = 0;
        let totalCPULimit = 0;
        let totalMemoryRequest = 0;
        let totalMemoryLimit = 0;
        for (const service of services) {
            const resources = this.mapResources(service);
            if (resources.requests?.cpu) {
                totalCPURequest += parseCPU(resources.requests.cpu);
            }
            if (resources.limits?.cpu) {
                totalCPULimit += parseCPU(resources.limits.cpu);
            }
            if (resources.requests?.memory) {
                totalMemoryRequest += parseMemory(resources.requests.memory);
            }
            if (resources.limits?.memory) {
                totalMemoryLimit += parseMemory(resources.limits.memory);
            }
        }
        return sortKeys({
            limits: sortKeys({
                cpu: formatCPU(totalCPULimit),
                memory: formatMemory(totalMemoryLimit),
            }),
            requests: sortKeys({
                cpu: formatCPU(totalCPURequest),
                memory: formatMemory(totalMemoryRequest),
            }),
        });
    }
    /**
     * Validate that resource requirements are within quota limits.
     * @param requirements - Resource requirements to validate
     * @param quota - Resource quota to check against
     * @returns True if requirements are within quota
     */
    validateAgainstQuota(requirements, quota) {
        const hard = quota.spec.hard;
        if (!hard) {
            return true;
        }
        // Check CPU limits
        if (hard['limits.cpu'] && requirements.limits?.cpu) {
            const quotaCPU = parseCPU(hard['limits.cpu']);
            const reqCPU = parseCPU(requirements.limits.cpu);
            if (reqCPU > quotaCPU) {
                return false;
            }
        }
        // Check memory limits
        if (hard['limits.memory'] && requirements.limits?.memory) {
            const quotaMemory = parseMemory(hard['limits.memory']);
            const reqMemory = parseMemory(requirements.limits.memory);
            if (reqMemory > quotaMemory) {
                return false;
            }
        }
        // Check CPU requests
        if (hard['requests.cpu'] && requirements.requests?.cpu) {
            const quotaCPU = parseCPU(hard['requests.cpu']);
            const reqCPU = parseCPU(requirements.requests.cpu);
            if (reqCPU > quotaCPU) {
                return false;
            }
        }
        // Check memory requests
        if (hard['requests.memory'] && requirements.requests?.memory) {
            const quotaMemory = parseMemory(hard['requests.memory']);
            const reqMemory = parseMemory(requirements.requests.memory);
            if (reqMemory > quotaMemory) {
                return false;
            }
        }
        return true;
    }
    /**
     * Validate that resource requirements are within limit range.
     * @param requirements - Resource requirements to validate
     * @param limitRange - Limit range to check against
     * @returns True if requirements are within range
     */
    validateAgainstLimitRange(requirements, limitRange) {
        const containerLimit = limitRange.spec.limits.find((l) => l.type === 'Container');
        if (!containerLimit) {
            return true;
        }
        // Check min CPU
        if (containerLimit.min?.cpu && requirements.requests?.cpu) {
            const minCPU = parseCPU(containerLimit.min.cpu);
            const reqCPU = parseCPU(requirements.requests.cpu);
            if (reqCPU < minCPU) {
                return false;
            }
        }
        // Check max CPU
        if (containerLimit.max?.cpu && requirements.limits?.cpu) {
            const maxCPU = parseCPU(containerLimit.max.cpu);
            const limCPU = parseCPU(requirements.limits.cpu);
            if (limCPU > maxCPU) {
                return false;
            }
        }
        // Check min memory
        if (containerLimit.min?.memory && requirements.requests?.memory) {
            const minMemory = parseMemory(containerLimit.min.memory);
            const reqMemory = parseMemory(requirements.requests.memory);
            if (reqMemory < minMemory) {
                return false;
            }
        }
        // Check max memory
        if (containerLimit.max?.memory && requirements.limits?.memory) {
            const maxMemory = parseMemory(containerLimit.max.memory);
            const limMemory = parseMemory(requirements.limits.memory);
            if (limMemory > maxMemory) {
                return false;
            }
        }
        return true;
    }
    // ===========================================================================
    // PRIVATE HELPER METHODS
    // ===========================================================================
    /**
     * Calculate a limit from a request value.
     * Applies a multiplier based on resource type.
     */
    calculateLimit(request, type) {
        if (type === 'cpu') {
            const millicores = parseCPU(request);
            // Limit is typically 2-5x the request
            return formatCPU(millicores * 2);
        }
        else {
            const bytes = parseMemory(request);
            // Memory limit is typically 1.5-2x the request
            return formatMemory(bytes * 2);
        }
    }
    /**
     * Calculate total resources across all services in an intent.
     */
    calculateTotalResources(intent) {
        // Extract resources from intent spec
        const resources = intent.spec.resources;
        const serviceResources = [];
        for (const resource of resources) {
            if (resource.properties) {
                const props = resource.properties;
                if (props.resources) {
                    serviceResources.push(props.resources);
                }
                else {
                    // Add default resources
                    serviceResources.push(undefined);
                }
            }
        }
        // If no services found, return defaults multiplied
        if (serviceResources.length === 0) {
            return sortKeys({
                limits: sortKeys({
                    cpu: '4',
                    memory: '4Gi',
                }),
                requests: sortKeys({
                    cpu: '2',
                    memory: '2Gi',
                }),
            });
        }
        const aggregated = this.aggregateResources(serviceResources);
        // Add 50% headroom for quota
        const limitCPU = parseCPU(aggregated.limits?.cpu ?? '500m');
        const limitMemory = parseMemory(aggregated.limits?.memory ?? '256Mi');
        const requestCPU = parseCPU(aggregated.requests?.cpu ?? '100m');
        const requestMemory = parseMemory(aggregated.requests?.memory ?? '128Mi');
        return sortKeys({
            limits: sortKeys({
                cpu: formatCPU(Math.ceil(limitCPU * 1.5)),
                memory: formatMemory(Math.ceil(limitMemory * 1.5)),
            }),
            requests: sortKeys({
                cpu: formatCPU(Math.ceil(requestCPU * 1.5)),
                memory: formatMemory(Math.ceil(requestMemory * 1.5)),
            }),
        });
    }
    /**
     * Estimate the pod count from an intent.
     */
    estimatePodCount(intent) {
        const resources = intent.spec.resources;
        let podCount = 0;
        for (const resource of resources) {
            if (resource.properties) {
                const props = resource.properties;
                const replicas = typeof props.replicas === 'number' ? props.replicas : 1;
                podCount += replicas;
            }
        }
        // Minimum of 10 pods, with 50% headroom
        return Math.max(10, Math.ceil(podCount * 1.5));
    }
    /**
     * Calculate container limit range based on intent.
     */
    calculateContainerLimits(intent) {
        // Extract max resource usage from intent
        let maxCPU = parseCPU(RESOURCE_DEFAULTS.cpu.limit);
        let maxMemory = parseMemory(RESOURCE_DEFAULTS.memory.limit);
        for (const resource of intent.spec.resources) {
            if (resource.properties) {
                const props = resource.properties;
                if (props.resources) {
                    const res = props.resources;
                    if (res.cpuLimit) {
                        const cpu = parseCPU(res.cpuLimit);
                        maxCPU = Math.max(maxCPU, cpu);
                    }
                    if (res.memoryLimit) {
                        const memory = parseMemory(res.memoryLimit);
                        maxMemory = Math.max(maxMemory, memory);
                    }
                }
            }
        }
        // Add 50% headroom for max limits
        maxCPU = Math.ceil(maxCPU * 1.5);
        maxMemory = Math.ceil(maxMemory * 1.5);
        return {
            default: sortKeys({
                cpu: RESOURCE_DEFAULTS.cpu.limit,
                memory: RESOURCE_DEFAULTS.memory.limit,
            }),
            defaultRequest: sortKeys({
                cpu: RESOURCE_DEFAULTS.cpu.request,
                memory: RESOURCE_DEFAULTS.memory.request,
            }),
            max: sortKeys({
                cpu: formatCPU(maxCPU),
                memory: formatMemory(maxMemory),
            }),
            min: sortKeys({
                cpu: RESOURCE_DEFAULTS.cpu.min,
                memory: RESOURCE_DEFAULTS.memory.min,
            }),
        };
    }
    /**
     * Calculate pod limit range based on intent.
     */
    calculatePodLimits(intent) {
        const containerLimits = this.calculateContainerLimits(intent);
        // Pod max is typically 4x container max (assuming up to 4 containers per pod)
        const maxCPU = parseCPU(containerLimits.max.cpu ?? '1') * 4;
        const maxMemory = parseMemory(containerLimits.max.memory ?? '512Mi') * 4;
        return {
            max: sortKeys({
                cpu: formatCPU(maxCPU),
                memory: formatMemory(maxMemory),
            }),
            min: sortKeys({
                cpu: RESOURCE_DEFAULTS.cpu.min,
                memory: RESOURCE_DEFAULTS.memory.min,
            }),
        };
    }
}
/**
 * Singleton instance for the resource quota mapper.
 */
export const resourceQuotaMapper = new ResourceQuotaMapper();
// =============================================================================
// EXPORTS
// =============================================================================
export { parseCPU, parseMemory, formatCPU, formatMemory, };
//# sourceMappingURL=ResourceQuotaMapper.js.map