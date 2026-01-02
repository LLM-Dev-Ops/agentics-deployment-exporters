/**
 * IAM Policy Exporter
 *
 * Main exporter implementation that transforms NormalizedIntent into
 * IAM policy documents (AWS format). Supports roles, policies, and
 * service accounts.
 *
 * All exports are deterministic and produce byte-identical output for the
 * same input, regardless of execution environment.
 *
 * @module exporters/iam/IAMPolicyExporter
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
import type {
  IAMConfiguration,
  IAMPolicy,
  IAMRole,
  ServiceAccount,
} from './types.js';
import { isIAMResourceType } from './types.js';
import { extractIAMConfiguration } from './PolicyGenerator.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const EXPORTER_ID = 'iam' as ExporterId;
const EXPORTER_NAME = 'IAM Policy Exporter';
const EXPORTER_VERSION: SemanticVersion = '1.0.0';

// =============================================================================
// IAM POLICY EXPORTER CLASS
// =============================================================================

/**
 * Exports deployment intents to IAM policy documents.
 *
 * Generates AWS-compatible IAM policy JSON files including:
 * - Trust policies (AssumeRolePolicyDocument)
 * - Permission policies (inline and standalone)
 * - Service account policies
 *
 * All output is deterministic with sorted keys and stable ordering.
 *
 * @example
 * ```typescript
 * const exporter = new IAMPolicyExporter();
 * const artifacts = exporter.transform(normalizedIntent);
 * // artifacts contains trust-policy.json, permissions-policy.json, etc.
 * ```
 */
export class IAMPolicyExporter implements IExporter {
  readonly id: ExporterId = EXPORTER_ID;
  readonly name: string = EXPORTER_NAME;
  readonly version: SemanticVersion = EXPORTER_VERSION;
  readonly targetFormat: ExportFormat = 'iam';

