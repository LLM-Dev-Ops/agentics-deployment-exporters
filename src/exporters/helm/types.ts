/**
 * Helm-Specific Type Definitions
 *
 * This module defines all types specific to Helm chart generation.
 * These types model the structure of Helm charts and their components.
 *
 * @module exporters/helm/types
 * @version 1.0.0
 */

// Types are self-contained for this module

// =============================================================================
// CHART METADATA
// =============================================================================

/**
 * Helm chart maintainer information.
 */
export interface HelmMaintainer {
  readonly name: string;
  readonly email?: string;
  readonly url?: string;
}

/**
 * Helm chart dependency specification.
 */
export interface HelmDependency {
  readonly name: string;
  readonly version: string;
  readonly repository: string;
  readonly condition?: string;
  readonly tags?: readonly string[];
  readonly alias?: string;
}

/**
 * Helm chart metadata (Chart.yaml contents).
 * Follows Helm Chart.yaml v2 specification.
 */
export interface HelmChart {
  readonly apiVersion: 'v2';
  readonly name: string;
  readonly version: string;
  readonly appVersion: string;
  readonly description: string;
  readonly type: 'application' | 'library';
  readonly keywords?: readonly string[] | undefined;
  readonly home?: string | undefined;
  readonly sources?: readonly string[] | undefined;
  readonly maintainers?: readonly HelmMaintainer[] | undefined;
  readonly icon?: string | undefined;
  readonly deprecated?: boolean | undefined;
  readonly annotations?: Readonly<Record<string, string>> | undefined;
  readonly kubeVersion?: string | undefined;
  readonly dependencies?: readonly HelmDependency[] | undefined;
}

// =============================================================================
// VALUES TYPES
// =============================================================================

/**
 * Container image configuration for values.yaml.
 */
export interface HelmImageValues {
  readonly repository: string;
  readonly tag: string;
  readonly pullPolicy: 'Always' | 'IfNotPresent' | 'Never';
}

/**
 * Resource limits and requests for values.yaml.
 */
export interface HelmResourceValues {
  readonly limits: {
    readonly cpu: string;
    readonly memory: string;
  };
  readonly requests: {
    readonly cpu: string;
    readonly memory: string;
  };
}

/**
 * Service configuration for values.yaml.
 */
export interface HelmServiceValues {
  readonly type: 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'ExternalName';
  readonly port: number;
  readonly targetPort?: number;
  readonly nodePort?: number;
  readonly annotations?: Readonly<Record<string, string>>;
}

/**
 * Ingress configuration for values.yaml.
 */
export interface HelmIngressValues {
  readonly enabled: boolean;
  readonly className?: string | undefined;
  readonly annotations?: Readonly<Record<string, string>> | undefined;
  readonly hosts: readonly {
    readonly host: string;
    readonly paths: readonly {
      readonly path: string;
      readonly pathType: 'Prefix' | 'Exact' | 'ImplementationSpecific';
    }[];
  }[];
  readonly tls?: readonly {
    readonly secretName: string;
    readonly hosts: readonly string[];
  }[] | undefined;
}

/**
 * Autoscaling configuration for values.yaml.
 */
export interface HelmAutoscalingValues {
  readonly enabled: boolean;
  readonly minReplicas: number;
  readonly maxReplicas: number;
  readonly targetCPUUtilizationPercentage?: number | undefined;
  readonly targetMemoryUtilizationPercentage?: number | undefined;
}

/**
 * Pod security context for values.yaml.
 */
export interface HelmPodSecurityContext {
  readonly runAsUser?: number | undefined;
  readonly runAsGroup?: number | undefined;
  readonly fsGroup?: number | undefined;
  readonly runAsNonRoot?: boolean | undefined;
}

/**
 * Container security context for values.yaml.
 */
export interface HelmSecurityContext {
  readonly allowPrivilegeEscalation?: boolean | undefined;
  readonly readOnlyRootFilesystem?: boolean | undefined;
  readonly runAsNonRoot?: boolean | undefined;
  readonly runAsUser?: number | undefined;
  readonly capabilities?: {
    readonly drop?: readonly string[] | undefined;
    readonly add?: readonly string[] | undefined;
  } | undefined;
}

/**
 * Probe configuration for values.yaml.
 */
export interface HelmProbeValues {
  readonly enabled: boolean;
  readonly path?: string | undefined;
  readonly port?: number | string | undefined;
  readonly initialDelaySeconds?: number | undefined;
  readonly periodSeconds?: number | undefined;
  readonly timeoutSeconds?: number | undefined;
  readonly successThreshold?: number | undefined;
  readonly failureThreshold?: number | undefined;
}

/**
 * Complete Helm values structure.
 */
