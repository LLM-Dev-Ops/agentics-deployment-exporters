/**
 * Terraform Resource Mapper
 *
 * Maps intent resources to Terraform resource definitions for multiple
 * cloud providers (AWS, GCP, Azure). Supports compute, network, storage,
 * database, and Kubernetes resources.
 *
 * All mappings are deterministic and produce stable output.
 *
 * @module exporters/terraform/ResourceMapper
 * @version 1.0.0
 */

import type { CloudProvider, IntentResource } from '../../core/types.js';
import type {
  ComputeSpec,
  DatabaseSpec,
  KubernetesSpec,
  NetworkSpec,
  StorageSpec,
  TerraformNestedBlock,
  TerraformResource,
  SecurityGroupSpec,
} from './types.js';
import { PROVIDER_RESOURCE_TYPES } from './types.js';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a TerraformResource with proper optional field handling.
 */
function createResource(
  resourceType: string,
  name: string,
  attributes: Record<string, unknown>,
  options?: {
    nestedBlocks?: TerraformNestedBlock[];
    dependsOn?: readonly string[];
    comment?: string;
    provider?: string;
  }
): TerraformResource {
  const resource: TerraformResource = {
    resourceType,
    name,
    attributes: sortObjectKeys(attributes),
  };

  if (options?.nestedBlocks && options.nestedBlocks.length > 0) {
    return { ...resource, nestedBlocks: options.nestedBlocks, ...(options.comment && { comment: options.comment }), ...(options.provider && { provider: options.provider }), ...(options.dependsOn && { dependsOn: options.dependsOn }) };
  }

  if (options?.comment) {
    return { ...resource, comment: options.comment, ...(options.provider && { provider: options.provider }), ...(options.dependsOn && { dependsOn: options.dependsOn }) };
  }

  if (options?.provider) {
    return { ...resource, provider: options.provider, ...(options.dependsOn && { dependsOn: options.dependsOn }) };
  }

  if (options?.dependsOn) {
    return { ...resource, dependsOn: options.dependsOn };
  }

  return resource;
}

/**
 * Sort object keys alphabetically for deterministic output.
 */
function sortObjectKeys<T extends Record<string, unknown>>(obj: T): T {
  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b, 'en'));
  for (const key of keys) {
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      sorted[key] = sortObjectKeys(value as Record<string, unknown>);
    } else {
      sorted[key] = value;
    }
  }
  return sorted as T;
}

/**
 * Convert a name to Terraform-safe identifier.
 */
function toTerraformName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Create tags object with deterministic ordering.
 */
function createTags(
  baseTags: Readonly<Record<string, string>> | undefined,
  additionalTags: Readonly<Record<string, string>> = {}
): Record<string, string> {
  const merged = { ...baseTags, ...additionalTags };
  return sortObjectKeys(merged);
}

// =============================================================================
// COMPUTE MAPPING
// =============================================================================

/**
 * Map compute specification to AWS EC2 instance.
 */
function mapComputeToAws(spec: ComputeSpec): TerraformResource {
  const attributes: Record<string, unknown> = {
    ami: spec.ami ?? '${data.aws_ami.default.id}',
    instance_type: spec.instanceType,
  };

  if (spec.keyName) {
    attributes.key_name = spec.keyName;
  }

  if (spec.subnetId) {
    attributes.subnet_id = spec.subnetId;
  }

  if (spec.securityGroups && spec.securityGroups.length > 0) {
    attributes.vpc_security_group_ids = [...spec.securityGroups].sort();
  }

  if (spec.iamInstanceProfile) {
    attributes.iam_instance_profile = spec.iamInstanceProfile;
  }

  if (spec.userData) {
    attributes.user_data = spec.userData;
  }

  if (spec.monitoring !== undefined) {
    attributes.monitoring = spec.monitoring;
  }

  if (spec.publicIp !== undefined) {
    attributes.associate_public_ip_address = spec.publicIp;
  }

  if (spec.tags) {
    attributes.tags = createTags(spec.tags, { Name: spec.name });
  } else {
    attributes.tags = { Name: spec.name };
  }

  const nestedBlocks: TerraformNestedBlock[] = [];

  if (spec.diskSizeGb) {
    nestedBlocks.push({
      type: 'root_block_device',
      attributes: sortObjectKeys({
        volume_size: spec.diskSizeGb,
        volume_type: spec.diskType ?? 'gp3',
        encrypted: true,
      }),
    });
  }

  return createResource(
    'aws_instance',
    toTerraformName(spec.name),
    attributes,
    { nestedBlocks, comment: `EC2 instance: ${spec.name}` }
  );
}

/**
 * Map compute specification to GCP Compute Instance.
 */
