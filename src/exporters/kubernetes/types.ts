/**
 * Kubernetes-specific Type Definitions
 *
 * This module defines all Kubernetes resource types used by the KubernetesExporter.
 * Types follow the Kubernetes API conventions and support deterministic output.
 *
 * @module exporters/kubernetes/types
 * @version 1.0.0
 */

// =============================================================================
// BASE KUBERNETES TYPES
// =============================================================================

/**
 * Base metadata for all Kubernetes resources.
 * Labels and annotations are sorted for deterministic output.
 */
export interface K8sMetadata {
  readonly name?: string;
  readonly namespace?: string;
  readonly labels?: Readonly<Record<string, string>>;
  readonly annotations?: Readonly<Record<string, string>>;
}

/**
 * Required metadata with mandatory name field.
 */
export interface K8sRequiredMetadata {
  readonly name: string;
  readonly namespace?: string;
  readonly labels?: Readonly<Record<string, string>>;
  readonly annotations?: Readonly<Record<string, string>>;
}

/**
 * Type alias for Kubernetes API version strings.
 */
export type K8sApiVersion =
  | 'v1'
  | 'apps/v1'
  | 'networking.k8s.io/v1'
  | 'rbac.authorization.k8s.io/v1'
  | 'autoscaling/v2'
  | 'policy/v1'
  | 'storage.k8s.io/v1';

/**
 * Base interface for all Kubernetes resources.
 * Ensures apiVersion and kind are always first fields.
 */
export interface K8sResource {
  readonly apiVersion: K8sApiVersion;
  readonly kind: string;
  readonly metadata: K8sMetadata;
}

// =============================================================================
// LABEL SELECTOR
// =============================================================================

/**
 * Kubernetes label selector for matching pods/resources.
 */
export interface K8sLabelSelector {
  readonly matchLabels?: Readonly<Record<string, string>>;
  readonly matchExpressions?: readonly K8sLabelSelectorRequirement[];
}

/**
 * Label selector requirement for set-based selection.
 */
export interface K8sLabelSelectorRequirement {
  readonly key: string;
  readonly operator: 'In' | 'NotIn' | 'Exists' | 'DoesNotExist';
  readonly values?: readonly string[];
}

// =============================================================================
// CONTAINER TYPES
// =============================================================================

/**
 * Container port configuration.
 */
export interface K8sContainerPort {
  readonly name?: string;
  readonly containerPort: number;
  readonly protocol?: 'TCP' | 'UDP' | 'SCTP';
}

/**
 * Environment variable definition.
 */
export interface K8sEnvVar {
  readonly name: string;
  readonly value?: string;
  readonly valueFrom?: K8sEnvVarSource;
}

/**
 * Environment variable source reference.
 */
export interface K8sEnvVarSource {
  readonly configMapKeyRef?: K8sConfigMapKeySelector;
  readonly secretKeyRef?: K8sSecretKeySelector;
  readonly fieldRef?: K8sObjectFieldSelector;
  readonly resourceFieldRef?: K8sResourceFieldSelector;
}

/**
 * ConfigMap key selector for environment variables.
 */
export interface K8sConfigMapKeySelector {
  readonly name: string;
  readonly key: string;
  readonly optional?: boolean;
}

/**
 * Secret key selector for environment variables.
 */
export interface K8sSecretKeySelector {
  readonly name: string;
  readonly key: string;
  readonly optional?: boolean;
}

/**
 * Object field selector for environment variables.
 */
export interface K8sObjectFieldSelector {
  readonly fieldPath: string;
  readonly apiVersion?: string;
}

/**
 * Resource field selector for environment variables.
 */
export interface K8sResourceFieldSelector {
  readonly resource: string;
  readonly containerName?: string;
  readonly divisor?: string;
}

/**
 * Resource requirements for containers.
 */
export interface K8sResourceRequirements {
  readonly limits?: K8sResourceList;
  readonly requests?: K8sResourceList;
}

/**
 * Resource list for CPU/memory specifications.
 */
export interface K8sResourceList {
  readonly cpu?: string;
  readonly memory?: string;
  readonly 'ephemeral-storage'?: string;
}

/**
 * Volume mount configuration.
 */
export interface K8sVolumeMount {
  readonly name: string;
  readonly mountPath: string;
  readonly subPath?: string;
  readonly readOnly?: boolean;
}

/**
 * Probe configuration for liveness/readiness checks.
 */
export interface K8sProbe {
  readonly httpGet?: K8sHTTPGetAction;
  readonly tcpSocket?: K8sTCPSocketAction;
  readonly exec?: K8sExecAction;
  readonly initialDelaySeconds?: number;
  readonly periodSeconds?: number;
  readonly timeoutSeconds?: number;
  readonly successThreshold?: number;
  readonly failureThreshold?: number;
}

/**
 * HTTP GET action for probes.
 */
export interface K8sHTTPGetAction {
  readonly path: string;
  readonly port: number | string;
  readonly scheme?: 'HTTP' | 'HTTPS';
  readonly httpHeaders?: readonly K8sHTTPHeader[];
}

/**
 * HTTP header for probe requests.
 */
