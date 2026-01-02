/**
 * Terraform Module Generator
 *
 * Generates Terraform modules, variables, and outputs from intent specifications.
 * Supports creating reusable module structures with proper input/output definitions.
 *
 * All generation is deterministic with sorted keys and stable ordering.
 *
 * @module exporters/terraform/ModuleGenerator
 * @version 1.0.0
 */

import type { CloudProvider, NormalizedIntent, IntentResource } from '../../core/types.js';
import type {
  TerraformModule,
  TerraformModuleDefinition,
  TerraformOutput,
  TerraformResource,
  TerraformVariable,
} from './types.js';
import { sortObjectKeys, toTerraformName } from './ResourceMapper.js';

// =============================================================================
// VARIABLE TYPE INFERENCE
// =============================================================================

// =============================================================================
// STANDARD VARIABLES
// =============================================================================

/**
 * Generate standard variables for AWS provider.
 */
function generateAwsVariables(): TerraformVariable[] {
  return [
    {
      name: 'aws_region',
      description: 'AWS region for resource deployment',
      type: 'string',
      default: 'us-east-1',
    },
    {
      name: 'availability_zone',
      description: 'AWS availability zone',
      type: 'string',
      default: 'us-east-1a',
    },
    {
      name: 'environment',
      description: 'Environment name (e.g., dev, staging, prod)',
      type: 'string',
    },
    {
      name: 'project_name',
      description: 'Project name for resource tagging',
      type: 'string',
    },
    {
      name: 'common_tags',
      description: 'Common tags to apply to all resources',
      type: 'map(string)',
      default: {},
    },
  ];
}

/**
 * Generate standard variables for GCP provider.
 */
function generateGcpVariables(): TerraformVariable[] {
  return [
    {
      name: 'gcp_project',
      description: 'GCP project ID',
      type: 'string',
    },
    {
      name: 'gcp_region',
      description: 'GCP region for resource deployment',
      type: 'string',
      default: 'us-central1',
    },
    {
      name: 'zone',
      description: 'GCP zone',
      type: 'string',
      default: 'us-central1-a',
    },
    {
      name: 'environment',
      description: 'Environment name (e.g., dev, staging, prod)',
      type: 'string',
    },
    {
      name: 'project_name',
      description: 'Project name for resource labeling',
      type: 'string',
    },
    {
      name: 'common_labels',
      description: 'Common labels to apply to all resources',
      type: 'map(string)',
      default: {},
    },
  ];
}

/**
 * Generate standard variables for Azure provider.
 */
function generateAzureVariables(): TerraformVariable[] {
  return [
    {
      name: 'resource_group_name',
      description: 'Azure resource group name',
      type: 'string',
    },
    {
      name: 'location',
      description: 'Azure region for resource deployment',
      type: 'string',
      default: 'eastus',
    },
    {
      name: 'environment',
      description: 'Environment name (e.g., dev, staging, prod)',
      type: 'string',
    },
    {
      name: 'project_name',
      description: 'Project name for resource tagging',
      type: 'string',
    },
    {
      name: 'common_tags',
      description: 'Common tags to apply to all resources',
      type: 'map(string)',
      default: {},
    },
  ];
}

// =============================================================================
// OUTPUT GENERATION
// =============================================================================

/**
 * Generate output for a Terraform resource.
 */
function generateResourceOutput(resource: TerraformResource): TerraformOutput[] {
  const outputs: TerraformOutput[] = [];
  const resourceRef = `${resource.resourceType}.${resource.name}`;

  // ID output
  outputs.push({
    name: `${resource.name}_id`,
    description: `ID of ${resource.name}`,
    value: `\${${resourceRef}.id}`,
  });

  // Additional outputs based on resource type
  if (resource.resourceType.includes('instance') || resource.resourceType.includes('vm')) {
    outputs.push({
      name: `${resource.name}_public_ip`,
      description: `Public IP of ${resource.name}`,
      value: `\${${resourceRef}.public_ip}`,
    });
  }

  if (resource.resourceType.includes('vpc') || resource.resourceType.includes('network')) {
    outputs.push({
      name: `${resource.name}_cidr`,
      description: `CIDR block of ${resource.name}`,
      value: `\${${resourceRef}.cidr_block}`,
    });
  }

  if (resource.resourceType.includes('bucket') || resource.resourceType.includes('storage')) {
    outputs.push({
      name: `${resource.name}_arn`,
      description: `ARN of ${resource.name}`,
      value: `\${${resourceRef}.arn}`,
    });
  }

  if (resource.resourceType.includes('db') || resource.resourceType.includes('sql')) {
    outputs.push({
      name: `${resource.name}_endpoint`,
      description: `Endpoint of ${resource.name}`,
      value: `\${${resourceRef}.endpoint}`,
    });
    outputs.push({
      name: `${resource.name}_port`,
      description: `Port of ${resource.name}`,
      value: `\${${resourceRef}.port}`,
      sensitive: false,
    });
  }

  if (resource.resourceType.includes('eks') || resource.resourceType.includes('gke') || resource.resourceType.includes('aks')) {
    outputs.push({
      name: `${resource.name}_endpoint`,
      description: `Kubernetes API endpoint of ${resource.name}`,
      value: `\${${resourceRef}.endpoint}`,
    });
    outputs.push({
      name: `${resource.name}_certificate_authority`,
      description: `CA certificate of ${resource.name}`,
      value: `\${${resourceRef}.certificate_authority[0].data}`,
      sensitive: true,
    });
  }

  return outputs;
}

