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

import type { SemanticVersion } from '../../core/types.js';

// =============================================================================
// CLOUDFORMATION TEMPLATE TYPES
// =============================================================================

/**
 * Complete CloudFormation template structure.
 *
 * @example
 * ```json
 * {
 *   "AWSTemplateFormatVersion": "2010-09-09",
 *   "Description": "My stack",
 *   "Parameters": { ... },
 *   "Resources": { ... },
 *   "Outputs": { ... }
 * }
 * ```
 */
export interface CFNTemplate {
  /** Template format version (always "2010-09-09") */
  readonly AWSTemplateFormatVersion: '2010-09-09';
  /** Template description */
  readonly Description?: string;
  /** Template metadata including AgenticsExporter tracking */
  readonly Metadata?: CFNMetadata;
  /** Template parameters */
  readonly Parameters?: Readonly<Record<string, CFNParameter>>;
  /** Template mappings */
  readonly Mappings?: Readonly<Record<string, CFNMapping>>;
  /** Template conditions */
  readonly Conditions?: Readonly<Record<string, unknown>>;
  /** Transform declarations (e.g., AWS::Serverless-2016-10-31) */
  readonly Transform?: string | readonly string[];
  /** Template resources */
  readonly Resources: Readonly<Record<string, CFNResource>>;
  /** Template outputs */
  readonly Outputs?: Readonly<Record<string, CFNOutput>>;
}

// =============================================================================
// CLOUDFORMATION METADATA
// =============================================================================

/**
 * CloudFormation template metadata with AgenticsExporter tracking.
 */
export interface CFNMetadata {
  /** Agentics exporter metadata for traceability */
  readonly AgenticsExporter?: AgenticsExporterMetadata;
  /** AWS CloudFormation interface metadata */
  readonly 'AWS::CloudFormation::Interface'?: CFNInterfaceMetadata;
  /** Additional metadata */
  readonly [key: string]: unknown;
}

/**
 * AgenticsExporter tracking metadata.
 */
export interface AgenticsExporterMetadata {
  /** Exporter version */
  readonly ExporterVersion: SemanticVersion;
  /** Source intent ID */
  readonly IntentId: string;
  /** Source intent hash */
  readonly IntentHash: string;
  /** Intent version */
  readonly IntentVersion: SemanticVersion;
  /** Schema version */
  readonly SchemaVersion: SemanticVersion;
  /** Export timestamp (from intent metadata) */
  readonly ExportedAt: string;
}

/**
 * CloudFormation console interface metadata.
 */
export interface CFNInterfaceMetadata {
  /** Parameter groups for console display */
  readonly ParameterGroups?: readonly CFNParameterGroup[];
  /** Parameter labels for console display */
  readonly ParameterLabels?: Readonly<Record<string, { readonly default: string }>>;
}

/**
 * Parameter group for CloudFormation console.
 */
export interface CFNParameterGroup {
  /** Group label */
  readonly Label: { readonly default: string };
  /** Parameters in this group */
  readonly Parameters: readonly string[];
}

// =============================================================================
// CLOUDFORMATION PARAMETER
// =============================================================================

/**
 * CloudFormation parameter definition.
 *
 * @example
 * ```json
 * {
 *   "Type": "String",
 *   "Description": "Instance type",
 *   "Default": "t3.micro",
 *   "AllowedValues": ["t3.micro", "t3.small", "t3.medium"]
 * }
 * ```
 */
export interface CFNParameter {
  /** Parameter type (String, Number, List<Number>, CommaDelimitedList, AWS-specific types) */
  readonly Type: string;
  /** Parameter description */
  readonly Description?: string;
  /** Default value */
  readonly Default?: string | number | readonly string[];
  /** Allowed values */
  readonly AllowedValues?: readonly (string | number)[];
  /** Allowed pattern (regex) */
  readonly AllowedPattern?: string;
  /** Constraint description */
  readonly ConstraintDescription?: string;
  /** Maximum length (for String types) */
  readonly MaxLength?: number;
  /** Minimum length (for String types) */
  readonly MinLength?: number;
  /** Maximum value (for Number types) */
  readonly MaxValue?: number;
  /** Minimum value (for Number types) */
  readonly MinValue?: number;
  /** Whether to mask the value in console */
  readonly NoEcho?: boolean;
}

// =============================================================================
// CLOUDFORMATION RESOURCE
// =============================================================================

/**
 * CloudFormation resource definition.
 *
 * @example
 * ```json
 * {
 *   "Type": "AWS::EC2::Instance",
 *   "Properties": {
 *     "InstanceType": "t3.micro",
 *     "ImageId": "ami-12345678"
 *   }
 * }
 * ```
 */