export interface K8sHTTPHeader {
  readonly name: string;
  readonly value: string;
}

/**
 * TCP socket action for probes.
 */
export interface K8sTCPSocketAction {
  readonly port: number | string;
}

/**
 * Exec action for probes.
 */
export interface K8sExecAction {
  readonly command: readonly string[];
}

/**
 * Security context for containers.
 */
export interface K8sSecurityContext {
  readonly runAsUser?: number;
  readonly runAsGroup?: number;
  readonly runAsNonRoot?: boolean;
  readonly readOnlyRootFilesystem?: boolean;
  readonly allowPrivilegeEscalation?: boolean;
  readonly capabilities?: K8sCapabilities;
  readonly seccompProfile?: K8sSeccompProfile;
}

/**
 * Linux capabilities for security context.
 */
export interface K8sCapabilities {
  readonly add?: readonly string[];
  readonly drop?: readonly string[];
}

/**
 * Seccomp profile configuration.
 */
export interface K8sSeccompProfile {
  readonly type: 'RuntimeDefault' | 'Unconfined' | 'Localhost';
  readonly localhostProfile?: string;
}

/**
 * Container specification.
 */
export interface K8sContainer {
  readonly name: string;
  readonly image: string;
  readonly imagePullPolicy?: 'Always' | 'Never' | 'IfNotPresent';
  readonly command?: readonly string[];
  readonly args?: readonly string[];
  readonly ports?: readonly K8sContainerPort[];
  readonly env?: readonly K8sEnvVar[];
  readonly envFrom?: readonly K8sEnvFromSource[];
  readonly resources?: K8sResourceRequirements;
  readonly volumeMounts?: readonly K8sVolumeMount[];
  readonly livenessProbe?: K8sProbe;
  readonly readinessProbe?: K8sProbe;
  readonly startupProbe?: K8sProbe;
  readonly securityContext?: K8sSecurityContext;
  readonly workingDir?: string;
}

/**
 * Environment from source (ConfigMap or Secret).
 */
export interface K8sEnvFromSource {
  readonly configMapRef?: K8sConfigMapEnvSource;
  readonly secretRef?: K8sSecretEnvSource;
  readonly prefix?: string;
}

/**
 * ConfigMap reference for envFrom.
 */
export interface K8sConfigMapEnvSource {
  readonly name: string;
  readonly optional?: boolean;
}

/**
 * Secret reference for envFrom.
 */
export interface K8sSecretEnvSource {
  readonly name: string;
  readonly optional?: boolean;
}

// =============================================================================
// VOLUME TYPES
// =============================================================================

/**
 * Volume definition.
 */
export interface K8sVolume {
  readonly name: string;
  readonly configMap?: K8sConfigMapVolumeSource;
  readonly secret?: K8sSecretVolumeSource;
  readonly emptyDir?: K8sEmptyDirVolumeSource;
  readonly persistentVolumeClaim?: K8sPersistentVolumeClaimVolumeSource;
  readonly hostPath?: K8sHostPathVolumeSource;
}

/**
 * ConfigMap volume source.
 */
export interface K8sConfigMapVolumeSource {
  readonly name: string;
  readonly items?: readonly K8sKeyToPath[];
  readonly defaultMode?: number;
  readonly optional?: boolean;
}

/**
 * Secret volume source.
 */
export interface K8sSecretVolumeSource {
  readonly secretName: string;
  readonly items?: readonly K8sKeyToPath[];
  readonly defaultMode?: number;
  readonly optional?: boolean;
}

/**
 * Key to path mapping for volumes.
 */
export interface K8sKeyToPath {
  readonly key: string;
  readonly path: string;
  readonly mode?: number;
}

/**
 * Empty directory volume source.
 */
export interface K8sEmptyDirVolumeSource {
  readonly medium?: '' | 'Memory';
  readonly sizeLimit?: string;
}

/**
 * PersistentVolumeClaim volume source.
 */
export interface K8sPersistentVolumeClaimVolumeSource {
  readonly claimName: string;
  readonly readOnly?: boolean;
}

/**
 * HostPath volume source.
 */
export interface K8sHostPathVolumeSource {
  readonly path: string;
  readonly type?: 'DirectoryOrCreate' | 'Directory' | 'FileOrCreate' | 'File' | 'Socket' | 'CharDevice' | 'BlockDevice';
}

// =============================================================================
// POD SPEC
// =============================================================================

/**
 * Pod specification.
 */
export interface K8sPodSpec {
  readonly containers: readonly K8sContainer[];
  readonly initContainers?: readonly K8sContainer[];
  readonly volumes?: readonly K8sVolume[];
  readonly serviceAccountName?: string;
  readonly automountServiceAccountToken?: boolean;
  readonly securityContext?: K8sPodSecurityContext;
  readonly nodeSelector?: Readonly<Record<string, string>>;
  readonly tolerations?: readonly K8sToleration[];
  readonly affinity?: K8sAffinity;
  readonly restartPolicy?: 'Always' | 'OnFailure' | 'Never';
  readonly terminationGracePeriodSeconds?: number;
  readonly dnsPolicy?: 'ClusterFirst' | 'Default' | 'ClusterFirstWithHostNet' | 'None';
  readonly imagePullSecrets?: readonly K8sLocalObjectReference[];
  readonly hostNetwork?: boolean;
  readonly priorityClassName?: string;
  readonly topologySpreadConstraints?: readonly K8sTopologySpreadConstraint[];
}

