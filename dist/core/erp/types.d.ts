/**
 * ERP Surface Reference Types
 *
 * Type definitions for ERP (Enterprise Resource Planning) surface detection
 * and integration slot generation. These types enable the exporter to recognize
 * ERP dependencies without implementing actual ERP adapters.
 *
 * The goal is convertibility proof - demonstrating that deployment intents
 * can identify ERP integration points and emit placeholder stubs that clearly
 * mark where future ERP adapters would be needed.
 *
 * @module core/erp/types
 * @version 1.0.0
 */
import { z } from 'zod';
/**
 * Known ERP vendor identifiers.
 * These are used to classify detected ERP references.
 */
export declare const ERPVendorValues: readonly ["sap", "oracle-erp", "oracle-netsuite", "microsoft-dynamics", "salesforce", "workday", "infor", "sage", "epicor", "ifs", "generic-erp"];
export type ERPVendor = (typeof ERPVendorValues)[number];
export declare const ERPVendorSchema: z.ZodEnum<["sap", "oracle-erp", "oracle-netsuite", "microsoft-dynamics", "salesforce", "workday", "infor", "sage", "epicor", "ifs", "generic-erp"]>;
/**
 * Types of ERP integration patterns.
 */
export declare const ERPIntegrationTypeValues: readonly ["api", "rfc", "bapi", "idoc", "odata", "jdbc", "file-exchange", "message-queue", "webhook", "event", "unknown"];
export type ERPIntegrationType = (typeof ERPIntegrationTypeValues)[number];
export declare const ERPIntegrationTypeSchema: z.ZodEnum<["api", "rfc", "bapi", "idoc", "odata", "jdbc", "file-exchange", "message-queue", "webhook", "event", "unknown"]>;
/**
 * Represents a detected ERP surface reference within a deployment intent.
 * This captures the metadata needed to generate appropriate placeholder stubs.
 */
export interface ERPSurfaceReference {
    /**
     * Unique identifier for this reference within the intent.
     * Generated deterministically from the reference path.
     */
    readonly referenceId: string;
    /**
     * The detected ERP vendor.
     */
    readonly vendor: ERPVendor;
    /**
     * The type of integration pattern detected.
     */
    readonly integrationType: ERPIntegrationType;
    /**
     * The resource type string that triggered detection.
     */
    readonly sourceType: string;
    /**
     * Path to the resource within the intent (e.g., "$.spec.resources[0]").
     */
    readonly sourcePath: string;
    /**
     * Name of the resource containing this reference.
     */
    readonly resourceName: string;
    /**
     * Original properties associated with this ERP reference.
     * These are preserved for audit purposes.
     */
    readonly originalProperties: Readonly<Record<string, unknown>>;
    /**
     * Detected endpoint or connection information (if available).
     */
    readonly endpoint?: string;
    /**
     * Detected entity or object type (if available).
     */
    readonly entityType?: string;
    /**
     * Detected operation or method (if available).
     */
    readonly operation?: string;
    /**
     * Confidence score for this detection (0.0 - 1.0).
     * Higher scores indicate more certain matches.
     */
    readonly confidence: number;
}
export declare const ERPSurfaceReferenceSchema: z.ZodObject<{
    referenceId: z.ZodString;
    vendor: z.ZodEnum<["sap", "oracle-erp", "oracle-netsuite", "microsoft-dynamics", "salesforce", "workday", "infor", "sage", "epicor", "ifs", "generic-erp"]>;
    integrationType: z.ZodEnum<["api", "rfc", "bapi", "idoc", "odata", "jdbc", "file-exchange", "message-queue", "webhook", "event", "unknown"]>;
    sourceType: z.ZodString;
    sourcePath: z.ZodString;
    resourceName: z.ZodString;
    originalProperties: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    endpoint: z.ZodOptional<z.ZodString>;
    entityType: z.ZodOptional<z.ZodString>;
    operation: z.ZodOptional<z.ZodString>;
    confidence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    referenceId: string;
    vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
    integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
    sourceType: string;
    sourcePath: string;
    resourceName: string;
    originalProperties: Record<string, unknown>;
    confidence: number;
    endpoint?: string | undefined;
    entityType?: string | undefined;
    operation?: string | undefined;
}, {
    referenceId: string;
    vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
    integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
    sourceType: string;
    sourcePath: string;
    resourceName: string;
    originalProperties: Record<string, unknown>;
    confidence: number;
    endpoint?: string | undefined;
    entityType?: string | undefined;
    operation?: string | undefined;
}>;
/**
 * Status of an integration slot.
 */
