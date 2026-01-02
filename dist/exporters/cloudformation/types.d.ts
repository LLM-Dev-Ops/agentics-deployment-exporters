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
    readonly ParameterLabels?: Readonly<Record<string, {
        readonly default: string;
    }>>;
}
/**
 * Parameter group for CloudFormation console.
 */
export interface CFNParameterGroup {
    /** Group label */
    readonly Label: {
        readonly default: string;
    };
    /** Parameters in this group */
    readonly Parameters: readonly string[];
}
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
/**
 * CloudFormation mapping structure.
 */
export interface CFNMapping {
    readonly [key: string]: Readonly<Record<string, string | number | boolean>>;
}
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
/**
 * Maps component types to CloudFormation resource types.
 */
export declare const COMPONENT_TYPE_MAPPINGS: Readonly<Record<string, CFNResourceMapping>>;
/**
 * Resource mapping with additional resources.
 */
export interface CFNResourceMapping {
    /** Primary CloudFormation resource type */
    readonly resourceType: string;
    /** Additional resources typically created with the primary */
    readonly additionalResources: readonly string[];
}
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
/**
 * Create a Ref intrinsic function.
 */
export declare function createRef(logicalId: string): CFNRef;
/**
 * Create a Fn::GetAtt intrinsic function.
 */
export declare function createGetAtt(logicalId: string, attributeName: string): CFNGetAtt;
/**
 * Create a Fn::Sub intrinsic function.
 */
export declare function createSub(template: string, variables?: Readonly<Record<string, unknown>>): CFNSub;
/**
 * Create a Fn::Join intrinsic function.
 */
export declare function createJoin(delimiter: string, values: readonly unknown[]): CFNJoin;
/**
 * Create a Fn::If intrinsic function.
 */
export declare function createIf(conditionName: string, valueIfTrue: unknown, valueIfFalse: unknown): CFNIf;
/**
 * Create a Fn::ImportValue intrinsic function.
 */
export declare function createImportValue(sharedValueToImport: unknown): CFNImportValue;
//# sourceMappingURL=types.d.ts.map