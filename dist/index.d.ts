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
/**
 * Core types, interfaces, and error handling.
 * @see {@link module:core}
 */
export * from './core/index.js';
/**
 * Intent file loading and parsing.
 * @see {@link module:core/loader}
 */
export { IntentLoader, createIntentLoader, loadIntentFromFile, loadIntentFromString, parseJSON, parseYAML, verifyDeterminism, type ParseResult, type LoaderConfig, DEFAULT_LOADER_CONFIG, SourceMapBuilder, type EncodingDetectionResult, type FormatDetectionResult, type ParserOptions, DEFAULT_PARSER_OPTIONS, LoaderError, LoaderErrorCodes, type LoaderErrorCode, } from './core/loader/index.js';
/**
 * Intent validation with schema, security, and constraint checking.
 * @see {@link module:core/validator}
 */
export { IntentValidator, createIntentValidator, SchemaValidator, RefValidator, ConstraintValidator, SecurityValidator, type IIntentValidator, type IntentValidationResult, type ValidationMetadata, type SchemaValidationResult, type SecurityScanResult, type CircularDependencyResult, type ValidationIssue, type ValidationRule, type ValidationOptions, type ValidationIssueCategory, type SchemaVersion, type InternalReference, type CrossFieldConstraint, type InjectionPattern, ValidationErrorCodes, type ValidationErrorCode, } from './core/validator/index.js';
/**
 * Intent normalization for deterministic output.
 * @see {@link module:core/normalizer}
 */
export { createNormalizer, normalize, normalizedEquals, isNormalized, verifyIdempotent, reconstructOriginal, generateDeterministicUUID, getAppliedDefaults, getExpandedReferences, getNormalizedHash, getOriginalHash, canonicalize, canonicalEquals, computeCanonicalString, sortObjectKeys, type CanonicalizationOptions, applyDefaults, getDefault, getDefaultDefinitions, hasDefault, normalizeEnvVars, normalizePorts, normalizeResources, normalizeSecrets, type DefaultResolutionResult, type DefaultResolverOptions, createRef, expandReferences, findReferences, getRefPath, hasReferences, validateReferences, type ExpansionResult, type RefExpanderOptions, type ApiVersion, type AppliedDefault, type DependencyNode, type EnvVar, type NormalizedMetadata, type NormalizationOptions, type NormalizedSpec, type Port, type RefExpansionResult, type ResourceReference, type Secret, type TransformationRecord, type TransformationType, DEFAULT_VALUES, isArray, isPlainObject, isResourceReference, NormalizationError, UUID_NAMESPACE_AGENTICS, type NormalizationErrorCode, } from './core/normalizer/index.js';
export type { IntentMetadata as NormalizerIntentMetadata, IntentSpec as NormalizerIntentSpec, NormalizedIntent as NormalizerNormalizedIntent, NormalizationMetadata as NormalizerNormalizationMetadata, Resource as NormalizerResource, ResourceRequirements as NormalizerResourceRequirements, ResourceSpec as NormalizerResourceSpec, ValidatedIntent as NormalizerValidatedIntent, SemanticVersion as NormalizerSemanticVersion, } from './core/normalizer/index.js';
/**
 * Export orchestration and execution planning.
 * @see {@link module:core/orchestrator}
 */
export { ExportOrchestrator, createOrchestrator, ExecutionPlanner, CircularDependencyError, UnknownDependencyError, ConcurrencyManager, ExecutionTimeoutError, ExecutionAbortedError, } from './core/orchestrator/index.js';
export type { ExporterExecutionInfo, ExporterExecutionResult, ConcurrencyOptions, ExporterContext, OrchestrationOptions, ExporterId as OrchestratorExporterId, ExportFormat as OrchestratorExportFormat, SemanticVersion as OrchestratorSemanticVersion, IntentSection as OrchestratorIntentSection, SerializerType as OrchestratorSerializerType, ExportOptions as OrchestratorExportOptions, ValidationError as OrchestratorValidationError, ValidationWarning as OrchestratorValidationWarning, ValidationResult as OrchestratorValidationResult, ExportArtifact as OrchestratorExportArtifact, NormalizedIntent as OrchestratorNormalizedIntent, IExporter as OrchestratorIExporter, IExportOrchestrator, ExportResult as OrchestratorExportResult, ExportError as OrchestratorExportError, ExportWarning as OrchestratorExportWarning, ExportMetadata as OrchestratorExportMetadata, ExecutionPlan, ExporterPlanItem, ProgressEvent, ProgressEventType, ProgressHandler, } from './core/orchestrator/index.js';
/**
 * Serialization for various output formats.
 * @see {@link module:serializers}
 */
