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
import type { HelmChart, HelmDependency } from './types.js';
/**
 * ChartGenerator creates Helm Chart.yaml metadata from NormalizedIntent.
 *
 * Design principles:
 * - Deterministic output (same intent = same Chart.yaml)
 * - All values derived from intent (no runtime dependencies)
 * - Chart version derived from intent version (reproducible)
 */
export declare class ChartGenerator {
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
    generateChartYaml(intent: NormalizedIntent, options?: ChartGeneratorOptions): HelmChart;
    /**
     * Extract application version from intent.
     * Looks for version info in resources or falls back to intent version.
     *
     * @param intent - Normalized intent
     * @returns Application version string
     */
    private extractAppVersion;
    /**
     * Extract tag from a container image string.
     *
     * @param image - Image string (e.g., "nginx:1.21" or "gcr.io/project/app:v1.2.3")
     * @returns Extracted tag or undefined
     */
    private extractImageTag;
    /**
     * Generate chart annotations from intent metadata.
     *
     * @param intent - Normalized intent
     * @returns Annotations record
     */
    private generateAnnotations;
    /**
     * Remove undefined properties from chart object for clean YAML output.
     *
     * @param chart - Chart object to clean
     * @returns Cleaned chart object
     */
    private cleanChartObject;
}
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
//# sourceMappingURL=ChartGenerator.d.ts.map