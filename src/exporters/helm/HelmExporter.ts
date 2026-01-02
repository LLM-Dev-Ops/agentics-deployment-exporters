/**
 * Helm Chart Exporter
 *
 * Main exporter implementing IExporter interface for generating Helm charts
 * from NormalizedIntent. Produces deterministic, reproducible Helm chart
 * artifacts following the Helm v3 specification.
 *
 * @module exporters/helm/HelmExporter
 * @version 1.0.0
 */

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
import type { IExporter } from '../../core/interfaces.js';
import type { HelmExportOptions, HelmTemplates } from './types.js';
import { ChartGenerator } from './ChartGenerator.js';
import { ValuesMapper } from './ValuesMapper.js';
import { TemplateGenerator } from './TemplateGenerator.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Exporter identifier.
 */
const EXPORTER_ID = 'helm' as ExporterId;

/**
 * Human-readable exporter name.
 */
const EXPORTER_NAME = 'Helm Chart Exporter';

/**
 * Exporter version following semantic versioning.
 */
const EXPORTER_VERSION: SemanticVersion = '1.0.0';

/**
 * Target export format.
 */
const TARGET_FORMAT: ExportFormat = 'helm';

/**
 * Resource types that indicate Kubernetes/container workloads.
 */
const SUPPORTED_RESOURCE_TYPES = [
  'deployment',
  'container',
  'compute',
  'workload',
  'pod',
  'service',
  'application',
  'webapp',
  'api',
  'microservice',
] as const;

// =============================================================================
// HELM EXPORTER CLASS
// =============================================================================

/**
 * HelmExporter transforms NormalizedIntent into Helm chart artifacts.
 *
 * The exporter generates a complete Helm chart structure including:
 * - Chart.yaml (chart metadata)
 * - values.yaml (default configuration values)
 * - values.schema.json (JSON Schema for values validation)
 * - templates/ (Kubernetes manifests with Go templating)
 *
 * Design principles:
 * - Deterministic output (same intent = byte-identical chart)
 * - Pure transformation (no side effects, no external dependencies)
 * - Follows Helm v3 best practices
 */
export class HelmExporter implements IExporter {
  /**
   * Unique identifier for this exporter.
   */
  public readonly id: ExporterId = EXPORTER_ID;

  /**
   * Human-readable name.
   */
  public readonly name: string = EXPORTER_NAME;

  /**
   * Exporter version.
   */
  public readonly version: SemanticVersion = EXPORTER_VERSION;

  /**
   * Target export format.
   */
  public readonly targetFormat: ExportFormat = TARGET_FORMAT;

  /**
   * Chart generator instance.
   */
  private readonly chartGenerator: ChartGenerator;

  /**
   * Values mapper instance.
   */
  private readonly valuesMapper: ValuesMapper;

  /**
   * Template generator instance.
   */
  private readonly templateGenerator: TemplateGenerator;

  /**
   * Create a new HelmExporter instance.
   */
  constructor() {
    this.chartGenerator = new ChartGenerator();
    this.valuesMapper = new ValuesMapper();
    this.templateGenerator = new TemplateGenerator();
  }

  /**
   * Transform a normalized intent into Helm chart artifacts.
   *
   * Generates a complete Helm chart with all required files.
   * Output is deterministic - same intent always produces identical output.
   *
   * @param intent - Normalized, validated DeploymentIntent
   * @param options - Optional export configuration
   * @returns Array of export artifacts representing the Helm chart
   */
  public transform(
    intent: NormalizedIntent,
    options?: ExportOptions
  ): readonly ExportArtifact[] {
    // Extract Helm-specific options
    const helmOptions = this.extractHelmOptions(options);

    // Generate chart name for path construction
    const chartName = this.sanitizeChartName(intent.intentId);
    const basePath = `${chartName}`;

    // Generate chart components
    const chart = this.chartGenerator.generateChartYaml(intent, {
      chartType: 'application',
      homeUrl: helmOptions.homeUrl,
      sourceUrls: helmOptions.sourceUrls,
      iconUrl: helmOptions.iconUrl,
      kubeVersion: helmOptions.kubeVersion,
    });

    const values = this.valuesMapper.generateValues(intent);
    const valuesSchema = this.valuesMapper.generateValuesSchema(intent);

    const templates = this.templateGenerator.generateTemplates(intent, {
      includeConfigMap: helmOptions.includeConfigMap,
      includeSecret: helmOptions.includeSecret,
      includeIngress: helmOptions.includeIngress,
      includeServiceAccount: helmOptions.includeServiceAccount,
      includeHPA: helmOptions.includeHPA,
    });

    // Build artifacts array
    const artifacts: ExportArtifact[] = [];

    // Chart.yaml
    artifacts.push(this.createArtifact(
      `${basePath}/Chart.yaml`,
      chart,
      'yaml',
      { type: 'chart-metadata' }
    ));

    // values.yaml
    artifacts.push(this.createArtifact(
      `${basePath}/values.yaml`,
      values,
      'yaml',
      { type: 'values' }
    ));

    // values.schema.json
    artifacts.push(this.createArtifact(
      `${basePath}/values.schema.json`,
      valuesSchema,
      'json',
      { type: 'schema' }
    ));

    // Templates
    artifacts.push(...this.createTemplateArtifacts(basePath, templates));

    // Create empty charts directory marker
    artifacts.push(this.createArtifact(
      `${basePath}/charts/.gitkeep`,
      '',
      'yaml',
      { type: 'directory-marker' }
    ));

    // Sort artifacts by path for deterministic output
    return artifacts.sort((a, b) => a.path.localeCompare(b.path, 'en'));
  }

