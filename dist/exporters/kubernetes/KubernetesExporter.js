/**
 * Kubernetes Exporter
 *
 * Transforms normalized DeploymentIntent into Kubernetes YAML manifests.
 * Implements the IExporter interface with deterministic, pure transformations.
 *
 * @module exporters/kubernetes/KubernetesExporter
 * @version 1.0.0
 */
import { ManifestGenerator } from './ManifestGenerator.js';
import { ResourceQuotaMapper } from './ResourceQuotaMapper.js';
// =============================================================================
// CONSTANTS
// =============================================================================
/**
 * Exporter version following semantic versioning.
 */
const EXPORTER_VERSION = '1.0.0';
/**
 * Exporter unique identifier.
 */
const EXPORTER_ID = 'kubernetes';
/**
 * RFC 1123 DNS label regex pattern.
 */
const DNS_LABEL_REGEX = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
/**
 * Sort object keys alphabetically for deterministic output.
 * Ensures apiVersion and kind are always first.
 */
function sortK8sResource(resource) {
    // Create ordered object with apiVersion and kind first
    const ordered = {
        apiVersion: resource.apiVersion,
        kind: resource.kind,
    };
    // Add remaining keys in sorted order
    const remainingKeys = Object.keys(resource)
        .filter((k) => k !== 'apiVersion' && k !== 'kind')
        .sort();
    for (const key of remainingKeys) {
        const value = resource[key];
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            ordered[key] = sortKeysDeep(value);
        }
        else if (Array.isArray(value)) {
            ordered[key] = value.map((item) => item !== null && typeof item === 'object' && !Array.isArray(item)
                ? sortKeysDeep(item)
                : item);
        }
        else {
            ordered[key] = value;
        }
    }
    return ordered;
}
/**
 * Recursively sort object keys.
 */
function sortKeysDeep(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
        const value = obj[key];
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            sorted[key] = sortKeysDeep(value);
        }
        else if (Array.isArray(value)) {
            sorted[key] = value.map((item) => item !== null && typeof item === 'object' && !Array.isArray(item)
                ? sortKeysDeep(item)
                : item);
        }
        else {
            sorted[key] = value;
        }
    }
    return sorted;
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
 * Check if a name is a valid DNS label.
 */
