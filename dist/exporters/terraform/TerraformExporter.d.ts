/**
 * Terraform Exporter
 *
 * Main exporter implementation that transforms NormalizedIntent into
 * Terraform HCL configuration files. Supports AWS, GCP, and Azure providers.
 *
 * All exports are deterministic and produce byte-identical output for the
 * same input, regardless of execution environment.
 *
 * @module exporters/terraform/TerraformExporter
 * @version 1.0.0
 */
import type { ExportArtifact, ExporterId, ExportFormat, ExportOptions, NormalizedIntent, SemanticVersion, SerializerType, ValidatedIntent, ValidationResult } from '../../core/types.js';
import type { IExporter } from '../../core/interfaces.js';
/**
 * Exports deployment intents to Terraform HCL configuration.
 *
 * Generates a complete Terraform project structure including:
 * - main.tf - Primary resources
 * - variables.tf - Input variables
 * - outputs.tf - Output values
 * - providers.tf - Provider configuration
 * - versions.tf - Version constraints
 * - data.tf - Data sources (if applicable)
 *
 * All output is deterministic with sorted keys and stable resource ordering.
 *
 * @example
 * ```typescript
 * const exporter = new TerraformExporter();
 * const artifacts = exporter.transform(normalizedIntent, { provider: 'aws' });
 * // artifacts contains main.tf, variables.tf, outputs.tf, etc.
 * ```
 */
export declare class TerraformExporter implements IExporter {
    readonly id: ExporterId;
    readonly name: string;
    readonly version: SemanticVersion;
    readonly targetFormat: ExportFormat;
    private readonly resourceMapper;
    private readonly providerGenerator;
    private readonly moduleGenerator;
    private readonly hclSerializer;
    constructor();
    /**
     * Transform a normalized intent into Terraform artifacts.
     *
     * @param intent - Normalized, validated DeploymentIntent
     * @param options - Optional export configuration
     * @returns Array of export artifacts (HCL files)
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
     * Generate complete Terraform configuration from intent.
     */
    private generateConfiguration;
    /**
     * Map all intent resources to Terraform resources.
     */
    private mapResources;
    /**
     * Generate data sources based on intent and provider.
     */
    private generateDataSources;
    /**
     * Add traceability header to HCL content.
     */
    private addTraceabilityHeader;
    /**
     * Check if a provider is supported.
     */
    private isProviderSupported;
    /**
     * Validate resource dependencies for circular references.
     */
    private validateDependencies;
}
//# sourceMappingURL=TerraformExporter.d.ts.map