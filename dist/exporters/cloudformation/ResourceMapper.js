/**
 * CloudFormation Resource Mapper
 *
 * Maps intent resources to CloudFormation resource definitions.
 * Supports containers (ECS), databases (RDS), storage (S3), and more.
 *
 * All mappings are deterministic and produce stable output.
 *
 * @module exporters/cloudformation/ResourceMapper
 * @version 1.0.0
 */
import { COMPONENT_TYPE_MAPPINGS, createRef, createGetAtt, createSub, createJoin, } from './types.js';
// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
/**
 * Convert a component ID to a valid CloudFormation logical ID.
 * CloudFormation logical IDs must be alphanumeric and unique within the template.
 */
export function toCFNLogicalId(name) {
    // Convert to PascalCase and remove invalid characters
    return name
        .split(/[-_.\s]+/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join('')
        .replace(/[^a-zA-Z0-9]/g, '');
}
/**
 * Sort object keys alphabetically for deterministic output.
 */
export function sortObjectKeys(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b, 'en'));
    for (const key of keys) {
        const value = obj[key];
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            sorted[key] = sortObjectKeys(value);
        }
        else {
            sorted[key] = value;
        }
    }
    return sorted;
}
/**
 * Create tags array from a tags object.
 */
function createTagsArray(tags, additionalTags = {}) {
    const merged = { ...tags, ...additionalTags };
    const sortedKeys = Object.keys(merged).sort((a, b) => a.localeCompare(b, 'en'));
    return sortedKeys.map(key => ({
        Key: key,
        Value: merged[key],
    }));
}
// =============================================================================
// CONTAINER MAPPING (ECS)
// =============================================================================
/**
 * Map container specification to ECS TaskDefinition and Service.
 */
function mapContainerToECS(spec, logicalIdPrefix) {
    const resources = {};
    // Log Group
    const logGroupId = `${logicalIdPrefix}LogGroup`;
    resources[logGroupId] = {
        Type: 'AWS::Logs::LogGroup',
        Properties: sortObjectKeys({
            LogGroupName: createSub(`/ecs/${spec.name}`),
            RetentionInDays: 30,
        }),
        DeletionPolicy: 'Retain',
    };
    // Task Definition
    const taskDefId = `${logicalIdPrefix}TaskDefinition`;
    const containerDefinition = {
        Name: spec.name,
        Image: spec.image,
        Essential: spec.essential ?? true,
        LogConfiguration: {
            LogDriver: 'awslogs',
            Options: sortObjectKeys({
                'awslogs-group': createRef(logGroupId),
                'awslogs-region': createRef('AWS::Region'),
                'awslogs-stream-prefix': 'ecs',
            }),
        },
    };
    if (spec.cpu) {
        containerDefinition.Cpu = spec.cpu;
    }
    if (spec.memory) {
        containerDefinition.Memory = spec.memory;
    }
    if (spec.port) {
        containerDefinition.PortMappings = [
            {
                ContainerPort: spec.port,
                Protocol: 'tcp',
            },
        ];
    }
    if (spec.environment && Object.keys(spec.environment).length > 0) {
        const envVars = Object.entries(spec.environment)
            .sort(([a], [b]) => a.localeCompare(b, 'en'))
            .map(([name, value]) => ({ Name: name, Value: value }));
        containerDefinition.Environment = envVars;
    }
    if (spec.healthCheck) {
        containerDefinition.HealthCheck = sortObjectKeys({
            Command: ['CMD-SHELL', ...spec.healthCheck.command],
            Interval: spec.healthCheck.interval ?? 30,
            Timeout: spec.healthCheck.timeout ?? 5,
            Retries: spec.healthCheck.retries ?? 3,
            StartPeriod: spec.healthCheck.startPeriod ?? 0,
        });
    }
    resources[taskDefId] = {
        Type: 'AWS::ECS::TaskDefinition',
        DependsOn: logGroupId,
        Properties: sortObjectKeys({
            Family: spec.name,
            NetworkMode: 'awsvpc',
            RequiresCompatibilities: ['FARGATE'],
            Cpu: String(spec.cpu ?? 256),
            Memory: String(spec.memory ?? 512),
            ExecutionRoleArn: createRef('ECSExecutionRole'),
            TaskRoleArn: createRef('ECSTaskRole'),
            ContainerDefinitions: [sortObjectKeys(containerDefinition)],
        }),
    };
    // ECS Service
    const serviceId = `${logicalIdPrefix}Service`;
    resources[serviceId] = {
        Type: 'AWS::ECS::Service',
        DependsOn: taskDefId,
        Properties: sortObjectKeys({
            ServiceName: spec.name,
            Cluster: createRef('ECSCluster'),
            TaskDefinition: createRef(taskDefId),
            DesiredCount: 1,
            LaunchType: 'FARGATE',
            NetworkConfiguration: {
                AwsvpcConfiguration: {
                    AssignPublicIp: 'ENABLED',
                    SecurityGroups: [createRef('ECSSecurityGroup')],
                    Subnets: createRef('SubnetIds'),
                },
            },
        }),
    };
    return resources;
}
// =============================================================================
// DATABASE MAPPING (RDS)
// =============================================================================
/**
 * Map database specification to RDS resources.
 */