function isValidDNSLabel(name) {
    return DNS_LABEL_REGEX.test(name) && name.length <= 63;
}
// =============================================================================
// KUBERNETES EXPORTER CLASS
// =============================================================================
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
export class KubernetesExporter {
    /**
     * Unique identifier for this exporter.
     */
    id = EXPORTER_ID;
    /**
     * Human-readable name.
     */
    name = 'Kubernetes Manifest Exporter';
    /**
     * Exporter version.
     */
    version = EXPORTER_VERSION;
    /**
     * Target export format.
     */
    targetFormat = 'kubernetes';
    /**
     * Manifest generator instance.
     */
    manifestGenerator;
    /**
     * Resource quota mapper instance.
     */
    resourceQuotaMapper;
    /**
     * Create a new KubernetesExporter instance.
     */
    constructor() {
        this.manifestGenerator = new ManifestGenerator();
        this.resourceQuotaMapper = new ResourceQuotaMapper();
    }
    /**
     * Transform a normalized intent into Kubernetes manifest artifacts.
     *
     * @param intent - Normalized, validated DeploymentIntent
     * @param options - Optional export configuration
     * @returns Array of export artifacts containing YAML manifests
     */
    transform(intent, _options) {
        const artifacts = [];
        const namespace = toDNSLabel(intent.intentId);
        const basePath = 'kubernetes';
        // Extract intent sections
        const services = this.extractServices(intent);
        const configs = this.extractConfigs(intent);
        const networking = this.extractNetworking(intent);
        const security = this.extractSecurity(intent);
        const storage = this.extractStorage(intent);
        const scaling = this.extractScaling(intent);
        // Generate namespace
        const namespaceResource = this.manifestGenerator.generateNamespace(intent);
        artifacts.push(this.createArtifact(`${basePath}/namespace.yaml`, sortK8sResource(namespaceResource), intent));
        // Generate deployments and services
        for (const service of services) {
            const deployment = this.manifestGenerator.generateDeployment(service, namespace, intent);
            const serviceName = toDNSLabel(service.name);
            artifacts.push(this.createArtifact(`${basePath}/deployments/${serviceName}-deployment.yaml`, sortK8sResource(deployment), intent));
            if (service.port !== undefined) {
                const k8sService = this.manifestGenerator.generateService(service, namespace);
                artifacts.push(this.createArtifact(`${basePath}/services/${serviceName}-service.yaml`, sortK8sResource(k8sService), intent));
            }
            // Generate HPA if scaling is defined
            const serviceScaling = scaling.get(service.name);
            if (serviceScaling) {
                const hpa = this.manifestGenerator.generateHPA(service.name, serviceScaling, namespace);
                artifacts.push(this.createArtifact(`${basePath}/autoscaling/${serviceName}-hpa.yaml`, sortK8sResource(hpa), intent));
            }
        }
        // Generate ConfigMaps
        for (const config of configs.filter((c) => c.type !== 'secret')) {
            const configMap = this.manifestGenerator.generateConfigMap(config, namespace);
            const configName = toDNSLabel(config.name);
            artifacts.push(this.createArtifact(`${basePath}/configmaps/${configName}-configmap.yaml`, sortK8sResource(configMap), intent));
        }
        // Generate Secrets (placeholder structure)
        for (const config of configs.filter((c) => c.type === 'secret')) {
            const secret = this.manifestGenerator.generateSecret(config, namespace);
            const secretName = toDNSLabel(config.name);
            artifacts.push(this.createArtifact(`${basePath}/secrets/${secretName}-secret.yaml`, sortK8sResource(secret), intent));
        }
        // Generate Ingress resources
        if (networking.ingress) {
            for (const ingress of networking.ingress) {
                const ingressResource = this.manifestGenerator.generateIngress(ingress, namespace);
                const ingressName = toDNSLabel(ingress.name);
                artifacts.push(this.createArtifact(`${basePath}/ingress/${ingressName}-ingress.yaml`, sortK8sResource(ingressResource), intent));
            }
        }
        // Generate NetworkPolicy resources
        if (networking.networkPolicies) {
            for (const policy of networking.networkPolicies) {
                const policyResource = this.manifestGenerator.generateNetworkPolicy(policy, namespace);
                const policyName = toDNSLabel(policy.name);
                artifacts.push(this.createArtifact(`${basePath}/network-policies/${policyName}-networkpolicy.yaml`, sortK8sResource(policyResource), intent));
            }
        }
        // Generate RBAC resources
        if (security.roles && security.roles.length > 0) {
            const roles = [];
            const clusterRoles = [];
            for (const role of security.roles) {
                if (role.clusterWide) {
                    clusterRoles.push(sortK8sResource(this.manifestGenerator.generateClusterRole(role)));
                }
                else {
                    roles.push(sortK8sResource(this.manifestGenerator.generateRole(role, namespace)));
                }
            }
            if (roles.length > 0) {
                artifacts.push(this.createArtifact(`${basePath}/rbac/roles.yaml`, roles, intent));
            }
            if (clusterRoles.length > 0) {
                artifacts.push(this.createArtifact(`${basePath}/rbac/cluster-roles.yaml`, clusterRoles, intent));
            }
        }
        if (security.roleBindings && security.roleBindings.length > 0) {
            const bindings = [];
            const clusterBindings = [];
            for (const binding of security.roleBindings) {
                if (binding.clusterWide) {
                    clusterBindings.push(sortK8sResource(this.manifestGenerator.generateClusterRoleBinding(binding)));
                }
                else {
                    bindings.push(sortK8sResource(this.manifestGenerator.generateRoleBinding(binding, namespace)));
                }
            }
            if (bindings.length > 0) {
                artifacts.push(this.createArtifact(`${basePath}/rbac/bindings.yaml`, bindings, intent));
            }
            if (clusterBindings.length > 0) {
                artifacts.push(this.createArtifact(`${basePath}/rbac/cluster-bindings.yaml`, clusterBindings, intent));
            }
        }
        // Generate ServiceAccount if specified
        if (security.serviceAccount) {
            const serviceAccount = this.manifestGenerator.generateServiceAccount(security.serviceAccount, namespace);
            artifacts.push(this.createArtifact(`${basePath}/rbac/service-account.yaml`, sortK8sResource(serviceAccount), intent));
        }
        // Generate storage resources
        if (storage.persistentVolumes) {
            for (const pv of storage.persistentVolumes) {
                const pvResource = this.manifestGenerator.generatePersistentVolume(pv);
                const pvName = toDNSLabel(pv.name);
                artifacts.push(this.createArtifact(`${basePath}/storage/pv-${pvName}.yaml`, sortK8sResource(pvResource), intent));
            }
        }
        if (storage.persistentVolumeClaims) {
            for (const pvc of storage.persistentVolumeClaims) {
                const pvcResource = this.manifestGenerator.generatePersistentVolumeClaim(pvc, namespace);
                const pvcName = toDNSLabel(pvc.name);
                artifacts.push(this.createArtifact(`${basePath}/storage/pvc-${pvcName}.yaml`, sortK8sResource(pvcResource), intent));
            }
        }
        if (storage.storageClasses) {
            for (const sc of storage.storageClasses) {
                const scResource = this.manifestGenerator.generateStorageClass(sc);
                const scName = toDNSLabel(sc.name);
                artifacts.push(this.createArtifact(`${basePath}/storage/sc-${scName}.yaml`, sortK8sResource(scResource), intent));
            }
        }
        // Generate ResourceQuota
        const resourceQuota = this.resourceQuotaMapper.generateResourceQuota(intent);
        artifacts.push(this.createArtifact(`${basePath}/quotas/resource-quota.yaml`, sortK8sResource(resourceQuota), intent));
        // Generate LimitRange
        const limitRange = this.resourceQuotaMapper.generateLimitRange(intent);
        artifacts.push(this.createArtifact(`${basePath}/quotas/limit-range.yaml`, sortK8sResource(limitRange), intent));
        return artifacts;
    }
    /**
     * Validate that an intent can be exported.
     *
     * @param intent - Intent to validate
     * @returns Validation result with errors/warnings
     */
    validate(intent) {
        const errors = [];
        const warnings = [];
        // Validate intent ID can be converted to DNS label
        const intentId = intent.intentId;
        if (!isValidDNSLabel(toDNSLabel(intentId))) {
            errors.push({
                code: 'K8S_INVALID_NAME',
                message: `Intent ID "${intentId}" cannot be converted to valid Kubernetes name`,
                path: 'intentId',
            });
        }
        // Validate resources
        for (const resource of intent.spec.resources) {
            // Check resource name
            if (!isValidDNSLabel(toDNSLabel(resource.name))) {
                errors.push({
                    code: 'K8S_INVALID_RESOURCE_NAME',
                    message: `Resource name "${resource.name}" cannot be converted to valid Kubernetes name`,
                    path: `resources.${resource.name}`,
                });
            }
            // Check for unsupported resource types
            const supportedTypes = [
                'compute',
                'service',
                'container',
                'config',
                'secret',
                'storage',
                'networking',
                'security',
            ];
            const resourceType = resource.type.split('/').pop() ?? resource.type;
            if (!supportedTypes.some((t) => resourceType.includes(t))) {
                warnings.push({
                    code: 'K8S_UNSUPPORTED_TYPE',
                    message: `Resource type "${resource.type}" may not be fully supported`,
                    path: `resources.${resource.name}.type`,
                });
            }
        }
        // Validate networking if present
        if (intent.spec.networking) {
            const networking = intent.spec.networking;
            if (networking.ingress) {
                const ingresses = networking.ingress;
                for (const ingress of ingresses) {
                    if (!ingress.host) {
                        errors.push({
                            code: 'K8S_MISSING_HOST',
                            message: 'Ingress requires a host value',
                            path: `networking.ingress.${ingress.name}.host`,
                        });
                    }
                }
            }
        }
        // Validate security if present
        if (intent.spec.security) {
            const security = intent.spec.security;
            if (security.roles) {
                const roles = security.roles;
                for (const role of roles) {
                    if (!role.rules || role.rules.length === 0) {
                        warnings.push({
                            code: 'K8S_EMPTY_ROLE',
                            message: `Role "${role.name}" has no rules defined`,
                            path: `security.roles.${role.name}`,
                        });
                    }
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    /**
     * Check if this exporter can handle the given intent.
     *
     * @param intent - Intent to check
     * @returns true if this exporter can handle the intent
     */
    canHandle(intent) {
        // Check if target is kubernetes or if kubernetes section exists
        if (intent.spec.target.provider === 'multi') {
            return true;
        }
        // Check for kubernetes-specific resources
        for (const resource of intent.spec.resources) {
            const resourceType = resource.type.toLowerCase();
            if (resourceType.includes('kubernetes') ||
                resourceType.includes('k8s') ||
                resourceType.includes('container') ||
                resourceType.includes('deployment') ||
                resourceType.includes('pod')) {
                return true;
            }
        }
        // Default to true - kubernetes is a common target
        return true;
    }
    /**
     * Get the serializers required by this exporter.
     *
     * @returns Array of serializer types needed for artifact serialization
     */
    getRequiredSerializers() {
        return ['yaml'];
    }
    // ===========================================================================
    // PRIVATE HELPER METHODS
    // ===========================================================================
    /**
     * Create an export artifact with standard metadata.
     */
    createArtifact(path, content, intent) {
        return {
            path,
            content,
            format: 'yaml',
            encoding: 'utf-8',
            metadata: {
                exporterId: this.id,
                exporterVersion: this.version,
                intentId: intent.intentId,
                intentVersion: intent.version,
                canonicalHash: intent.canonicalHash,
            },
        };
    }
    /**
     * Extract service specifications from intent.
     */
    extractServices(intent) {
        const services = [];
        for (const resource of intent.spec.resources) {
            const props = resource.properties;
            // Check if this is a service-like resource
            if (resource.type.includes('service') ||
                resource.type.includes('container') ||
                resource.type.includes('compute') ||
                props.image) {
                const serviceSpec = {
                    name: resource.name,
                    image: props.image ?? 'nginx:latest',
                };
                // Only add optional properties if they have values
                if (props.replicas !== undefined) {
                    serviceSpec.replicas = props.replicas;
                }
                if (props.port !== undefined) {
                    serviceSpec.port = props.port;
                }
                if (props.targetPort !== undefined) {
                    serviceSpec.targetPort = props.targetPort;
                }
                if (props.env !== undefined) {
                    serviceSpec.env = props.env;
                }
                if (props.resources !== undefined) {
                    serviceSpec.resources = props.resources;
                }
                if (props.command !== undefined) {
                    serviceSpec.command = props.command;
                }
                if (props.args !== undefined) {
                    serviceSpec.args = props.args;
                }
                if (props.healthCheck !== undefined) {
                    serviceSpec.healthCheck = props.healthCheck;
                }
                if (props.volumes !== undefined) {
                    serviceSpec.volumes = props.volumes;
                }
                if (props.labels !== undefined) {
                    serviceSpec.labels = props.labels;
                }
                if (props.annotations !== undefined) {
                    serviceSpec.annotations = props.annotations;
                }
                if (props.serviceType !== undefined) {
                    serviceSpec.serviceType = props.serviceType;
                }
                services.push(serviceSpec);
            }
        }
        // Sort by name for deterministic output
        return services.sort((a, b) => a.name.localeCompare(b.name));
    }
    /**
     * Extract configuration specifications from intent.
     */
    extractConfigs(intent) {
        const configs = [];
        for (const resource of intent.spec.resources) {
            const props = resource.properties;
            if (resource.type.includes('config') ||
                resource.type.includes('secret') ||
                props.data) {
                const isSecret = resource.type.includes('secret') ||
                    props.type === 'secret';
                const configSpec = {
                    name: resource.name,
                    data: props.data ?? {},
                };
                // Only add optional properties if they have values
                if (isSecret) {
                    configSpec.type = 'secret';
                }
                else {
                    configSpec.type = 'configmap';
                }
                if (props.labels !== undefined) {
                    configSpec.labels = props.labels;
                }
                configs.push(configSpec);
            }
        }
        // Sort by name for deterministic output
        return configs.sort((a, b) => a.name.localeCompare(b.name));
    }
    /**
     * Extract networking specifications from intent.
     */
    extractNetworking(intent) {
        const result = {};
        if (intent.spec.networking) {
            const networking = intent.spec.networking;
            if (networking.ingress) {
                result.ingress = networking.ingress.sort((a, b) => a.name.localeCompare(b.name));
            }
            if (networking.networkPolicy || networking.networkPolicies) {
                const policies = (networking.networkPolicy ||
                    networking.networkPolicies);
                result.networkPolicies = policies.sort((a, b) => a.name.localeCompare(b.name));
            }
        }
        return result;
    }
    /**
     * Extract security specifications from intent.
     */
    extractSecurity(intent) {
        const result = {};
        if (intent.spec.security) {
            const security = intent.spec.security;
            if (security.serviceAccount !== undefined) {
                result.serviceAccount = security.serviceAccount;
            }
            if (security.roles) {
                result.roles = security.roles.sort((a, b) => a.name.localeCompare(b.name));
            }
            if (security.roleBindings) {
                result.roleBindings = security.roleBindings.sort((a, b) => a.name.localeCompare(b.name));
            }
        }
        return result;
    }
    /**
     * Extract storage specifications from intent.
     */
    extractStorage(intent) {
        const result = {};
        // Check resources for storage items
        for (const resource of intent.spec.resources) {
            const props = resource.properties;
            if (resource.type.includes('storage') || resource.type.includes('volume')) {
                if (resource.type.includes('class')) {
                    result.storageClasses = result.storageClasses ?? [];
                    const scSpec = {
                        name: resource.name,
                        provisioner: props.provisioner ?? 'kubernetes.io/no-provisioner',
                    };
                    if (props.parameters !== undefined) {
                        scSpec.parameters = props.parameters;
                    }
                    if (props.reclaimPolicy !== undefined) {
                        scSpec.reclaimPolicy = props.reclaimPolicy;
                    }
                    if (props.volumeBindingMode !== undefined) {
                        scSpec.volumeBindingMode = props.volumeBindingMode;
                    }
                    if (props.allowVolumeExpansion !== undefined) {
                        scSpec.allowVolumeExpansion = props.allowVolumeExpansion;
                    }
                    result.storageClasses.push(scSpec);
                }
                else if (resource.type.includes('claim') || resource.type.includes('pvc')) {
                    result.persistentVolumeClaims = result.persistentVolumeClaims ?? [];
                    const pvcSpec = {
                        name: resource.name,
                        accessModes: props.accessModes ?? ['ReadWriteOnce'],
                        storage: props.storage ?? '1Gi',
                    };
                    if (props.storageClassName !== undefined) {
                        pvcSpec.storageClassName = props.storageClassName;
                    }
                    result.persistentVolumeClaims.push(pvcSpec);
                }
                else {
                    result.persistentVolumes = result.persistentVolumes ?? [];
                    const pvSpec = {
                        name: resource.name,
                        capacity: props.capacity ?? '1Gi',
                        accessModes: props.accessModes ?? ['ReadWriteOnce'],
                    };
                    if (props.storageClassName !== undefined) {
                        pvSpec.storageClassName = props.storageClassName;
                    }
                    if (props.hostPath !== undefined) {
                        pvSpec.hostPath = props.hostPath;
                    }
                    if (props.nfs !== undefined) {
                        pvSpec.nfs = props.nfs;
                    }
                    result.persistentVolumes.push(pvSpec);
                }
            }
        }
        // Sort all arrays for deterministic output
        if (result.persistentVolumes) {
            result.persistentVolumes.sort((a, b) => a.name.localeCompare(b.name));
        }
        if (result.persistentVolumeClaims) {
            result.persistentVolumeClaims.sort((a, b) => a.name.localeCompare(b.name));
        }
        if (result.storageClasses) {
            result.storageClasses.sort((a, b) => a.name.localeCompare(b.name));
        }
        return result;
    }
    /**
     * Extract scaling specifications from intent.
     */
    extractScaling(intent) {
        const scaling = new Map();
        if (intent.spec.scaling) {
            const scalingSpec = intent.spec.scaling;
            // Check for per-service scaling
            for (const resource of intent.spec.resources) {
                const props = resource.properties;
                if (props.scaling) {
                    const serviceScaling = props.scaling;
                    scaling.set(resource.name, serviceScaling);
                }
            }
            // Check for global scaling config
            if (scalingSpec.services) {
                const serviceScaling = scalingSpec.services;
                for (const [serviceName, spec] of Object.entries(serviceScaling)) {
                    scaling.set(serviceName, spec);
                }
            }
        }
        return scaling;
    }
}
/**
 * Factory function to create a new KubernetesExporter instance.
 */
export function createKubernetesExporter() {
    return new KubernetesExporter();
}
//# sourceMappingURL=KubernetesExporter.js.map