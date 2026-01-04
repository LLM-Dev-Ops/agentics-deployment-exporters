/**
 * ERP Surface Detector
 *
 * Detects ERP (Enterprise Resource Planning) surface references within
 * deployment intents. This module identifies resource types, properties,
 * and dependencies that indicate ERP integration requirements.
 *
 * The detector is deterministic - same input always produces identical output.
 * No network calls or external services are used.
 *
 * @module core/erp/detector
 * @version 1.0.0
 */
import type { ValidatedIntent } from '../types.js';
import type { ERPDetectionResult, StubOutputFormat } from './types.js';
/**
 * Options for ERP detection.
 */
export interface ERPDetectorOptions {
    /**
     * Minimum confidence threshold for including references.
     * @default 0.5
     */
    readonly minConfidence?: number;
    /**
     * Output format for generated stubs.
     * @default 'json-stub'
     */
    readonly stubFormat?: StubOutputFormat;
    /**
     * Whether to include original properties in stubs.
     * @default true
     */
    readonly includeOriginalProperties?: boolean;
}
/**
 * ERP Surface Detector class.
 *
 * Detects ERP surface references in deployment intents and generates
 * appropriate placeholder stubs for unresolved dependencies.
 *
 * All operations are deterministic and produce identical output for
 * identical input.
 */
export declare class ERPSurfaceDetector {
    private readonly options;
    constructor(options?: ERPDetectorOptions);
    /**
     * Detect ERP surface references in a validated intent.
     *
     * @param intent - The validated deployment intent to scan
     * @returns Detection result with all found references and generated slots
     */
    detect(intent: ValidatedIntent): ERPDetectionResult;
    /**
     * Detect ERP references in a single resource.
     */
    private detectResourceReferences;
    /**
     * Create an ERP surface reference.
     */
    private createReference;
    /**
     * Create an integration slot for a reference.
     */
    private createIntegrationSlot;
    /**
     * Extract endpoint information from properties.
     */
    private extractEndpoint;
    /**
     * Extract entity type information from properties.
     */
    private extractEntityType;
    /**
     * Extract operation information from properties.
     */
    private extractOperation;
    /**
     * Find a property value by key (case-insensitive).
     */
    private findProperty;
    /**
     * Generate resolution instructions for a reference.
     */
    private generateResolutionInstructions;
    /**
     * Get configuration schema for a vendor.
     */
    private getConfigurationSchema;
    /**
     * Generate detection summary.
     */
    private generateSummary;
}
/**
 * Factory function to create an ERP Surface Detector.
 */
export declare function createERPSurfaceDetector(options?: ERPDetectorOptions): ERPSurfaceDetector;
//# sourceMappingURL=detector.d.ts.map