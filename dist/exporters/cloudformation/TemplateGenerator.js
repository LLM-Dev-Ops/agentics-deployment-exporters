/**
 * CloudFormation Template Generator
 *
 * Generates complete CloudFormation templates with proper structure including
 * AWSTemplateFormatVersion, Metadata, Parameters, Resources, and Outputs.
 *
 * All generation is deterministic with sorted keys and stable ordering.
 *
 * @module exporters/cloudformation/TemplateGenerator
 * @version 1.0.0
 */
import { createRef, createGetAtt, createSub } from './types.js';
import { ResourceMapper, sortObjectKeys, toCFNLogicalId } from './ResourceMapper.js';
// =============================================================================
// CONSTANTS
// =============================================================================
const EXPORTER_VERSION = '1.0.0';
// =============================================================================
// PARAMETER GENERATORS
// =============================================================================
/**
 * Generate standard parameters for the template.
 */
function generateStandardParameters() {
    return {
        Environment: {
            Type: 'String',
            Description: 'Deployment environment (dev, staging, prod)',
            Default: 'dev',
            AllowedValues: ['dev', 'staging', 'prod'],
        },
        ProjectName: {
            Type: 'String',
            Description: 'Project name for resource tagging',
            MinLength: 1,
            MaxLength: 64,
        },
        VpcId: {
            Type: 'AWS::EC2::VPC::Id',
            Description: 'VPC ID for resource deployment',
        },
        SubnetIds: {
            Type: 'List<AWS::EC2::Subnet::Id>',
            Description: 'List of subnet IDs for resource deployment',
        },
    };
}
/**
 * Generate database-specific parameters.
 */
function generateDatabaseParameters(resourceName) {
    const logicalId = toCFNLogicalId(resourceName);
    return {
        [`${logicalId}Password`]: {
            Type: 'String',
            Description: `Master password for ${resourceName} database`,
            NoEcho: true,
            MinLength: 8,
            MaxLength: 128,
            AllowedPattern: '^[a-zA-Z0-9!@#$%^&*()_+-=]+$',
            ConstraintDescription: 'Must contain only alphanumeric characters and special characters',
        },
    };
}
/**
 * Generate ECS-specific parameters.
 */
function generateECSParameters() {
    return {
        ECSClusterName: {
            Type: 'String',
            Description: 'Name of the ECS cluster',
            Default: 'default-cluster',
        },
    };
}
// =============================================================================
// SUPPORTING RESOURCE GENERATORS
// =============================================================================
/**
 * Generate supporting ECS resources (roles, cluster, security group).
 */
function generateECSSupportingResources() {
    return {
        ECSCluster: {
            Type: 'AWS::ECS::Cluster',
            Properties: sortObjectKeys({
                ClusterName: createRef('ECSClusterName'),
                ClusterSettings: [
                    {
                        Name: 'containerInsights',
                        Value: 'enabled',
                    },
                ],
                Tags: [
                    {
                        Key: 'Environment',
                        Value: createRef('Environment'),
                    },
                    {
                        Key: 'Project',
                        Value: createRef('ProjectName'),
                    },
                ],
            }),
        },
        ECSExecutionRole: {
            Type: 'AWS::IAM::Role',
            Properties: sortObjectKeys({
                AssumeRolePolicyDocument: {
                    Version: '2012-10-17',
                    Statement: [
                        {
                            Effect: 'Allow',
                            Principal: {
                                Service: 'ecs-tasks.amazonaws.com',
                            },
                            Action: 'sts:AssumeRole',
                        },
                    ],
                },
                ManagedPolicyArns: [
                    'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy',
                ],
                Tags: [
                    {
                        Key: 'Environment',
                        Value: createRef('Environment'),
                    },
                ],
            }),
        },
        ECSTaskRole: {
            Type: 'AWS::IAM::Role',
            Properties: sortObjectKeys({
                AssumeRolePolicyDocument: {
                    Version: '2012-10-17',
                    Statement: [
                        {
                            Effect: 'Allow',
                            Principal: {
                                Service: 'ecs-tasks.amazonaws.com',
                            },
                            Action: 'sts:AssumeRole',
                        },
                    ],
                },
                Tags: [
                    {
                        Key: 'Environment',
                        Value: createRef('Environment'),
                    },
                ],
            }),
        },
        ECSSecurityGroup: {
            Type: 'AWS::EC2::SecurityGroup',
            Properties: sortObjectKeys({
                GroupDescription: 'Security group for ECS tasks',
                VpcId: createRef('VpcId'),
                SecurityGroupIngress: [
                    {
                        IpProtocol: 'tcp',
                        FromPort: 80,
                        ToPort: 80,
                        CidrIp: '0.0.0.0/0',
                    },
                    {
                        IpProtocol: 'tcp',
                        FromPort: 443,
                        ToPort: 443,
                        CidrIp: '0.0.0.0/0',
                    },
                ],
                SecurityGroupEgress: [
                    {
                        IpProtocol: '-1',
                        CidrIp: '0.0.0.0/0',
                    },
                ],
                Tags: [
                    {
                        Key: 'Name',
                        Value: createSub('${ProjectName}-ecs-sg'),
                    },
                    {
                        Key: 'Environment',
                        Value: createRef('Environment'),
                    },
                ],
            }),
        },
    };
}
/**
 * Generate supporting database resources (security group).
 */