function mapComputeToGcp(spec: ComputeSpec): TerraformResource {
  const attributes: Record<string, unknown> = {
    name: toTerraformName(spec.name),
    machine_type: spec.instanceType,
    zone: '${var.zone}',
  };

  if (spec.tags) {
    attributes.labels = createTags(spec.tags);
  }

  const nestedBlocks: TerraformNestedBlock[] = [];

  // Boot disk configuration
  nestedBlocks.push({
    type: 'boot_disk',
    attributes: {},
  });

  // Add initialize_params as nested within boot_disk
  const bootDiskParams: Record<string, unknown> = {
    size: spec.diskSizeGb ?? 50,
    type: spec.diskType ?? 'pd-standard',
  };

  if (spec.imageFamily) {
    bootDiskParams.image = spec.imageFamily;
  }

  // Network interface
  const networkInterface: Record<string, unknown> = {};
  if (spec.subnetId) {
    networkInterface.subnetwork = spec.subnetId;
  } else {
    networkInterface.network = 'default';
  }

  if (spec.publicIp) {
    networkInterface.access_config = {};
  }

  nestedBlocks.push({
    type: 'network_interface',
    attributes: sortObjectKeys(networkInterface),
  });

  if (spec.userData) {
    attributes.metadata_startup_script = spec.userData;
  }

  return {
    resourceType: 'google_compute_instance',
    name: toTerraformName(spec.name),
    attributes: sortObjectKeys(attributes),
    nestedBlocks,
    comment: `Compute instance: ${spec.name}`,
  };
}

/**
 * Map compute specification to Azure Virtual Machine.
 */
function mapComputeToAzure(spec: ComputeSpec): TerraformResource {
  const attributes: Record<string, unknown> = {
    name: toTerraformName(spec.name),
    resource_group_name: '${var.resource_group_name}',
    location: '${var.location}',
    size: spec.instanceType,
    admin_username: 'adminuser',
    disable_password_authentication: true,
  };

  if (spec.subnetId) {
    attributes.network_interface_ids = ['${azurerm_network_interface.' + toTerraformName(spec.name) + '.id}'];
  }

  if (spec.tags) {
    attributes.tags = createTags(spec.tags);
  }

  const nestedBlocks: TerraformNestedBlock[] = [];

  // OS disk
  nestedBlocks.push({
    type: 'os_disk',
    attributes: sortObjectKeys({
      caching: 'ReadWrite',
      storage_account_type: spec.diskType ?? 'Standard_LRS',
      disk_size_gb: spec.diskSizeGb ?? 50,
    }),
  });

  // Source image reference
  nestedBlocks.push({
    type: 'source_image_reference',
    attributes: sortObjectKeys({
      publisher: 'Canonical',
      offer: 'UbuntuServer',
      sku: '18.04-LTS',
      version: 'latest',
    }),
  });

  return {
    resourceType: 'azurerm_linux_virtual_machine',
    name: toTerraformName(spec.name),
    attributes: sortObjectKeys(attributes),
    nestedBlocks,
    comment: `Virtual machine: ${spec.name}`,
  };
}

// =============================================================================
// NETWORK MAPPING
// =============================================================================

/**
 * Map network specification to AWS VPC resources.
 */
function mapNetworkToAws(spec: NetworkSpec): TerraformResource[] {
  const resources: TerraformResource[] = [];
  const vpcName = toTerraformName(spec.name);

  // VPC
  resources.push({
    resourceType: 'aws_vpc',
    name: vpcName,
    attributes: sortObjectKeys({
      cidr_block: spec.cidrBlock,
      enable_dns_hostnames: spec.enableDnsHostnames ?? true,
      enable_dns_support: spec.enableDnsSupport ?? true,
      tags: createTags(spec.tags, { Name: spec.name }),
    }),
    comment: `VPC: ${spec.name}`,
  });

  // Internet Gateway
  resources.push({
    resourceType: 'aws_internet_gateway',
    name: `${vpcName}_igw`,
    attributes: sortObjectKeys({
      vpc_id: `\${aws_vpc.${vpcName}.id}`,
      tags: createTags(spec.tags, { Name: `${spec.name}-igw` }),
    }),
    comment: `Internet gateway for ${spec.name}`,
  });

  // Subnets
  if (spec.subnets) {
    const sortedSubnets = [...spec.subnets].sort((a, b) =>
      a.name.localeCompare(b.name, 'en')
    );

    for (const subnet of sortedSubnets) {
      const subnetName = toTerraformName(subnet.name);
      resources.push({
        resourceType: 'aws_subnet',
        name: subnetName,
        attributes: sortObjectKeys({
          vpc_id: `\${aws_vpc.${vpcName}.id}`,
          cidr_block: subnet.cidrBlock,
          availability_zone: subnet.availabilityZone ?? '${var.availability_zone}',
          map_public_ip_on_launch: subnet.public ?? false,
          tags: createTags(subnet.tags, { Name: subnet.name }),
        }),
        comment: `Subnet: ${subnet.name}`,
      });
    }
  }

  // Security Groups
  if (spec.securityGroups) {
    for (const sg of spec.securityGroups) {
      resources.push(...mapSecurityGroupToAws(sg, vpcName));
    }
  }

  return resources;
}

/**
 * Map security group specification to AWS security group.
 */
