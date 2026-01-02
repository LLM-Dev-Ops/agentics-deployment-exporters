/**
 * Terraform-specific Type Definitions
 *
 * This module defines types for Terraform HCL generation including
 * resources, providers, variables, outputs, and modules.
 *
 * All types are immutable and designed for deterministic serialization.
 *
 * @module exporters/terraform/types
 * @version 1.0.0
 */
import type { CloudProvider, SemanticVersion } from '../../core/types.js';
/**
 * Base interface for all Terraform blocks.
 * Ensures consistent structure for HCL generation.
 */
export interface TerraformBlock {
    /** Block type identifier (e.g., 'resource', 'variable', 'output') */
    readonly blockType: string;
    /** Block label(s) - varies by block type */
    readonly labels: readonly string[];
    /** Block attributes */
    readonly attributes: Readonly<Record<string, unknown>>;
    /** Nested blocks */
    readonly nestedBlocks?: readonly TerraformBlock[];
    /** Optional comment for documentation */
    readonly comment?: string;
}
/**
 * Represents a Terraform resource block.
 *
 * @example
 * ```hcl
 * resource "aws_instance" "main" {
 *   ami           = "ami-12345678"
 *   instance_type = "t3.micro"
 * }
 * ```
 */
export interface TerraformResource {
    /** Resource type (e.g., 'aws_instance', 'google_compute_instance') */
    readonly resourceType: string;
    /** Resource local name */
    readonly name: string;
    /** Resource attributes */
    readonly attributes: Readonly<Record<string, unknown>>;
    /** Nested blocks within the resource */
    readonly nestedBlocks?: readonly TerraformNestedBlock[];
    /** Explicit dependencies */
    readonly dependsOn?: readonly string[];
    /** Lifecycle configuration */
    readonly lifecycle?: TerraformLifecycle;
    /** Provider alias (if not default) */
    readonly provider?: string;
    /** Count for resource replication */
    readonly count?: number | string;
    /** For_each for resource replication */
    readonly forEach?: string | Readonly<Record<string, unknown>>;
    /** Documentation comment */
    readonly comment?: string;
}
/**
 * Nested block within a resource.
 */
export interface TerraformNestedBlock {
    /** Block type (e.g., 'ebs_block_device', 'network_interface') */
    readonly type: string;
    /** Block attributes */
    readonly attributes: Readonly<Record<string, unknown>>;
    /** Whether this block can be repeated */
    readonly dynamic?: boolean;
    /** Iterator name for dynamic blocks */
    readonly iterator?: string;
    /** For each expression for dynamic blocks */
    readonly forEach?: string;
}
/**
 * Resource lifecycle configuration.
 */
export interface TerraformLifecycle {
    readonly createBeforeDestroy?: boolean;
    readonly preventDestroy?: boolean;
    readonly ignoreChanges?: readonly string[];
    readonly replaceTriggeredBy?: readonly string[];
}
/**
 * Represents a Terraform data source block.
 *
 * @example
 * ```hcl
 * data "aws_ami" "ubuntu" {
 *   most_recent = true
 *   filter { ... }
 * }
 * ```
 */
export interface TerraformDataSource {
    /** Data source type (e.g., 'aws_ami', 'aws_vpc') */
    readonly dataType: string;
    /** Data source local name */
    readonly name: string;
    /** Data source attributes */
    readonly attributes: Readonly<Record<string, unknown>>;
    /** Nested blocks (e.g., filter blocks) */
    readonly nestedBlocks?: readonly TerraformNestedBlock[];
    /** Provider alias */
    readonly provider?: string;
    /** Documentation comment */
    readonly comment?: string;
}
/**
 * Represents a Terraform provider configuration.
 *
 * @example
 * ```hcl
 * provider "aws" {
 *   region = "us-east-1"
 *   alias  = "east"
 * }
 * ```
 */
export interface TerraformProvider {
    /** Provider name (e.g., 'aws', 'google', 'azurerm') */
    readonly name: string;
    /** Provider alias (for multiple configurations) */
    readonly alias?: string;
    /** Provider-specific configuration */
    readonly config: Readonly<Record<string, unknown>>;
    /** Documentation comment */
    readonly comment?: string;
}
/**
 * Provider version constraint.
 */
export interface TerraformProviderRequirement {
    /** Provider source (e.g., 'hashicorp/aws') */
    readonly source: string;
    /** Version constraint (e.g., '~> 4.0') */
    readonly version: string;
}
/**
 * Represents a Terraform input variable.
 *
 * @example
 * ```hcl
 * variable "instance_type" {
 *   description = "EC2 instance type"
 *   type        = string
 *   default     = "t3.micro"
 * }
 * ```
 */
