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
import { DEFAULT_PROVIDER_VERSIONS, DEFAULT_TERRAFORM_VERSION } from './types.js';
import { sortObjectKeys } from './ResourceMapper.js';
// =============================================================================
// PROVIDER CONFIGURATION GENERATORS
// =============================================================================
/**
 * Generate AWS provider configuration.
 */
function generateAwsProvider(region, alias, additionalConfig) {
    const config = {
        region: region ?? '${var.aws_region}',
    };
    if (additionalConfig) {
        Object.assign(config, additionalConfig);
    }
    const provider = {
        name: 'aws',
        config: sortObjectKeys(config),
        comment: alias ? `AWS provider (${alias})` : 'AWS provider configuration',
    };
    if (alias) {
        return { ...provider, alias };
    }
    return provider;
}
/**
 * Generate GCP provider configuration.
 */
function generateGcpProvider(project, region, alias, additionalConfig) {
    const config = {
        project: project ?? '${var.gcp_project}',
        region: region ?? '${var.gcp_region}',
    };
    if (additionalConfig) {
        Object.assign(config, additionalConfig);
    }
    const provider = {
        name: 'google',
        config: sortObjectKeys(config),
        comment: alias ? `Google Cloud provider (${alias})` : 'Google Cloud provider configuration',
    };
    if (alias) {
        return { ...provider, alias };
    }
    return provider;
}
/**
 * Generate Azure provider configuration.
 */
function generateAzureProvider(subscriptionId, alias, additionalConfig) {
    const config = {
        features: {},
    };
    if (subscriptionId) {
        config.subscription_id = subscriptionId;
    }
    if (additionalConfig) {
        Object.assign(config, additionalConfig);
    }
    const provider = {
        name: 'azurerm',
        config: sortObjectKeys(config),
        comment: alias ? `Azure provider (${alias})` : 'Azure provider configuration',
    };
    if (alias) {
        return { ...provider, alias };
    }
    return provider;
}
// =============================================================================
// PROVIDER REQUIREMENT GENERATORS
// =============================================================================
/**
 * Get default provider requirements for a cloud provider.
 */
function getProviderRequirement(provider) {
    const requirements = {};
    switch (provider) {
        case 'aws':
            requirements.aws = DEFAULT_PROVIDER_VERSIONS.aws;
            break;
        case 'gcp':
            requirements.google = DEFAULT_PROVIDER_VERSIONS.google;
            break;
        case 'azure':
            requirements.azurerm = DEFAULT_PROVIDER_VERSIONS.azurerm;
            break;
        case 'multi':
            // Include all providers for multi-cloud
            requirements.aws = DEFAULT_PROVIDER_VERSIONS.aws;
            requirements.google = DEFAULT_PROVIDER_VERSIONS.google;
            requirements.azurerm = DEFAULT_PROVIDER_VERSIONS.azurerm;
            break;
    }
    return requirements;
}
// =============================================================================
// PROVIDER GENERATOR CLASS
// =============================================================================
/**
 * Generates Terraform provider configurations and version constraints.
 *
 * All generation is deterministic with sorted keys and consistent ordering.
 */
export class ProviderGenerator {
    /**
     * Generate provider configurations from a normalized intent.
     *
     * @param intent - Normalized intent with target provider information
     * @returns Array of provider configurations sorted by name
     */
    generateProviders(intent) {
        const providers = [];
        const targetProvider = intent.spec.target.provider;
        const region = intent.spec.target.region;
        switch (targetProvider) {
            case 'aws':
                providers.push(generateAwsProvider(region));
                break;
            case 'gcp':
                providers.push(generateGcpProvider(undefined, region));
                break;
            case 'azure':
                providers.push(generateAzureProvider());
                break;
            case 'multi':
                // Generate all providers for multi-cloud deployments
                providers.push(generateAwsProvider(region));
                providers.push(generateGcpProvider(undefined, region));
                providers.push(generateAzureProvider());
                break;
        }
        // Sort providers alphabetically by name for deterministic output
        return [...providers].sort((a, b) => {
            const nameComparison = a.name.localeCompare(b.name, 'en');
            if (nameComparison !== 0)
                return nameComparison;
            // If names are equal, sort by alias
            return (a.alias ?? '').localeCompare(b.alias ?? '', 'en');
        });
    }
    /**
     * Generate version constraints for the given providers.
     *
     * @param providers - Array of provider names to include
     * @param terraformVersion - Optional Terraform version constraint
     * @returns Version constraints configuration
     */
    generateVersionConstraints(providers, terraformVersion) {
        const requiredProviders = {};
        // Sort providers for deterministic output
        const sortedProviders = [...providers].sort((a, b) => a.localeCompare(b, 'en'));
        for (const provider of sortedProviders) {
            const normalizedName = this.normalizeProviderName(provider);
            const requirement = DEFAULT_PROVIDER_VERSIONS[normalizedName];
            if (requirement) {
                requiredProviders[normalizedName] = requirement;
            }
        }
        return {
            requiredVersion: terraformVersion ?? DEFAULT_TERRAFORM_VERSION,
            requiredProviders: sortObjectKeys(requiredProviders),
        };
    }
    /**
     * Generate complete version constraints from a normalized intent.
     *
     * @param intent - Normalized intent with target provider information
     * @param terraformVersion - Optional Terraform version constraint
     * @returns Version constraints configuration
     */
    generateVersionConstraintsFromIntent(intent, terraformVersion) {
        const targetProvider = intent.spec.target.provider;
        const requirements = getProviderRequirement(targetProvider);
        return {
            requiredVersion: terraformVersion ?? DEFAULT_TERRAFORM_VERSION,
            requiredProviders: sortObjectKeys(requirements),
        };
    }
    /**
     * Generate a single provider configuration.
     *
     * @param provider - Cloud provider type
     * @param config - Optional provider configuration
     * @returns Provider configuration
     */
    generateProvider(provider, config) {
        switch (provider) {
            case 'aws':
                return generateAwsProvider(config?.region, config?.alias, config?.additional);
            case 'gcp':
                return generateGcpProvider(config?.project, config?.region, config?.alias, config?.additional);
            case 'azure':
                return generateAzureProvider(config?.subscriptionId, config?.alias, config?.additional);
            case 'multi':
                // Default to AWS for multi-cloud single provider generation
                return generateAwsProvider(config?.region, config?.alias, config?.additional);
        }
    }
    /**
     * Normalize provider name to standard format.
     */
    normalizeProviderName(name) {
        const normalized = name.toLowerCase();
        // Map common variations to standard names
        const mappings = {
            'amazon': 'aws',
            'amazonaws': 'aws',
            'google': 'google',
            'gcloud': 'google',
            'googlecloud': 'google',
            'azure': 'azurerm',
            'microsoft': 'azurerm',
        };
        return mappings[normalized] ?? normalized;
    }
    /**
     * Check if a provider is supported.
     *
     * @param provider - Provider name to check
     * @returns true if supported
     */
    isProviderSupported(provider) {
        const normalized = this.normalizeProviderName(provider);
        return normalized in DEFAULT_PROVIDER_VERSIONS;
    }
    /**
     * Get all supported providers.
     *
     * @returns Array of supported provider names
     */
    getSupportedProviders() {
        return Object.keys(DEFAULT_PROVIDER_VERSIONS).sort();
    }
}
//# sourceMappingURL=ProviderGenerator.js.map