function generateDBSupportingResources() {
    return {
        DBSecurityGroup: {
            Type: 'AWS::EC2::SecurityGroup',
            Properties: sortObjectKeys({
                GroupDescription: 'Security group for RDS instances',
                VpcId: createRef('VpcId'),
                SecurityGroupIngress: [
                    {
                        IpProtocol: 'tcp',
                        FromPort: 5432,
                        ToPort: 5432,
                        SourceSecurityGroupId: createRef('ECSSecurityGroup'),
                        Description: 'PostgreSQL access from ECS',
                    },
                    {
                        IpProtocol: 'tcp',
                        FromPort: 3306,
                        ToPort: 3306,
                        SourceSecurityGroupId: createRef('ECSSecurityGroup'),
                        Description: 'MySQL access from ECS',
                    },
                ],
                Tags: [
                    {
                        Key: 'Name',
                        Value: createSub('${ProjectName}-db-sg'),
                    },
                    {
                        Key: 'Environment',
                        Value: createRef('Environment'),
                    },
                ],
            }),
        },
    };
}
// =============================================================================
// OUTPUT GENERATORS
// =============================================================================
/**
 * Generate outputs for a resource.
 */
function generateResourceOutputs(logicalId, resource, resourceName) {
    const outputs = {};
    const outputPrefix = logicalId;
    // Generic ID output
    outputs[`${outputPrefix}Id`] = {
        Description: `ID of ${resourceName}`,
        Value: createRef(logicalId),
        Export: {
            Name: createSub(`\${AWS::StackName}-${outputPrefix}Id`),
        },
    };
    // Type-specific outputs
    switch (resource.Type) {
        case 'AWS::ECS::Service':
            outputs[`${outputPrefix}ServiceArn`] = {
                Description: `ARN of ${resourceName} ECS service`,
                Value: createRef(logicalId),
                Export: {
                    Name: createSub(`\${AWS::StackName}-${outputPrefix}ServiceArn`),
                },
            };
            break;
        case 'AWS::ECS::TaskDefinition':
            outputs[`${outputPrefix}TaskDefArn`] = {
                Description: `ARN of ${resourceName} task definition`,
                Value: createRef(logicalId),
            };
            break;
        case 'AWS::RDS::DBInstance':
            outputs[`${outputPrefix}Endpoint`] = {
                Description: `Endpoint of ${resourceName} database`,
                Value: createGetAtt(logicalId, 'Endpoint.Address'),
                Export: {
                    Name: createSub(`\${AWS::StackName}-${outputPrefix}Endpoint`),
                },
            };
            outputs[`${outputPrefix}Port`] = {
                Description: `Port of ${resourceName} database`,
                Value: createGetAtt(logicalId, 'Endpoint.Port'),
            };
            break;
        case 'AWS::S3::Bucket':
            outputs[`${outputPrefix}BucketArn`] = {
                Description: `ARN of ${resourceName} bucket`,
                Value: createGetAtt(logicalId, 'Arn'),
                Export: {
                    Name: createSub(`\${AWS::StackName}-${outputPrefix}BucketArn`),
                },
            };
            outputs[`${outputPrefix}BucketName`] = {
                Description: `Name of ${resourceName} bucket`,
                Value: createRef(logicalId),
            };
            break;
        case 'AWS::EC2::VPC':
            outputs[`${outputPrefix}VpcId`] = {
                Description: `VPC ID of ${resourceName}`,
                Value: createRef(logicalId),
                Export: {
                    Name: createSub(`\${AWS::StackName}-${outputPrefix}VpcId`),
                },
            };
            break;
        case 'AWS::Logs::LogGroup':
            outputs[`${outputPrefix}LogGroupArn`] = {
                Description: `ARN of ${resourceName} log group`,
                Value: createGetAtt(logicalId, 'Arn'),
            };
            break;
    }
    return outputs;
}
// =============================================================================
// TEMPLATE GENERATOR CLASS
// =============================================================================
/**
 * Generates complete CloudFormation templates.
 *
 * All generation is deterministic with sorted keys and consistent ordering.
 */