/**
 * Pod security context.
 */
export interface K8sPodSecurityContext {
  readonly runAsUser?: number;
  readonly runAsGroup?: number;
  readonly runAsNonRoot?: boolean;
  readonly fsGroup?: number;
  readonly supplementalGroups?: readonly number[];
  readonly seccompProfile?: K8sSeccompProfile;
}

/**
 * Toleration for pod scheduling.
 */
export interface K8sToleration {
  readonly key?: string;
  readonly operator?: 'Equal' | 'Exists';
  readonly value?: string;
  readonly effect?: 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute';
  readonly tolerationSeconds?: number;
}

/**
 * Affinity configuration.
 */
export interface K8sAffinity {
  readonly nodeAffinity?: K8sNodeAffinity;
  readonly podAffinity?: K8sPodAffinity;
  readonly podAntiAffinity?: K8sPodAntiAffinity;
}

/**
 * Node affinity configuration.
 */
export interface K8sNodeAffinity {
  readonly requiredDuringSchedulingIgnoredDuringExecution?: K8sNodeSelector;
  readonly preferredDuringSchedulingIgnoredDuringExecution?: readonly K8sPreferredSchedulingTerm[];
}

/**
 * Node selector for affinity.
 */
export interface K8sNodeSelector {
  readonly nodeSelectorTerms: readonly K8sNodeSelectorTerm[];
}

/**
 * Node selector term.
 */
export interface K8sNodeSelectorTerm {
  readonly matchExpressions?: readonly K8sNodeSelectorRequirement[];
  readonly matchFields?: readonly K8sNodeSelectorRequirement[];
}

/**
 * Node selector requirement.
 */
export interface K8sNodeSelectorRequirement {
  readonly key: string;
  readonly operator: 'In' | 'NotIn' | 'Exists' | 'DoesNotExist' | 'Gt' | 'Lt';
  readonly values?: readonly string[];
}

/**
 * Preferred scheduling term.
 */
export interface K8sPreferredSchedulingTerm {
  readonly weight: number;
  readonly preference: K8sNodeSelectorTerm;
}

/**
 * Pod affinity configuration.
 */
export interface K8sPodAffinity {
  readonly requiredDuringSchedulingIgnoredDuringExecution?: readonly K8sPodAffinityTerm[];
  readonly preferredDuringSchedulingIgnoredDuringExecution?: readonly K8sWeightedPodAffinityTerm[];
}

/**
 * Pod anti-affinity configuration.
 */
export interface K8sPodAntiAffinity {
  readonly requiredDuringSchedulingIgnoredDuringExecution?: readonly K8sPodAffinityTerm[];
  readonly preferredDuringSchedulingIgnoredDuringExecution?: readonly K8sWeightedPodAffinityTerm[];
}

/**
 * Pod affinity term.
 */
export interface K8sPodAffinityTerm {
  readonly labelSelector?: K8sLabelSelector;
  readonly topologyKey: string;
  readonly namespaces?: readonly string[];
  readonly namespaceSelector?: K8sLabelSelector;
}

/**
 * Weighted pod affinity term.
 */
export interface K8sWeightedPodAffinityTerm {
  readonly weight: number;
  readonly podAffinityTerm: K8sPodAffinityTerm;
}

/**
 * Local object reference.
 */
export interface K8sLocalObjectReference {
  readonly name: string;
}

/**
 * Topology spread constraint.
 */
export interface K8sTopologySpreadConstraint {
  readonly maxSkew: number;
  readonly topologyKey: string;
  readonly whenUnsatisfiable: 'DoNotSchedule' | 'ScheduleAnyway';
  readonly labelSelector?: K8sLabelSelector;
}

// =============================================================================
// NAMESPACE
// =============================================================================

/**
 * Kubernetes Namespace resource.
 */
export interface K8sNamespace extends K8sResource {
  readonly apiVersion: 'v1';
  readonly kind: 'Namespace';
}

// =============================================================================
// DEPLOYMENT
// =============================================================================

/**
 * Deployment specification.
 */
export interface K8sDeploymentSpec {
  readonly replicas?: number;
  readonly selector: K8sLabelSelector;
  readonly template: K8sPodTemplateSpec;
  readonly strategy?: K8sDeploymentStrategy;
  readonly minReadySeconds?: number;
  readonly revisionHistoryLimit?: number;
  readonly progressDeadlineSeconds?: number;
}

/**
 * Pod template specification.
 */
export interface K8sPodTemplateSpec {
  readonly metadata?: K8sMetadata;
  readonly spec: K8sPodSpec;
}

/**
 * Deployment strategy.
 */
export interface K8sDeploymentStrategy {
  readonly type: 'RollingUpdate' | 'Recreate';
  readonly rollingUpdate?: K8sRollingUpdateDeployment;
}

/**
 * Rolling update deployment configuration.
 */
