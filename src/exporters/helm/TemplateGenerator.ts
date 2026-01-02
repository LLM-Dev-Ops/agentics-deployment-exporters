/**
 * Template Generator for Helm Charts
 *
 * Generates deterministic Helm templates from NormalizedIntent.
 * Templates use Go templating syntax with Helm-specific functions.
 *
 * @module exporters/helm/TemplateGenerator
 * @version 1.0.0
 */

import type { NormalizedIntent } from '../../core/types.js';
import type { HelmTemplates } from './types.js';

// =============================================================================
// TEMPLATE STRINGS
// =============================================================================

/**
 * Helpers template (_helpers.tpl)
 * Contains named templates for consistent naming across resources.
 */
const HELPERS_TEMPLATE = `{{/*
Expand the name of the chart.
*/}}
{{- define "<CHART_NAME>.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "<CHART_NAME>.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "<CHART_NAME>.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "<CHART_NAME>.labels" -}}
helm.sh/chart: {{ include "<CHART_NAME>.chart" . }}
{{ include "<CHART_NAME>.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "<CHART_NAME>.selectorLabels" -}}
app.kubernetes.io/name: {{ include "<CHART_NAME>.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "<CHART_NAME>.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "<CHART_NAME>.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
`;

/**
 * Deployment template
 */
const DEPLOYMENT_TEMPLATE = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "<CHART_NAME>.fullname" . }}
  labels:
    {{- include "<CHART_NAME>.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "<CHART_NAME>.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      {{- with .Values.podAnnotations }}
      annotations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      labels:
        {{- include "<CHART_NAME>.labels" . | nindent 8 }}
        {{- with .Values.podLabels }}
        {{- toYaml . | nindent 8 }}
        {{- end }}
    spec:
      {{- with .Values.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      serviceAccountName: {{ include "<CHART_NAME>.serviceAccountName" . }}
      {{- with .Values.podSecurityContext }}
      securityContext:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      containers:
        - name: {{ .Chart.Name }}
          {{- with .Values.securityContext }}
          securityContext:
            {{- toYaml . | nindent 12 }}
          {{- end }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.service.targetPort | default .Values.service.port }}
              protocol: TCP
          {{- if .Values.livenessProbe }}
          {{- if .Values.livenessProbe.enabled }}
          livenessProbe:
            httpGet:
              path: {{ .Values.livenessProbe.path | default "/" }}
              port: http
            {{- if .Values.livenessProbe.initialDelaySeconds }}
            initialDelaySeconds: {{ .Values.livenessProbe.initialDelaySeconds }}
            {{- end }}
            {{- if .Values.livenessProbe.periodSeconds }}
            periodSeconds: {{ .Values.livenessProbe.periodSeconds }}
            {{- end }}
            {{- if .Values.livenessProbe.timeoutSeconds }}
            timeoutSeconds: {{ .Values.livenessProbe.timeoutSeconds }}
            {{- end }}
            {{- if .Values.livenessProbe.failureThreshold }}
            failureThreshold: {{ .Values.livenessProbe.failureThreshold }}
            {{- end }}
          {{- end }}
          {{- end }}
          {{- if .Values.readinessProbe }}
          {{- if .Values.readinessProbe.enabled }}
          readinessProbe:
            httpGet:
              path: {{ .Values.readinessProbe.path | default "/" }}
              port: http
            {{- if .Values.readinessProbe.initialDelaySeconds }}
            initialDelaySeconds: {{ .Values.readinessProbe.initialDelaySeconds }}
            {{- end }}
            {{- if .Values.readinessProbe.periodSeconds }}
            periodSeconds: {{ .Values.readinessProbe.periodSeconds }}
            {{- end }}
            {{- if .Values.readinessProbe.timeoutSeconds }}
            timeoutSeconds: {{ .Values.readinessProbe.timeoutSeconds }}
            {{- end }}
            {{- if .Values.readinessProbe.successThreshold }}
            successThreshold: {{ .Values.readinessProbe.successThreshold }}
            {{- end }}
          {{- end }}
          {{- end }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          {{- with .Values.env }}
          env:
            {{- toYaml . | nindent 12 }}
          {{- end }}
          {{- with .Values.envFrom }}
          envFrom:
            {{- toYaml . | nindent 12 }}
          {{- end }}
          {{- with .Values.volumeMounts }}
          volumeMounts:
            {{- toYaml . | nindent 12 }}
          {{- end }}
      {{- with .Values.initContainers }}
      initContainers:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.volumes }}
      volumes:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.affinity }}
      affinity:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.tolerations }}
      tolerations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