function mapSecurityGroupToAws(spec: SecurityGroupSpec, vpcName: string): TerraformResource[] {
  const sgName = toTerraformName(spec.name);
  const nestedBlocks: TerraformNestedBlock[] = [];

  // Ingress rules
  if (spec.ingressRules) {
    const sortedIngress = [...spec.ingressRules].sort((a, b) => {
      const keyA = `${a.protocol}-${a.fromPort}-${a.toPort}`;
      const keyB = `${b.protocol}-${b.fromPort}-${b.toPort}`;
      return keyA.localeCompare(keyB, 'en');
    });

    for (const rule of sortedIngress) {
      nestedBlocks.push({
        type: 'ingress',
        attributes: sortObjectKeys({
          description: rule.description ?? 'Managed by Terraform',
          from_port: rule.fromPort,
          to_port: rule.toPort,
          protocol: rule.protocol,
          cidr_blocks: rule.cidrBlocks ? [...rule.cidrBlocks].sort() : [],
          security_groups: rule.securityGroups ? [...rule.securityGroups].sort() : [],
        }),
      });
    }
  }

  // Egress rules
  if (spec.egressRules) {
    const sortedEgress = [...spec.egressRules].sort((a, b) => {
      const keyA = `${a.protocol}-${a.fromPort}-${a.toPort}`;
      const keyB = `${b.protocol}-${b.fromPort}-${b.toPort}`;
      return keyA.localeCompare(keyB, 'en');
    });

    for (const rule of sortedEgress) {
      nestedBlocks.push({
        type: 'egress',
        attributes: sortObjectKeys({
          description: rule.description ?? 'Managed by Terraform',
          from_port: rule.fromPort,
          to_port: rule.toPort,
          protocol: rule.protocol,
          cidr_blocks: rule.cidrBlocks ? [...rule.cidrBlocks].sort() : [],
        }),
      });
    }
  }

  return [createResource(
    'aws_security_group',
    sgName,
    {
      name: spec.name,
      description: spec.description,
      vpc_id: `\${aws_vpc.${vpcName}.id}`,
      tags: createTags(spec.tags, { Name: spec.name }),
    },
    { nestedBlocks, comment: `Security group: ${spec.name}` }
  )];
}

/**
 * Map network specification to GCP network resources.
 */
function mapNetworkToGcp(spec: NetworkSpec): TerraformResource[] {
  const resources: TerraformResource[] = [];
  const networkName = toTerraformName(spec.name);

  // VPC Network
  resources.push(createResource(
    'google_compute_network',
    networkName,
    {
      name: toTerraformName(spec.name),
      auto_create_subnetworks: false,
    },
    { comment: `VPC network: ${spec.name}` }
  ));

  // Subnets
  if (spec.subnets) {
    const sortedSubnets = [...spec.subnets].sort((a, b) =>
      a.name.localeCompare(b.name, 'en')
    );

    for (const subnet of sortedSubnets) {
      const subnetName = toTerraformName(subnet.name);
      resources.push(createResource(
        'google_compute_subnetwork',
        subnetName,
        {
          name: toTerraformName(subnet.name),
          ip_cidr_range: subnet.cidrBlock,
          region: '${var.region}',
          network: `\${google_compute_network.${networkName}.id}`,
          private_ip_google_access: true,
        },
        { comment: `Subnetwork: ${subnet.name}` }
      ));
    }
  }

  // Firewall rules from security groups
  if (spec.securityGroups) {
    for (const sg of spec.securityGroups) {
      resources.push(...mapSecurityGroupToGcp(sg, networkName));
    }
  }

  return resources;
}

/**
 * Map security group to GCP firewall rules.
 */
function mapSecurityGroupToGcp(spec: SecurityGroupSpec, networkName: string): TerraformResource[] {
  const resources: TerraformResource[] = [];
  const baseName = toTerraformName(spec.name);

  if (spec.ingressRules) {
    const sortedIngress = [...spec.ingressRules].sort((a, b) => {
      const keyA = `${a.protocol}-${a.fromPort}-${a.toPort}`;
      const keyB = `${b.protocol}-${b.fromPort}-${b.toPort}`;
      return keyA.localeCompare(keyB, 'en');
    });

    for (let i = 0; i < sortedIngress.length; i++) {
      const rule = sortedIngress[i]!;
      resources.push({
        resourceType: 'google_compute_firewall',
        name: `${baseName}_ingress_${i}`,
        attributes: sortObjectKeys({
          name: `${toTerraformName(spec.name)}-ingress-${i}`,
          network: `\${google_compute_network.${networkName}.name}`,
          direction: 'INGRESS',
          source_ranges: rule.cidrBlocks ? [...rule.cidrBlocks].sort() : ['0.0.0.0/0'],
        }),
        nestedBlocks: [{
          type: 'allow',
          attributes: sortObjectKeys({
            protocol: rule.protocol === '-1' ? 'all' : rule.protocol,
            ports: rule.fromPort === rule.toPort
              ? [`${rule.fromPort}`]
              : [`${rule.fromPort}-${rule.toPort}`],
          }),
        }],
        comment: rule.description ?? `Ingress rule ${i}`,
      });
    }
  }

  return resources;
}

