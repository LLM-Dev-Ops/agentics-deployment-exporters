/**
 * DefaultResolver Module
 *
 * Applies default values to ValidatedIntent in a deterministic order.
 * All defaults are defined centrally to ensure consistency and traceability.
 *
 * Key principles:
 * - Defaults come ONLY from intent schema, not exporter preferences
 * - Applied in deterministic order (alphabetical by path)
 * - Records all applied defaults for audit trail
 *
 * @module core/normalizer/DefaultResolver
 */

import {
  AppliedDefault,
  DEFAULT_VALUES,
  EnvVar,
  isArray,
  isPlainObject,
  NormalizationError,
  Port,
  ResourceSpec,
  Secret,
  ValidatedIntent,
} from './types.js';

/**
 * Options for default resolution
 */
export interface DefaultResolverOptions {
  /**
   * Whether to record applied defaults for audit
   * @default true
   */
  readonly recordAppliedDefaults?: boolean;

  /**
   * Custom default values to merge with schema defaults
   */
  readonly customDefaults?: Record<string, unknown>;

  /**
   * Strict mode - fail if required field is missing even after defaults
   * @default true
   */
  readonly strict?: boolean;
}

/**
 * Result of default resolution
 */
export interface DefaultResolutionResult {
  /**
   * The intent with defaults applied
   */
  readonly intent: ValidatedIntent;

  /**
   * List of defaults that were applied
   */
  readonly appliedDefaults: readonly AppliedDefault[];
}

/**
 * Default value definition
 */
interface DefaultDefinition {
  readonly path: string;
  readonly value: unknown;
  readonly condition?: (intent: ValidatedIntent) => boolean;
}

/**
 * Central registry of all default values
 * Sorted alphabetically by path for determinism
 */
const DEFAULT_DEFINITIONS: readonly DefaultDefinition[] = [
  {
    path: '$.metadata.annotations',
    value: {},
  },
  {
    path: '$.metadata.labels',
    value: {},
  },
  {
    path: '$.metadata.namespace',
    value: DEFAULT_VALUES.namespace,
  },
  {
    path: '$.metadata.version',
    value: DEFAULT_VALUES.version,
  },
  {
    path: '$.spec.dependsOn',
    value: [],
  },
  {
    path: '$.spec.env',
    value: [],
  },
  {
    path: '$.spec.ports',
    value: [],
  },
  {
    path: '$.spec.replicas',
    value: DEFAULT_VALUES.replicas,
  },
  {
    path: '$.spec.resources',
    value: DEFAULT_VALUES.resources,
  },
  {
    path: '$.spec.secrets',
    value: [],
  },
].sort((a, b) => a.path.localeCompare(b.path, 'en'));

/**
 * Apply default values to a validated intent
 *
 * @param intent - The validated intent to apply defaults to
 * @param options - Default resolution options
 * @returns The intent with defaults applied and audit trail
 */
