/**
 * IAM Policy Generator
 *
 * This module provides pure functions for generating IAM policy documents
 * including trust policies and permission policies.
 *
 * All operations are deterministic and produce identical output for
 * identical input, regardless of execution environment.
 *
 * @module exporters/iam/PolicyGenerator
 * @version 1.0.0
 */
import type { IntentResource } from '../../core/types.js';
import type { IAMConfiguration, PermissionPolicy, Statement, TrustPolicy } from './types.js';
import { AWS_SERVICES } from './types.js';
/**
 * Generate a deterministic statement ID from components.
 * Uses a stable algorithm to ensure consistent output.
 *
 * @param service - Service name or identifier
 * @param action - Action type (Allow/Deny)
 * @param index - Statement index for uniqueness
 * @returns Deterministic Sid string
 *
 * @example
 * ```typescript
 * const sid = generateStatementId('S3', 'Allow', 0);
 * // Returns: "S3Allow0"
 * ```
 */
export declare function generateStatementId(service: string, action: string, index: number): string;
/**
 * Generate a trust policy for an IAM role.
 *
 * @param principals - Services or accounts that can assume the role
 * @param conditions - Optional conditions for assuming the role
 * @returns Trust policy document
 *
 * @example
 * ```typescript
 * const trustPolicy = generateTrustPolicy({
 *   services: ['lambda.amazonaws.com', 'ec2.amazonaws.com'],
 * });
 * ```
 */
export declare function generateTrustPolicy(options: {
    readonly services?: readonly string[];
    readonly awsAccounts?: readonly string[];
    readonly federatedProviders?: readonly string[];
    readonly conditions?: Readonly<Record<string, Readonly<Record<string, string | readonly string[]>>>>;
    readonly allowCrossAccount?: boolean;
}): TrustPolicy;
/**
 * Generate a trust policy for a specific AWS service.
 *
 * @param service - AWS service identifier (e.g., 'lambda', 'ec2')
 * @returns Trust policy document
 */
export declare function generateServiceTrustPolicy(service: keyof typeof AWS_SERVICES): TrustPolicy;
/**
 * Group actions by service prefix.
 *
 * @param actions - Array of IAM actions
 * @returns Map of service to actions
 */
export declare function groupActionsByService(actions: readonly string[]): Map<string, string[]>;
/**
 * Generate permission policy statements from actions and resources.
 *
 * @param actions - IAM actions to allow
 * @param resources - Resources the actions apply to
 * @param options - Additional options
 * @returns Array of policy statements
 */
export declare function generatePermissionStatements(actions: readonly string[], resources: readonly string[], options?: {
    readonly groupByService?: boolean;
    readonly effect?: 'Allow' | 'Deny';
    readonly conditions?: Readonly<Record<string, Readonly<Record<string, string | readonly string[]>>>>;
}): readonly Statement[];
/**
 * Generate a complete permission policy.
 *
 * @param statements - Policy statements
 * @param id - Optional policy ID
 * @returns Permission policy document
 */
export declare function generatePermissionPolicy(statements: readonly Statement[], id?: string): PermissionPolicy;
/**
 * Extract IAM configuration from intent resources.
 *
 * @param resources - Intent resources
 * @returns IAM configuration
 */
export declare function extractIAMConfiguration(resources: readonly IntentResource[]): IAMConfiguration;
/**
 * Generate a read-only policy for specified services.
 *
 * @param services - AWS services (e.g., 's3', 'ec2')
 * @returns Permission policy
 */
export declare function generateReadOnlyPolicy(services: readonly string[]): PermissionPolicy;
/**
 * Generate a full access policy for specified services.
 *
 * @param services - AWS services
 * @returns Permission policy
 */
export declare function generateFullAccessPolicy(services: readonly string[]): PermissionPolicy;
/**
 * Generate an S3 bucket access policy.
 *
 * @param bucketArn - S3 bucket ARN
 * @param permissions - Permissions level
 * @returns Permission policy
 */
export declare function generateS3BucketPolicy(bucketArn: string, permissions: 'read' | 'write' | 'full'): PermissionPolicy;
//# sourceMappingURL=PolicyGenerator.d.ts.map