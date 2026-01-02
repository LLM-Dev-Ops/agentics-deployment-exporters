/**
 * CloudFormation Exporter Module
 *
 * Exports deployment intents to AWS CloudFormation templates.
 * Supports containers (ECS), databases (RDS), storage (S3), and other AWS resources.
 *
 * @module exporters/cloudformation
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * import { CloudFormationExporter } from '@agentics/deployment-exporters/exporters/cloudformation';
 *
 * const exporter = new CloudFormationExporter();
 *
 * // Check if exporter can handle the intent
 * if (exporter.canHandle(validatedIntent)) {
 *   // Validate the intent
 *   const validation = exporter.validate(validatedIntent);
 *
 *   if (validation.valid) {
 *     // Transform to CloudFormation artifacts
 *     const artifacts = exporter.transform(normalizedIntent, {
 *       environment: 'production',
 *     });
 *
 *     // artifacts contains:
 *     // - cloudformation/production/template.json
 *     // - cloudformation/production/parameters.json
 *   }
 * }
 * ```
 */
export { CloudFormationExporter, createCloudFormationExporter } from './CloudFormationExporter.js';
export { ResourceMapper, toCFNLogicalId, sortObjectKeys } from './ResourceMapper.js';
export { TemplateGenerator } from './TemplateGenerator.js';
export type { CFNTemplate, CFNMetadata, AgenticsExporterMetadata, CFNInterfaceMetadata, CFNParameterGroup, CFNResource, CFNCreationPolicy, CFNUpdatePolicy, CFNParameter, CFNOutput, CFNMapping, CFNRef, CFNGetAtt, CFNSub, CFNJoin, CFNIf, CFNImportValue, CFNParameterFile, CFNParameterFileEntry, CFNResourceMapping, ContainerSpec, DatabaseSpec, NetworkSpec, SubnetSpec, StorageSpec, LifecycleRule, CorsRule, } from './types.js';
export { COMPONENT_TYPE_MAPPINGS } from './types.js';
export { createRef, createGetAtt, createSub, createJoin, createIf, createImportValue, } from './types.js';
/**
 * Default export is the CloudFormationExporter class for convenience.
 *
 * @example
 * ```typescript
 * import CloudFormationExporter from '@agentics/deployment-exporters/exporters/cloudformation';
 *
 * const exporter = new CloudFormationExporter();
 * ```
 */
export { CloudFormationExporter as default } from './CloudFormationExporter.js';
//# sourceMappingURL=index.d.ts.map