  /**
   * Validate that an intent can be exported by this exporter.
   *
   * Performs Helm-specific validation including:
   * - Resource type compatibility
   * - Required fields presence
   * - Kubernetes-compatible naming
   *
   * @param intent - Intent to validate
   * @returns Validation result with errors/warnings
   */
  public validate(intent: ValidatedIntent): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for resources
    if (!intent.spec.resources || intent.spec.resources.length === 0) {
      errors.push({
        code: 'V1001',
        message: 'No resources defined in intent',
        path: '$.spec.resources',
      });
    }

    // Validate intent ID is valid chart name
    const chartName = this.sanitizeChartName(intent.intentId);
    if (chartName.length === 0) {
      errors.push({
        code: 'V1002',
        message: 'Intent ID cannot be sanitized to valid Helm chart name',
        path: '$.intentId',
        expected: 'lowercase alphanumeric with hyphens',
        actual: intent.intentId,
      });
    }

    // Check for compatible resource types
    const hasCompatibleResource = intent.spec.resources.some((r) =>
      this.isCompatibleResourceType(r.type)
    );

    if (!hasCompatibleResource) {
      warnings.push({
        code: 'W1001',
        message: 'No recognized deployment-like resources found; chart may be incomplete',
        path: '$.spec.resources',
      });
    }

    // Validate resource names are Kubernetes-compatible
    for (const resource of intent.spec.resources) {
      if (!this.isValidKubernetesName(resource.name)) {
        warnings.push({
          code: 'W1002',
          message: `Resource name "${resource.name}" may not be valid Kubernetes name`,
          path: `$.spec.resources[${resource.name}].name`,
        });
      }
    }

