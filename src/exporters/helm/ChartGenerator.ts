/**
 * Chart.yaml Generator for Helm Charts
 *
 * Generates deterministic Helm Chart.yaml metadata from NormalizedIntent.
 * All output is reproducible and follows the Helm Chart v2 specification.
 *
 * @module exporters/helm/ChartGenerator
 * @version 1.0.0
 */

import type { NormalizedIntent } from '../../core/types.js';
import type { HelmChart, HelmDependency, HelmMaintainer } from './types.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default chart API version (Helm v3+).
 */
const CHART_API_VERSION = 'v2' as const;

/**
 * Default chart type.
 */
const DEFAULT_CHART_TYPE = 'application' as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Sanitize a name for Helm chart naming conventions.
 * Helm chart names must be lowercase alphanumeric with hyphens.
 *
 * @param name - Input name to sanitize
 * @returns Sanitized chart name
 */
function sanitizeChartName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 53); // Helm chart names limited to 53 chars for DNS compatibility
}

/**
 * Extract a description from the intent for the chart.
 *
 * @param intent - Normalized intent
 * @returns Chart description
 */
function extractDescription(intent: NormalizedIntent): string {
  // Check for explicit description in spec
  const spec = intent.spec as unknown as Record<string, unknown>;

  if (typeof spec['description'] === 'string' && spec['description'].length > 0) {
    return spec['description'];
  }

  // Generate a default description
  const resourceCount = intent.spec.resources.length;
  const resourceTypes = Array.from(new Set(intent.spec.resources.map((r) => r.type))).sort();

  return `Helm chart for ${intent.intentId} containing ${resourceCount} resource(s): ${resourceTypes.join(', ')}`;
}

/**
 * Extract keywords from the intent for chart metadata.
 *
 * @param intent - Normalized intent
 * @returns Sorted array of keywords
 */
function extractKeywords(intent: NormalizedIntent): readonly string[] {
  const keywords: string[] = [];

  // Add provider as keyword
  if (intent.spec.target.provider) {
    keywords.push(intent.spec.target.provider);
  }

  // Add environment as keyword
  if (intent.spec.target.environment) {
    keywords.push(intent.spec.target.environment);
  }

  // Extract resource types as keywords
  for (const resource of intent.spec.resources) {
    const typeKeyword = resource.type.split('/').pop() ?? resource.type;
    keywords.push(typeKeyword.toLowerCase());
  }

  // Add standard keywords
  keywords.push('agentics');
  keywords.push('deployment');
  keywords.push('kubernetes');

  // Deduplicate and sort
  return Array.from(new Set(keywords)).sort();
}

/**
 * Extract maintainers from the intent provenance.
 *
 * @param intent - Normalized intent
 * @returns Array of maintainer info (empty if none found)
 */