/**
 * Map network specification to Azure virtual network resources.
 */
function mapNetworkToAzure(spec: NetworkSpec): TerraformResource[] {
  const resources: TerraformResource[] = [];
  const vnetName = toTerraformName(spec.name);

  // Virtual Network
  const vnetAttributes: Record<string, unknown> = {
    name: toTerraformName(spec.name),
    resource_group_name: '${var.resource_group_name}',
    location: '${var.location}',
    address_space: [spec.cidrBlock],
  };

  if (spec.tags) {
    vnetAttributes.tags = createTags(spec.tags);
  }

  resources.push({
    resourceType: 'azurerm_virtual_network',
    name: vnetName,
    attributes: sortObjectKeys(vnetAttributes),
    comment: `Virtual network: ${spec.name}`,
  });

  // Subnets
  if (spec.subnets) {
    const sortedSubnets = [...spec.subnets].sort((a, b) =>
      a.name.localeCompare(b.name, 'en')
    );

    for (const subnet of sortedSubnets) {
      const subnetName = toTerraformName(subnet.name);
      resources.push({
        resourceType: 'azurerm_subnet',
        name: subnetName,
        attributes: sortObjectKeys({
          name: toTerraformName(subnet.name),
          resource_group_name: '${var.resource_group_name}',
          virtual_network_name: `\${azurerm_virtual_network.${vnetName}.name}`,
          address_prefixes: [subnet.cidrBlock],
        }),
        comment: `Subnet: ${subnet.name}`,
      });
    }
  }

  // Network Security Groups
  if (spec.securityGroups) {
    for (const sg of spec.securityGroups) {
      resources.push(...mapSecurityGroupToAzure(sg));
    }
  }

  return resources;
}

/**
 * Map security group to Azure NSG.
 */
function mapSecurityGroupToAzure(spec: SecurityGroupSpec): TerraformResource[] {
  const nsgName = toTerraformName(spec.name);
  const nestedBlocks: TerraformNestedBlock[] = [];

  let priority = 100;

  if (spec.ingressRules) {
    const sortedIngress = [...spec.ingressRules].sort((a, b) => {
      const keyA = `${a.protocol}-${a.fromPort}-${a.toPort}`;
      const keyB = `${b.protocol}-${b.fromPort}-${b.toPort}`;
      return keyA.localeCompare(keyB, 'en');
    });

    for (const rule of sortedIngress) {
      nestedBlocks.push({
        type: 'security_rule',
        attributes: sortObjectKeys({
          name: `inbound-${rule.protocol}-${rule.fromPort}`,
          priority: priority,
          direction: 'Inbound',
          access: 'Allow',
          protocol: rule.protocol === '-1' ? '*' : rule.protocol,
          source_port_range: '*',
          destination_port_range: rule.fromPort === rule.toPort
            ? `${rule.fromPort}`
            : `${rule.fromPort}-${rule.toPort}`,
          source_address_prefixes: rule.cidrBlocks ? [...rule.cidrBlocks].sort() : ['*'],
          destination_address_prefix: '*',
        }),
      });
      priority += 10;
    }
  }

  if (spec.egressRules) {
    const sortedEgress = [...spec.egressRules].sort((a, b) => {
      const keyA = `${a.protocol}-${a.fromPort}-${a.toPort}`;
      const keyB = `${b.protocol}-${b.fromPort}-${b.toPort}`;
      return keyA.localeCompare(keyB, 'en');
    });

    for (const rule of sortedEgress) {
      nestedBlocks.push({
        type: 'security_rule',
        attributes: sortObjectKeys({
          name: `outbound-${rule.protocol}-${rule.fromPort}`,
          priority: priority,
          direction: 'Outbound',
          access: 'Allow',
          protocol: rule.protocol === '-1' ? '*' : rule.protocol,
          source_port_range: '*',
          destination_port_range: rule.fromPort === rule.toPort
            ? `${rule.fromPort}`
            : `${rule.fromPort}-${rule.toPort}`,
          source_address_prefix: '*',
          destination_address_prefixes: rule.cidrBlocks ? [...rule.cidrBlocks].sort() : ['*'],
        }),
      });
      priority += 10;
    }
  }

  return [createResource(
    'azurerm_network_security_group',
    nsgName,
    {
      name: spec.name,
      location: '${var.location}',
      resource_group_name: '${var.resource_group_name}',
      tags: createTags(spec.tags),
    },
    { nestedBlocks, comment: `Network security group: ${spec.name}` }
  )];
}

// =============================================================================
// STORAGE MAPPING
// =============================================================================

/**
 * Map storage specification to AWS S3 bucket.
 */
