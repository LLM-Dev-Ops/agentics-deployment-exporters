/**
 * CloudFormation-specific Type Definitions
 *
 * This module defines types for AWS CloudFormation template generation including
 * resources, parameters, outputs, mappings, and conditions.
 *
 * All types are immutable and designed for deterministic serialization.
 *
 * @module exporters/cloudformation/types
 * @version 1.0.0
 */
// =============================================================================
// COMPONENT TO RESOURCE TYPE MAPPINGS
// =============================================================================
/**
 * Maps component types to CloudFormation resource types.
 */
export const COMPONENT_TYPE_MAPPINGS = {
    // Container resources
    container: {
        resourceType: 'AWS::ECS::TaskDefinition',
        additionalResources: ['AWS::ECS::Service', 'AWS::Logs::LogGroup'],
    },
    ecs: {
        resourceType: 'AWS::ECS::TaskDefinition',
        additionalResources: ['AWS::ECS::Service', 'AWS::Logs::LogGroup'],
    },
    fargate: {
        resourceType: 'AWS::ECS::TaskDefinition',
        additionalResources: ['AWS::ECS::Service', 'AWS::Logs::LogGroup'],
    },
    // Database resources
    database: {
        resourceType: 'AWS::RDS::DBInstance',
        additionalResources: ['AWS::RDS::DBSubnetGroup'],
    },
    rds: {
        resourceType: 'AWS::RDS::DBInstance',
        additionalResources: ['AWS::RDS::DBSubnetGroup'],
    },
    mysql: {
        resourceType: 'AWS::RDS::DBInstance',
        additionalResources: ['AWS::RDS::DBSubnetGroup'],
    },
    postgres: {
        resourceType: 'AWS::RDS::DBInstance',
        additionalResources: ['AWS::RDS::DBSubnetGroup'],
    },
    aurora: {
        resourceType: 'AWS::RDS::DBCluster',
        additionalResources: ['AWS::RDS::DBInstance', 'AWS::RDS::DBSubnetGroup'],
    },
    dynamodb: {
        resourceType: 'AWS::DynamoDB::Table',
        additionalResources: [],
    },
    // Compute resources
    compute: {
        resourceType: 'AWS::EC2::Instance',
        additionalResources: ['AWS::EC2::SecurityGroup'],
    },
    ec2: {
        resourceType: 'AWS::EC2::Instance',
        additionalResources: ['AWS::EC2::SecurityGroup'],
    },
    instance: {
        resourceType: 'AWS::EC2::Instance',
        additionalResources: ['AWS::EC2::SecurityGroup'],
    },
    lambda: {
        resourceType: 'AWS::Lambda::Function',
        additionalResources: ['AWS::IAM::Role', 'AWS::Logs::LogGroup'],
    },
    // Network resources
    network: {
        resourceType: 'AWS::EC2::VPC',
        additionalResources: ['AWS::EC2::Subnet', 'AWS::EC2::InternetGateway', 'AWS::EC2::RouteTable'],
    },
    vpc: {
        resourceType: 'AWS::EC2::VPC',
        additionalResources: ['AWS::EC2::Subnet', 'AWS::EC2::InternetGateway', 'AWS::EC2::RouteTable'],
    },
    subnet: {
        resourceType: 'AWS::EC2::Subnet',
        additionalResources: [],
    },
    securitygroup: {
        resourceType: 'AWS::EC2::SecurityGroup',
        additionalResources: [],
    },
    // Storage resources
    storage: {
        resourceType: 'AWS::S3::Bucket',
        additionalResources: ['AWS::S3::BucketPolicy'],
    },
    s3: {
        resourceType: 'AWS::S3::Bucket',
        additionalResources: ['AWS::S3::BucketPolicy'],
    },
    bucket: {
        resourceType: 'AWS::S3::Bucket',
        additionalResources: ['AWS::S3::BucketPolicy'],
    },
    efs: {
        resourceType: 'AWS::EFS::FileSystem',
        additionalResources: ['AWS::EFS::MountTarget'],
    },
    // Kubernetes resources
    kubernetes: {
        resourceType: 'AWS::EKS::Cluster',
        additionalResources: ['AWS::EKS::Nodegroup', 'AWS::IAM::Role'],
    },
    eks: {
        resourceType: 'AWS::EKS::Cluster',
        additionalResources: ['AWS::EKS::Nodegroup', 'AWS::IAM::Role'],
    },
    // Queue resources
    queue: {
        resourceType: 'AWS::SQS::Queue',
        additionalResources: [],
    },
    sqs: {
        resourceType: 'AWS::SQS::Queue',
        additionalResources: [],
    },
    // Messaging resources
    sns: {
        resourceType: 'AWS::SNS::Topic',
        additionalResources: [],
    },
    topic: {
        resourceType: 'AWS::SNS::Topic',
        additionalResources: [],
    },
    // Cache resources
    cache: {
        resourceType: 'AWS::ElastiCache::CacheCluster',
        additionalResources: ['AWS::ElastiCache::SubnetGroup'],
    },
    elasticache: {
        resourceType: 'AWS::ElastiCache::CacheCluster',
        additionalResources: ['AWS::ElastiCache::SubnetGroup'],
    },
    redis: {
        resourceType: 'AWS::ElastiCache::CacheCluster',
        additionalResources: ['AWS::ElastiCache::SubnetGroup'],
    },
    // Load balancer resources
    loadbalancer: {
        resourceType: 'AWS::ElasticLoadBalancingV2::LoadBalancer',
        additionalResources: ['AWS::ElasticLoadBalancingV2::TargetGroup', 'AWS::ElasticLoadBalancingV2::Listener'],
    },
    alb: {
        resourceType: 'AWS::ElasticLoadBalancingV2::LoadBalancer',
        additionalResources: ['AWS::ElasticLoadBalancingV2::TargetGroup', 'AWS::ElasticLoadBalancingV2::Listener'],
    },
    // API resources
    api: {
        resourceType: 'AWS::ApiGateway::RestApi',
        additionalResources: ['AWS::ApiGateway::Stage', 'AWS::ApiGateway::Deployment'],
    },
    apigateway: {
        resourceType: 'AWS::ApiGateway::RestApi',
        additionalResources: ['AWS::ApiGateway::Stage', 'AWS::ApiGateway::Deployment'],
    },
};
// =============================================================================
// HELPER FUNCTIONS FOR INTRINSIC FUNCTIONS
// =============================================================================
/**
 * Create a Ref intrinsic function.
 */
export function createRef(logicalId) {
    return { Ref: logicalId };
}
/**
 * Create a Fn::GetAtt intrinsic function.
 */
export function createGetAtt(logicalId, attributeName) {
    return { 'Fn::GetAtt': [logicalId, attributeName] };
}
/**
 * Create a Fn::Sub intrinsic function.
 */
export function createSub(template, variables) {
    if (variables && Object.keys(variables).length > 0) {
        return { 'Fn::Sub': [template, variables] };
    }
    return { 'Fn::Sub': template };
}
/**
 * Create a Fn::Join intrinsic function.
 */
export function createJoin(delimiter, values) {
    return { 'Fn::Join': [delimiter, [...values]] };
}
/**
 * Create a Fn::If intrinsic function.
 */
export function createIf(conditionName, valueIfTrue, valueIfFalse) {
    return { 'Fn::If': [conditionName, valueIfTrue, valueIfFalse] };
}
/**
 * Create a Fn::ImportValue intrinsic function.
 */
export function createImportValue(sharedValueToImport) {
    return { 'Fn::ImportValue': sharedValueToImport };
}
//# sourceMappingURL=types.js.map