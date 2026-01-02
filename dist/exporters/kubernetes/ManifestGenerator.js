/**
 * Kubernetes Manifest Generator
 *
 * Generates Kubernetes manifests from normalized intent specifications.
 * All output is deterministic with sorted keys and stable ordering.
 *
 * @module exporters/kubernetes/ManifestGenerator
 * @version 1.0.0
 */
// =============================================================================
// CONSTANTS
// =============================================================================
/**
 * Default labels applied to all resources.
 */
const DEFAULT_MANAGED_BY = 'agentics-deployment-exporters';
/**
 * RFC 1123 DNS label regex pattern.
 */
const DNS_LABEL_REGEX = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
/**
 * Maximum DNS label length.
 */
const MAX_DNS_LABEL_LENGTH = 63;
// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
/**
 * Sort object keys alphabetically for deterministic output.
 * Returns a new object with sorted keys, excluding undefined values.
 */
function sortKeys(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
        const value = obj[key];
        // Skip undefined values to comply with exactOptionalPropertyTypes
        if (value === undefined) {
            continue;
        }
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
 * Validate and normalize a name to RFC 1123 DNS label format.
 * @param name - The name to normalize
 * @returns Normalized DNS label
 * @throws Error if name cannot be normalized
 */
function toDNSLabel(name) {
    // Convert to lowercase and replace invalid characters
    let normalized = name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    // Truncate if too long
    if (normalized.length > MAX_DNS_LABEL_LENGTH) {
        normalized = normalized.substring(0, MAX_DNS_LABEL_LENGTH).replace(/-$/, '');
    }
    // Ensure it starts and ends with alphanumeric
    if (!DNS_LABEL_REGEX.test(normalized)) {
        throw new Error(`Cannot normalize name to DNS label: ${name}`);
    }
    return normalized;
}
/**
 * Create sorted labels object with standard labels.
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
/**
 * Create metadata object, only including optional fields when defined.
 */
function createMetadata(name, namespace, labels, annotations) {
    const metadata = { name };
    if (namespace !== undefined) {
        metadata['namespace'] = namespace;
    }
    if (labels !== undefined) {
        metadata['labels'] = labels;
    }
    if (annotations !== undefined && Object.keys(annotations).length > 0) {
        metadata['annotations'] = sortKeys({ ...annotations });
    }
    return sortKeys(metadata);
}
// =============================================================================
// MANIFEST GENERATOR CLASS
// =============================================================================
/**
 * ManifestGenerator creates Kubernetes manifests from intent specifications.
 *
 * All generated manifests are:
 * - Deterministic: Same input always produces identical output
 * - Sorted: All keys and labels are alphabetically ordered
 * - RFC 1123 compliant: All resource names follow DNS label standards
 */
export class ManifestGenerator {
    /**
     * Generate a Namespace resource.
     */
    generateNamespace(intent) {
        const name = toDNSLabel(intent.intentId);
        const labels = createLabels(name, {
            'app.kubernetes.io/instance': intent.intentId,
            'app.kubernetes.io/version': intent.version,
        });
        const metadata = createMetadata(name, undefined, labels);
        return sortKeys({
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata,
        });
    }
    /**
     * Generate a Deployment resource from a service specification.
     */
    generateDeployment(service, namespace, _intent) {
        const name = toDNSLabel(service.name);
        const labels = createLabels(name, service.labels);
        const container = this.createContainer(service);
        const volumes = this.createVolumes(service);
        const podSpec = this.createPodSpec(container, volumes);
        const metadata = createMetadata(name, namespace, labels, service.annotations);
        const selector = {
            matchLabels: {
                'app.kubernetes.io/name': name,
            },
        };
        const templateMetadata = { labels };
        const deployment = {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            metadata,
            spec: {
                replicas: service.replicas ?? 1,
                selector,
                template: {
                    metadata: sortKeys(templateMetadata),
                    spec: podSpec,
                },
                strategy: {
                    type: 'RollingUpdate',
                    rollingUpdate: {
                        maxSurge: '25%',
                        maxUnavailable: '25%',
                    },
                },
            },
        };
        return sortKeys(deployment);
    }
    /**
     * Generate a Service resource from a service specification.
     */
    generateService(service, namespace) {
        const name = toDNSLabel(service.name);
        const labels = createLabels(name, service.labels);
        const ports = [];
        if (service.port !== undefined) {
            ports.push({
                name: 'http',
                port: service.port,
                targetPort: service.targetPort ?? service.port,
                protocol: 'TCP',
            });
        }
        const metadata = createMetadata(name, namespace, labels, service.annotations);
        const k8sService = {
            apiVersion: 'v1',
            kind: 'Service',
            metadata,
            spec: {
                type: service.serviceType ?? 'ClusterIP',
                selector: {
                    'app.kubernetes.io/name': name,
                },
                ports,
            },
        };
        return sortKeys(k8sService);
    }
    /**
     * Generate a ConfigMap resource from a config specification.
     */
    generateConfigMap(config, namespace) {
        const name = toDNSLabel(config.name);
        const labels = createLabels(name, config.labels);
        const metadata = createMetadata(name, namespace, labels);
        const configMap = {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            metadata,
            data: sortKeys({ ...config.data }),
        };
        return sortKeys(configMap);
    }
    /**
     * Generate a Secret resource placeholder from a config specification.
     * Note: Actual secret values should be populated externally.
     */
    generateSecret(config, namespace) {
        const name = toDNSLabel(config.name);
        const labels = createLabels(name, config.labels);
        const metadata = createMetadata(name, namespace, labels);
        // Generate placeholder data (base64 encoded placeholders)
        const data = {};
        for (const key of Object.keys(config.data).sort()) {
            // Use placeholder that indicates this needs to be replaced
            data[key] = Buffer.from(`PLACEHOLDER_${key}`).toString('base64');
        }
        const secret = {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata,
            type: 'Opaque',
            data: sortKeys(data),
        };
        return sortKeys(secret);
    }
    /**
     * Generate an Ingress resource from an ingress specification.
     */
    generateIngress(ingress, namespace) {
        const name = toDNSLabel(ingress.name);
        const labels = createLabels(name);
        const metadata = createMetadata(name, namespace, labels, ingress.annotations);
        const pathType = ingress.pathType ?? 'Prefix';
        const path = ingress.path ?? '/';
        // Build spec object conditionally
        const spec = {
            rules: [
                {
                    host: ingress.host,
                    http: {
                        paths: [
                            {
                                path,
                                pathType,
                                backend: {
                                    service: {
                                        name: toDNSLabel(ingress.serviceName),
                                        port: {
                                            number: ingress.servicePort,
                                        },
                                    },
                                },
                            },
                        ],
                    },
                },
            ],
        };
        if (ingress.ingressClassName !== undefined) {
            spec['ingressClassName'] = ingress.ingressClassName;
        }
        if (ingress.tls) {
            spec['tls'] = [
                {
                    hosts: [ingress.host],
                    secretName: ingress.tlsSecretName ?? `${name}-tls`,
                },
            ];
        }
        const ingressResource = {
            apiVersion: 'networking.k8s.io/v1',
            kind: 'Ingress',
            metadata,
            spec: sortKeys(spec),
        };
        return sortKeys(ingressResource);
    }
    /**
     * Generate a NetworkPolicy resource.
     */
    generateNetworkPolicy(policy, namespace) {
        const name = toDNSLabel(policy.name);
        const labels = createLabels(name);
        const metadata = createMetadata(name, namespace, labels);
        const policyTypes = [];
        let ingressRules;
        let egressRules;
        if (policy.ingress && policy.ingress.length > 0) {
            policyTypes.push('Ingress');
            ingressRules = policy.ingress.map((rule) => {
                const result = {};
                if (rule.from) {
                    result['from'] = rule.from.map((peer) => {
                        const peerObj = {};
                        if (peer.podSelector) {
                            peerObj['podSelector'] = { matchLabels: sortKeys({ ...peer.podSelector }) };
                        }
                        if (peer.namespaceSelector) {
                            peerObj['namespaceSelector'] = { matchLabels: sortKeys({ ...peer.namespaceSelector }) };
                        }
                        if (peer.cidr) {
                            peerObj['ipBlock'] = { cidr: peer.cidr };
                        }
                        return peerObj;
                    });
                }
                if (rule.ports) {
                    result['ports'] = rule.ports.map((port) => ({
                        port: port.port,
                        protocol: port.protocol ?? 'TCP',
                    }));
                }
                return result;
            });
        }
        if (policy.egress && policy.egress.length > 0) {
            policyTypes.push('Egress');
            egressRules = policy.egress.map((rule) => {
                const result = {};
                if (rule.to) {
                    result['to'] = rule.to.map((peer) => {
                        const peerObj = {};
                        if (peer.podSelector) {
                            peerObj['podSelector'] = { matchLabels: sortKeys({ ...peer.podSelector }) };
                        }
                        if (peer.namespaceSelector) {
                            peerObj['namespaceSelector'] = { matchLabels: sortKeys({ ...peer.namespaceSelector }) };
                        }
                        if (peer.cidr) {
                            peerObj['ipBlock'] = { cidr: peer.cidr };
                        }
                        return peerObj;
                    });
                }
                if (rule.ports) {
                    result['ports'] = rule.ports.map((port) => ({
                        port: port.port,
                        protocol: port.protocol ?? 'TCP',
                    }));
                }
                return result;
            });
        }
        // Build spec conditionally
        const spec = {
            podSelector: {
                matchLabels: sortKeys({ ...policy.podSelector }),
            },
            policyTypes,
        };
        if (ingressRules !== undefined) {
            spec['ingress'] = ingressRules;
        }
        if (egressRules !== undefined) {
            spec['egress'] = egressRules;
        }
        const networkPolicy = {
            apiVersion: 'networking.k8s.io/v1',
            kind: 'NetworkPolicy',
            metadata,
            spec: sortKeys(spec),
        };
        return sortKeys(networkPolicy);
    }
    /**
     * Generate a Role resource.
     */
    generateRole(role, namespace) {
        const name = toDNSLabel(role.name);
        const labels = createLabels(name);
        const metadata = createMetadata(name, namespace, labels);
        const rules = role.rules.map((rule) => {
            const policyRule = {
                apiGroups: [...rule.apiGroups].sort(),
                resources: [...rule.resources].sort(),
                verbs: [...rule.verbs].sort(),
            };
            if (rule.resourceNames !== undefined) {
                policyRule['resourceNames'] = [...rule.resourceNames].sort();
            }
            return sortKeys(policyRule);
        });
        const k8sRole = {
            apiVersion: 'rbac.authorization.k8s.io/v1',
            kind: 'Role',
            metadata,
            rules,
        };
        return sortKeys(k8sRole);
    }
    /**
     * Generate a ClusterRole resource.
     */
    generateClusterRole(role) {
        const name = toDNSLabel(role.name);
        const labels = createLabels(name);
        const metadata = createMetadata(name, undefined, labels);
        const rules = role.rules.map((rule) => {
            const policyRule = {
                apiGroups: [...rule.apiGroups].sort(),
                resources: [...rule.resources].sort(),
                verbs: [...rule.verbs].sort(),
            };
            if (rule.resourceNames !== undefined) {
                policyRule['resourceNames'] = [...rule.resourceNames].sort();
            }
            return sortKeys(policyRule);
        });
        const clusterRole = {
            apiVersion: 'rbac.authorization.k8s.io/v1',
            kind: 'ClusterRole',
            metadata,
            rules,
        };
        return sortKeys(clusterRole);
    }
    /**
     * Generate a RoleBinding resource.
     */
    generateRoleBinding(binding, namespace) {
        const name = toDNSLabel(binding.name);
        const labels = createLabels(name);
        const metadata = createMetadata(name, namespace, labels);
        const subjects = binding.subjects.map((subject) => {
            const subjectObj = {
                kind: subject.kind,
                name: subject.name,
                apiGroup: subject.kind === 'ServiceAccount' ? '' : 'rbac.authorization.k8s.io',
            };
            if (subject.namespace !== undefined) {
                subjectObj['namespace'] = subject.namespace;
            }
            return sortKeys(subjectObj);
        });
        const roleBinding = {
            apiVersion: 'rbac.authorization.k8s.io/v1',
            kind: 'RoleBinding',
            metadata,
            subjects,
            roleRef: {
                apiGroup: 'rbac.authorization.k8s.io',
                kind: (binding.clusterWide ? 'ClusterRole' : 'Role'),
                name: toDNSLabel(binding.roleName),
            },
        };
        return sortKeys(roleBinding);
    }
    /**
     * Generate a ClusterRoleBinding resource.
     */
    generateClusterRoleBinding(binding) {
        const name = toDNSLabel(binding.name);
        const labels = createLabels(name);
        const metadata = createMetadata(name, undefined, labels);
        const subjects = binding.subjects.map((subject) => {
            const subjectObj = {
                kind: subject.kind,
                name: subject.name,
                apiGroup: subject.kind === 'ServiceAccount' ? '' : 'rbac.authorization.k8s.io',
            };
            if (subject.namespace !== undefined) {
                subjectObj['namespace'] = subject.namespace;
            }
            return sortKeys(subjectObj);
        });
        const clusterRoleBinding = {
            apiVersion: 'rbac.authorization.k8s.io/v1',
            kind: 'ClusterRoleBinding',
            metadata,
            subjects,
            roleRef: {
                apiGroup: 'rbac.authorization.k8s.io',
                kind: 'ClusterRole',
                name: toDNSLabel(binding.roleName),
            },
        };
        return sortKeys(clusterRoleBinding);
    }
    /**
     * Generate a HorizontalPodAutoscaler resource.
     */
    generateHPA(serviceName, scaling, namespace) {
        const name = toDNSLabel(`${serviceName}-hpa`);
        const labels = createLabels(name);
        const metadata = createMetadata(name, namespace, labels);
        const metrics = [];
        if (scaling.targetCPUUtilization !== undefined) {
            metrics.push({
                type: 'Resource',
                resource: {
                    name: 'cpu',
                    target: {
                        type: 'Utilization',
                        averageUtilization: scaling.targetCPUUtilization,
                    },
                },
            });
        }
        if (scaling.targetMemoryUtilization !== undefined) {
            metrics.push({
                type: 'Resource',
                resource: {
                    name: 'memory',
                    target: {
                        type: 'Utilization',
                        averageUtilization: scaling.targetMemoryUtilization,
                    },
                },
            });
        }
        // Build spec conditionally
        const spec = {
            scaleTargetRef: {
                apiVersion: 'apps/v1',
                kind: 'Deployment',
                name: toDNSLabel(serviceName),
            },
            minReplicas: scaling.minReplicas ?? 1,
            maxReplicas: scaling.maxReplicas,
        };
        if (metrics.length > 0) {
            spec['metrics'] = metrics;
        }
        const hpa = {
            apiVersion: 'autoscaling/v2',
            kind: 'HorizontalPodAutoscaler',
            metadata,
            spec: sortKeys(spec),
        };
        return sortKeys(hpa);
    }
    /**
     * Generate a PersistentVolume resource.
     */
    generatePersistentVolume(pv) {
        const name = toDNSLabel(pv.name);
        const labels = createLabels(name);
        const metadata = createMetadata(name, undefined, labels);
        // Build spec conditionally
        const spec = {
            capacity: {
                storage: pv.capacity,
            },
            accessModes: [...pv.accessModes],
            persistentVolumeReclaimPolicy: 'Retain',
        };
        if (pv.storageClassName !== undefined) {
            spec['storageClassName'] = pv.storageClassName;
        }
        if (pv.hostPath !== undefined) {
            spec['hostPath'] = {
                path: pv.hostPath,
                type: 'DirectoryOrCreate',
            };
        }
        if (pv.nfs !== undefined) {
            spec['nfs'] = {
                server: pv.nfs.server,
                path: pv.nfs.path,
            };
        }
        const pvResource = {
            apiVersion: 'v1',
            kind: 'PersistentVolume',
            metadata,
            spec: sortKeys(spec),
        };
        return sortKeys(pvResource);
    }
    /**
     * Generate a PersistentVolumeClaim resource.
     */
    generatePersistentVolumeClaim(pvc, namespace) {
        const name = toDNSLabel(pvc.name);
        const labels = createLabels(name);
        const metadata = createMetadata(name, namespace, labels);
        // Build spec conditionally
        const spec = {
            accessModes: [...pvc.accessModes],
            resources: {
                requests: {
                    storage: pvc.storage,
                },
            },
        };
        if (pvc.storageClassName !== undefined) {
            spec['storageClassName'] = pvc.storageClassName;
        }
        const pvcResource = {
            apiVersion: 'v1',
            kind: 'PersistentVolumeClaim',
            metadata,
            spec: sortKeys(spec),
        };
        return sortKeys(pvcResource);
    }
    /**
     * Generate a StorageClass resource.
     */
    generateStorageClass(sc) {
        const name = toDNSLabel(sc.name);
        const labels = createLabels(name);
        const metadata = createMetadata(name, undefined, labels);
        // Build the storage class conditionally
        const storageClassObj = {
            apiVersion: 'storage.k8s.io/v1',
            kind: 'StorageClass',
            metadata,
            provisioner: sc.provisioner,
            reclaimPolicy: sc.reclaimPolicy ?? 'Delete',
            volumeBindingMode: sc.volumeBindingMode ?? 'WaitForFirstConsumer',
        };
        if (sc.parameters !== undefined) {
            storageClassObj['parameters'] = sortKeys({ ...sc.parameters });
        }
        if (sc.allowVolumeExpansion !== undefined) {
            storageClassObj['allowVolumeExpansion'] = sc.allowVolumeExpansion;
        }
        return sortKeys(storageClassObj);
    }
    /**
     * Generate a ServiceAccount resource.
     */
    generateServiceAccount(name, namespace) {
        const normalizedName = toDNSLabel(name);
        const labels = createLabels(normalizedName);
        const metadata = createMetadata(normalizedName, namespace, labels);
        const serviceAccount = {
            apiVersion: 'v1',
            kind: 'ServiceAccount',
            metadata,
            automountServiceAccountToken: true,
        };
        return sortKeys(serviceAccount);
    }
    // ===========================================================================
    // PRIVATE HELPER METHODS
    // ===========================================================================
    /**
     * Create a container specification from a service spec.
     */
    createContainer(service) {
        // Build container object conditionally
        const container = {
            name: toDNSLabel(service.name),
            image: service.image,
            imagePullPolicy: 'IfNotPresent',
            securityContext: {
                allowPrivilegeEscalation: false,
                readOnlyRootFilesystem: true,
                runAsNonRoot: true,
                capabilities: {
                    drop: ['ALL'],
                },
            },
        };
        if (service.port !== undefined) {
            container['ports'] = [
                {
                    name: 'http',
                    containerPort: service.port,
                    protocol: 'TCP',
                },
            ];
        }
        const envVars = this.createEnvVars(service.env);
        if (envVars !== undefined) {
            container['env'] = envVars;
        }
        const resources = this.createResourceRequirements(service.resources);
        if (resources !== undefined) {
            container['resources'] = resources;
        }
        if (service.command !== undefined) {
            container['command'] = [...service.command];
        }
        if (service.args !== undefined) {
            container['args'] = [...service.args];
        }
        const probe = this.createProbe(service.healthCheck);
        if (probe !== undefined) {
            container['livenessProbe'] = probe;
            container['readinessProbe'] = probe;
        }
        const volumeMounts = this.createVolumeMounts(service.volumes);
        if (volumeMounts !== undefined) {
            container['volumeMounts'] = volumeMounts;
        }
        return sortKeys(container);
    }
    /**
     * Create environment variables from a key-value map.
     */
    createEnvVars(env) {
        if (!env || Object.keys(env).length === 0) {
            return undefined;
        }
        return Object.keys(env)
            .sort()
            .map((name) => ({
            name,
            value: env[name],
        }));
    }
    /**
     * Create resource requirements from intent spec.
     */
    createResourceRequirements(resources) {
        if (!resources) {
            return {
                limits: {
                    cpu: '500m',
                    memory: '256Mi',
                },
                requests: {
                    cpu: '100m',
                    memory: '128Mi',
                },
            };
        }
        return {
            limits: {
                cpu: resources.cpuLimit ?? resources.cpu ?? '500m',
                memory: resources.memoryLimit ?? resources.memory ?? '256Mi',
            },
            requests: {
                cpu: resources.cpu ?? '100m',
                memory: resources.memory ?? '128Mi',
            },
        };
    }
    /**
     * Create a probe specification from health check config.
     */
    createProbe(healthCheck) {
        if (!healthCheck) {
            return undefined;
        }
        const baseProbe = {
            initialDelaySeconds: healthCheck.initialDelaySeconds ?? 10,
            periodSeconds: healthCheck.periodSeconds ?? 10,
            timeoutSeconds: 5,
            successThreshold: 1,
            failureThreshold: 3,
        };
        const type = healthCheck.type ?? 'http';
        if (type === 'http' && healthCheck.path) {
            return {
                ...baseProbe,
                httpGet: {
                    path: healthCheck.path,
                    port: healthCheck.port ?? 8080,
                    scheme: 'HTTP',
                },
            };
        }
        if (type === 'tcp') {
            return {
                ...baseProbe,
                tcpSocket: {
                    port: healthCheck.port ?? 8080,
                },
            };
        }
        if (type === 'exec' && healthCheck.command) {
            return {
                ...baseProbe,
                exec: {
                    command: [...healthCheck.command],
                },
            };
        }
        return undefined;
    }
    /**
     * Create volumes from intent volume specs.
     */
    createVolumes(service) {
        if (!service.volumes || service.volumes.length === 0) {
            return undefined;
        }
        return service.volumes.map((vol) => {
            const volumeName = toDNSLabel(vol.name);
            const volume = { name: volumeName };
            if (vol.configMap) {
                volume['configMap'] = {
                    name: toDNSLabel(vol.configMap),
                };
            }
            else if (vol.secret) {
                volume['secret'] = {
                    secretName: toDNSLabel(vol.secret),
                };
            }
            else if (vol.pvc) {
                const pvcVolume = {
                    claimName: toDNSLabel(vol.pvc),
                };
                if (vol.readOnly !== undefined) {
                    pvcVolume['readOnly'] = vol.readOnly;
                }
                volume['persistentVolumeClaim'] = pvcVolume;
            }
            else {
                // Default to emptyDir
                volume['emptyDir'] = {};
            }
            return volume;
        });
    }
    /**
     * Create volume mounts from intent volume specs.
     */
    createVolumeMounts(volumes) {
        if (!volumes || volumes.length === 0) {
            return undefined;
        }
        return volumes.map((vol) => {
            const mount = {
                name: toDNSLabel(vol.name),
                mountPath: vol.mountPath,
            };
            if (vol.readOnly !== undefined) {
                mount['readOnly'] = vol.readOnly;
            }
            return mount;
        });
    }
    /**
     * Create a pod specification.
     */
    createPodSpec(container, volumes) {
        const podSpec = {
            containers: [container],
            restartPolicy: 'Always',
            terminationGracePeriodSeconds: 30,
            securityContext: {
                runAsNonRoot: true,
                seccompProfile: {
                    type: 'RuntimeDefault',
                },
            },
        };
        if (volumes !== undefined) {
            podSpec['volumes'] = volumes;
        }
        return sortKeys(podSpec);
    }
}
/**
 * Singleton instance for the manifest generator.
 */
export const manifestGenerator = new ManifestGenerator();
//# sourceMappingURL=ManifestGenerator.js.map