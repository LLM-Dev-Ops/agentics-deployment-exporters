/**
 * HCL Serializer
 *
 * Converts Terraform configuration objects to HashiCorp Configuration Language (HCL).
 * Produces deterministic output with sorted keys and consistent formatting.
 *
 * @module exporters/terraform/HclSerializer
 * @version 1.0.0
 */

import type {
  TerraformBackend,
  TerraformConfiguration,
  TerraformDataSource,
  TerraformLocals,
  TerraformModule,
  TerraformNestedBlock,
  TerraformOutput,
  TerraformProvider,
  TerraformResource,
  TerraformVariable,
  TerraformVersions,
} from './types.js';

// =============================================================================
// HCL FORMATTING UTILITIES
// =============================================================================

/**
 * Format a value for HCL output.
 */
function formatValue(value: unknown, indentLevel: number = 0): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string') {
    // Check if it's a Terraform reference (starts with $ or is a variable reference)
    if (value.startsWith('${') && value.endsWith('}')) {
      return value;
    }
    // Check if it's a simple reference without braces
    if (/^[a-z_][a-z0-9_.]*\.[a-z_][a-z0-9_.]*$/i.test(value)) {
      return value;
    }
    // Escape quotes and wrap in quotes
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }

    const items = value.map(v => formatValue(v, indentLevel + 2));

    // Single-line array for simple values
    if (items.every(i => !i.includes('\n')) && items.join(', ').length < 60) {
      return `[${items.join(', ')}]`;
    }

    // Multi-line array
    const indentStr = ' '.repeat(indentLevel + 2);
    const closeIndent = ' '.repeat(indentLevel);
    return `[\n${items.map(i => `${indentStr}${i},`).join('\n')}\n${closeIndent}]`;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b, 'en'));

    if (keys.length === 0) {
      return '{}';
    }

    const pairs = keys.map(key => {
      const formattedValue = formatValue(obj[key], indentLevel + 2);
      return `${key} = ${formattedValue}`;
    });

    // Single-line object for simple values
    if (pairs.every(p => !p.includes('\n')) && pairs.join(', ').length < 60) {
      return `{ ${pairs.join(', ')} }`;
    }

    // Multi-line object
    const indentStr = ' '.repeat(indentLevel + 2);
    const closeIndent = ' '.repeat(indentLevel);
    return `{\n${pairs.map(p => `${indentStr}${p}`).join('\n')}\n${closeIndent}}`;
  }

  return String(value);
}

/**
 * Format attributes as HCL lines.
 */
function formatAttributes(
  attributes: Readonly<Record<string, unknown>>,
  indentLevel: number = 2
): string {
  const keys = Object.keys(attributes).sort((a, b) => a.localeCompare(b, 'en'));
  const lines: string[] = [];
  const indentStr = ' '.repeat(indentLevel);

  for (const key of keys) {
    const value = attributes[key];
    if (value === undefined) continue;

    const formattedValue = formatValue(value, indentLevel);
    lines.push(`${indentStr}${key} = ${formattedValue}`);
  }

  return lines.join('\n');
}

/**
 * Format a nested block.
 */
function formatNestedBlock(block: TerraformNestedBlock, indentLevel: number = 2): string {
  const indentStr = ' '.repeat(indentLevel);
  const lines: string[] = [];

  if (block.dynamic && block.forEach) {
    // Dynamic block
    lines.push(`${indentStr}dynamic "${block.type}" {`);
    lines.push(`${indentStr}  for_each = ${block.forEach}`);
    if (block.iterator) {
      lines.push(`${indentStr}  iterator = ${block.iterator}`);
    }
    lines.push(`${indentStr}  content {`);
    if (Object.keys(block.attributes).length > 0) {
      lines.push(formatAttributes(block.attributes, indentLevel + 4));
    }
    lines.push(`${indentStr}  }`);
    lines.push(`${indentStr}}`);
  } else {
    // Regular nested block
    lines.push(`${indentStr}${block.type} {`);
    if (Object.keys(block.attributes).length > 0) {
      lines.push(formatAttributes(block.attributes, indentLevel + 2));
    }
    lines.push(`${indentStr}}`);
  }

  return lines.join('\n');
}

