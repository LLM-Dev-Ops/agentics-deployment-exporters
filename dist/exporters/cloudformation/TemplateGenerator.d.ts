/**
 * CloudFormation Template Generator
 *
 * Generates complete CloudFormation templates with proper structure including
 * AWSTemplateFormatVersion, Metadata, Parameters, Resources, and Outputs.
 *
 * All generation is deterministic with sorted keys and stable ordering.
 *
 * @module exporters/cloudformation/TemplateGenerator
 * @version 1.0.0
 */
import type { NormalizedIntent } from '../../core/types.js';
import type { CFNTemplate, CFNMetadata, CFNParameter, CFNResource, CFNOutput, CFNParameterFile, CFNInterfaceMetadata } from './types.js';
/**
 * Generates complete CloudFormation templates.
 *
 * All generation is deterministic with sorted keys and consistent ordering.
 */
export declare class TemplateGenerator {
    private readonly resourceMapper;
    constructor();
    /**
     * Generate a complete CloudFormation template from a normalized intent.
     */
    generateTemplate(intent: NormalizedIntent): CFNTemplate;
    /**
     * Generate template metadata with AgenticsExporter tracking.
     */
    generateMetadata(intent: NormalizedIntent): CFNMetadata;
    /**
     * Generate parameters from intent resources.
     */
    generateParameters(intent: NormalizedIntent): {
        parameters: Record<string, CFNParameter>;
        interfaceMetadata: CFNInterfaceMetadata;
    };
    /**
     * Generate resources from intent.
     */
    generateResources(intent: NormalizedIntent): Record<string, CFNResource>;
    /**
     * Generate outputs from resources.
     */
    generateOutputs(resources: Record<string, CFNResource>, intent: NormalizedIntent): Record<string, CFNOutput>;
    /**
     * Generate a parameter file template.
     */
    generateParameterFile(parameters: Record<string, CFNParameter>): CFNParameterFile;
    /**
     * Validate generated template structure.
     */
    validateTemplate(template: CFNTemplate): {
        valid: boolean;
        errors: string[];
    };
}
//# sourceMappingURL=TemplateGenerator.d.ts.map