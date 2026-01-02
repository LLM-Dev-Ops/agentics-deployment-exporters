/**
 * IAM Policy Exporter Type Definitions
 *
 * This module defines types for IAM policy generation including
 * trust policies, permission policies, and policy statements.
 *
 * All types are immutable and designed for deterministic serialization.
 *
 * @module exporters/iam/types
 * @version 1.0.0
 */
/**
 * Effect for an IAM policy statement.
 */
export type StatementEffect = 'Allow' | 'Deny';
/**
 * Condition operator types.
 */
export type ConditionOperator = 'StringEquals' | 'StringNotEquals' | 'StringEqualsIgnoreCase' | 'StringLike' | 'StringNotLike' | 'NumericEquals' | 'NumericNotEquals' | 'NumericLessThan' | 'NumericLessThanEquals' | 'NumericGreaterThan' | 'NumericGreaterThanEquals' | 'DateEquals' | 'DateNotEquals' | 'DateLessThan' | 'DateLessThanEquals' | 'DateGreaterThan' | 'DateGreaterThanEquals' | 'Bool' | 'IpAddress' | 'NotIpAddress' | 'ArnEquals' | 'ArnLike' | 'ArnNotEquals' | 'ArnNotLike' | 'Null' | 'ForAllValues:StringEquals' | 'ForAnyValue:StringEquals';
/**
 * Condition block for IAM statements.
 */
export interface StatementCondition {
    readonly [operator: string]: Readonly<Record<string, string | readonly string[]>>;
}
/**
 * Principal types for IAM statements.
 */
export interface StatementPrincipal {
    readonly AWS?: string | readonly string[] | undefined;
    readonly Service?: string | readonly string[] | undefined;
    readonly Federated?: string | readonly string[] | undefined;
}
/**
 * IAM policy statement following AWS IAM policy syntax.
 *
 * @example
 * ```json
 * {
 *   "Sid": "AllowS3Read",
 *   "Effect": "Allow",
 *   "Action": ["s3:GetObject", "s3:ListBucket"],
 *   "Resource": ["arn:aws:s3:::my-bucket", "arn:aws:s3:::my-bucket/*"]
 * }
 * ```
 */
export interface Statement {
    /** Statement identifier (unique within policy) */
    readonly Sid?: string | undefined;
    /** Effect: Allow or Deny */
    readonly Effect: StatementEffect;
    /** Principal who the statement applies to (trust policies) */
    readonly Principal?: StatementPrincipal | '*' | undefined;
    /** Principal to exclude */
    readonly NotPrincipal?: StatementPrincipal | undefined;
    /** Actions this statement applies to */
    readonly Action?: string | readonly string[] | undefined;
    /** Actions to exclude */
    readonly NotAction?: string | readonly string[] | undefined;
    /** Resources this statement applies to */
    readonly Resource?: string | readonly string[] | undefined;
    /** Resources to exclude */
    readonly NotResource?: string | readonly string[] | undefined;
    /** Conditions that must be met */
    readonly Condition?: StatementCondition | undefined;
}
/**
 * Trust policy document for IAM roles.
 * Defines who/what can assume the role.
 *
 * @example
 * ```json
 * {
 *   "Version": "2012-10-17",
 *   "Statement": [{
 *     "Effect": "Allow",
 *     "Principal": { "Service": "ec2.amazonaws.com" },
 *     "Action": "sts:AssumeRole"
 *   }]
 * }
 * ```
 */
export interface TrustPolicy {
    /** Policy language version (always "2012-10-17") */
    readonly Version: '2012-10-17';
    /** Policy statements */
    readonly Statement: readonly Statement[];
}
/**
 * Permission policy document for IAM roles, users, and groups.
 * Defines what actions are allowed on which resources.
 *
 * @example
 * ```json
 * {
 *   "Version": "2012-10-17",
 *   "Statement": [{
 *     "Sid": "AllowEC2Describe",
 *     "Effect": "Allow",
 *     "Action": "ec2:Describe*",
 *     "Resource": "*"
 *   }]
 * }
 * ```
 */
export interface PermissionPolicy {
    /** Policy language version (always "2012-10-17") */
    readonly Version: '2012-10-17';
    /** Policy identifier (optional) */
    readonly Id?: string | undefined;
    /** Policy statements */
    readonly Statement: readonly Statement[];
}
/**
 * IAM role with trust and permission policies.
 */
export interface IAMRole {
    /** Role name */
    readonly name: string;
    /** Role description */
    readonly description?: string | undefined;
    /** Role path (for organization) */
    readonly path?: string | undefined;
    /** Trust policy (AssumeRolePolicyDocument) */
    readonly trustPolicy: TrustPolicy;
    /** Inline permission policies */
    readonly inlinePolicies?: readonly NamedPolicy[] | undefined;
    /** Managed policy ARNs to attach */
    readonly managedPolicyArns?: readonly string[] | undefined;
    /** Maximum session duration in seconds */
    readonly maxSessionDuration?: number | undefined;
    /** Tags */
    readonly tags?: Readonly<Record<string, string>> | undefined;
    /** Permissions boundary policy ARN */
    readonly permissionsBoundary?: string | undefined;
}
/**
 * Named inline policy.
 */
export interface NamedPolicy {
    /** Policy name */
    readonly name: string;
    /** Policy document */
    readonly document: PermissionPolicy;
}
/**
 * Standalone IAM policy (customer managed policy).
 */
