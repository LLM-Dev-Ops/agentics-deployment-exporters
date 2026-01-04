/**
 * ERP Integration Stub Generator
 *
 * Generates format-specific placeholder stubs for ERP integration slots.
 * Each stub is deterministic, auditable, and clearly marked as an
 * integration resolution point.
 *
 * Supports multiple output formats:
 * - Terraform (null_resource, local-exec)
 * - Kubernetes (ConfigMap, Secret)
 * - CloudFormation (Custom Resource)
 * - Helm (values placeholders)
 * - Generic (JSON, YAML, ENV)
 *
 * @module core/erp/stub-generator
 * @version 1.0.0
 */
import { createHash } from 'crypto';
/**
 * Generate a Terraform null_resource stub for an ERP integration slot.
 */
function generateTerraformNullResource(slot, options) {
    const ref = slot.reference;
    const safeName = ref.resourceName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return {
        resource: {
            null_resource: {
                [`erp_integration_${safeName}`]: {
                    triggers: {
                        erp_vendor: ref.vendor,
                        erp_integration_type: ref.integrationType,
                        erp_slot_id: slot.slotId,
                        erp_reference_id: ref.referenceId,
                        resource_name: ref.resourceName,
                        source_type: ref.sourceType,
                        confidence: String(ref.confidence),
                        status: 'UNRESOLVED',
                    },
                    lifecycle: {
                        create_before_destroy: false,
                    },
                },
            },
        },
        locals: {
            [`erp_${safeName}_config`]: {
                vendor: ref.vendor,
                integration_type: ref.integrationType,
                slot_id: slot.slotId,
                status: slot.status,
                required_adapter: slot.requiredAdapter,
                resolution_instructions: slot.resolutionInstructions,
                ...(options.includeOriginalProperties && { original_properties: ref.originalProperties }),
            },
        },
        output: {
            [`erp_${safeName}_slot_id`]: {
                value: slot.slotId,
                description: `ERP Integration Slot ID for ${ref.resourceName} (${ref.vendor})`,
            },
            [`erp_${safeName}_status`]: {
                value: 'UNRESOLVED',
                description: `ERP Integration Status - Requires ${slot.requiredAdapter}`,
            },
        },
    };
}
/**
 * Generate a Kubernetes ConfigMap stub for an ERP integration slot.
 */
function generateKubernetesConfigMap(slot, options) {
    const ref = slot.reference;
    const safeName = ref.resourceName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const configData = {
        'erp-vendor': ref.vendor,
        'erp-integration-type': ref.integrationType,
        'erp-slot-id': slot.slotId,
        'erp-status': 'UNRESOLVED',
        'required-adapter': slot.requiredAdapter,
    };
    if (ref.endpoint) {
        configData['erp-endpoint-placeholder'] = ref.endpoint;
    }
    if (ref.entityType) {
        configData['erp-entity-type'] = ref.entityType;
    }
    if (ref.operation) {
        configData['erp-operation'] = ref.operation;
    }
    const configMapData = {
        'integration-config.json': JSON.stringify({
            vendor: ref.vendor,
            integrationType: ref.integrationType,
            slotId: slot.slotId,
            status: slot.status,
            requiredAdapter: slot.requiredAdapter,
            referenceId: ref.referenceId,
            ...(options.includeOriginalProperties && { originalProperties: ref.originalProperties }),
        }, null, 2),
        'resolution-instructions.txt': slot.resolutionInstructions.join('\n'),
    };
    return {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
            name: `erp-integration-${safeName}`,
            namespace: '${NAMESPACE}',
            labels: {
                'app.kubernetes.io/managed-by': 'agentics-exporter',
                'agentics.io/erp-integration': 'true',
                'agentics.io/erp-vendor': ref.vendor,
                'agentics.io/erp-status': 'unresolved',
            },
            annotations: {
                'agentics.io/slot-id': slot.slotId,
                'agentics.io/reference-id': ref.referenceId,
                'agentics.io/required-adapter': slot.requiredAdapter,
                'agentics.io/source-type': ref.sourceType,
                'agentics.io/confidence': String(ref.confidence),
            },
        },
        data: configMapData,
    };
}
/**
 * Generate a Kubernetes Secret placeholder for an ERP integration slot.
 */