function mapStorageToAws(spec: StorageSpec): TerraformResource[] {
  const resources: TerraformResource[] = [];
  const bucketName = toTerraformName(spec.name);

  // S3 Bucket
  resources.push(createResource(
    'aws_s3_bucket',
    bucketName,
    {
      bucket: spec.bucketName ?? toTerraformName(spec.name),
      tags: createTags(spec.tags, { Name: spec.name }),
    },
    { comment: `S3 bucket: ${spec.name}` }
  ));

  // Versioning configuration
  if (spec.versioning) {
    resources.push({
      resourceType: 'aws_s3_bucket_versioning',
      name: `${bucketName}_versioning`,
      attributes: sortObjectKeys({
        bucket: `\${aws_s3_bucket.${bucketName}.id}`,
      }),
      nestedBlocks: [{
        type: 'versioning_configuration',
        attributes: { status: 'Enabled' },
      }],
    });
  }

  // Encryption configuration
  if (spec.encryption !== false) {
    resources.push({
      resourceType: 'aws_s3_bucket_server_side_encryption_configuration',
      name: `${bucketName}_encryption`,
      attributes: sortObjectKeys({
        bucket: `\${aws_s3_bucket.${bucketName}.id}`,
      }),
      nestedBlocks: [{
        type: 'rule',
        attributes: {},
      }],
    });
  }

  // Public access block
  if (spec.publicAccess === false) {
    resources.push({
      resourceType: 'aws_s3_bucket_public_access_block',
      name: `${bucketName}_public_access`,
      attributes: sortObjectKeys({
        bucket: `\${aws_s3_bucket.${bucketName}.id}`,
        block_public_acls: true,
        block_public_policy: true,
        ignore_public_acls: true,
        restrict_public_buckets: true,
      }),
    });
  }

  return resources;
}

/**
 * Map storage specification to GCP Storage bucket.
 */
function mapStorageToGcp(spec: StorageSpec): TerraformResource[] {
  const bucketName = toTerraformName(spec.name);

  const attributes: Record<string, unknown> = {
    name: spec.bucketName ?? toTerraformName(spec.name),
    location: spec.location ?? '${var.region}',
    storage_class: spec.storageClass ?? 'STANDARD',
    uniform_bucket_level_access: true,
  };

  if (spec.tags) {
    attributes.labels = createTags(spec.tags);
  }

  const nestedBlocks: TerraformNestedBlock[] = [];

  if (spec.versioning) {
    nestedBlocks.push({
      type: 'versioning',
      attributes: { enabled: true },
    });
  }

  if (spec.encryption !== false) {
    nestedBlocks.push({
      type: 'encryption',
      attributes: { default_kms_key_name: '${var.kms_key_name}' },
    });
  }

  if (spec.lifecycleRules) {
    for (const rule of spec.lifecycleRules) {
      nestedBlocks.push({
        type: 'lifecycle_rule',
        attributes: sortObjectKeys({
          action: rule.transition
            ? { type: 'SetStorageClass', storage_class: rule.transition.storageClass }
            : { type: 'Delete' },
          condition: sortObjectKeys({
            age: rule.expiration?.days ?? rule.transition?.days,
            matches_prefix: rule.prefix ? [rule.prefix] : undefined,
          }),
        }),
      });
    }
  }

  return [createResource(
    'google_storage_bucket',
    bucketName,
    attributes,
    { nestedBlocks, comment: `Storage bucket: ${spec.name}` }
  )];
}

/**
 * Map storage specification to Azure Storage Account.
 */
function mapStorageToAzure(spec: StorageSpec): TerraformResource[] {
  const storageName = toTerraformName(spec.name).replace(/_/g, '');

  const attributes: Record<string, unknown> = {
    name: storageName.substring(0, 24), // Azure has 24 char limit
    resource_group_name: '${var.resource_group_name}',
    location: '${var.location}',
    account_tier: 'Standard',
    account_replication_type: spec.storageClass === 'NEARLINE' ? 'LRS' : 'GRS',
    enable_https_traffic_only: true,
    min_tls_version: 'TLS1_2',
  };

  if (spec.tags) {
    attributes.tags = createTags(spec.tags);
  }

  const nestedBlocks: TerraformNestedBlock[] = [];

  if (spec.versioning) {
    nestedBlocks.push({
      type: 'blob_properties',
      attributes: {},
    });
  }

  return [createResource(
    'azurerm_storage_account',
    toTerraformName(spec.name),
    attributes,
    { nestedBlocks, comment: `Storage account: ${spec.name}` }
  )];
}

// =============================================================================
// DATABASE MAPPING
// =============================================================================

/**
 * Map database specification to AWS RDS instance.
 */