export interface HelmValues {
  readonly replicaCount: number;
  readonly image: HelmImageValues;
  readonly imagePullSecrets?: readonly { readonly name: string }[] | undefined;
  readonly nameOverride?: string | undefined;
  readonly fullnameOverride?: string | undefined;
  readonly serviceAccount?: {
    readonly create: boolean;
    readonly annotations?: Readonly<Record<string, string>> | undefined;
    readonly name?: string | undefined;
  } | undefined;
  readonly podAnnotations?: Readonly<Record<string, string>> | undefined;
  readonly podLabels?: Readonly<Record<string, string>> | undefined;
  readonly podSecurityContext?: HelmPodSecurityContext | undefined;
  readonly securityContext?: HelmSecurityContext | undefined;
  readonly service: HelmServiceValues;
  readonly ingress?: HelmIngressValues | undefined;
  readonly resources: HelmResourceValues;
  readonly livenessProbe?: HelmProbeValues | undefined;
  readonly readinessProbe?: HelmProbeValues | undefined;
  readonly autoscaling?: HelmAutoscalingValues | undefined;
  readonly nodeSelector?: Readonly<Record<string, string>> | undefined;
  readonly tolerations?: readonly unknown[] | undefined;
  readonly affinity?: Readonly<Record<string, unknown>> | undefined;
  readonly env?: readonly {
    readonly name: string;
    readonly value?: string | undefined;
    readonly valueFrom?: Readonly<Record<string, unknown>> | undefined;
  }[] | undefined;
  readonly envFrom?: readonly Readonly<Record<string, unknown>>[] | undefined;
  readonly volumeMounts?: readonly Readonly<Record<string, unknown>>[] | undefined;
  readonly volumes?: readonly Readonly<Record<string, unknown>>[] | undefined;
  readonly extraContainers?: readonly Readonly<Record<string, unknown>>[] | undefined;
  readonly initContainers?: readonly Readonly<Record<string, unknown>>[] | undefined;
}

// =============================================================================
// JSON SCHEMA TYPES
// =============================================================================

/**
 * JSON Schema property definition for values.schema.json.
 */
export interface JSONSchemaProperty {
  readonly type: string | readonly string[];
  readonly description?: string;
  readonly default?: unknown;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly enum?: readonly unknown[];
  readonly items?: JSONSchemaProperty;
  readonly properties?: Readonly<Record<string, JSONSchemaProperty>>;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean | JSONSchemaProperty;
}

/**
 * Complete JSON Schema for values.schema.json.
 */
export interface HelmValuesSchema {
  readonly $schema: string;
  readonly type: 'object';
  readonly title: string;
  readonly description: string;
  readonly properties: Readonly<Record<string, JSONSchemaProperty>>;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean;
}

// =============================================================================
// TEMPLATE TYPES
// =============================================================================

/**
 * Represents a single Helm template file.
 */
export interface HelmTemplate {
  readonly name: string;
  readonly content: string;
}

/**
 * Collection of all templates in a Helm chart.
 */
export interface HelmTemplates {
  readonly deployment: HelmTemplate;
  readonly service: HelmTemplate;
  readonly configmap?: HelmTemplate | undefined;
  readonly secret?: HelmTemplate | undefined;
  readonly ingress?: HelmTemplate | undefined;
  readonly serviceaccount?: HelmTemplate | undefined;
  readonly hpa?: HelmTemplate | undefined;
  readonly helpers: HelmTemplate;
  readonly notes: HelmTemplate;
}

// =============================================================================
// HELM EXPORT ARTIFACT TYPES
// =============================================================================

/**
 * Complete Helm chart export structure.
 */
export interface HelmChartExport {
  readonly chart: HelmChart;
  readonly values: HelmValues;
  readonly valuesSchema: HelmValuesSchema;
  readonly templates: HelmTemplates;
}

/**
 * Options for Helm chart generation.
 */
export interface HelmExportOptions {
  /** Include ConfigMap template */
  readonly includeConfigMap?: boolean | undefined;
  /** Include Secret template */
  readonly includeSecret?: boolean | undefined;
  /** Include Ingress template */
  readonly includeIngress?: boolean | undefined;
  /** Include ServiceAccount template */
  readonly includeServiceAccount?: boolean | undefined;
  /** Include HPA template */
  readonly includeHPA?: boolean | undefined;
  /** Chart icon URL */
  readonly iconUrl?: string | undefined;
  /** Chart home URL */
  readonly homeUrl?: string | undefined;
  /** Source repository URLs */
  readonly sourceUrls?: readonly string[] | undefined;
  /** Kubernetes version constraint */
  readonly kubeVersion?: string | undefined;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for HelmChart.
 */
export function isHelmChart(value: unknown): value is HelmChart {
  if (typeof value !== 'object' || value === null) return false;
  const chart = value as Record<string, unknown>;
  return (
    chart['apiVersion'] === 'v2' &&
    typeof chart['name'] === 'string' &&
    typeof chart['version'] === 'string' &&
    typeof chart['description'] === 'string'
  );
}

/**
 * Type guard for HelmValues.
 */
export function isHelmValues(value: unknown): value is HelmValues {
  if (typeof value !== 'object' || value === null) return false;
  const values = value as Record<string, unknown>;
  return (
    typeof values['replicaCount'] === 'number' &&
    typeof values['image'] === 'object' &&
    typeof values['service'] === 'object' &&
    typeof values['resources'] === 'object'
  );
}