export declare const IntegrationSlotStatusValues: readonly ["unresolved", "placeholder", "configured", "validated"];
export type IntegrationSlotStatus = (typeof IntegrationSlotStatusValues)[number];
export declare const IntegrationSlotStatusSchema: z.ZodEnum<["unresolved", "placeholder", "configured", "validated"]>;
/**
 * Represents an integration slot - a placeholder for an unresolved ERP dependency.
 * These slots are deterministic markers that indicate where future integration
 * adapters would need to be configured.
 */
export interface IntegrationSlot {
    /**
     * Unique, deterministic identifier for this slot.
     * Format: "erp-slot:<vendor>:<resource-name>:<hash>"
     */
    readonly slotId: string;
    /**
     * The ERP surface reference that created this slot.
     */
    readonly reference: ERPSurfaceReference;
    /**
     * Current status of this slot.
     */
    readonly status: IntegrationSlotStatus;
    /**
     * Placeholder stub content to be emitted.
     * This is the actual content that will appear in exports.
     */
    readonly stub: IntegrationStub;
    /**
     * Required adapter type for resolution.
     */
    readonly requiredAdapter: string;
    /**
     * Configuration schema for the required adapter (JSON Schema).
     */
    readonly configurationSchema?: Readonly<Record<string, unknown>>;
    /**
     * Human-readable resolution instructions.
     */
    readonly resolutionInstructions: readonly string[];
    /**
     * Audit trail for this slot.
     */
    readonly auditInfo: IntegrationSlotAudit;
}
export declare const IntegrationSlotSchema: z.ZodObject<{
    slotId: z.ZodString;
    reference: z.ZodObject<{
        referenceId: z.ZodString;
        vendor: z.ZodEnum<["sap", "oracle-erp", "oracle-netsuite", "microsoft-dynamics", "salesforce", "workday", "infor", "sage", "epicor", "ifs", "generic-erp"]>;
        integrationType: z.ZodEnum<["api", "rfc", "bapi", "idoc", "odata", "jdbc", "file-exchange", "message-queue", "webhook", "event", "unknown"]>;
        sourceType: z.ZodString;
        sourcePath: z.ZodString;
        resourceName: z.ZodString;
        originalProperties: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        endpoint: z.ZodOptional<z.ZodString>;
        entityType: z.ZodOptional<z.ZodString>;
        operation: z.ZodOptional<z.ZodString>;
        confidence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        referenceId: string;
        vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
        integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
        sourceType: string;
        sourcePath: string;
        resourceName: string;
        originalProperties: Record<string, unknown>;
        confidence: number;
        endpoint?: string | undefined;
        entityType?: string | undefined;
        operation?: string | undefined;
    }, {
        referenceId: string;
        vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
        integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
        sourceType: string;
        sourcePath: string;
        resourceName: string;
        originalProperties: Record<string, unknown>;
        confidence: number;
        endpoint?: string | undefined;
        entityType?: string | undefined;
        operation?: string | undefined;
    }>;
    status: z.ZodEnum<["unresolved", "placeholder", "configured", "validated"]>;
    stub: z.ZodLazy<z.ZodObject<{
        format: z.ZodEnum<["terraform-null", "terraform-local", "kubernetes-configmap", "kubernetes-secret", "cloudformation-custom", "helm-values", "env-file", "json-stub", "yaml-stub"]>;
        content: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        contentHash: z.ZodString;
        comments: z.ZodArray<z.ZodString, "many">;
        marker: z.ZodLazy<z.ZodObject<{
            prefix: z.ZodLiteral<"AGENTICS_ERP_INTEGRATION">;
            slotId: z.ZodString;
            vendor: z.ZodEnum<["sap", "oracle-erp", "oracle-netsuite", "microsoft-dynamics", "salesforce", "workday", "infor", "sage", "epicor", "ifs", "generic-erp"]>;
            integrationType: z.ZodEnum<["api", "rfc", "bapi", "idoc", "odata", "jdbc", "file-exchange", "message-queue", "webhook", "event", "unknown"]>;
            status: z.ZodEnum<["unresolved", "placeholder", "configured", "validated"]>;
            createdAt: z.ZodString;
            markerVersion: z.ZodLiteral<"1.0.0">;
        }, "strip", z.ZodTypeAny, {
            status: "unresolved" | "placeholder" | "configured" | "validated";
            vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
            integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
            slotId: string;
            prefix: "AGENTICS_ERP_INTEGRATION";
            createdAt: string;
            markerVersion: "1.0.0";
        }, {
            status: "unresolved" | "placeholder" | "configured" | "validated";
            vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
            integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
            slotId: string;
            prefix: "AGENTICS_ERP_INTEGRATION";
            createdAt: string;
            markerVersion: "1.0.0";
        }>>;
    }, "strip", z.ZodTypeAny, {
        content: Record<string, unknown>;
        format: "terraform-null" | "terraform-local" | "kubernetes-configmap" | "kubernetes-secret" | "cloudformation-custom" | "helm-values" | "env-file" | "json-stub" | "yaml-stub";
        contentHash: string;
        comments: string[];
        marker: {
            status: "unresolved" | "placeholder" | "configured" | "validated";
            vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
            integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
            slotId: string;
            prefix: "AGENTICS_ERP_INTEGRATION";
            createdAt: string;
            markerVersion: "1.0.0";
        };
    }, {
        content: Record<string, unknown>;
        format: "terraform-null" | "terraform-local" | "kubernetes-configmap" | "kubernetes-secret" | "cloudformation-custom" | "helm-values" | "env-file" | "json-stub" | "yaml-stub";
        contentHash: string;
        comments: string[];
        marker: {
            status: "unresolved" | "placeholder" | "configured" | "validated";
            vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
            integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
            slotId: string;
            prefix: "AGENTICS_ERP_INTEGRATION";
            createdAt: string;
            markerVersion: "1.0.0";
        };
    }>>;
    requiredAdapter: z.ZodString;
    configurationSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    resolutionInstructions: z.ZodArray<z.ZodString, "many">;
    auditInfo: z.ZodLazy<z.ZodObject<{
        intentId: z.ZodString;
        intentVersion: z.ZodString;
        intentHash: z.ZodString;
        detectedAt: z.ZodString;
        detectionMethod: z.ZodEnum<["type-pattern", "property-pattern", "reference-pattern"]>;
        matchedPattern: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        intentId: string;
        intentVersion: string;
        intentHash: string;
        detectedAt: string;
        detectionMethod: "type-pattern" | "property-pattern" | "reference-pattern";
        matchedPattern: string;
    }, {
        intentId: string;
        intentVersion: string;
        intentHash: string;
        detectedAt: string;
        detectionMethod: "type-pattern" | "property-pattern" | "reference-pattern";
        matchedPattern: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    status: "unresolved" | "placeholder" | "configured" | "validated";
    slotId: string;
    reference: {
        referenceId: string;
        vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
        integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
        sourceType: string;
        sourcePath: string;
        resourceName: string;
        originalProperties: Record<string, unknown>;
        confidence: number;
        endpoint?: string | undefined;
        entityType?: string | undefined;
        operation?: string | undefined;
    };
    stub: {
        content: Record<string, unknown>;
        format: "terraform-null" | "terraform-local" | "kubernetes-configmap" | "kubernetes-secret" | "cloudformation-custom" | "helm-values" | "env-file" | "json-stub" | "yaml-stub";
        contentHash: string;
        comments: string[];
        marker: {
            status: "unresolved" | "placeholder" | "configured" | "validated";
            vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
            integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
            slotId: string;
            prefix: "AGENTICS_ERP_INTEGRATION";
            createdAt: string;
            markerVersion: "1.0.0";
        };
    };
    requiredAdapter: string;
    resolutionInstructions: string[];
    auditInfo: {
        intentId: string;
        intentVersion: string;
        intentHash: string;
        detectedAt: string;
        detectionMethod: "type-pattern" | "property-pattern" | "reference-pattern";
        matchedPattern: string;
    };
    configurationSchema?: Record<string, unknown> | undefined;
}, {
    status: "unresolved" | "placeholder" | "configured" | "validated";
    slotId: string;
    reference: {
        referenceId: string;
        vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
        integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
        sourceType: string;
        sourcePath: string;
        resourceName: string;
        originalProperties: Record<string, unknown>;
        confidence: number;
        endpoint?: string | undefined;
        entityType?: string | undefined;
        operation?: string | undefined;
    };
    stub: {
        content: Record<string, unknown>;
        format: "terraform-null" | "terraform-local" | "kubernetes-configmap" | "kubernetes-secret" | "cloudformation-custom" | "helm-values" | "env-file" | "json-stub" | "yaml-stub";
        contentHash: string;
        comments: string[];
        marker: {
            status: "unresolved" | "placeholder" | "configured" | "validated";
            vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
            integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
            slotId: string;
            prefix: "AGENTICS_ERP_INTEGRATION";
            createdAt: string;
            markerVersion: "1.0.0";
        };
    };
    requiredAdapter: string;
    resolutionInstructions: string[];
    auditInfo: {
        intentId: string;
        intentVersion: string;
        intentHash: string;
        detectedAt: string;
        detectionMethod: "type-pattern" | "property-pattern" | "reference-pattern";
        matchedPattern: string;
    };
    configurationSchema?: Record<string, unknown> | undefined;
}>;
/**
 * Output format for the stub content.
 */
export declare const StubOutputFormatValues: readonly ["terraform-null", "terraform-local", "kubernetes-configmap", "kubernetes-secret", "cloudformation-custom", "helm-values", "env-file", "json-stub", "yaml-stub"];
export type StubOutputFormat = (typeof StubOutputFormatValues)[number];
export declare const StubOutputFormatSchema: z.ZodEnum<["terraform-null", "terraform-local", "kubernetes-configmap", "kubernetes-secret", "cloudformation-custom", "helm-values", "env-file", "json-stub", "yaml-stub"]>;
/**
 * Represents the placeholder stub content for an unresolved ERP dependency.
 * Stubs are deterministic, auditable, and clearly marked as integration points.
 */
export interface IntegrationStub {
    /**
     * Output format for this stub.
     */
    readonly format: StubOutputFormat;
    /**
     * The structured content of the stub.
     */
    readonly content: Readonly<Record<string, unknown>>;
    /**
     * Canonical hash of the stub content for verification.
     */
    readonly contentHash: string;
    /**
     * Comments to include in the generated output.
     */
    readonly comments: readonly string[];
    /**
     * Marker indicating this is an unresolved integration point.
     */
    readonly marker: IntegrationMarker;
}
export declare const IntegrationStubSchema: z.ZodObject<{
    format: z.ZodEnum<["terraform-null", "terraform-local", "kubernetes-configmap", "kubernetes-secret", "cloudformation-custom", "helm-values", "env-file", "json-stub", "yaml-stub"]>;
    content: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    contentHash: z.ZodString;
    comments: z.ZodArray<z.ZodString, "many">;
    marker: z.ZodLazy<z.ZodObject<{
        prefix: z.ZodLiteral<"AGENTICS_ERP_INTEGRATION">;
        slotId: z.ZodString;
        vendor: z.ZodEnum<["sap", "oracle-erp", "oracle-netsuite", "microsoft-dynamics", "salesforce", "workday", "infor", "sage", "epicor", "ifs", "generic-erp"]>;
        integrationType: z.ZodEnum<["api", "rfc", "bapi", "idoc", "odata", "jdbc", "file-exchange", "message-queue", "webhook", "event", "unknown"]>;
        status: z.ZodEnum<["unresolved", "placeholder", "configured", "validated"]>;
        createdAt: z.ZodString;
        markerVersion: z.ZodLiteral<"1.0.0">;
    }, "strip", z.ZodTypeAny, {
        status: "unresolved" | "placeholder" | "configured" | "validated";
        vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
        integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
        slotId: string;
        prefix: "AGENTICS_ERP_INTEGRATION";
        createdAt: string;
        markerVersion: "1.0.0";
    }, {
        status: "unresolved" | "placeholder" | "configured" | "validated";
        vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
        integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
        slotId: string;
        prefix: "AGENTICS_ERP_INTEGRATION";
        createdAt: string;
        markerVersion: "1.0.0";
    }>>;
}, "strip", z.ZodTypeAny, {
    content: Record<string, unknown>;
    format: "terraform-null" | "terraform-local" | "kubernetes-configmap" | "kubernetes-secret" | "cloudformation-custom" | "helm-values" | "env-file" | "json-stub" | "yaml-stub";
    contentHash: string;
    comments: string[];
    marker: {
        status: "unresolved" | "placeholder" | "configured" | "validated";
        vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
        integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
        slotId: string;
        prefix: "AGENTICS_ERP_INTEGRATION";
        createdAt: string;
        markerVersion: "1.0.0";
    };
}, {
    content: Record<string, unknown>;
    format: "terraform-null" | "terraform-local" | "kubernetes-configmap" | "kubernetes-secret" | "cloudformation-custom" | "helm-values" | "env-file" | "json-stub" | "yaml-stub";
    contentHash: string;
    comments: string[];
    marker: {
        status: "unresolved" | "placeholder" | "configured" | "validated";
        vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
        integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
        slotId: string;
        prefix: "AGENTICS_ERP_INTEGRATION";
        createdAt: string;
        markerVersion: "1.0.0";
    };
}>;
/**
 * A standard marker embedded in stubs to clearly identify integration points.
 * This provides a consistent, searchable pattern across all export formats.
 */
export interface IntegrationMarker {
    /**
     * Marker prefix (always "AGENTICS_ERP_INTEGRATION").
     */
    readonly prefix: 'AGENTICS_ERP_INTEGRATION';
    /**
     * Unique slot identifier.
     */
    readonly slotId: string;
    /**
     * ERP vendor.
     */
    readonly vendor: ERPVendor;
    /**
     * Integration type.
     */
    readonly integrationType: ERPIntegrationType;
    /**
     * Resolution status.
     */
    readonly status: IntegrationSlotStatus;
    /**
     * Timestamp of marker creation (from intent metadata for determinism).
     */
    readonly createdAt: string;
    /**
     * Version of the marker format.
     */
    readonly markerVersion: '1.0.0';
}
export declare const IntegrationMarkerSchema: z.ZodObject<{
    prefix: z.ZodLiteral<"AGENTICS_ERP_INTEGRATION">;
    slotId: z.ZodString;
    vendor: z.ZodEnum<["sap", "oracle-erp", "oracle-netsuite", "microsoft-dynamics", "salesforce", "workday", "infor", "sage", "epicor", "ifs", "generic-erp"]>;
    integrationType: z.ZodEnum<["api", "rfc", "bapi", "idoc", "odata", "jdbc", "file-exchange", "message-queue", "webhook", "event", "unknown"]>;
    status: z.ZodEnum<["unresolved", "placeholder", "configured", "validated"]>;
    createdAt: z.ZodString;
    markerVersion: z.ZodLiteral<"1.0.0">;
}, "strip", z.ZodTypeAny, {
    status: "unresolved" | "placeholder" | "configured" | "validated";
    vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
    integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
    slotId: string;
    prefix: "AGENTICS_ERP_INTEGRATION";
    createdAt: string;
    markerVersion: "1.0.0";
}, {
    status: "unresolved" | "placeholder" | "configured" | "validated";
    vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
    integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
    slotId: string;
    prefix: "AGENTICS_ERP_INTEGRATION";
    createdAt: string;
    markerVersion: "1.0.0";
}>;
/**
 * Audit information for integration slot tracking.
 */
export interface IntegrationSlotAudit {
    /**
     * Intent ID that generated this slot.
     */
    readonly intentId: string;
    /**
     * Intent version.
     */
    readonly intentVersion: string;
    /**
     * Canonical hash of the intent.
     */
    readonly intentHash: string;
    /**
     * Detection timestamp (from intent metadata for determinism).
     */
    readonly detectedAt: string;
    /**
     * Detection method used.
     */
    readonly detectionMethod: 'type-pattern' | 'property-pattern' | 'reference-pattern';
    /**
     * Pattern that matched.
     */
    readonly matchedPattern: string;
}
export declare const IntegrationSlotAuditSchema: z.ZodObject<{
    intentId: z.ZodString;
    intentVersion: z.ZodString;
    intentHash: z.ZodString;
    detectedAt: z.ZodString;
    detectionMethod: z.ZodEnum<["type-pattern", "property-pattern", "reference-pattern"]>;
    matchedPattern: z.ZodString;
}, "strip", z.ZodTypeAny, {
    intentId: string;
    intentVersion: string;
    intentHash: string;
    detectedAt: string;
    detectionMethod: "type-pattern" | "property-pattern" | "reference-pattern";
    matchedPattern: string;
}, {
    intentId: string;
    intentVersion: string;
    intentHash: string;
    detectedAt: string;
    detectionMethod: "type-pattern" | "property-pattern" | "reference-pattern";
    matchedPattern: string;
}>;
/**
 * Result of ERP surface detection on an intent.
 */
export interface ERPDetectionResult {
    /**
     * Whether any ERP surfaces were detected.
     */
    readonly hasERPReferences: boolean;
    /**
     * All detected ERP surface references.
     */
    readonly references: readonly ERPSurfaceReference[];
    /**
     * Generated integration slots for unresolved references.
     */
    readonly integrationSlots: readonly IntegrationSlot[];
    /**
     * Summary statistics.
     */
    readonly summary: ERPDetectionSummary;
}
export interface ERPDetectionSummary {
    readonly totalReferences: number;
    readonly byVendor: Readonly<Record<ERPVendor, number>>;
    readonly byIntegrationType: Readonly<Record<ERPIntegrationType, number>>;
    readonly unresolvedCount: number;
    readonly highConfidenceCount: number;
}
export declare const ERPDetectionResultSchema: z.ZodObject<{
    hasERPReferences: z.ZodBoolean;
    references: z.ZodArray<z.ZodObject<{
        referenceId: z.ZodString;
        vendor: z.ZodEnum<["sap", "oracle-erp", "oracle-netsuite", "microsoft-dynamics", "salesforce", "workday", "infor", "sage", "epicor", "ifs", "generic-erp"]>;
        integrationType: z.ZodEnum<["api", "rfc", "bapi", "idoc", "odata", "jdbc", "file-exchange", "message-queue", "webhook", "event", "unknown"]>;
        sourceType: z.ZodString;
        sourcePath: z.ZodString;
        resourceName: z.ZodString;
        originalProperties: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        endpoint: z.ZodOptional<z.ZodString>;
        entityType: z.ZodOptional<z.ZodString>;
        operation: z.ZodOptional<z.ZodString>;
        confidence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        referenceId: string;
        vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
        integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
        sourceType: string;
        sourcePath: string;
        resourceName: string;
        originalProperties: Record<string, unknown>;
        confidence: number;
        endpoint?: string | undefined;
        entityType?: string | undefined;
        operation?: string | undefined;
    }, {
        referenceId: string;
        vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
        integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
        sourceType: string;
        sourcePath: string;
        resourceName: string;
        originalProperties: Record<string, unknown>;
        confidence: number;
        endpoint?: string | undefined;
        entityType?: string | undefined;
        operation?: string | undefined;
    }>, "many">;
    integrationSlots: z.ZodArray<z.ZodObject<{
        slotId: z.ZodString;
        reference: z.ZodObject<{
            referenceId: z.ZodString;
            vendor: z.ZodEnum<["sap", "oracle-erp", "oracle-netsuite", "microsoft-dynamics", "salesforce", "workday", "infor", "sage", "epicor", "ifs", "generic-erp"]>;
            integrationType: z.ZodEnum<["api", "rfc", "bapi", "idoc", "odata", "jdbc", "file-exchange", "message-queue", "webhook", "event", "unknown"]>;
            sourceType: z.ZodString;
            sourcePath: z.ZodString;
            resourceName: z.ZodString;
            originalProperties: z.ZodRecord<z.ZodString, z.ZodUnknown>;
            endpoint: z.ZodOptional<z.ZodString>;
            entityType: z.ZodOptional<z.ZodString>;
            operation: z.ZodOptional<z.ZodString>;
            confidence: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            referenceId: string;
            vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
            integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
            sourceType: string;
            sourcePath: string;
            resourceName: string;
            originalProperties: Record<string, unknown>;
            confidence: number;
            endpoint?: string | undefined;
            entityType?: string | undefined;
            operation?: string | undefined;
        }, {
            referenceId: string;
            vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
            integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
            sourceType: string;
            sourcePath: string;
            resourceName: string;
            originalProperties: Record<string, unknown>;
            confidence: number;
            endpoint?: string | undefined;
            entityType?: string | undefined;
            operation?: string | undefined;
        }>;
        status: z.ZodEnum<["unresolved", "placeholder", "configured", "validated"]>;
        stub: z.ZodLazy<z.ZodObject<{
            format: z.ZodEnum<["terraform-null", "terraform-local", "kubernetes-configmap", "kubernetes-secret", "cloudformation-custom", "helm-values", "env-file", "json-stub", "yaml-stub"]>;
            content: z.ZodRecord<z.ZodString, z.ZodUnknown>;
            contentHash: z.ZodString;
            comments: z.ZodArray<z.ZodString, "many">;
            marker: z.ZodLazy<z.ZodObject<{
                prefix: z.ZodLiteral<"AGENTICS_ERP_INTEGRATION">;
                slotId: z.ZodString;
                vendor: z.ZodEnum<["sap", "oracle-erp", "oracle-netsuite", "microsoft-dynamics", "salesforce", "workday", "infor", "sage", "epicor", "ifs", "generic-erp"]>;
                integrationType: z.ZodEnum<["api", "rfc", "bapi", "idoc", "odata", "jdbc", "file-exchange", "message-queue", "webhook", "event", "unknown"]>;
                status: z.ZodEnum<["unresolved", "placeholder", "configured", "validated"]>;
                createdAt: z.ZodString;
                markerVersion: z.ZodLiteral<"1.0.0">;
            }, "strip", z.ZodTypeAny, {
                status: "unresolved" | "placeholder" | "configured" | "validated";
                vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
                integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
                slotId: string;
                prefix: "AGENTICS_ERP_INTEGRATION";
                createdAt: string;
                markerVersion: "1.0.0";
            }, {
                status: "unresolved" | "placeholder" | "configured" | "validated";
                vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
                integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
                slotId: string;
                prefix: "AGENTICS_ERP_INTEGRATION";
                createdAt: string;
                markerVersion: "1.0.0";
            }>>;
        }, "strip", z.ZodTypeAny, {
            content: Record<string, unknown>;
            format: "terraform-null" | "terraform-local" | "kubernetes-configmap" | "kubernetes-secret" | "cloudformation-custom" | "helm-values" | "env-file" | "json-stub" | "yaml-stub";
            contentHash: string;
            comments: string[];
            marker: {
                status: "unresolved" | "placeholder" | "configured" | "validated";
                vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
                integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
                slotId: string;
                prefix: "AGENTICS_ERP_INTEGRATION";
                createdAt: string;
                markerVersion: "1.0.0";
            };
        }, {
            content: Record<string, unknown>;
            format: "terraform-null" | "terraform-local" | "kubernetes-configmap" | "kubernetes-secret" | "cloudformation-custom" | "helm-values" | "env-file" | "json-stub" | "yaml-stub";
            contentHash: string;
            comments: string[];
            marker: {
                status: "unresolved" | "placeholder" | "configured" | "validated";
                vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
                integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
                slotId: string;
                prefix: "AGENTICS_ERP_INTEGRATION";
                createdAt: string;
                markerVersion: "1.0.0";
            };
        }>>;
        requiredAdapter: z.ZodString;
        configurationSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        resolutionInstructions: z.ZodArray<z.ZodString, "many">;
        auditInfo: z.ZodLazy<z.ZodObject<{
            intentId: z.ZodString;
            intentVersion: z.ZodString;
            intentHash: z.ZodString;
            detectedAt: z.ZodString;
            detectionMethod: z.ZodEnum<["type-pattern", "property-pattern", "reference-pattern"]>;
            matchedPattern: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            intentId: string;
            intentVersion: string;
            intentHash: string;
            detectedAt: string;
            detectionMethod: "type-pattern" | "property-pattern" | "reference-pattern";
            matchedPattern: string;
        }, {
            intentId: string;
            intentVersion: string;
            intentHash: string;
            detectedAt: string;
            detectionMethod: "type-pattern" | "property-pattern" | "reference-pattern";
            matchedPattern: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        status: "unresolved" | "placeholder" | "configured" | "validated";
        slotId: string;
        reference: {
            referenceId: string;
            vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
            integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
            sourceType: string;
            sourcePath: string;
            resourceName: string;
            originalProperties: Record<string, unknown>;
            confidence: number;
            endpoint?: string | undefined;
            entityType?: string | undefined;
            operation?: string | undefined;
        };
        stub: {
            content: Record<string, unknown>;
            format: "terraform-null" | "terraform-local" | "kubernetes-configmap" | "kubernetes-secret" | "cloudformation-custom" | "helm-values" | "env-file" | "json-stub" | "yaml-stub";
            contentHash: string;
            comments: string[];
            marker: {
                status: "unresolved" | "placeholder" | "configured" | "validated";
                vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
                integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
                slotId: string;
                prefix: "AGENTICS_ERP_INTEGRATION";
                createdAt: string;
                markerVersion: "1.0.0";
            };
        };
        requiredAdapter: string;
        resolutionInstructions: string[];
        auditInfo: {
            intentId: string;
            intentVersion: string;
            intentHash: string;
            detectedAt: string;
            detectionMethod: "type-pattern" | "property-pattern" | "reference-pattern";
            matchedPattern: string;
        };
        configurationSchema?: Record<string, unknown> | undefined;
    }, {
        status: "unresolved" | "placeholder" | "configured" | "validated";
        slotId: string;
        reference: {
            referenceId: string;
            vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
            integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
            sourceType: string;
            sourcePath: string;
            resourceName: string;
            originalProperties: Record<string, unknown>;
            confidence: number;
            endpoint?: string | undefined;
            entityType?: string | undefined;
            operation?: string | undefined;
        };
        stub: {
            content: Record<string, unknown>;
            format: "terraform-null" | "terraform-local" | "kubernetes-configmap" | "kubernetes-secret" | "cloudformation-custom" | "helm-values" | "env-file" | "json-stub" | "yaml-stub";
            contentHash: string;
            comments: string[];
            marker: {
                status: "unresolved" | "placeholder" | "configured" | "validated";
                vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
                integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
                slotId: string;
                prefix: "AGENTICS_ERP_INTEGRATION";
                createdAt: string;
                markerVersion: "1.0.0";
            };
        };
        requiredAdapter: string;
        resolutionInstructions: string[];
        auditInfo: {
            intentId: string;
            intentVersion: string;
            intentHash: string;
            detectedAt: string;
            detectionMethod: "type-pattern" | "property-pattern" | "reference-pattern";
            matchedPattern: string;
        };
        configurationSchema?: Record<string, unknown> | undefined;
    }>, "many">;
    summary: z.ZodObject<{
        totalReferences: z.ZodNumber;
        byVendor: z.ZodRecord<z.ZodString, z.ZodNumber>;
        byIntegrationType: z.ZodRecord<z.ZodString, z.ZodNumber>;
        unresolvedCount: z.ZodNumber;
        highConfidenceCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        totalReferences: number;
        byVendor: Record<string, number>;
        byIntegrationType: Record<string, number>;
        unresolvedCount: number;
        highConfidenceCount: number;
    }, {
        totalReferences: number;
        byVendor: Record<string, number>;
        byIntegrationType: Record<string, number>;
        unresolvedCount: number;
        highConfidenceCount: number;
    }>;
}, "strip", z.ZodTypeAny, {
    hasERPReferences: boolean;
    references: {
        referenceId: string;
        vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
        integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
        sourceType: string;
        sourcePath: string;
        resourceName: string;
        originalProperties: Record<string, unknown>;
        confidence: number;
        endpoint?: string | undefined;
        entityType?: string | undefined;
        operation?: string | undefined;
    }[];
    integrationSlots: {
        status: "unresolved" | "placeholder" | "configured" | "validated";
        slotId: string;
        reference: {
            referenceId: string;
            vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
            integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
            sourceType: string;
            sourcePath: string;
            resourceName: string;
            originalProperties: Record<string, unknown>;
            confidence: number;
            endpoint?: string | undefined;
            entityType?: string | undefined;
            operation?: string | undefined;
        };
        stub: {
            content: Record<string, unknown>;
            format: "terraform-null" | "terraform-local" | "kubernetes-configmap" | "kubernetes-secret" | "cloudformation-custom" | "helm-values" | "env-file" | "json-stub" | "yaml-stub";
            contentHash: string;
            comments: string[];
            marker: {
                status: "unresolved" | "placeholder" | "configured" | "validated";
                vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
                integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
                slotId: string;
                prefix: "AGENTICS_ERP_INTEGRATION";
                createdAt: string;
                markerVersion: "1.0.0";
            };
        };
        requiredAdapter: string;
        resolutionInstructions: string[];
        auditInfo: {
            intentId: string;
            intentVersion: string;
            intentHash: string;
            detectedAt: string;
            detectionMethod: "type-pattern" | "property-pattern" | "reference-pattern";
            matchedPattern: string;
        };
        configurationSchema?: Record<string, unknown> | undefined;
    }[];
    summary: {
        totalReferences: number;
        byVendor: Record<string, number>;
        byIntegrationType: Record<string, number>;
        unresolvedCount: number;
        highConfidenceCount: number;
    };
}, {
    hasERPReferences: boolean;
    references: {
        referenceId: string;
        vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
        integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
        sourceType: string;
        sourcePath: string;
        resourceName: string;
        originalProperties: Record<string, unknown>;
        confidence: number;
        endpoint?: string | undefined;
        entityType?: string | undefined;
        operation?: string | undefined;
    }[];
    integrationSlots: {
        status: "unresolved" | "placeholder" | "configured" | "validated";
        slotId: string;
        reference: {
            referenceId: string;
            vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
            integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
            sourceType: string;
            sourcePath: string;
            resourceName: string;
            originalProperties: Record<string, unknown>;
            confidence: number;
            endpoint?: string | undefined;
            entityType?: string | undefined;
            operation?: string | undefined;
        };
        stub: {
            content: Record<string, unknown>;
            format: "terraform-null" | "terraform-local" | "kubernetes-configmap" | "kubernetes-secret" | "cloudformation-custom" | "helm-values" | "env-file" | "json-stub" | "yaml-stub";
            contentHash: string;
            comments: string[];
            marker: {
                status: "unresolved" | "placeholder" | "configured" | "validated";
                vendor: "sap" | "oracle-erp" | "oracle-netsuite" | "microsoft-dynamics" | "salesforce" | "workday" | "infor" | "sage" | "epicor" | "ifs" | "generic-erp";
                integrationType: "unknown" | "api" | "rfc" | "bapi" | "idoc" | "odata" | "jdbc" | "file-exchange" | "message-queue" | "webhook" | "event";
                slotId: string;
                prefix: "AGENTICS_ERP_INTEGRATION";
                createdAt: string;
                markerVersion: "1.0.0";
            };
        };
        requiredAdapter: string;
        resolutionInstructions: string[];
        auditInfo: {
            intentId: string;
            intentVersion: string;
            intentHash: string;
            detectedAt: string;
            detectionMethod: "type-pattern" | "property-pattern" | "reference-pattern";
            matchedPattern: string;
        };
        configurationSchema?: Record<string, unknown> | undefined;
    }[];
    summary: {
        totalReferences: number;
        byVendor: Record<string, number>;
        byIntegrationType: Record<string, number>;
        unresolvedCount: number;
        highConfidenceCount: number;
    };
}>;
/**
 * Type guard for ERPVendor.
 */
export declare function isERPVendor(value: unknown): value is ERPVendor;
/**
 * Type guard for ERPIntegrationType.
 */
export declare function isERPIntegrationType(value: unknown): value is ERPIntegrationType;
/**
 * Type guard for IntegrationSlotStatus.
 */
export declare function isIntegrationSlotStatus(value: unknown): value is IntegrationSlotStatus;
//# sourceMappingURL=types.d.ts.map