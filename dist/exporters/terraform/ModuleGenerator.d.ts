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
import type { CloudProvider, NormalizedIntent } from '../../core/types.js';
import type { TerraformModule, TerraformModuleDefinition, TerraformOutput, TerraformResource, TerraformVariable } from './types.js';
/**
 * Generates Terraform modules, variables, and outputs.
 *
 * All generation is deterministic with sorted keys and consistent ordering.
 */
export declare class ModuleGenerator {
    /**
     * Generate a Terraform module from resources.
     *
     * @param resources - Resources to include in the module
     * @returns Module definition
     */
    generateModule(resources: readonly TerraformResource[]): TerraformModule;
    /**
     * Generate variables from a normalized intent.
     *
     * @param intent - Normalized intent with specifications
     * @returns Array of variable definitions sorted by name
     */
    generateVariables(intent: NormalizedIntent): readonly TerraformVariable[];
    /**
     * Generate outputs from Terraform resources.
     *
     * @param resources - Resources to generate outputs for
     * @returns Array of output definitions sorted by name
     */
    generateOutputs(resources: readonly TerraformResource[]): readonly TerraformOutput[];
    /**
     * Generate a complete module definition.
     *
     * @param name - Module name
     * @param description - Module description
     * @param resources - Resources to include
     * @param provider - Target cloud provider
     * @returns Complete module definition
     */
    generateModuleDefinition(name: string, description: string, resources: readonly TerraformResource[], provider: CloudProvider): TerraformModuleDefinition;
    /**
     * Generate a module call block.
     *
     * @param name - Module local name
     * @param source - Module source path
     * @param variables - Input variable values
     * @returns Module call configuration
     */
    generateModuleCall(name: string, source: string, variables: Readonly<Record<string, unknown>>): TerraformModule;
    /**
     * Extract variables from a resource definition.
     */
    private extractResourceVariables;
    /**
     * Generate variable validation rules.
     *
     * @param variable - Variable to generate validation for
     * @returns Variable with validation rules
     */
    generateVariableValidation(variable: TerraformVariable): TerraformVariable;
}
//# sourceMappingURL=ModuleGenerator.d.ts.map