/**
 * Terraform Provider Generator
 *
 * Generates provider configurations and version constraints for Terraform.
 * Supports AWS, GCP, and Azure providers with proper source and version constraints.
 *
 * All generation is deterministic with sorted keys and stable ordering.
 *
 * @module exporters/terraform/ProviderGenerator
 * @version 1.0.0
 */
import type { CloudProvider, NormalizedIntent } from '../../core/types.js';
import type { TerraformProvider, TerraformVersions } from './types.js';
/**
 * Generates Terraform provider configurations and version constraints.
 *
 * All generation is deterministic with sorted keys and consistent ordering.
 */
export declare class ProviderGenerator {
    /**
     * Generate provider configurations from a normalized intent.
     *
     * @param intent - Normalized intent with target provider information
     * @returns Array of provider configurations sorted by name
     */
    generateProviders(intent: NormalizedIntent): readonly TerraformProvider[];
    /**
     * Generate version constraints for the given providers.
     *
     * @param providers - Array of provider names to include
     * @param terraformVersion - Optional Terraform version constraint
     * @returns Version constraints configuration
     */
    generateVersionConstraints(providers: readonly string[], terraformVersion?: string): TerraformVersions;
    /**
     * Generate complete version constraints from a normalized intent.
     *
     * @param intent - Normalized intent with target provider information
     * @param terraformVersion - Optional Terraform version constraint
     * @returns Version constraints configuration
     */
    generateVersionConstraintsFromIntent(intent: NormalizedIntent, terraformVersion?: string): TerraformVersions;
    /**
     * Generate a single provider configuration.
     *
     * @param provider - Cloud provider type
     * @param config - Optional provider configuration
     * @returns Provider configuration
     */
    generateProvider(provider: CloudProvider, config?: {
        readonly region?: string;
        readonly project?: string;
        readonly subscriptionId?: string;
        readonly alias?: string;
        readonly additional?: Readonly<Record<string, unknown>>;
    }): TerraformProvider;
    /**
     * Normalize provider name to standard format.
     */
    private normalizeProviderName;
    /**
     * Check if a provider is supported.
     *
     * @param provider - Provider name to check
     * @returns true if supported
     */
    isProviderSupported(provider: string): boolean;
    /**
     * Get all supported providers.
     *
     * @returns Array of supported provider names
     */
    getSupportedProviders(): readonly string[];
}
//# sourceMappingURL=ProviderGenerator.d.ts.map