function mapDatabaseToRDS(spec, logicalIdPrefix) {
    const resources = {};
    // DB Subnet Group
    const subnetGroupId = `${logicalIdPrefix}SubnetGroup`;
    resources[subnetGroupId] = {
        Type: 'AWS::RDS::DBSubnetGroup',
        Properties: sortObjectKeys({
            DBSubnetGroupDescription: `Subnet group for ${spec.name}`,
            SubnetIds: createRef('SubnetIds'),
            Tags: createTagsArray(spec.tags, { Name: `${spec.name}-subnet-group` }),
        }),
    };
    // DB Instance
    const dbInstanceId = logicalIdPrefix;
    const dbProperties = {
        DBInstanceIdentifier: spec.name,
        Engine: spec.engine,
        DBInstanceClass: spec.instanceClass,
        AllocatedStorage: String(spec.allocatedStorage),
        MasterUsername: spec.masterUsername,
        MasterUserPassword: createRef(`${logicalIdPrefix}Password`),
        DBSubnetGroupName: createRef(subnetGroupId),
        VPCSecurityGroups: [createRef('DBSecurityGroup')],
        PubliclyAccessible: spec.publiclyAccessible ?? false,
        StorageEncrypted: spec.storageEncrypted ?? true,
        MultiAZ: spec.multiAZ ?? false,
    };
    if (spec.engineVersion) {
        dbProperties.EngineVersion = spec.engineVersion;
    }
    if (spec.databaseName) {
        dbProperties.DBName = spec.databaseName;
    }
    if (spec.port) {
        dbProperties.Port = String(spec.port);
    }
    if (spec.maxAllocatedStorage) {
        dbProperties.MaxAllocatedStorage = spec.maxAllocatedStorage;
    }
    if (spec.storageType) {
        dbProperties.StorageType = spec.storageType;
    }
    if (spec.backupRetentionPeriod !== undefined) {
        dbProperties.BackupRetentionPeriod = spec.backupRetentionPeriod;
    }
    if (spec.preferredBackupWindow) {
        dbProperties.PreferredBackupWindow = spec.preferredBackupWindow;
    }
    if (spec.preferredMaintenanceWindow) {
        dbProperties.PreferredMaintenanceWindow = spec.preferredMaintenanceWindow;
    }
    if (spec.deletionProtection !== undefined) {
        dbProperties.DeletionProtection = spec.deletionProtection;
    }
    if (spec.tags) {
        dbProperties.Tags = createTagsArray(spec.tags, { Name: spec.name });
    }
    resources[dbInstanceId] = {
        Type: 'AWS::RDS::DBInstance',
        DependsOn: subnetGroupId,
        Properties: sortObjectKeys(dbProperties),
        DeletionPolicy: 'Snapshot',
    };
    return resources;
}
// =============================================================================
// NETWORK MAPPING (VPC)
// =============================================================================
/**
 * Map network specification to VPC resources.
 */