export interface K8sRollingUpdateDeployment {
  readonly maxUnavailable?: number | string;
  readonly maxSurge?: number | string;
}

/**
 * Kubernetes Deployment resource.
 */
export interface K8sDeployment extends K8sResource {
  readonly apiVersion: 'apps/v1';
  readonly kind: 'Deployment';
  readonly spec: K8sDeploymentSpec;
}

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Service port specification.
 */
export interface K8sServicePort {
  readonly name?: string;
  readonly port: number;
  readonly targetPort?: number | string;
  readonly protocol?: 'TCP' | 'UDP' | 'SCTP';
  readonly nodePort?: number;
  readonly appProtocol?: string;
}

/**
 * Service specification.
 */
export interface K8sServiceSpec {
  readonly type?: 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'ExternalName';
  readonly selector?: Readonly<Record<string, string>>;
  readonly ports: readonly K8sServicePort[];
  readonly clusterIP?: string;
  readonly externalIPs?: readonly string[];
  readonly sessionAffinity?: 'None' | 'ClientIP';
  readonly loadBalancerIP?: string;
  readonly loadBalancerSourceRanges?: readonly string[];
  readonly externalName?: string;
  readonly externalTrafficPolicy?: 'Cluster' | 'Local';
  readonly internalTrafficPolicy?: 'Cluster' | 'Local';
}

/**
 * Kubernetes Service resource.
 */
export interface K8sService extends K8sResource {
  readonly apiVersion: 'v1';
  readonly kind: 'Service';
  readonly spec: K8sServiceSpec;
}

// =============================================================================
// CONFIGMAP
// =============================================================================

/**
 * Kubernetes ConfigMap resource.
 */
export interface K8sConfigMap extends K8sResource {
  readonly apiVersion: 'v1';
  readonly kind: 'ConfigMap';
  readonly data?: Readonly<Record<string, string>>;
  readonly binaryData?: Readonly<Record<string, string>>;
  readonly immutable?: boolean;
}

// =============================================================================
// SECRET
// =============================================================================

/**
 * Kubernetes Secret resource.
 */
export interface K8sSecret extends K8sResource {
  readonly apiVersion: 'v1';
  readonly kind: 'Secret';
  readonly type?: string;
  readonly data?: Readonly<Record<string, string>>;
  readonly stringData?: Readonly<Record<string, string>>;
  readonly immutable?: boolean;
}

// =============================================================================
// INGRESS
// =============================================================================

/**
 * Ingress backend service reference.
 */
export interface K8sIngressServiceBackend {
  readonly name: string;
  readonly port: K8sServiceBackendPort;
}

/**
 * Service backend port.
 */
export interface K8sServiceBackendPort {
  readonly name?: string;
  readonly number?: number;
}

/**
 * Ingress backend.
 */
export interface K8sIngressBackend {
  readonly service?: K8sIngressServiceBackend;
  readonly resource?: K8sTypedLocalObjectReference;
}

/**
 * Typed local object reference.
 */
export interface K8sTypedLocalObjectReference {
  readonly apiGroup?: string;
  readonly kind: string;
  readonly name: string;
}

/**
 * Ingress path.
 */
export interface K8sHTTPIngressPath {
  readonly path?: string;
  readonly pathType: 'Exact' | 'Prefix' | 'ImplementationSpecific';
  readonly backend: K8sIngressBackend;
}

/**
 * HTTP ingress rule value.
 */
export interface K8sHTTPIngressRuleValue {
  readonly paths: readonly K8sHTTPIngressPath[];
}

/**
 * Ingress rule.
 */
export interface K8sIngressRule {
  readonly host?: string;
  readonly http?: K8sHTTPIngressRuleValue;
}

/**
 * Ingress TLS configuration.
 */
export interface K8sIngressTLS {
  readonly hosts?: readonly string[];
  readonly secretName?: string;
}

/**
 * Ingress specification.
 */
export interface K8sIngressSpec {
  readonly ingressClassName?: string;
  readonly defaultBackend?: K8sIngressBackend;
  readonly rules?: readonly K8sIngressRule[];
  readonly tls?: readonly K8sIngressTLS[];
}

/**
 * Kubernetes Ingress resource.
 */
export interface K8sIngress extends K8sResource {
  readonly apiVersion: 'networking.k8s.io/v1';
  readonly kind: 'Ingress';
  readonly spec: K8sIngressSpec;
}

// =============================================================================
// NETWORK POLICY
// =============================================================================

/**
 * Network policy ingress rule.
 */
export interface K8sNetworkPolicyIngressRule {
  readonly from?: readonly K8sNetworkPolicyPeer[];
  readonly ports?: readonly K8sNetworkPolicyPort[];
}

/**
 * Network policy egress rule.
 */
export interface K8sNetworkPolicyEgressRule {
  readonly to?: readonly K8sNetworkPolicyPeer[];
  readonly ports?: readonly K8sNetworkPolicyPort[];
}

/**
 * Network policy peer.
 */
export interface K8sNetworkPolicyPeer {
  readonly podSelector?: K8sLabelSelector;
  readonly namespaceSelector?: K8sLabelSelector;
  readonly ipBlock?: K8sIPBlock;
}

