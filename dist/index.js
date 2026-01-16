/**
 * Agentics Deployment Exporters - Main Entry Point
 *
 * This module provides the primary API for the Agentics Deployment Exporters system.
 * It coordinates the transformation of DeploymentIntent specifications into
 * infrastructure-as-code artifacts for various target platforms.
 *
 * ## Core Features
 *
 * - **Multi-Format Export**: Terraform HCL, Kubernetes YAML, Helm Charts
 * - **Deterministic Output**: Same input always produces byte-identical output
 * - **Validation Pipeline**: Schema validation, security scanning, reference resolution
 * - **Packaging**: Checksums, signatures, manifests, lineage tracking
 *
 * ## Quick Start
 *
 * ```typescript
 * import {
 *   exportIntent,
 *   createDefaultOrchestrator,
 * } from '@agentics/deployment-exporters';
 *
 * // Simple export from file
 * const result = await exportIntent('/path/to/intent.yaml', {
 *   formats: ['terraform', 'kubernetes'],
 * });
 *
 * if (result.success) {
 *   console.log(`Generated ${result.artifacts.length} artifacts`);
 * }
 *
 * // Or use the orchestrator directly
 * const orchestrator = createDefaultOrchestrator();
 * const plan = orchestrator.plan(normalizedIntent);
 * const result = await orchestrator.execute(normalizedIntent, {
 *   concurrency: 4,
 *   continueOnError: false,
 * });
 * ```
 *
 * ## Architecture
 *
 * The system is organized into several layers:
 *
 * 1. **Core**: Type definitions, interfaces, error handling
 * 2. **Loader**: Intent file parsing and validation
 * 3. **Validator**: Schema and semantic validation
 * 4. **Normalizer**: Canonicalization and reference expansion
 * 5. **Orchestrator**: Execution planning and coordination
 * 6. **Exporters**: Platform-specific transformations
 * 7. **Serializers**: Output format handling
 * 8. **Packaging**: Artifact bundling and signing
 *
 * @module @agentics/deployment-exporters
 * @version 1.0.0
 */
// =============================================================================
// CORE MODULE RE-EXPORTS
// =============================================================================
/**
 * Core types, interfaces, and error handling.
 * @see {@link module:core}
 */
export * from './core/index.js';
// =============================================================================
// LOADER MODULE RE-EXPORTS
// =============================================================================
/**
 * Intent file loading and parsing.
 * @see {@link module:core/loader}
 */
export { 
// Main loader
IntentLoader, createIntentLoader, loadIntentFromFile, loadIntentFromString, 
// Parser functions
parseJSON, parseYAML, verifyDeterminism, DEFAULT_LOADER_CONFIG, SourceMapBuilder, DEFAULT_PARSER_OPTIONS, LoaderError, LoaderErrorCodes, } from './core/loader/index.js';
// =============================================================================
// VALIDATOR MODULE RE-EXPORTS
// =============================================================================
/**
 * Intent validation with schema, security, and constraint checking.
 * @see {@link module:core/validator}
 */
export { 
// Main validator
IntentValidator, createIntentValidator, 
// Sub-validators
SchemaValidator, RefValidator, ConstraintValidator, SecurityValidator, ValidationErrorCodes, } from './core/validator/index.js';
// =============================================================================
// NORMALIZER MODULE RE-EXPORTS
// =============================================================================
/**
 * Intent normalization for deterministic output.
 * @see {@link module:core/normalizer}
 */
