/**
 * Chart.yaml Generator for Helm Charts
 *
 * Generates deterministic Helm Chart.yaml metadata from NormalizedIntent.
 * All output is reproducible and follows the Helm Chart v2 specification.
 *
 * @module exporters/helm/ChartGenerator
 * @version 1.0.0
 */
// =============================================================================
// CONSTANTS
// =============================================================================
/**
 * Default chart API version (Helm v3+).
 */
const CHART_API_VERSION = 'v2';
/**
 * Default chart type.
 */
const DEFAULT_CHART_TYPE = 'application';
// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
/**
 * Sanitize a name for Helm chart naming conventions.
 * Helm chart names must be lowercase alphanumeric with hyphens.
 *
 * @param name - Input name to sanitize
 * @returns Sanitized chart name
 */
function sanitizeChartName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 53); // Helm chart names limited to 53 chars for DNS compatibility
}
/**
 * Extract a description from the intent for the chart.
 *
 * @param intent - Normalized intent
 * @returns Chart description
 */
function extractDescription(intent) {
    // Check for explicit description in spec
    const spec = intent.spec;
    if (typeof spec['description'] === 'string' && spec['description'].length > 0) {
        return spec['description'];
    }
    // Generate a default description
    const resourceCount = intent.spec.resources.length;
    const resourceTypes = Array.from(new Set(intent.spec.resources.map((r) => r.type))).sort();
    return `Helm chart for ${intent.intentId} containing ${resourceCount} resource(s): ${resourceTypes.join(', ')}`;
}
/**
 * Extract keywords from the intent for chart metadata.
 *
 * @param intent - Normalized intent
 * @returns Sorted array of keywords
 */
function extractKeywords(intent) {
    const keywords = [];
    // Add provider as keyword
    if (intent.spec.target.provider) {
        keywords.push(intent.spec.target.provider);
    }
    // Add environment as keyword
    if (intent.spec.target.environment) {
        keywords.push(intent.spec.target.environment);
    }
    // Extract resource types as keywords
    for (const resource of intent.spec.resources) {
        const typeKeyword = resource.type.split('/').pop() ?? resource.type;
        keywords.push(typeKeyword.toLowerCase());
    }
    // Add standard keywords
    keywords.push('agentics');
    keywords.push('deployment');
    keywords.push('kubernetes');
    // Deduplicate and sort
    return Array.from(new Set(keywords)).sort();
}
/**
 * Extract maintainers from the intent provenance.
 *
 * @param intent - Normalized intent
 * @returns Array of maintainer info (empty if none found)
 */
function extractMaintainers(intent) {
    const maintainers = [];
    const seenActors = [];
    // Check provenance audit trail for actor info
    if (intent.provenance?.auditTrail) {
        for (const entry of intent.provenance.auditTrail) {
            if (entry.actor && !seenActors.includes(entry.actor)) {
                seenActors.push(entry.actor);
                maintainers.push({
                    name: entry.actor,
                });
            }
        }
    }
    // Sort by name for determinism
    return maintainers.sort((a, b) => a.name.localeCompare(b.name, 'en'));
}
// =============================================================================
// MAIN GENERATOR
// =============================================================================
/**
 * ChartGenerator creates Helm Chart.yaml metadata from NormalizedIntent.
 *
 * Design principles:
 * - Deterministic output (same intent = same Chart.yaml)
 * - All values derived from intent (no runtime dependencies)
 * - Chart version derived from intent version (reproducible)
 */