`;

/**
 * Service template
 */
const SERVICE_TEMPLATE = `apiVersion: v1
kind: Service
metadata:
  name: {{ include "<CHART_NAME>.fullname" . }}
  labels:
    {{- include "<CHART_NAME>.labels" . | nindent 4 }}
  {{- with .Values.service.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: {{ .Values.service.targetPort | default .Values.service.port }}
      protocol: TCP
      name: http
      {{- if and (eq .Values.service.type "NodePort") .Values.service.nodePort }}
      nodePort: {{ .Values.service.nodePort }}
      {{- end }}
  selector:
    {{- include "<CHART_NAME>.selectorLabels" . | nindent 4 }}
`;

/**
 * ConfigMap template
 */
const CONFIGMAP_TEMPLATE = `{{- if .Values.configMap }}
{{- if .Values.configMap.enabled }}
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "<CHART_NAME>.fullname" . }}
  labels:
    {{- include "<CHART_NAME>.labels" . | nindent 4 }}
data:
  {{- range $key, $value := .Values.configMap.data }}
  {{ $key }}: {{ $value | quote }}
  {{- end }}
{{- end }}
{{- end }}
`;

/**
 * Secret template
 */
const SECRET_TEMPLATE = `{{- if .Values.secret }}
{{- if .Values.secret.enabled }}
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "<CHART_NAME>.fullname" . }}
  labels:
    {{- include "<CHART_NAME>.labels" . | nindent 4 }}