export { 
// Main normalizer
createNormalizer, normalize, normalizedEquals, isNormalized, verifyIdempotent, reconstructOriginal, 
// Normalization utilities
generateDeterministicUUID, getAppliedDefaults, getExpandedReferences, getNormalizedHash, getOriginalHash, 
// Canonicalizer
canonicalize, canonicalEquals, computeCanonicalString, sortObjectKeys, 
// Default resolver
applyDefaults, getDefault, getDefaultDefinitions, hasDefault, normalizeEnvVars, normalizePorts, normalizeResources, normalizeSecrets, 
// Reference expander
createRef, expandReferences, findReferences, getRefPath, hasReferences, validateReferences, 
// Constants
DEFAULT_VALUES, isArray, isPlainObject, isResourceReference, NormalizationError, UUID_NAMESPACE_AGENTICS, } from './core/normalizer/index.js';
// =============================================================================
// ORCHESTRATOR MODULE RE-EXPORTS
// =============================================================================
/**
 * Export orchestration and execution planning.
 * @see {@link module:core/orchestrator}
 */
export { 
// Main orchestrator
ExportOrchestrator, createOrchestrator, 
// Execution planner
ExecutionPlanner, CircularDependencyError, UnknownDependencyError, 
// Concurrency manager
ConcurrencyManager, ExecutionTimeoutError, ExecutionAbortedError, } from './core/orchestrator/index.js';
// =============================================================================
// SERIALIZERS MODULE RE-EXPORTS
// =============================================================================
/**
 * Serialization for various output formats.
 * @see {@link module:serializers}
 */
export { 
// Registry
SerializerRegistry, getSerializer, serialize, deserialize, validate, reformat, 
// Factory
Serializers, 
// Serializer classes
HCLSerializer, YAMLSerializer, JSONSerializer, SQLSerializer, 
// Factory functions
createHCLSerializer, createYAMLSerializer, createJSONSerializer, createSQLSerializer, } from './serializers/index.js';
// =============================================================================
// PACKAGING MODULE RE-EXPORTS
// =============================================================================
/**
 * Artifact packaging, signing, and lineage tracking.
 * @see {@link module:packaging}
 */
export { 
// Checksum generation
ChecksumGenerator, createChecksumGenerator, createSHA512Generator, createBLAKE3Generator, generateChecksum, verifyChecksum, 
// Artifact signing
ArtifactSigner, createEd25519Signer, createRSAPSSSigner, createECDSAP256Signer, createECDSAP384Signer, createSignerFromKeyPair, 
// Signature verification
SignatureVerifier, createSignatureVerifier, createSignatureVerifierWithKeys, 
// Package builder
PackageBuilder, createPackageBuilder, createTarGzPackageBuilder, createZipPackageBuilder, createSignedPackageBuilder, buildPackage, 
// Archive creator
ArchiveCreator, createArchiveCreator, createMaxCompressionArchiveCreator, createFastArchiveCreator, 
// Manifest generation
ManifestGenerator, createManifestGenerator, generateManifest, parseManifest, 
// Lineage tracking
LineageTracker, LineageRecordBuilder, createLineageTracker, createLineageRecordBuilder, trackLineage, LineageStepTypes, 
// Type guards and constants
ChecksumAlgorithmValues, isChecksumAlgorithm, isPackageManifest, isLineageRecord, } from './packaging/index.js';
// =============================================================================
// EXPORTER MODULE RE-EXPORTS
// =============================================================================
/**
 * Terraform HCL exporter.
 * @see {@link module:exporters/terraform}
 */
export { TerraformExporter, ResourceMapper, ProviderGenerator, ModuleGenerator, HclSerializer, toTerraformName, formatValue, formatAttributes, formatNestedBlock, createTags, PROVIDER_RESOURCE_TYPES, DEFAULT_PROVIDER_VERSIONS, DEFAULT_TERRAFORM_VERSION, } from './exporters/terraform/index.js';
/**
 * Kubernetes YAML exporter.
 * @see {@link module:exporters/kubernetes}
 */
export { KubernetesExporter, createKubernetesExporter, manifestGenerator, ResourceQuotaMapper, resourceQuotaMapper, parseCPU, parseMemory, formatCPU, formatMemory, } from './exporters/kubernetes/index.js';
// Re-export as K8sManifestGenerator to avoid conflicts with packaging ManifestGenerator
export { ManifestGenerator as K8sManifestGenerator } from './exporters/kubernetes/index.js';
/**
 * Helm Chart exporter.
 * @see {@link module:exporters/helm}
 */