/**
 * IP block for network policy.
 */
export interface K8sIPBlock {
  readonly cidr: string;
  readonly except?: readonly string[];
}

/**
 * Network policy port.
 */
export interface K8sNetworkPolicyPort {
  readonly protocol?: 'TCP' | 'UDP' | 'SCTP';
  readonly port?: number | string;
  readonly endPort?: number;
}

/**
 * Network policy specification.
 */
export interface K8sNetworkPolicySpec {
  readonly podSelector: K8sLabelSelector;
  readonly policyTypes?: readonly ('Ingress' | 'Egress')[];
  readonly ingress?: readonly K8sNetworkPolicyIngressRule[];
  readonly egress?: readonly K8sNetworkPolicyEgressRule[];
}

/**
 * Kubernetes NetworkPolicy resource.
 */
export interface K8sNetworkPolicy extends K8sResource {
  readonly apiVersion: 'networking.k8s.io/v1';
  readonly kind: 'NetworkPolicy';
  readonly spec: K8sNetworkPolicySpec;
}

// =============================================================================
// RBAC TYPES
// =============================================================================

/**
 * Policy rule for RBAC.
 */
export interface K8sPolicyRule {
  readonly apiGroups: readonly string[];
  readonly resources: readonly string[];
  readonly verbs: readonly string[];
  readonly resourceNames?: readonly string[];
  readonly nonResourceURLs?: readonly string[];
}

/**
 * Role specification.
 */
export interface K8sRoleSpec {
  readonly rules: readonly K8sPolicyRule[];
}

/**
 * Kubernetes Role resource.
 */
export interface K8sRole extends K8sResource {
  readonly apiVersion: 'rbac.authorization.k8s.io/v1';
  readonly kind: 'Role';
  readonly rules: readonly K8sPolicyRule[];
}

/**
 * Kubernetes ClusterRole resource.
 */
export interface K8sClusterRole extends K8sResource {
  readonly apiVersion: 'rbac.authorization.k8s.io/v1';
  readonly kind: 'ClusterRole';
  readonly rules: readonly K8sPolicyRule[];
  readonly aggregationRule?: K8sAggregationRule;
}

/**
 * Aggregation rule for ClusterRoles.
 */
export interface K8sAggregationRule {
  readonly clusterRoleSelectors?: readonly K8sLabelSelector[];
}

/**
 * Role binding subject.
 */
export interface K8sSubject {
  readonly kind: 'User' | 'Group' | 'ServiceAccount';
  readonly name: string;
  readonly namespace?: string;
  readonly apiGroup?: string;
}

/**
 * Role reference.
 */
export interface K8sRoleRef {
  readonly apiGroup: string;
  readonly kind: 'Role' | 'ClusterRole';
  readonly name: string;
}

/**
 * Kubernetes RoleBinding resource.
 */
export interface K8sRoleBinding extends K8sResource {
  readonly apiVersion: 'rbac.authorization.k8s.io/v1';
  readonly kind: 'RoleBinding';
  readonly subjects: readonly K8sSubject[];
  readonly roleRef: K8sRoleRef;
}

/**
 * Kubernetes ClusterRoleBinding resource.
 */
export interface K8sClusterRoleBinding extends K8sResource {
  readonly apiVersion: 'rbac.authorization.k8s.io/v1';
  readonly kind: 'ClusterRoleBinding';
  readonly subjects: readonly K8sSubject[];
  readonly roleRef: K8sRoleRef;
}

// =============================================================================
// HPA (Horizontal Pod Autoscaler)
// =============================================================================

/**
 * Cross version object reference.
 */
export interface K8sCrossVersionObjectReference {
  readonly apiVersion: string;
  readonly kind: string;
  readonly name: string;
}

/**
 * Metric specification for HPA.
 */
export interface K8sMetricSpec {
  readonly type: 'Resource' | 'Pods' | 'Object' | 'External' | 'ContainerResource';
  readonly resource?: K8sResourceMetricSource;
  readonly pods?: K8sPodsMetricSource;
  readonly object?: K8sObjectMetricSource;
  readonly external?: K8sExternalMetricSource;
  readonly containerResource?: K8sContainerResourceMetricSource;
}

/**
 * Resource metric source.
 */
export interface K8sResourceMetricSource {
  readonly name: string;
  readonly target: K8sMetricTarget;
}

/**
 * Container resource metric source.
 */
export interface K8sContainerResourceMetricSource {
  readonly name: string;
  readonly container: string;
  readonly target: K8sMetricTarget;
}

/**
 * Pods metric source.
 */
export interface K8sPodsMetricSource {
  readonly metric: K8sMetricIdentifier;
  readonly target: K8sMetricTarget;
}

/**
 * Object metric source.
 */
export interface K8sObjectMetricSource {
  readonly describedObject: K8sCrossVersionObjectReference;
  readonly metric: K8sMetricIdentifier;
  readonly target: K8sMetricTarget;
}

/**
 * External metric source.
 */
export interface K8sExternalMetricSource {
  readonly metric: K8sMetricIdentifier;
  readonly target: K8sMetricTarget;
}

/**
 * Metric identifier.
 */