export interface TerraformVariable {
    /** Variable name */
    readonly name: string;
    /** Variable description */
    readonly description?: string;
    /** Variable type expression */
    readonly type?: string;
    /** Default value */
    readonly default?: unknown;
    /** Whether the variable is sensitive */
    readonly sensitive?: boolean;
    /** Validation rules */
    readonly validation?: readonly TerraformValidation[];
    /** Whether variable is nullable */
    readonly nullable?: boolean;
    /** Documentation comment */
    readonly comment?: string;
}
/**
 * Variable validation rule.
 */
export interface TerraformValidation {
    /** Validation condition expression */
    readonly condition: string;
    /** Error message if validation fails */
    readonly errorMessage: string;
}
/**
 * Represents a Terraform output value.
 *
 * @example
 * ```hcl
 * output "instance_id" {
 *   description = "The ID of the created instance"
 *   value       = aws_instance.main.id
 *   sensitive   = false
 * }
 * ```
 */
export interface TerraformOutput {
    /** Output name */
    readonly name: string;
    /** Output value expression */
    readonly value: string;
    /** Output description */
    readonly description?: string;
    /** Whether the output is sensitive */
    readonly sensitive?: boolean;
    /** Explicit dependencies */
    readonly dependsOn?: readonly string[];
    /** Documentation comment */
    readonly comment?: string;
}
/**
 * Represents a Terraform module block.
 *
 * @example
 * ```hcl
 * module "vpc" {
 *   source  = "./modules/vpc"
 *   version = "1.0.0"
 *
 *   cidr_block = var.vpc_cidr
 * }
 * ```
 */
export interface TerraformModule {
    /** Module local name */
    readonly name: string;
    /** Module source path or registry reference */
    readonly source: string;
    /** Module version constraint */
    readonly version?: string;
    /** Module input variables */
    readonly inputs: Readonly<Record<string, unknown>>;
    /** Provider configurations to pass */
    readonly providers?: Readonly<Record<string, string>>;
    /** Explicit dependencies */
    readonly dependsOn?: readonly string[];
    /** Count for module replication */
    readonly count?: number | string;
    /** For_each for module replication */
    readonly forEach?: string | Readonly<Record<string, unknown>>;
    /** Documentation comment */
    readonly comment?: string;
}
/**
 * Module definition for generating a Terraform module.
 */
export interface TerraformModuleDefinition {
    /** Module name */
    readonly name: string;
    /** Module description */
    readonly description: string;
    /** Module version */
    readonly version: SemanticVersion;
    /** Input variables */
    readonly variables: readonly TerraformVariable[];
    /** Output values */
    readonly outputs: readonly TerraformOutput[];
    /** Resources */
    readonly resources: readonly TerraformResource[];
    /** Data sources */
    readonly dataSources: readonly TerraformDataSource[];
    /** Provider requirements */
    readonly providerRequirements: Readonly<Record<string, TerraformProviderRequirement>>;
}
/**
 * Terraform version constraints configuration.
 */
export interface TerraformVersions {
    /** Required Terraform version */
    readonly requiredVersion: string;
    /** Required provider versions */
    readonly requiredProviders: Readonly<Record<string, TerraformProviderRequirement>>;
}
/**
 * Terraform backend configuration.
 */
export interface TerraformBackend {
    /** Backend type (e.g., 's3', 'gcs', 'azurerm') */
    readonly type: string;
    /** Backend configuration */
    readonly config: Readonly<Record<string, unknown>>;
}
/**
 * Terraform locals block content.
 */
export interface TerraformLocals {
    /** Local value definitions */
    readonly values: Readonly<Record<string, unknown>>;
    /** Documentation comment */
    readonly comment?: string;
}
/**
 * Complete Terraform configuration representing all generated files.
 */
export interface TerraformConfiguration {
    /** Terraform version and provider requirements */
    readonly versions: TerraformVersions;
    /** Backend configuration */
    readonly backend?: TerraformBackend;
    /** Provider configurations */
    readonly providers: readonly TerraformProvider[];
    /** Local values */
    readonly locals?: TerraformLocals;
    /** Input variables */
    readonly variables: readonly TerraformVariable[];
    /** Resources */
    readonly resources: readonly TerraformResource[];
    /** Data sources */
    readonly dataSources: readonly TerraformDataSource[];
    /** Module calls */
    readonly modules: readonly TerraformModule[];
    /** Output values */
    readonly outputs: readonly TerraformOutput[];
}
/**
 * Compute resource specification from intent.
 */