    // Validate version format
    if (!this.isValidSemver(intent.version)) {
      errors.push({
        code: 'V1003',
        message: 'Intent version must be valid semantic version for Helm chart',
        path: '$.version',
        expected: 'X.Y.Z format',
        actual: intent.version,
      });
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
   * Quick check for exporter selection. Returns true if the intent
   * contains resources that can be exported to Helm chart format.
   *
   * @param intent - Intent to check
   * @returns true if this exporter can handle the intent
   */
  public canHandle(intent: ValidatedIntent): boolean {
    // Must have resources
    if (!intent.spec.resources || intent.spec.resources.length === 0) {
      return false;
    }

    // Check if any resource is compatible with Helm/Kubernetes
    return intent.spec.resources.some((r) => this.isCompatibleResourceType(r.type));
  }

  /**
   * Get the serializers required by this exporter.
   *
   * Helm charts require YAML for most files and JSON for the schema.
   *
   * @returns Array of serializer types needed
   */
  public getRequiredSerializers(): readonly SerializerType[] {
    return ['yaml', 'json'] as const;
  }

  // ===========================================================================
  // PRIVATE HELPER METHODS
  // ===========================================================================

  /**
   * Extract Helm-specific options from generic export options.
   *
   * @param options - Generic export options
   * @returns Helm export options
   */
  private extractHelmOptions(options?: ExportOptions): HelmExportOptions {
    const variables = options?.variables as Record<string, unknown> | undefined;

    return {
      includeConfigMap: variables?.['includeConfigMap'] as boolean | undefined,
      includeSecret: variables?.['includeSecret'] as boolean | undefined,
      includeIngress: variables?.['includeIngress'] as boolean | undefined,
      includeServiceAccount: variables?.['includeServiceAccount'] as boolean | undefined,
      includeHPA: variables?.['includeHPA'] as boolean | undefined,
      iconUrl: variables?.['iconUrl'] as string | undefined,
      homeUrl: variables?.['homeUrl'] as string | undefined,
      sourceUrls: variables?.['sourceUrls'] as readonly string[] | undefined,
      kubeVersion: variables?.['kubeVersion'] as string | undefined,
    };
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
   * Check if a resource type is compatible with Helm export.
   *
   * @param resourceType - Resource type URN
   * @returns true if compatible
   */
  private isCompatibleResourceType(resourceType: string): boolean {
    const typeLower = resourceType.toLowerCase();
    return SUPPORTED_RESOURCE_TYPES.some((supported) => typeLower.includes(supported));
  }

  /**
   * Check if a name is valid for Kubernetes.
   *
   * @param name - Name to validate
   * @returns true if valid
   */
  private isValidKubernetesName(name: string): boolean {
    // Kubernetes name pattern: lowercase alphanumeric, hyphens, max 63 chars
    const pattern = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
    return pattern.test(name.toLowerCase()) && name.length <= 63;
  }

  /**
   * Check if a version string is valid semver.
   *
   * @param version - Version string
   * @returns true if valid semver
   */
  private isValidSemver(version: string): boolean {
    const pattern = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;
    return pattern.test(version);
  }

  /**
   * Create a single export artifact.
   *
   * @param path - Relative path for the artifact
   * @param content - Artifact content
   * @param format - Serializer format
   * @param metadata - Additional metadata
   * @returns Export artifact
   */
  private createArtifact(
    path: string,
    content: unknown,
    format: SerializerType,
    metadata?: Record<string, unknown>
  ): ExportArtifact {
    return {
      path,
      content,
      format,
      encoding: 'utf-8',
      metadata: {
        ...metadata,
        exporterId: EXPORTER_ID,
        exporterVersion: EXPORTER_VERSION,
      },
    };
  }

  /**
   * Create artifacts for all templates.
   *
   * @param basePath - Base path for chart
   * @param templates - Generated templates
   * @returns Array of template artifacts
   */
  private createTemplateArtifacts(
    basePath: string,
    templates: HelmTemplates
  ): ExportArtifact[] {
    const artifacts: ExportArtifact[] = [];
    const templatesPath = `${basePath}/templates`;

    // Core templates (always included)
    artifacts.push(this.createTemplateArtifact(
      `${templatesPath}/${templates.deployment.name}`,
      templates.deployment.content
    ));

    artifacts.push(this.createTemplateArtifact(
      `${templatesPath}/${templates.service.name}`,
      templates.service.content
    ));

    artifacts.push(this.createTemplateArtifact(
      `${templatesPath}/${templates.helpers.name}`,
      templates.helpers.content
    ));

    artifacts.push(this.createTemplateArtifact(
      `${templatesPath}/${templates.notes.name}`,
      templates.notes.content
    ));

    // Optional templates
    if (templates.configmap) {
      artifacts.push(this.createTemplateArtifact(
        `${templatesPath}/${templates.configmap.name}`,
        templates.configmap.content
      ));
    }

    if (templates.secret) {
      artifacts.push(this.createTemplateArtifact(
        `${templatesPath}/${templates.secret.name}`,
        templates.secret.content
      ));
    }

    if (templates.ingress) {
      artifacts.push(this.createTemplateArtifact(
        `${templatesPath}/${templates.ingress.name}`,
        templates.ingress.content
      ));
    }

    if (templates.serviceaccount) {
      artifacts.push(this.createTemplateArtifact(
        `${templatesPath}/${templates.serviceaccount.name}`,
        templates.serviceaccount.content
      ));
    }

    if (templates.hpa) {
      artifacts.push(this.createTemplateArtifact(
        `${templatesPath}/${templates.hpa.name}`,
        templates.hpa.content
      ));
    }

    return artifacts;
  }

  /**
   * Create a template artifact with raw content (not to be serialized).
   *
   * @param path - Template file path
   * @param content - Raw template content
   * @returns Export artifact
   */
  private createTemplateArtifact(path: string, content: string): ExportArtifact {
    // Templates are raw content, not to be serialized
    // We use 'yaml' format but the content is already the final string
    return {
      path,
      content,
      format: 'yaml',
      encoding: 'utf-8',
      metadata: {
        type: 'template',
        rawContent: true,
        exporterId: EXPORTER_ID,
        exporterVersion: EXPORTER_VERSION,
      },
    };
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a new HelmExporter instance.
 *
 * Factory function for creating exporter instances.
 *
 * @returns New HelmExporter instance
 */
export function createHelmExporter(): IExporter {
  return new HelmExporter();
}