export { SerializerRegistry, getSerializer, serialize, deserialize, validate, reformat, Serializers, HCLSerializer, YAMLSerializer, JSONSerializer, SQLSerializer, createHCLSerializer, createYAMLSerializer, createJSONSerializer, createSQLSerializer, } from './serializers/index.js';
/**
 * Artifact packaging, signing, and lineage tracking.
 * @see {@link module:packaging}
 */
export { ChecksumGenerator, createChecksumGenerator, createSHA512Generator, createBLAKE3Generator, generateChecksum, verifyChecksum, ArtifactSigner, createEd25519Signer, createRSAPSSSigner, createECDSAP256Signer, createECDSAP384Signer, createSignerFromKeyPair, SignatureVerifier, createSignatureVerifier, createSignatureVerifierWithKeys, PackageBuilder, createPackageBuilder, createTarGzPackageBuilder, createZipPackageBuilder, createSignedPackageBuilder, buildPackage, ArchiveCreator, createArchiveCreator, createMaxCompressionArchiveCreator, createFastArchiveCreator, ManifestGenerator, createManifestGenerator, generateManifest, parseManifest, LineageTracker, LineageRecordBuilder, createLineageTracker, createLineageRecordBuilder, trackLineage, LineageStepTypes, ChecksumAlgorithmValues, isChecksumAlgorithm, isPackageManifest, isLineageRecord, } from './packaging/index.js';
export type { ChecksumAlgorithm, ChecksumResult, FileChecksum, ChecksumManifest, SigningKeyPair, SignOptions as PackageSignOptions, SignatureResult as PackageSignatureResult, VerifyOptions as PackageVerifyOptions, VerificationResult as PackageVerificationResultType, SignerConfig, PackageOptions, PackageArtifactEntry, IntentReference, ExporterInfo, PackageManifest, ArtifactPackage, LineageStep, LineageRecord, LineageManifest, LineageStepType, ArchiveEntry, ArchiveOptions, BuilderState, PackageBuildMetadata, ManifestMetadata, PackageVerificationResult, ArtifactVerificationResult, } from './packaging/index.js';
/**
 * Terraform HCL exporter.
 * @see {@link module:exporters/terraform}
 */
export { TerraformExporter, ResourceMapper, ProviderGenerator, ModuleGenerator, HclSerializer, toTerraformName, formatValue, formatAttributes, formatNestedBlock, createTags, PROVIDER_RESOURCE_TYPES, DEFAULT_PROVIDER_VERSIONS, DEFAULT_TERRAFORM_VERSION, } from './exporters/terraform/index.js';
export type { TerraformBlock, TerraformNestedBlock, TerraformResource, TerraformLifecycle, TerraformDataSource, TerraformProvider, TerraformProviderRequirement, TerraformVariable, TerraformValidation, TerraformOutput, TerraformModule, TerraformModuleDefinition, TerraformVersions, TerraformBackend, TerraformLocals, TerraformConfiguration, ComputeSpec, NetworkSpec, SubnetSpec, SecurityGroupSpec, SecurityGroupRule, StorageSpec, CorsRule, LifecycleRule, DatabaseSpec, KubernetesSpec, ProviderResourceTypes, } from './exporters/terraform/index.js';
/**
 * Kubernetes YAML exporter.
 * @see {@link module:exporters/kubernetes}
 */
export { KubernetesExporter, createKubernetesExporter, manifestGenerator, ResourceQuotaMapper, resourceQuotaMapper, parseCPU, parseMemory, formatCPU, formatMemory, } from './exporters/kubernetes/index.js';
export { ManifestGenerator as K8sManifestGenerator } from './exporters/kubernetes/index.js';
export type { K8sMetadata, K8sApiVersion, K8sResource, K8sContainer, K8sDeployment, K8sService, K8sConfigMap, K8sSecret, K8sIngress, K8sNetworkPolicy, K8sHPA, K8sPersistentVolume, K8sPersistentVolumeClaim, K8sStorageClass, K8sRole, K8sClusterRole, K8sRoleBinding, K8sClusterRoleBinding, K8sServiceAccount, K8sNamespace, K8sAnyResource, IntentServiceSpec, IntentResourceSpec, IntentScalingSpec, } from './exporters/kubernetes/index.js';
/**
 * Helm Chart exporter.
 * @see {@link module:exporters/helm}
 */