// =============================================================================
// BLOCK SERIALIZERS
// =============================================================================

/**
 * Serialize terraform version constraints block.
 */
function serializeVersions(versions: TerraformVersions): string {
  const lines: string[] = [];

  lines.push('terraform {');
  lines.push(`  required_version = "${versions.requiredVersion}"`);
  lines.push('');
  lines.push('  required_providers {');

  const providers = Object.keys(versions.requiredProviders).sort();
  for (const provider of providers) {
    const req = versions.requiredProviders[provider]!;
    lines.push(`    ${provider} = {`);
    lines.push(`      source  = "${req.source}"`);
    lines.push(`      version = "${req.version}"`);
    lines.push('    }');
  }

  lines.push('  }');
  lines.push('}');

  return lines.join('\n');
}

/**
 * Serialize backend configuration.
 */
function serializeBackend(backend: TerraformBackend): string {
  const lines: string[] = [];

  lines.push('terraform {');
  lines.push(`  backend "${backend.type}" {`);

  const configKeys = Object.keys(backend.config).sort();
  for (const key of configKeys) {
    const value = formatValue(backend.config[key], 4);
    lines.push(`    ${key} = ${value}`);
  }

  lines.push('  }');
  lines.push('}');

  return lines.join('\n');
}

/**
 * Serialize provider configuration.
 */
