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
import { ResourceMapper } from './ResourceMapper.js';
import { ProviderGenerator } from './ProviderGenerator.js';
import { ModuleGenerator } from './ModuleGenerator.js';
import { HclSerializer } from './HclSerializer.js';
// =============================================================================
// CONSTANTS
// =============================================================================
const EXPORTER_ID = 'terraform';
const EXPORTER_NAME = 'Terraform HCL Exporter';
const EXPORTER_VERSION = '1.0.0';
// =============================================================================
// TERRAFORM EXPORTER CLASS
// =============================================================================
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
export class TerraformExporter {
    id = EXPORTER_ID;
    name = EXPORTER_NAME;
    version = EXPORTER_VERSION;
    targetFormat = 'terraform';
    resourceMapper;
    providerGenerator;
    moduleGenerator;
    hclSerializer;
    constructor() {
        this.resourceMapper = new ResourceMapper();
        this.providerGenerator = new ProviderGenerator();
        this.moduleGenerator = new ModuleGenerator();
        this.hclSerializer = new HclSerializer();
    }
    /**
     * Transform a normalized intent into Terraform artifacts.
     *
     * @param intent - Normalized, validated DeploymentIntent
     * @param options - Optional export configuration
     * @returns Array of export artifacts (HCL files)
     */
    transform(intent, options) {
        const provider = options?.provider ?? intent.spec.target.provider;
        const environment = options?.environment ?? intent.spec.target.environment;
        // Generate Terraform configuration
        const config = this.generateConfiguration(intent, provider);
        // Serialize to HCL files
        const files = this.hclSerializer.serializeConfiguration(config);
        // Convert to artifacts
        const artifacts = [];
        // Sort file entries for deterministic output
        const sortedEntries = [...files.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'));
        for (const [filename, content] of sortedEntries) {
            const artifactPath = environment
                ? `terraform/${environment}/${filename}`
                : `terraform/${filename}`;
            artifacts.push({
                path: artifactPath,
                content: this.addTraceabilityHeader(content, intent),
                format: 'hcl',
                encoding: 'utf-8',
                metadata: {
                    intentId: intent.intentId,
                    intentHash: intent.canonicalHash,
                    exporterVersion: EXPORTER_VERSION,
                    provider,
                },
            });
        }
        return artifacts;
    }
    /**
     * Validate that an intent can be exported by this exporter.
     *
     * @param intent - Intent to validate
     * @returns Validation result with errors/warnings
     */
    validate(intent) {
        const errors = [];
        const warnings = [];
        // Validate provider is supported
        const provider = intent.spec.target.provider;
        if (!this.isProviderSupported(provider)) {
            errors.push({
                code: 'TF001',
                message: `Unsupported cloud provider: ${provider}`,
                path: '$.spec.target.provider',
            });
        }
        // Validate resources
        for (let i = 0; i < intent.spec.resources.length; i++) {
            const resource = intent.spec.resources[i];
            // Check for required properties based on resource type
            if (!resource.name) {
                errors.push({
                    code: 'TF002',
                    message: 'Resource name is required',
                    path: `$.spec.resources[${i}].name`,
                });
            }
            if (!resource.type) {
                errors.push({
                    code: 'TF003',
                    message: 'Resource type is required',
                    path: `$.spec.resources[${i}].type`,
                });
            }
            // Warn about missing optional but recommended properties
            if (!resource.properties || Object.keys(resource.properties).length === 0) {
                warnings.push({
                    code: 'TF101',
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
    canHandle(intent) {
        // Check if provider is supported
        const provider = intent.spec.target.provider;
        if (!this.isProviderSupported(provider)) {
            return false;
        }
        // Check if there are resources to export
        if (!intent.spec.resources || intent.spec.resources.length === 0) {
            return false;
        }
        return true;
    }
    /**
     * Get the serializers required by this exporter.
     *
     * @returns Array of serializer types needed for artifact serialization
     */
    getRequiredSerializers() {
        return ['hcl'];
    }
    // =============================================================================
    // PRIVATE METHODS
    // =============================================================================
    /**
     * Generate complete Terraform configuration from intent.
     */
    generateConfiguration(intent, provider) {
        // Generate version constraints
        const versions = this.providerGenerator.generateVersionConstraintsFromIntent(intent);
        // Generate provider configurations
        const providers = this.providerGenerator.generateProviders(intent);
        // Generate variables
        const variables = this.moduleGenerator.generateVariables(intent);
        // Map intent resources to Terraform resources
        const resources = this.mapResources(intent, provider);
        // Generate data sources
        const dataSources = this.generateDataSources(intent, provider);
        // Generate outputs
        const outputs = this.moduleGenerator.generateOutputs(resources);
        return {
            versions,
            providers: [...providers],
            variables: [...variables],
            resources,
            dataSources,
            modules: [],
            outputs: [...outputs],
        };
    }
    /**
     * Map all intent resources to Terraform resources.
     */
    mapResources(intent, provider) {
        const resources = [];
        // Sort resources by type then name for deterministic output
        const sortedIntentResources = [...intent.spec.resources].sort((a, b) => {
            const typeComparison = a.type.localeCompare(b.type, 'en');
            if (typeComparison !== 0)
                return typeComparison;
            return a.name.localeCompare(b.name, 'en');
        });
        for (const intentResource of sortedIntentResources) {
            const mappedResources = this.resourceMapper.mapResource(intentResource, provider);
            resources.push(...mappedResources);
        }
        // Sort final resources for deterministic output
        return [...resources].sort((a, b) => {
            const typeComparison = a.resourceType.localeCompare(b.resourceType, 'en');
            if (typeComparison !== 0)
                return typeComparison;
            return a.name.localeCompare(b.name, 'en');
        });
    }
    /**
     * Generate data sources based on intent and provider.
     */
    generateDataSources(intent, provider) {
        const dataSources = [];
        // Check if we need AMI data source for AWS compute resources
        const hasComputeResources = intent.spec.resources.some(r => r.type.toLowerCase().includes('compute') ||
            r.type.toLowerCase().includes('instance'));
        if (provider === 'aws' && hasComputeResources) {
            dataSources.push({
                dataType: 'aws_ami',
                name: 'default',
                attributes: {
                    most_recent: true,
                    owners: ['amazon'],
                },
                nestedBlocks: [
                    {
                        type: 'filter',
                        attributes: {
                            name: 'name',
                            values: ['amzn2-ami-hvm-*-x86_64-gp2'],
                        },
                    },
                    {
                        type: 'filter',
                        attributes: {
                            name: 'virtualization-type',
                            values: ['hvm'],
                        },
                    },
                ],
                comment: 'Default Amazon Linux 2 AMI',
            });
        }
        // Sort data sources for deterministic output
        return [...dataSources].sort((a, b) => {
            const typeComparison = a.dataType.localeCompare(b.dataType, 'en');
            if (typeComparison !== 0)
                return typeComparison;
            return a.name.localeCompare(b.name, 'en');
        });
    }
    /**
     * Add traceability header to HCL content.
     */
    addTraceabilityHeader(content, intent) {
        const header = [
            '# =============================================================================',
            '# Agentics Deployment Export',
            '# =============================================================================',
            `# Intent ID: ${intent.intentId}`,
            `# Intent Version: ${intent.version}`,
            `# Intent Hash: ${intent.canonicalHash}`,
            `# Exporter: ${EXPORTER_NAME} v${EXPORTER_VERSION}`,
            `# Schema Version: ${intent.schemaVersion}`,
            '# =============================================================================',
            '',
            '',
        ].join('\n');
        return header + content;
    }
    /**
     * Check if a provider is supported.
     */
    isProviderSupported(provider) {
        return ['aws', 'gcp', 'azure', 'multi'].includes(provider);
    }
    /**
     * Validate resource dependencies for circular references.
     */
    validateDependencies(resources) {
        const errors = [];
        const resourceNames = new Set(resources.map(r => r.name));
        // Build dependency graph
        const graph = new Map();
        for (const resource of resources) {
            graph.set(resource.name, [...(resource.dependencies ?? [])]);
        }
        // Check for missing dependencies
        for (const resource of resources) {
            if (resource.dependencies) {
                for (const dep of resource.dependencies) {
                    if (!resourceNames.has(dep)) {
                        errors.push({
                            code: 'TF004',
                            message: `Resource '${resource.name}' depends on undefined resource '${dep}'`,
                            path: `$.spec.resources[${resource.name}].dependencies`,
                        });
                    }
                }
            }
        }
        // Detect cycles using DFS
        const visited = new Set();
        const recStack = new Set();
        const hasCycle = (node, path) => {
            visited.add(node);
            recStack.add(node);
            const deps = graph.get(node) ?? [];
            for (const dep of deps) {
                if (!visited.has(dep)) {
                    const cyclePath = hasCycle(dep, [...path, dep]);
                    if (cyclePath)
                        return cyclePath;
                }
                else if (recStack.has(dep)) {
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
                        code: 'TF005',
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
//# sourceMappingURL=TerraformExporter.js.map