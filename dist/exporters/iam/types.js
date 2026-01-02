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
// =============================================================================
// INTENT RESOURCE MAPPING
// =============================================================================
/**
 * IAM-related resource types from intent.
 */
export const IAM_RESOURCE_TYPES = [
    'iam-role',
    'iam-policy',
    'service-account',
];
/**
 * Check if a resource type is IAM-related.
 */
export function isIAMResourceType(type) {
    return IAM_RESOURCE_TYPES.includes(type);
}
/**
 * Common AWS services for IAM policies.
 */
export const AWS_SERVICES = {
    EC2: 'ec2.amazonaws.com',
    LAMBDA: 'lambda.amazonaws.com',
    ECS: 'ecs.amazonaws.com',
    EKS: 'eks.amazonaws.com',
    S3: 's3.amazonaws.com',
    RDS: 'rds.amazonaws.com',
    DYNAMODB: 'dynamodb.amazonaws.com',
    SNS: 'sns.amazonaws.com',
    SQS: 'sqs.amazonaws.com',
    CLOUDWATCH: 'logs.amazonaws.com',
    EVENTS: 'events.amazonaws.com',
    APIGATEWAY: 'apigateway.amazonaws.com',
    CODEPIPELINE: 'codepipeline.amazonaws.com',
    CODEBUILD: 'codebuild.amazonaws.com',
};
/**
 * Common AWS managed policy ARNs.
 */
export const AWS_MANAGED_POLICIES = {
    ADMIN_ACCESS: 'arn:aws:iam::aws:policy/AdministratorAccess',
    POWER_USER: 'arn:aws:iam::aws:policy/PowerUserAccess',
    READ_ONLY: 'arn:aws:iam::aws:policy/ReadOnlyAccess',
    EC2_FULL: 'arn:aws:iam::aws:policy/AmazonEC2FullAccess',
    EC2_READ_ONLY: 'arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess',
    S3_FULL: 'arn:aws:iam::aws:policy/AmazonS3FullAccess',
    S3_READ_ONLY: 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess',
    RDS_FULL: 'arn:aws:iam::aws:policy/AmazonRDSFullAccess',
    LAMBDA_BASIC: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
    ECS_TASK: 'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy',
    EKS_CLUSTER: 'arn:aws:iam::aws:policy/AmazonEKSClusterPolicy',
    EKS_WORKER: 'arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy',
    EKS_CNI: 'arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy',
    ECR_READ_ONLY: 'arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly',
};
//# sourceMappingURL=types.js.map