function mapDatabaseToAws(spec: DatabaseSpec): TerraformResource[] {
  const resources: TerraformResource[] = [];
  const dbName = toTerraformName(spec.name);

  const attributes: Record<string, unknown> = {
    identifier: toTerraformName(spec.name),
    engine: spec.engine,
    engine_version: spec.engineVersion,
    instance_class: spec.instanceClass,
    allocated_storage: spec.allocatedStorage,
    username: spec.username,
    manage_master_user_password: true,
    skip_final_snapshot: true,
    publicly_accessible: spec.publiclyAccessible ?? false,
    storage_encrypted: spec.storageEncrypted ?? true,
  };

  if (spec.databaseName) {
    attributes.db_name = spec.databaseName;
  }

  if (spec.port) {
    attributes.port = spec.port;
  }

  if (spec.multiAz) {
    attributes.multi_az = spec.multiAz;
  }

  if (spec.maxAllocatedStorage) {
    attributes.max_allocated_storage = spec.maxAllocatedStorage;
  }

  if (spec.storageType) {
    attributes.storage_type = spec.storageType;
  }

  if (spec.subnetGroupName) {
    attributes.db_subnet_group_name = spec.subnetGroupName;
  }

  if (spec.securityGroups && spec.securityGroups.length > 0) {
    attributes.vpc_security_group_ids = [...spec.securityGroups].sort();
  }

  if (spec.backupRetentionPeriod) {
    attributes.backup_retention_period = spec.backupRetentionPeriod;
  }

  if (spec.backupWindow) {
    attributes.backup_window = spec.backupWindow;
  }

  if (spec.maintenanceWindow) {
    attributes.maintenance_window = spec.maintenanceWindow;
  }

  if (spec.tags) {
    attributes.tags = createTags(spec.tags, { Name: spec.name });
  }

  resources.push({
    resourceType: 'aws_db_instance',
    name: dbName,
    attributes: sortObjectKeys(attributes),
    comment: `RDS instance: ${spec.name}`,
  });

  return resources;
}

/**
 * Map database specification to GCP Cloud SQL instance.
 */
function mapDatabaseToGcp(spec: DatabaseSpec): TerraformResource[] {
  const dbName = toTerraformName(spec.name);

  const attributes: Record<string, unknown> = {
    name: toTerraformName(spec.name),
    database_version: `${spec.engine.toUpperCase()}_${spec.engineVersion?.replace(/\./g, '_') ?? '14'}`,
    region: '${var.region}',
    deletion_protection: false,
  };

  const nestedBlocks: TerraformNestedBlock[] = [];

  // Settings block
  const settingsAttributes: Record<string, unknown> = {
    tier: spec.instanceClass,
    disk_size: spec.allocatedStorage,
    disk_type: spec.storageType ?? 'PD_SSD',
    availability_type: spec.multiAz ? 'REGIONAL' : 'ZONAL',
  };

  nestedBlocks.push({
    type: 'settings',
    attributes: sortObjectKeys(settingsAttributes),
  });

  if (spec.tags) {
    attributes.labels = createTags(spec.tags);
  }

  return [{
    resourceType: 'google_sql_database_instance',
    name: dbName,
    attributes: sortObjectKeys(attributes),
    nestedBlocks,
    comment: `Cloud SQL instance: ${spec.name}`,
  }];
}

/**
 * Map database specification to Azure SQL Server.
 */
function mapDatabaseToAzure(spec: DatabaseSpec): TerraformResource[] {
  const resources: TerraformResource[] = [];
  const serverName = toTerraformName(spec.name);

  // SQL Server
  resources.push({
    resourceType: 'azurerm_mssql_server',
    name: serverName,
    attributes: sortObjectKeys({
      name: toTerraformName(spec.name),
      resource_group_name: '${var.resource_group_name}',
      location: '${var.location}',
      version: spec.engineVersion ?? '12.0',
      administrator_login: spec.username,
      administrator_login_password: '${var.db_admin_password}',
      minimum_tls_version: '1.2',
      public_network_access_enabled: spec.publiclyAccessible ?? false,
      tags: createTags(spec.tags),
    }),
    comment: `SQL Server: ${spec.name}`,
  });

  // SQL Database
  if (spec.databaseName) {
    resources.push({
      resourceType: 'azurerm_mssql_database',
      name: `${serverName}_db`,
      attributes: sortObjectKeys({
        name: spec.databaseName,
        server_id: `\${azurerm_mssql_server.${serverName}.id}`,
        max_size_gb: spec.allocatedStorage,
        sku_name: spec.instanceClass,
        tags: createTags(spec.tags),
      }),
      comment: `SQL Database: ${spec.databaseName}`,
    });
  }

  return resources;
}

// =============================================================================
// KUBERNETES MAPPING
// =============================================================================

/**
 * Map Kubernetes specification to AWS EKS cluster.
 */