export function applyDefaults(
  intent: ValidatedIntent,
  options: DefaultResolverOptions = {}
): DefaultResolutionResult {
  const {
    recordAppliedDefaults = true,
    customDefaults = {},
    strict = true,
  } = options;

  const appliedDefaults: AppliedDefault[] = [];

  // Deep clone to avoid mutation
  const result = deepClone(intent);

  // Merge custom defaults with schema defaults (custom takes precedence)
  const allDefaults = mergeDefaults(DEFAULT_DEFINITIONS, customDefaults);

  // Apply defaults in deterministic order
  for (const def of allDefaults) {
    const currentValue = getValueAtPath(result, def.path);

    // Check condition if specified
    if (def.condition && !def.condition(result)) {
      continue;
    }

    // Only apply if value is missing
    if (currentValue === undefined) {
      setValueAtPath(result, def.path, deepClone(def.value));

      if (recordAppliedDefaults) {
        appliedDefaults.push({
          path: def.path,
          value: def.value,
          source: 'schema',
        });
      }
    }
  }

  // Apply port protocol defaults to existing ports
  const ports = getValueAtPath(result, '$.spec.ports') as readonly Port[] | undefined;
  if (isArray(ports)) {
    const normalizedPorts = ports.map((port, index) => {
      if (isPlainObject(port) && port.protocol === undefined) {
        if (recordAppliedDefaults) {
          appliedDefaults.push({
            path: `$.spec.ports[${index}].protocol`,
            value: DEFAULT_VALUES.protocol,
            source: 'schema',
          });
        }
        return { ...port, protocol: DEFAULT_VALUES.protocol } as Port;
      }
      return port;
    });
    setValueAtPath(result, '$.spec.ports', normalizedPorts);
  }

  // Apply createdAt default if not present (using deterministic approach)
  if (result.metadata.createdAt === undefined) {
    // Use a deterministic timestamp based on intent content when not provided
    // In production, this would come from the intent itself
    const defaultCreatedAt = '1970-01-01T00:00:00.000Z';
    setValueAtPath(result, '$.metadata.createdAt', defaultCreatedAt);

    if (recordAppliedDefaults) {
      appliedDefaults.push({
        path: '$.metadata.createdAt',
        value: defaultCreatedAt,
        source: 'schema',
      });
    }
  }

  // Validate required fields in strict mode
  if (strict) {
    validateRequiredFields(result);
  }

  // Sort applied defaults by path for deterministic output
  appliedDefaults.sort((a, b) => a.path.localeCompare(b.path, 'en'));

  return {
    intent: result as ValidatedIntent,
    appliedDefaults,
  };
}

/**
 * Merge custom defaults with schema defaults
 */
function mergeDefaults(
  schemaDefaults: readonly DefaultDefinition[],
  customDefaults: Record<string, unknown>
): readonly DefaultDefinition[] {
  const merged = new Map<string, DefaultDefinition>();

  // Add schema defaults
  for (const def of schemaDefaults) {
    merged.set(def.path, def);
  }

  // Override with custom defaults
  for (const [path, value] of Object.entries(customDefaults)) {
    const normalizedPath = path.startsWith('$.') ? path : `$.${path}`;
    merged.set(normalizedPath, { path: normalizedPath, value });
  }

  // Return sorted by path
  return [...merged.values()].sort((a, b) =>
    a.path.localeCompare(b.path, 'en')
  );
}

/**
 * Get value at a JSONPath-like path
 */