export { HelmExporter, createHelmExporter, ChartGenerator, ValuesMapper, TemplateGenerator, isHelmChart, isHelmValues, } from './exporters/helm/index.js';
export type { ChartGeneratorOptions, TemplateGeneratorOptions, HelmChart, HelmDependency, HelmMaintainer, HelmValues, HelmImageValues, HelmResourceValues, HelmServiceValues, HelmIngressValues, HelmAutoscalingValues, HelmPodSecurityContext, HelmSecurityContext, HelmProbeValues, HelmValuesSchema, JSONSchemaProperty, HelmTemplate, HelmTemplates, HelmChartExport, HelmExportOptions, } from './exporters/helm/index.js';
import { ExportOrchestrator, createOrchestrator } from './core/orchestrator/index.js';
import type { OrchestrationOptions as OrchestratorOptionsType } from './core/orchestrator/index.js';
/**
 * Options for the exportIntent convenience function.
 */
export interface ExportIntentOptions extends OrchestratorOptionsType {
    /**
     * Skip validation step (use with caution).
     * @default false
     */
    skipValidation?: boolean;
    /**
     * Skip normalization step (use with caution).
     * @default false
     */
    skipNormalization?: boolean;
}
/**
 * Simplified export result for the convenience API.
 */
export interface SimpleExportResult {
    /** Whether the export succeeded */
    readonly success: boolean;
    /** Generated artifacts */
    readonly artifacts: readonly {
        readonly path: string;
        readonly content: unknown;
        readonly format: string;
    }[];
    /** Export errors */
    readonly errors: readonly {
        readonly code: string;
        readonly message: string;
        readonly exporterId: string;
        readonly stage: string;
        readonly recoverable: boolean;
    }[];
    /** Export warnings */
    readonly warnings: readonly {
        readonly code: string;
        readonly message: string;
    }[];
    /** Export metadata */
    readonly metadata: {
        readonly exportId: string;
        readonly correlationId: string;
        readonly startedAt: string;
        readonly completedAt: string;
        readonly durationMs: number;
        readonly intentHash: string;
        readonly intentVersion: string;
        readonly executedExporters: readonly {
            readonly exporterId: string;
            readonly version: string;
            readonly status: string;
            readonly artifactCount: number;
            readonly durationMs: number;
            readonly error?: string;
        }[];
    };
}
/**
 * Input type for exportIntent - can be file path or parsed intent object.
 */
export type ExportIntentInput = string | {
    readonly apiVersion?: string;
    readonly kind?: string;
    readonly metadata?: Record<string, unknown>;
    readonly spec?: Record<string, unknown>;
    readonly [key: string]: unknown;
};
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
export declare function exportIntent(input: ExportIntentInput, options?: ExportIntentOptions): Promise<SimpleExportResult>;
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
export declare function createDefaultOrchestrator(): ExportOrchestrator;
/**
 * Available export formats as a readonly array.
 */
export declare const AVAILABLE_FORMATS: readonly ["terraform", "kubernetes", "helm"];
/**
 * Type for available export formats.
 */
export type AvailableExportFormat = (typeof AVAILABLE_FORMATS)[number];
/**
 * Library version.
 */
export declare const VERSION: "1.0.0";
/**
 * Library name.
 */
export declare const NAME: "@agentics/deployment-exporters";
/**
 * Default export provides the main convenience functions.
 */
declare const _default: {
    exportIntent: typeof exportIntent;
    createDefaultOrchestrator: typeof createDefaultOrchestrator;
    createOrchestrator: typeof createOrchestrator;
    AVAILABLE_FORMATS: readonly ["terraform", "kubernetes", "helm"];
    VERSION: "1.0.0";
    NAME: "@agentics/deployment-exporters";
};
export default _default;
//# sourceMappingURL=index.d.ts.map