function generateKubernetesSecret(slot, _options) {
    const ref = slot.reference;
    const safeName = ref.resourceName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
            name: `erp-credentials-${safeName}`,
            namespace: '${NAMESPACE}',
            labels: {
                'app.kubernetes.io/managed-by': 'agentics-exporter',
                'agentics.io/erp-integration': 'true',
                'agentics.io/erp-vendor': ref.vendor,
                'agentics.io/erp-status': 'unresolved',
            },
            annotations: {
                'agentics.io/slot-id': slot.slotId,
                'agentics.io/required-adapter': slot.requiredAdapter,
                'agentics.io/warning': 'PLACEHOLDER - Configure actual credentials before deployment',
            },
        },
        type: 'Opaque',
        stringData: {
            ERP_VENDOR: ref.vendor,
            ERP_SLOT_ID: slot.slotId,
            ERP_STATUS: 'UNRESOLVED',
            ERP_ENDPOINT: 'PLACEHOLDER_CONFIGURE_BEFORE_DEPLOYMENT',
            ERP_USERNAME: 'PLACEHOLDER_CONFIGURE_BEFORE_DEPLOYMENT',
            ERP_PASSWORD: 'PLACEHOLDER_CONFIGURE_BEFORE_DEPLOYMENT',
        },
    };
}
/**
 * Generate a CloudFormation custom resource placeholder for an ERP integration slot.
 */
function generateCloudFormationCustomResource(slot, options) {
    const ref = slot.reference;
    const safeName = ref.resourceName.replace(/[^a-zA-Z0-9]/g, '');
    return {
        AWSTemplateFormatVersion: '2010-09-09',
        Description: `ERP Integration Placeholder for ${ref.resourceName} (${ref.vendor})`,
        Metadata: {
            'Agentics::ERPIntegration': {
                SlotId: slot.slotId,
                Vendor: ref.vendor,
                IntegrationType: ref.integrationType,
                Status: 'UNRESOLVED',
                RequiredAdapter: slot.requiredAdapter,
                ReferenceId: ref.referenceId,
                SourceType: ref.sourceType,
                Confidence: ref.confidence,
                ...(options.includeOriginalProperties && { OriginalProperties: ref.originalProperties }),
            },
        },
        Parameters: {
            ERPEndpoint: {
                Type: 'String',
                Default: 'PLACEHOLDER_CONFIGURE_BEFORE_DEPLOYMENT',
                Description: `Endpoint for ${ref.vendor} integration`,
            },
            ERPCredentialsSecretArn: {
                Type: 'String',
                Default: '',
                Description: `ARN of Secrets Manager secret containing ${ref.vendor} credentials`,
            },
        },
        Resources: {
            [`ERPIntegration${safeName}`]: {
                Type: 'AWS::CloudFormation::WaitConditionHandle',
                Metadata: {
                    'Agentics::ERPSlot': {
                        SlotId: slot.slotId,
                        Vendor: ref.vendor,
                        Status: 'UNRESOLVED',
                        Warning: 'This is a placeholder resource. Configure the actual ERP adapter before deployment.',
                    },
                },
            },
            [`ERPIntegration${safeName}Config`]: {
                Type: 'AWS::SSM::Parameter',
                Properties: {
                    Type: 'String',
                    Name: { 'Fn::Sub': `/agentics/erp-integrations/${slot.slotId}/config` },
                    Value: JSON.stringify({
                        vendor: ref.vendor,
                        integrationType: ref.integrationType,
                        slotId: slot.slotId,
                        status: 'UNRESOLVED',
                        requiredAdapter: slot.requiredAdapter,
                    }),
                    Description: `ERP Integration configuration for ${ref.resourceName}`,
                    Tags: [
                        { Key: 'agentics:erp-integration', Value: 'true' },
                        { Key: 'agentics:erp-vendor', Value: ref.vendor },
                        { Key: 'agentics:erp-status', Value: 'unresolved' },
                    ],
                },
            },
        },
        Outputs: {
            [`ERPSlotId${safeName}`]: {
                Value: slot.slotId,
                Description: `ERP Integration Slot ID for ${ref.resourceName}`,
                Export: { Name: { 'Fn::Sub': '${AWS::StackName}-erp-slot-id' } },
            },
            [`ERPStatus${safeName}`]: {
                Value: 'UNRESOLVED',
                Description: 'ERP Integration Status - Requires adapter configuration',
            },
        },
    };
}
/**
 * Generate Helm values placeholder for an ERP integration slot.
 */
function generateHelmValues(slot, options) {
    const ref = slot.reference;
    const safeName = ref.resourceName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return {
        erpIntegrations: {
            [safeName]: {
                enabled: false,
                vendor: ref.vendor,
                integrationType: ref.integrationType,
                slotId: slot.slotId,
                status: 'unresolved',
                requiredAdapter: slot.requiredAdapter,
                referenceId: ref.referenceId,
                sourceType: ref.sourceType,
                confidence: ref.confidence,
                endpoint: {
                    url: 'PLACEHOLDER_CONFIGURE_BEFORE_DEPLOYMENT',
                    timeout: 30000,
                    retries: 3,
                },
                authentication: {
                    type: 'placeholder',
                    secretName: `erp-credentials-${safeName}`,
                },
                ...(ref.entityType && { entityType: ref.entityType }),
                ...(ref.operation && { operation: ref.operation }),
                ...(options.includeOriginalProperties && { originalProperties: ref.originalProperties }),
                resolutionInstructions: slot.resolutionInstructions,
            },
        },
    };
}
/**
 * Generate environment file placeholder for an ERP integration slot.
 */
