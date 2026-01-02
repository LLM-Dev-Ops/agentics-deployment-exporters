/**
 * Reference Validator
 *
 * Validates internal references and checks for circular dependencies.
 * Ensures all referenced entities exist within the intent.
 */
import { ValidationErrorCodes } from './types.js';
// -----------------------------------------------------------------------------
// Reference Validator Class
// -----------------------------------------------------------------------------
/**
 * Validates internal references within a DeploymentIntent.
 * Checks that all referenced resources, secrets, and configs exist.
 * Detects circular dependencies in resource definitions.
 */
export class RefValidator {
    /**
     * Validate all references in the intent.
     *
     * @param intent - The parsed intent to validate
     * @returns Array of validation issues for any reference errors
     */
    validateReferences(intent) {
        const issues = [];
        const data = intent.data;
        const spec = data.spec;
        if (!spec) {
            return issues;
        }
        // Extract all defined entities
        const definedResources = this.extractResources(spec);
        const definedSecrets = this.extractSecrets(spec);
        const definedServices = this.extractServices(spec);
        // Validate resource dependencies
        issues.push(...this.validateResourceDependencies(definedResources));
        // Validate secret references in environment variables
        issues.push(...this.validateSecretReferences(spec, definedSecrets));
        // Validate circular dependencies
        issues.push(...this.validateCircularDependencies(definedResources));
        // Validate service references
        issues.push(...this.validateServiceReferences(spec, definedServices));
        return issues;
    }
    /**
     * Check for circular dependencies in the resource graph.
     *
     * @param intent - The parsed intent to check
     * @returns Result indicating if circular dependencies exist and the cycles found
     */
    detectCircularDependencies(intent) {
        const data = intent.data;
        const spec = data.spec;
        if (!spec) {
            return { hasCircular: false, cycles: [] };
        }
        const resources = this.extractResources(spec);
        return this.findCycles(resources);
    }
    /**
     * Get all internal references from the intent.
     *
     * @param intent - The parsed intent to analyze
     * @returns Array of all internal references found
     */
    extractAllReferences(intent) {
        const references = [];
        const data = intent.data;
        const spec = data.spec;
        if (!spec) {
            return references;
        }
        // Extract resource dependency references
        const resources = spec.resources;
        if (resources) {
            for (let i = 0; i < resources.length; i++) {
                const resource = resources[i];
                if (resource) {
                    const dependsOn = resource.dependsOn;
                    if (dependsOn) {
                        for (const dep of dependsOn) {
                            references.push({
                                type: 'resource',
                                name: dep,
                                sourcePath: `$.spec.resources[${i}].dependsOn`,
                            });
                        }
                    }
                }
            }
        }
        // Extract secret references from env vars
        const envVars = spec.env;
        if (envVars) {
            for (let i = 0; i < envVars.length; i++) {
                const envVar = envVars[i];
                if (envVar) {
                    const valueFrom = envVar.valueFrom;
                    if (valueFrom?.secretKeyRef) {
                        const secretRef = valueFrom.secretKeyRef;
                        references.push({
                            type: 'secret',
                            name: secretRef.name ?? '',
                            sourcePath: `$.spec.env[${i}].valueFrom.secretKeyRef`,
                        });
                    }
                }
            }
        }
        return references;
    }
    // ---------------------------------------------------------------------------
    // Private Methods
    // ---------------------------------------------------------------------------
    /**
     * Extract resource definitions from spec.
     */
    extractResources(spec) {
        const resources = new Map();
        const resourceList = spec.resources;
        if (!resourceList) {
            return resources;
        }
        for (let i = 0; i < resourceList.length; i++) {
            const resource = resourceList[i];
            if (resource) {
                const type = resource.type;
                const name = resource.name;
                const dependsOn = resource.dependsOn ?? [];
                const key = `${type}/${name}`;
                resources.set(key, {
                    type,
                    name,
                    dependsOn,
                    path: `$.spec.resources[${i}]`,
                });
            }
        }
        return resources;
    }
    /**
     * Extract secret definitions from spec.
     */
    extractSecrets(spec) {
        const secrets = new Map();
        const secretList = spec.secrets;
        if (!secretList) {
            return secrets;
        }
        for (let i = 0; i < secretList.length; i++) {
            const secret = secretList[i];
            if (secret) {
                const name = secret.name;
                secrets.set(name, {
                    name,
                    path: `$.spec.secrets[${i}]`,
                });
            }
        }
        return secrets;
    }
    /**
     * Extract service definitions from spec.
     */
    extractServices(spec) {
        const services = new Map();
        const serviceList = spec.services;
        if (!serviceList) {
            return services;
        }
        for (let i = 0; i < serviceList.length; i++) {
            const service = serviceList[i];
            if (service) {
                const name = service.name;
                services.set(name, {
                    name,
                    path: `$.spec.services[${i}]`,
                });
            }
        }
        return services;
    }
    /**
     * Validate that all resource dependencies reference existing resources.
     */
    validateResourceDependencies(resources) {
        const issues = [];
        for (const [, resource] of resources) {
            for (const dep of resource.dependsOn) {
                if (!resources.has(dep)) {
                    issues.push({
                        code: ValidationErrorCodes.REF_UNDEFINED_RESOURCE,
                        category: 'REF_ERROR',
                        severity: 'error',
                        message: `Resource dependency "${dep}" is not defined`,
                        path: `${resource.path}.dependsOn`,
                        expected: 'A defined resource reference',
                        actual: dep,
                        remediation: `Define the resource "${dep}" in the resources section, or remove this dependency`,
                    });
                }
            }
        }
        return issues;
    }
    /**
     * Validate that all secret references in environment variables exist.
     */
    validateSecretReferences(spec, definedSecrets) {
        const issues = [];
        const envVars = spec.env;
        if (!envVars) {
            return issues;
        }
        for (let i = 0; i < envVars.length; i++) {
            const envVar = envVars[i];
            if (!envVar)
                continue;
            const valueFrom = envVar.valueFrom;
            if (!valueFrom)
                continue;
            // Check secret references
            const secretKeyRef = valueFrom.secretKeyRef;
            if (secretKeyRef) {
                const secretName = secretKeyRef.name;
                if (secretName && !definedSecrets.has(secretName)) {
                    issues.push({
                        code: ValidationErrorCodes.REF_UNDEFINED_SECRET,
                        category: 'REF_ERROR',
                        severity: 'error',
                        message: `Secret "${secretName}" referenced in environment variable is not defined`,
                        path: `$.spec.env[${i}].valueFrom.secretKeyRef.name`,
                        expected: 'A defined secret reference',
                        actual: secretName,
                        remediation: `Define the secret "${secretName}" in the secrets section`,
                    });
                }
            }
        }
        return issues;
    }
    /**
     * Validate circular dependencies in resource graph.
     */
    validateCircularDependencies(resources) {
        const issues = [];
        const result = this.findCycles(resources);
        if (result.hasCircular) {
            for (const cycle of result.cycles) {
                const cycleStr = cycle.join(' -> ');
                issues.push({
                    code: ValidationErrorCodes.REF_CIRCULAR_DEPENDENCY,
                    category: 'REF_ERROR',
                    severity: 'error',
                    message: `Circular dependency detected: ${cycleStr}`,
                    path: '$.spec.resources',
                    expected: 'Acyclic dependency graph',
                    actual: cycleStr,
                    remediation: 'Remove one of the dependencies to break the cycle',
                });
            }
        }
        return issues;
    }
    /**
     * Validate service references (e.g., in networking or config).
     */
    validateServiceReferences(spec, definedServices) {
        const issues = [];
        // Validate ingress host references if they reference internal services
        const networking = spec.networking;
        if (networking?.ingress) {
            const ingress = networking.ingress;
            // Additional service reference checks could go here
            // For now, this is a placeholder for future extension
            void ingress;
            void definedServices;
        }
        return issues;
    }
    /**
     * Find cycles in the resource dependency graph using DFS.
     */
    findCycles(resources) {
        const cycles = [];
        const visited = new Set();
        const recursionStack = new Set();
        const path = [];
        const dfs = (node) => {
            if (recursionStack.has(node)) {
                // Found a cycle - extract it
                const cycleStartIndex = path.indexOf(node);
                if (cycleStartIndex !== -1) {
                    const cycle = [...path.slice(cycleStartIndex), node];
                    cycles.push(cycle);
                }
                return true;
            }
            if (visited.has(node)) {
                return false;
            }
            visited.add(node);
            recursionStack.add(node);
            path.push(node);
            const resource = resources.get(node);
            if (resource) {
                for (const dep of resource.dependsOn) {
                    if (resources.has(dep)) {
                        dfs(dep);
                    }
                }
            }
            path.pop();
            recursionStack.delete(node);
            return false;
        };
        for (const [key] of resources) {
            if (!visited.has(key)) {
                dfs(key);
            }
        }
        return {
            hasCircular: cycles.length > 0,
            cycles,
        };
    }
}
//# sourceMappingURL=RefValidator.js.map