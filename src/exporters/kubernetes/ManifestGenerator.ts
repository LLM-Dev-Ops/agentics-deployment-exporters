/**
 * Kubernetes Manifest Generator
 *
 * Generates Kubernetes manifests from normalized intent specifications.
 * All output is deterministic with sorted keys and stable ordering.
 *
 * @module exporters/kubernetes/ManifestGenerator
 * @version 1.0.0
 */

import type { NormalizedIntent } from '../../core/types.js';
import type {
  K8sConfigMap,
  K8sContainer,
  K8sDeployment,
  K8sEnvVar,
  K8sHPA,
  K8sIngress,
  K8sLabelSelector,
  K8sMetadata,
  K8sNamespace,
  K8sNetworkPolicy,
  K8sNetworkPolicyIngressRule,
  K8sNetworkPolicyEgressRule,
  K8sPodSpec,
  K8sPolicyRule,
  K8sProbe,
  K8sResourceRequirements,
  K8sRole,
  K8sRoleBinding,
  K8sClusterRole,
  K8sClusterRoleBinding,
  K8sSecret,
  K8sService,
  K8sServicePort,
  K8sSubject,
  K8sVolume,
  K8sVolumeMount,
  K8sPersistentVolume,
  K8sPersistentVolumeClaim,
  K8sStorageClass,
  K8sServiceAccount,
  K8sMetricSpec,
  IntentServiceSpec,
  IntentConfigSpec,
  IntentIngressSpec,
  IntentNetworkPolicySpec,
  IntentRoleSpec,
  IntentRoleBindingSpec,
  IntentPVSpec,
  IntentPVCSpec,
  IntentStorageClassSpec,
  IntentScalingSpec,
} from './types.js';

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
function sortKeys<T extends Record<string, unknown>>(obj: T): T {
  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    const value = obj[key];
    // Skip undefined values to comply with exactOptionalPropertyTypes
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      sorted[key] = sortKeys(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sorted[key] = value.map((item) =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
          ? sortKeys(item as Record<string, unknown>)
          : item
      );
    } else {
      sorted[key] = value;
    }
  }
  return sorted as T;
}

/**
 * Validate and normalize a name to RFC 1123 DNS label format.
 * @param name - The name to normalize
 * @returns Normalized DNS label
 * @throws Error if name cannot be normalized
 */
