/**
 * IAM Policy Exporter Module
 *
 * Exports deployment intents to IAM policy documents.
 * Supports AWS IAM format with roles, policies, and service accounts.
 *
 * @module exporters/iam
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * import { IAMPolicyExporter } from '@agentics/deployment-exporters/exporters/iam';
 *
 * const exporter = new IAMPolicyExporter();
 *
 * // Check if exporter can handle the intent
 * if (exporter.canHandle(validatedIntent)) {
 *   // Validate the intent
 *   const validation = exporter.validate(validatedIntent);
 *
 *   if (validation.valid) {
 *     // Transform to IAM policy artifacts
 *     const artifacts = exporter.transform(normalizedIntent, {
 *       environment: 'production',
 *     });
 *
 *     // artifacts contains:
 *     // - iam/production/roles/{name}/trust-policy.json
 *     // - iam/production/roles/{name}/policies/{policy}.json
 *     // - iam/production/policies/{name}.json
 *     // - iam/production/service-accounts/{name}/policies/{policy}.json
 *   }
 * }
 * ```
 */

// =============================================================================
// MAIN EXPORTER
// =============================================================================

export { IAMPolicyExporter, createIAMPolicyExporter } from './IAMPolicyExporter.js';

// =============================================================================
// GENERATORS
// =============================================================================

export {
  generateStatementId,
  generateTrustPolicy,
  generateServiceTrustPolicy,
  generatePermissionStatements,
  generatePermissionPolicy,
  extractIAMConfiguration,
  groupActionsByService,
  generateReadOnlyPolicy,
  generateFullAccessPolicy,
  generateS3BucketPolicy,
} from './PolicyGenerator.js';

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Statement types
  StatementEffect,
  ConditionOperator,
  StatementCondition,
  StatementPrincipal,
  Statement,

  // Policy types
  TrustPolicy,
  PermissionPolicy,

  // Role types
  IAMRole,
  NamedPolicy,

  // Policy types
  IAMPolicy,

  // Service account types
  ServiceAccount,

  // Configuration types
  IAMConfiguration,

  // Cloud provider types
  IAMCloudProvider,
  GCPIAMBinding,
  GCPIAMPolicy,
  AzureRoleAssignment,
  AzureRoleDefinition,

  // Intent mapping
  IAMResourceType,
} from './types.js';

// =============================================================================
// CONSTANTS
// =============================================================================

export {
  IAM_RESOURCE_TYPES,
  isIAMResourceType,
  AWS_SERVICES,
  AWS_MANAGED_POLICIES,
} from './types.js';

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Default export is the IAMPolicyExporter class for convenience.
 *
 * @example
 * ```typescript
 * import IAMPolicyExporter from '@agentics/deployment-exporters/exporters/iam';
 *
 * const exporter = new IAMPolicyExporter();
 * ```
 */
export { IAMPolicyExporter as default } from './IAMPolicyExporter.js';
