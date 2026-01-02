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
import type { K8sConfigMap, K8sDeployment, K8sHPA, K8sIngress, K8sNamespace, K8sNetworkPolicy, K8sRole, K8sRoleBinding, K8sClusterRole, K8sClusterRoleBinding, K8sSecret, K8sService, K8sPersistentVolume, K8sPersistentVolumeClaim, K8sStorageClass, K8sServiceAccount, IntentServiceSpec, IntentConfigSpec, IntentIngressSpec, IntentNetworkPolicySpec, IntentRoleSpec, IntentRoleBindingSpec, IntentPVSpec, IntentPVCSpec, IntentStorageClassSpec, IntentScalingSpec } from './types.js';
/**
 * ManifestGenerator creates Kubernetes manifests from intent specifications.
 *
 * All generated manifests are:
 * - Deterministic: Same input always produces identical output
 * - Sorted: All keys and labels are alphabetically ordered
 * - RFC 1123 compliant: All resource names follow DNS label standards
 */
export declare class ManifestGenerator {
    /**
     * Generate a Namespace resource.
     */
    generateNamespace(intent: NormalizedIntent): K8sNamespace;
    /**
     * Generate a Deployment resource from a service specification.
     */
    generateDeployment(service: IntentServiceSpec, namespace: string, _intent: NormalizedIntent): K8sDeployment;
    /**
     * Generate a Service resource from a service specification.
     */
    generateService(service: IntentServiceSpec, namespace: string): K8sService;
    /**
     * Generate a ConfigMap resource from a config specification.
     */
    generateConfigMap(config: IntentConfigSpec, namespace: string): K8sConfigMap;
    /**
     * Generate a Secret resource placeholder from a config specification.
     * Note: Actual secret values should be populated externally.
     */
    generateSecret(config: IntentConfigSpec, namespace: string): K8sSecret;
    /**
     * Generate an Ingress resource from an ingress specification.
     */
    generateIngress(ingress: IntentIngressSpec, namespace: string): K8sIngress;
    /**
     * Generate a NetworkPolicy resource.
     */
    generateNetworkPolicy(policy: IntentNetworkPolicySpec, namespace: string): K8sNetworkPolicy;
    /**
     * Generate a Role resource.
     */
    generateRole(role: IntentRoleSpec, namespace: string): K8sRole;
    /**
     * Generate a ClusterRole resource.
     */
    generateClusterRole(role: IntentRoleSpec): K8sClusterRole;
    /**
     * Generate a RoleBinding resource.
     */
    generateRoleBinding(binding: IntentRoleBindingSpec, namespace: string): K8sRoleBinding;
    /**
     * Generate a ClusterRoleBinding resource.
     */
    generateClusterRoleBinding(binding: IntentRoleBindingSpec): K8sClusterRoleBinding;
    /**
     * Generate a HorizontalPodAutoscaler resource.
     */
    generateHPA(serviceName: string, scaling: IntentScalingSpec, namespace: string): K8sHPA;
    /**
     * Generate a PersistentVolume resource.
     */
    generatePersistentVolume(pv: IntentPVSpec): K8sPersistentVolume;
    /**
     * Generate a PersistentVolumeClaim resource.
     */
    generatePersistentVolumeClaim(pvc: IntentPVCSpec, namespace: string): K8sPersistentVolumeClaim;
    /**
     * Generate a StorageClass resource.
     */
    generateStorageClass(sc: IntentStorageClassSpec): K8sStorageClass;
    /**
     * Generate a ServiceAccount resource.
     */
    generateServiceAccount(name: string, namespace: string): K8sServiceAccount;
    /**
     * Create a container specification from a service spec.
     */
    private createContainer;
    /**
     * Create environment variables from a key-value map.
     */
    private createEnvVars;
    /**
     * Create resource requirements from intent spec.
     */
    private createResourceRequirements;
    /**
     * Create a probe specification from health check config.
     */
    private createProbe;
    /**
     * Create volumes from intent volume specs.
     */
    private createVolumes;
    /**
     * Create volume mounts from intent volume specs.
     */
    private createVolumeMounts;
    /**
     * Create a pod specification.
     */
    private createPodSpec;
}
/**
 * Singleton instance for the manifest generator.
 */
export declare const manifestGenerator: ManifestGenerator;
//# sourceMappingURL=ManifestGenerator.d.ts.map