function generateEnvFile(slot, _options) {
    const ref = slot.reference;
    const prefix = `ERP_${ref.resourceName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
    return {
        [`${prefix}_VENDOR`]: ref.vendor,
        [`${prefix}_INTEGRATION_TYPE`]: ref.integrationType,
        [`${prefix}_SLOT_ID`]: slot.slotId,
        [`${prefix}_STATUS`]: 'UNRESOLVED',
        [`${prefix}_REQUIRED_ADAPTER`]: slot.requiredAdapter,
        [`${prefix}_ENDPOINT`]: 'PLACEHOLDER_CONFIGURE_BEFORE_DEPLOYMENT',
        [`${prefix}_USERNAME`]: 'PLACEHOLDER_CONFIGURE_BEFORE_DEPLOYMENT',
        [`${prefix}_PASSWORD`]: 'PLACEHOLDER_CONFIGURE_BEFORE_DEPLOYMENT',
        [`${prefix}_CONFIDENCE`]: String(ref.confidence),
        ...(ref.entityType && { [`${prefix}_ENTITY_TYPE`]: ref.entityType }),
        ...(ref.operation && { [`${prefix}_OPERATION`]: ref.operation }),
    };
}
/**
 * Generate JSON stub for an ERP integration slot.
 */
function generateJsonStub(slot, options) {
    const ref = slot.reference;
    return {
        _agentics_erp_integration: {
            marker: 'AGENTICS_ERP_INTEGRATION',
            version: '1.0.0',
        },
        slotId: slot.slotId,
        status: slot.status,
        vendor: ref.vendor,
        integrationType: ref.integrationType,
        requiredAdapter: slot.requiredAdapter,
        reference: {
            referenceId: ref.referenceId,
            resourceName: ref.resourceName,
            sourceType: ref.sourceType,
            sourcePath: ref.sourcePath,
            confidence: ref.confidence,
            ...(ref.endpoint && { endpoint: ref.endpoint }),
            ...(ref.entityType && { entityType: ref.entityType }),
            ...(ref.operation && { operation: ref.operation }),
            ...(options.includeOriginalProperties && { originalProperties: ref.originalProperties }),
        },
        audit: slot.auditInfo,
        configurationSchema: slot.configurationSchema,
        resolutionInstructions: slot.resolutionInstructions,
    };
}
// =============================================================================
// STUB GENERATOR CLASS
// =============================================================================
/**
 * ERP Integration Stub Generator.
 *
 * Generates format-specific placeholder stubs for ERP integration slots.
 * All output is deterministic and auditable.
 */
export class ERPStubGenerator {
    /**
     * Generate a stub artifact for an integration slot.
     *
     * @param slot - The integration slot to generate a stub for
     * @param options - Generation options
     * @returns The generated stub artifact with metadata
     */
    generateStubArtifact(slot, options) {
        const content = this.generateStubContent(slot, options);
        const basePath = options.basePath ?? 'erp-integrations';
        const safeName = slot.reference.resourceName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const { path, format } = this.getArtifactPathAndFormat(options.format, basePath, safeName);
        const contentHash = this.hashContent(content);
        const artifact = {
            path,
            content,
            format,
            encoding: 'utf-8',
            metadata: {
                erpIntegration: true,
                slotId: slot.slotId,
                vendor: slot.reference.vendor,
                status: slot.status,
                requiredAdapter: slot.requiredAdapter,
                contentHash,
            },
        };
        return {
            artifact,
            slot,
            contentHash,
        };
    }
    /**
     * Generate stub artifacts for multiple integration slots.
     *
     * @param slots - The integration slots to generate stubs for
     * @param options - Generation options
     * @returns Array of generated stub artifacts
     */
    generateStubArtifacts(slots, options) {
        return slots
            .map(slot => this.generateStubArtifact(slot, options))
            .sort((a, b) => a.slot.slotId.localeCompare(b.slot.slotId, 'en'));
    }
    /**
     * Generate a manifest of all ERP integration slots.
     *
     * @param slots - All integration slots
     * @param intentId - The source intent ID
     * @param intentHash - The source intent hash
     * @returns Export artifact containing the manifest
     */
    generateManifest(slots, intentId, intentHash) {
        const manifest = {
            _agentics_erp_manifest: {
                version: '1.0.0',
                generatedAt: new Date().toISOString(), // Note: Should use intent timestamp for determinism
            },
            intentId,
            intentHash,
            totalSlots: slots.length,
            unresolvedCount: slots.filter(s => s.status === 'unresolved').length,
            byVendor: this.groupByVendor(slots),
            byIntegrationType: this.groupByIntegrationType(slots),
            slots: slots.map(slot => ({
                slotId: slot.slotId,
                vendor: slot.reference.vendor,
                integrationType: slot.reference.integrationType,
                resourceName: slot.reference.resourceName,
                status: slot.status,
                requiredAdapter: slot.requiredAdapter,
                confidence: slot.reference.confidence,
            })),
        };
        return {
            path: 'erp-integrations/manifest.json',
            content: manifest,
            format: 'json',
            encoding: 'utf-8',
            metadata: {
                erpManifest: true,
                totalSlots: slots.length,
            },
        };
    }
    /**
     * Generate stub content based on format.
     */
    generateStubContent(slot, options) {
        switch (options.format) {
            case 'terraform-null':
            case 'terraform-local':
                return generateTerraformNullResource(slot, options);
            case 'kubernetes-configmap':
                return generateKubernetesConfigMap(slot, options);
            case 'kubernetes-secret':
                return generateKubernetesSecret(slot, options);
            case 'cloudformation-custom':
                return generateCloudFormationCustomResource(slot, options);
            case 'helm-values':
                return generateHelmValues(slot, options);
            case 'env-file':
                return generateEnvFile(slot, options);
            case 'yaml-stub':
            case 'json-stub':
            default:
                return generateJsonStub(slot, options);
        }
    }
    /**
     * Get artifact path and serializer format.
     */
    getArtifactPathAndFormat(stubFormat, basePath, resourceName) {
        switch (stubFormat) {
            case 'terraform-null':
            case 'terraform-local':
                return {
                    path: `${basePath}/terraform/${resourceName}.tf.json`,
                    format: 'json',
                };
            case 'kubernetes-configmap':
                return {
                    path: `${basePath}/kubernetes/${resourceName}-configmap.yaml`,
                    format: 'yaml',
                };
            case 'kubernetes-secret':
                return {
                    path: `${basePath}/kubernetes/${resourceName}-secret.yaml`,
                    format: 'yaml',
                };
            case 'cloudformation-custom':
                return {
                    path: `${basePath}/cloudformation/${resourceName}.yaml`,
                    format: 'yaml',
                };
            case 'helm-values':
                return {
                    path: `${basePath}/helm/values-${resourceName}.yaml`,
                    format: 'yaml',
                };
            case 'env-file':
                return {
                    path: `${basePath}/env/${resourceName}.env`,
                    format: 'env', // Will need special handling
                };
            case 'yaml-stub':
                return {
                    path: `${basePath}/${resourceName}.yaml`,
                    format: 'yaml',
                };
            case 'json-stub':
            default:
                return {
                    path: `${basePath}/${resourceName}.json`,
                    format: 'json',
                };
        }
    }
    /**
     * Generate content hash.
     */
    hashContent(content) {
        const serialized = JSON.stringify(content, Object.keys(content).sort());
        return createHash('sha256').update(serialized).digest('hex').substring(0, 16);
    }
    /**
     * Group slots by vendor.
     */
    groupByVendor(slots) {
        const result = {};
        for (const slot of slots) {
            const vendor = slot.reference.vendor;
            result[vendor] = (result[vendor] ?? 0) + 1;
        }
        return result;
    }
    /**
     * Group slots by integration type.
     */
    groupByIntegrationType(slots) {
        const result = {};
        for (const slot of slots) {
            const type = slot.reference.integrationType;
            result[type] = (result[type] ?? 0) + 1;
        }
        return result;
    }
}
/**
 * Factory function to create an ERP Stub Generator.
 */
export function createERPStubGenerator() {
    return new ERPStubGenerator();
}
/**
 * Generate header comments for stub files.
 */
export function generateStubHeader(slot) {
    const ref = slot.reference;
    return [
        '='.repeat(78),
        'AGENTICS ERP INTEGRATION STUB',
        '='.repeat(78),
        '',
        `Slot ID: ${slot.slotId}`,
        `Vendor: ${ref.vendor}`,
        `Integration Type: ${ref.integrationType}`,
        `Resource: ${ref.resourceName}`,
        `Source Type: ${ref.sourceType}`,
        `Status: ${slot.status.toUpperCase()}`,
        `Required Adapter: ${slot.requiredAdapter}`,
        `Confidence: ${(ref.confidence * 100).toFixed(0)}%`,
        '',
        'This stub represents an unresolved ERP integration dependency.',
        'Configure the required adapter before deployment.',
        '',
        'Resolution Instructions:',
        ...slot.resolutionInstructions.map(i => `  ${i}`),
        '',
        '='.repeat(78),
    ];
}
//# sourceMappingURL=stub-generator.js.map