export { HelmExporter, createHelmExporter, ChartGenerator, ValuesMapper, TemplateGenerator, isHelmChart, isHelmValues, } from './exporters/helm/index.js';
// =============================================================================
// CONVENIENCE FUNCTIONS AND TYPES
// =============================================================================
import { IntentLoader } from './core/loader/index.js';
import { IntentValidator } from './core/validator/index.js';
import { createOrchestrator, } from './core/orchestrator/index.js';
import { TerraformExporter } from './exporters/terraform/index.js';
import { KubernetesExporter } from './exporters/kubernetes/index.js';
import { HelmExporter } from './exporters/helm/index.js';
/**
 * Export a deployment intent to the specified formats.
 *
 * This is the primary convenience function for simple export operations.
 * It handles the complete pipeline: loading, validation, normalization, and export.
 *
 * @param input - File path to intent file OR a pre-parsed intent object
 * @param options - Export options including target formats
 * @returns Export result containing artifacts or errors
 *
 * @example Export from file path
 * ```typescript
 * const result = await exportIntent('/path/to/intent.yaml', {
 *   formats: ['terraform', 'kubernetes'],
 *   concurrency: 4,
 * });
 *
 * if (result.success) {
 *   for (const artifact of result.artifacts) {
 *     console.log(`${artifact.path}: ${artifact.format}`);
 *   }
 * } else {
 *   console.error('Export failed:', result.errors);
 * }
 * ```
 *
 * @example Export from parsed intent
 * ```typescript
 * const parsed = await loadIntentFromFile('/path/to/intent.yaml');
 * const result = await exportIntent(parsed, {
 *   formats: ['helm'],
 *   dryRun: true,
 * });
 * ```
 *
 * @example Continue on partial failures
 * ```typescript
 * const result = await exportIntent(intent, {
 *   formats: ['terraform', 'kubernetes', 'helm'],
 *   continueOnError: true,
 * });
 *
 * // Some exporters may succeed even if others fail
 * console.log(`${result.artifacts.length} artifacts generated`);
 * console.log(`${result.errors.length} errors encountered`);
 * ```
 */
