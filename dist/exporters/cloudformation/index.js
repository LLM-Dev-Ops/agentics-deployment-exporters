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
// =============================================================================
// MAIN EXPORTER
// =============================================================================
export { CloudFormationExporter, createCloudFormationExporter } from './CloudFormationExporter.js';
// =============================================================================
// GENERATORS
// =============================================================================
export { ResourceMapper, toCFNLogicalId, sortObjectKeys } from './ResourceMapper.js';
export { TemplateGenerator } from './TemplateGenerator.js';
// =============================================================================
// CONSTANTS
// =============================================================================
export { COMPONENT_TYPE_MAPPINGS } from './types.js';
// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
export { createRef, createGetAtt, createSub, createJoin, createIf, createImportValue, } from './types.js';
// =============================================================================
// DEFAULT EXPORT
// =============================================================================
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
//# sourceMappingURL=index.js.map