type: {{ .Values.secret.type | default "Opaque" }}
data:
  {{- range $key, $value := .Values.secret.data }}
  {{ $key }}: {{ $value | b64enc | quote }}
  {{- end }}
{{- end }}
{{- end }}
`;

/**
 * Ingress template
 */
const INGRESS_TEMPLATE = `{{- if .Values.ingress.enabled -}}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "<CHART_NAME>.fullname" . }}
  labels:
    {{- include "<CHART_NAME>.labels" . | nindent 4 }}
  {{- with .Values.ingress.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  {{- if .Values.ingress.className }}
  ingressClassName: {{ .Values.ingress.className }}
  {{- end }}
  {{- if .Values.ingress.tls }}
  tls:
    {{- range .Values.ingress.tls }}
    - hosts:
        {{- range .hosts }}
        - {{ . | quote }}
        {{- end }}
      secretName: {{ .secretName }}
    {{- end }}
  {{- end }}
  rules:
    {{- range .Values.ingress.hosts }}
    - host: {{ .host | quote }}
      http:
        paths:
          {{- range .paths }}
          - path: {{ .path }}
            pathType: {{ .pathType }}
            backend:
              service:
                name: {{ include "<CHART_NAME>.fullname" $ }}
                port:
                  number: {{ $.Values.service.port }}
          {{- end }}
    {{- end }}
{{- end }}
`;

/**
 * ServiceAccount template
 */
const SERVICEACCOUNT_TEMPLATE = `{{- if .Values.serviceAccount.create -}}
apiVersion: v1
kind: ServiceAccount
metadata:
  name: {{ include "<CHART_NAME>.serviceAccountName" . }}
  labels:
    {{- include "<CHART_NAME>.labels" . | nindent 4 }}
  {{- with .Values.serviceAccount.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
automountServiceAccountToken: {{ .Values.serviceAccount.automount | default true }}
{{- end }}
`;

/**
 * HPA (Horizontal Pod Autoscaler) template
 */
const HPA_TEMPLATE = `{{- if .Values.autoscaling.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "<CHART_NAME>.fullname" . }}
  labels:
    {{- include "<CHART_NAME>.labels" . | nindent 4 }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "<CHART_NAME>.fullname" . }}
  minReplicas: {{ .Values.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.autoscaling.maxReplicas }}
  metrics:
    {{- if .Values.autoscaling.targetCPUUtilizationPercentage }}
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.autoscaling.targetCPUUtilizationPercentage }}
    {{- end }}
    {{- if .Values.autoscaling.targetMemoryUtilizationPercentage }}
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: {{ .Values.autoscaling.targetMemoryUtilizationPercentage }}
    {{- end }}
{{- end }}
`;

/**
 * NOTES.txt template (post-install instructions)
 */
const NOTES_TEMPLATE = `<CHART_DESCRIPTION>

Chart Version: {{ .Chart.Version }}
App Version: {{ .Chart.AppVersion }}

Get the application URL by running these commands:
{{- if .Values.ingress.enabled }}
{{- range $host := .Values.ingress.hosts }}
  {{- range .paths }}
  http{{ if $.Values.ingress.tls }}s{{ end }}://{{ $host.host }}{{ .path }}
  {{- end }}
{{- end }}
{{- else if contains "NodePort" .Values.service.type }}
  export NODE_PORT=$(kubectl get --namespace {{ .Release.Namespace }} -o jsonpath="{.spec.ports[0].nodePort}" services {{ include "<CHART_NAME>.fullname" . }})
  export NODE_IP=$(kubectl get nodes --namespace {{ .Release.Namespace }} -o jsonpath="{.items[0].status.addresses[0].address}")
  echo http://$NODE_IP:$NODE_PORT
{{- else if contains "LoadBalancer" .Values.service.type }}
     NOTE: It may take a few minutes for the LoadBalancer IP to be available.
           You can watch the status by running 'kubectl get --namespace {{ .Release.Namespace }} svc -w {{ include "<CHART_NAME>.fullname" . }}'
  export SERVICE_IP=$(kubectl get svc --namespace {{ .Release.Namespace }} {{ include "<CHART_NAME>.fullname" . }} --template "{{"{{ range (index .status.loadBalancer.ingress 0) }}{{.}}{{ end }}"}}")
  echo http://$SERVICE_IP:{{ .Values.service.port }}
{{- else if contains "ClusterIP" .Values.service.type }}
  export POD_NAME=$(kubectl get pods --namespace {{ .Release.Namespace }} -l "app.kubernetes.io/name={{ include "<CHART_NAME>.name" . }},app.kubernetes.io/instance={{ .Release.Name }}" -o jsonpath="{.items[0].metadata.name}")
  export CONTAINER_PORT=$(kubectl get pod --namespace {{ .Release.Namespace }} $POD_NAME -o jsonpath="{.spec.containers[0].ports[0].containerPort}")
  echo "Visit http://127.0.0.1:8080 to use your application"
  kubectl --namespace {{ .Release.Namespace }} port-forward $POD_NAME 8080:$CONTAINER_PORT
{{- end }}

---
Generated by Agentics Deployment Exporters
Intent ID: {{ .Chart.Annotations | index "agentics.io/intent-id" }}
Canonical Hash: {{ .Chart.Annotations | index "agentics.io/canonical-hash" }}
`;

// =============================================================================
// TEMPLATE GENERATOR CLASS
// =============================================================================

/**
 * TemplateGenerator creates Helm templates from NormalizedIntent.
 *
 * Design principles:
 * - Deterministic output (same intent = same templates)
 * - Uses Helm best practices and conventions
 * - Templates are parameterized for flexibility
 */
export class TemplateGenerator {
  /**
   * Generate all Helm templates from normalized intent.
   *
   * @param intent - Normalized deployment intent
   * @param options - Optional generation options
   * @returns Complete set of Helm templates
   */
  public generateTemplates(
    intent: NormalizedIntent,
    options?: TemplateGeneratorOptions
  ): HelmTemplates {
    const chartName = this.sanitizeChartName(intent.intentId);
    const description = this.extractDescription(intent);

    return {
      deployment: {
        name: 'deployment.yaml',
        content: this.generateDeploymentTemplate(intent, chartName),
      },
      service: {
        name: 'service.yaml',
        content: this.generateServiceTemplate(intent, chartName),
      },
      configmap: options?.includeConfigMap
        ? {
            name: 'configmap.yaml',
            content: this.generateConfigMapTemplate(intent, chartName),
          }
        : undefined,
      secret: options?.includeSecret
        ? {
            name: 'secret.yaml',
            content: this.generateSecretTemplate(intent, chartName),
          }
        : undefined,
      ingress: options?.includeIngress !== false
        ? {
            name: 'ingress.yaml',
            content: this.generateIngressTemplate(intent, chartName),
          }
        : undefined,
      serviceaccount: options?.includeServiceAccount !== false
        ? {
            name: 'serviceaccount.yaml',
            content: this.generateServiceAccountTemplate(intent, chartName),
          }
        : undefined,
      hpa: options?.includeHPA !== false
        ? {
            name: 'hpa.yaml',
            content: this.generateHPATemplate(intent, chartName),
          }
        : undefined,
      helpers: {
        name: '_helpers.tpl',
        content: this.generateHelpersTemplate(intent, chartName),
      },
      notes: {
        name: 'NOTES.txt',
        content: this.generateNotesTemplate(intent, chartName, description),
      },
    };
  }

  /**
   * Generate deployment template.
   *
   * @param intent - Normalized intent
   * @param chartName - Sanitized chart name
   * @returns Deployment template content
   */
  public generateDeploymentTemplate(intent: NormalizedIntent, chartName?: string): string {
    const name = chartName ?? this.sanitizeChartName(intent.intentId);
    return this.replaceChartName(DEPLOYMENT_TEMPLATE, name);
  }

  /**
   * Generate service template.
   *
   * @param intent - Normalized intent
   * @param chartName - Sanitized chart name
   * @returns Service template content
   */
  public generateServiceTemplate(intent: NormalizedIntent, chartName?: string): string {
    const name = chartName ?? this.sanitizeChartName(intent.intentId);
    return this.replaceChartName(SERVICE_TEMPLATE, name);
  }

  /**
   * Generate ConfigMap template.
   *
   * @param intent - Normalized intent
   * @param chartName - Sanitized chart name
   * @returns ConfigMap template content
   */
  public generateConfigMapTemplate(intent: NormalizedIntent, chartName?: string): string {
    const name = chartName ?? this.sanitizeChartName(intent.intentId);
    return this.replaceChartName(CONFIGMAP_TEMPLATE, name);
  }

  /**
   * Generate Secret template.
   *
   * @param intent - Normalized intent
   * @param chartName - Sanitized chart name
   * @returns Secret template content
   */
  public generateSecretTemplate(intent: NormalizedIntent, chartName?: string): string {
    const name = chartName ?? this.sanitizeChartName(intent.intentId);
    return this.replaceChartName(SECRET_TEMPLATE, name);
  }

  /**
   * Generate Ingress template.
   *
   * @param intent - Normalized intent
   * @param chartName - Sanitized chart name
   * @returns Ingress template content
   */
  public generateIngressTemplate(intent: NormalizedIntent, chartName?: string): string {
    const name = chartName ?? this.sanitizeChartName(intent.intentId);
    return this.replaceChartName(INGRESS_TEMPLATE, name);
  }

  /**
   * Generate ServiceAccount template.
   *
   * @param intent - Normalized intent
   * @param chartName - Sanitized chart name
   * @returns ServiceAccount template content
   */
  public generateServiceAccountTemplate(intent: NormalizedIntent, chartName?: string): string {
    const name = chartName ?? this.sanitizeChartName(intent.intentId);
    return this.replaceChartName(SERVICEACCOUNT_TEMPLATE, name);
  }

  /**
   * Generate HPA template.
   *
   * @param intent - Normalized intent
   * @param chartName - Sanitized chart name
   * @returns HPA template content
   */
  public generateHPATemplate(intent: NormalizedIntent, chartName?: string): string {
    const name = chartName ?? this.sanitizeChartName(intent.intentId);
    return this.replaceChartName(HPA_TEMPLATE, name);
  }

  /**
   * Generate helpers template (_helpers.tpl).
   *
   * @param intent - Normalized intent
   * @param chartName - Sanitized chart name
   * @returns Helpers template content
   */
  public generateHelpersTemplate(intent: NormalizedIntent, chartName?: string): string {
    const name = chartName ?? this.sanitizeChartName(intent.intentId);
    return this.replaceChartName(HELPERS_TEMPLATE, name);
  }

  /**
   * Generate NOTES.txt template.
   *
   * @param intent - Normalized intent
   * @param chartName - Sanitized chart name
   * @param description - Chart description
   * @returns NOTES.txt template content
   */
  public generateNotesTemplate(
    intent: NormalizedIntent,
    chartName?: string,
    description?: string
  ): string {
    const name = chartName ?? this.sanitizeChartName(intent.intentId);
    const desc = description ?? this.extractDescription(intent);

    let notes = this.replaceChartName(NOTES_TEMPLATE, name);
    notes = notes.replace('<CHART_DESCRIPTION>', desc);

    return notes;
  }

  /**
   * Sanitize a name for Helm chart naming conventions.
   *
   * @param name - Input name
   * @returns Sanitized chart name
   */
  private sanitizeChartName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 53);
  }

  /**
   * Extract description from intent.
   *
   * @param intent - Normalized intent
   * @returns Description string
   */
  private extractDescription(intent: NormalizedIntent): string {
    const spec = intent.spec as unknown as Record<string, unknown>;

    if (typeof spec['description'] === 'string' && spec['description'].length > 0) {
      return spec['description'];
    }

    return `Helm chart for ${intent.intentId}`;
  }

  /**
   * Replace <CHART_NAME> placeholder with actual chart name.
   *
   * @param template - Template content
   * @param chartName - Chart name to substitute
   * @returns Template with chart name substituted
   */
  private replaceChartName(template: string, chartName: string): string {
    return template.replace(/<CHART_NAME>/g, chartName);
  }
}

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for template generation.
 */
export interface TemplateGeneratorOptions {
  /** Include ConfigMap template */
  readonly includeConfigMap?: boolean | undefined;
  /** Include Secret template */
  readonly includeSecret?: boolean | undefined;
  /** Include Ingress template (default: true) */
  readonly includeIngress?: boolean | undefined;
  /** Include ServiceAccount template (default: true) */
  readonly includeServiceAccount?: boolean | undefined;
  /** Include HPA template (default: true) */
  readonly includeHPA?: boolean | undefined;
}