export interface CFNResource {
  /** Resource type (e.g., AWS::EC2::Instance) */
  readonly Type: string;
  /** Resource properties */
  readonly Properties?: Readonly<Record<string, unknown>>;
  /** Resource metadata */
  readonly Metadata?: Readonly<Record<string, unknown>>;
  /** Explicit dependencies */
  readonly DependsOn?: string | readonly string[];
  /** Condition for conditional creation */
  readonly Condition?: string;
  /** Creation policy */
  readonly CreationPolicy?: CFNCreationPolicy;
  /** Update policy */
  readonly UpdatePolicy?: CFNUpdatePolicy;
  /** Update replace policy */
  readonly UpdateReplacePolicy?: 'Delete' | 'Retain' | 'Snapshot';
  /** Deletion policy */
  readonly DeletionPolicy?: 'Delete' | 'Retain' | 'Snapshot';
}

/**
 * Creation policy for resources.
 */
export interface CFNCreationPolicy {
  readonly AutoScalingCreationPolicy?: {
    readonly MinSuccessfulInstancesPercent?: number;
  };
  readonly ResourceSignal?: {
    readonly Count?: number;
    readonly Timeout?: string;
  };
}

/**
 * Update policy for resources.
 */
export interface CFNUpdatePolicy {
  readonly AutoScalingReplacingUpdate?: {
    readonly WillReplace?: boolean;
  };
  readonly AutoScalingRollingUpdate?: {
    readonly MaxBatchSize?: number;
    readonly MinInstancesInService?: number;
    readonly MinSuccessfulInstancesPercent?: number;
    readonly PauseTime?: string;
    readonly SuspendProcesses?: readonly string[];
    readonly WaitOnResourceSignals?: boolean;
  };
  readonly AutoScalingScheduledAction?: {
    readonly IgnoreUnmodifiedGroupSizeProperties?: boolean;
  };
}

// =============================================================================
// CLOUDFORMATION OUTPUT
// =============================================================================

/**
 * CloudFormation output definition.
 *
 * @example
 * ```json
 * {
 *   "Description": "Instance ID",
 *   "Value": { "Ref": "MyInstance" },
 *   "Export": { "Name": "MyInstanceId" }
 * }
 * ```
 */
export interface CFNOutput {
  /** Output description */
  readonly Description?: string;
  /** Output value (intrinsic function or literal) */
  readonly Value: unknown;
  /** Condition for conditional export */
  readonly Condition?: string;
  /** Export configuration for cross-stack references */
  readonly Export?: {
    readonly Name: unknown;
  };
}

// =============================================================================
// CLOUDFORMATION MAPPING
// =============================================================================

/**
 * CloudFormation mapping structure.
 */
export interface CFNMapping {
  readonly [key: string]: Readonly<Record<string, string | number | boolean>>;
}

// =============================================================================
// CLOUDFORMATION INTRINSIC FUNCTIONS
// =============================================================================

/**
 * CloudFormation Ref intrinsic function.
 */
export interface CFNRef {
  readonly Ref: string;
}

/**
 * CloudFormation Fn::GetAtt intrinsic function.
 */
export interface CFNGetAtt {
  readonly 'Fn::GetAtt': readonly [string, string];
}

/**
 * CloudFormation Fn::Sub intrinsic function.
 */
export interface CFNSub {
  readonly 'Fn::Sub': string | readonly [string, Readonly<Record<string, unknown>>];
}

/**
 * CloudFormation Fn::Join intrinsic function.
 */
export interface CFNJoin {
  readonly 'Fn::Join': readonly [string, readonly unknown[]];
}

/**
 * CloudFormation Fn::If intrinsic function.
 */
export interface CFNIf {
  readonly 'Fn::If': readonly [string, unknown, unknown];
}

/**
 * CloudFormation Fn::ImportValue intrinsic function.
 */
export interface CFNImportValue {
  readonly 'Fn::ImportValue': unknown;
}

// =============================================================================
// COMPONENT TO RESOURCE TYPE MAPPINGS
// =============================================================================

/**
 * Maps component types to CloudFormation resource types.
 */
