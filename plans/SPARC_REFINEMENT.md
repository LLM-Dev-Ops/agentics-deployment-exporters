# SPARC Refinement Phase: Enterprise Compliance and Quality Assurance

## Document Metadata

| Property | Value |
|----------|-------|
| Document ID | SPARC-REF-001 |
| Version | 1.0.0 |
| Classification | Internal - Technical Specification |
| Last Updated | 2026-01-02 |
| Status | Draft |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Determinism Guarantees](#2-determinism-guarantees)
3. [Schema Evolution Handling](#3-schema-evolution-handling)
4. [Failure Semantics](#4-failure-semantics)
5. [Validation Strategies](#5-validation-strategies)
6. [Guardrails](#6-guardrails)
7. [Enterprise Audit Considerations](#7-enterprise-audit-considerations)
8. [Implementation Verification Checklist](#8-implementation-verification-checklist)

---

## 1. Introduction

### 1.1 Purpose

This document defines the refinement criteria, validation strategies, and compliance requirements for the Agentics Deployment Exporters system. It establishes the quality gates that all exporter implementations must satisfy to meet enterprise audit, compliance, and repeatability requirements.

### 1.2 Scope

The refinement specifications apply to:

- All deployment exporter modules (Terraform, Kubernetes, Pulumi, CloudFormation, etc.)
- The core transformation engine
- Artifact packaging and distribution mechanisms
- Validation and verification subsystems

### 1.3 Design Principles

```
DETERMINISM     Pure functions, reproducible outputs
TRANSPARENCY    Complete audit trails, traceable decisions
ATOMICITY       All-or-nothing operations, no partial states
ISOLATION       Environment-independent transformations
VALIDATION      Multi-layer verification, fail-fast semantics
```

### 1.4 Compliance Targets

This system is designed to satisfy requirements from:

- SOC 2 Type II (Trust Service Criteria)
- ISO 27001 (Information Security Management)
- GDPR Article 30 (Records of Processing Activities)
- PCI-DSS Requirement 10 (Track and Monitor Access)
- FedRAMP Moderate (NIST 800-53)

---

## 2. Determinism Guarantees

### 2.1 Byte-for-Byte Reproducibility

#### 2.1.1 Core Guarantee

**Invariant**: Given the same `DeploymentIntent` version and exporter version, the system MUST produce byte-identical output across any execution environment, at any time, on any platform.

```typescript
// Formal specification
function deterministicExport(intent: DeploymentIntent): ExportArtifact {
  // Property: forall i1, i2 where canonicalize(i1) === canonicalize(i2)
  //   export(i1) === export(i2)  // byte-identical
}
```

#### 2.1.2 Timestamp Handling

| Strategy | Use Case | Implementation |
|----------|----------|----------------|
| **Frozen** | Embedded timestamps required by format | Use `intent.metadata.createdAt` exclusively |
| **Omitted** | Timestamps not semantically required | Strip all temporal data from output |
| **Synthetic** | Reproducible timestamps needed | Derive from `SHA256(intent.id + version)` |

**Prohibited Patterns**:
```typescript
// PROHIBITED: Runtime timestamp injection
const artifact = {
  created: new Date(),        // Non-deterministic
  modified: Date.now(),       // Non-deterministic
  timestamp: process.hrtime() // Non-deterministic
};

// REQUIRED: Intent-derived timestamps only
const artifact = {
  created: intent.metadata.createdAt,
  version: intent.metadata.version
};
```

#### 2.1.3 Random Value Elimination

All sources of non-determinism MUST be eliminated or controlled:

| Non-Determinism Source | Mitigation Strategy |
|------------------------|---------------------|
| `Math.random()` | Prohibited; use deterministic derivation |
| `crypto.randomBytes()` | Replace with HKDF from intent hash |
| UUIDs | Derive from intent content hash |
| Object iteration order | Explicit sorting before iteration |
| Set iteration order | Convert to sorted array |
| Map iteration order | Use ordered map implementation |
| Floating point operations | Use integer arithmetic or fixed-point |

#### 2.1.4 UUID Generation Strategy

UUIDs required in output artifacts MUST be derived deterministically:

```typescript
interface DeterministicUUID {
  // Generate UUID v5 using intent hash as namespace
  generate(
    intentHash: string,
    resourcePath: string[]
  ): string;
}

// Implementation specification
function generateDeterministicUUID(
  intentHash: string,
  resourcePath: string[]
): string {
  const namespace = UUID_NAMESPACE_AGENTICS; // Fixed namespace UUID
  const name = `${intentHash}:${resourcePath.join('/')}`;
  return uuidv5(name, namespace);
}

// Verification property
// generateUUID(intent, ['app', 'service', 'main']) ===
// generateUUID(intent, ['app', 'service', 'main'])  // Always true
```

### 2.2 Stable Ordering

#### 2.2.1 Map Key Ordering

All map/object structures in output MUST use alphabetical key ordering:

```typescript
interface OrderingPolicy {
  mapKeyOrder: 'alphabetical';
  arrayOrder: 'canonical-key' | 'dependency' | 'explicit';
  nestedOrder: 'recursive-alphabetical';
}

// Serialization example
function serializeMap(obj: Record<string, unknown>): string {
  const sortedKeys = Object.keys(obj).sort((a, b) =>
    a.localeCompare(b, 'en', { sensitivity: 'base' })
  );

  const ordered: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    ordered[key] = isObject(obj[key])
      ? serializeMap(obj[key] as Record<string, unknown>)
      : obj[key];
  }

  return JSON.stringify(ordered, null, 2);
}
```

#### 2.2.2 Array Element Ordering

Arrays MUST follow explicit ordering rules based on content type:

| Array Content Type | Ordering Rule |
|-------------------|---------------|
| Resources | By `resourceType + resourceName` |
| Dependencies | Topological sort by dependency graph |
| Labels/Tags | Alphabetical by key |
| Ports | Numeric ascending |
| Environment Variables | Alphabetical by name |
| Volumes/Mounts | Alphabetical by mount path |

```typescript
// Canonical ordering implementation
function orderResources(resources: Resource[]): Resource[] {
  return resources.sort((a, b) => {
    const keyA = `${a.type}/${a.name}`;
    const keyB = `${b.type}/${b.name}`;
    return keyA.localeCompare(keyB, 'en');
  });
}

function orderByDependency(resources: Resource[]): Resource[] {
  return topologicalSort(resources, (r) => r.dependsOn);
}
```

#### 2.2.3 Resource Dependency Ordering

For outputs where order affects semantics (e.g., Terraform resources), apply topological ordering:

```typescript
interface DependencyGraph<T> {
  nodes: T[];
  edges: Map<T, T[]>;
}

function topologicalSort<T>(
  resources: T[],
  getDependencies: (r: T) => T[]
): T[] {
  const visited = new Set<T>();
  const result: T[] = [];

  function visit(node: T) {
    if (visited.has(node)) return;
    visited.add(node);

    for (const dep of getDependencies(node)) {
      visit(dep);
    }
    result.push(node);
  }

  // Process in stable order before topological sort
  const stablySorted = [...resources].sort(byCanonicalKey);
  for (const node of stablySorted) {
    visit(node);
  }

  return result;
}
```

### 2.3 Environment Independence

#### 2.3.1 Prohibited Environment Dependencies

The following MUST NOT influence export output:

| Category | Prohibited Sources |
|----------|-------------------|
| **Environment Variables** | `process.env.*`, `os.environ`, `%VAR%` |
| **Network Identity** | Hostname, IP address, MAC address, DNS |
| **Filesystem** | Working directory, temp paths, user home |
| **System State** | Clock time, process ID, thread ID |
| **Platform** | OS type, architecture, kernel version |
| **User Context** | Username, UID, GID, groups |

#### 2.3.2 Isolation Verification

```typescript
interface EnvironmentIsolation {
  // Verification test specification
  verifyIsolation(): Promise<IsolationReport>;
}

async function verifyEnvironmentIsolation(
  exporter: Exporter,
  intent: DeploymentIntent
): Promise<IsolationReport> {
  const environments = [
    { TZ: 'UTC', LANG: 'en_US.UTF-8', HOME: '/home/user1' },
    { TZ: 'PST', LANG: 'C', HOME: '/home/user2' },
    { TZ: 'JST', LANG: 'ja_JP.UTF-8', HOME: '/root' }
  ];

  const outputs: string[] = [];

  for (const env of environments) {
    const result = await exporter.export(intent, { environment: env });
    outputs.push(hashArtifact(result));
  }

  const allIdentical = outputs.every(h => h === outputs[0]);

  return {
    isolated: allIdentical,
    hashes: outputs,
    environments
  };
}
```

#### 2.3.3 Path Normalization

All paths in output MUST be normalized and relative:

```typescript
interface PathNormalization {
  // Convert absolute paths to relative
  normalize(path: string): string;

  // Validate no absolute paths in output
  validateNoAbsolutePaths(artifact: ExportArtifact): ValidationResult;
}

function normalizePath(path: string): string {
  // Remove leading slashes
  let normalized = path.replace(/^[\/\\]+/, '');

  // Normalize separators
  normalized = normalized.replace(/\\/g, '/');

  // Remove path traversal
  normalized = normalized.replace(/\.\.\//g, '');

  // Collapse multiple slashes
  normalized = normalized.replace(/\/+/g, '/');

  return normalized;
}
```

---

## 3. Schema Evolution Handling

### 3.1 Backward Compatibility

#### 3.1.1 Compatibility Guarantee

**Invariant**: Any valid `DeploymentIntent` from a previous schema version MUST be processable by newer exporter versions, producing semantically equivalent output.

```typescript
interface BackwardCompatibility {
  // Minimum supported intent version
  minSupportedVersion: SemVer;

  // Current intent version
  currentVersion: SemVer;

  // Verify intent is processable
  canProcess(intent: DeploymentIntent): CompatibilityResult;
}

interface CompatibilityResult {
  compatible: boolean;
  intentVersion: SemVer;
  exporterVersion: SemVer;
  deprecationWarnings: DeprecationWarning[];
  migrationHints: MigrationHint[];
}
```

#### 3.1.2 Version Negotiation Protocol

```typescript
interface VersionNegotiation {
  // Step 1: Parse intent version
  parseVersion(intent: unknown): SemVer;

  // Step 2: Check compatibility matrix
  checkCompatibility(
    intentVersion: SemVer,
    exporterVersion: SemVer
  ): CompatibilityLevel;

  // Step 3: Select transformation strategy
  selectStrategy(
    intentVersion: SemVer
  ): TransformationStrategy;
}

enum CompatibilityLevel {
  FULL = 'full',           // Direct processing
  DEPRECATED = 'deprecated', // Works with warnings
  LEGACY = 'legacy',       // Requires migration adapter
  UNSUPPORTED = 'unsupported' // Cannot process
}
```

#### 3.1.3 Deprecation Warning System

```typescript
interface DeprecationWarning {
  code: string;                    // e.g., 'DEP-001'
  field: string;                   // JSONPath to deprecated field
  message: string;                 // Human-readable explanation
  deprecatedIn: SemVer;           // When deprecated
  removedIn: SemVer | null;       // When removed (null = not scheduled)
  migration: string;               // Migration guidance
  documentationUrl: string;        // Link to migration docs
}

// Example deprecation
const DEP_001: DeprecationWarning = {
  code: 'DEP-001',
  field: '$.spec.container.image',
  message: 'String image format is deprecated; use ImageSpec object',
  deprecatedIn: { major: 1, minor: 2, patch: 0 },
  removedIn: { major: 2, minor: 0, patch: 0 },
  migration: 'Convert "nginx:latest" to { repository: "nginx", tag: "latest" }',
  documentationUrl: 'https://docs.agentics.io/migration/image-spec'
};
```

### 3.2 Forward Compatibility

#### 3.2.1 Unknown Field Handling

**Policy**: Unknown fields MUST be preserved in passthrough and ignored during transformation. They MUST NOT cause processing failures.

```typescript
interface UnknownFieldPolicy {
  // Preserve unknown fields in metadata sections
  preserveIn: ['metadata', 'annotations', 'labels', 'extensions'];

  // Log but don't fail on unknown spec fields
  warnOn: ['spec.*'];

  // Fail on unknown required sections
  failOn: ['apiVersion', 'kind'];
}

function handleUnknownFields(
  intent: unknown,
  schema: JSONSchema
): ProcessedIntent {
  const knownFields = extractSchemaFields(schema);
  const inputFields = Object.keys(intent as object);

  const unknown = inputFields.filter(f => !knownFields.includes(f));

  for (const field of unknown) {
    if (isPreservedSection(field)) {
      // Preserve as-is in extensions
      extensions[field] = (intent as Record<string, unknown>)[field];
    } else {
      // Emit warning but continue
      logger.warn({
        code: 'UNKNOWN_FIELD',
        field,
        message: `Unknown field "${field}" will be ignored`
      });
    }
  }

  return { ...validated, extensions };
}
```

#### 3.2.2 Extension Points

The schema MUST define explicit extension points for future fields:

```yaml
# DeploymentIntent schema extension points
apiVersion: agentics.io/v1
kind: DeploymentIntent
metadata:
  name: string
  annotations: Record<string, string>  # Extension point
  labels: Record<string, string>       # Extension point
  extensions: Record<string, unknown>  # Freeform extension point
spec:
  # ... defined fields ...
  x-extensions: Record<string, unknown>  # Spec-level extensions
```

#### 3.2.3 Graceful Degradation

```typescript
interface GracefulDegradation {
  // When encountering newer intent features
  handleUnsupportedFeature(
    feature: string,
    context: TransformContext
  ): DegradationResult;
}

interface DegradationResult {
  action: 'skip' | 'default' | 'warn' | 'fail';
  fallback?: unknown;
  warning?: string;
}

function degradeGracefully(
  feature: string,
  context: TransformContext
): DegradationResult {
  // Check if feature is optional
  if (isOptionalFeature(feature)) {
    return {
      action: 'warn',
      warning: `Feature "${feature}" not supported; using defaults`
    };
  }

  // Check if feature has safe default
  if (hasSafeDefault(feature)) {
    return {
      action: 'default',
      fallback: getSafeDefault(feature),
      warning: `Feature "${feature}" not supported; using fallback`
    };
  }

  // Critical feature - must fail
  return {
    action: 'fail',
    warning: `Required feature "${feature}" not supported by this exporter version`
  };
}
```

### 3.3 Migration Paths

#### 3.3.1 Intent Version Upgrade Tooling

Migration tooling is maintained separately to preserve exporter purity:

```typescript
// Migration tool interface (separate repository)
interface IntentMigrator {
  // List available migrations
  listMigrations(
    fromVersion: SemVer,
    toVersion: SemVer
  ): Migration[];

  // Execute migration
  migrate(
    intent: DeploymentIntent,
    targetVersion: SemVer
  ): MigrationResult;

  // Validate migration result
  validate(
    original: DeploymentIntent,
    migrated: DeploymentIntent
  ): ValidationReport;
}

interface Migration {
  id: string;
  fromVersion: SemVer;
  toVersion: SemVer;
  description: string;
  breaking: boolean;
  reversible: boolean;

  // Transform function
  transform(intent: DeploymentIntent): DeploymentIntent;
}
```

#### 3.3.2 Exporter Version Matrix

| Intent Version | Exporter 1.x | Exporter 2.x | Exporter 3.x |
|----------------|--------------|--------------|--------------|
| v1alpha1 | Full | Deprecated | Unsupported |
| v1beta1 | Full | Full | Deprecated |
| v1 | Partial | Full | Full |
| v2alpha1 | Unsupported | Partial | Full |
| v2 | Unsupported | Unsupported | Full |

**Legend**:
- **Full**: All features supported
- **Partial**: Core features only
- **Deprecated**: Works with warnings
- **Unsupported**: Will not process

---

## 4. Failure Semantics

### 4.1 Fail-Fast Validation

#### 4.1.1 Validation Ordering

Validation MUST occur in strict order, with immediate termination on first failure:

```
1. STRUCTURAL    JSON/YAML parsing
       |
       v
2. SCHEMA        JSON Schema validation
       |
       v
3. VERSION       Intent version compatibility
       |
       v
4. SEMANTIC      Business rule validation
       |
       v
5. REFERENCE     Cross-reference integrity
       |
       v
6. EXPORT        Begin transformation
```

```typescript
async function validateBeforeExport(
  input: unknown
): Promise<ValidationResult> {
  // 1. Structural validation
  const parsed = parseInput(input);
  if (!parsed.success) {
    return { valid: false, stage: 'structural', error: parsed.error };
  }

  // 2. Schema validation
  const schemaResult = validateSchema(parsed.data);
  if (!schemaResult.valid) {
    return { valid: false, stage: 'schema', error: schemaResult.error };
  }

  // 3. Version validation
  const versionResult = validateVersion(parsed.data);
  if (!versionResult.valid) {
    return { valid: false, stage: 'version', error: versionResult.error };
  }

  // 4. Semantic validation
  const semanticResult = validateSemantics(parsed.data);
  if (!semanticResult.valid) {
    return { valid: false, stage: 'semantic', error: semanticResult.error };
  }

  // 5. Reference validation
  const refResult = validateReferences(parsed.data);
  if (!refResult.valid) {
    return { valid: false, stage: 'reference', error: refResult.error };
  }

  return { valid: true, data: parsed.data };
}
```

#### 4.1.2 All-or-Nothing Export

**Invariant**: Either all artifacts are produced successfully, or no artifacts are produced. Partial outputs are PROHIBITED.

```typescript
interface AtomicExport {
  // Transaction-like export operation
  export(intent: DeploymentIntent): Promise<ExportResult>;
}

async function atomicExport(
  intent: DeploymentIntent,
  exporters: Exporter[]
): Promise<ExportResult> {
  const artifacts: Artifact[] = [];

  try {
    // Phase 1: Generate all artifacts in memory
    for (const exporter of exporters) {
      const artifact = await exporter.generate(intent);
      artifacts.push(artifact);
    }

    // Phase 2: Validate all artifacts
    for (const artifact of artifacts) {
      const valid = await validateArtifact(artifact);
      if (!valid) {
        throw new ValidationError(`Artifact validation failed: ${artifact.name}`);
      }
    }

    // Phase 3: Package atomically
    const package = await packageArtifacts(artifacts);

    return { success: true, package };

  } catch (error) {
    // No artifacts written on any failure
    return {
      success: false,
      error: categorizeError(error),
      artifacts: [] // Empty - nothing produced
    };
  }
}
```

#### 4.1.3 Error Attribution

All errors MUST include:

```typescript
interface ExportError {
  // Error category
  category: ErrorCategory;

  // Machine-readable code
  code: string;

  // Human-readable message
  message: string;

  // Source location in intent
  source: {
    path: string;        // JSONPath to problematic field
    line?: number;       // If available from parsing
    column?: number;
  };

  // Diagnostic context
  context: {
    intentVersion: string;
    exporterVersion: string;
    targetFormat: string;
    timestamp: string;   // ISO 8601
    correlationId: string;
  };

  // Remediation guidance
  remediation: {
    suggestion: string;
    documentationUrl?: string;
    examples?: string[];
  };
}
```

### 4.2 Error Categories

#### 4.2.1 Error Taxonomy

```typescript
enum ErrorCategory {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SCHEMA_MISMATCH = 'SCHEMA_MISMATCH',
  TRANSFORM_ERROR = 'TRANSFORM_ERROR',
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',
  INTEGRITY_ERROR = 'INTEGRITY_ERROR'
}

interface ErrorDefinitions {
  [ErrorCategory.VALIDATION_ERROR]: {
    description: 'Invalid input structure or values';
    retryable: false;
    examples: [
      'Missing required field',
      'Invalid field type',
      'Value out of range',
      'Pattern mismatch'
    ];
  };

  [ErrorCategory.SCHEMA_MISMATCH]: {
    description: 'Unsupported or incompatible intent version';
    retryable: false;
    examples: [
      'Intent version too old',
      'Intent version too new',
      'Unknown API version'
    ];
  };

  [ErrorCategory.TRANSFORM_ERROR]: {
    description: 'Exporter internal transformation failure';
    retryable: true;
    examples: [
      'Template rendering failure',
      'Resource mapping failure',
      'Computation overflow'
    ];
  };

  [ErrorCategory.SERIALIZATION_ERROR]: {
    description: 'Output format encoding failure';
    retryable: true;
    examples: [
      'Invalid HCL generation',
      'YAML encoding error',
      'JSON serialization limit'
    ];
  };

  [ErrorCategory.INTEGRITY_ERROR]: {
    description: 'Checksum or signature verification failure';
    retryable: true;
    examples: [
      'Checksum mismatch',
      'Signature verification failed',
      'Hash computation error'
    ];
  };
}
```

#### 4.2.2 Error Codes

| Category | Code Range | Example |
|----------|-----------|---------|
| VALIDATION_ERROR | V1000-V1999 | V1001: Missing required field |
| SCHEMA_MISMATCH | S2000-S2999 | S2001: Unsupported API version |
| TRANSFORM_ERROR | T3000-T3999 | T3001: Template rendering failed |
| SERIALIZATION_ERROR | E4000-E4999 | E4001: HCL syntax error |
| INTEGRITY_ERROR | I5000-I5999 | I5001: Checksum mismatch |

### 4.3 Recovery Strategies

#### 4.3.1 Idempotent Retry Semantics

**Guarantee**: Retrying a failed export with identical input produces identical results (either success or failure).

```typescript
interface RetryPolicy {
  // Maximum retry attempts
  maxAttempts: number;

  // Categories eligible for retry
  retryableCategories: ErrorCategory[];

  // Backoff strategy
  backoff: {
    type: 'exponential' | 'linear' | 'fixed';
    initialDelayMs: number;
    maxDelayMs: number;
    multiplier?: number;
  };
}

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  retryableCategories: [
    ErrorCategory.TRANSFORM_ERROR,
    ErrorCategory.SERIALIZATION_ERROR,
    ErrorCategory.INTEGRITY_ERROR
  ],
  backoff: {
    type: 'exponential',
    initialDelayMs: 100,
    maxDelayMs: 5000,
    multiplier: 2
  }
};

async function exportWithRetry(
  intent: DeploymentIntent,
  exporter: Exporter,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY
): Promise<ExportResult> {
  let lastError: ExportError | null = null;

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      return await exporter.export(intent);
    } catch (error) {
      lastError = categorizeError(error);

      if (!policy.retryableCategories.includes(lastError.category)) {
        throw lastError; // Non-retryable - fail immediately
      }

      if (attempt < policy.maxAttempts) {
        const delay = calculateBackoff(attempt, policy.backoff);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
```

#### 4.3.2 Side Effect Prevention

**Invariant**: Failed exports MUST NOT produce any side effects.

```typescript
interface SideEffectFreeExport {
  // All operations are in-memory only
  export(intent: DeploymentIntent): Promise<InMemoryResult>;

  // Explicit commit step for persistence
  commit(result: InMemoryResult, target: OutputTarget): Promise<void>;
}

// Implementation pattern
class PureFunctionExporter implements Exporter {
  async export(intent: DeploymentIntent): Promise<ExportResult> {
    // Phase 1: Pure transformation (no I/O)
    const artifacts = this.transform(intent);

    // Phase 2: In-memory validation (no I/O)
    this.validate(artifacts);

    // Phase 3: In-memory packaging (no I/O)
    const package = this.package(artifacts);

    // Phase 4: Integrity computation (no I/O)
    const checksums = this.computeChecksums(package);

    // Return in-memory result - no side effects
    return {
      artifacts,
      package,
      checksums,
      // Caller decides what to do with result
    };
  }

  // Separate, explicit persistence step
  async persist(
    result: ExportResult,
    target: OutputTarget
  ): Promise<void> {
    // Only here do we touch the filesystem/network
    await target.write(result);
  }
}
```

#### 4.3.3 Clean Rollback

For operations that require intermediate state, implement saga pattern:

```typescript
interface ExportSaga {
  steps: SagaStep[];
  compensations: Map<string, CompensationAction>;
}

interface SagaStep {
  id: string;
  action: () => Promise<unknown>;
  compensation: () => Promise<void>;
}

async function executeSaga(saga: ExportSaga): Promise<SagaResult> {
  const completed: string[] = [];

  try {
    for (const step of saga.steps) {
      await step.action();
      completed.push(step.id);
    }
    return { success: true };

  } catch (error) {
    // Rollback in reverse order
    for (const stepId of completed.reverse()) {
      const compensation = saga.compensations.get(stepId);
      if (compensation) {
        await compensation();
      }
    }

    return {
      success: false,
      error,
      rolledBack: completed
    };
  }
}
```

---

## 5. Validation Strategies

### 5.1 Input Validation

#### 5.1.1 JSON Schema Validation

```typescript
interface SchemaValidation {
  // Validate against DeploymentIntent JSON Schema
  validate(input: unknown): ValidationResult;

  // Get all validation errors (not just first)
  validateAll(input: unknown): ValidationError[];
}

// JSON Schema configuration
const VALIDATION_CONFIG = {
  allErrors: true,           // Report all errors, not just first
  strict: true,              // Strict mode - no additional properties
  coerceTypes: false,        // No type coercion
  removeAdditional: false,   // Don't silently remove fields
  useDefaults: false,        // Don't apply defaults during validation
  formats: true,             // Validate format keywords
};

async function validateInputSchema(
  input: unknown,
  schema: JSONSchema
): Promise<ValidationResult> {
  const ajv = new Ajv(VALIDATION_CONFIG);

  // Add custom formats
  ajv.addFormat('semver', /^\d+\.\d+\.\d+(-[\w.]+)?$/);
  ajv.addFormat('k8s-name', /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/);
  ajv.addFormat('intent-id', /^[a-zA-Z0-9_-]{1,63}$/);

  const validate = ajv.compile(schema);
  const valid = validate(input);

  if (valid) {
    return { valid: true, data: input };
  }

  return {
    valid: false,
    errors: validate.errors!.map(formatError)
  };
}
```

#### 5.1.2 Semantic Constraint Checking

Beyond structural validation, enforce business rules:

```typescript
interface SemanticValidator {
  rules: SemanticRule[];
  validate(intent: DeploymentIntent): SemanticValidationResult;
}

interface SemanticRule {
  id: string;
  description: string;
  severity: 'error' | 'warning';
  check: (intent: DeploymentIntent) => boolean;
  message: (intent: DeploymentIntent) => string;
}

const SEMANTIC_RULES: SemanticRule[] = [
  {
    id: 'SEM-001',
    description: 'Resource requests must not exceed limits',
    severity: 'error',
    check: (intent) => {
      const resources = intent.spec.resources;
      if (!resources.limits || !resources.requests) return true;

      return (
        resources.requests.cpu <= resources.limits.cpu &&
        resources.requests.memory <= resources.limits.memory
      );
    },
    message: () => 'Resource requests exceed limits'
  },
  {
    id: 'SEM-002',
    description: 'Replica count must be positive',
    severity: 'error',
    check: (intent) => intent.spec.replicas > 0,
    message: (intent) => `Invalid replica count: ${intent.spec.replicas}`
  },
  {
    id: 'SEM-003',
    description: 'Port numbers must be in valid range',
    severity: 'error',
    check: (intent) => {
      return intent.spec.ports.every(p =>
        p.containerPort >= 1 && p.containerPort <= 65535
      );
    },
    message: () => 'Port number out of valid range (1-65535)'
  },
  {
    id: 'SEM-004',
    description: 'Environment variable names should be uppercase',
    severity: 'warning',
    check: (intent) => {
      return intent.spec.env.every(e =>
        e.name === e.name.toUpperCase()
      );
    },
    message: () => 'Environment variable names should be uppercase'
  }
];
```

#### 5.1.3 Cross-Reference Integrity

Validate internal references within the intent:

```typescript
interface ReferenceValidator {
  // Validate all internal references resolve
  validateReferences(intent: DeploymentIntent): ReferenceValidationResult;
}

interface Reference {
  source: string;      // JSONPath of referencing field
  target: string;      // Reference value
  targetType: string;  // Expected type of target
}

async function validateCrossReferences(
  intent: DeploymentIntent
): Promise<ReferenceValidationResult> {
  const errors: ReferenceError[] = [];

  // Collect all defined resources
  const definedResources = new Map<string, Resource>();
  for (const resource of intent.spec.resources) {
    definedResources.set(`${resource.type}/${resource.name}`, resource);
  }

  // Collect all secret references
  const definedSecrets = new Set(
    intent.spec.secrets?.map(s => s.name) || []
  );

  // Validate resource dependencies
  for (const resource of intent.spec.resources) {
    for (const dep of resource.dependsOn || []) {
      if (!definedResources.has(dep)) {
        errors.push({
          code: 'REF-001',
          source: `$.spec.resources[${resource.name}].dependsOn`,
          reference: dep,
          message: `Undefined resource dependency: ${dep}`
        });
      }
    }
  }

  // Validate secret references in environment variables
  for (const env of intent.spec.env || []) {
    if (env.valueFrom?.secretKeyRef) {
      const secretName = env.valueFrom.secretKeyRef.name;
      if (!definedSecrets.has(secretName)) {
        errors.push({
          code: 'REF-002',
          source: `$.spec.env[${env.name}].valueFrom.secretKeyRef`,
          reference: secretName,
          message: `Undefined secret reference: ${secretName}`
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

### 5.2 Output Validation

#### 5.2.1 Target Format Schema Compliance

Each exporter MUST validate its output against the target format's schema:

```typescript
interface OutputValidator {
  // Validate output matches target format schema
  validateFormat(
    output: string,
    format: OutputFormat
  ): FormatValidationResult;
}

const OUTPUT_VALIDATORS: Record<OutputFormat, OutputValidator> = {
  terraform: {
    async validateFormat(output: string): Promise<FormatValidationResult> {
      // Parse and validate HCL
      const parsed = parseHCL(output);
      if (!parsed.success) {
        return { valid: false, errors: parsed.errors };
      }

      // Validate against Terraform provider schemas
      const schemaErrors = await validateTerraformResources(parsed.ast);

      return {
        valid: schemaErrors.length === 0,
        errors: schemaErrors
      };
    }
  },

  kubernetes: {
    async validateFormat(output: string): Promise<FormatValidationResult> {
      // Parse YAML documents
      const docs = parseYAMLStream(output);

      const errors: ValidationError[] = [];

      for (const doc of docs) {
        // Validate against Kubernetes OpenAPI schema
        const result = await validateK8sResource(doc);
        if (!result.valid) {
          errors.push(...result.errors);
        }
      }

      return { valid: errors.length === 0, errors };
    }
  },

  cloudformation: {
    async validateFormat(output: string): Promise<FormatValidationResult> {
      // Validate CloudFormation template
      const template = parseJSON(output);

      // Validate structure
      const structureErrors = validateCFNStructure(template);

      // Validate resources against AWS schemas
      const resourceErrors = await validateCFNResources(template);

      return {
        valid: structureErrors.length === 0 && resourceErrors.length === 0,
        errors: [...structureErrors, ...resourceErrors]
      };
    }
  }
};
```

#### 5.2.2 Syntax Verification

For text-based outputs, verify syntax before packaging:

```typescript
interface SyntaxVerifier {
  verify(content: string, language: string): SyntaxResult;
}

const SYNTAX_VERIFIERS: Record<string, SyntaxVerifier> = {
  hcl: {
    verify(content: string): SyntaxResult {
      try {
        const ast = hclParser.parse(content);
        return { valid: true, ast };
      } catch (error) {
        return {
          valid: false,
          error: {
            message: error.message,
            line: error.location?.start.line,
            column: error.location?.start.column
          }
        };
      }
    }
  },

  yaml: {
    verify(content: string): SyntaxResult {
      try {
        const docs = yaml.parseAllDocuments(content, { strict: true });
        const errors = docs.flatMap(d => d.errors);

        if (errors.length > 0) {
          return { valid: false, errors };
        }

        return { valid: true, documents: docs.map(d => d.toJS()) };
      } catch (error) {
        return { valid: false, error };
      }
    }
  },

  json: {
    verify(content: string): SyntaxResult {
      try {
        const parsed = JSON.parse(content);
        return { valid: true, data: parsed };
      } catch (error) {
        return { valid: false, error };
      }
    }
  },

  sql: {
    verify(content: string): SyntaxResult {
      try {
        const ast = sqlParser.parse(content);
        return { valid: true, ast };
      } catch (error) {
        return {
          valid: false,
          error: {
            message: error.message,
            position: error.position
          }
        };
      }
    }
  }
};
```

#### 5.2.3 Semantic Validity Checks

Beyond syntax, validate semantic correctness:

```typescript
interface SemanticOutputValidator {
  // Validate output is semantically valid for target platform
  validate(
    output: ExportArtifact,
    targetPlatform: string
  ): SemanticValidationResult;
}

const SEMANTIC_OUTPUT_CHECKS: Record<string, SemanticCheck[]> = {
  terraform: [
    {
      id: 'TF-SEM-001',
      description: 'Resource names must be unique within type',
      check: (ast) => {
        const resources = extractResources(ast);
        const seen = new Set<string>();

        for (const r of resources) {
          const key = `${r.type}.${r.name}`;
          if (seen.has(key)) {
            return { valid: false, duplicate: key };
          }
          seen.add(key);
        }

        return { valid: true };
      }
    },
    {
      id: 'TF-SEM-002',
      description: 'References must resolve to existing resources',
      check: (ast) => {
        const resources = new Set(
          extractResources(ast).map(r => `${r.type}.${r.name}`)
        );
        const references = extractReferences(ast);

        const unresolved = references.filter(ref => !resources.has(ref));

        return {
          valid: unresolved.length === 0,
          unresolved
        };
      }
    }
  ],

  kubernetes: [
    {
      id: 'K8S-SEM-001',
      description: 'Service selectors must match pod labels',
      check: (docs) => {
        const pods = docs.filter(d => d.kind === 'Pod' || d.kind === 'Deployment');
        const services = docs.filter(d => d.kind === 'Service');

        for (const svc of services) {
          const selector = svc.spec.selector;
          const matches = pods.some(p => labelsMatch(p.metadata.labels, selector));

          if (!matches) {
            return {
              valid: false,
              service: svc.metadata.name,
              message: 'No pods match service selector'
            };
          }
        }

        return { valid: true };
      }
    }
  ]
};
```

### 5.3 Round-Trip Validation

#### 5.3.1 Export-Reimport Verification

Conceptual validation that export produces importable output:

```typescript
interface RoundTripValidator {
  // Verify exported output can be re-parsed
  validateRoundTrip(
    artifact: ExportArtifact
  ): Promise<RoundTripResult>;
}

async function validateRoundTrip(
  artifact: ExportArtifact
): Promise<RoundTripResult> {
  const { content, format } = artifact;

  // Step 1: Parse the exported content
  const parsed = await parseFormat(content, format);
  if (!parsed.success) {
    return {
      valid: false,
      stage: 'parse',
      error: parsed.error
    };
  }

  // Step 2: Re-serialize the parsed content
  const reserialized = await serializeFormat(parsed.data, format);

  // Step 3: Parse again
  const reparsed = await parseFormat(reserialized, format);
  if (!reparsed.success) {
    return {
      valid: false,
      stage: 'reparse',
      error: reparsed.error
    };
  }

  // Step 4: Compare semantic equivalence
  const equivalent = semanticEquals(parsed.data, reparsed.data);

  return {
    valid: equivalent,
    original: parsed.data,
    roundTripped: reparsed.data,
    differences: equivalent ? [] : findDifferences(parsed.data, reparsed.data)
  };
}
```

#### 5.3.2 Drift Detection

Detect deviations between intent and actual deployed state (external integration):

```typescript
interface DriftDetector {
  // Compare exported artifact against deployed state
  detectDrift(
    artifact: ExportArtifact,
    deployedState: unknown
  ): DriftReport;
}

interface DriftReport {
  hasDrift: boolean;
  timestamp: string;
  intentVersion: string;

  additions: DriftItem[];    // Present in deployed, not in intent
  deletions: DriftItem[];    // Present in intent, not in deployed
  modifications: DriftItem[]; // Different between intent and deployed

  // Severity assessment
  severity: 'none' | 'minor' | 'major' | 'critical';

  // Remediation
  remediation: {
    canAutoRemediate: boolean;
    steps: RemediationStep[];
  };
}

interface DriftItem {
  path: string;
  intentValue: unknown;
  deployedValue: unknown;
  changeType: 'added' | 'removed' | 'modified';
  severity: 'info' | 'warning' | 'error';
}
```

---

## 6. Guardrails

### 6.1 Preventing Partial Outputs

#### 6.1.1 Atomic Write Operations

All file writes MUST be atomic using write-rename pattern:

```typescript
interface AtomicWriter {
  // Write atomically using temporary file
  writeAtomic(
    path: string,
    content: Buffer
  ): Promise<void>;
}

async function writeAtomic(
  targetPath: string,
  content: Buffer
): Promise<void> {
  const tempPath = `${targetPath}.${process.pid}.tmp`;

  try {
    // Write to temporary file
    await fs.writeFile(tempPath, content, { mode: 0o644 });

    // Sync to disk
    const fd = await fs.open(tempPath, 'r');
    await fd.sync();
    await fd.close();

    // Atomic rename
    await fs.rename(tempPath, targetPath);

    // Sync parent directory
    const dir = path.dirname(targetPath);
    const dirFd = await fs.open(dir, 'r');
    await dirFd.sync();
    await dirFd.close();

  } catch (error) {
    // Cleanup on failure
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}
```

#### 6.1.2 Transactional Artifact Collection

Collect all artifacts before any writes:

```typescript
interface ArtifactTransaction {
  artifacts: Map<string, Buffer>;

  // Add artifact to transaction
  add(path: string, content: Buffer): void;

  // Commit all or nothing
  commit(outputDir: string): Promise<void>;

  // Abort and cleanup
  abort(): Promise<void>;
}

class AtomicArtifactWriter implements ArtifactTransaction {
  private artifacts = new Map<string, Buffer>();
  private stagingDir: string | null = null;

  add(path: string, content: Buffer): void {
    this.artifacts.set(path, content);
  }

  async commit(outputDir: string): Promise<void> {
    // Create staging directory
    this.stagingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'export-'));

    try {
      // Write all to staging
      for (const [relativePath, content] of this.artifacts) {
        const stagingPath = path.join(this.stagingDir, relativePath);
        await fs.mkdir(path.dirname(stagingPath), { recursive: true });
        await writeAtomic(stagingPath, content);
      }

      // Verify all files written
      for (const [relativePath, content] of this.artifacts) {
        const stagingPath = path.join(this.stagingDir, relativePath);
        const written = await fs.readFile(stagingPath);

        if (!written.equals(content)) {
          throw new IntegrityError('Write verification failed');
        }
      }

      // Atomic move from staging to output
      await atomicMoveDirectory(this.stagingDir, outputDir);

    } catch (error) {
      await this.abort();
      throw error;
    }
  }

  async abort(): Promise<void> {
    if (this.stagingDir) {
      await fs.rm(this.stagingDir, { recursive: true, force: true });
      this.stagingDir = null;
    }
  }
}
```

#### 6.1.3 All-or-Nothing Packaging

```typescript
interface PackageBuilder {
  // Build complete package or fail entirely
  build(artifacts: Artifact[]): Promise<Package>;
}

async function buildPackage(artifacts: Artifact[]): Promise<Package> {
  const manifest: PackageManifest = {
    version: PACKAGE_VERSION,
    createdAt: new Date().toISOString(),
    artifacts: [],
    checksums: {}
  };

  const archive = archiver('tar', { gzip: true });
  const chunks: Buffer[] = [];

  archive.on('data', (chunk) => chunks.push(chunk));

  // Add all artifacts
  for (const artifact of artifacts) {
    const checksum = computeSHA256(artifact.content);

    manifest.artifacts.push({
      path: artifact.path,
      size: artifact.content.length,
      checksum
    });
    manifest.checksums[artifact.path] = checksum;

    archive.append(artifact.content, { name: artifact.path });
  }

  // Add manifest
  const manifestJson = JSON.stringify(manifest, null, 2);
  archive.append(manifestJson, { name: 'manifest.json' });

  // Finalize
  await archive.finalize();

  const packageBuffer = Buffer.concat(chunks);
  const packageChecksum = computeSHA256(packageBuffer);

  return {
    content: packageBuffer,
    manifest,
    checksum: packageChecksum
  };
}
```

### 6.2 Preventing Ambiguity

#### 6.2.1 No Optional Interpretations

Every field MUST have exactly one interpretation:

```typescript
interface FieldSpecification {
  name: string;
  type: JSONSchemaType;
  required: boolean;
  default?: undefined;  // Defaults come from intent, not exporter
  interpretation: string; // Unambiguous description
  examples: Example[];
}

// Anti-pattern: Ambiguous interpretation
const AMBIGUOUS = {
  replicas: {
    description: 'Number of replicas (uses platform default if omitted)'
    // BAD: What is "platform default"? Varies by target.
  }
};

// Correct: Explicit interpretation
const EXPLICIT = {
  replicas: {
    description: 'Exact number of replicas to deploy',
    required: true,
    minimum: 0,
    interpretation: 'If 0, no replicas are created (useful for suspend). Must be explicitly set; no implicit defaults.',
    examples: [
      { value: 1, meaning: 'Single replica deployment' },
      { value: 3, meaning: 'Three replicas for HA' },
      { value: 0, meaning: 'Suspended deployment' }
    ]
  }
};
```

#### 6.2.2 Explicit Defaults Only From Intent

Exporters MUST NOT inject defaults; all defaults come from the intent:

```typescript
interface DefaultPolicy {
  // Exporters MUST NOT inject defaults
  exporterDefaults: never;

  // Defaults MUST be explicit in intent schema
  intentSchemaDefaults: 'required-in-schema';

  // Missing required fields MUST fail validation
  missingRequired: 'validation-error';
}

// Anti-pattern: Exporter injecting defaults
function badExport(intent: DeploymentIntent): TerraformConfig {
  return {
    replicas: intent.spec.replicas ?? 1,  // BAD: implicit default
    cpu: intent.spec.resources?.cpu ?? '100m',  // BAD: implicit default
  };
}

// Correct: Require all values in intent
function goodExport(intent: ValidatedDeploymentIntent): TerraformConfig {
  // ValidatedDeploymentIntent guarantees all required fields present
  return {
    replicas: intent.spec.replicas,  // Known to exist after validation
    cpu: intent.spec.resources.cpu,  // Known to exist after validation
  };
}
```

#### 6.2.3 No Implicit Environment Assumptions

Outputs MUST NOT contain any environment-specific values:

```typescript
interface EnvironmentPurity {
  // Prohibited in output
  prohibited: [
    'environment-specific URLs',
    'platform-specific paths',
    'hardcoded credentials',
    'IP addresses',
    'hostnames',
    'ports (unless from intent)',
    'region codes (unless from intent)'
  ];

  // Allowed only from intent
  allowedFromIntent: [
    'intentionally environment-specific configuration',
    'parameterized values'
  ];
}

// Validation function
function validateEnvironmentPurity(
  artifact: ExportArtifact
): PurityValidationResult {
  const violations: PurityViolation[] = [];
  const content = artifact.content.toString();

  // Check for environment patterns
  const patterns = [
    { regex: /https?:\/\/localhost/gi, type: 'localhost-url' },
    { regex: /127\.0\.0\.1/g, type: 'loopback-ip' },
    { regex: /\/home\/\w+/g, type: 'home-directory' },
    { regex: /\/tmp\/\w+/g, type: 'temp-directory' },
    { regex: /\$\{?HOME\}?/g, type: 'home-env-var' },
    { regex: /\$\{?USER\}?/g, type: 'user-env-var' },
    { regex: /\$\{?PWD\}?/g, type: 'pwd-env-var' },
  ];

  for (const { regex, type } of patterns) {
    const matches = content.match(regex);
    if (matches) {
      violations.push({
        type,
        matches,
        message: `Environment-specific pattern detected: ${type}`
      });
    }
  }

  return {
    pure: violations.length === 0,
    violations
  };
}
```

### 6.3 Preventing Environment-Specific Outputs

#### 6.3.1 No Runtime Detection

Exporters MUST NOT detect or respond to runtime environment:

```typescript
interface RuntimeDetectionPolicy {
  // PROHIBITED operations
  prohibited: [
    'os.platform()',
    'os.arch()',
    'os.hostname()',
    'process.env',
    'os.userInfo()',
    'os.networkInterfaces()',
    'process.cwd()',
    'fs.realpathSync(__dirname)'
  ];
}

// Static analysis rule
function detectRuntimeDependencies(code: string): Violation[] {
  const ast = parse(code);
  const violations: Violation[] = [];

  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;

      // Detect os.* calls
      if (isMemberExpression(callee) &&
          isIdentifier(callee.object, { name: 'os' })) {
        violations.push({
          type: 'os-runtime-call',
          location: path.node.loc,
          method: callee.property.name
        });
      }

      // Detect process.env access
      if (isMemberExpression(callee) &&
          isMemberExpression(callee.object) &&
          isIdentifier(callee.object.object, { name: 'process' }) &&
          isIdentifier(callee.object.property, { name: 'env' })) {
        violations.push({
          type: 'env-access',
          location: path.node.loc
        });
      }
    }
  });

  return violations;
}
```

#### 6.3.2 No Conditional Logic Based on Target

Export logic MUST be deterministic regardless of target:

```typescript
interface ConditionalLogicPolicy {
  // PROHIBITED: Target-based conditionals
  prohibited: `
    if (target === 'aws') { ... }
    switch (platform) { ... }
    target.includes('cloud') ? x : y
  `;

  // REQUIRED: Strategy pattern with explicit selection
  required: `
    const strategy = strategyRegistry.get(intent.targetFormat);
    return strategy.export(intent);
  `;
}

// Anti-pattern
function badExport(intent: DeploymentIntent, target: string) {
  if (target === 'aws') {
    return exportAWS(intent);
  } else if (target === 'gcp') {
    return exportGCP(intent);
  } else {
    return exportGeneric(intent);  // BAD: Fallback behavior
  }
}

// Correct: Explicit strategy selection
interface ExportStrategy {
  readonly targetFormat: string;
  export(intent: DeploymentIntent): ExportArtifact;
}

class ExporterRegistry {
  private strategies = new Map<string, ExportStrategy>();

  register(strategy: ExportStrategy): void {
    this.strategies.set(strategy.targetFormat, strategy);
  }

  export(intent: DeploymentIntent): ExportArtifact {
    const strategy = this.strategies.get(intent.targetFormat);

    if (!strategy) {
      throw new UnsupportedFormatError(
        `No exporter registered for format: ${intent.targetFormat}`
      );
    }

    return strategy.export(intent);
  }
}
```

#### 6.3.3 Pure Transformation Only

Export functions MUST be pure:

```typescript
interface PureFunctionRequirements {
  // A pure function:
  properties: [
    'Same input always produces same output',
    'No side effects (I/O, mutations, global state)',
    'No dependencies on external state',
    'Referentially transparent'
  ];
}

// Verification through type system
type PureExportFunction = (
  intent: DeploymentIntent
) => ExportArtifact;

// Enforcement through testing
function verifyPurity(
  exportFn: PureExportFunction,
  testIntent: DeploymentIntent
): PurityReport {
  // Run export multiple times
  const results: ExportArtifact[] = [];

  for (let i = 0; i < 10; i++) {
    results.push(exportFn(testIntent));
  }

  // Verify all outputs identical
  const hashes = results.map(r => hashArtifact(r));
  const allIdentical = hashes.every(h => h === hashes[0]);

  // Verify no side effects
  const initialState = captureGlobalState();
  exportFn(testIntent);
  const finalState = captureGlobalState();
  const noSideEffects = deepEquals(initialState, finalState);

  return {
    pure: allIdentical && noSideEffects,
    identical: allIdentical,
    sideEffectFree: noSideEffects,
    hashes
  };
}
```

---

## 7. Enterprise Audit Considerations

### 7.1 Traceability

#### 7.1.1 Intent Hash in Every Artifact

Every exported artifact MUST contain traceability metadata:

```typescript
interface TraceabilityMetadata {
  // Hash of the source intent
  intentHash: string;

  // Specific version of intent schema
  intentVersion: string;

  // Exporter version that produced this artifact
  exporterVersion: string;

  // Timestamp of export operation (metadata only, not in artifact content)
  exportedAt: string;

  // Unique identifier for this export operation
  exportId: string;

  // Correlation ID for multi-artifact exports
  correlationId: string;
}

function computeIntentHash(intent: DeploymentIntent): string {
  // Canonical serialization before hashing
  const canonical = canonicalize(intent);
  return crypto.createHash('sha256')
    .update(canonical)
    .digest('hex');
}

// Embed traceability in artifacts
function embedTraceability(
  artifact: string,
  format: OutputFormat,
  metadata: TraceabilityMetadata
): string {
  switch (format) {
    case 'terraform':
      return `# Agentics Deployment Export
# Intent Hash: ${metadata.intentHash}
# Intent Version: ${metadata.intentVersion}
# Exporter Version: ${metadata.exporterVersion}
# Export ID: ${metadata.exportId}
# Correlation ID: ${metadata.correlationId}

${artifact}`;

    case 'kubernetes':
      return injectYAMLComment(artifact, metadata);

    case 'cloudformation':
      return injectJSONMetadata(artifact, metadata);

    default:
      return artifact;
  }
}
```

#### 7.1.2 Export Timestamp Handling

Timestamps in metadata MUST NOT affect artifact content:

```typescript
interface TimestampPolicy {
  // Timestamps in export metadata - allowed
  metadataTimestamp: 'ISO-8601';

  // Timestamps in artifact content - prohibited
  contentTimestamp: 'PROHIBITED';

  // Exception: Intent-specified timestamps
  intentTimestamp: 'PASSTHROUGH';
}

// Manifest includes timestamp; artifact does not
interface ExportManifest {
  exportedAt: string;         // Timestamp here is OK
  artifacts: {
    path: string;
    checksum: string;         // Content-based, not time-based
  }[];
}
```

#### 7.1.3 Exporter Version Stamps

```typescript
interface VersionStamp {
  // Semantic version of exporter
  version: string;

  // Git commit hash for precise identification
  commit: string;

  // Build timestamp (for exporter binary, not output)
  buildTime: string;

  // Supported intent version range
  supportedIntentVersions: {
    minimum: string;
    maximum: string;
  };
}

const EXPORTER_VERSION: VersionStamp = {
  version: '1.2.3',
  commit: 'abc1234',
  buildTime: '2026-01-01T00:00:00Z',
  supportedIntentVersions: {
    minimum: '1.0.0',
    maximum: '2.0.0'
  }
};
```

### 7.2 Compliance

#### 7.2.1 SOC 2 Audit Trail Requirements

| Trust Service Criteria | Requirement | Implementation |
|------------------------|-------------|----------------|
| CC6.1 | Logical access controls | Intent validation, schema enforcement |
| CC6.6 | Boundary protection | Input sanitization, output validation |
| CC7.1 | Configuration management | Deterministic exports, version control |
| CC7.2 | Change management | Intent versioning, export correlation |
| CC8.1 | Monitoring and logging | Export audit logs, error tracking |

```typescript
interface SOC2AuditLog {
  // Required fields for SOC 2 compliance
  timestamp: string;           // ISO 8601
  eventType: AuditEventType;
  actor: {
    id: string;
    type: 'system' | 'user' | 'service';
  };
  action: {
    type: string;
    target: string;
    result: 'success' | 'failure';
  };
  context: {
    intentHash: string;
    intentVersion: string;
    exporterVersion: string;
    correlationId: string;
  };
  changes?: {
    before?: unknown;
    after?: unknown;
  };
}

enum AuditEventType {
  EXPORT_STARTED = 'EXPORT_STARTED',
  VALIDATION_PASSED = 'VALIDATION_PASSED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  TRANSFORMATION_COMPLETED = 'TRANSFORMATION_COMPLETED',
  ARTIFACT_PRODUCED = 'ARTIFACT_PRODUCED',
  EXPORT_COMPLETED = 'EXPORT_COMPLETED',
  EXPORT_FAILED = 'EXPORT_FAILED'
}
```

#### 7.2.2 Change Management Integration

```typescript
interface ChangeManagementIntegration {
  // Pre-export hooks for change management systems
  preExportHook?: (intent: DeploymentIntent) => Promise<ChangeTicket>;

  // Post-export hooks for recording changes
  postExportHook?: (
    result: ExportResult,
    ticket: ChangeTicket
  ) => Promise<void>;
}

interface ChangeTicket {
  ticketId: string;
  status: 'approved' | 'pending' | 'rejected';
  approvers: string[];
  approvedAt?: string;
  changeWindow?: {
    start: string;
    end: string;
  };
}

// Integration example
async function exportWithChangeManagement(
  intent: DeploymentIntent,
  cmSystem: ChangeManagementSystem
): Promise<ExportResult> {
  // Verify change is approved
  const ticket = await cmSystem.getTicket(intent.metadata.changeTicketId);

  if (ticket.status !== 'approved') {
    throw new ChangeNotApprovedError(
      `Change ticket ${ticket.ticketId} is not approved`
    );
  }

  // Verify within change window
  const now = new Date();
  if (ticket.changeWindow) {
    const start = new Date(ticket.changeWindow.start);
    const end = new Date(ticket.changeWindow.end);

    if (now < start || now > end) {
      throw new OutsideChangeWindowError(
        `Current time ${now.toISOString()} is outside change window`
      );
    }
  }

  // Proceed with export
  const result = await exporter.export(intent);

  // Record in change management system
  await cmSystem.recordChange({
    ticketId: ticket.ticketId,
    intentHash: computeIntentHash(intent),
    exportId: result.exportId,
    timestamp: now.toISOString()
  });

  return result;
}
```

#### 7.2.3 Approval Workflow Hooks

```typescript
interface ApprovalWorkflowHooks {
  // Hook points for external approval systems
  hooks: {
    preValidation: (intent: DeploymentIntent) => Promise<void>;
    postValidation: (validatedIntent: DeploymentIntent) => Promise<void>;
    preExport: (intent: DeploymentIntent) => Promise<void>;
    postExport: (result: ExportResult) => Promise<void>;
  };

  // Approval gate before export
  approvalGate: (intent: DeploymentIntent) => Promise<ApprovalDecision>;
}

interface ApprovalDecision {
  approved: boolean;
  approver: string;
  timestamp: string;
  conditions?: string[];
  reason?: string;
}

// External webhook for approval systems
interface ApprovalWebhook {
  url: string;
  method: 'POST';
  headers: Record<string, string>;
  payload: {
    intentHash: string;
    intentVersion: string;
    targetFormat: string;
    requestedBy: string;
    requestedAt: string;
  };
  response: {
    approved: boolean;
    token?: string;  // For verification
  };
}
```

### 7.3 Repeatability

#### 7.3.1 Reproducible Builds Guarantee

```typescript
interface ReproducibleBuildGuarantee {
  /**
   * Given:
   *   - Same DeploymentIntent (byte-identical)
   *   - Same Exporter version
   *
   * Then:
   *   - Output artifacts are byte-identical
   *   - Checksums are identical
   *   - Package hash is identical
   *
   * Regardless of:
   *   - Execution time
   *   - Execution environment
   *   - Operator identity
   */
  guarantee: 'ABSOLUTE';
}

// Verification test
async function verifyReproducibility(
  intent: DeploymentIntent,
  exporter: Exporter,
  iterations: number = 100
): Promise<ReproducibilityReport> {
  const results: ExportResult[] = [];

  // Export multiple times
  for (let i = 0; i < iterations; i++) {
    results.push(await exporter.export(intent));
  }

  // Compare all results
  const hashes = results.map(r => computePackageHash(r));
  const allIdentical = hashes.every(h => h === hashes[0]);

  // Detailed comparison
  const artifacts = results.map(r => r.artifacts);
  const artifactComparison = compareArtifactSets(artifacts);

  return {
    reproducible: allIdentical,
    iterations,
    uniqueHashes: [...new Set(hashes)],
    artifactComparison
  };
}
```

#### 7.3.2 Artifact Archival Strategy

```typescript
interface ArchivalStrategy {
  // What to archive
  archivables: [
    'source-intent',           // Original intent
    'canonical-intent',        // Normalized intent
    'export-manifest',         // Export metadata
    'artifact-package',        // All artifacts
    'validation-report',       // Validation results
    'audit-log'               // Export audit trail
  ];

  // How long to retain
  retention: {
    regulatory: '7-years';     // Regulatory minimum
    operational: '3-years';    // Operational needs
    audit: '10-years';         // Audit requirements
  };

  // Archive format
  format: {
    compression: 'gzip';
    container: 'tar';
    integrity: 'sha256';
    signature: 'ed25519';
  };
}

interface ArchivePackage {
  // Archive metadata
  metadata: {
    archiveId: string;
    createdAt: string;
    expiresAt: string;
    retention: string;
    integrityHash: string;
    signature: string;
  };

  // Archived contents
  contents: {
    intent: string;            // Path to intent file
    canonicalIntent: string;   // Path to canonical intent
    manifest: string;          // Path to manifest
    artifacts: string;         // Path to artifact tarball
    validationReport: string;  // Path to validation report
    auditLog: string;          // Path to audit log
  };
}
```

#### 7.3.3 Long-Term Verification Capability

```typescript
interface LongTermVerification {
  // Verify archived export against current exporter
  verify(
    archive: ArchivePackage,
    exporter: Exporter
  ): Promise<VerificationResult>;
}

interface VerificationResult {
  verified: boolean;
  timestamp: string;

  checks: {
    // Archive integrity
    archiveIntegrity: {
      passed: boolean;
      expectedHash: string;
      actualHash: string;
    };

    // Signature verification
    signatureValid: {
      passed: boolean;
      signer: string;
      signedAt: string;
    };

    // Reproducibility (re-export and compare)
    reproducibility: {
      passed: boolean;
      originalHash: string;
      regeneratedHash: string;
      differences?: string[];
    };

    // Schema compatibility
    schemaCompatibility: {
      passed: boolean;
      intentVersion: string;
      exporterVersion: string;
      compatible: boolean;
    };
  };
}

async function verifyArchivedExport(
  archive: ArchivePackage,
  exporter: Exporter
): Promise<VerificationResult> {
  // 1. Verify archive integrity
  const actualHash = await computeArchiveHash(archive);
  const integrityOk = actualHash === archive.metadata.integrityHash;

  // 2. Verify signature
  const signatureOk = await verifySignature(
    archive.metadata.integrityHash,
    archive.metadata.signature
  );

  // 3. Extract and re-export intent
  const intent = await extractIntent(archive);
  const currentResult = await exporter.export(intent);

  // 4. Compare with archived artifacts
  const archivedArtifacts = await extractArtifacts(archive);
  const reproducibilityOk = compareArtifacts(
    archivedArtifacts,
    currentResult.artifacts
  );

  // 5. Check schema compatibility
  const compatibilityResult = exporter.checkCompatibility(
    intent.apiVersion
  );

  return {
    verified: integrityOk && signatureOk && reproducibilityOk,
    timestamp: new Date().toISOString(),
    checks: {
      archiveIntegrity: {
        passed: integrityOk,
        expectedHash: archive.metadata.integrityHash,
        actualHash
      },
      signatureValid: {
        passed: signatureOk,
        signer: archive.metadata.signer,
        signedAt: archive.metadata.signedAt
      },
      reproducibility: {
        passed: reproducibilityOk,
        originalHash: archive.metadata.artifactHash,
        regeneratedHash: computeArtifactHash(currentResult.artifacts)
      },
      schemaCompatibility: {
        passed: compatibilityResult.compatible,
        intentVersion: intent.apiVersion,
        exporterVersion: exporter.version,
        compatible: compatibilityResult.compatible
      }
    }
  };
}
```

---

## 8. Implementation Verification Checklist

### 8.1 Determinism Verification

| Check | Verification Method | Pass Criteria |
|-------|---------------------|---------------|
| Byte-identical outputs | Export same intent 100 times | All hashes identical |
| No timestamp leakage | Regex scan for date patterns | Zero matches in content |
| No random values | Static analysis for random calls | Zero random function calls |
| Stable ordering | Export with shuffled input | Identical output |
| Environment independence | Export in 3 different envs | Identical output |

### 8.2 Schema Evolution Verification

| Check | Verification Method | Pass Criteria |
|-------|---------------------|---------------|
| Backward compatibility | Process all historical intents | All process successfully |
| Deprecation warnings | Use deprecated fields | Warnings emitted, no errors |
| Unknown field handling | Add unknown fields | Processing continues |
| Version negotiation | Test version matrix | Correct strategy selected |

### 8.3 Failure Semantics Verification

| Check | Verification Method | Pass Criteria |
|-------|---------------------|---------------|
| Fail-fast validation | Introduce errors at each stage | Immediate failure at stage |
| No partial outputs | Force failure mid-export | No artifacts written |
| Error categorization | Trigger each error type | Correct category assigned |
| Retry idempotency | Retry failed exports | Same failure each time |

### 8.4 Validation Verification

| Check | Verification Method | Pass Criteria |
|-------|---------------------|---------------|
| Schema validation | Invalid schema inputs | All rejected with errors |
| Semantic validation | Invalid semantic inputs | All rejected with errors |
| Reference validation | Invalid references | All rejected with errors |
| Output validation | Corrupt generated output | Validation catches issues |

### 8.5 Guardrail Verification

| Check | Verification Method | Pass Criteria |
|-------|---------------------|---------------|
| Atomic writes | Kill process mid-write | No partial files |
| No environment leakage | Static analysis + runtime | Zero violations |
| Pure transformations | Multiple executions | Identical results |
| Explicit defaults only | Remove optional fields | Validation errors |

### 8.6 Audit Compliance Verification

| Check | Verification Method | Pass Criteria |
|-------|---------------------|---------------|
| Traceability metadata | Inspect all artifacts | All contain metadata |
| Audit log completeness | Export with all scenarios | All events logged |
| Reproducibility | Re-export archived intents | Byte-identical outputs |
| Long-term verification | Verify 1-year-old archives | All verify successfully |

---

## Appendix A: Error Code Reference

### A.1 Validation Errors (V1xxx)

| Code | Message | Remediation |
|------|---------|-------------|
| V1001 | Missing required field: {field} | Add the required field to intent |
| V1002 | Invalid type for field: {field} | Correct the field type |
| V1003 | Value out of range: {field} | Adjust value to valid range |
| V1004 | Pattern mismatch: {field} | Fix value to match pattern |
| V1005 | Array length violation: {field} | Adjust array to valid length |

### A.2 Schema Mismatch Errors (S2xxx)

| Code | Message | Remediation |
|------|---------|-------------|
| S2001 | Unsupported API version: {version} | Use supported version |
| S2002 | Intent version too old: {version} | Migrate intent to newer version |
| S2003 | Intent version too new: {version} | Upgrade exporter |
| S2004 | Unknown intent kind: {kind} | Use supported intent kind |

### A.3 Transform Errors (T3xxx)

| Code | Message | Remediation |
|------|---------|-------------|
| T3001 | Template rendering failed | Check template syntax |
| T3002 | Resource mapping failed | Verify resource definitions |
| T3003 | Computation overflow | Reduce resource values |
| T3004 | Circular dependency detected | Remove circular references |

### A.4 Serialization Errors (E4xxx)

| Code | Message | Remediation |
|------|---------|-------------|
| E4001 | HCL syntax error | Check generated HCL |
| E4002 | YAML encoding error | Check for invalid characters |
| E4003 | JSON serialization limit | Reduce payload size |
| E4004 | Invalid UTF-8 sequence | Fix character encoding |

### A.5 Integrity Errors (I5xxx)

| Code | Message | Remediation |
|------|---------|-------------|
| I5001 | Checksum mismatch | Retry export |
| I5002 | Signature verification failed | Check signing key |
| I5003 | Hash computation error | Check system resources |
| I5004 | Manifest inconsistency | Regenerate export |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Artifact** | A single exported file (e.g., main.tf, deployment.yaml) |
| **Canonical Form** | Deterministic serialization with stable ordering |
| **Determinism** | Property where same input always produces same output |
| **Export** | Process of transforming DeploymentIntent to target format |
| **Intent** | DeploymentIntent - the source specification |
| **Package** | Collection of artifacts with manifest and checksums |
| **Pure Function** | Function with no side effects that depends only on inputs |
| **Round-Trip** | Export followed by reimport for verification |
| **Schema Evolution** | Changes to the DeploymentIntent schema over time |
| **Traceability** | Ability to trace artifact back to source intent |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-02 | ComplianceDocumenter Agent | Initial release |

---

*This document is part of the Agentics Deployment Exporters SPARC documentation suite.*