function extractMaintainers(intent: NormalizedIntent): readonly HelmMaintainer[] {
  const maintainers: HelmMaintainer[] = [];
  const seenActors: string[] = [];

  // Check provenance audit trail for actor info
  if (intent.provenance?.auditTrail) {
    for (const entry of intent.provenance.auditTrail) {
      if (entry.actor && !seenActors.includes(entry.actor)) {
        seenActors.push(entry.actor);
        maintainers.push({
          name: entry.actor,
        });
      }
    }
  }

  // Sort by name for determinism
  return maintainers.sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

// =============================================================================
// MAIN GENERATOR
// =============================================================================

/**
 * ChartGenerator creates Helm Chart.yaml metadata from NormalizedIntent.
 *
 * Design principles:
 * - Deterministic output (same intent = same Chart.yaml)
 * - All values derived from intent (no runtime dependencies)
 * - Chart version derived from intent version (reproducible)
 */
export class ChartGenerator {
  /**
   * Generate Helm Chart.yaml content from normalized intent.
   *
   * The chart version is derived directly from the intent version
   * to ensure deterministic, reproducible outputs.
   *
   * @param intent - Normalized deployment intent
   * @param options - Optional generation options
   * @returns HelmChart structure ready for serialization
   */
  public generateChartYaml(
    intent: NormalizedIntent,
    options?: ChartGeneratorOptions
  ): HelmChart {
    const chartName = sanitizeChartName(intent.intentId);
    const description = extractDescription(intent);
    const keywords = extractKeywords(intent);
    const maintainers = extractMaintainers(intent);

    // Base chart structure
    const chart: HelmChart = {
      apiVersion: CHART_API_VERSION,
      name: chartName,
      version: intent.version,
      appVersion: this.extractAppVersion(intent),
      description: description,
      type: options?.chartType ?? DEFAULT_CHART_TYPE,
      keywords: keywords.length > 0 ? keywords : undefined,
      maintainers: maintainers.length > 0 ? maintainers : undefined,
      home: options?.homeUrl,
      sources: options?.sourceUrls,
      icon: options?.iconUrl,
      kubeVersion: options?.kubeVersion,
      deprecated: false,
      annotations: this.generateAnnotations(intent),
      dependencies: options?.dependencies,
    };

    // Remove undefined values for clean output
    return this.cleanChartObject(chart);
  }

  /**
   * Extract application version from intent.
   * Looks for version info in resources or falls back to intent version.
   *
   * @param intent - Normalized intent
   * @returns Application version string
   */
  private extractAppVersion(intent: NormalizedIntent): string {
    // Look for container image tags as app version
    for (const resource of intent.spec.resources) {
      const props = resource.properties as Record<string, unknown>;

      // Check for image property with tag
      if (typeof props['image'] === 'string') {
        const imageTag = this.extractImageTag(props['image']);
        if (imageTag && imageTag !== 'latest') {
          return imageTag;
        }
      }

      // Check for container spec with image
      if (typeof props['container'] === 'object' && props['container'] !== null) {
        const container = props['container'] as Record<string, unknown>;
        if (typeof container['image'] === 'string') {
          const imageTag = this.extractImageTag(container['image']);
          if (imageTag && imageTag !== 'latest') {
            return imageTag;
          }
        }
      }
    }

    // Fall back to intent version
    return intent.version;
  }

  /**
   * Extract tag from a container image string.
   *
   * @param image - Image string (e.g., "nginx:1.21" or "gcr.io/project/app:v1.2.3")
   * @returns Extracted tag or undefined
   */
  private extractImageTag(image: string): string | undefined {
    // Handle digest format (ignore for versioning)
    if (image.includes('@sha256:')) {
      return undefined;
    }

    // Extract tag after last colon (but not port in registry URL)
    const lastColonIndex = image.lastIndexOf(':');
    if (lastColonIndex === -1) {
      return undefined;
    }

    // Check if this is a port number (registry URL) or tag
    const potentialTag = image.slice(lastColonIndex + 1);
    if (/^\d+$/.test(potentialTag) && image.slice(0, lastColonIndex).includes('/')) {
      // This looks like a port number in registry URL
      return undefined;
    }

    return potentialTag;
  }

  /**
   * Generate chart annotations from intent metadata.
   *
   * @param intent - Normalized intent
   * @returns Annotations record
   */
  private generateAnnotations(intent: NormalizedIntent): Readonly<Record<string, string>> {
    const annotations: Record<string, string> = {};

    // Add traceability annotations
    annotations['agentics.io/intent-id'] = intent.intentId;
    annotations['agentics.io/intent-version'] = intent.version;
    annotations['agentics.io/schema-version'] = intent.schemaVersion;
    annotations['agentics.io/canonical-hash'] = intent.canonicalHash;

    // Add normalization info
    annotations['agentics.io/normalizer-version'] = intent.normalization.normalizerVersion;
    annotations['agentics.io/normalized-at'] = intent.normalization.normalizedAt;

    // Add provider info if available
    if (intent.spec.target.provider) {
      annotations['agentics.io/target-provider'] = intent.spec.target.provider;
    }

    // Sort keys for deterministic output
    const sortedAnnotations: Record<string, string> = {};
    for (const key of Object.keys(annotations).sort()) {
      sortedAnnotations[key] = annotations[key]!;
    }

    return Object.freeze(sortedAnnotations);
  }

  /**
   * Remove undefined properties from chart object for clean YAML output.
   *
   * @param chart - Chart object to clean
   * @returns Cleaned chart object
   */
  private cleanChartObject(chart: HelmChart): HelmChart {
    const cleaned: Record<string, unknown> = {};
    const chartAsRecord = chart as unknown as Record<string, unknown>;

    // Process in deterministic order (alphabetical)
    const keys = Object.keys(chartAsRecord).sort();

    for (const key of keys) {
      const value = chartAsRecord[key];
      if (value !== undefined && value !== null) {
        // Handle empty arrays/objects
        if (Array.isArray(value) && value.length === 0) {
          continue;
        }
        if (typeof value === 'object' && Object.keys(value as object).length === 0) {
          continue;
        }
        cleaned[key] = value;
      }
    }

    return cleaned as unknown as HelmChart;
  }
}

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for chart generation.
 */
export interface ChartGeneratorOptions {
  /** Chart type (application or library) */
  readonly chartType?: 'application' | 'library' | undefined;
  /** Chart home URL */
  readonly homeUrl?: string | undefined;
  /** Source repository URLs */
  readonly sourceUrls?: readonly string[] | undefined;
  /** Chart icon URL */
  readonly iconUrl?: string | undefined;
  /** Kubernetes version constraint */
  readonly kubeVersion?: string | undefined;
  /** Chart dependencies */
  readonly dependencies?: readonly HelmDependency[] | undefined;
}