// =============================================================================
// MODULE GENERATOR CLASS
// =============================================================================

/**
 * Generates Terraform modules, variables, and outputs.
 *
 * All generation is deterministic with sorted keys and consistent ordering.
 */
export class ModuleGenerator {
  /**
   * Generate a Terraform module from resources.
   *
   * @param resources - Resources to include in the module
   * @returns Module definition
   */
  generateModule(resources: readonly TerraformResource[]): TerraformModule {
    // Sort resources for deterministic output
    const sortedResources = [...resources].sort((a, b) => {
      const typeComparison = a.resourceType.localeCompare(b.resourceType, 'en');
      if (typeComparison !== 0) return typeComparison;
      return a.name.localeCompare(b.name, 'en');
    });

    // Collect all references used in resources to determine inputs
    const inputs: Record<string, unknown> = {};

    for (const resource of sortedResources) {
      // Extract variable references from attributes
      const jsonStr = JSON.stringify(resource.attributes);
      const varMatches = jsonStr.match(/\$\{var\.(\w+)\}/g);

      if (varMatches) {
        for (const match of varMatches) {
          const varName = match.replace('${var.', '').replace('}', '');
          if (!inputs[varName]) {
            inputs[varName] = `\${var.${varName}}`;
          }
        }
      }
    }

    return {
      name: 'main',
      source: './',
      inputs: sortObjectKeys(inputs),
      comment: 'Main module containing all resources',
    };
  }

  /**
   * Generate variables from a normalized intent.
   *
   * @param intent - Normalized intent with specifications
   * @returns Array of variable definitions sorted by name
   */
  generateVariables(intent: NormalizedIntent): readonly TerraformVariable[] {
    const variables: TerraformVariable[] = [];
    const provider = intent.spec.target.provider;

    // Add provider-specific standard variables
    switch (provider) {
      case 'aws':
        variables.push(...generateAwsVariables());
        break;
      case 'gcp':
        variables.push(...generateGcpVariables());
        break;
      case 'azure':
        variables.push(...generateAzureVariables());
        break;
      case 'multi':
        // Include variables for all providers
        variables.push(...generateAwsVariables());
        variables.push(...generateGcpVariables().filter(v =>
          !['environment', 'project_name'].includes(v.name)
        ));
        variables.push(...generateAzureVariables().filter(v =>
          !['environment', 'project_name', 'common_tags'].includes(v.name)
        ));
        break;
    }

    // Add variables from intent resources
    for (const resource of intent.spec.resources) {
      const resourceVars = this.extractResourceVariables(resource);
      for (const v of resourceVars) {
        // Only add if not already present
        if (!variables.find(existing => existing.name === v.name)) {
          variables.push(v);
        }
      }
    }

    // Sort variables alphabetically by name
    return [...variables].sort((a, b) => a.name.localeCompare(b.name, 'en'));
  }

  /**
   * Generate outputs from Terraform resources.
   *
   * @param resources - Resources to generate outputs for
   * @returns Array of output definitions sorted by name
   */
  generateOutputs(resources: readonly TerraformResource[]): readonly TerraformOutput[] {
    const outputs: TerraformOutput[] = [];

    // Sort resources for deterministic output generation
    const sortedResources = [...resources].sort((a, b) => {
      const typeComparison = a.resourceType.localeCompare(b.resourceType, 'en');
      if (typeComparison !== 0) return typeComparison;
      return a.name.localeCompare(b.name, 'en');
    });

    for (const resource of sortedResources) {
      outputs.push(...generateResourceOutput(resource));
    }

    // Sort outputs alphabetically by name
    return [...outputs].sort((a, b) => a.name.localeCompare(b.name, 'en'));
  }