export interface K8sMetricIdentifier {
  readonly name: string;
  readonly selector?: K8sLabelSelector;
}

/**
 * Metric target.
 */
export interface K8sMetricTarget {
  readonly type: 'Utilization' | 'Value' | 'AverageValue';
  readonly value?: string;
  readonly averageValue?: string;
  readonly averageUtilization?: number;
}

/**
 * HPA behavior.
 */
export interface K8sHPABehavior {
  readonly scaleUp?: K8sHPAScalingRules;
  readonly scaleDown?: K8sHPAScalingRules;
}

/**
 * HPA scaling rules.
 */
export interface K8sHPAScalingRules {
  readonly stabilizationWindowSeconds?: number;
  readonly selectPolicy?: 'Max' | 'Min' | 'Disabled';
  readonly policies?: readonly K8sHPAScalingPolicy[];
}

/**
 * HPA scaling policy.
 */
export interface K8sHPAScalingPolicy {
  readonly type: 'Pods' | 'Percent';
  readonly value: number;
  readonly periodSeconds: number;
}

/**
 * HPA specification.
 */
export interface K8sHPASpec {
  readonly scaleTargetRef: K8sCrossVersionObjectReference;
  readonly minReplicas?: number;
  readonly maxReplicas: number;
  readonly metrics?: readonly K8sMetricSpec[];
  readonly behavior?: K8sHPABehavior;
}

/**
 * Kubernetes HorizontalPodAutoscaler resource.
 */
export interface K8sHPA extends K8sResource {
  readonly apiVersion: 'autoscaling/v2';
  readonly kind: 'HorizontalPodAutoscaler';
  readonly spec: K8sHPASpec;
}

// =============================================================================
// PERSISTENT VOLUME
// =============================================================================

/**
 * PersistentVolume specification.
 */
export interface K8sPersistentVolumeSpec {
  readonly capacity?: Readonly<Record<string, string>>;
  readonly accessModes?: readonly ('ReadWriteOnce' | 'ReadOnlyMany' | 'ReadWriteMany' | 'ReadWriteOncePod')[];
  readonly persistentVolumeReclaimPolicy?: 'Retain' | 'Delete' | 'Recycle';
  readonly storageClassName?: string;
  readonly volumeMode?: 'Filesystem' | 'Block';
  readonly mountOptions?: readonly string[];
  readonly nodeAffinity?: K8sVolumeNodeAffinity;
  readonly hostPath?: K8sHostPathVolumeSource;
  readonly nfs?: K8sNFSVolumeSource;
  readonly csi?: K8sCSIPersistentVolumeSource;
}

/**
 * Volume node affinity.
 */
export interface K8sVolumeNodeAffinity {
  readonly required?: K8sNodeSelector;
}

/**
 * NFS volume source.
 */
export interface K8sNFSVolumeSource {
  readonly server: string;
  readonly path: string;
  readonly readOnly?: boolean;
}

/**
 * CSI persistent volume source.
 */
export interface K8sCSIPersistentVolumeSource {
  readonly driver: string;
  readonly volumeHandle: string;
  readonly readOnly?: boolean;
  readonly fsType?: string;
  readonly volumeAttributes?: Readonly<Record<string, string>>;
  readonly nodeStageSecretRef?: K8sSecretReference;
  readonly nodePublishSecretRef?: K8sSecretReference;
  readonly controllerPublishSecretRef?: K8sSecretReference;
  readonly controllerExpandSecretRef?: K8sSecretReference;
}

/**
 * Secret reference.
 */
export interface K8sSecretReference {
  readonly name: string;
  readonly namespace?: string;
}

/**
 * Kubernetes PersistentVolume resource.
 */
export interface K8sPersistentVolume extends K8sResource {
  readonly apiVersion: 'v1';
  readonly kind: 'PersistentVolume';
  readonly spec: K8sPersistentVolumeSpec;
}

// =============================================================================
// PERSISTENT VOLUME CLAIM
// =============================================================================

/**
 * Storage resource requirements for PVC.
 */
export interface K8sStorageResourceRequirements {
  readonly limits?: Readonly<Record<string, string>>;
  readonly requests?: Readonly<Record<string, string>>;
}

/**
 * PersistentVolumeClaim specification.
 */
export interface K8sPersistentVolumeClaimSpec {
  readonly accessModes?: readonly ('ReadWriteOnce' | 'ReadOnlyMany' | 'ReadWriteMany' | 'ReadWriteOncePod')[];
  readonly selector?: K8sLabelSelector;
  readonly resources?: K8sStorageResourceRequirements;
  readonly volumeName?: string;
  readonly storageClassName?: string;
  readonly volumeMode?: 'Filesystem' | 'Block';
  readonly dataSource?: K8sTypedLocalObjectReference;
  readonly dataSourceRef?: K8sTypedLocalObjectReference;
}

/**
 * Kubernetes PersistentVolumeClaim resource.
 */
export interface K8sPersistentVolumeClaim extends K8sResource {
  readonly apiVersion: 'v1';
  readonly kind: 'PersistentVolumeClaim';
  readonly spec: K8sPersistentVolumeClaimSpec;
}

// =============================================================================
// STORAGE CLASS
// =============================================================================