  /**
   * Transform a normalized intent into IAM policy artifacts.
   *
   * @param intent - Normalized, validated DeploymentIntent
   * @param options - Optional export configuration
   * @returns Array of export artifacts (JSON policy files)
   */
  transform(
    intent: NormalizedIntent,
    options?: ExportOptions
  ): readonly ExportArtifact[] {
    const environment = options?.environment ?? intent.spec.target.environment;

    // Extract IAM configuration from intent resources
    const iamConfig = this.extractIAMResources(intent);

    // Generate artifacts
    const artifacts: ExportArtifact[] = [];

    // Generate role artifacts
    for (const role of iamConfig.roles) {
      artifacts.push(...this.generateRoleArtifacts(role, intent, environment));
    }

    // Generate standalone policy artifacts
    for (const policy of iamConfig.policies) {
      artifacts.push(this.generatePolicyArtifact(policy, intent, environment));
    }

    // Generate service account artifacts
    for (const account of iamConfig.serviceAccounts) {
      artifacts.push(...this.generateServiceAccountArtifacts(account, intent, environment));
    }

    // Sort artifacts by path for deterministic output
    return [...artifacts].sort((a, b) => a.path.localeCompare(b.path, 'en'));
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

    // Check for IAM resources
    const iamResources = intent.spec.resources.filter(r =>
      isIAMResourceType(r.type.toLowerCase()) ||
      r.type.toLowerCase().includes('iam') ||
      r.type.toLowerCase().includes('role') ||
      r.type.toLowerCase().includes('policy')
    );

    if (iamResources.length === 0) {
      warnings.push({
        code: 'IAM001',
        message: 'No IAM resources found in intent',
        path: '$.spec.resources',
      });
    }

    // Validate each IAM resource
    for (let i = 0; i < iamResources.length; i++) {
      const resource = iamResources[i]!;

      // Check for required name
      if (!resource.name) {
        errors.push({
          code: 'IAM002',
          message: 'IAM resource must have a name',
          path: `$.spec.resources[${i}].name`,
        });
      }

      // Check for valid name format
      if (resource.name && !/^[\w+=,.@-]+$/.test(resource.name)) {
        errors.push({
          code: 'IAM003',
          message: 'IAM resource name contains invalid characters',
          path: `$.spec.resources[${i}].name`,
        });
      }

      // Warn if no permissions defined
      const props = resource.properties;
      if (!props.actions && !props.permissions && !props.managedPolicies) {
        warnings.push({
          code: 'IAM101',
          message: 'IAM resource has no permissions defined',
          path: `$.spec.resources[${i}].properties`,
        });
      }
    }

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
    // Check if there are any IAM-related resources
    return intent.spec.resources.some(r =>
      isIAMResourceType(r.type.toLowerCase()) ||
      r.type.toLowerCase().includes('iam') ||
      r.type.toLowerCase().includes('role') ||
      r.type.toLowerCase().includes('policy') ||
      r.type.toLowerCase().includes('service-account')
    );
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
   * Extract IAM configuration from intent.
   */
  private extractIAMResources(intent: NormalizedIntent): IAMConfiguration {
    // Filter to IAM-related resources
    const iamResources = intent.spec.resources.filter(r =>
      isIAMResourceType(r.type.toLowerCase()) ||
      r.type.toLowerCase().includes('iam') ||
      r.type.toLowerCase().includes('role') ||
      r.type.toLowerCase().includes('policy') ||
      r.type.toLowerCase().includes('service-account')
    );

    return extractIAMConfiguration(iamResources);
  }

  /**
   * Generate artifacts for an IAM role.
   */
  private generateRoleArtifacts(
    role: IAMRole,
    intent: NormalizedIntent,
    environment?: string
  ): ExportArtifact[] {
    const artifacts: ExportArtifact[] = [];
    const basePath = environment
      ? `iam/${environment}/roles/${role.name}`
      : `iam/roles/${role.name}`;

    // Trust policy artifact
    artifacts.push({
      path: `${basePath}/trust-policy.json`,
      content: this.addTraceabilityToPolicy(role.trustPolicy, intent),
      format: 'json' as SerializerType,
      encoding: 'utf-8',
      metadata: {
        intentId: intent.intentId,
        intentHash: intent.canonicalHash,
        exporterVersion: EXPORTER_VERSION,
        resourceType: 'iam-role',
        resourceName: role.name,
        policyType: 'trust',
      },
    });

    // Inline policies
    if (role.inlinePolicies) {
      for (const inlinePolicy of role.inlinePolicies) {
        artifacts.push({
          path: `${basePath}/policies/${inlinePolicy.name}.json`,
          content: this.addTraceabilityToPolicy(inlinePolicy.document, intent),
          format: 'json' as SerializerType,
          encoding: 'utf-8',
          metadata: {
            intentId: intent.intentId,
            intentHash: intent.canonicalHash,
            exporterVersion: EXPORTER_VERSION,
            resourceType: 'iam-role',
            resourceName: role.name,
            policyType: 'inline',
            policyName: inlinePolicy.name,
          },
        });
      }
    }

    // Role metadata artifact
    artifacts.push({
      path: `${basePath}/role-metadata.json`,
      content: this.generateRoleMetadata(role, intent),
      format: 'json' as SerializerType,
      encoding: 'utf-8',
      metadata: {
        intentId: intent.intentId,
        intentHash: intent.canonicalHash,
        exporterVersion: EXPORTER_VERSION,
        resourceType: 'iam-role',
        resourceName: role.name,
        policyType: 'metadata',
      },
    });

    return artifacts;
  }

  /**
   * Generate artifact for a standalone IAM policy.
   */
  private generatePolicyArtifact(
    policy: IAMPolicy,
    intent: NormalizedIntent,
    environment?: string
  ): ExportArtifact {
    const basePath = environment
      ? `iam/${environment}/policies`
      : `iam/policies`;

    return {
      path: `${basePath}/${policy.name}.json`,
      content: this.addTraceabilityToPolicy(policy.document, intent),
      format: 'json' as SerializerType,
      encoding: 'utf-8',
      metadata: {
        intentId: intent.intentId,
        intentHash: intent.canonicalHash,
        exporterVersion: EXPORTER_VERSION,
        resourceType: 'iam-policy',
        resourceName: policy.name,
        policyType: 'standalone',
      },
    };
  }

  /**
   * Generate artifacts for a service account.
   */
  private generateServiceAccountArtifacts(
    account: ServiceAccount,
    intent: NormalizedIntent,
    environment?: string
  ): ExportArtifact[] {
    const artifacts: ExportArtifact[] = [];
    const basePath = environment
      ? `iam/${environment}/service-accounts/${account.name}`
      : `iam/service-accounts/${account.name}`;

    // Inline policies
    if (account.inlinePolicies) {
      for (const inlinePolicy of account.inlinePolicies) {
        artifacts.push({
          path: `${basePath}/policies/${inlinePolicy.name}.json`,
          content: this.addTraceabilityToPolicy(inlinePolicy.document, intent),
          format: 'json' as SerializerType,
          encoding: 'utf-8',
          metadata: {
            intentId: intent.intentId,
            intentHash: intent.canonicalHash,
            exporterVersion: EXPORTER_VERSION,
            resourceType: 'service-account',
            resourceName: account.name,
            policyType: 'inline',
            policyName: inlinePolicy.name,
          },
        });
      }
    }

    // Service account metadata
    artifacts.push({
      path: `${basePath}/account-metadata.json`,
      content: this.generateServiceAccountMetadata(account, intent),
      format: 'json' as SerializerType,
      encoding: 'utf-8',
      metadata: {
        intentId: intent.intentId,
        intentHash: intent.canonicalHash,
        exporterVersion: EXPORTER_VERSION,
        resourceType: 'service-account',
        resourceName: account.name,
        policyType: 'metadata',
      },
    });

    return artifacts;
  }

  /**
   * Add traceability metadata to policy document.
   */
  private addTraceabilityToPolicy(
    policy: unknown,
    intent: NormalizedIntent
  ): unknown {
    // Policy documents should not be modified, so we wrap them
    return {
      _metadata: {
        intentId: intent.intentId,
        intentVersion: intent.version,
        intentHash: intent.canonicalHash,
        exporter: EXPORTER_NAME,
        exporterVersion: EXPORTER_VERSION,
        schemaVersion: intent.schemaVersion,
      },
      policy,
    };
  }

  /**
   * Generate role metadata document.
   */
  private generateRoleMetadata(
    role: IAMRole,
    intent: NormalizedIntent
  ): unknown {
    return {
      _metadata: {
        intentId: intent.intentId,
        intentVersion: intent.version,
        intentHash: intent.canonicalHash,
        exporter: EXPORTER_NAME,
        exporterVersion: EXPORTER_VERSION,
      },
      role: {
        name: role.name,
        description: role.description,
        path: role.path,
        maxSessionDuration: role.maxSessionDuration,
        managedPolicyArns: role.managedPolicyArns,
        permissionsBoundary: role.permissionsBoundary,
        tags: role.tags,
        inlinePolicyCount: role.inlinePolicies?.length ?? 0,
      },
    };
  }

  /**
   * Generate service account metadata document.
   */
  private generateServiceAccountMetadata(
    account: ServiceAccount,
    intent: NormalizedIntent
  ): unknown {
    return {
      _metadata: {
        intentId: intent.intentId,
        intentVersion: intent.version,
        intentHash: intent.canonicalHash,
        exporter: EXPORTER_NAME,
        exporterVersion: EXPORTER_VERSION,
      },
      serviceAccount: {
        name: account.name,
        description: account.description,
        path: account.path,
        managedPolicyArns: account.managedPolicyArns,
        permissionsBoundary: account.permissionsBoundary,
        tags: account.tags,
        inlinePolicyCount: account.inlinePolicies?.length ?? 0,
      },
    };
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a new IAMPolicyExporter instance.
 *
 * @returns New IAMPolicyExporter instance
 */
export function createIAMPolicyExporter(): IAMPolicyExporter {
  return new IAMPolicyExporter();
}
