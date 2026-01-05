/**
 * Simulation Artifact Detector
 *
 * Detects simulation artifacts produced by agentics-simulation-engine within
 * deployment intents. This module identifies scenario results, capacity models,
 * load profiles, and other simulation outputs.
 *
 * The detector is deterministic - same input always produces identical output.
 * No network calls or external services are used.
 *
 * @module core/simulation/detector
 * @version 1.0.0
 */
import { createHash } from 'crypto';
const SOURCE_TYPE_PATTERNS = [
    // agentics-simulation-engine patterns (primary target)
    { pattern: /^simulation:/i, source: 'agentics-simulation-engine', confidence: 1.0 },
    { pattern: /^agentics[-_]?simulation/i, source: 'agentics-simulation-engine', confidence: 1.0 },
    { pattern: /simulation[-_]?engine:/i, source: 'agentics-simulation-engine', confidence: 0.95 },
    { pattern: /^scenario[-_]?result/i, source: 'agentics-simulation-engine', artifactType: 'scenario-result', confidence: 0.9 },
    { pattern: /^capacity[-_]?model/i, source: 'agentics-simulation-engine', artifactType: 'capacity-model', confidence: 0.9 },
    { pattern: /^load[-_]?profile/i, source: 'agentics-simulation-engine', artifactType: 'load-profile', confidence: 0.9 },
    // Monte Carlo simulation patterns
    { pattern: /^monte[-_]?carlo/i, source: 'monte-carlo', confidence: 0.95 },
    { pattern: /mc[-_]?simulation/i, source: 'monte-carlo', confidence: 0.85 },
    { pattern: /stochastic[-_]?simulation/i, source: 'monte-carlo', confidence: 0.8 },
    // Discrete event simulation patterns
    { pattern: /^discrete[-_]?event/i, source: 'discrete-event', confidence: 0.95 },
    { pattern: /des[-_]?simulation/i, source: 'discrete-event', confidence: 0.85 },
    { pattern: /event[-_]?log/i, source: 'discrete-event', artifactType: 'event-log', confidence: 0.8 },
    // Agent-based simulation patterns
    { pattern: /^agent[-_]?based/i, source: 'agent-based', confidence: 0.95 },
    { pattern: /abm[-_]?simulation/i, source: 'agent-based', confidence: 0.85 },
    { pattern: /behavior[-_]?trace/i, source: 'agent-based', artifactType: 'behavior-trace', confidence: 0.8 },
    // System dynamics patterns
    { pattern: /^system[-_]?dynamics/i, source: 'system-dynamics', confidence: 0.95 },
    { pattern: /sd[-_]?simulation/i, source: 'system-dynamics', confidence: 0.85 },
    { pattern: /state[-_]?timeline/i, source: 'system-dynamics', artifactType: 'state-timeline', confidence: 0.8 },
    // Generic simulation patterns (lower confidence)
    { pattern: /^simulation[-_]?result/i, source: 'unknown', artifactType: 'scenario-result', confidence: 0.7 },
    { pattern: /simulation[-_]?output/i, source: 'unknown', confidence: 0.6 },
    { pattern: /^forecast/i, source: 'unknown', artifactType: 'forecast-projection', confidence: 0.7 },
    { pattern: /^optimization[-_]?result/i, source: 'unknown', artifactType: 'optimization-result', confidence: 0.7 },
];
const PROPERTY_PATTERNS = [
    // Simulation engine identifiers
    { keyPattern: /simulation[-_]?engine/i, source: 'agentics-simulation-engine', confidence: 0.9 },
    { keyPattern: /simulation[-_]?id/i, source: 'agentics-simulation-engine', confidence: 0.85 },
    { keyPattern: /scenario[-_]?id/i, source: 'agentics-simulation-engine', artifactType: 'scenario-result', confidence: 0.85 },
    { valuePattern: /^sim[-_]?[0-9a-f]{8}/i, source: 'agentics-simulation-engine', confidence: 0.8 },
    // Capacity and load patterns
    { keyPattern: /capacity[-_]?threshold/i, source: 'agentics-simulation-engine', artifactType: 'capacity-model', confidence: 0.85 },
    { keyPattern: /load[-_]?distribution/i, source: 'agentics-simulation-engine', artifactType: 'load-profile', confidence: 0.85 },
    { keyPattern: /peak[-_]?load/i, source: 'agentics-simulation-engine', artifactType: 'load-profile', confidence: 0.8 },
    // Decision and optimization patterns
    { keyPattern: /decision[-_]?tree/i, source: 'agentics-simulation-engine', artifactType: 'decision-tree', confidence: 0.85 },
    { keyPattern: /optimization[-_]?parameters/i, source: 'agentics-simulation-engine', artifactType: 'optimization-result', confidence: 0.85 },
    { keyPattern: /sensitivity[-_]?matrix/i, source: 'agentics-simulation-engine', artifactType: 'sensitivity-analysis', confidence: 0.85 },
    // Forecast and projection patterns
    { keyPattern: /forecast[-_]?horizon/i, source: 'agentics-simulation-engine', artifactType: 'forecast-projection', confidence: 0.85 },
    { keyPattern: /projection[-_]?data/i, source: 'agentics-simulation-engine', artifactType: 'forecast-projection', confidence: 0.8 },
    // Risk assessment patterns
    { keyPattern: /risk[-_]?assessment/i, source: 'agentics-simulation-engine', artifactType: 'risk-assessment', confidence: 0.85 },
    { keyPattern: /risk[-_]?score/i, source: 'agentics-simulation-engine', artifactType: 'risk-assessment', confidence: 0.8 },
    // Resource allocation patterns
    { keyPattern: /resource[-_]?allocation/i, source: 'agentics-simulation-engine', artifactType: 'resource-allocation', confidence: 0.85 },
    { keyPattern: /allocation[-_]?recommendation/i, source: 'agentics-simulation-engine', artifactType: 'resource-allocation', confidence: 0.8 },
    // Workflow simulation patterns
    { keyPattern: /workflow[-_]?simulation/i, source: 'agentics-simulation-engine', artifactType: 'workflow-simulation', confidence: 0.85 },
    { keyPattern: /workflow[-_]?metrics/i, source: 'agentics-simulation-engine', artifactType: 'workflow-simulation', confidence: 0.8 },
    // Generic simulation patterns
    { keyPattern: /simulation[-_]?metrics/i, source: 'unknown', artifactType: 'metric-collection', confidence: 0.7 },
    { keyPattern: /simulation[-_]?status/i, source: 'unknown', confidence: 0.7 },
];
// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
/**
 * Detect simulation source from a resource type string.
 */