function mapNetworkToVPC(spec, logicalIdPrefix) {
    const resources = {};
    // VPC
    const vpcId = `${logicalIdPrefix}VPC`;
    resources[vpcId] = {
        Type: 'AWS::EC2::VPC',
        Properties: sortObjectKeys({
            CidrBlock: spec.cidrBlock,
            EnableDnsHostnames: spec.enableDnsHostnames ?? true,
            EnableDnsSupport: spec.enableDnsSupport ?? true,
            Tags: createTagsArray(spec.tags, { Name: spec.name }),
        }),
    };
    // Internet Gateway
    const igwId = `${logicalIdPrefix}InternetGateway`;
    resources[igwId] = {
        Type: 'AWS::EC2::InternetGateway',
        Properties: sortObjectKeys({
            Tags: createTagsArray(spec.tags, { Name: `${spec.name}-igw` }),
        }),
    };
    // VPC Gateway Attachment
    const attachId = `${logicalIdPrefix}GatewayAttachment`;
    resources[attachId] = {
        Type: 'AWS::EC2::VPCGatewayAttachment',
        Properties: sortObjectKeys({
            InternetGatewayId: createRef(igwId),
            VpcId: createRef(vpcId),
        }),
    };
    // Subnets
    if (spec.subnets) {
        const sortedSubnets = [...spec.subnets].sort((a, b) => a.name.localeCompare(b.name, 'en'));
        for (const subnet of sortedSubnets) {
            const subnetId = toCFNLogicalId(subnet.name);
            const subnetProps = {
                CidrBlock: subnet.cidrBlock,
                VpcId: createRef(vpcId),
                MapPublicIpOnLaunch: subnet.public ?? false,
                Tags: createTagsArray(subnet.tags, { Name: subnet.name }),
            };
            if (subnet.availabilityZone) {
                subnetProps.AvailabilityZone = subnet.availabilityZone;
            }
            resources[subnetId] = {
                Type: 'AWS::EC2::Subnet',
                DependsOn: vpcId,
                Properties: sortObjectKeys(subnetProps),
            };
        }
    }
    return resources;
}
// =============================================================================
// STORAGE MAPPING (S3)
// =============================================================================
/**
 * Map storage specification to S3 resources.
 */
function mapStorageToS3(spec, logicalIdPrefix) {
    const resources = {};
    const bucketId = logicalIdPrefix;
    const bucketProperties = {};
    if (spec.bucketName) {
        bucketProperties.BucketName = spec.bucketName;
    }
    if (spec.versioning) {
        bucketProperties.VersioningConfiguration = {
            Status: 'Enabled',
        };
    }
    if (spec.encryption !== false) {
        bucketProperties.BucketEncryption = {
            ServerSideEncryptionConfiguration: [
                {
                    ServerSideEncryptionByDefault: {
                        SSEAlgorithm: 'AES256',
                    },
                },
            ],
        };
    }
    if (spec.publicAccessBlock !== false) {
        bucketProperties.PublicAccessBlockConfiguration = {
            BlockPublicAcls: true,
            BlockPublicPolicy: true,
            IgnorePublicAcls: true,
            RestrictPublicBuckets: true,
        };
    }
    if (spec.lifecycleRules && spec.lifecycleRules.length > 0) {
        bucketProperties.LifecycleConfiguration = {
            Rules: spec.lifecycleRules.map(rule => {
                const cfnRule = {
                    Id: rule.id,
                    Status: rule.status,
                };
                if (rule.prefix) {
                    cfnRule.Prefix = rule.prefix;
                }
                if (rule.expirationDays) {
                    cfnRule.ExpirationInDays = rule.expirationDays;
                }
                if (rule.transitionDays && rule.transitionStorageClass) {
                    cfnRule.Transitions = [
                        {
                            StorageClass: rule.transitionStorageClass,
                            TransitionInDays: rule.transitionDays,
                        },
                    ];
                }
                return cfnRule;
            }),
        };
    }
    if (spec.corsRules && spec.corsRules.length > 0) {
        bucketProperties.CorsConfiguration = {
            CorsRules: spec.corsRules.map(rule => {
                const cfnRule = {
                    AllowedOrigins: [...rule.allowedOrigins],
                    AllowedMethods: [...rule.allowedMethods],
                };
                if (rule.allowedHeaders) {
                    cfnRule.AllowedHeaders = [...rule.allowedHeaders];
                }
                if (rule.exposedHeaders) {
                    cfnRule.ExposedHeaders = [...rule.exposedHeaders];
                }
                if (rule.maxAge !== undefined) {
                    cfnRule.MaxAge = rule.maxAge;
                }
                return cfnRule;
            }),
        };
    }
    if (spec.tags) {
        bucketProperties.Tags = createTagsArray(spec.tags, { Name: spec.name });
    }
    resources[bucketId] = {
        Type: 'AWS::S3::Bucket',
        Properties: sortObjectKeys(bucketProperties),
        DeletionPolicy: 'Retain',
    };
    return resources;
}
// =============================================================================
// RESOURCE MAPPER CLASS
// =============================================================================
/**
 * Maps intent resources to CloudFormation resources.
 *
 * All mappings are deterministic and produce stable output with sorted
 * keys and consistent ordering.
 */