export class TemplateGenerator {
    resourceMapper;
    constructor() {
        this.resourceMapper = new ResourceMapper();
    }
    /**
     * Generate a complete CloudFormation template from a normalized intent.
     */
    generateTemplate(intent) {
        const description = `CloudFormation template generated from intent ${intent.intentId}`;
        const metadata = this.generateMetadata(intent);
        const { parameters, interfaceMetadata } = this.generateParameters(intent);
        const resources = this.generateResources(intent);
        const outputs = this.generateOutputs(resources, intent);
        // Add interface metadata to main metadata
        if (interfaceMetadata) {
            metadata['AWS::CloudFormation::Interface'] = interfaceMetadata;
        }
        return {
            AWSTemplateFormatVersion: '2010-09-09',
            Description: description,
            Metadata: metadata,
            Parameters: sortObjectKeys(parameters),
            Resources: sortObjectKeys(resources),
            Outputs: sortObjectKeys(outputs),
        };
    }
    /**
     * Generate template metadata with AgenticsExporter tracking.
     */
    generateMetadata(intent) {
        const agenticsMetadata = {
            ExporterVersion: EXPORTER_VERSION,
            IntentId: intent.intentId,
            IntentHash: intent.canonicalHash,
            IntentVersion: intent.version,
            SchemaVersion: intent.schemaVersion,
            ExportedAt: intent.normalization.normalizedAt,
        };
        return {
            AgenticsExporter: agenticsMetadata,
        };
    }
    /**
     * Generate parameters from intent resources.
     */
    generateParameters(intent) {
        const parameters = {};
        const parameterGroups = [];
        const parameterLabels = {};
        // Add standard parameters
        const standardParams = generateStandardParameters();
        Object.assign(parameters, standardParams);
        // Standard parameters group
        parameterGroups.push({
            Label: { default: 'Environment Configuration' },
            Parameters: ['Environment', 'ProjectName'],
        });
        parameterGroups.push({
            Label: { default: 'Network Configuration' },
            Parameters: ['VpcId', 'SubnetIds'],
        });
        // Add parameter labels
        parameterLabels.Environment = { default: 'Environment' };
        parameterLabels.ProjectName = { default: 'Project Name' };
        parameterLabels.VpcId = { default: 'VPC ID' };
        parameterLabels.SubnetIds = { default: 'Subnet IDs' };
        // Check resource types to add specific parameters
        let hasContainers = false;
        let hasDatabases = false;
        const databaseParamNames = [];
        for (const resource of intent.spec.resources) {
            const resourceType = resource.type.toLowerCase();
            if (resourceType.includes('container') || resourceType.includes('ecs')) {
                hasContainers = true;
            }
            if (resourceType.includes('database') || resourceType.includes('rds')) {
                hasDatabases = true;
                const dbParams = generateDatabaseParameters(resource.name);
                Object.assign(parameters, dbParams);
                for (const paramName of Object.keys(dbParams)) {
                    databaseParamNames.push(paramName);
                    parameterLabels[paramName] = { default: `${resource.name} Database Password` };
                }
            }
        }
        if (hasContainers) {
            const ecsParams = generateECSParameters();
            Object.assign(parameters, ecsParams);
            parameterGroups.push({
                Label: { default: 'ECS Configuration' },
                Parameters: ['ECSClusterName'],
            });
            parameterLabels.ECSClusterName = { default: 'ECS Cluster Name' };
        }
        if (hasDatabases && databaseParamNames.length > 0) {
            parameterGroups.push({
                Label: { default: 'Database Configuration' },
                Parameters: databaseParamNames,
            });
        }
        const interfaceMetadata = {
            ParameterGroups: parameterGroups,
            ParameterLabels: parameterLabels,
        };
        return { parameters, interfaceMetadata };
    }
    /**
     * Generate resources from intent.
     */
    generateResources(intent) {
        const resources = {};
        // Check what supporting resources are needed
        let needsECSSupport = false;
        let needsDBSupport = false;
        for (const resource of intent.spec.resources) {
            const resourceType = resource.type.toLowerCase();
            if (resourceType.includes('container') || resourceType.includes('ecs')) {
                needsECSSupport = true;
            }
            if (resourceType.includes('database') || resourceType.includes('rds')) {
                needsDBSupport = true;
            }
        }
        // Add supporting resources first
        if (needsECSSupport) {
            Object.assign(resources, generateECSSupportingResources());
        }
        if (needsDBSupport) {
            Object.assign(resources, generateDBSupportingResources());
        }
        // Sort resources by name for deterministic output
        const sortedResources = [...intent.spec.resources].sort((a, b) => a.name.localeCompare(b.name, 'en'));
        // Map each intent resource to CloudFormation resources
        for (const resource of sortedResources) {
            const mappedResources = this.resourceMapper.mapResource(resource);
            Object.assign(resources, mappedResources);
        }
        return resources;
    }
    /**
     * Generate outputs from resources.
     */
    generateOutputs(resources, intent) {
        const outputs = {};
        // Sort resource names for deterministic output
        const sortedResourceNames = Object.keys(resources).sort((a, b) => a.localeCompare(b, 'en'));
        for (const logicalId of sortedResourceNames) {
            const resource = resources[logicalId];
            // Find the corresponding intent resource name
            let resourceName = logicalId;
            for (const intentResource of intent.spec.resources) {
                if (toCFNLogicalId(intentResource.name) === logicalId.replace(/LogGroup|TaskDefinition|Service|SubnetGroup$/, '')) {
                    resourceName = intentResource.name;
                    break;
                }
            }
            const resourceOutputs = generateResourceOutputs(logicalId, resource, resourceName);
            Object.assign(outputs, resourceOutputs);
        }
        // Add stack-level outputs
        outputs.StackName = {
            Description: 'Name of this CloudFormation stack',
            Value: createRef('AWS::StackName'),
        };
        outputs.StackRegion = {
            Description: 'Region where this stack is deployed',
            Value: createRef('AWS::Region'),
        };
        return outputs;
    }
    /**
     * Generate a parameter file template.
     */
    generateParameterFile(parameters) {
        const entries = [];
        // Sort parameter names for deterministic output
        const sortedParamNames = Object.keys(parameters).sort((a, b) => a.localeCompare(b, 'en'));
        for (const paramName of sortedParamNames) {
            const param = parameters[paramName];
            // Determine default value or placeholder
            let value = '';
            if (param.Default !== undefined) {
                value = String(param.Default);
            }
            else if (param.Type === 'AWS::EC2::VPC::Id') {
                value = 'vpc-xxxxxxxxxxxxxxxxx';
            }
            else if (param.Type === 'List<AWS::EC2::Subnet::Id>') {
                value = 'subnet-xxxxxxxxxxxxxxxxx,subnet-yyyyyyyyyyyyyyyyy';
            }
            else if (param.NoEcho) {
                value = '********';
            }
            else {
                value = `<${paramName}>`;
            }
            entries.push({
                ParameterKey: paramName,
                ParameterValue: value,
            });
        }
        return entries;
    }
    /**
     * Validate generated template structure.
     */
    validateTemplate(template) {
        const errors = [];
        // Check required fields
        if (template.AWSTemplateFormatVersion !== '2010-09-09') {
            errors.push('Invalid AWSTemplateFormatVersion');
        }
        if (!template.Resources || Object.keys(template.Resources).length === 0) {
            errors.push('Template must contain at least one resource');
        }
        // Validate resource references
        const resourceNames = new Set(Object.keys(template.Resources));
        for (const [resourceName, resource] of Object.entries(template.Resources)) {
            // Check DependsOn references
            if (resource.DependsOn) {
                const deps = Array.isArray(resource.DependsOn) ? resource.DependsOn : [resource.DependsOn];
                for (const dep of deps) {
                    if (!resourceNames.has(dep)) {
                        errors.push(`Resource '${resourceName}' depends on undefined resource '${dep}'`);
                    }
                }
            }
        }
        // Validate output references
        if (template.Outputs) {
            for (const [outputName, output] of Object.entries(template.Outputs)) {
                // Check for Ref to resources
                const value = output.Value;
                if (value && typeof value === 'object') {
                    if ('Ref' in value && typeof value.Ref === 'string') {
                        const ref = value.Ref;
                        // Pseudo parameters are always valid
                        if (!ref.startsWith('AWS::') && !resourceNames.has(ref) && !template.Parameters?.[ref]) {
                            errors.push(`Output '${outputName}' references undefined resource or parameter '${ref}'`);
                        }
                    }
                    if ('Fn::GetAtt' in value && Array.isArray(value['Fn::GetAtt'])) {
                        const [resourceRef] = value['Fn::GetAtt'];
                        if (!resourceNames.has(resourceRef)) {
                            errors.push(`Output '${outputName}' references undefined resource '${resourceRef}'`);
                        }
                    }
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
//# sourceMappingURL=TemplateGenerator.js.map