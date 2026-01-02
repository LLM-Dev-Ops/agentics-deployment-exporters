/**
 * HCL Serializer
 *
 * This module provides HCL (HashiCorp Configuration Language) serialization
 * for Terraform configurations. All operations are pure and deterministic.
 *
 * Features:
 * - Proper block formatting
 * - Attribute alignment
 * - Expression handling (var.xxx, local.xxx)
 * - Multi-line strings (heredoc)
 * - Support for resources, variables, outputs, providers
 *
 * @module serializers/hcl/HCLSerializer
 * @version 1.0.0
 */
import { BaseSerializer } from '../base/BaseSerializer.js';
import type { HCLSerializerOptions, SerializerFormat, ValidationResult } from '../base/types.js';
/**
 * HCL Serializer for Terraform configurations.
 *
 * This serializer converts JavaScript objects to HCL format.
 * It supports all standard HCL constructs including:
 * - Resources
 * - Data sources
 * - Variables
 * - Outputs
 * - Locals
 * - Providers
 * - Modules
 *
 * @example
 * ```typescript
 * const serializer = new HCLSerializer();
 *
 * const hcl = serializer.serialize({
 *   resource: {
 *     aws_instance: {
 *       web: {
 *         ami: 'ami-12345',
 *         instance_type: 't2.micro',
 *       }
 *     }
 *   }
 * });
 * ```
 */
export declare class HCLSerializer extends BaseSerializer<HCLSerializerOptions> {
    readonly format: SerializerFormat;
    protected readonly defaultOptions: Required<HCLSerializerOptions>;
    constructor();
    /**
     * Serialize data to HCL format.
     */
    protected doSerialize(data: unknown, options: Required<HCLSerializerOptions>): string;
    /**
     * Deserialize HCL to structured data.
     *
     * Note: Full HCL parsing is complex; this provides basic parsing
     * for common Terraform structures.
     */
    protected doDeserialize(text: string): unknown;
    /**
     * Validate HCL content.
     */
    protected doValidate(text: string): ValidationResult;
    /**
     * Type guard for HCLDocument.
     */
    private isHCLDocument;
    /**
     * Serialize an HCLDocument structure.
     */
    private serializeDocument;
    /**
     * Serialize a raw Terraform-style object.
     *
     * Expected structure:
     * ```
     * {
     *   resource: { type: { name: { ... } } },
     *   variable: { name: { ... } },
     *   output: { name: { ... } },
     *   ...
     * }
     * ```
     */
    private serializeRawObject;
    /**
     * Get ordering priority for block types.
     */
    private getBlockTypeOrder;
    /**
     * Format a block type section.
     */
    private formatBlockType;
    /**
     * Format locals block.
     */
    private formatLocalsBlock;
    /**
     * Format two-level blocks (resource, data).
     */
    private formatTwoLevelBlocks;
    /**
     * Format single-level blocks (variable, output, provider, module).
     */
    private formatSingleLevelBlocks;
    /**
     * Format a resource/data block.
     */
    private formatResourceBlock;
    /**
     * Format a named block (variable, output, etc.).
     */
    private formatNamedBlock;
    /**
     * Format block body (attributes and nested blocks).
     */
    private formatBlockBody;
    /**
     * Check if a value should be a nested block.
     */
    private isNestedBlock;
    /**
     * Format a nested block.
     */
    private formatNestedBlock;
    /**
     * Format a value for HCL output.
     */
    private formatValue;
    /**
     * Check if a string is an HCL reference.
     */
    private isHCLReference;
    /**
     * Format an array for HCL.
     */
    private formatArray;
    /**
     * Format an object for HCL.
     */
    private formatObject;
    /**
     * Basic HCL parser.
     *
     * This provides basic parsing for Terraform-style HCL files.
     * For production use with complex HCL, consider a dedicated parser.
     */
    private parseHCL;
}
/**
 * Create a new HCL serializer instance.
 */
export declare function createHCLSerializer(): HCLSerializer;
//# sourceMappingURL=HCLSerializer.d.ts.map