function getValueAtPath(obj: unknown, path: string): unknown {
  const parts = parsePath(path);
  let current: unknown = obj;

  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }

    if (isArray(current) && /^\d+$/.test(part)) {
      current = current[parseInt(part, 10)];
    } else if (isPlainObject(current)) {
      current = current[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Set value at a JSONPath-like path
 */
function setValueAtPath(obj: unknown, path: string, value: unknown): void {
  const parts = parsePath(path);

  if (parts.length === 0) {
    throw new NormalizationError(
      `Invalid path: ${path}`,
      'MISSING_REQUIRED_FIELD',
      path
    );
  }

  let current: unknown = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;

    if (current === undefined || current === null) {
      throw new NormalizationError(
        `Cannot set value at path ${path}: parent is undefined`,
        'MISSING_REQUIRED_FIELD',
        path
      );
    }

    if (isArray(current) && /^\d+$/.test(part)) {
      current = current[parseInt(part, 10)];
    } else if (isPlainObject(current)) {
      if (current[part] === undefined) {
        const nextPart = parts[i + 1];
        // Create intermediate objects/arrays as needed
        (current as Record<string, unknown>)[part] =
          nextPart && /^\d+$/.test(nextPart) ? [] : {};
      }
      current = current[part];
    }
  }

  const lastPart = parts[parts.length - 1]!;

  if (isPlainObject(current)) {
    (current as Record<string, unknown>)[lastPart] = value;
  } else if (isArray(current) && /^\d+$/.test(lastPart)) {
    (current as unknown[])[parseInt(lastPart, 10)] = value;
  }
}

/**
 * Parse a JSONPath-like path into parts
 */
function parsePath(path: string): string[] {
  // Remove leading $.
  const normalized = path.replace(/^\$\.?/, '');

  if (!normalized) {
    return [];
  }

  // Split by . and [] notation
  const parts: string[] = [];
  let current = '';
  let inBracket = false;

  for (const char of normalized) {
    if (char === '[') {
      if (current) {
        parts.push(current);
        current = '';
      }
      inBracket = true;
    } else if (char === ']') {
      if (current) {
        parts.push(current);
        current = '';
      }
      inBracket = false;
    } else if (char === '.' && !inBracket) {
      if (current) {
        parts.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

/**
 * Deep clone a value
 */
function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (isArray(value)) {
    return value.map(deepClone) as T;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }

  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = deepClone(v);
    }
    return result as T;
  }

  return value;
}

/**
 * Validate that all required fields are present
 */
function validateRequiredFields(intent: unknown): void {
  const obj = intent as Record<string, unknown>;

  // Required top-level fields
  const requiredTopLevel = ['apiVersion', 'kind', 'metadata', 'spec'];
  for (const field of requiredTopLevel) {
    if (obj[field] === undefined) {
      throw new NormalizationError(
        `Missing required field: ${field}`,
        'MISSING_REQUIRED_FIELD',
        `$.${field}`
      );
    }
  }

  // Required metadata fields
  const metadata = obj.metadata as Record<string, unknown> | undefined;
  if (metadata) {
    if (metadata.name === undefined) {
      throw new NormalizationError(
        'Missing required field: metadata.name',
        'MISSING_REQUIRED_FIELD',
        '$.metadata.name'
      );
    }
  }
}

/**
 * Get the list of all defined defaults
 * Useful for documentation and testing
 */
export function getDefaultDefinitions(): readonly DefaultDefinition[] {
  return DEFAULT_DEFINITIONS;
}

/**
 * Check if a field has a default value defined
 */
export function hasDefault(path: string): boolean {
  const normalizedPath = path.startsWith('$.') ? path : `$.${path}`;
  return DEFAULT_DEFINITIONS.some((def) => def.path === normalizedPath);
}

/**
 * Get the default value for a field
 */
export function getDefault(path: string): unknown {
  const normalizedPath = path.startsWith('$.') ? path : `$.${path}`;
  const def = DEFAULT_DEFINITIONS.find((d) => d.path === normalizedPath);
  return def?.value;
}

/**
 * Apply defaults to environment variables
 * Ensures consistent structure
 */
export function normalizeEnvVars(envVars: readonly EnvVar[]): readonly EnvVar[] {
  return envVars.map((env): EnvVar => {
    const result: EnvVar = { name: env.name };
    if (env.value !== undefined) {
      return { ...result, value: env.value };
    }
    if (env.valueFrom !== undefined) {
      return { ...result, valueFrom: env.valueFrom };
    }
    return result;
  });
}

/**
 * Apply defaults to ports
 * Ensures protocol is set
 */
export function normalizePorts(ports: readonly Port[]): readonly Port[] {
  return ports.map((port): Port => {
    const result: Port = {
      containerPort: port.containerPort,
      protocol: port.protocol ?? DEFAULT_VALUES.protocol,
    };
    if (port.name !== undefined) {
      return { ...result, name: port.name };
    }
    return result;
  });
}

/**
 * Apply defaults to secrets
 */
export function normalizeSecrets(secrets: readonly Secret[]): readonly Secret[] {
  return secrets.map((secret): Secret => {
    const result: Secret = {
      name: secret.name,
      type: secret.type ?? 'Opaque',
    };
    if (secret.data !== undefined) {
      return { ...result, data: secret.data };
    }
    return result;
  });
}

/**
 * Apply defaults to resource spec
 */
export function normalizeResources(
  resources: Partial<ResourceSpec> | undefined
): ResourceSpec {
  return {
    limits: {
      cpu: resources?.limits?.cpu ?? DEFAULT_VALUES.resources.limits.cpu,
      memory: resources?.limits?.memory ?? DEFAULT_VALUES.resources.limits.memory,
    },
    requests: {
      cpu: resources?.requests?.cpu ?? DEFAULT_VALUES.resources.requests.cpu,
      memory:
        resources?.requests?.memory ?? DEFAULT_VALUES.resources.requests.memory,
    },
  };
}
