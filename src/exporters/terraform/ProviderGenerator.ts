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
import type {
  TerraformProvider,
  TerraformProviderRequirement,
  TerraformVersions,
} from './types.js';
import { DEFAULT_PROVIDER_VERSIONS, DEFAULT_TERRAFORM_VERSION } from './types.js';
import { sortObjectKeys } from './ResourceMapper.js';

// =============================================================================
// PROVIDER CONFIGURATION GENERATORS
// =============================================================================

/**
 * Generate AWS provider configuration.
 */
function generateAwsProvider(
  region?: string,
  alias?: string,
  additionalConfig?: Readonly<Record<string, unknown>>
): TerraformProvider {
  const config: Record<string, unknown> = {
    region: region ?? '${var.aws_region}',
  };

  if (additionalConfig) {
    Object.assign(config, additionalConfig);
  }

  const provider: TerraformProvider = {
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
function generateGcpProvider(
  project?: string,
  region?: string,
  alias?: string,
  additionalConfig?: Readonly<Record<string, unknown>>
): TerraformProvider {
  const config: Record<string, unknown> = {
    project: project ?? '${var.gcp_project}',
    region: region ?? '${var.gcp_region}',
  };

  if (additionalConfig) {
    Object.assign(config, additionalConfig);
  }

  const provider: TerraformProvider = {
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
function generateAzureProvider(
  subscriptionId?: string,
  alias?: string,
  additionalConfig?: Readonly<Record<string, unknown>>
): TerraformProvider {
  const config: Record<string, unknown> = {
    features: {},
  };

  if (subscriptionId) {
    config.subscription_id = subscriptionId;
  }

  if (additionalConfig) {
    Object.assign(config, additionalConfig);
  }

  const provider: TerraformProvider = {
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
function getProviderRequirement(provider: CloudProvider): Record<string, TerraformProviderRequirement> {
  const requirements: Record<string, TerraformProviderRequirement> = {};

  switch (provider) {
    case 'aws':
      requirements.aws = DEFAULT_PROVIDER_VERSIONS.aws!;
      break;
    case 'gcp':
      requirements.google = DEFAULT_PROVIDER_VERSIONS.google!;
      break;
    case 'azure':
      requirements.azurerm = DEFAULT_PROVIDER_VERSIONS.azurerm!;
      break;
    case 'multi':
      // Include all providers for multi-cloud
      requirements.aws = DEFAULT_PROVIDER_VERSIONS.aws!;
      requirements.google = DEFAULT_PROVIDER_VERSIONS.google!;
      requirements.azurerm = DEFAULT_PROVIDER_VERSIONS.azurerm!;
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
  generateProviders(intent: NormalizedIntent): readonly TerraformProvider[] {
    const providers: TerraformProvider[] = [];
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
      if (nameComparison !== 0) return nameComparison;
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
  generateVersionConstraints(
    providers: readonly string[],
    terraformVersion?: string
  ): TerraformVersions {
    const requiredProviders: Record<string, TerraformProviderRequirement> = {};

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
  generateVersionConstraintsFromIntent(
    intent: NormalizedIntent,
    terraformVersion?: string
  ): TerraformVersions {
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
  generateProvider(
    provider: CloudProvider,
    config?: {
      readonly region?: string;
      readonly project?: string;
      readonly subscriptionId?: string;
      readonly alias?: string;
      readonly additional?: Readonly<Record<string, unknown>>;
    }
  ): TerraformProvider {
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
  private normalizeProviderName(name: string): string {
    const normalized = name.toLowerCase();

    // Map common variations to standard names
    const mappings: Record<string, string> = {
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
  isProviderSupported(provider: string): boolean {
    const normalized = this.normalizeProviderName(provider);
    return normalized in DEFAULT_PROVIDER_VERSIONS;
  }

  /**
   * Get all supported providers.
   *
   * @returns Array of supported provider names
   */
  getSupportedProviders(): readonly string[] {
    return Object.keys(DEFAULT_PROVIDER_VERSIONS).sort();
  }
}