export async function exportIntent(input, options) {
    const startedAt = new Date().toISOString();
    const correlationId = crypto.randomUUID();
    const exportId = crypto.randomUUID();
    const createErrorResult = (code, message, stage, recoverable = false) => {
        const completedAt = new Date().toISOString();
        return {
            success: false,
            artifacts: [],
            errors: [
                {
                    code,
                    message,
                    exporterId: 'exportIntent',
                    stage,
                    recoverable,
                },
            ],
            warnings: [],
            metadata: {
                exportId,
                correlationId,
                startedAt,
                completedAt,
                durationMs: Date.now() - new Date(startedAt).getTime(),
                intentHash: '',
                intentVersion: '0.0.0',
                executedExporters: [],
            },
        };
    };
    try {
        // Step 1: Load intent if path provided
        let parsedData;
        if (typeof input === 'string') {
            const loader = new IntentLoader();
            const loaded = await loader.loadFromFile(input);
            parsedData = loaded;
        }
        else {
            parsedData = input;
        }
        // Step 2: Validate intent (if not skipped)
        if (!options?.skipValidation) {
            const validator = new IntentValidator();
            const validationResult = await validator.validate(parsedData);
            if (!validationResult.valid) {
                const completedAt = new Date().toISOString();
                return {
                    success: false,
                    artifacts: [],
                    errors: validationResult.errors.map((e) => ({
                        code: e.code,
                        message: e.message,
                        exporterId: 'validator',
                        stage: 'validation',
                        recoverable: false,
                    })),
                    warnings: validationResult.warnings.map((w) => ({
                        code: w.code,
                        message: w.message,
                    })),
                    metadata: {
                        exportId,
                        correlationId,
                        startedAt,
                        completedAt,
                        durationMs: Date.now() - new Date(startedAt).getTime(),
                        intentHash: '',
                        intentVersion: String(parsedData.metadata?.version ?? '0.0.0'),
                        executedExporters: [],
                    },
                };
            }
        }
        // Step 3: Build normalized intent structure for orchestrator
        // The orchestrator expects a specific NormalizedIntent shape
        const normalizedIntent = {
            apiVersion: String(parsedData.apiVersion ?? 'agentics.io/v1'),
            kind: String(parsedData.kind ?? 'DeploymentIntent'),
            metadata: {
                name: String(parsedData.metadata?.name ?? 'unnamed'),
                version: String(parsedData.metadata?.version ?? '1.0.0'),
                createdAt: new Date().toISOString(),
                labels: (parsedData.metadata?.labels ??
                    {}),
                annotations: (parsedData.metadata
                    ?.annotations ?? {}),
            },
            spec: {
                compute: parsedData.spec?.compute,
                network: parsedData.spec?.network,
                storage: parsedData.spec?.storage,
                database: parsedData.spec?.database,
                kubernetes: parsedData.spec?.kubernetes,
                security: parsedData.spec?.security,
                config: parsedData.spec?.config,
                iam: parsedData.spec?.iam,
            },
            hash: crypto.randomUUID(), // Generate hash for traceability
        };
        // Step 4: Create orchestrator with all available exporters
        const orchestrator = createDefaultOrchestrator();
        // Step 5: Execute export
        const result = await orchestrator.execute(normalizedIntent, options);
        // Step 6: Convert to simplified result format
        const completedAt = new Date().toISOString();
        return {
            success: result.success,
            artifacts: result.artifacts.map((a) => ({
                path: a.path,
                content: a.content,
                format: a.format,
            })),
            errors: result.errors.map((e) => ({
                code: e.code,
                message: e.message,
                exporterId: e.exporterId,
                stage: e.stage,
                recoverable: e.recoverable,
            })),
            warnings: result.warnings.map((w) => ({
                code: w.code,
                message: w.message,
            })),
            metadata: {
                exportId,
                correlationId,
                startedAt,
                completedAt,
                durationMs: Date.now() - new Date(startedAt).getTime(),
                intentHash: normalizedIntent.hash,
                intentVersion: normalizedIntent.metadata.version,
                executedExporters: result.metadata.executedExporters.map((e) => ({
                    exporterId: e.exporterId,
                    version: String(e.version),
                    status: String(e.status),
                    artifactCount: e.artifactCount,
                    durationMs: e.durationMs,
                    ...(e.error !== undefined ? { error: e.error } : {}),
                })),
            },
        };
    }
    catch (error) {
        return createErrorResult('E0001', error instanceof Error ? error.message : String(error), 'initialization', false);
    }
}
/**
 * Export a validated deployment intent to the specified formats.
 *
 * STRICT MODE - NO FALLBACKS:
 * - Input MUST be a pre-validated intent object (not a file path)
 * - All required fields MUST be present - no defaults injected
 * - Validation cannot be skipped
 * - Missing required fields throw errors immediately
 *
 * This function is designed to be used after contract validation
 * has already verified the input against the request schema.
 *
 * @param input - Pre-validated intent object (NOT a file path)
 * @param options - Strict export options (no skip options)
 * @returns Export result
 * @throws Error if required fields are missing
 */