function detectSourceFromType(resourceType) {
    for (const pattern of SOURCE_TYPE_PATTERNS) {
        if (pattern.pattern.test(resourceType)) {
            return {
                source: pattern.source,
                artifactType: pattern.artifactType ?? 'scenario-result',
                confidence: pattern.confidence,
            };
        }
    }
    return null;
}
/**
 * Detect simulation references from resource properties.
 */
function detectSourceFromProperties(properties) {
    const results = [];
    function scanValue(key, value, path) {
        for (const pattern of PROPERTY_PATTERNS) {
            if (pattern.keyPattern && pattern.keyPattern.test(key)) {
                results.push({
                    source: pattern.source,
                    artifactType: pattern.artifactType ?? 'scenario-result',
                    confidence: pattern.confidence,
                    matchedPattern: `key:${key} at ${path}`,
                });
            }
            if (pattern.valuePattern && typeof value === 'string' && pattern.valuePattern.test(value)) {
                results.push({
                    source: pattern.source,
                    artifactType: pattern.artifactType ?? 'scenario-result',
                    confidence: pattern.confidence,
                    matchedPattern: `value:${value} at ${path}.${key}`,
                });
            }
        }
        // Recursively scan nested objects
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            for (const [nestedKey, nestedValue] of Object.entries(value)) {
                scanValue(nestedKey, nestedValue, `${path}.${key}`);
            }
        }
        // Scan array elements
        if (Array.isArray(value)) {
            value.forEach((item, index) => {
                if (item !== null && typeof item === 'object') {
                    for (const [nestedKey, nestedValue] of Object.entries(item)) {
                        scanValue(nestedKey, nestedValue, `${path}.${key}[${index}]`);
                    }
                }
            });
        }
    }
    for (const [key, value] of Object.entries(properties)) {
        scanValue(key, value, '$');
    }
    return results;
}
/**
 * Generate a deterministic reference ID.
 */
