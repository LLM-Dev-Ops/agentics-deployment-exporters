/**
 * Values Mapper for Helm Charts
 *
 * Generates deterministic values.yaml and values.schema.json from NormalizedIntent.
 * All configurable parameters are extracted and exposed as Helm values.
 *
 * @module exporters/helm/ValuesMapper
 * @version 1.0.0
 */
// =============================================================================
// CONSTANTS
// =============================================================================
/**
 * Default resource limits.
 */
const DEFAULT_RESOURCES = {
    limits: {
        cpu: '500m',
        memory: '512Mi',
    },
    requests: {
        cpu: '100m',
        memory: '128Mi',
    },
};
/**
 * Default image pull policy.
 */
const DEFAULT_PULL_POLICY = 'IfNotPresent';
// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
/**
 * Sort object keys alphabetically for deterministic output.
 *
 * @param obj - Object to sort
 * @returns New object with sorted keys
 */
function sortObjectKeys(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b, 'en'));
    for (const key of keys) {
        const value = obj[key];
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            sorted[key] = sortObjectKeys(value);
        }
        else {
            sorted[key] = value;
        }
    }
    return sorted;
}
/**
 * Parse a resource value string to extract numeric and unit parts.
 *
 * @param value - Resource value (e.g., "500m", "512Mi")
 * @returns Parsed value or original string
 */
function parseResourceValue(value) {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number') {
        return String(value);
    }
    return '0';
}
/**
 * Extract image configuration from properties.
 *
 * @param props - Resource properties
 * @returns Image configuration
 */
function extractImageConfig(props) {
    // Direct image string
    if (typeof props['image'] === 'string') {
        return parseImageString(props['image']);
    }
    // Image object
    if (typeof props['image'] === 'object' && props['image'] !== null) {
        const imageObj = props['image'];
        return {
            repository: String(imageObj['repository'] ?? 'nginx'),
            tag: String(imageObj['tag'] ?? 'latest'),
            pullPolicy: imageObj['pullPolicy'] ?? DEFAULT_PULL_POLICY,
        };
    }
    // Container spec with image
    if (typeof props['container'] === 'object' && props['container'] !== null) {
        const container = props['container'];
        if (typeof container['image'] === 'string') {
            return parseImageString(container['image']);
        }
    }
    // Default image
    return {
        repository: 'nginx',
        tag: 'latest',
        pullPolicy: DEFAULT_PULL_POLICY,
    };
}
/**
 * Parse an image string into repository and tag.
 *
 * @param image - Image string (e.g., "nginx:1.21" or "gcr.io/project/app:v1.2.3")
 * @returns Parsed image configuration
 */
function parseImageString(image) {
    // Handle digest format
    if (image.includes('@sha256:')) {
        const [repo] = image.split('@');
        return {
            repository: repo ?? image,
            tag: 'latest',
            pullPolicy: DEFAULT_PULL_POLICY,
        };
    }
    // Find the last colon that represents tag separator
    const lastColonIndex = image.lastIndexOf(':');
    if (lastColonIndex === -1) {
        return {
            repository: image,
            tag: 'latest',
            pullPolicy: DEFAULT_PULL_POLICY,
        };
    }
    const potentialTag = image.slice(lastColonIndex + 1);
    const repository = image.slice(0, lastColonIndex);
    // Check if this is a port number in registry URL
    if (/^\d+$/.test(potentialTag) && repository.includes('/')) {
        return {
            repository: image,
            tag: 'latest',
            pullPolicy: DEFAULT_PULL_POLICY,
        };
    }
    return {
        repository: repository,
        tag: potentialTag,
        pullPolicy: DEFAULT_PULL_POLICY,
    };
}
/**
 * Extract resource limits and requests from properties.
 *
 * @param props - Resource properties
 * @returns Resource configuration
 */