export async function exportIntentStrict(input, options) {
    const startedAt = new Date().toISOString();
    const correlationId = crypto.randomUUID();
    const exportId = crypto.randomUUID();
    // STRICT: Validate required fields - NO FALLBACKS
    if (!input.apiVersion) {
        throw new Error('CONTRACT_VIOLATION: apiVersion is required');
    }
    if (!input.kind) {
        throw new Error('CONTRACT_VIOLATION: kind is required');
    }
    if (!input.metadata) {
        throw new Error('CONTRACT_VIOLATION: metadata is required');
    }
    if (!input.metadata.name) {
        throw new Error('CONTRACT_VIOLATION: metadata.name is required');
    }
    // STRICT: Build intent WITHOUT any fallback values
    const normalizedIntent = {
        apiVersion: input.apiVersion, // NO FALLBACK
        kind: input.kind, // NO FALLBACK
        metadata: {
            name: input.metadata.name, // NO FALLBACK
            version: input.metadata.version || '', // Empty string if not provided - NO DEFAULT
            createdAt: input.metadata.createdAt || startedAt, // Use request time if not provided
            labels: input.metadata.labels || {}, // Empty - NO DEFAULTS
            annotations: input.metadata.annotations || {}, // Empty - NO DEFAULTS
        },
        spec: input.spec || {},
        hash: crypto.randomUUID(),
    };
    // STRICT: Always validate - cannot be skipped
    const validator = new IntentValidator();
    const validationResult = await validator.validate({ data: input });
    if (!validationResult.valid) {
        const completedAt = new Date().toISOString();
        return {
            success: false,
            artifacts: [],
            errors: validationResult.errors.map((e) => ({
                code: e.code,
                message: e.message,
                exporterId: 'validator',
                stage: 'validation',
                recoverable: false,
            })),
            warnings: validationResult.warnings.map((w) => ({
                code: w.code,
                message: w.message,
            })),
            metadata: {
                exportId,
                correlationId,
                startedAt,
                completedAt,
                durationMs: Date.now() - new Date(startedAt).getTime(),
                intentHash: normalizedIntent.hash,
                intentVersion: input.metadata.version || '',
                executedExporters: [],
            },
        };
    }
    // Create orchestrator and execute
    const orchestrator = createDefaultOrchestrator();
    const orchestrationOptions = {};
    if (options?.formats !== undefined)
        orchestrationOptions.formats = options.formats;
    if (options?.concurrency !== undefined)
        orchestrationOptions.concurrency = options.concurrency;
    if (options?.dryRun !== undefined)
        orchestrationOptions.dryRun = options.dryRun;
    const result = await orchestrator.execute(normalizedIntent, orchestrationOptions);
    // Convert to simplified result format
    const completedAt = new Date().toISOString();
    return {
        success: result.success,
        artifacts: result.artifacts.map((a) => ({
            path: a.path,
            content: a.content,
            format: a.format,
        })),
        errors: result.errors.map((e) => ({
            code: e.code,
            message: e.message,
            exporterId: e.exporterId,
            stage: e.stage,
            recoverable: e.recoverable,
        })),
        warnings: result.warnings.map((w) => ({
            code: w.code,
            message: w.message,
        })),
        metadata: {
            exportId,
            correlationId,
            startedAt,
            completedAt,
            durationMs: Date.now() - new Date(startedAt).getTime(),
            intentHash: normalizedIntent.hash,
            intentVersion: input.metadata.version || '',
            executedExporters: result.metadata.executedExporters.map((e) => ({
                exporterId: e.exporterId,
                version: String(e.version),
                status: String(e.status),
                artifactCount: e.artifactCount,
                durationMs: e.durationMs,
                ...(e.error !== undefined ? { error: e.error } : {}),
            })),
        },
    };
}
// =============================================================================
// ORCHESTRATOR FACTORY
// =============================================================================
/**
 * Create an orchestrator pre-configured with all available exporters.
 *
 * This factory function creates an ExportOrchestrator instance with
 * TerraformExporter, KubernetesExporter, and HelmExporter pre-registered.
 *
 * @returns Configured ExportOrchestrator instance
 *
 * @example Basic usage
 * ```typescript
 * const orchestrator = createDefaultOrchestrator();
 *
 * // All exporters are already registered
 * const exporters = orchestrator.getExporters();
 * console.log(exporters.map(e => e.id)); // ['helm', 'kubernetes', 'terraform']
 *
 * // Execute export
 * const result = await orchestrator.execute(normalizedIntent);
 * ```
 *
 * @example With progress monitoring
 * ```typescript
 * const orchestrator = createDefaultOrchestrator();
 *
 * orchestrator.onProgress((event) => {
 *   console.log(`[${event.type}] ${event.message} (${event.progress}%)`);
 * });
 *
 * const result = await orchestrator.execute(normalizedIntent, {
 *   concurrency: 2,
 * });
 * ```
 *
 * @example With custom exporters
 * ```typescript
 * const orchestrator = createDefaultOrchestrator();
 *
 * // Add a custom exporter
 * orchestrator.registerExporter(new MyCustomExporter());
 *
 * // Execute with all exporters including custom one
 * const result = await orchestrator.execute(normalizedIntent);
 * ```
 */
