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
import type {
  ExportArtifact,
  ExporterId,
  ExportFormat,
  ExportOptions,
  NormalizedIntent,
  SemanticVersion,
  SerializerType,
  ValidatedIntent,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../../core/types.js';
import { ManifestGenerator } from './ManifestGenerator.js';
import { ResourceQuotaMapper } from './ResourceQuotaMapper.js';
import type {
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
  K8sAnyResource,
} from './types.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Exporter version following semantic versioning.
 */
const EXPORTER_VERSION: SemanticVersion = '1.0.0';

/**
 * Exporter unique identifier.
 */
const EXPORTER_ID = 'kubernetes' as ExporterId;

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
function sortK8sResource<T extends K8sAnyResource>(resource: T): T {
  // Create ordered object with apiVersion and kind first
  const ordered: Record<string, unknown> = {
    apiVersion: resource.apiVersion,
    kind: resource.kind,
  };

  // Add remaining keys in sorted order
  const remainingKeys = Object.keys(resource)
    .filter((k) => k !== 'apiVersion' && k !== 'kind')
    .sort();

  for (const key of remainingKeys) {
    const value = resource[key as keyof T];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      ordered[key] = sortKeysDeep(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      ordered[key] = value.map((item) =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
          ? sortKeysDeep(item as Record<string, unknown>)
          : item
      );
    } else {
      ordered[key] = value;
    }
  }

  return ordered as T;
}

/**
 * Recursively sort object keys.
 */
function sortKeysDeep<T extends Record<string, unknown>>(obj: T): T {
  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj).sort();

  for (const key of keys) {
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      sorted[key] = sortKeysDeep(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sorted[key] = value.map((item) =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
          ? sortKeysDeep(item as Record<string, unknown>)
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
 */
function toDNSLabel(name: string): string {
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
function isValidDNSLabel(name: string): boolean {
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
export class KubernetesExporter implements IExporter {
  /**
   * Unique identifier for this exporter.
   */
  readonly id: ExporterId = EXPORTER_ID;

  /**
   * Human-readable name.
   */
  readonly name = 'Kubernetes Manifest Exporter';

  /**
   * Exporter version.
   */
  readonly version: SemanticVersion = EXPORTER_VERSION;

  /**
   * Target export format.
   */
  readonly targetFormat: ExportFormat = 'kubernetes';

  /**
   * Manifest generator instance.
   */
  private readonly manifestGenerator: ManifestGenerator;

  /**
   * Resource quota mapper instance.
   */
  private readonly resourceQuotaMapper: ResourceQuotaMapper;

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
  transform(
    intent: NormalizedIntent,
    _options?: ExportOptions
  ): readonly ExportArtifact[] {
    const artifacts: ExportArtifact[] = [];
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
    artifacts.push(this.createArtifact(
      `${basePath}/namespace.yaml`,
      sortK8sResource(namespaceResource),
      intent
    ));

    // Generate deployments and services
    for (const service of services) {
      const deployment = this.manifestGenerator.generateDeployment(
        service,
        namespace,
        intent
      );
      const serviceName = toDNSLabel(service.name);

      artifacts.push(this.createArtifact(
        `${basePath}/deployments/${serviceName}-deployment.yaml`,
        sortK8sResource(deployment),
        intent
      ));

      if (service.port !== undefined) {
        const k8sService = this.manifestGenerator.generateService(
          service,
          namespace
        );
        artifacts.push(this.createArtifact(
          `${basePath}/services/${serviceName}-service.yaml`,
          sortK8sResource(k8sService),
          intent
        ));
      }

      // Generate HPA if scaling is defined
      const serviceScaling = scaling.get(service.name);
      if (serviceScaling) {
        const hpa = this.manifestGenerator.generateHPA(
          service.name,
          serviceScaling,
          namespace
        );
        artifacts.push(this.createArtifact(
          `${basePath}/autoscaling/${serviceName}-hpa.yaml`,
          sortK8sResource(hpa),
          intent
        ));
      }
    }

    // Generate ConfigMaps
    for (const config of configs.filter((c) => c.type !== 'secret')) {
      const configMap = this.manifestGenerator.generateConfigMap(
        config,
        namespace
      );
      const configName = toDNSLabel(config.name);
      artifacts.push(this.createArtifact(
        `${basePath}/configmaps/${configName}-configmap.yaml`,
        sortK8sResource(configMap),
        intent
      ));
    }

    // Generate Secrets (placeholder structure)
    for (const config of configs.filter((c) => c.type === 'secret')) {
      const secret = this.manifestGenerator.generateSecret(config, namespace);
      const secretName = toDNSLabel(config.name);
      artifacts.push(this.createArtifact(
        `${basePath}/secrets/${secretName}-secret.yaml`,
        sortK8sResource(secret),
        intent
      ));
    }

    // Generate Ingress resources
    if (networking.ingress) {
      for (const ingress of networking.ingress) {
        const ingressResource = this.manifestGenerator.generateIngress(
          ingress,
          namespace
        );
        const ingressName = toDNSLabel(ingress.name);
        artifacts.push(this.createArtifact(
          `${basePath}/ingress/${ingressName}-ingress.yaml`,
          sortK8sResource(ingressResource),
          intent
        ));
      }
    }

    // Generate NetworkPolicy resources
    if (networking.networkPolicies) {
      for (const policy of networking.networkPolicies) {
        const policyResource = this.manifestGenerator.generateNetworkPolicy(
          policy,
          namespace
        );
        const policyName = toDNSLabel(policy.name);
        artifacts.push(this.createArtifact(
          `${basePath}/network-policies/${policyName}-networkpolicy.yaml`,
          sortK8sResource(policyResource),
          intent
        ));
      }
    }

    // Generate RBAC resources
    if (security.roles && security.roles.length > 0) {
      const roles: K8sAnyResource[] = [];
      const clusterRoles: K8sAnyResource[] = [];

      for (const role of security.roles) {
        if (role.clusterWide) {
          clusterRoles.push(
            sortK8sResource(this.manifestGenerator.generateClusterRole(role))
          );
        } else {
          roles.push(
            sortK8sResource(this.manifestGenerator.generateRole(role, namespace))
          );
        }
      }

      if (roles.length > 0) {
        artifacts.push(this.createArtifact(
          `${basePath}/rbac/roles.yaml`,
          roles,
          intent
        ));
      }

      if (clusterRoles.length > 0) {
        artifacts.push(this.createArtifact(
          `${basePath}/rbac/cluster-roles.yaml`,
          clusterRoles,
          intent
        ));
      }
    }

    if (security.roleBindings && security.roleBindings.length > 0) {
      const bindings: K8sAnyResource[] = [];
      const clusterBindings: K8sAnyResource[] = [];

      for (const binding of security.roleBindings) {
        if (binding.clusterWide) {
          clusterBindings.push(
            sortK8sResource(this.manifestGenerator.generateClusterRoleBinding(binding))
          );
        } else {
          bindings.push(
            sortK8sResource(this.manifestGenerator.generateRoleBinding(binding, namespace))
          );
        }
      }

      if (bindings.length > 0) {
        artifacts.push(this.createArtifact(
          `${basePath}/rbac/bindings.yaml`,
          bindings,
          intent
        ));
      }

      if (clusterBindings.length > 0) {
        artifacts.push(this.createArtifact(
          `${basePath}/rbac/cluster-bindings.yaml`,
          clusterBindings,
          intent
        ));
      }
    }

    // Generate ServiceAccount if specified
    if (security.serviceAccount) {
      const serviceAccount = this.manifestGenerator.generateServiceAccount(
        security.serviceAccount,
        namespace
      );
      artifacts.push(this.createArtifact(
        `${basePath}/rbac/service-account.yaml`,
        sortK8sResource(serviceAccount),
        intent
      ));
    }

    // Generate storage resources
    if (storage.persistentVolumes) {
      for (const pv of storage.persistentVolumes) {
        const pvResource = this.manifestGenerator.generatePersistentVolume(pv);
        const pvName = toDNSLabel(pv.name);
        artifacts.push(this.createArtifact(
          `${basePath}/storage/pv-${pvName}.yaml`,
          sortK8sResource(pvResource),
          intent
        ));
      }
    }

    if (storage.persistentVolumeClaims) {
      for (const pvc of storage.persistentVolumeClaims) {
        const pvcResource = this.manifestGenerator.generatePersistentVolumeClaim(
          pvc,
          namespace
        );
        const pvcName = toDNSLabel(pvc.name);
        artifacts.push(this.createArtifact(
          `${basePath}/storage/pvc-${pvcName}.yaml`,
          sortK8sResource(pvcResource),
          intent
        ));
      }
    }

    if (storage.storageClasses) {
      for (const sc of storage.storageClasses) {
        const scResource = this.manifestGenerator.generateStorageClass(sc);
        const scName = toDNSLabel(sc.name);
        artifacts.push(this.createArtifact(
          `${basePath}/storage/sc-${scName}.yaml`,
          sortK8sResource(scResource),
          intent
        ));
      }
    }

    // Generate ResourceQuota
    const resourceQuota = this.resourceQuotaMapper.generateResourceQuota(intent);
    artifacts.push(this.createArtifact(
      `${basePath}/quotas/resource-quota.yaml`,
      sortK8sResource(resourceQuota),
      intent
    ));

    // Generate LimitRange
    const limitRange = this.resourceQuotaMapper.generateLimitRange(intent);
    artifacts.push(this.createArtifact(
      `${basePath}/quotas/limit-range.yaml`,
      sortK8sResource(limitRange),
      intent
    ));

    return artifacts;
  }

  /**
   * Validate that an intent can be exported.
   *
   * @param intent - Intent to validate
   * @returns Validation result with errors/warnings
   */
  validate(intent: ValidatedIntent): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

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
      const networking = intent.spec.networking as Record<string, unknown>;
      if (networking.ingress) {
        const ingresses = networking.ingress as IntentIngressSpec[];
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
      const security = intent.spec.security as Record<string, unknown>;
      if (security.roles) {
        const roles = security.roles as IntentRoleSpec[];
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
  canHandle(intent: ValidatedIntent): boolean {
    // Check if target is kubernetes or if kubernetes section exists
    if (intent.spec.target.provider === 'multi') {
      return true;
    }

    // Check for kubernetes-specific resources
    for (const resource of intent.spec.resources) {
      const resourceType = resource.type.toLowerCase();
      if (
        resourceType.includes('kubernetes') ||
        resourceType.includes('k8s') ||
        resourceType.includes('container') ||
        resourceType.includes('deployment') ||
        resourceType.includes('pod')
      ) {
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
  getRequiredSerializers(): readonly SerializerType[] {
    return ['yaml'] as const;
  }

  // ===========================================================================
  // PRIVATE HELPER METHODS
  // ===========================================================================

  /**
   * Create an export artifact with standard metadata.
   */
  private createArtifact(
    path: string,
    content: unknown,
    intent: NormalizedIntent
  ): ExportArtifact {
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
  private extractServices(intent: NormalizedIntent): IntentServiceSpec[] {
    const services: IntentServiceSpec[] = [];

    for (const resource of intent.spec.resources) {
      const props = resource.properties as Record<string, unknown>;

      // Check if this is a service-like resource
      if (
        resource.type.includes('service') ||
        resource.type.includes('container') ||
        resource.type.includes('compute') ||
        props.image
      ) {
        const serviceSpec: IntentServiceSpec = {
          name: resource.name,
          image: (props.image as string) ?? 'nginx:latest',
        };

        // Only add optional properties if they have values
        if (props.replicas !== undefined) {
          (serviceSpec as { replicas?: number }).replicas = props.replicas as number;
        }
        if (props.port !== undefined) {
          (serviceSpec as { port?: number }).port = props.port as number;
        }
        if (props.targetPort !== undefined) {
          (serviceSpec as { targetPort?: number }).targetPort = props.targetPort as number;
        }
        if (props.env !== undefined) {
          (serviceSpec as { env?: Readonly<Record<string, string>> }).env = props.env as Readonly<Record<string, string>>;
        }
        if (props.resources !== undefined) {
          (serviceSpec as { resources?: IntentServiceSpec['resources'] }).resources = props.resources as IntentServiceSpec['resources'];
        }
        if (props.command !== undefined) {
          (serviceSpec as { command?: readonly string[] }).command = props.command as readonly string[];
        }
        if (props.args !== undefined) {
          (serviceSpec as { args?: readonly string[] }).args = props.args as readonly string[];
        }
        if (props.healthCheck !== undefined) {
          (serviceSpec as { healthCheck?: IntentServiceSpec['healthCheck'] }).healthCheck = props.healthCheck as IntentServiceSpec['healthCheck'];
        }
        if (props.volumes !== undefined) {
          (serviceSpec as { volumes?: IntentServiceSpec['volumes'] }).volumes = props.volumes as IntentServiceSpec['volumes'];
        }
        if (props.labels !== undefined) {
          (serviceSpec as { labels?: Readonly<Record<string, string>> }).labels = props.labels as Readonly<Record<string, string>>;
        }
        if (props.annotations !== undefined) {
          (serviceSpec as { annotations?: Readonly<Record<string, string>> }).annotations = props.annotations as Readonly<Record<string, string>>;
        }
        if (props.serviceType !== undefined) {
          (serviceSpec as { serviceType?: IntentServiceSpec['serviceType'] }).serviceType = props.serviceType as IntentServiceSpec['serviceType'];
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
  private extractConfigs(intent: NormalizedIntent): IntentConfigSpec[] {
    const configs: IntentConfigSpec[] = [];

    for (const resource of intent.spec.resources) {
      const props = resource.properties as Record<string, unknown>;

      if (
        resource.type.includes('config') ||
        resource.type.includes('secret') ||
        props.data
      ) {
        const isSecret =
          resource.type.includes('secret') ||
          (props.type as string) === 'secret';

        const configSpec: IntentConfigSpec = {
          name: resource.name,
          data: (props.data as Record<string, string>) ?? {},
        };

        // Only add optional properties if they have values
        if (isSecret) {
          (configSpec as { type?: 'configmap' | 'secret' }).type = 'secret';
        } else {
          (configSpec as { type?: 'configmap' | 'secret' }).type = 'configmap';
        }
        if (props.labels !== undefined) {
          (configSpec as { labels?: Readonly<Record<string, string>> }).labels = props.labels as Readonly<Record<string, string>>;
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
  private extractNetworking(intent: NormalizedIntent): {
    ingress?: IntentIngressSpec[];
    networkPolicies?: IntentNetworkPolicySpec[];
  } {
    const result: {
      ingress?: IntentIngressSpec[];
      networkPolicies?: IntentNetworkPolicySpec[];
    } = {};

    if (intent.spec.networking) {
      const networking = intent.spec.networking as Record<string, unknown>;

      if (networking.ingress) {
        result.ingress = (networking.ingress as IntentIngressSpec[]).sort(
          (a, b) => a.name.localeCompare(b.name)
        );
      }

      if (networking.networkPolicy || networking.networkPolicies) {
        const policies = (networking.networkPolicy ||
          networking.networkPolicies) as IntentNetworkPolicySpec[];
        result.networkPolicies = policies.sort((a, b) =>
          a.name.localeCompare(b.name)
        );
      }
    }

    return result;
  }

  /**
   * Extract security specifications from intent.
   */
  private extractSecurity(intent: NormalizedIntent): {
    serviceAccount?: string;
    roles?: IntentRoleSpec[];
    roleBindings?: IntentRoleBindingSpec[];
  } {
    const result: {
      serviceAccount?: string;
      roles?: IntentRoleSpec[];
      roleBindings?: IntentRoleBindingSpec[];
    } = {};

    if (intent.spec.security) {
      const security = intent.spec.security as Record<string, unknown>;

      if (security.serviceAccount !== undefined) {
        result.serviceAccount = security.serviceAccount as string;
      }

      if (security.roles) {
        result.roles = (security.roles as IntentRoleSpec[]).sort((a, b) =>
          a.name.localeCompare(b.name)
        );
      }

      if (security.roleBindings) {
        result.roleBindings = (
          security.roleBindings as IntentRoleBindingSpec[]
        ).sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    return result;
  }

  /**
   * Extract storage specifications from intent.
   */
  private extractStorage(intent: NormalizedIntent): {
    persistentVolumes?: IntentPVSpec[];
    persistentVolumeClaims?: IntentPVCSpec[];
    storageClasses?: IntentStorageClassSpec[];
  } {
    const result: {
      persistentVolumes?: IntentPVSpec[];
      persistentVolumeClaims?: IntentPVCSpec[];
      storageClasses?: IntentStorageClassSpec[];
    } = {};

    // Check resources for storage items
    for (const resource of intent.spec.resources) {
      const props = resource.properties as Record<string, unknown>;

      if (resource.type.includes('storage') || resource.type.includes('volume')) {
        if (resource.type.includes('class')) {
          result.storageClasses = result.storageClasses ?? [];
          const scSpec: IntentStorageClassSpec = {
            name: resource.name,
            provisioner: (props.provisioner as string) ?? 'kubernetes.io/no-provisioner',
          };
          if (props.parameters !== undefined) {
            (scSpec as { parameters?: Readonly<Record<string, string>> }).parameters = props.parameters as Readonly<Record<string, string>>;
          }
          if (props.reclaimPolicy !== undefined) {
            (scSpec as { reclaimPolicy?: 'Retain' | 'Delete' }).reclaimPolicy = props.reclaimPolicy as 'Retain' | 'Delete';
          }
          if (props.volumeBindingMode !== undefined) {
            (scSpec as { volumeBindingMode?: 'Immediate' | 'WaitForFirstConsumer' }).volumeBindingMode = props.volumeBindingMode as 'Immediate' | 'WaitForFirstConsumer';
          }
          if (props.allowVolumeExpansion !== undefined) {
            (scSpec as { allowVolumeExpansion?: boolean }).allowVolumeExpansion = props.allowVolumeExpansion as boolean;
          }
          result.storageClasses.push(scSpec);
        } else if (resource.type.includes('claim') || resource.type.includes('pvc')) {
          result.persistentVolumeClaims = result.persistentVolumeClaims ?? [];
          const pvcSpec: IntentPVCSpec = {
            name: resource.name,
            accessModes: (props.accessModes as ('ReadWriteOnce' | 'ReadOnlyMany' | 'ReadWriteMany')[]) ?? ['ReadWriteOnce'],
            storage: (props.storage as string) ?? '1Gi',
          };
          if (props.storageClassName !== undefined) {
            (pvcSpec as { storageClassName?: string }).storageClassName = props.storageClassName as string;
          }
          result.persistentVolumeClaims.push(pvcSpec);
        } else {
          result.persistentVolumes = result.persistentVolumes ?? [];
          const pvSpec: IntentPVSpec = {
            name: resource.name,
            capacity: (props.capacity as string) ?? '1Gi',
            accessModes: (props.accessModes as ('ReadWriteOnce' | 'ReadOnlyMany' | 'ReadWriteMany')[]) ?? ['ReadWriteOnce'],
          };
          if (props.storageClassName !== undefined) {
            (pvSpec as { storageClassName?: string }).storageClassName = props.storageClassName as string;
          }
          if (props.hostPath !== undefined) {
            (pvSpec as { hostPath?: string }).hostPath = props.hostPath as string;
          }
          if (props.nfs !== undefined) {
            (pvSpec as { nfs?: { server: string; path: string } }).nfs = props.nfs as { server: string; path: string };
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
  private extractScaling(
    intent: NormalizedIntent
  ): Map<string, IntentScalingSpec> {
    const scaling = new Map<string, IntentScalingSpec>();

    if (intent.spec.scaling) {
      const scalingSpec = intent.spec.scaling as Record<string, unknown>;

      // Check for per-service scaling
      for (const resource of intent.spec.resources) {
        const props = resource.properties as Record<string, unknown>;
        if (props.scaling) {
          const serviceScaling = props.scaling as IntentScalingSpec;
          scaling.set(resource.name, serviceScaling);
        }
      }

      // Check for global scaling config
      if (scalingSpec.services) {
        const serviceScaling = scalingSpec.services as Record<
          string,
          IntentScalingSpec
        >;
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
export function createKubernetesExporter(): KubernetesExporter {
  return new KubernetesExporter();
}
