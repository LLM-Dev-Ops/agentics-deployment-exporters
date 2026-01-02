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
/**
 * TemplateGenerator creates Helm templates from NormalizedIntent.
 *
 * Design principles:
 * - Deterministic output (same intent = same templates)
 * - Uses Helm best practices and conventions
 * - Templates are parameterized for flexibility
 */
export declare class TemplateGenerator {
    /**
     * Generate all Helm templates from normalized intent.
     *
     * @param intent - Normalized deployment intent
     * @param options - Optional generation options
     * @returns Complete set of Helm templates
     */
    generateTemplates(intent: NormalizedIntent, options?: TemplateGeneratorOptions): HelmTemplates;
    /**
     * Generate deployment template.
     *
     * @param intent - Normalized intent
     * @param chartName - Sanitized chart name
     * @returns Deployment template content
     */
    generateDeploymentTemplate(intent: NormalizedIntent, chartName?: string): string;
    /**
     * Generate service template.
     *
     * @param intent - Normalized intent
     * @param chartName - Sanitized chart name
     * @returns Service template content
     */
    generateServiceTemplate(intent: NormalizedIntent, chartName?: string): string;
    /**
     * Generate ConfigMap template.
     *
     * @param intent - Normalized intent
     * @param chartName - Sanitized chart name
     * @returns ConfigMap template content
     */
    generateConfigMapTemplate(intent: NormalizedIntent, chartName?: string): string;
    /**
     * Generate Secret template.
     *
     * @param intent - Normalized intent
     * @param chartName - Sanitized chart name
     * @returns Secret template content
     */
    generateSecretTemplate(intent: NormalizedIntent, chartName?: string): string;
    /**
     * Generate Ingress template.
     *
     * @param intent - Normalized intent
     * @param chartName - Sanitized chart name
     * @returns Ingress template content
     */
    generateIngressTemplate(intent: NormalizedIntent, chartName?: string): string;
    /**
     * Generate ServiceAccount template.
     *
     * @param intent - Normalized intent
     * @param chartName - Sanitized chart name
     * @returns ServiceAccount template content
     */
    generateServiceAccountTemplate(intent: NormalizedIntent, chartName?: string): string;
    /**
     * Generate HPA template.
     *
     * @param intent - Normalized intent
     * @param chartName - Sanitized chart name
     * @returns HPA template content
     */
    generateHPATemplate(intent: NormalizedIntent, chartName?: string): string;
    /**
     * Generate helpers template (_helpers.tpl).
     *
     * @param intent - Normalized intent
     * @param chartName - Sanitized chart name
     * @returns Helpers template content
     */
    generateHelpersTemplate(intent: NormalizedIntent, chartName?: string): string;
    /**
     * Generate NOTES.txt template.
     *
     * @param intent - Normalized intent
     * @param chartName - Sanitized chart name
     * @param description - Chart description
     * @returns NOTES.txt template content
     */
    generateNotesTemplate(intent: NormalizedIntent, chartName?: string, description?: string): string;
    /**
     * Sanitize a name for Helm chart naming conventions.
     *
     * @param name - Input name
     * @returns Sanitized chart name
     */
    private sanitizeChartName;
    /**
     * Extract description from intent.
     *
     * @param intent - Normalized intent
     * @returns Description string
     */
    private extractDescription;
    /**
     * Replace <CHART_NAME> placeholder with actual chart name.
     *
     * @param template - Template content
     * @param chartName - Chart name to substitute
     * @returns Template with chart name substituted
     */
    private replaceChartName;
}
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
//# sourceMappingURL=TemplateGenerator.d.ts.map