export class ChartGenerator {
    /**
     * Generate Helm Chart.yaml content from normalized intent.
     *
     * The chart version is derived directly from the intent version
     * to ensure deterministic, reproducible outputs.
     *
     * @param intent - Normalized deployment intent
     * @param options - Optional generation options
     * @returns HelmChart structure ready for serialization
     */
    generateChartYaml(intent, options) {
        const chartName = sanitizeChartName(intent.intentId);
        const description = extractDescription(intent);
        const keywords = extractKeywords(intent);
        const maintainers = extractMaintainers(intent);
        // Base chart structure
        const chart = {
            apiVersion: CHART_API_VERSION,
            name: chartName,
            version: intent.version,
            appVersion: this.extractAppVersion(intent),
            description: description,
            type: options?.chartType ?? DEFAULT_CHART_TYPE,
            keywords: keywords.length > 0 ? keywords : undefined,
            maintainers: maintainers.length > 0 ? maintainers : undefined,
            home: options?.homeUrl,
            sources: options?.sourceUrls,
            icon: options?.iconUrl,
            kubeVersion: options?.kubeVersion,
            deprecated: false,
            annotations: this.generateAnnotations(intent),
            dependencies: options?.dependencies,
        };
        // Remove undefined values for clean output
        return this.cleanChartObject(chart);
    }
    /**
     * Extract application version from intent.
     * Looks for version info in resources or falls back to intent version.
     *
     * @param intent - Normalized intent
     * @returns Application version string
     */
    extractAppVersion(intent) {
        // Look for container image tags as app version
        for (const resource of intent.spec.resources) {
            const props = resource.properties;
            // Check for image property with tag
            if (typeof props['image'] === 'string') {
                const imageTag = this.extractImageTag(props['image']);
                if (imageTag && imageTag !== 'latest') {
                    return imageTag;
                }
            }
            // Check for container spec with image
            if (typeof props['container'] === 'object' && props['container'] !== null) {
                const container = props['container'];
                if (typeof container['image'] === 'string') {
                    const imageTag = this.extractImageTag(container['image']);
                    if (imageTag && imageTag !== 'latest') {
                        return imageTag;
                    }
                }
            }
        }
        // Fall back to intent version
        return intent.version;
    }
    /**
     * Extract tag from a container image string.
     *
     * @param image - Image string (e.g., "nginx:1.21" or "gcr.io/project/app:v1.2.3")
     * @returns Extracted tag or undefined
     */
    extractImageTag(image) {
        // Handle digest format (ignore for versioning)
        if (image.includes('@sha256:')) {
            return undefined;
        }
        // Extract tag after last colon (but not port in registry URL)
        const lastColonIndex = image.lastIndexOf(':');
        if (lastColonIndex === -1) {
            return undefined;
        }
        // Check if this is a port number (registry URL) or tag
        const potentialTag = image.slice(lastColonIndex + 1);
        if (/^\d+$/.test(potentialTag) && image.slice(0, lastColonIndex).includes('/')) {
            // This looks like a port number in registry URL
            return undefined;
        }
        return potentialTag;
    }
    /**
     * Generate chart annotations from intent metadata.
     *
     * @param intent - Normalized intent
     * @returns Annotations record
     */
    generateAnnotations(intent) {
        const annotations = {};
        // Add traceability annotations
        annotations['agentics.io/intent-id'] = intent.intentId;
        annotations['agentics.io/intent-version'] = intent.version;
        annotations['agentics.io/schema-version'] = intent.schemaVersion;
        annotations['agentics.io/canonical-hash'] = intent.canonicalHash;
        // Add normalization info
        annotations['agentics.io/normalizer-version'] = intent.normalization.normalizerVersion;
        annotations['agentics.io/normalized-at'] = intent.normalization.normalizedAt;
        // Add provider info if available
        if (intent.spec.target.provider) {
            annotations['agentics.io/target-provider'] = intent.spec.target.provider;
        }
        // Sort keys for deterministic output
        const sortedAnnotations = {};
        for (const key of Object.keys(annotations).sort()) {
            sortedAnnotations[key] = annotations[key];
        }
        return Object.freeze(sortedAnnotations);
    }
    /**
     * Remove undefined properties from chart object for clean YAML output.
     *
     * @param chart - Chart object to clean
     * @returns Cleaned chart object
     */
    cleanChartObject(chart) {
        const cleaned = {};
        const chartAsRecord = chart;
        // Process in deterministic order (alphabetical)
        const keys = Object.keys(chartAsRecord).sort();
        for (const key of keys) {
            const value = chartAsRecord[key];
            if (value !== undefined && value !== null) {
                // Handle empty arrays/objects
                if (Array.isArray(value) && value.length === 0) {
                    continue;
                }
                if (typeof value === 'object' && Object.keys(value).length === 0) {
                    continue;
                }
                cleaned[key] = value;
            }
        }
        return cleaned;
    }
}
//# sourceMappingURL=ChartGenerator.js.map