function mapKubernetesToAws(spec: KubernetesSpec): TerraformResource[] {
  const resources: TerraformResource[] = [];
  const clusterName = toTerraformName(spec.name);

  // EKS Cluster
  resources.push({
    resourceType: 'aws_eks_cluster',
    name: clusterName,
    attributes: sortObjectKeys({
      name: spec.name,
      role_arn: '${aws_iam_role.eks_cluster.arn}',
      version: spec.version,
      enabled_cluster_log_types: ['api', 'audit', 'authenticator'],
      tags: createTags(spec.tags, { Name: spec.name }),
    }),
    nestedBlocks: [{
      type: 'vpc_config',
      attributes: sortObjectKeys({
        subnet_ids: spec.subnetIds ? [...spec.subnetIds].sort() : '${var.subnet_ids}',
        security_group_ids: spec.securityGroups ? [...spec.securityGroups].sort() : [],
        endpoint_private_access: spec.enablePrivateEndpoint ?? true,
        endpoint_public_access: !spec.enablePrivateEndpoint,
      }),
    }],
    comment: `EKS cluster: ${spec.name}`,
  });

  // EKS Node Group
  if (spec.nodeCount || spec.minNodes) {
    resources.push({
      resourceType: 'aws_eks_node_group',
      name: `${clusterName}_nodes`,
      attributes: sortObjectKeys({
        cluster_name: `\${aws_eks_cluster.${clusterName}.name}`,
        node_group_name: `${spec.name}-nodes`,
        node_role_arn: '${aws_iam_role.eks_node.arn}',
        subnet_ids: spec.subnetIds ? [...spec.subnetIds].sort() : '${var.subnet_ids}',
        instance_types: [spec.nodeType ?? 't3.medium'],
        tags: createTags(spec.tags),
      }),
      nestedBlocks: [{
        type: 'scaling_config',
        attributes: sortObjectKeys({
          desired_size: spec.nodeCount ?? 2,
          min_size: spec.minNodes ?? 1,
          max_size: spec.maxNodes ?? 4,
        }),
      }],
      comment: `EKS node group for ${spec.name}`,
    });
  }

  return resources;
}

/**
 * Map Kubernetes specification to GCP GKE cluster.
 */
function mapKubernetesToGcp(spec: KubernetesSpec): TerraformResource[] {
  const clusterName = toTerraformName(spec.name);

  const attributes: Record<string, unknown> = {
    name: toTerraformName(spec.name),
    location: '${var.region}',
    initial_node_count: 1,
    remove_default_node_pool: true,
  };

  if (spec.version) {
    attributes.min_master_version = spec.version;
  }

  if (spec.enablePrivateNodes || spec.enablePrivateEndpoint) {
    attributes.private_cluster_config = sortObjectKeys({
      enable_private_nodes: spec.enablePrivateNodes ?? false,
      enable_private_endpoint: spec.enablePrivateEndpoint ?? false,
      master_ipv4_cidr_block: '172.16.0.0/28',
    });
  }

  if (spec.tags) {
    attributes.resource_labels = createTags(spec.tags);
  }

  const resources: TerraformResource[] = [{
    resourceType: 'google_container_cluster',
    name: clusterName,
    attributes: sortObjectKeys(attributes),
    comment: `GKE cluster: ${spec.name}`,
  }];

  // Node Pool
  if (spec.nodeCount || spec.minNodes) {
    resources.push({
      resourceType: 'google_container_node_pool',
      name: `${clusterName}_nodes`,
      attributes: sortObjectKeys({
        name: `${toTerraformName(spec.name)}-nodes`,
        location: '${var.region}',
        cluster: `\${google_container_cluster.${clusterName}.name}`,
        node_count: spec.nodeCount,
      }),
      nestedBlocks: [
        {
          type: 'node_config',
          attributes: sortObjectKeys({
            machine_type: spec.nodeType ?? 'e2-medium',
            oauth_scopes: [
              'https://www.googleapis.com/auth/cloud-platform',
            ],
          }),
        },
        ...(spec.minNodes !== undefined ? [{
          type: 'autoscaling',
          attributes: sortObjectKeys({
            min_node_count: spec.minNodes,
            max_node_count: spec.maxNodes ?? 10,
          }),
        }] : []),
      ],
      comment: `GKE node pool for ${spec.name}`,
    });
  }

  return resources;
}

/**
 * Map Kubernetes specification to Azure AKS cluster.
 */
function mapKubernetesToAzure(spec: KubernetesSpec): TerraformResource[] {
  const clusterName = toTerraformName(spec.name);

  const attributes: Record<string, unknown> = {
    name: toTerraformName(spec.name),
    location: '${var.location}',
    resource_group_name: '${var.resource_group_name}',
    dns_prefix: toTerraformName(spec.name),
    kubernetes_version: spec.version,
    private_cluster_enabled: spec.enablePrivateEndpoint ?? false,
  };

  if (spec.tags) {
    attributes.tags = createTags(spec.tags);
  }

  const nestedBlocks: TerraformNestedBlock[] = [];

  // Default node pool
  nestedBlocks.push({
    type: 'default_node_pool',
    attributes: sortObjectKeys({
      name: 'default',
      node_count: spec.nodeCount ?? 2,
      vm_size: spec.nodeType ?? 'Standard_DS2_v2',
      enable_auto_scaling: spec.minNodes !== undefined,
      min_count: spec.minNodes,
      max_count: spec.maxNodes,
      vnet_subnet_id: spec.subnetIds?.[0],
    }),
  });

  // Identity
  nestedBlocks.push({
    type: 'identity',
    attributes: { type: 'SystemAssigned' },
  });

  return [{
    resourceType: 'azurerm_kubernetes_cluster',
    name: clusterName,
    attributes: sortObjectKeys(attributes),
    nestedBlocks,
    comment: `AKS cluster: ${spec.name}`,
  }];
}

