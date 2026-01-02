/**
 * Helm Chart Exporter Module
 *
 * Exports Helm chart generation functionality for the Agentics Deployment Exporters system.
 * This module provides a complete Helm chart exporter that transforms NormalizedIntent
 * into Helm v3 chart artifacts.
 *
 * @module exporters/helm
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * import { HelmExporter, createHelmExporter } from './exporters/helm';
 *
 * // Create exporter instance
 * const exporter = createHelmExporter();
 *
 * // Check if intent can be handled
 * if (exporter.canHandle(validatedIntent)) {
 *   // Validate intent
 *   const validation = exporter.validate(validatedIntent);
 *   if (validation.valid) {
 *     // Transform to Helm chart
 *     const artifacts = exporter.transform(normalizedIntent);
 *     // artifacts contains Chart.yaml, values.yaml, templates/*, etc.
 *   }
 * }
 * ```
 */

// =============================================================================
// MAIN EXPORTER
// =============================================================================

export { HelmExporter, createHelmExporter } from './HelmExporter.js';

// =============================================================================
// GENERATORS
// =============================================================================

export { ChartGenerator } from './ChartGenerator.js';
export type { ChartGeneratorOptions } from './ChartGenerator.js';

export { ValuesMapper } from './ValuesMapper.js';

export { TemplateGenerator } from './TemplateGenerator.js';
export type { TemplateGeneratorOptions } from './TemplateGenerator.js';

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Chart types
  HelmChart,
  HelmDependency,
  HelmMaintainer,

  // Values types
  HelmValues,
  HelmImageValues,
  HelmResourceValues,
  HelmServiceValues,
  HelmIngressValues,
  HelmAutoscalingValues,
  HelmPodSecurityContext,
  HelmSecurityContext,
  HelmProbeValues,

  // Schema types
  HelmValuesSchema,
  JSONSchemaProperty,

  // Template types
  HelmTemplate,
  HelmTemplates,

  // Export types
  HelmChartExport,
  HelmExportOptions,
} from './types.js';

// =============================================================================
// TYPE GUARDS
// =============================================================================

export { isHelmChart, isHelmValues } from './types.js';
