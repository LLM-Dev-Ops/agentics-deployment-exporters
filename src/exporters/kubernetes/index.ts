/**
 * Kubernetes Exporter Module
 *
 * Exports Kubernetes manifest generation functionality including:
 * - KubernetesExporter: Main IExporter implementation
 * - ManifestGenerator: K8s resource manifest generation
 * - ResourceQuotaMapper: Resource specification mapping
 * - All Kubernetes-specific types
 *
 * @module exporters/kubernetes
 * @version 1.0.0
 */

// =============================================================================
// MAIN EXPORTER
// =============================================================================

export {
  KubernetesExporter,
  createKubernetesExporter,
} from './KubernetesExporter.js';

// =============================================================================
// GENERATORS AND MAPPERS
// =============================================================================

export {
  ManifestGenerator,
  manifestGenerator,
} from './ManifestGenerator.js';

export {
  ResourceQuotaMapper,
  resourceQuotaMapper,
  parseCPU,
  parseMemory,
  formatCPU,
  formatMemory,
} from './ResourceQuotaMapper.js';

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Base types
  K8sMetadata,
  K8sApiVersion,
  K8sResource,
  K8sLabelSelector,
  K8sLabelSelectorRequirement,

  // Container types
  K8sContainerPort,
  K8sEnvVar,
  K8sEnvVarSource,
  K8sConfigMapKeySelector,
  K8sSecretKeySelector,
  K8sObjectFieldSelector,
  K8sResourceFieldSelector,
  K8sResourceRequirements,
  K8sResourceList,
  K8sVolumeMount,
  K8sProbe,
  K8sHTTPGetAction,
  K8sHTTPHeader,
  K8sTCPSocketAction,
  K8sExecAction,
  K8sSecurityContext,
  K8sCapabilities,
  K8sSeccompProfile,
  K8sContainer,
  K8sEnvFromSource,
  K8sConfigMapEnvSource,
  K8sSecretEnvSource,

  // Volume types
  K8sVolume,
  K8sConfigMapVolumeSource,
  K8sSecretVolumeSource,
  K8sKeyToPath,
  K8sEmptyDirVolumeSource,
  K8sPersistentVolumeClaimVolumeSource,
  K8sHostPathVolumeSource,

  // Pod types
  K8sPodSpec,
  K8sPodSecurityContext,
  K8sToleration,
  K8sAffinity,
  K8sNodeAffinity,
  K8sNodeSelector,
  K8sNodeSelectorTerm,
  K8sNodeSelectorRequirement,
  K8sPreferredSchedulingTerm,
  K8sPodAffinity,
  K8sPodAntiAffinity,
  K8sPodAffinityTerm,
  K8sWeightedPodAffinityTerm,
  K8sLocalObjectReference,
  K8sTopologySpreadConstraint,

  // Workload types
  K8sNamespace,
  K8sDeploymentSpec,
  K8sPodTemplateSpec,
  K8sDeploymentStrategy,
  K8sRollingUpdateDeployment,
  K8sDeployment,

  // Service types
  K8sServicePort,
  K8sServiceSpec,
  K8sService,

  // Config types
  K8sConfigMap,
  K8sSecret,

  // Ingress types
  K8sIngressServiceBackend,
  K8sServiceBackendPort,
  K8sIngressBackend,
  K8sTypedLocalObjectReference,
  K8sHTTPIngressPath,
  K8sHTTPIngressRuleValue,
  K8sIngressRule,
  K8sIngressTLS,
  K8sIngressSpec,
  K8sIngress,

  // Network policy types
  K8sNetworkPolicyIngressRule,
  K8sNetworkPolicyEgressRule,
  K8sNetworkPolicyPeer,
  K8sIPBlock,
  K8sNetworkPolicyPort,
  K8sNetworkPolicySpec,
  K8sNetworkPolicy,

  // RBAC types
  K8sPolicyRule,
  K8sRoleSpec,
  K8sRole,
  K8sClusterRole,
  K8sAggregationRule,
  K8sSubject,
  K8sRoleRef,
  K8sRoleBinding,
  K8sClusterRoleBinding,

  // HPA types
  K8sCrossVersionObjectReference,
  K8sMetricSpec,
  K8sResourceMetricSource,
  K8sContainerResourceMetricSource,
  K8sPodsMetricSource,
  K8sObjectMetricSource,
  K8sExternalMetricSource,
  K8sMetricIdentifier,
  K8sMetricTarget,
  K8sHPABehavior,
  K8sHPAScalingRules,
  K8sHPAScalingPolicy,
  K8sHPASpec,
  K8sHPA,

  // Storage types
  K8sPersistentVolumeSpec,
  K8sVolumeNodeAffinity,
  K8sNFSVolumeSource,
  K8sCSIPersistentVolumeSource,
  K8sSecretReference,
  K8sPersistentVolume,
  K8sPersistentVolumeClaimSpec,
  K8sPersistentVolumeClaim,
  K8sStorageClass,

  // Quota types
  K8sResourceQuotaSpec,
  K8sScopeSelector,
  K8sScopedResourceSelectorRequirement,
  K8sResourceQuotaScope,
  K8sResourceQuota,
  K8sLimitRangeItem,
  K8sLimitRangeSpec,
  K8sLimitRange,

  // Service account
  K8sServiceAccount,

  // Union types
  K8sAnyResource,

  // Intent mapping types
  IntentServiceSpec,
  IntentResourceSpec,
  IntentHealthCheck,
  IntentVolumeSpec,
  IntentConfigSpec,
  IntentNetworkingSpec,
  IntentIngressSpec,
  IntentNetworkPolicySpec,
  IntentNetworkRule,
  IntentNetworkPeer,
  IntentNetworkPort,
  IntentSecuritySpec,
  IntentRoleSpec,
  IntentPolicyRule,
  IntentRoleBindingSpec,
  IntentSubject,
  IntentStorageSpec,
  IntentPVSpec,
  IntentPVCSpec,
  IntentStorageClassSpec,
  IntentScalingSpec,
} from './types.js';