export class ResourceMapper {
    /**
     * Map a component type to CloudFormation resource type.
     */
    mapComponentToCFN(componentType) {
        const normalizedType = componentType.toLowerCase().replace(/[-_\s]/g, '');
        const mapping = COMPONENT_TYPE_MAPPINGS[normalizedType];
        return mapping?.resourceType ?? 'AWS::CloudFormation::CustomResource';
    }
    /**
     * Get additional resources for a component type.
     */
    getAdditionalResources(componentType) {
        const normalizedType = componentType.toLowerCase().replace(/[-_\s]/g, '');
        const mapping = COMPONENT_TYPE_MAPPINGS[normalizedType];
        return mapping?.additionalResources ?? [];
    }
    /**
     * Map a container resource to CloudFormation resources.
     */
    mapContainer(spec) {
        const logicalIdPrefix = toCFNLogicalId(spec.name);
        return mapContainerToECS(spec, logicalIdPrefix);
    }
    /**
     * Map a database resource to CloudFormation resources.
     */
    mapDatabase(spec) {
        const logicalIdPrefix = toCFNLogicalId(spec.name);
        return mapDatabaseToRDS(spec, logicalIdPrefix);
    }
    /**
     * Map a network resource to CloudFormation resources.
     */
    mapNetwork(spec) {
        const logicalIdPrefix = toCFNLogicalId(spec.name);
        return mapNetworkToVPC(spec, logicalIdPrefix);
    }
    /**
     * Map a storage resource to CloudFormation resources.
     */
    mapStorage(spec) {
        const logicalIdPrefix = toCFNLogicalId(spec.name);
        return mapStorageToS3(spec, logicalIdPrefix);
    }
    /**
     * Map a generic intent resource based on its type.
     */
    mapResource(resource) {
        const resourceType = resource.type.toLowerCase();
        const props = resource.properties;
        const logicalIdPrefix = toCFNLogicalId(resource.name);
        // Container resources
        if (resourceType.includes('container') || resourceType.includes('ecs') || resourceType.includes('fargate')) {
            return this.mapContainer({
                name: resource.name,
                image: props.image ?? 'nginx:latest',
                cpu: props.cpu,
                memory: props.memory,
                port: props.port,
                environment: props.environment,
                ...props,
            });
        }
        // Database resources
        if (resourceType.includes('database') || resourceType.includes('rds') || resourceType.includes('sql')) {
            return this.mapDatabase({
                name: resource.name,
                engine: props.engine ?? 'postgres',
                instanceClass: props.instanceClass ?? 'db.t3.micro',
                allocatedStorage: props.allocatedStorage ?? 20,
                masterUsername: props.masterUsername ?? 'admin',
                ...props,
            });
        }
        // Network resources
        if (resourceType.includes('network') || resourceType.includes('vpc')) {
            return this.mapNetwork({
                name: resource.name,
                cidrBlock: props.cidrBlock ?? '10.0.0.0/16',
                ...props,
            });
        }
        // Storage resources
        if (resourceType.includes('storage') || resourceType.includes('bucket') || resourceType.includes('s3')) {
            return this.mapStorage({
                name: resource.name,
                ...props,
            });
        }
        // Generic/unknown resource - create a custom resource
        return {
            [logicalIdPrefix]: {
                Type: this.mapComponentToCFN(resource.type),
                Properties: sortObjectKeys({
                    ServiceToken: createSub('arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:CustomResourceHandler'),
                    ResourceType: resource.type,
                    ResourceName: resource.name,
                    ...props,
                }),
                Metadata: {
                    'aws:cdk:path': `Stack/${resource.name}`,
                    AgenticsIntent: {
                        Type: resource.type,
                        Name: resource.name,
                    },
                },
            },
        };
    }
    /**
     * Check if a component type is AWS-targetable.
     */
    isAWSTargetable(componentType) {
        const normalizedType = componentType.toLowerCase().replace(/[-_\s]/g, '');
        // Check if it's a known AWS component type
        if (COMPONENT_TYPE_MAPPINGS[normalizedType]) {
            return true;
        }
        // Check for AWS-related keywords
        const awsKeywords = [
            'aws', 'ec2', 'ecs', 'eks', 'rds', 's3', 'lambda', 'dynamodb',
            'sqs', 'sns', 'vpc', 'subnet', 'elasticache', 'alb', 'nlb',
            'apigateway', 'cloudfront', 'route53', 'iam', 'kms', 'secretsmanager',
        ];
        return awsKeywords.some(keyword => normalizedType.includes(keyword));
    }
}
export { createRef, createGetAtt, createSub, createJoin };
//# sourceMappingURL=ResourceMapper.js.map