/**
 * Kubernetes StorageClass resource.
 */
export interface K8sStorageClass extends K8sResource {
  readonly apiVersion: 'storage.k8s.io/v1';
  readonly kind: 'StorageClass';
  readonly provisioner: string;
  readonly parameters?: Readonly<Record<string, string>>;
  readonly reclaimPolicy?: 'Retain' | 'Delete';
  readonly volumeBindingMode?: 'Immediate' | 'WaitForFirstConsumer';
  readonly allowVolumeExpansion?: boolean;
  readonly mountOptions?: readonly string[];
}

// =============================================================================
// RESOURCE QUOTA
// =============================================================================

/**
 * ResourceQuota specification.
 */
export interface K8sResourceQuotaSpec {
  readonly hard?: Readonly<Record<string, string>>;
  readonly scopeSelector?: K8sScopeSelector;
  readonly scopes?: readonly K8sResourceQuotaScope[];
}

/**
 * Scope selector for resource quota.
 */
export interface K8sScopeSelector {
  readonly matchExpressions?: readonly K8sScopedResourceSelectorRequirement[];
}

/**
 * Scoped resource selector requirement.
 */
export interface K8sScopedResourceSelectorRequirement {
  readonly scopeName: K8sResourceQuotaScope;
  readonly operator: 'In' | 'NotIn' | 'Exists' | 'DoesNotExist';
  readonly values?: readonly string[];
}

/**
 * Resource quota scope.
 */
export type K8sResourceQuotaScope =
  | 'Terminating'
  | 'NotTerminating'
  | 'BestEffort'
  | 'NotBestEffort'
  | 'PriorityClass'
  | 'CrossNamespacePodAffinity';

/**
 * Kubernetes ResourceQuota resource.
 */
export interface K8sResourceQuota extends K8sResource {
  readonly apiVersion: 'v1';
  readonly kind: 'ResourceQuota';
  readonly spec: K8sResourceQuotaSpec;
}

// =============================================================================
// LIMIT RANGE
// =============================================================================

/**
 * LimitRange item.
 */
export interface K8sLimitRangeItem {
  readonly type: 'Pod' | 'Container' | 'PersistentVolumeClaim';
  readonly max?: K8sResourceList;
  readonly min?: K8sResourceList;
  readonly default?: K8sResourceList;
  readonly defaultRequest?: K8sResourceList;
  readonly maxLimitRequestRatio?: K8sResourceList;
}

/**
 * LimitRange specification.
 */
export interface K8sLimitRangeSpec {
  readonly limits: readonly K8sLimitRangeItem[];
}

/**
 * Kubernetes LimitRange resource.
 */
export interface K8sLimitRange extends K8sResource {
  readonly apiVersion: 'v1';
  readonly kind: 'LimitRange';
  readonly spec: K8sLimitRangeSpec;
}

// =============================================================================
// SERVICE ACCOUNT
// =============================================================================

/**
 * Kubernetes ServiceAccount resource.
 */
export interface K8sServiceAccount extends K8sResource {
  readonly apiVersion: 'v1';
  readonly kind: 'ServiceAccount';
  readonly automountServiceAccountToken?: boolean;
  readonly secrets?: readonly K8sLocalObjectReference[];
  readonly imagePullSecrets?: readonly K8sLocalObjectReference[];
}

// =============================================================================
// UNION TYPES
// =============================================================================

/**
 * Union type for all Kubernetes resources.
 */
export type K8sAnyResource =
  | K8sNamespace
  | K8sDeployment
  | K8sService
  | K8sConfigMap
  | K8sSecret
  | K8sIngress
  | K8sNetworkPolicy
  | K8sRole
  | K8sClusterRole
  | K8sRoleBinding
  | K8sClusterRoleBinding
  | K8sHPA
  | K8sPersistentVolume
  | K8sPersistentVolumeClaim
  | K8sStorageClass
  | K8sResourceQuota
  | K8sLimitRange
  | K8sServiceAccount;

// =============================================================================
// INTENT MAPPING TYPES
// =============================================================================

/**
 * Service specification from intent.
 */
export interface IntentServiceSpec {
  readonly name: string;
  readonly image: string;
  readonly replicas?: number;
  readonly port?: number;
  readonly targetPort?: number;
  readonly env?: Readonly<Record<string, string>>;
  readonly resources?: IntentResourceSpec;
  readonly command?: readonly string[];
  readonly args?: readonly string[];
  readonly healthCheck?: IntentHealthCheck;
  readonly volumes?: readonly IntentVolumeSpec[];
  readonly labels?: Readonly<Record<string, string>>;
  readonly annotations?: Readonly<Record<string, string>>;
  readonly serviceType?: 'ClusterIP' | 'NodePort' | 'LoadBalancer';
}

/**
 * Resource specification from intent.
 */
export interface IntentResourceSpec {
  readonly cpu?: string;
  readonly memory?: string;
  readonly cpuLimit?: string;
  readonly memoryLimit?: string;
}

/**
 * Health check from intent.
 */