function generateReferenceId(intentHash, resourceName, source, index) {
    const input = `${intentHash}:sim:${resourceName}:${source}:${index}`;
    const hash = createHash('sha256').update(input).digest('hex').substring(0, 12);
    return `sim-ref-${hash}`;
}
/**
 * Extract simulation status from properties.
 */
function extractStatus(properties) {
    const statusKeys = ['status', 'simulationStatus', 'simulation_status', 'state'];
    for (const key of statusKeys) {
        const value = findProperty(properties, key);
        if (typeof value === 'string') {
            const normalized = value.toLowerCase();
            if (normalized === 'completed' || normalized === 'complete' || normalized === 'success') {
                return 'completed';
            }
            if (normalized === 'partial' || normalized === 'incomplete') {
                return 'partial';
            }
            if (normalized === 'failed' || normalized === 'error') {
                return 'failed';
            }
            if (normalized === 'running' || normalized === 'in-progress' || normalized === 'active') {
                return 'in-progress';
            }
            if (normalized === 'archived') {
                return 'archived';
            }
        }
    }
    return 'completed'; // Default to completed for exportable artifacts
}
/**
 * Find a property value by key (case-insensitive).
 */
function findProperty(properties, key) {
    const lowerKey = key.toLowerCase();
    for (const [k, v] of Object.entries(properties)) {
        if (k.toLowerCase() === lowerKey || k.toLowerCase().replace(/[-_]/g, '') === lowerKey.replace(/[-_]/g, '')) {
            return v;
        }
    }
    return undefined;
}
// =============================================================================
// MAIN DETECTOR CLASS
// =============================================================================
/**
 * Simulation Artifact Detector class.
 *
 * Detects simulation artifacts in deployment intents and optionally generates
 * implementation plans from the detected artifacts.
 *
 * All operations are deterministic and produce identical output for
 * identical input.
 */
