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

import type {
  ExportArtifact,
  ExporterId,
  ExportFormat,
  ExportOptions,
  NormalizedIntent,
  SemanticVersion,
  SerializerType,
  ValidatedIntent,
  ValidationResult,
} from '../../core/types.js';
import type { IExporter } from '../../core/interfaces.js';
import { ResourceMapper } from './ResourceMapper.js';
import { TemplateGenerator } from './TemplateGenerator.js';
import { JSONSerializer } from '../../serializers/json/JSONSerializer.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const EXPORTER_ID = 'cloudformation' as ExporterId;
const EXPORTER_NAME = 'CloudFormation Exporter';
const EXPORTER_VERSION: SemanticVersion = '1.0.0';

// =============================================================================
// CLOUDFORMATION EXPORTER CLASS
// =============================================================================

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
export class CloudFormationExporter implements IExporter {
  readonly id: ExporterId = EXPORTER_ID;
  readonly name: string = EXPORTER_NAME;
  readonly version: SemanticVersion = EXPORTER_VERSION;
  readonly targetFormat: ExportFormat = 'cloudformation';

  private readonly resourceMapper: ResourceMapper;
  private readonly templateGenerator: TemplateGenerator;
  private readonly jsonSerializer: JSONSerializer;

  constructor() {
    this.resourceMapper = new ResourceMapper();
    this.templateGenerator = new TemplateGenerator();
    this.jsonSerializer = new JSONSerializer();
  }

  /**
   * Transform a normalized intent into CloudFormation artifacts.
   *
   * @param intent - Normalized, validated DeploymentIntent
   * @param options - Optional export configuration
   * @returns Array of export artifacts (JSON files)
   */
  transform(
    intent: NormalizedIntent,
    options?: ExportOptions
  ): readonly ExportArtifact[] {
    const environment = options?.environment ?? intent.spec.target.environment;

    // Generate CloudFormation template
    const template = this.templateGenerator.generateTemplate(intent);

    // Validate generated template
    const validation = this.templateGenerator.validateTemplate(template);
    if (!validation.valid) {
      throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
    }

    // Generate parameter file
    const parameterFile = this.templateGenerator.generateParameterFile(
      template.Parameters ?? {}
    );

    // Serialize to JSON
    const artifacts: ExportArtifact[] = [];
    const basePath = environment
      ? `cloudformation/${environment}`
      : 'cloudformation';

    // Main template
    const templateContent = this.jsonSerializer.serialize(template, {
      indent: 2,
      sortKeys: true,
    });

    artifacts.push({
      path: `${basePath}/template.json`,
      content: this.addTraceabilityComment(templateContent, intent),
      format: 'json' as SerializerType,
      encoding: 'utf-8',
      metadata: {
        intentId: intent.intentId,
        intentHash: intent.canonicalHash,
        exporterVersion: EXPORTER_VERSION,
        templateType: 'cloudformation',
      },
    });

    // Parameter file
    const parameterContent = this.jsonSerializer.serialize(parameterFile, {
      indent: 2,
      sortKeys: true,
    });

    artifacts.push({
      path: `${basePath}/parameters.json`,
      content: parameterContent,
      format: 'json' as SerializerType,
      encoding: 'utf-8',
      metadata: {
        intentId: intent.intentId,
        intentHash: intent.canonicalHash,
        exporterVersion: EXPORTER_VERSION,
        templateType: 'parameters',
      },
    });

    // Sort artifacts by path for deterministic output
    return artifacts.sort((a, b) => a.path.localeCompare(b.path, 'en'));
  }