function serializeProvider(provider: TerraformProvider): string {
  const lines: string[] = [];

  if (provider.comment) {
    lines.push(`# ${provider.comment}`);
  }

  if (provider.alias) {
    lines.push(`provider "${provider.name}" {`);
    lines.push(`  alias = "${provider.alias}"`);
  } else {
    lines.push(`provider "${provider.name}" {`);
  }

  const configKeys = Object.keys(provider.config).sort();
  for (const key of configKeys) {
    const value = provider.config[key];

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Nested block in provider (like features {} in azurerm)
      lines.push(`  ${key} {`);
      const nestedKeys = Object.keys(value).sort();
      for (const nestedKey of nestedKeys) {
        const nestedValue = formatValue((value as Record<string, unknown>)[nestedKey], 4);
        lines.push(`    ${nestedKey} = ${nestedValue}`);
      }
      lines.push('  }');
    } else {
      const formattedValue = formatValue(value, 2);
      lines.push(`  ${key} = ${formattedValue}`);
    }
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Serialize variable definition.
 */
function serializeVariable(variable: TerraformVariable): string {
  const lines: string[] = [];

  if (variable.comment) {
    lines.push(`# ${variable.comment}`);
  }

  lines.push(`variable "${variable.name}" {`);

  if (variable.description) {
    lines.push(`  description = "${variable.description}"`);
  }

  if (variable.type) {
    lines.push(`  type        = ${variable.type}`);
  }

  if (variable.default !== undefined) {
    const defaultValue = formatValue(variable.default, 2);
    lines.push(`  default     = ${defaultValue}`);
  }

  if (variable.sensitive) {
    lines.push('  sensitive   = true');
  }

  if (variable.nullable !== undefined) {
    lines.push(`  nullable    = ${variable.nullable}`);
  }

  if (variable.validation && variable.validation.length > 0) {
    for (const v of variable.validation) {
      lines.push('');
      lines.push('  validation {');
      lines.push(`    condition     = ${v.condition}`);
      lines.push(`    error_message = "${v.errorMessage}"`);
      lines.push('  }');
    }
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Serialize output definition.
 */
function serializeOutput(output: TerraformOutput): string {
  const lines: string[] = [];

  if (output.comment) {
    lines.push(`# ${output.comment}`);
  }

  lines.push(`output "${output.name}" {`);

  if (output.description) {
    lines.push(`  description = "${output.description}"`);
  }

  lines.push(`  value       = ${output.value}`);

  if (output.sensitive) {
    lines.push('  sensitive   = true');
  }

  if (output.dependsOn && output.dependsOn.length > 0) {
    const deps = output.dependsOn.map(d => d).sort();
    lines.push(`  depends_on  = [${deps.join(', ')}]`);
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Serialize locals block.
 */
function serializeLocals(locals: TerraformLocals): string {
  const lines: string[] = [];

  if (locals.comment) {
    lines.push(`# ${locals.comment}`);
  }

  lines.push('locals {');

  const keys = Object.keys(locals.values).sort();
  for (const key of keys) {
    const value = formatValue(locals.values[key], 2);
    lines.push(`  ${key} = ${value}`);
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Serialize data source.
 */
function serializeDataSource(dataSource: TerraformDataSource): string {
  const lines: string[] = [];

  if (dataSource.comment) {
    lines.push(`# ${dataSource.comment}`);
  }

  lines.push(`data "${dataSource.dataType}" "${dataSource.name}" {`);

  if (dataSource.provider) {
    lines.push(`  provider = ${dataSource.provider}`);
    lines.push('');
  }

  const attrLines = formatAttributes(dataSource.attributes);
  if (attrLines) {
    lines.push(attrLines);
  }

  if (dataSource.nestedBlocks && dataSource.nestedBlocks.length > 0) {
    for (const block of dataSource.nestedBlocks) {
      lines.push('');
      lines.push(formatNestedBlock(block));
    }
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Serialize resource block.
 */
function serializeResource(resource: TerraformResource): string {
  const lines: string[] = [];

  if (resource.comment) {
    lines.push(`# ${resource.comment}`);
  }

  lines.push(`resource "${resource.resourceType}" "${resource.name}" {`);

  if (resource.provider) {
    lines.push(`  provider = ${resource.provider}`);
    lines.push('');
  }

  if (resource.count !== undefined) {
    const countValue = typeof resource.count === 'number'
      ? String(resource.count)
      : resource.count;
    lines.push(`  count = ${countValue}`);
    lines.push('');
  }

  if (resource.forEach !== undefined) {
    const forEachValue = typeof resource.forEach === 'string'
      ? resource.forEach
      : formatValue(resource.forEach, 2);
    lines.push(`  for_each = ${forEachValue}`);
    lines.push('');
  }

  const attrLines = formatAttributes(resource.attributes);
  if (attrLines) {
    lines.push(attrLines);
  }

  if (resource.nestedBlocks && resource.nestedBlocks.length > 0) {
    // Sort nested blocks by type for deterministic output
    const sortedBlocks = [...resource.nestedBlocks].sort((a, b) =>
      a.type.localeCompare(b.type, 'en')
    );

    for (const block of sortedBlocks) {
      lines.push('');
      lines.push(formatNestedBlock(block));
    }
  }

  if (resource.lifecycle) {
    lines.push('');
    lines.push('  lifecycle {');
    if (resource.lifecycle.createBeforeDestroy !== undefined) {
      lines.push(`    create_before_destroy = ${resource.lifecycle.createBeforeDestroy}`);
    }
    if (resource.lifecycle.preventDestroy !== undefined) {
      lines.push(`    prevent_destroy = ${resource.lifecycle.preventDestroy}`);
    }
    if (resource.lifecycle.ignoreChanges && resource.lifecycle.ignoreChanges.length > 0) {
      const changes = [...resource.lifecycle.ignoreChanges].sort();
      lines.push(`    ignore_changes = [${changes.join(', ')}]`);
    }
    if (resource.lifecycle.replaceTriggeredBy && resource.lifecycle.replaceTriggeredBy.length > 0) {
      const triggers = [...resource.lifecycle.replaceTriggeredBy].sort();
      lines.push(`    replace_triggered_by = [${triggers.join(', ')}]`);
    }
    lines.push('  }');
  }

  if (resource.dependsOn && resource.dependsOn.length > 0) {
    const deps = [...resource.dependsOn].sort();
    lines.push('');
    lines.push(`  depends_on = [${deps.join(', ')}]`);
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Serialize module call.
 */
function serializeModule(module: TerraformModule): string {
  const lines: string[] = [];

  if (module.comment) {
    lines.push(`# ${module.comment}`);
  }

  lines.push(`module "${module.name}" {`);
  lines.push(`  source = "${module.source}"`);

  if (module.version) {
    lines.push(`  version = "${module.version}"`);
  }

  lines.push('');

  const inputKeys = Object.keys(module.inputs).sort();
  for (const key of inputKeys) {
    const value = formatValue(module.inputs[key], 2);
    lines.push(`  ${key} = ${value}`);
  }

  if (module.providers && Object.keys(module.providers).length > 0) {
    lines.push('');
    lines.push('  providers = {');
    const providerKeys = Object.keys(module.providers).sort();
    for (const key of providerKeys) {
      lines.push(`    ${key} = ${module.providers[key]}`);
    }
    lines.push('  }');
  }

  if (module.count !== undefined) {
    const countValue = typeof module.count === 'number'
      ? String(module.count)
      : module.count;
    lines.push('');
    lines.push(`  count = ${countValue}`);
  }

  if (module.forEach !== undefined) {
    const forEachValue = typeof module.forEach === 'string'
      ? module.forEach
      : formatValue(module.forEach, 2);
    lines.push('');
    lines.push(`  for_each = ${forEachValue}`);
  }

  if (module.dependsOn && module.dependsOn.length > 0) {
    const deps = [...module.dependsOn].sort();
    lines.push('');
    lines.push(`  depends_on = [${deps.join(', ')}]`);
  }

  lines.push('}');

  return lines.join('\n');
}

// =============================================================================
// HCL SERIALIZER CLASS
// =============================================================================

/**
 * Serializes Terraform configurations to HCL format.
 *
 * All serialization is deterministic with sorted keys and consistent formatting.
 */
export class HclSerializer {
  constructor(_indentSize: number = 2) {
    // IndentSize reserved for future use
  }

  /**
   * Serialize a complete Terraform configuration to multiple files.
   */
  serializeConfiguration(config: TerraformConfiguration): Map<string, string> {
    const files = new Map<string, string>();

    // versions.tf
    files.set('versions.tf', this.serializeVersionsFile(config.versions));

    // providers.tf
    if (config.providers.length > 0) {
      files.set('providers.tf', this.serializeProvidersFile(config.providers));
    }

    // variables.tf
    if (config.variables.length > 0) {
      files.set('variables.tf', this.serializeVariablesFile(config.variables));
    }

    // main.tf (resources and data sources)
    const mainContent = this.serializeMainFile(
      config.resources,
      config.dataSources,
      config.modules,
      config.locals
    );
    if (mainContent) {
      files.set('main.tf', mainContent);
    }

    // outputs.tf
    if (config.outputs.length > 0) {
      files.set('outputs.tf', this.serializeOutputsFile(config.outputs));
    }

    // data.tf (if there are data sources)
    if (config.dataSources.length > 0) {
      files.set('data.tf', this.serializeDataFile(config.dataSources));
    }

    return files;
  }

  /**
   * Serialize versions.tf content.
   */
  serializeVersionsFile(versions: TerraformVersions): string {
    const lines: string[] = [];

    lines.push('# Terraform and provider version constraints');
    lines.push('# Generated by Agentics Deployment Exporters');
    lines.push('');
    lines.push(serializeVersions(versions));
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Serialize providers.tf content.
   */
  serializeProvidersFile(providers: readonly TerraformProvider[]): string {
    const lines: string[] = [];

    lines.push('# Provider configurations');
    lines.push('# Generated by Agentics Deployment Exporters');
    lines.push('');

    // Sort providers for deterministic output
    const sortedProviders = [...providers].sort((a, b) => {
      const nameComparison = a.name.localeCompare(b.name, 'en');
      if (nameComparison !== 0) return nameComparison;
      return (a.alias ?? '').localeCompare(b.alias ?? '', 'en');
    });

    for (const provider of sortedProviders) {
      lines.push(serializeProvider(provider));
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Serialize variables.tf content.
   */
  serializeVariablesFile(variables: readonly TerraformVariable[]): string {
    const lines: string[] = [];

    lines.push('# Input variables');
    lines.push('# Generated by Agentics Deployment Exporters');
    lines.push('');

    // Sort variables for deterministic output
    const sortedVariables = [...variables].sort((a, b) =>
      a.name.localeCompare(b.name, 'en')
    );

    for (const variable of sortedVariables) {
      lines.push(serializeVariable(variable));
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Serialize outputs.tf content.
   */
  serializeOutputsFile(outputs: readonly TerraformOutput[]): string {
    const lines: string[] = [];

    lines.push('# Output values');
    lines.push('# Generated by Agentics Deployment Exporters');
    lines.push('');

    // Sort outputs for deterministic output
    const sortedOutputs = [...outputs].sort((a, b) =>
      a.name.localeCompare(b.name, 'en')
    );

    for (const output of sortedOutputs) {
      lines.push(serializeOutput(output));
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Serialize main.tf content.
   */
  serializeMainFile(
    resources: readonly TerraformResource[],
    _dataSources: readonly TerraformDataSource[],
    modules: readonly TerraformModule[],
    locals?: TerraformLocals
  ): string {
    const lines: string[] = [];

    lines.push('# Main Terraform configuration');
    lines.push('# Generated by Agentics Deployment Exporters');
    lines.push('');

    // Locals
    if (locals && Object.keys(locals.values).length > 0) {
      lines.push(serializeLocals(locals));
      lines.push('');
    }

    // Modules (sorted)
    const sortedModules = [...modules].sort((a, b) =>
      a.name.localeCompare(b.name, 'en')
    );

    for (const module of sortedModules) {
      lines.push(serializeModule(module));
      lines.push('');
    }

    // Resources (sorted by type then name)
    const sortedResources = [...resources].sort((a, b) => {
      const typeComparison = a.resourceType.localeCompare(b.resourceType, 'en');
      if (typeComparison !== 0) return typeComparison;
      return a.name.localeCompare(b.name, 'en');
    });

    for (const resource of sortedResources) {
      lines.push(serializeResource(resource));
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Serialize data.tf content.
   */
  serializeDataFile(dataSources: readonly TerraformDataSource[]): string {
    const lines: string[] = [];

    lines.push('# Data sources');
    lines.push('# Generated by Agentics Deployment Exporters');
    lines.push('');

    // Sort data sources for deterministic output
    const sortedDataSources = [...dataSources].sort((a, b) => {
      const typeComparison = a.dataType.localeCompare(b.dataType, 'en');
      if (typeComparison !== 0) return typeComparison;
      return a.name.localeCompare(b.name, 'en');
    });

    for (const dataSource of sortedDataSources) {
      lines.push(serializeDataSource(dataSource));
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Serialize a single resource to HCL.
   */
  serializeResource(resource: TerraformResource): string {
    return serializeResource(resource);
  }

  /**
   * Serialize a single variable to HCL.
   */
  serializeVariable(variable: TerraformVariable): string {
    return serializeVariable(variable);
  }

  /**
   * Serialize a single output to HCL.
   */
  serializeOutput(output: TerraformOutput): string {
    return serializeOutput(output);
  }

  /**
   * Serialize backend configuration.
   */
  serializeBackend(backend: TerraformBackend): string {
    return serializeBackend(backend);
  }
}

export { formatValue, formatAttributes, formatNestedBlock };