function extractResources(props) {
    const resources = props['resources'];
    if (!resources) {
        return DEFAULT_RESOURCES;
    }
    const limits = resources['limits'];
    const requests = resources['requests'];
    return {
        limits: {
            cpu: parseResourceValue(limits?.['cpu'] ?? DEFAULT_RESOURCES.limits.cpu),
            memory: parseResourceValue(limits?.['memory'] ?? DEFAULT_RESOURCES.limits.memory),
        },
        requests: {
            cpu: parseResourceValue(requests?.['cpu'] ?? DEFAULT_RESOURCES.requests.cpu),
            memory: parseResourceValue(requests?.['memory'] ?? DEFAULT_RESOURCES.requests.memory),
        },
    };
}
/**
 * Extract service configuration from properties.
 *
 * @param props - Resource properties
 * @param networking - Networking config from intent
 * @returns Service configuration
 */
function extractService(props, networking) {
    // Look for port configuration in various places
    let port = 80;
    let serviceType = 'ClusterIP';
    // Check ports array
    const ports = props['ports'];
    if (ports && ports.length > 0) {
        const firstPort = ports[0];
        port = Number(firstPort?.['containerPort'] ?? firstPort?.['port'] ?? 80);
    }
    // Check service config in networking
    if (networking) {
        const service = networking['service'];
        if (service) {
            serviceType = service['type'] ?? serviceType;
            port = Number(service['port'] ?? port);
        }
    }
    // Check direct port property
    if (typeof props['port'] === 'number') {
        port = props['port'];
    }
    return {
        type: serviceType,
        port: port,
        targetPort: port,
    };
}
/**
 * Extract probe configuration from properties.
 *
 * @param props - Resource properties
 * @param probeType - Type of probe (liveness or readiness)
 * @returns Probe configuration or undefined
 */
function extractProbe(props, probeType) {
    const probe = props[probeType];
    if (!probe) {
        return undefined;
    }
    const httpGet = probe['httpGet'];
    return {
        enabled: true,
        path: httpGet?.['path'],
        port: httpGet?.['port'],
        initialDelaySeconds: probe['initialDelaySeconds'],
        periodSeconds: probe['periodSeconds'],
        timeoutSeconds: probe['timeoutSeconds'],
        successThreshold: probe['successThreshold'],
        failureThreshold: probe['failureThreshold'],
    };
}
/**
 * Extract environment variables from properties.
 *
 * @param props - Resource properties
 * @returns Array of environment variable configurations
 */
function extractEnvVars(props) {
    const env = props['env'];
    if (!env || !Array.isArray(env)) {
        return [];
    }
    const result = [];
    for (const e of env) {
        const name = String(e['name'] ?? '');
        if (name.length === 0) {
            continue;
        }
        const entry = { name };
        if (e['value'] !== undefined) {
            entry.value = e['value'];
        }
        if (e['valueFrom'] !== undefined) {
            entry.valueFrom = e['valueFrom'];
        }
        result.push(entry);
    }
    return result.sort((a, b) => a.name.localeCompare(b.name, 'en'));
}
// =============================================================================
// VALUES MAPPER CLASS
// =============================================================================
/**
 * ValuesMapper generates Helm values.yaml and values.schema.json from NormalizedIntent.
 *
 * Design principles:
 * - Deterministic output (sorted keys, consistent formatting)
 * - All configurable parameters extracted from intent
 * - JSON Schema generated alongside values for validation
 */