export const COMPONENT_TYPE_MAPPINGS: Readonly<Record<string, CFNResourceMapping>> = {
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

/**
 * Resource mapping with additional resources.
 */
export interface CFNResourceMapping {
  /** Primary CloudFormation resource type */
  readonly resourceType: string;
  /** Additional resources typically created with the primary */
  readonly additionalResources: readonly string[];
}

// =============================================================================
// PARAMETER FILE TYPES
// =============================================================================

/**
 * CloudFormation parameter file entry.
 */
export interface CFNParameterFileEntry {
  readonly ParameterKey: string;
  readonly ParameterValue: string;
  readonly UsePreviousValue?: boolean;
  readonly ResolvedValue?: string;
}

/**
 * CloudFormation parameter file structure.
 */
export type CFNParameterFile = readonly CFNParameterFileEntry[];

// =============================================================================
// RESOURCE SPECIFICATION TYPES
// =============================================================================

/**
 * Container specification from intent.
 */
export interface ContainerSpec {
  readonly name: string;
  readonly image: string;
  readonly cpu?: number;
  readonly memory?: number;
  readonly port?: number;
  readonly environment?: Readonly<Record<string, string>>;
  readonly healthCheck?: {
    readonly command: readonly string[];
    readonly interval?: number;
    readonly timeout?: number;
    readonly retries?: number;
    readonly startPeriod?: number;
  };
  readonly essential?: boolean;
  readonly logConfiguration?: {
    readonly logDriver: string;
    readonly options?: Readonly<Record<string, string>>;
  };
}

/**
 * Database specification from intent.
 */
export interface DatabaseSpec {
  readonly name: string;
  readonly engine: string;
  readonly engineVersion?: string;
  readonly instanceClass: string;
  readonly allocatedStorage: number;
  readonly maxAllocatedStorage?: number;
  readonly masterUsername: string;
  readonly databaseName?: string;
  readonly port?: number;
  readonly multiAZ?: boolean;
  readonly publiclyAccessible?: boolean;
  readonly storageEncrypted?: boolean;
  readonly storageType?: string;
  readonly backupRetentionPeriod?: number;
  readonly preferredBackupWindow?: string;
  readonly preferredMaintenanceWindow?: string;
  readonly deletionProtection?: boolean;
  readonly tags?: Readonly<Record<string, string>>;
}

/**
 * Network specification from intent.
 */
export interface NetworkSpec {
  readonly name: string;
  readonly cidrBlock: string;
  readonly enableDnsSupport?: boolean;
  readonly enableDnsHostnames?: boolean;
  readonly subnets?: readonly SubnetSpec[];
  readonly tags?: Readonly<Record<string, string>>;
}

/**
 * Subnet specification.
 */
export interface SubnetSpec {
  readonly name: string;
  readonly cidrBlock: string;
  readonly availabilityZone?: string;
  readonly public?: boolean;
  readonly tags?: Readonly<Record<string, string>>;
}

/**
 * Storage specification from intent.
 */
export interface StorageSpec {
  readonly name: string;
  readonly bucketName?: string;
  readonly versioning?: boolean;
  readonly encryption?: boolean;
  readonly publicAccessBlock?: boolean;
  readonly lifecycleRules?: readonly LifecycleRule[];
  readonly corsRules?: readonly CorsRule[];
  readonly tags?: Readonly<Record<string, string>>;
}

/**
 * S3 lifecycle rule.
 */
export interface LifecycleRule {
  readonly id: string;
  readonly status: 'Enabled' | 'Disabled';
  readonly prefix?: string;
  readonly expirationDays?: number;
  readonly transitionDays?: number;
  readonly transitionStorageClass?: string;
}

/**
 * S3 CORS rule.
 */
export interface CorsRule {
  readonly allowedOrigins: readonly string[];
  readonly allowedMethods: readonly string[];
  readonly allowedHeaders?: readonly string[];
  readonly exposedHeaders?: readonly string[];
  readonly maxAge?: number;
}

// =============================================================================
// HELPER FUNCTIONS FOR INTRINSIC FUNCTIONS
// =============================================================================

/**
 * Create a Ref intrinsic function.
 */
export function createRef(logicalId: string): CFNRef {
  return { Ref: logicalId };
}

/**
 * Create a Fn::GetAtt intrinsic function.
 */
export function createGetAtt(logicalId: string, attributeName: string): CFNGetAtt {
  return { 'Fn::GetAtt': [logicalId, attributeName] };
}

/**
 * Create a Fn::Sub intrinsic function.
 */
export function createSub(template: string, variables?: Readonly<Record<string, unknown>>): CFNSub {
  if (variables && Object.keys(variables).length > 0) {
    return { 'Fn::Sub': [template, variables] };
  }
  return { 'Fn::Sub': template };
}

/**
 * Create a Fn::Join intrinsic function.
 */
export function createJoin(delimiter: string, values: readonly unknown[]): CFNJoin {
  return { 'Fn::Join': [delimiter, [...values]] };
}

/**
 * Create a Fn::If intrinsic function.
 */
export function createIf(conditionName: string, valueIfTrue: unknown, valueIfFalse: unknown): CFNIf {
  return { 'Fn::If': [conditionName, valueIfTrue, valueIfFalse] };
}

/**
 * Create a Fn::ImportValue intrinsic function.
 */
export function createImportValue(sharedValueToImport: unknown): CFNImportValue {
  return { 'Fn::ImportValue': sharedValueToImport };
}
