/**
 * HCL Serializer
 *
 * Converts Terraform configuration objects to HashiCorp Configuration Language (HCL).
 * Produces deterministic output with sorted keys and consistent formatting.
 *
 * @module exporters/terraform/HclSerializer
 * @version 1.0.0
 */
import type { TerraformBackend, TerraformConfiguration, TerraformDataSource, TerraformLocals, TerraformModule, TerraformNestedBlock, TerraformOutput, TerraformProvider, TerraformResource, TerraformVariable, TerraformVersions } from './types.js';
/**
 * Format a value for HCL output.
 */
declare function formatValue(value: unknown, indentLevel?: number): string;
/**
 * Format attributes as HCL lines.
 */
declare function formatAttributes(attributes: Readonly<Record<string, unknown>>, indentLevel?: number): string;
/**
 * Format a nested block.
 */
declare function formatNestedBlock(block: TerraformNestedBlock, indentLevel?: number): string;
/**
 * Serializes Terraform configurations to HCL format.
 *
 * All serialization is deterministic with sorted keys and consistent formatting.
 */
export declare class HclSerializer {
    constructor(_indentSize?: number);
    /**
     * Serialize a complete Terraform configuration to multiple files.
     */
    serializeConfiguration(config: TerraformConfiguration): Map<string, string>;
    /**
     * Serialize versions.tf content.
     */
    serializeVersionsFile(versions: TerraformVersions): string;
    /**
     * Serialize providers.tf content.
     */
    serializeProvidersFile(providers: readonly TerraformProvider[]): string;
    /**
     * Serialize variables.tf content.
     */
    serializeVariablesFile(variables: readonly TerraformVariable[]): string;
    /**
     * Serialize outputs.tf content.
     */
    serializeOutputsFile(outputs: readonly TerraformOutput[]): string;
    /**
     * Serialize main.tf content.
     */
    serializeMainFile(resources: readonly TerraformResource[], _dataSources: readonly TerraformDataSource[], modules: readonly TerraformModule[], locals?: TerraformLocals): string;
    /**
     * Serialize data.tf content.
     */
    serializeDataFile(dataSources: readonly TerraformDataSource[]): string;
    /**
     * Serialize a single resource to HCL.
     */
    serializeResource(resource: TerraformResource): string;
    /**
     * Serialize a single variable to HCL.
     */
    serializeVariable(variable: TerraformVariable): string;
    /**
     * Serialize a single output to HCL.
     */
    serializeOutput(output: TerraformOutput): string;
    /**
     * Serialize backend configuration.
     */
    serializeBackend(backend: TerraformBackend): string;
}
export { formatValue, formatAttributes, formatNestedBlock };
//# sourceMappingURL=HclSerializer.d.ts.map