export class ValuesMapper {
    /**
     * Generate Helm values.yaml content from normalized intent.
     *
     * @param intent - Normalized deployment intent
     * @returns HelmValues structure ready for serialization
     */
    generateValues(intent) {
        // Find the primary compute/deployment resource
        const primaryResource = this.findPrimaryResource(intent);
        const props = primaryResource?.properties ?? {};
        // Extract replica count
        const replicaCount = this.extractReplicaCount(props, intent.spec.scaling);
        // Extract image configuration
        const image = extractImageConfig(props);
        // Extract resource limits/requests
        const resources = extractResources(props);
        // Extract service configuration
        const service = extractService(props, intent.spec.networking);
        // Extract probes
        const livenessProbe = extractProbe(props, 'livenessProbe');
        const readinessProbe = extractProbe(props, 'readinessProbe');
        // Extract environment variables
        const env = extractEnvVars(props);
        // Extract autoscaling configuration
        const autoscaling = this.extractAutoscaling(intent.spec.scaling);
        // Build values object
        const values = {
            replicaCount,
            image,
            imagePullSecrets: this.extractImagePullSecrets(props),
            nameOverride: '',
            fullnameOverride: '',
            serviceAccount: {
                create: true,
                annotations: {},
                name: '',
            },
            podAnnotations: this.extractPodAnnotations(props, intent),
            podLabels: this.extractPodLabels(props, intent),
            podSecurityContext: this.extractPodSecurityContext(intent.spec.security),
            securityContext: this.extractSecurityContext(intent.spec.security),
            service,
            ingress: this.extractIngress(intent.spec.networking),
            resources,
            livenessProbe,
            readinessProbe,
            autoscaling,
            nodeSelector: this.extractNodeSelector(props),
            tolerations: this.extractTolerations(props),
            affinity: this.extractAffinity(props),
            env: env.length > 0 ? env : undefined,
            volumeMounts: this.extractVolumeMounts(props),
            volumes: this.extractVolumes(props),
        };
        // Clean and sort for deterministic output
        const cleanedValues = this.cleanValues(values);
        return sortObjectKeys(cleanedValues);
    }
    /**
     * Generate JSON Schema for values.yaml validation.
     *
     * @param intent - Normalized deployment intent
     * @returns JSON Schema for values validation
     */
    generateValuesSchema(intent) {
        const schema = {
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            title: `Values schema for ${intent.intentId}`,
            description: `JSON Schema for validating Helm values for ${intent.intentId}`,
            properties: {
                replicaCount: {
                    type: 'integer',
                    description: 'Number of replicas to deploy',
                    minimum: 0,
                    default: 1,
                },
                image: {
                    type: 'object',
                    description: 'Container image configuration',
                    properties: {
                        repository: {
                            type: 'string',
                            description: 'Container image repository',
                        },
                        tag: {
                            type: 'string',
                            description: 'Container image tag',
                        },
                        pullPolicy: {
                            type: 'string',
                            description: 'Image pull policy',
                            enum: ['Always', 'IfNotPresent', 'Never'],
                            default: 'IfNotPresent',
                        },
                    },
                    required: ['repository', 'tag'],
                },
                nameOverride: {
                    type: 'string',
                    description: 'Override chart name',
                    default: '',
                },
                fullnameOverride: {
                    type: 'string',
                    description: 'Override full name',
                    default: '',
                },
                serviceAccount: {
                    type: 'object',
                    description: 'Service account configuration',
                    properties: {
                        create: {
                            type: 'boolean',
                            description: 'Create service account',
                            default: true,
                        },
                        annotations: {
                            type: 'object',
                            description: 'Service account annotations',
                            additionalProperties: { type: 'string' },
                        },
                        name: {
                            type: 'string',
                            description: 'Service account name',
                            default: '',
                        },
                    },
                },
                podAnnotations: {
                    type: 'object',
                    description: 'Pod annotations',
                    additionalProperties: { type: 'string' },
                },
                podLabels: {
                    type: 'object',
                    description: 'Pod labels',
                    additionalProperties: { type: 'string' },
                },
                podSecurityContext: {
                    type: 'object',
                    description: 'Pod security context',
                    properties: {
                        runAsUser: { type: 'integer' },
                        runAsGroup: { type: 'integer' },
                        fsGroup: { type: 'integer' },
                        runAsNonRoot: { type: 'boolean' },
                    },
                },
                securityContext: {
                    type: 'object',
                    description: 'Container security context',
                    properties: {
                        allowPrivilegeEscalation: { type: 'boolean', default: false },
                        readOnlyRootFilesystem: { type: 'boolean', default: true },
                        runAsNonRoot: { type: 'boolean', default: true },
                        runAsUser: { type: 'integer' },
                        capabilities: {
                            type: 'object',
                            properties: {
                                drop: { type: 'array', items: { type: 'string' } },
                                add: { type: 'array', items: { type: 'string' } },
                            },
                        },
                    },
                },
                service: {
                    type: 'object',
                    description: 'Service configuration',
                    properties: {
                        type: {
                            type: 'string',
                            description: 'Service type',
                            enum: ['ClusterIP', 'NodePort', 'LoadBalancer', 'ExternalName'],
                            default: 'ClusterIP',
                        },
                        port: {
                            type: 'integer',
                            description: 'Service port',
                            minimum: 1,
                            maximum: 65535,
                        },
                    },
                    required: ['type', 'port'],
                },
                ingress: {
                    type: 'object',
                    description: 'Ingress configuration',
                    properties: {
                        enabled: { type: 'boolean', default: false },
                        className: { type: 'string' },
                        annotations: {
                            type: 'object',
                            additionalProperties: { type: 'string' },
                        },
                        hosts: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    host: { type: 'string' },
                                    paths: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                path: { type: 'string' },
                                                pathType: {
                                                    type: 'string',
                                                    enum: ['Prefix', 'Exact', 'ImplementationSpecific'],
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        tls: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    secretName: { type: 'string' },
                                    hosts: { type: 'array', items: { type: 'string' } },
                                },
                            },
                        },
                    },
                },
                resources: {
                    type: 'object',
                    description: 'Resource limits and requests',
                    properties: {
                        limits: {
                            type: 'object',
                            properties: {
                                cpu: { type: 'string' },
                                memory: { type: 'string' },
                            },
                        },
                        requests: {
                            type: 'object',
                            properties: {
                                cpu: { type: 'string' },
                                memory: { type: 'string' },
                            },
                        },
                    },
                },
                autoscaling: {
                    type: 'object',
                    description: 'Horizontal Pod Autoscaler configuration',
                    properties: {
                        enabled: { type: 'boolean', default: false },
                        minReplicas: { type: 'integer', minimum: 1 },
                        maxReplicas: { type: 'integer', minimum: 1 },
                        targetCPUUtilizationPercentage: { type: 'integer', minimum: 1, maximum: 100 },
                        targetMemoryUtilizationPercentage: { type: 'integer', minimum: 1, maximum: 100 },
                    },
                },
                nodeSelector: {
                    type: 'object',
                    description: 'Node selector for pod scheduling',
                    additionalProperties: { type: 'string' },
                },
                tolerations: {
                    type: 'array',
                    description: 'Pod tolerations',
                    items: { type: 'object' },
                },
                affinity: {
                    type: 'object',
                    description: 'Pod affinity configuration',
                },
                env: {
                    type: 'array',
                    description: 'Environment variables',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            value: { type: 'string' },
                            valueFrom: { type: 'object' },
                        },
                        required: ['name'],
                    },
                },
            },
            required: ['replicaCount', 'image', 'service', 'resources'],
        };
        return sortObjectKeys(schema);
    }
    /**
     * Find the primary compute/deployment resource from the intent.
     *
     * @param intent - Normalized intent
     * @returns Primary resource or undefined
     */
    findPrimaryResource(intent) {
        // Look for deployment-like resources first
        const deploymentTypes = ['deployment', 'container', 'compute', 'workload', 'pod'];
        for (const resource of intent.spec.resources) {
            const typeLower = resource.type.toLowerCase();
            for (const deployType of deploymentTypes) {
                if (typeLower.includes(deployType)) {
                    return resource;
                }
            }
        }
        // Fall back to first resource
        return intent.spec.resources[0];
    }
    /**
     * Extract replica count from properties or scaling config.
     *
     * @param props - Resource properties
     * @param scaling - Scaling configuration
     * @returns Replica count
     */
    extractReplicaCount(props, scaling) {
        // Check direct replicas property
        if (typeof props['replicas'] === 'number') {
            return props['replicas'];
        }
        // Check scaling config
        if (scaling) {
            if (typeof scaling['replicas'] === 'number') {
                return scaling['replicas'];
            }
            if (typeof scaling['minReplicas'] === 'number') {
                return scaling['minReplicas'];
            }
        }
        // Default to 1
        return 1;
    }
    /**
     * Extract image pull secrets from properties.
     *
     * @param props - Resource properties
     * @returns Array of image pull secret references
     */
    extractImagePullSecrets(props) {
        const secrets = props['imagePullSecrets'];
        if (!secrets || !Array.isArray(secrets)) {
            return undefined;
        }
        return secrets
            .map((s) => ({ name: String(s['name'] ?? '') }))
            .filter((s) => s.name.length > 0)
            .sort((a, b) => a.name.localeCompare(b.name, 'en'));
    }
    /**
     * Extract pod annotations from properties and intent metadata.
     *
     * @param props - Resource properties
     * @param intent - Normalized intent
     * @returns Pod annotations
     */
    extractPodAnnotations(props, intent) {
        const annotations = {};
        // Extract from properties
        const propAnnotations = props['annotations'];
        if (propAnnotations) {
            Object.assign(annotations, propAnnotations);
        }
        // Add traceability annotation
        annotations['agentics.io/intent-hash'] = intent.canonicalHash;
        return sortObjectKeys(annotations);
    }
    /**
     * Extract pod labels from properties and intent metadata.
     *
     * @param props - Resource properties
     * @param _intent - Normalized intent (unused but kept for API consistency)
     * @returns Pod labels
     */
    extractPodLabels(props, _intent) {
        const labels = {};
        // Extract from properties
        const propLabels = props['labels'];
        if (propLabels) {
            Object.assign(labels, propLabels);
        }
        return sortObjectKeys(labels);
    }
    /**
     * Extract pod security context from security config.
     *
     * @param security - Security configuration
     * @returns Pod security context or undefined
     */
    extractPodSecurityContext(security) {
        if (!security) {
            return undefined;
        }
        const podSecurity = security['podSecurityContext'];
        if (!podSecurity) {
            return undefined;
        }
        return {
            runAsUser: podSecurity['runAsUser'],
            runAsGroup: podSecurity['runAsGroup'],
            fsGroup: podSecurity['fsGroup'],
            runAsNonRoot: podSecurity['runAsNonRoot'],
        };
    }
    /**
     * Extract container security context from security config.
     *
     * @param security - Security configuration
     * @returns Container security context
     */
    extractSecurityContext(security) {
        // Default secure configuration
        const defaultContext = {
            allowPrivilegeEscalation: false,
            readOnlyRootFilesystem: true,
            runAsNonRoot: true,
            capabilities: {
                drop: ['ALL'],
            },
        };
        if (!security) {
            return defaultContext;
        }
        const containerSecurity = security['securityContext'];
        if (!containerSecurity) {
            return defaultContext;
        }
        return {
            allowPrivilegeEscalation: containerSecurity['allowPrivilegeEscalation'],
            readOnlyRootFilesystem: containerSecurity['readOnlyRootFilesystem'],
            runAsNonRoot: containerSecurity['runAsNonRoot'],
            runAsUser: containerSecurity['runAsUser'],
            capabilities: containerSecurity['capabilities'],
        };
    }
    /**
     * Extract ingress configuration from networking config.
     *
     * @param networking - Networking configuration
     * @returns Ingress configuration
     */
    extractIngress(networking) {
        const defaultIngress = { enabled: false, hosts: [] };
        if (!networking) {
            return defaultIngress;
        }
        const ingress = networking['ingress'];
        if (!ingress) {
            return defaultIngress;
        }
        const hosts = ingress['hosts'];
        const tls = ingress['tls'];
        const result = {
            enabled: ingress['enabled'] ?? false,
            hosts: hosts ?? [],
        };
        // Only add optional fields if they have values
        if (ingress['className'] !== undefined) {
            result.className = ingress['className'];
        }
        if (ingress['annotations'] !== undefined) {
            result.annotations = ingress['annotations'];
        }
        if (tls !== undefined) {
            result.tls = tls;
        }
        return result;
    }
    /**
     * Extract autoscaling configuration from scaling config.
     *
     * @param scaling - Scaling configuration
     * @returns Autoscaling configuration
     */
    extractAutoscaling(scaling) {
        if (!scaling) {
            return {
                enabled: false,
                minReplicas: 1,
                maxReplicas: 10,
            };
        }
        const hpa = scaling['hpa'] ?? scaling;
        return {
            enabled: hpa?.['enabled'] ?? false,
            minReplicas: hpa?.['minReplicas'] ?? 1,
            maxReplicas: hpa?.['maxReplicas'] ?? 10,
            targetCPUUtilizationPercentage: hpa?.['targetCPUUtilizationPercentage'],
            targetMemoryUtilizationPercentage: hpa?.['targetMemoryUtilizationPercentage'],
        };
    }
    /**
     * Extract node selector from properties.
     *
     * @param props - Resource properties
     * @returns Node selector or undefined
     */
    extractNodeSelector(props) {
        const nodeSelector = props['nodeSelector'];
        if (!nodeSelector || Object.keys(nodeSelector).length === 0) {
            return undefined;
        }
        return sortObjectKeys(nodeSelector);
    }
    /**
     * Extract tolerations from properties.
     *
     * @param props - Resource properties
     * @returns Tolerations array or undefined
     */
    extractTolerations(props) {
        const tolerations = props['tolerations'];
        if (!tolerations || tolerations.length === 0) {
            return undefined;
        }
        return tolerations;
    }
    /**
     * Extract affinity from properties.
     *
     * @param props - Resource properties
     * @returns Affinity configuration or undefined
     */
    extractAffinity(props) {
        const affinity = props['affinity'];
        if (!affinity || Object.keys(affinity).length === 0) {
            return undefined;
        }
        return affinity;
    }
    /**
     * Extract volume mounts from properties.
     *
     * @param props - Resource properties
     * @returns Volume mounts array or undefined
     */
    extractVolumeMounts(props) {
        const volumeMounts = props['volumeMounts'];
        if (!volumeMounts || volumeMounts.length === 0) {
            return undefined;
        }
        // Sort by mount path for determinism
        return [...volumeMounts].sort((a, b) => {
            const pathA = String(a['mountPath'] ?? '');
            const pathB = String(b['mountPath'] ?? '');
            return pathA.localeCompare(pathB, 'en');
        });
    }
    /**
     * Extract volumes from properties.
     *
     * @param props - Resource properties
     * @returns Volumes array or undefined
     */
    extractVolumes(props) {
        const volumes = props['volumes'];
        if (!volumes || volumes.length === 0) {
            return undefined;
        }
        // Sort by name for determinism
        return [...volumes].sort((a, b) => {
            const nameA = String(a['name'] ?? '');
            const nameB = String(b['name'] ?? '');
            return nameA.localeCompare(nameB, 'en');
        });
    }
    /**
     * Clean values object by removing undefined/empty properties.
     *
     * @param values - Values object to clean
     * @returns Cleaned values object
     */
    cleanValues(values) {
        const cleaned = {};
        for (const [key, value] of Object.entries(values)) {
            if (value === undefined || value === null) {
                continue;
            }
            if (Array.isArray(value) && value.length === 0) {
                continue;
            }
            if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
                continue;
            }
            cleaned[key] = value;
        }
        return cleaned;
    }
}
//# sourceMappingURL=ValuesMapper.js.map