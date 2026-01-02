/**
 * Terraform Exporter Module
 *
 * Exports deployment intents to Terraform HCL configuration files.
 * Supports AWS, GCP, and Azure cloud providers with multi-cloud capability.
 *
 * @module exporters/terraform
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * import { TerraformExporter } from '@agentics/deployment-exporters/exporters/terraform';
 *
 * const exporter = new TerraformExporter();
 *
 * // Check if exporter can handle the intent
 * if (exporter.canHandle(validatedIntent)) {
 *   // Validate the intent
 *   const validation = exporter.validate(validatedIntent);
 *
 *   if (validation.valid) {
 *     // Transform to Terraform artifacts
 *     const artifacts = exporter.transform(normalizedIntent, {
 *       provider: 'aws',
 *       environment: 'production',
 *     });
 *
 *     // artifacts contains:
 *     // - terraform/production/main.tf
 *     // - terraform/production/variables.tf
 *     // - terraform/production/outputs.tf
 *     // - terraform/production/providers.tf
 *     // - terraform/production/versions.tf
 *     // - terraform/production/data.tf (if applicable)
 *   }
 * }
 * ```
 */

// =============================================================================
// MAIN EXPORTER
// =============================================================================

export { TerraformExporter } from './TerraformExporter.js';

// =============================================================================
// GENERATORS
// =============================================================================

export { ResourceMapper, toTerraformName, sortObjectKeys, createTags } from './ResourceMapper.js';
export { ProviderGenerator } from './ProviderGenerator.js';
export { ModuleGenerator } from './ModuleGenerator.js';
export { HclSerializer, formatValue, formatAttributes, formatNestedBlock } from './HclSerializer.js';

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Block types
  TerraformBlock,
  TerraformNestedBlock,

  // Resource types
  TerraformResource,
  TerraformLifecycle,

  // Data source types
  TerraformDataSource,

  // Provider types
  TerraformProvider,
  TerraformProviderRequirement,

  // Variable and output types
  TerraformVariable,
  TerraformValidation,
  TerraformOutput,

  // Module types
  TerraformModule,
  TerraformModuleDefinition,

  // Configuration types
  TerraformVersions,
  TerraformBackend,
  TerraformLocals,
  TerraformConfiguration,

  // Specification types for mapping
  ComputeSpec,
  NetworkSpec,
  SubnetSpec,
  SecurityGroupSpec,
  SecurityGroupRule,
  StorageSpec,
  CorsRule,
  LifecycleRule,
  DatabaseSpec,
  KubernetesSpec,

  // Provider mapping types
  ProviderResourceTypes,
} from './types.js';

// =============================================================================
// CONSTANTS
// =============================================================================

export {
  PROVIDER_RESOURCE_TYPES,
  DEFAULT_PROVIDER_VERSIONS,
  DEFAULT_TERRAFORM_VERSION,
} from './types.js';

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Default export is the TerraformExporter class for convenience.
 *
 * @example
 * ```typescript
 * import TerraformExporter from '@agentics/deployment-exporters/exporters/terraform';
 *
 * const exporter = new TerraformExporter();
 * ```
 */
export { TerraformExporter as default } from './TerraformExporter.js';