// =============================================================================
// RESOURCE MAPPER CLASS
// =============================================================================

/**
 * Maps intent resources to Terraform resources for a specific provider.
 *
 * All mappings are deterministic and produce stable output with sorted
 * keys and consistent ordering.
 */
export class ResourceMapper {
  /**
   * Map compute resources to Terraform resources.
   */
  mapCompute(spec: ComputeSpec, provider: CloudProvider): readonly TerraformResource[] {
    switch (provider) {
      case 'aws':
        return [mapComputeToAws(spec)];
      case 'gcp':
        return [mapComputeToGcp(spec)];
      case 'azure':
        return [mapComputeToAzure(spec)];
      default:
        return [mapComputeToAws(spec)]; // Default to AWS for 'multi'
    }
  }

  /**
   * Map network resources to Terraform resources.
   */
  mapNetwork(spec: NetworkSpec, provider: CloudProvider): readonly TerraformResource[] {
    switch (provider) {
      case 'aws':
        return mapNetworkToAws(spec);
      case 'gcp':
        return mapNetworkToGcp(spec);
      case 'azure':
        return mapNetworkToAzure(spec);
      default:
        return mapNetworkToAws(spec);
    }
  }

  /**
   * Map storage resources to Terraform resources.
   */
  mapStorage(spec: StorageSpec, provider: CloudProvider): readonly TerraformResource[] {
    switch (provider) {
      case 'aws':
        return mapStorageToAws(spec);
      case 'gcp':
        return mapStorageToGcp(spec);
      case 'azure':
        return mapStorageToAzure(spec);
      default:
        return mapStorageToAws(spec);
    }
  }

  /**
   * Map database resources to Terraform resources.
   */
  mapDatabase(spec: DatabaseSpec, provider: CloudProvider): readonly TerraformResource[] {
    switch (provider) {
      case 'aws':
        return mapDatabaseToAws(spec);
      case 'gcp':
        return mapDatabaseToGcp(spec);
      case 'azure':
        return mapDatabaseToAzure(spec);
      default:
        return mapDatabaseToAws(spec);
    }
  }

  /**
   * Map Kubernetes resources to Terraform resources.
   */
  mapKubernetes(spec: KubernetesSpec, provider: CloudProvider): readonly TerraformResource[] {
    switch (provider) {
      case 'aws':
        return mapKubernetesToAws(spec);
      case 'gcp':
        return mapKubernetesToGcp(spec);
      case 'azure':
        return mapKubernetesToAzure(spec);
      default:
        return mapKubernetesToAws(spec);
    }
  }

  /**
   * Map a generic intent resource based on its type.
   */
  mapResource(resource: IntentResource, provider: CloudProvider): readonly TerraformResource[] {
    const resourceType = resource.type.toLowerCase();
    const props = resource.properties as Record<string, unknown>;

    if (resourceType.includes('compute') || resourceType.includes('instance')) {
      return this.mapCompute(
        {
          name: resource.name,
          instanceType: (props.instanceType as string) ?? 't3.micro',
          ...props,
        } as ComputeSpec,
        provider
      );
    }

    if (resourceType.includes('network') || resourceType.includes('vpc')) {
      return this.mapNetwork(
        {
          name: resource.name,
          cidrBlock: (props.cidrBlock as string) ?? '10.0.0.0/16',
          ...props,
        } as NetworkSpec,
        provider
      );
    }

    if (resourceType.includes('storage') || resourceType.includes('bucket')) {
      return this.mapStorage(
        {
          name: resource.name,
          ...props,
        } as StorageSpec,
        provider
      );
    }

    if (resourceType.includes('database') || resourceType.includes('rds') || resourceType.includes('sql')) {
      return this.mapDatabase(
        {
          name: resource.name,
          engine: (props.engine as string) ?? 'postgres',
          instanceClass: (props.instanceClass as string) ?? 'db.t3.micro',
          allocatedStorage: (props.allocatedStorage as number) ?? 20,
          username: (props.username as string) ?? 'admin',
          ...props,
        } as DatabaseSpec,
        provider
      );
    }

    if (resourceType.includes('kubernetes') || resourceType.includes('eks') || resourceType.includes('gke') || resourceType.includes('aks')) {
      return this.mapKubernetes(
        {
          name: resource.name,
          ...props,
        } as KubernetesSpec,
        provider
      );
    }

    // Generic resource mapping - passthrough
    return [{
      resourceType: PROVIDER_RESOURCE_TYPES[provider]?.compute ?? 'null_resource',
      name: toTerraformName(resource.name),
      attributes: sortObjectKeys({
        ...props,
        triggers: {
          resource_type: resource.type,
          resource_name: resource.name,
        },
      }),
      comment: `Generic resource: ${resource.name} (${resource.type})`,
    }];
  }
}

export { toTerraformName, sortObjectKeys, createTags };
