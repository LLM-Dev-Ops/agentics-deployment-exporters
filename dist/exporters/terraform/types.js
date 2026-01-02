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
// =============================================================================
// PROVIDER MAPPINGS
// =============================================================================
/**
 * Provider-specific resource type mappings.
 */
export const PROVIDER_RESOURCE_TYPES = {
    aws: {
        compute: 'aws_instance',
        vpc: 'aws_vpc',
        subnet: 'aws_subnet',
        securityGroup: 'aws_security_group',
        storage: 'aws_s3_bucket',
        database: 'aws_db_instance',
        kubernetes: 'aws_eks_cluster',
        nodeGroup: 'aws_eks_node_group',
    },
    gcp: {
        compute: 'google_compute_instance',
        vpc: 'google_compute_network',
        subnet: 'google_compute_subnetwork',
        securityGroup: 'google_compute_firewall',
        storage: 'google_storage_bucket',
        database: 'google_sql_database_instance',
        kubernetes: 'google_container_cluster',
        nodeGroup: 'google_container_node_pool',
    },
    azure: {
        compute: 'azurerm_virtual_machine',
        vpc: 'azurerm_virtual_network',
        subnet: 'azurerm_subnet',
        securityGroup: 'azurerm_network_security_group',
        storage: 'azurerm_storage_account',
        database: 'azurerm_sql_server',
        kubernetes: 'azurerm_kubernetes_cluster',
        nodeGroup: 'azurerm_kubernetes_cluster_node_pool',
    },
    multi: {
        compute: 'compute_instance',
        vpc: 'virtual_network',
        subnet: 'subnet',
        securityGroup: 'security_group',
        storage: 'storage_bucket',
        database: 'database_instance',
        kubernetes: 'kubernetes_cluster',
        nodeGroup: 'kubernetes_node_pool',
    },
};
/**
 * Default provider configurations.
 */
export const DEFAULT_PROVIDER_VERSIONS = {
    aws: {
        source: 'hashicorp/aws',
        version: '~> 5.0',
    },
    google: {
        source: 'hashicorp/google',
        version: '~> 5.0',
    },
    azurerm: {
        source: 'hashicorp/azurerm',
        version: '~> 3.0',
    },
};
/**
 * Default Terraform version constraint.
 */
export const DEFAULT_TERRAFORM_VERSION = '>= 1.0.0';
//# sourceMappingURL=types.js.map