  /**
   * Generate a complete module definition.
   *
   * @param name - Module name
   * @param description - Module description
   * @param resources - Resources to include
   * @param provider - Target cloud provider
   * @returns Complete module definition
   */
  generateModuleDefinition(
    name: string,
    description: string,
    resources: readonly TerraformResource[],
    provider: CloudProvider
  ): TerraformModuleDefinition {
    // Sort resources for deterministic output
    const sortedResources = [...resources].sort((a, b) => {
      const typeComparison = a.resourceType.localeCompare(b.resourceType, 'en');
      if (typeComparison !== 0) return typeComparison;
      return a.name.localeCompare(b.name, 'en');
    });

    // Generate variables based on provider
    let variables: TerraformVariable[];
    switch (provider) {
      case 'aws':
        variables = generateAwsVariables();
        break;
      case 'gcp':
        variables = generateGcpVariables();
        break;
      case 'azure':
        variables = generateAzureVariables();
        break;
      default:
        variables = generateAwsVariables();
    }

    // Generate outputs from resources
    const outputs = this.generateOutputs(sortedResources);

    // Generate provider requirements
    const providerRequirements: Record<string, { source: string; version: string }> = {};

    switch (provider) {
      case 'aws':
        providerRequirements.aws = { source: 'hashicorp/aws', version: '~> 5.0' };
        break;
      case 'gcp':
        providerRequirements.google = { source: 'hashicorp/google', version: '~> 5.0' };
        break;
      case 'azure':
        providerRequirements.azurerm = { source: 'hashicorp/azurerm', version: '~> 3.0' };
        break;
    }

    return {
      name,
      description,
      version: '1.0.0' as const,
      variables: [...variables].sort((a, b) => a.name.localeCompare(b.name, 'en')),
      outputs: [...outputs].sort((a, b) => a.name.localeCompare(b.name, 'en')),
      resources: sortedResources,
      dataSources: [],
      providerRequirements: sortObjectKeys(providerRequirements),
    };
  }

  /**
   * Generate a module call block.
   *
   * @param name - Module local name
   * @param source - Module source path
   * @param variables - Input variable values
   * @returns Module call configuration
   */
  generateModuleCall(
    name: string,
    source: string,
    variables: Readonly<Record<string, unknown>>
  ): TerraformModule {
    return {
      name: toTerraformName(name),
      source,
      inputs: sortObjectKeys({ ...variables }),
      comment: `Module: ${name}`,
    };
  }

  /**
   * Extract variables from a resource definition.
   */
  private extractResourceVariables(resource: IntentResource): TerraformVariable[] {
    const variables: TerraformVariable[] = [];
    const props = resource.properties;

    // Check for common variable patterns in properties
    for (const [key, value] of Object.entries(props)) {
      if (typeof value === 'string' && value.startsWith('${var.')) {
        const varName = value.replace('${var.', '').replace('}', '');
        variables.push({
          name: varName,
          description: `Variable for ${resource.name}.${key}`,
          type: 'string',
        });
      }
    }

    // Add resource-specific variables
    const resourceType = resource.type.toLowerCase();

    if (resourceType.includes('database') || resourceType.includes('sql')) {
      variables.push({
        name: 'db_admin_password',
        description: 'Database administrator password',
        type: 'string',
        sensitive: true,
      });
    }

    if (resourceType.includes('kubernetes')) {
      variables.push({
        name: 'subnet_ids',
        description: 'Subnet IDs for Kubernetes cluster',
        type: 'list(string)',
        default: [],
      });
    }

    if (resourceType.includes('storage')) {
      variables.push({
        name: 'kms_key_name',
        description: 'KMS key name for encryption',
        type: 'string',
        default: '',
      });
    }

    return variables;
  }

  /**
   * Generate variable validation rules.
   *
   * @param variable - Variable to generate validation for
   * @returns Variable with validation rules
   */
  generateVariableValidation(variable: TerraformVariable): TerraformVariable {
    const validation: Array<{ condition: string; errorMessage: string }> = [];

    // Add validation based on variable name patterns
    if (variable.name.includes('region')) {
      validation.push({
        condition: 'can(regex("^[a-z]+-[a-z]+-[0-9]+$", var.' + variable.name + '))',
        errorMessage: 'Region must be in format like us-east-1 or eu-west-2',
      });
    }

    if (variable.name.includes('cidr')) {
      validation.push({
        condition: 'can(cidrhost(var.' + variable.name + ', 0))',
        errorMessage: 'Must be a valid CIDR block',
      });
    }

    if (variable.name.includes('email')) {
      validation.push({
        condition: 'can(regex("^[\\\\w.-]+@[\\\\w.-]+\\\\.[a-z]{2,}$", var.' + variable.name + '))',
        errorMessage: 'Must be a valid email address',
      });
    }

    if (variable.name === 'environment') {
      validation.push({
        condition: 'contains(["dev", "staging", "prod"], var.environment)',
        errorMessage: 'Environment must be dev, staging, or prod',
      });
    }

    if (validation.length === 0) {
      return variable;
    }

    return {
      ...variable,
      validation,
    };
  }
}