  /**
   * Validate that an intent can be exported by this exporter.
   *
   * @param intent - Intent to validate
   * @returns Validation result with errors/warnings
   */
  validate(intent: ValidatedIntent): ValidationResult {
    const errors: Array<{ code: string; message: string; path?: string }> = [];
    const warnings: Array<{ code: string; message: string; path?: string }> = [];

    // Check that provider is AWS or multi
    const provider = intent.spec.target.provider;
    if (provider !== 'aws' && provider !== 'multi') {
      errors.push({
        code: 'CFN001',
        message: `CloudFormation requires AWS provider, got: ${provider}`,
        path: '$.spec.target.provider',
      });
    }

    // Validate resources
    for (let i = 0; i < intent.spec.resources.length; i++) {
      const resource = intent.spec.resources[i]!;

      // Check for required properties based on resource type
      if (!resource.name) {
        errors.push({
          code: 'CFN002',
          message: 'Resource name is required',
          path: `$.spec.resources[${i}].name`,
        });
      }

      if (!resource.type) {
        errors.push({
          code: 'CFN003',
          message: 'Resource type is required',
          path: `$.spec.resources[${i}].type`,
        });
      }

      // Check if resource type is AWS-targetable
      if (!this.resourceMapper.isAWSTargetable(resource.type)) {
        warnings.push({
          code: 'CFN101',
          message: `Resource type '${resource.type}' may not be directly supported, will use custom resource`,
          path: `$.spec.resources[${i}].type`,
        });
      }

      // Warn about missing optional but recommended properties
      if (!resource.properties || Object.keys(resource.properties).length === 0) {
        warnings.push({
          code: 'CFN102',
          message: 'Resource has no properties defined',
          path: `$.spec.resources[${i}].properties`,
        });
      }
    }

    // Validate no circular dependencies
    const dependencyErrors = this.validateDependencies(intent.spec.resources);
    errors.push(...dependencyErrors);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if this exporter can handle the given intent.
   *
   * @param intent - Intent to check
   * @returns true if this exporter can handle the intent
   */
  canHandle(intent: ValidatedIntent): boolean {
    // Check if provider is AWS or multi
    const provider = intent.spec.target.provider;
    if (provider !== 'aws' && provider !== 'multi') {
      return false;
    }

    // Check if there are resources to export
    if (!intent.spec.resources || intent.spec.resources.length === 0) {
      return false;
    }

    // Check if at least one resource is AWS-targetable
    const hasAWSResource = intent.spec.resources.some(r =>
      this.resourceMapper.isAWSTargetable(r.type)
    );

    return hasAWSResource;
  }

  /**
   * Get the serializers required by this exporter.
   *
   * @returns Array of serializer types needed for artifact serialization
   */
  getRequiredSerializers(): readonly SerializerType[] {
    return ['json'];
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Add traceability comment to JSON content.
   * Note: JSON doesn't support comments, so we add metadata to the template.
   */
  private addTraceabilityComment(content: string, _intent: NormalizedIntent): string {
    // The metadata is already included in the template via AgenticsExporter
    // This method is here for consistency with other exporters
    return content;
  }

  /**
   * Validate resource dependencies for circular references.
   */
  private validateDependencies(
    resources: readonly { readonly name: string; readonly dependencies?: readonly string[] }[]
  ): Array<{ code: string; message: string; path?: string }> {
    const errors: Array<{ code: string; message: string; path?: string }> = [];
    const resourceNames = new Set(resources.map(r => r.name));

    // Build dependency graph
    const graph = new Map<string, string[]>();
    for (const resource of resources) {
      graph.set(resource.name, [...(resource.dependencies ?? [])]);
    }

    // Check for missing dependencies
    for (const resource of resources) {
      if (resource.dependencies) {
        for (const dep of resource.dependencies) {
          if (!resourceNames.has(dep)) {
            errors.push({
              code: 'CFN004',
              message: `Resource '${resource.name}' depends on undefined resource '${dep}'`,
              path: `$.spec.resources[${resource.name}].dependencies`,
            });
          }
        }
      }
    }

    // Detect cycles using DFS
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (node: string, path: string[]): string[] | null => {
      visited.add(node);
      recStack.add(node);

      const deps = graph.get(node) ?? [];
      for (const dep of deps) {
        if (!visited.has(dep)) {
          const cyclePath = hasCycle(dep, [...path, dep]);
          if (cyclePath) return cyclePath;
        } else if (recStack.has(dep)) {
          return [...path, dep];
        }
      }

      recStack.delete(node);
      return null;
    };

    for (const resource of resources) {
      if (!visited.has(resource.name)) {
        const cyclePath = hasCycle(resource.name, [resource.name]);
        if (cyclePath) {
          errors.push({
            code: 'CFN005',
            message: `Circular dependency detected: ${cyclePath.join(' -> ')}`,
            path: '$.spec.resources',
          });
          break; // Only report first cycle found
        }
      }
    }

    return errors;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a new CloudFormationExporter instance.
 *
 * @returns New CloudFormationExporter instance
 */
export function createCloudFormationExporter(): CloudFormationExporter {
  return new CloudFormationExporter();
}