export class SimulationArtifactDetector {
    options;
    constructor(options = {}) {
        this.options = {
            minConfidence: options.minConfidence ?? 0.5,
            generatePlan: options.generatePlan ?? true,
            includeOriginalProperties: options.includeOriginalProperties ?? true,
        };
    }
    /**
     * Detect simulation artifacts in a validated intent.
     *
     * @param intent - The validated deployment intent to scan
     * @returns Detection result with all found references and optional plan
     */
    detect(intent) {
        const references = [];
        const timestamp = intent.createdAt;
        const intentHash = intent.checksum;
        // Scan all resources
        const resources = intent.spec.resources;
        for (let i = 0; i < resources.length; i++) {
            const resource = resources[i];
            const resourceRefs = this.detectResourceReferences(resource, i, intentHash, timestamp);
            references.push(...resourceRefs);
        }
        // Sort for determinism
        references.sort((a, b) => a.referenceId.localeCompare(b.referenceId, 'en'));
        // Generate summary
        const summary = this.generateSummary(references);
        // Generate implementation plan if enabled and sufficient artifacts found
        let implementationPlan;
        if (this.options.generatePlan && references.length >= 1) {
            implementationPlan = this.generateImplementationPlan(references, intent.intentId, intent.version, intentHash, timestamp);
        }
        const result = {
            hasSimulationArtifacts: references.length > 0,
            references,
            summary: {
                ...summary,
                planItemCount: implementationPlan?.items.length ?? 0,
            },
            ...(implementationPlan !== undefined && { implementationPlan }),
        };
        return result;
    }
    /**
     * Detect simulation references in a single resource.
     */
    detectResourceReferences(resource, resourceIndex, intentHash, _timestamp) {
        const references = [];
        let refIndex = 0;
        // Check resource type
        const typeMatch = detectSourceFromType(resource.type);
        if (typeMatch && typeMatch.confidence >= this.options.minConfidence) {
            const reference = this.createReference(resource, resourceIndex, refIndex++, intentHash, typeMatch.source, typeMatch.artifactType, typeMatch.confidence);
            references.push(reference);
        }
        // Check properties
        const propertyMatches = detectSourceFromProperties(resource.properties);
        for (const match of propertyMatches) {
            if (match.confidence >= this.options.minConfidence) {
                // Avoid duplicates by checking if we already have a higher confidence match
                const existingRef = references.find(r => r.source === match.source && r.resourceName === resource.name);
                if (!existingRef || existingRef.confidence < match.confidence) {
                    if (existingRef) {
                        // Remove lower confidence duplicate
                        const idx = references.indexOf(existingRef);
                        references.splice(idx, 1);
                    }
                    const reference = this.createReference(resource, resourceIndex, refIndex++, intentHash, match.source, match.artifactType, match.confidence);
                    references.push(reference);
                }
            }
        }
        return references;
    }
    /**
     * Create a simulation artifact reference.
     */
    createReference(resource, resourceIndex, refIndex, intentHash, source, artifactType, confidence) {
        const properties = this.options.includeOriginalProperties
            ? resource.properties
            : {};
        const status = extractStatus(resource.properties);
        const simulationId = this.extractStringProperty(resource.properties, ['simulationId', 'simulation_id', 'simId']);
        const scenarioId = this.extractStringProperty(resource.properties, ['scenarioId', 'scenario_id']);
        const executedAt = this.extractStringProperty(resource.properties, ['executedAt', 'executed_at', 'timestamp']);
        const durationMs = this.extractNumberProperty(resource.properties, ['durationMs', 'duration_ms', 'duration']);
        const baseReference = {
            referenceId: generateReferenceId(intentHash, resource.name, source, refIndex),
            source,
            artifactType,
            status,
            sourceType: resource.type,
            sourcePath: `$.spec.resources[${resourceIndex}]`,
            resourceName: resource.name,
            originalProperties: properties,
            confidence,
        };
        // Build complete reference with conditional optional properties
        const result = {
            ...baseReference,
            ...(simulationId !== undefined && { simulationId }),
            ...(scenarioId !== undefined && { scenarioId }),
            ...(executedAt !== undefined && { executedAt }),
            ...(durationMs !== undefined && { durationMs }),
        };
        return result;
    }
    /**
     * Extract string property from properties object.
     */
    extractStringProperty(properties, keys) {
        for (const key of keys) {
            const value = findProperty(properties, key);
            if (typeof value === 'string') {
                return value;
            }
        }
        return undefined;
    }
    /**
     * Extract number property from properties object.
     */
    extractNumberProperty(properties, keys) {
        for (const key of keys) {
            const value = findProperty(properties, key);
            if (typeof value === 'number') {
                return value;
            }
        }
        return undefined;
    }
    /**
     * Generate detection summary.
     */
    generateSummary(references) {
        const bySource = {};
        const byArtifactType = {};
        const byStatus = {};
        for (const ref of references) {
            bySource[ref.source] = (bySource[ref.source] ?? 0) + 1;
            byArtifactType[ref.artifactType] = (byArtifactType[ref.artifactType] ?? 0) + 1;
            byStatus[ref.status] = (byStatus[ref.status] ?? 0) + 1;
        }
        return {
            totalReferences: references.length,
            bySource,
            byArtifactType,
            byStatus,
            highConfidenceCount: references.filter(r => r.confidence >= 0.9).length,
        };
    }
    /**
     * Generate implementation plan from detected simulation artifacts.
     */
    generateImplementationPlan(references, intentId, intentVersion, intentHash, timestamp) {
        const planId = this.generatePlanId(intentHash);
        const items = this.generatePlanItems(references, intentHash);
        const phases = this.generatePhases(items);
        const recommendations = this.generateRecommendations(references, intentHash);
        const metrics = this.extractAggregateMetrics(references);
        const audit = {
            intentId,
            intentVersion,
            intentHash,
            generatedAt: timestamp,
            exporterVersion: '1.0.0',
            simulationCount: references.length,
            confidenceSummary: this.generateConfidenceSummary(references),
        };
        return {
            planId,
            version: '1.0.0',
            createdAt: timestamp,
            sourceIntentId: intentId,
            sourceIntentHash: intentHash,
            summary: this.generatePlanSummary(references, items),
            phases,
            items,
            simulationReferences: references.map(r => r.referenceId),
            recommendations,
            metrics,
            audit,
        };
    }
    /**
     * Generate a deterministic plan ID.
     */
    generatePlanId(intentHash) {
        const hash = createHash('sha256')
            .update(`plan:${intentHash}`)
            .digest('hex')
            .substring(0, 16);
        return `impl-plan-${hash}`;
    }
    /**
     * Generate plan items from simulation references.
     */
    generatePlanItems(references, intentHash) {
        const items = [];
        for (const ref of references) {
            const item = this.createPlanItemFromReference(ref, intentHash, items.length);
            items.push(item);
        }
        return items.sort((a, b) => {
            const priorityOrder = {
                critical: 0,
                high: 1,
                medium: 2,
                low: 3,
                informational: 4,
            };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }
    /**
     * Create a plan item from a simulation reference.
     */
    createPlanItemFromReference(ref, intentHash, index) {
        const itemId = createHash('sha256')
            .update(`item:${intentHash}:${ref.referenceId}:${index}`)
            .digest('hex')
            .substring(0, 12);
        const phaseMap = {
            'scenario-result': 'Planning',
            'capacity-model': 'Capacity Planning',
            'load-profile': 'Performance Optimization',
            'behavior-trace': 'Behavior Analysis',
            'state-timeline': 'State Management',
            'decision-tree': 'Decision Implementation',
            'optimization-result': 'Optimization',
            'sensitivity-analysis': 'Risk Mitigation',
            'forecast-projection': 'Forecasting',
            'risk-assessment': 'Risk Management',
            'resource-allocation': 'Resource Provisioning',
            'workflow-simulation': 'Workflow Implementation',
            'event-log': 'Event Processing',
            'metric-collection': 'Monitoring Setup',
        };
        const priorityMap = {
            'risk-assessment': 'high',
            'capacity-model': 'high',
            'load-profile': 'high',
            'optimization-result': 'medium',
            'resource-allocation': 'medium',
            'scenario-result': 'medium',
            'forecast-projection': 'medium',
            'decision-tree': 'medium',
            'workflow-simulation': 'medium',
            'sensitivity-analysis': 'low',
            'behavior-trace': 'low',
            'state-timeline': 'low',
            'event-log': 'low',
            'metric-collection': 'low',
        };
        return {
            itemId: `plan-item-${itemId}`,
            title: `Implement ${ref.artifactType.replace(/-/g, ' ')} from ${ref.resourceName}`,
            description: `Implementation based on ${ref.artifactType} simulation artifact from ${ref.source}.`,
            priority: priorityMap[ref.artifactType] ?? 'medium',
            status: 'proposed',
            phase: phaseMap[ref.artifactType] ?? 'Implementation',
            prerequisites: [],
            affectedResources: [ref.resourceName],
            simulationEvidence: [ref.referenceId],
            successCriteria: [
                `${ref.artifactType} recommendations implemented`,
                'Performance validated against simulation projections',
            ],
            risks: ref.confidence < 0.8
                ? ['Lower confidence simulation data - additional validation recommended']
                : [],
        };
    }
    /**
     * Generate implementation phases from plan items.
     */
    generatePhases(items) {
        const phaseMap = new Map();
        for (const item of items) {
            const existing = phaseMap.get(item.phase) ?? [];
            existing.push(item.itemId);
            phaseMap.set(item.phase, existing);
        }
        const phases = [];
        const phaseOrder = [
            'Planning',
            'Capacity Planning',
            'Risk Management',
            'Resource Provisioning',
            'Performance Optimization',
            'Optimization',
            'Workflow Implementation',
            'Decision Implementation',
            'State Management',
            'Behavior Analysis',
            'Forecasting',
            'Risk Mitigation',
            'Event Processing',
            'Monitoring Setup',
            'Implementation',
        ];
        let order = 1;
        for (const phaseName of phaseOrder) {
            const itemIds = phaseMap.get(phaseName);
            if (itemIds && itemIds.length > 0) {
                phases.push({
                    phaseId: `phase-${order}`,
                    name: phaseName,
                    description: `${phaseName} phase based on simulation analysis`,
                    order,
                    itemIds,
                });
                order++;
            }
        }
        return phases;
    }
    /**
     * Generate recommendations from simulation references.
     */
    generateRecommendations(references, intentHash) {
        const recommendations = [];
        // Group references by artifact type
        const byType = new Map();
        for (const ref of references) {
            const existing = byType.get(ref.artifactType) ?? [];
            existing.push(ref);
            byType.set(ref.artifactType, existing);
        }
        // Generate type-specific recommendations
        for (const [artifactType, refs] of byType) {
            const recId = createHash('sha256')
                .update(`rec:${intentHash}:${artifactType}`)
                .digest('hex')
                .substring(0, 12);
            const recommendation = this.generateTypeRecommendation(artifactType, refs, recId);
            if (recommendation) {
                recommendations.push(recommendation);
            }
        }
        return recommendations.sort((a, b) => {
            const priorityOrder = {
                critical: 0,
                high: 1,
                medium: 2,
                low: 3,
                informational: 4,
            };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }
    /**
     * Generate a recommendation for a specific artifact type.
     */
    generateTypeRecommendation(artifactType, refs, recId) {
        const recommendationTemplates = {
            'capacity-model': {
                priority: 'high',
                category: 'Capacity Planning',
                title: 'Review capacity model findings',
                description: 'Capacity simulation results indicate resource sizing recommendations.',
                actionItems: [
                    'Review recommended resource allocations',
                    'Validate capacity thresholds against business requirements',
                    'Plan for peak load scenarios',
                ],
            },
            'load-profile': {
                priority: 'high',
                category: 'Performance',
                title: 'Implement load profile recommendations',
                description: 'Load testing simulations provide performance baselines and scaling guidance.',
                actionItems: [
                    'Configure auto-scaling based on load patterns',
                    'Implement caching for high-load endpoints',
                    'Set up performance monitoring alerts',
                ],
            },
            'risk-assessment': {
                priority: 'high',
                category: 'Risk Management',
                title: 'Address identified risks',
                description: 'Risk simulations have identified potential issues requiring mitigation.',
                actionItems: [
                    'Review risk factors and likelihood assessments',
                    'Implement mitigation strategies for high-priority risks',
                    'Establish monitoring for risk indicators',
                ],
            },
            'scenario-result': {
                priority: 'medium',
                category: 'Planning',
                title: 'Incorporate scenario analysis',
                description: 'Scenario simulation results provide guidance for implementation decisions.',
                actionItems: [
                    'Review scenario outcomes and recommendations',
                    'Align implementation with optimal scenario path',
                    'Document decision rationale based on simulations',
                ],
            },
            'optimization-result': {
                priority: 'medium',
                category: 'Optimization',
                title: 'Apply optimization recommendations',
                description: 'Optimization simulations suggest efficiency improvements.',
                actionItems: [
                    'Review optimization parameters and trade-offs',
                    'Implement recommended configuration changes',
                    'Validate optimizations in staging environment',
                ],
            },
            'resource-allocation': {
                priority: 'medium',
                category: 'Resource Management',
                title: 'Follow resource allocation guidance',
                description: 'Resource allocation simulations provide sizing and distribution recommendations.',
                actionItems: [
                    'Provision resources according to simulation recommendations',
                    'Configure resource limits and requests',
                    'Set up resource monitoring and alerts',
                ],
            },
            'forecast-projection': {
                priority: 'medium',
                category: 'Planning',
                title: 'Plan for forecasted growth',
                description: 'Forecast projections indicate future capacity and scaling needs.',
                actionItems: [
                    'Review growth projections and timelines',
                    'Plan capacity increases ahead of projected demand',
                    'Budget for forecasted resource needs',
                ],
            },
            'workflow-simulation': {
                priority: 'medium',
                category: 'Workflow',
                title: 'Implement workflow optimizations',
                description: 'Workflow simulations identify process improvements.',
                actionItems: [
                    'Review workflow bottleneck analysis',
                    'Implement parallel processing where recommended',
                    'Optimize task sequencing based on simulation data',
                ],
            },
            'decision-tree': {
                priority: 'medium',
                category: 'Decision Support',
                title: 'Apply decision tree logic',
                description: 'Decision tree simulations provide branching logic recommendations.',
                actionItems: [
                    'Implement decision logic based on simulation branches',
                    'Configure condition evaluations',
                    'Test decision paths in staging',
                ],
            },
            'sensitivity-analysis': {
                priority: 'low',
                category: 'Analysis',
                title: 'Consider sensitivity findings',
                description: 'Sensitivity analysis reveals impact of variable changes.',
                actionItems: [
                    'Review sensitivity parameters and thresholds',
                    'Implement monitoring for sensitive variables',
                    'Document acceptable ranges for key parameters',
                ],
            },
            'behavior-trace': {
                priority: 'low',
                category: 'Analysis',
                title: 'Review behavior patterns',
                description: 'Behavior trace analysis provides usage pattern insights.',
                actionItems: [
                    'Review behavior patterns and anomalies',
                    'Implement monitoring for unexpected behaviors',
                    'Document expected behavior baselines',
                ],
            },
            'state-timeline': {
                priority: 'low',
                category: 'State Management',
                title: 'Implement state transitions',
                description: 'State timeline analysis informs state management design.',
                actionItems: [
                    'Review state transition sequences',
                    'Implement state persistence based on timeline data',
                    'Configure state recovery mechanisms',
                ],
            },
            'event-log': {
                priority: 'low',
                category: 'Events',
                title: 'Configure event handling',
                description: 'Event log analysis provides event processing guidance.',
                actionItems: [
                    'Review event patterns and frequencies',
                    'Configure event handlers based on simulation data',
                    'Set up event monitoring and alerting',
                ],
            },
            'metric-collection': {
                priority: 'informational',
                category: 'Monitoring',
                title: 'Set up metrics collection',
                description: 'Metrics simulation data informs monitoring configuration.',
                actionItems: [
                    'Configure metrics collection based on simulation data',
                    'Set up dashboards for key metrics',
                    'Establish alerting thresholds',
                ],
            },
        };
        const template = recommendationTemplates[artifactType];
        if (!template) {
            return null;
        }
        return {
            recommendationId: `rec-${recId}`,
            priority: template.priority,
            category: template.category,
            title: template.title,
            description: template.description,
            actionItems: template.actionItems,
            relatedReferences: refs.map(r => r.referenceId),
        };
    }
    /**
     * Extract aggregate metrics from simulation references.
     */
    extractAggregateMetrics(references) {
        // Aggregate metrics from original properties (passive extraction only)
        const performance = {};
        const resourceUtilization = {};
        const costProjections = {};
        const capacityThresholds = {};
        for (const ref of references) {
            const props = ref.originalProperties;
            // Extract performance metrics
            this.extractMetricValues(props, ['latency', 'throughput', 'responseTime'], performance);
            // Extract utilization metrics
            this.extractMetricValues(props, ['cpuUtilization', 'memoryUtilization', 'utilization'], resourceUtilization);
            // Extract cost projections
            this.extractMetricValues(props, ['cost', 'projectedCost', 'monthlyCost'], costProjections);
            // Extract capacity thresholds
            this.extractMetricValues(props, ['capacity', 'threshold', 'limit'], capacityThresholds);
        }
        const result = {
            ...(Object.keys(performance).length > 0 && { performance }),
            ...(Object.keys(resourceUtilization).length > 0 && { resourceUtilization }),
            ...(Object.keys(costProjections).length > 0 && { costProjections }),
            ...(Object.keys(capacityThresholds).length > 0 && { capacityThresholds }),
        };
        return result;
    }
    /**
     * Extract metric values from properties.
     */
    extractMetricValues(props, keys, target) {
        for (const key of keys) {
            const value = findProperty(props, key);
            if (typeof value === 'number') {
                target[key] = value;
            }
        }
    }
    /**
     * Generate confidence summary.
     */
    generateConfidenceSummary(references) {
        const summary = {};
        let high = 0;
        let medium = 0;
        let low = 0;
        for (const ref of references) {
            if (ref.confidence >= 0.9)
                high++;
            else if (ref.confidence >= 0.7)
                medium++;
            else
                low++;
        }
        if (high > 0)
            summary.high = high;
        if (medium > 0)
            summary.medium = medium;
        if (low > 0)
            summary.low = low;
        return summary;
    }
    /**
     * Generate plan summary text.
     */
    generatePlanSummary(references, items) {
        const sources = new Set(references.map(r => r.source));
        const types = new Set(references.map(r => r.artifactType));
        return `Implementation plan derived from ${references.length} simulation artifact(s) ` +
            `from ${sources.size} source(s) covering ${types.size} artifact type(s). ` +
            `Plan contains ${items.length} implementation item(s) across multiple phases.`;
    }
}
/**
 * Factory function to create a Simulation Artifact Detector.
 */
export function createSimulationArtifactDetector(options) {
    return new SimulationArtifactDetector(options);
}
//# sourceMappingURL=detector.js.map