function toDNSLabel(name: string): string {
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
function createLabels(
  name: string,
  additionalLabels?: Readonly<Record<string, string>>
): Readonly<Record<string, string>> {
  const labels: Record<string, string> = {
    'app.kubernetes.io/managed-by': DEFAULT_MANAGED_BY,
    'app.kubernetes.io/name': toDNSLabel(name),
  };

  if (additionalLabels) {
    for (const key of Object.keys(additionalLabels).sort()) {
      labels[key] = additionalLabels[key]!;
    }
  }

  return sortKeys(labels);
}

/**
 * Create metadata object, only including optional fields when defined.
 */
function createMetadata(
  name: string,
  namespace?: string,
  labels?: Readonly<Record<string, string>>,
  annotations?: Readonly<Record<string, string>>
): K8sMetadata {
  const metadata: Record<string, unknown> = { name };
  if (namespace !== undefined) {
    metadata['namespace'] = namespace;
  }
  if (labels !== undefined) {
    metadata['labels'] = labels;
  }
  if (annotations !== undefined && Object.keys(annotations).length > 0) {
    metadata['annotations'] = sortKeys({ ...annotations });
  }
  return sortKeys(metadata) as K8sMetadata;
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
  generateNamespace(intent: NormalizedIntent): K8sNamespace {
    const name = toDNSLabel(intent.intentId);
    const labels = createLabels(name, {
      'app.kubernetes.io/instance': intent.intentId,
      'app.kubernetes.io/version': intent.version,
    });
    const metadata = createMetadata(name, undefined, labels);

    return sortKeys({
      apiVersion: 'v1' as const,
      kind: 'Namespace' as const,
      metadata,
    });
  }

  /**
   * Generate a Deployment resource from a service specification.
   */
  generateDeployment(
    service: IntentServiceSpec,
    namespace: string,
    _intent: NormalizedIntent
  ): K8sDeployment {
    const name = toDNSLabel(service.name);
    const labels = createLabels(name, service.labels);

    const container = this.createContainer(service);
    const volumes = this.createVolumes(service);
    const podSpec = this.createPodSpec(container, volumes);

    const metadata = createMetadata(name, namespace, labels, service.annotations);

    const selector: K8sLabelSelector = {
      matchLabels: {
        'app.kubernetes.io/name': name,
      },
    };

    const templateMetadata: Record<string, unknown> = { labels };

    const deployment: K8sDeployment = {
      apiVersion: 'apps/v1' as const,
      kind: 'Deployment' as const,
      metadata,
      spec: {
        replicas: service.replicas ?? 1,
        selector,
        template: {
          metadata: sortKeys(templateMetadata) as K8sMetadata,
          spec: podSpec,
        },
        strategy: {
          type: 'RollingUpdate' as const,
          rollingUpdate: {
            maxSurge: '25%',
            maxUnavailable: '25%',
          },
        },
      },
    };

    return sortKeys(deployment as unknown as Record<string, unknown>) as unknown as K8sDeployment;
  }

  /**
   * Generate a Service resource from a service specification.
   */
  generateService(
    service: IntentServiceSpec,
    namespace: string
  ): K8sService {
    const name = toDNSLabel(service.name);
    const labels = createLabels(name, service.labels);

    const ports: K8sServicePort[] = [];
    if (service.port !== undefined) {
      ports.push({
        name: 'http',
        port: service.port,
        targetPort: service.targetPort ?? service.port,
        protocol: 'TCP' as const,
      });
    }

    const metadata = createMetadata(name, namespace, labels, service.annotations);

    const k8sService: K8sService = {
      apiVersion: 'v1' as const,
      kind: 'Service' as const,
      metadata,
      spec: {
        type: service.serviceType ?? 'ClusterIP',
        selector: {
          'app.kubernetes.io/name': name,
        },
        ports,
      },
    };

    return sortKeys(k8sService as unknown as Record<string, unknown>) as unknown as K8sService;
  }

  /**
   * Generate a ConfigMap resource from a config specification.
   */
  generateConfigMap(
    config: IntentConfigSpec,
    namespace: string
  ): K8sConfigMap {
    const name = toDNSLabel(config.name);
    const labels = createLabels(name, config.labels);

    const metadata = createMetadata(name, namespace, labels);

    const configMap: K8sConfigMap = {
      apiVersion: 'v1' as const,
      kind: 'ConfigMap' as const,
      metadata,
      data: sortKeys({ ...config.data }),
    };

    return sortKeys(configMap as unknown as Record<string, unknown>) as unknown as K8sConfigMap;
  }

  /**
   * Generate a Secret resource placeholder from a config specification.
   * Note: Actual secret values should be populated externally.
   */
  generateSecret(
    config: IntentConfigSpec,
    namespace: string
  ): K8sSecret {
    const name = toDNSLabel(config.name);
    const labels = createLabels(name, config.labels);

    const metadata = createMetadata(name, namespace, labels);

    // Generate placeholder data (base64 encoded placeholders)
    const data: Record<string, string> = {};
    for (const key of Object.keys(config.data).sort()) {
      // Use placeholder that indicates this needs to be replaced
      data[key] = Buffer.from(`PLACEHOLDER_${key}`).toString('base64');
    }

    const secret: K8sSecret = {
      apiVersion: 'v1' as const,
      kind: 'Secret' as const,
      metadata,
      type: 'Opaque',
      data: sortKeys(data),
    };

    return sortKeys(secret as unknown as Record<string, unknown>) as unknown as K8sSecret;
  }

  /**
   * Generate an Ingress resource from an ingress specification.
   */
  generateIngress(
    ingress: IntentIngressSpec,
    namespace: string
  ): K8sIngress {
    const name = toDNSLabel(ingress.name);
    const labels = createLabels(name);

    const metadata = createMetadata(name, namespace, labels, ingress.annotations);

    const pathType = ingress.pathType ?? 'Prefix';
    const path = ingress.path ?? '/';

    // Build spec object conditionally
    const spec: Record<string, unknown> = {
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

    const ingressResource: K8sIngress = {
      apiVersion: 'networking.k8s.io/v1' as const,
      kind: 'Ingress' as const,
      metadata,
      spec: sortKeys(spec) as K8sIngress['spec'],
    };

    return sortKeys(ingressResource as unknown as Record<string, unknown>) as unknown as K8sIngress;
  }

  /**
   * Generate a NetworkPolicy resource.
   */
  generateNetworkPolicy(
    policy: IntentNetworkPolicySpec,
    namespace: string
  ): K8sNetworkPolicy {
    const name = toDNSLabel(policy.name);
    const labels = createLabels(name);

    const metadata = createMetadata(name, namespace, labels);

    const policyTypes: ('Ingress' | 'Egress')[] = [];

    let ingressRules: readonly K8sNetworkPolicyIngressRule[] | undefined;
    let egressRules: readonly K8sNetworkPolicyEgressRule[] | undefined;

    if (policy.ingress && policy.ingress.length > 0) {
      policyTypes.push('Ingress');
      ingressRules = policy.ingress.map((rule) => {
        const result: Record<string, unknown> = {};
        if (rule.from) {
          result['from'] = rule.from.map((peer) => {
            const peerObj: Record<string, unknown> = {};
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
            protocol: port.protocol ?? ('TCP' as const),
          }));
        }
        return result as K8sNetworkPolicyIngressRule;
      });
    }

    if (policy.egress && policy.egress.length > 0) {
      policyTypes.push('Egress');
      egressRules = policy.egress.map((rule) => {
        const result: Record<string, unknown> = {};
        if (rule.to) {
          result['to'] = rule.to.map((peer) => {
            const peerObj: Record<string, unknown> = {};
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
            protocol: port.protocol ?? ('TCP' as const),
          }));
        }
        return result as K8sNetworkPolicyEgressRule;
      });
    }

    // Build spec conditionally
    const spec: Record<string, unknown> = {
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

    const networkPolicy: K8sNetworkPolicy = {
      apiVersion: 'networking.k8s.io/v1' as const,
      kind: 'NetworkPolicy' as const,
      metadata,
      spec: sortKeys(spec) as unknown as K8sNetworkPolicy['spec'],
    };

    return sortKeys(networkPolicy as unknown as Record<string, unknown>) as unknown as K8sNetworkPolicy;
  }

  /**
   * Generate a Role resource.
   */
  generateRole(
    role: IntentRoleSpec,
    namespace: string
  ): K8sRole {
    const name = toDNSLabel(role.name);
    const labels = createLabels(name);

    const metadata = createMetadata(name, namespace, labels);

    const rules: K8sPolicyRule[] = role.rules.map((rule) => {
      const policyRule: Record<string, unknown> = {
        apiGroups: [...rule.apiGroups].sort(),
        resources: [...rule.resources].sort(),
        verbs: [...rule.verbs].sort(),
      };
      if (rule.resourceNames !== undefined) {
        policyRule['resourceNames'] = [...rule.resourceNames].sort();
      }
      return sortKeys(policyRule) as unknown as K8sPolicyRule;
    });

    const k8sRole: K8sRole = {
      apiVersion: 'rbac.authorization.k8s.io/v1' as const,
      kind: 'Role' as const,
      metadata,
      rules,
    };

    return sortKeys(k8sRole as unknown as Record<string, unknown>) as unknown as K8sRole;
  }

  /**
   * Generate a ClusterRole resource.
   */
  generateClusterRole(role: IntentRoleSpec): K8sClusterRole {
    const name = toDNSLabel(role.name);
    const labels = createLabels(name);

    const metadata = createMetadata(name, undefined, labels);

    const rules: K8sPolicyRule[] = role.rules.map((rule) => {
      const policyRule: Record<string, unknown> = {
        apiGroups: [...rule.apiGroups].sort(),
        resources: [...rule.resources].sort(),
        verbs: [...rule.verbs].sort(),
      };
      if (rule.resourceNames !== undefined) {
        policyRule['resourceNames'] = [...rule.resourceNames].sort();
      }
      return sortKeys(policyRule) as unknown as K8sPolicyRule;
    });

    const clusterRole: K8sClusterRole = {
      apiVersion: 'rbac.authorization.k8s.io/v1' as const,
      kind: 'ClusterRole' as const,
      metadata,
      rules,
    };

    return sortKeys(clusterRole as unknown as Record<string, unknown>) as unknown as K8sClusterRole;
  }

  /**
   * Generate a RoleBinding resource.
   */
  generateRoleBinding(
    binding: IntentRoleBindingSpec,
    namespace: string
  ): K8sRoleBinding {
    const name = toDNSLabel(binding.name);
    const labels = createLabels(name);

    const metadata = createMetadata(name, namespace, labels);

    const subjects: K8sSubject[] = binding.subjects.map((subject) => {
      const subjectObj: Record<string, unknown> = {
        kind: subject.kind,
        name: subject.name,
        apiGroup: subject.kind === 'ServiceAccount' ? '' : 'rbac.authorization.k8s.io',
      };
      if (subject.namespace !== undefined) {
        subjectObj['namespace'] = subject.namespace;
      }
      return sortKeys(subjectObj) as unknown as K8sSubject;
    });

    const roleBinding: K8sRoleBinding = {
      apiVersion: 'rbac.authorization.k8s.io/v1' as const,
      kind: 'RoleBinding' as const,
      metadata,
      subjects,
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: (binding.clusterWide ? 'ClusterRole' : 'Role') as 'Role' | 'ClusterRole',
        name: toDNSLabel(binding.roleName),
      },
    };

    return sortKeys(roleBinding as unknown as Record<string, unknown>) as unknown as K8sRoleBinding;
  }

  /**
   * Generate a ClusterRoleBinding resource.
   */
  generateClusterRoleBinding(
    binding: IntentRoleBindingSpec
  ): K8sClusterRoleBinding {
    const name = toDNSLabel(binding.name);
    const labels = createLabels(name);

    const metadata = createMetadata(name, undefined, labels);

    const subjects: K8sSubject[] = binding.subjects.map((subject) => {
      const subjectObj: Record<string, unknown> = {
        kind: subject.kind,
        name: subject.name,
        apiGroup: subject.kind === 'ServiceAccount' ? '' : 'rbac.authorization.k8s.io',
      };
      if (subject.namespace !== undefined) {
        subjectObj['namespace'] = subject.namespace;
      }
      return sortKeys(subjectObj) as unknown as K8sSubject;
    });

    const clusterRoleBinding: K8sClusterRoleBinding = {
      apiVersion: 'rbac.authorization.k8s.io/v1' as const,
      kind: 'ClusterRoleBinding' as const,
      metadata,
      subjects,
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'ClusterRole' as const,
        name: toDNSLabel(binding.roleName),
      },
    };

    return sortKeys(clusterRoleBinding as unknown as Record<string, unknown>) as unknown as K8sClusterRoleBinding;
  }

  /**
   * Generate a HorizontalPodAutoscaler resource.
   */
  generateHPA(
    serviceName: string,
    scaling: IntentScalingSpec,
    namespace: string
  ): K8sHPA {
    const name = toDNSLabel(`${serviceName}-hpa`);
    const labels = createLabels(name);

    const metadata = createMetadata(name, namespace, labels);

    const metrics: K8sMetricSpec[] = [];

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
    const spec: Record<string, unknown> = {
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

    const hpa: K8sHPA = {
      apiVersion: 'autoscaling/v2' as const,
      kind: 'HorizontalPodAutoscaler' as const,
      metadata,
      spec: sortKeys(spec) as unknown as K8sHPA['spec'],
    };

    return sortKeys(hpa as unknown as Record<string, unknown>) as unknown as K8sHPA;
  }

  /**
   * Generate a PersistentVolume resource.
   */
  generatePersistentVolume(pv: IntentPVSpec): K8sPersistentVolume {
    const name = toDNSLabel(pv.name);
    const labels = createLabels(name);

    const metadata = createMetadata(name, undefined, labels);

    // Build spec conditionally
    const spec: Record<string, unknown> = {
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
        type: 'DirectoryOrCreate' as const,
      };
    }

    if (pv.nfs !== undefined) {
      spec['nfs'] = {
        server: pv.nfs.server,
        path: pv.nfs.path,
      };
    }

    const pvResource: K8sPersistentVolume = {
      apiVersion: 'v1' as const,
      kind: 'PersistentVolume' as const,
      metadata,
      spec: sortKeys(spec) as unknown as K8sPersistentVolume['spec'],
    };

    return sortKeys(pvResource as unknown as Record<string, unknown>) as unknown as K8sPersistentVolume;
  }

  /**
   * Generate a PersistentVolumeClaim resource.
   */
  generatePersistentVolumeClaim(
    pvc: IntentPVCSpec,
    namespace: string
  ): K8sPersistentVolumeClaim {
    const name = toDNSLabel(pvc.name);
    const labels = createLabels(name);

    const metadata = createMetadata(name, namespace, labels);

    // Build spec conditionally
    const spec: Record<string, unknown> = {
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

    const pvcResource: K8sPersistentVolumeClaim = {
      apiVersion: 'v1' as const,
      kind: 'PersistentVolumeClaim' as const,
      metadata,
      spec: sortKeys(spec) as unknown as K8sPersistentVolumeClaim['spec'],
    };

    return sortKeys(pvcResource as unknown as Record<string, unknown>) as unknown as K8sPersistentVolumeClaim;
  }

  /**
   * Generate a StorageClass resource.
   */
  generateStorageClass(sc: IntentStorageClassSpec): K8sStorageClass {
    const name = toDNSLabel(sc.name);
    const labels = createLabels(name);

    const metadata = createMetadata(name, undefined, labels);

    // Build the storage class conditionally
    const storageClassObj: Record<string, unknown> = {
      apiVersion: 'storage.k8s.io/v1' as const,
      kind: 'StorageClass' as const,
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

    return sortKeys(storageClassObj) as unknown as K8sStorageClass;
  }

  /**
   * Generate a ServiceAccount resource.
   */
  generateServiceAccount(
    name: string,
    namespace: string
  ): K8sServiceAccount {
    const normalizedName = toDNSLabel(name);
    const labels = createLabels(normalizedName);

    const metadata = createMetadata(normalizedName, namespace, labels);

    const serviceAccount: K8sServiceAccount = {
      apiVersion: 'v1' as const,
      kind: 'ServiceAccount' as const,
      metadata,
      automountServiceAccountToken: true,
    };

    return sortKeys(serviceAccount as unknown as Record<string, unknown>) as unknown as K8sServiceAccount;
  }

  // ===========================================================================
  // PRIVATE HELPER METHODS
  // ===========================================================================

  /**
   * Create a container specification from a service spec.
   */
  private createContainer(service: IntentServiceSpec): K8sContainer {
    // Build container object conditionally
    const container: Record<string, unknown> = {
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
          protocol: 'TCP' as const,
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

    return sortKeys(container) as unknown as K8sContainer;
  }

  /**
   * Create environment variables from a key-value map.
   */
  private createEnvVars(
    env?: Readonly<Record<string, string>>
  ): readonly K8sEnvVar[] | undefined {
    if (!env || Object.keys(env).length === 0) {
      return undefined;
    }

    return Object.keys(env)
      .sort()
      .map((name) => ({
        name,
        value: env[name]!,
      }));
  }

  /**
   * Create resource requirements from intent spec.
   */
  private createResourceRequirements(
    resources?: IntentServiceSpec['resources']
  ): K8sResourceRequirements | undefined {
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
  private createProbe(
    healthCheck?: IntentServiceSpec['healthCheck']
  ): K8sProbe | undefined {
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
  private createVolumes(
    service: IntentServiceSpec
  ): readonly K8sVolume[] | undefined {
    if (!service.volumes || service.volumes.length === 0) {
      return undefined;
    }

    return service.volumes.map((vol) => {
      const volumeName = toDNSLabel(vol.name);
      const volume: Record<string, unknown> = { name: volumeName };

      if (vol.configMap) {
        volume['configMap'] = {
          name: toDNSLabel(vol.configMap),
        };
      } else if (vol.secret) {
        volume['secret'] = {
          secretName: toDNSLabel(vol.secret),
        };
      } else if (vol.pvc) {
        const pvcVolume: Record<string, unknown> = {
          claimName: toDNSLabel(vol.pvc),
        };
        if (vol.readOnly !== undefined) {
          pvcVolume['readOnly'] = vol.readOnly;
        }
        volume['persistentVolumeClaim'] = pvcVolume;
      } else {
        // Default to emptyDir
        volume['emptyDir'] = {};
      }

      return volume as unknown as K8sVolume;
    });
  }

  /**
   * Create volume mounts from intent volume specs.
   */
  private createVolumeMounts(
    volumes?: IntentServiceSpec['volumes']
  ): readonly K8sVolumeMount[] | undefined {
    if (!volumes || volumes.length === 0) {
      return undefined;
    }

    return volumes.map((vol) => {
      const mount: Record<string, unknown> = {
        name: toDNSLabel(vol.name),
        mountPath: vol.mountPath,
      };
      if (vol.readOnly !== undefined) {
        mount['readOnly'] = vol.readOnly;
      }
      return mount as unknown as K8sVolumeMount;
    });
  }

  /**
   * Create a pod specification.
   */
  private createPodSpec(
    container: K8sContainer,
    volumes?: readonly K8sVolume[]
  ): K8sPodSpec {
    const podSpec: Record<string, unknown> = {
      containers: [container],
      restartPolicy: 'Always' as const,
      terminationGracePeriodSeconds: 30,
      securityContext: {
        runAsNonRoot: true,
        seccompProfile: {
          type: 'RuntimeDefault' as const,
        },
      },
    };

    if (volumes !== undefined) {
      podSpec['volumes'] = volumes;
    }

    return sortKeys(podSpec) as unknown as K8sPodSpec;
  }
}

/**
 * Singleton instance for the manifest generator.
 */
export const manifestGenerator = new ManifestGenerator();
