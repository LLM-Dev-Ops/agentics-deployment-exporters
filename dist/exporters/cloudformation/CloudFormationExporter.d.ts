/**
 * CloudFormation Exporter
 *
 * Main exporter implementation that transforms NormalizedIntent into
 * AWS CloudFormation templates. Supports containers (ECS), databases (RDS),
 * storage (S3), and other AWS resources.
 *
 * All exports are deterministic and produce byte-identical output for the
 * same input, regardless of execution environment.
 *
 * @module exporters/cloudformation/CloudFormationExporter
 * @version 1.0.0
 */
import type { ExportArtifact, ExporterId, ExportFormat, ExportOptions, NormalizedIntent, SemanticVersion, SerializerType, ValidatedIntent, ValidationResult } from '../../core/types.js';
import type { IExporter } from '../../core/interfaces.js';
/**
 * Exports deployment intents to AWS CloudFormation templates.
 *
 * Generates a complete CloudFormation template including:
 * - template.json - Main CloudFormation template
 * - parameters.json - Parameter file template
 *
 * All output is deterministic with sorted keys and stable resource ordering.
 *
 * @example
 * ```typescript
 * const exporter = new CloudFormationExporter();
 * const artifacts = exporter.transform(normalizedIntent);
 * // artifacts contains template.json and parameters.json
 * ```
 */
export declare class CloudFormationExporter implements IExporter {
    readonly id: ExporterId;
    readonly name: string;
    readonly version: SemanticVersion;
    readonly targetFormat: ExportFormat;
    private readonly resourceMapper;
    private readonly templateGenerator;
    private readonly jsonSerializer;
    constructor();
    /**
     * Transform a normalized intent into CloudFormation artifacts.
     *
     * @param intent - Normalized, validated DeploymentIntent
     * @param options - Optional export configuration
     * @returns Array of export artifacts (JSON files)
     */
    transform(intent: NormalizedIntent, options?: ExportOptions): readonly ExportArtifact[];
    /**
     * Validate that an intent can be exported by this exporter.
     *
     * @param intent - Intent to validate
     * @returns Validation result with errors/warnings
     */
    validate(intent: ValidatedIntent): ValidationResult;
    /**
     * Check if this exporter can handle the given intent.
     *
     * @param intent - Intent to check
     * @returns true if this exporter can handle the intent
     */
    canHandle(intent: ValidatedIntent): boolean;
    /**
     * Get the serializers required by this exporter.
     *
     * @returns Array of serializer types needed for artifact serialization
     */
    getRequiredSerializers(): readonly SerializerType[];
    /**
     * Add traceability comment to JSON content.
     * Note: JSON doesn't support comments, so we add metadata to the template.
     */
    private addTraceabilityComment;
    /**
     * Validate resource dependencies for circular references.
     */
    private validateDependencies;
}
/**
 * Create a new CloudFormationExporter instance.
 *
 * @returns New CloudFormationExporter instance
 */
export declare function createCloudFormationExporter(): CloudFormationExporter;
//# sourceMappingURL=CloudFormationExporter.d.ts.map