export interface IAMPolicy {
    /** Policy name */
    readonly name: string;
    /** Policy description */
    readonly description?: string | undefined;
    /** Policy path */
    readonly path?: string | undefined;
    /** Policy document */
    readonly document: PermissionPolicy;
    /** Tags */
    readonly tags?: Readonly<Record<string, string>> | undefined;
}
/**
 * Service account (IAM user for services).
 */
export interface ServiceAccount {
    /** Account name */
    readonly name: string;
    /** Account description */
    readonly description?: string | undefined;
    /** Account path */
    readonly path?: string | undefined;
    /** Inline policies */
    readonly inlinePolicies?: readonly NamedPolicy[] | undefined;
    /** Managed policy ARNs to attach */
    readonly managedPolicyArns?: readonly string[] | undefined;
    /** Tags */
    readonly tags?: Readonly<Record<string, string>> | undefined;
    /** Permissions boundary policy ARN */
    readonly permissionsBoundary?: string | undefined;
}
/**
 * Complete IAM configuration representing all exported policies.
 */
export interface IAMConfiguration {
    /** IAM roles */
    readonly roles: readonly IAMRole[];
    /** Standalone IAM policies */
    readonly policies: readonly IAMPolicy[];
    /** Service accounts */
    readonly serviceAccounts: readonly ServiceAccount[];
}
/**
 * Cloud provider for IAM policy format.
 */
export type IAMCloudProvider = 'aws' | 'gcp' | 'azure';
/**
 * GCP IAM binding.
 */
export interface GCPIAMBinding {
    readonly role: string;
    readonly members: readonly string[];
    readonly condition?: {
        readonly title: string;
        readonly description?: string | undefined;
        readonly expression: string;
    } | undefined;
}
/**
 * GCP IAM policy.
 */
export interface GCPIAMPolicy {
    readonly bindings: readonly GCPIAMBinding[];
    readonly version?: number | undefined;
    readonly etag?: string | undefined;
}
/**
 * Azure role assignment.
 */
export interface AzureRoleAssignment {
    readonly name: string;
    readonly properties: {
        readonly roleDefinitionId: string;
        readonly principalId: string;
        readonly principalType?: string | undefined;
        readonly scope: string;
        readonly condition?: string | undefined;
        readonly conditionVersion?: string | undefined;
    };
}
/**
 * Azure role definition.
 */
export interface AzureRoleDefinition {
    readonly name: string;
    readonly properties: {
        readonly roleName: string;
        readonly description?: string | undefined;
        readonly type: 'CustomRole' | 'BuiltInRole';
        readonly permissions: readonly {
            readonly actions: readonly string[];
            readonly notActions?: readonly string[] | undefined;
            readonly dataActions?: readonly string[] | undefined;
            readonly notDataActions?: readonly string[] | undefined;
        }[];
        readonly assignableScopes: readonly string[];
    };
}
/**
 * IAM-related resource types from intent.
 */
export declare const IAM_RESOURCE_TYPES: readonly ["iam-role", "iam-policy", "service-account"];
export type IAMResourceType = (typeof IAM_RESOURCE_TYPES)[number];
/**
 * Check if a resource type is IAM-related.
 */
export declare function isIAMResourceType(type: string): type is IAMResourceType;
/**
 * Common AWS services for IAM policies.
 */
export declare const AWS_SERVICES: {
    readonly EC2: "ec2.amazonaws.com";
    readonly LAMBDA: "lambda.amazonaws.com";
    readonly ECS: "ecs.amazonaws.com";
    readonly EKS: "eks.amazonaws.com";
    readonly S3: "s3.amazonaws.com";
    readonly RDS: "rds.amazonaws.com";
    readonly DYNAMODB: "dynamodb.amazonaws.com";
    readonly SNS: "sns.amazonaws.com";
    readonly SQS: "sqs.amazonaws.com";
    readonly CLOUDWATCH: "logs.amazonaws.com";
    readonly EVENTS: "events.amazonaws.com";
    readonly APIGATEWAY: "apigateway.amazonaws.com";
    readonly CODEPIPELINE: "codepipeline.amazonaws.com";
    readonly CODEBUILD: "codebuild.amazonaws.com";
};
/**
 * Common AWS managed policy ARNs.
 */
export declare const AWS_MANAGED_POLICIES: {
    readonly ADMIN_ACCESS: "arn:aws:iam::aws:policy/AdministratorAccess";
    readonly POWER_USER: "arn:aws:iam::aws:policy/PowerUserAccess";
    readonly READ_ONLY: "arn:aws:iam::aws:policy/ReadOnlyAccess";
    readonly EC2_FULL: "arn:aws:iam::aws:policy/AmazonEC2FullAccess";
    readonly EC2_READ_ONLY: "arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess";
    readonly S3_FULL: "arn:aws:iam::aws:policy/AmazonS3FullAccess";
    readonly S3_READ_ONLY: "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess";
    readonly RDS_FULL: "arn:aws:iam::aws:policy/AmazonRDSFullAccess";
    readonly LAMBDA_BASIC: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole";
    readonly ECS_TASK: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy";
    readonly EKS_CLUSTER: "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy";
    readonly EKS_WORKER: "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy";
    readonly EKS_CNI: "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy";
    readonly ECR_READ_ONLY: "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly";
};
//# sourceMappingURL=types.d.ts.map