export interface ComputeSpec {
    readonly name: string;
    readonly instanceType: string;
    readonly ami?: string;
    readonly imageFamily?: string;
    readonly diskSizeGb?: number;
    readonly diskType?: string;
    readonly subnetId?: string;
    readonly securityGroups?: readonly string[];
    readonly keyName?: string;
    readonly userData?: string;
    readonly tags?: Readonly<Record<string, string>>;
    readonly iamInstanceProfile?: string;
    readonly monitoring?: boolean;
    readonly publicIp?: boolean;
}
/**
 * Network resource specification from intent.
 */
export interface NetworkSpec {
    readonly name: string;
    readonly cidrBlock: string;
    readonly enableDnsSupport?: boolean;
    readonly enableDnsHostnames?: boolean;
    readonly subnets?: readonly SubnetSpec[];
    readonly securityGroups?: readonly SecurityGroupSpec[];
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
 * Security group specification.
 */
export interface SecurityGroupSpec {
    readonly name: string;
    readonly description: string;
    readonly ingressRules?: readonly SecurityGroupRule[];
    readonly egressRules?: readonly SecurityGroupRule[];
    readonly tags?: Readonly<Record<string, string>>;
}
/**
 * Security group rule.
 */
export interface SecurityGroupRule {
    readonly protocol: string;
    readonly fromPort: number;
    readonly toPort: number;
    readonly cidrBlocks?: readonly string[];
    readonly securityGroups?: readonly string[];
    readonly description?: string;
}
/**
 * Storage resource specification from intent.
 */
export interface StorageSpec {
    readonly name: string;
    readonly bucketName?: string;
    readonly location?: string;
    readonly storageClass?: string;
    readonly versioning?: boolean;
    readonly encryption?: boolean;
    readonly publicAccess?: boolean;
    readonly cors?: readonly CorsRule[];
    readonly lifecycleRules?: readonly LifecycleRule[];
    readonly tags?: Readonly<Record<string, string>>;
}
/**
 * CORS rule for storage.
 */
export interface CorsRule {
    readonly allowedOrigins: readonly string[];
    readonly allowedMethods: readonly string[];
    readonly allowedHeaders?: readonly string[];
    readonly exposeHeaders?: readonly string[];
    readonly maxAgeSeconds?: number;
}
/**
 * Lifecycle rule for storage.
 */
export interface LifecycleRule {
    readonly id: string;
    readonly enabled: boolean;
    readonly prefix?: string;
    readonly expiration?: {
        readonly days?: number;
        readonly date?: string;
    };
    readonly transition?: {
        readonly days: number;
        readonly storageClass: string;
    };
}
/**
 * Database resource specification from intent.
 */
export interface DatabaseSpec {
    readonly name: string;
    readonly engine: string;
    readonly engineVersion?: string;
    readonly instanceClass: string;
    readonly allocatedStorage: number;
    readonly maxAllocatedStorage?: number;
    readonly username: string;
    readonly databaseName?: string;
    readonly port?: number;
    readonly multiAz?: boolean;
    readonly publiclyAccessible?: boolean;
    readonly storageEncrypted?: boolean;
    readonly storageType?: string;
    readonly subnetGroupName?: string;
    readonly securityGroups?: readonly string[];
    readonly backupRetentionPeriod?: number;
    readonly backupWindow?: string;
    readonly maintenanceWindow?: string;
    readonly tags?: Readonly<Record<string, string>>;
}
/**
 * Kubernetes cluster specification from intent.
 */
export interface KubernetesSpec {
    readonly name: string;
    readonly version?: string;
    readonly nodeCount?: number;
    readonly nodeType?: string;
    readonly minNodes?: number;
    readonly maxNodes?: number;
    readonly subnetIds?: readonly string[];
    readonly securityGroups?: readonly string[];
    readonly enablePrivateNodes?: boolean;
    readonly enablePrivateEndpoint?: boolean;
    readonly tags?: Readonly<Record<string, string>>;
}
/**
 * Provider-specific resource type mappings.
 */
export declare const PROVIDER_RESOURCE_TYPES: Readonly<Record<CloudProvider, ProviderResourceTypes>>;
/**
 * Resource types for a specific provider.
 */
export interface ProviderResourceTypes {
    readonly compute: string;
    readonly vpc: string;
    readonly subnet: string;
    readonly securityGroup: string;
    readonly storage: string;
    readonly database: string;
    readonly kubernetes: string;
    readonly nodeGroup: string;
}
/**
 * Default provider configurations.
 */
export declare const DEFAULT_PROVIDER_VERSIONS: Readonly<Record<string, TerraformProviderRequirement>>;
/**
 * Default Terraform version constraint.
 */
export declare const DEFAULT_TERRAFORM_VERSION = ">= 1.0.0";
//# sourceMappingURL=types.d.ts.map