export function createDefaultOrchestrator() {
    const orchestrator = createOrchestrator();
    // Register all available exporters
    // Cast to the orchestrator's expected IExporter type
    orchestrator.registerExporter(new TerraformExporter());
    orchestrator.registerExporter(new KubernetesExporter());
    orchestrator.registerExporter(new HelmExporter());
    return orchestrator;
}
/**
 * Available export formats as a readonly array.
 */
export const AVAILABLE_FORMATS = [
    'terraform',
    'kubernetes',
    'helm',
];
/**
 * Library version.
 */
export const VERSION = '1.0.0';
/**
 * Library name.
 */
export const NAME = '@agentics/deployment-exporters';
// =============================================================================
// SYNTHESIS MODULE RE-EXPORTS
// =============================================================================
/**
 * Executive synthesis for deployment validation.
 * @see {@link module:synthesis}
 */
export { 
// Type value arrays
RiskLevelValues, RecommendationValues, ChangeActionValues, DeployStatusValues, 
// Type guards
isRiskLevel, isRecommendation, isChangeAction, isDeployStatus, isExecutiveSummary, 
// Constants
SUCCESS_RATE_THRESHOLD, PRODUCTION_ENVIRONMENTS, 
// Risk assessment
assessRiskLevel, determineRecommendation, 
// Production elevation
elevateRiskForProduction, isProductionTarget, 
// Builder functions
buildDeployReference, buildExecutionMetrics, buildExecutiveSummary, 
// Preview synthesis
extractBlockingIssuesFromPreview, calculatePreviewMetrics, buildSynthesisFromPreview, 
// Record synthesis
buildSynthesisFromRecord, 
// Utilities
calculateSuccessRate, determineEnvironment, } from './synthesis/index.js';
// =============================================================================
// COMMANDS MODULE RE-EXPORTS
// =============================================================================
/**
 * Command implementations for deployment and export operations.
 * @see {@link module:commands}
 */
export { 
// Deploy command
deploy, deployPreview, deployRun, deployRollback, isProductionDeployment, calculateDeploySuccessRate, countBlockingIssues, extractBlockingIssues, deployCommand, 
// Export command
ExportFormatValues, exportArtifacts, exportTerraform, exportKubernetes, exportHelm, exportAll, isExportFormat, determineExportEnvironment, isProductionExport, detectSecrets, detectInvalidReferences, detectMissingFields, validateArtifact, extractExportBlockingIssues, calculateExportSuccessRate, countExportFailures, assessExportRisk, exportCommand, } from './commands/index.js';
// =============================================================================
// DEFAULT EXPORT
// =============================================================================
/**
 * Default export provides the main convenience functions.
 */
export default {
    exportIntent,
    exportIntentStrict,
    createDefaultOrchestrator,
    createOrchestrator,
    AVAILABLE_FORMATS,
    VERSION,
    NAME,
};
//# sourceMappingURL=index.js.map