export interface IntentHealthCheck {
  readonly path?: string;
  readonly port?: number;
  readonly initialDelaySeconds?: number;
  readonly periodSeconds?: number;
  readonly type?: 'http' | 'tcp' | 'exec';
  readonly command?: readonly string[];
}

/**
 * Volume specification from intent.
 */
export interface IntentVolumeSpec {
  readonly name: string;
  readonly mountPath: string;
  readonly configMap?: string;
  readonly secret?: string;
  readonly emptyDir?: boolean;
  readonly pvc?: string;
  readonly readOnly?: boolean;
}

/**
 * Config specification from intent.
 */
export interface IntentConfigSpec {
  readonly name: string;
  readonly data: Readonly<Record<string, string>>;
  readonly type?: 'configmap' | 'secret';
  readonly labels?: Readonly<Record<string, string>>;
}

/**
 * Networking specification from intent.
 */
export interface IntentNetworkingSpec {
  readonly ingress?: IntentIngressSpec;
  readonly networkPolicy?: IntentNetworkPolicySpec;
}

/**
 * Ingress specification from intent.
 */
export interface IntentIngressSpec {
  readonly name: string;
  readonly host: string;
  readonly path?: string;
  readonly pathType?: 'Exact' | 'Prefix';
  readonly serviceName: string;
  readonly servicePort: number;
  readonly tls?: boolean;
  readonly tlsSecretName?: string;
  readonly ingressClassName?: string;
  readonly annotations?: Readonly<Record<string, string>>;
}

/**
 * Network policy specification from intent.
 */
export interface IntentNetworkPolicySpec {
  readonly name: string;
  readonly podSelector: Readonly<Record<string, string>>;
  readonly ingress?: readonly IntentNetworkRule[];
  readonly egress?: readonly IntentNetworkRule[];
}

/**
 * Network rule from intent.
 */
export interface IntentNetworkRule {
  readonly from?: readonly IntentNetworkPeer[];
  readonly to?: readonly IntentNetworkPeer[];
  readonly ports?: readonly IntentNetworkPort[];
}

/**
 * Network peer from intent.
 */
export interface IntentNetworkPeer {
  readonly podSelector?: Readonly<Record<string, string>>;
  readonly namespaceSelector?: Readonly<Record<string, string>>;
  readonly cidr?: string;
}

/**
 * Network port from intent.
 */
export interface IntentNetworkPort {
  readonly port: number;
  readonly protocol?: 'TCP' | 'UDP';
}

/**
 * Security specification from intent.
 */
export interface IntentSecuritySpec {
  readonly serviceAccount?: string;
  readonly roles?: readonly IntentRoleSpec[];
  readonly roleBindings?: readonly IntentRoleBindingSpec[];
}

/**
 * Role specification from intent.
 */
export interface IntentRoleSpec {
  readonly name: string;
  readonly clusterWide?: boolean;
  readonly rules: readonly IntentPolicyRule[];
}

/**
 * Policy rule from intent.
 */
export interface IntentPolicyRule {
  readonly apiGroups: readonly string[];
  readonly resources: readonly string[];
  readonly verbs: readonly string[];
  readonly resourceNames?: readonly string[];
}

/**
 * Role binding specification from intent.
 */
export interface IntentRoleBindingSpec {
  readonly name: string;
  readonly roleName: string;
  readonly clusterWide?: boolean;
  readonly subjects: readonly IntentSubject[];
}

/**
 * Subject from intent.
 */
export interface IntentSubject {
  readonly kind: 'User' | 'Group' | 'ServiceAccount';
  readonly name: string;
  readonly namespace?: string;
}

/**
 * Storage specification from intent.
 */
export interface IntentStorageSpec {
  readonly persistentVolumes?: readonly IntentPVSpec[];
  readonly persistentVolumeClaims?: readonly IntentPVCSpec[];
  readonly storageClasses?: readonly IntentStorageClassSpec[];
}

/**
 * Persistent volume specification from intent.
 */
export interface IntentPVSpec {
  readonly name: string;
  readonly capacity: string;
  readonly accessModes: readonly ('ReadWriteOnce' | 'ReadOnlyMany' | 'ReadWriteMany')[];
  readonly storageClassName?: string;
  readonly hostPath?: string;
  readonly nfs?: { server: string; path: string };
}

/**
 * Persistent volume claim specification from intent.
 */
export interface IntentPVCSpec {
  readonly name: string;
  readonly storageClassName?: string;
  readonly accessModes: readonly ('ReadWriteOnce' | 'ReadOnlyMany' | 'ReadWriteMany')[];
  readonly storage: string;
}

/**
 * Storage class specification from intent.
 */
export interface IntentStorageClassSpec {
  readonly name: string;
  readonly provisioner: string;
  readonly parameters?: Readonly<Record<string, string>>;
  readonly reclaimPolicy?: 'Retain' | 'Delete';
  readonly volumeBindingMode?: 'Immediate' | 'WaitForFirstConsumer';
  readonly allowVolumeExpansion?: boolean;
}

/**
 * Scaling specification from intent.
 */
export interface IntentScalingSpec {
  readonly minReplicas?: number;
  readonly maxReplicas: number;
  readonly targetCPUUtilization?: number;
  readonly targetMemoryUtilization?: number;
}
