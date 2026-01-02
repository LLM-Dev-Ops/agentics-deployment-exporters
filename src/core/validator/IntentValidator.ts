/**
 * Intent Validator
 *
 * Main validator implementing IIntentValidator.
 * Coordinates all validation layers in order:
 * 1. Structural validation (JSON Schema via Zod)
 * 2. Semantic validation (business rules)
 * 3. Reference validation (integrity checks)
 * 4. Security validation (injection prevention)
 *
 * Collects ALL errors before failing (not fail-fast).
 * Validation is deterministic - same input always produces same result.
 */

import type {
  IIntentValidator,
  IntentValidationResult,
  ParsedIntent,
  ValidatedIntent,
  ValidationIssue,
  ValidationMetadata,
  ValidationOptions,
  ValidationRule,
} from './types.js';
import { SchemaValidator } from './SchemaValidator.js';
import { RefValidator } from './RefValidator.js';
import { ConstraintValidator } from './ConstraintValidator.js';
import { SecurityValidator } from './SecurityValidator.js';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const DEFAULT_SCHEMA_VERSION = 'agentics.io/v1';

// -----------------------------------------------------------------------------
// Intent Validator Implementation
// -----------------------------------------------------------------------------

/**
 * Main intent validator that coordinates all validation layers.
 *
 * Implements the IIntentValidator interface and provides:
 * - Structural validation using Zod schemas
 * - Reference integrity checking
 * - Business constraint validation
 * - Security vulnerability scanning
 *
 * All-or-nothing: If any error is found, the entire intent is rejected.
 * Deterministic: Same input always produces same validation result.
 */
export class IntentValidator implements IIntentValidator {
  private readonly schemaValidator: SchemaValidator;
  private readonly refValidator: RefValidator;
  private readonly constraintValidator: ConstraintValidator;
  private readonly securityValidator: SecurityValidator;
  private readonly customRules: Map<string, ValidationRule>;

  constructor() {
    this.schemaValidator = new SchemaValidator();
    this.refValidator = new RefValidator();
    this.constraintValidator = new ConstraintValidator();
    this.securityValidator = new SecurityValidator();
    this.customRules = new Map();
  }

  /**
   * Validate parsed intent against schema and business rules.
   * Collects ALL errors before failing (not fail-fast at individual rule level).
   *
   * @param intent - Parsed intent to validate
   * @param options - Validation options
   * @returns Validation result with all errors and warnings
   */
  async validate(
    intent: ParsedIntent,
    options: ValidationOptions = {}
  ): Promise<IntentValidationResult> {
    const startTime = Date.now();
    const allErrors: ValidationIssue[] = [];
    const allWarnings: ValidationIssue[] = [];
    let rulesApplied = 0;

    // Determine schema version
    const schemaVersion = options.schemaVersion ?? DEFAULT_SCHEMA_VERSION;

    // Track rules to skip
    const skipRules = new Set(options.skipRules ?? []);

    // ---------------------------------------------------------------------------
    // Layer 1: Structural Validation (JSON Schema via Zod)
    // ---------------------------------------------------------------------------
    if (!skipRules.has('schema')) {
      rulesApplied++;
      const schemaResult = this.schemaValidator.validate(intent);

      if (!schemaResult.valid) {
        // Collect all schema errors
        for (const issue of schemaResult.issues) {
          if (issue.severity === 'error') {
            allErrors.push(issue);
          } else {
            allWarnings.push(issue);
          }
        }
      }
    }

    // ---------------------------------------------------------------------------
    // Layer 2: Semantic Validation (Business Rules / Constraints)
    // ---------------------------------------------------------------------------
    if (!skipRules.has('constraints')) {
      rulesApplied++;
      const constraintIssues = this.constraintValidator.validateConstraints(intent);

      for (const issue of constraintIssues) {
        if (issue.severity === 'error') {
          allErrors.push(issue);
        } else {
          allWarnings.push(issue);
        }
      }
    }

    // ---------------------------------------------------------------------------
    // Layer 3: Reference Validation (Integrity Checks)
    // ---------------------------------------------------------------------------
    if (!skipRules.has('references')) {
      rulesApplied++;
      const refIssues = this.refValidator.validateReferences(intent);

      for (const issue of refIssues) {
        if (issue.severity === 'error') {
          allErrors.push(issue);
        } else {
          allWarnings.push(issue);
        }
      }
    }

    // ---------------------------------------------------------------------------
    // Layer 4: Security Validation (Injection Prevention)
    // ---------------------------------------------------------------------------
    if (options.enableSecurityValidation !== false && !skipRules.has('security')) {
      rulesApplied++;
      const securityResult = this.securityValidator.scan(intent);

      for (const issue of securityResult.issues) {
        if (issue.severity === 'error') {
          allErrors.push(issue);
        } else {
          allWarnings.push(issue);
        }
      }
    }

    // ---------------------------------------------------------------------------
    // Layer 5: Custom Validation Rules
    // ---------------------------------------------------------------------------
    const customRulesToApply = [
      ...this.customRules.values(),
      ...(options.customRules ?? []),
    ];

    for (const rule of customRulesToApply) {
      if (skipRules.has(rule.id)) {
        continue;
      }

      rulesApplied++;
      const ruleIssues = rule.validate(intent, options.context);

      for (const issue of ruleIssues) {
        if (issue.severity === 'error') {
          allErrors.push(issue);
        } else {
          allWarnings.push(issue);
        }
      }
    }

    // ---------------------------------------------------------------------------
    // Build Result
    // ---------------------------------------------------------------------------
    const durationMs = Date.now() - startTime;
    const metadata = this.buildMetadata(schemaVersion, rulesApplied, durationMs);

    // In strict mode, treat warnings as errors
    const effectiveErrors = options.strict
      ? [...allErrors, ...allWarnings]
      : allErrors;

    const effectiveWarnings = options.strict ? [] : allWarnings;

    // All-or-nothing: if any error, reject entire intent
    const valid = effectiveErrors.length === 0;

    // Build validated intent only if valid
    const validatedIntent = valid
      ? this.buildValidatedIntent(intent)
      : undefined;

    return {
      valid,
      errors: this.sortIssues(effectiveErrors),
      warnings: this.sortIssues(effectiveWarnings),
      intent: validatedIntent,
      metadata,
    };
  }

  /**
   * Register a custom validation rule.
   *
   * @param rule - Validation rule to register
   */
  registerRule(rule: ValidationRule): void {
    if (this.customRules.has(rule.id)) {
      throw new Error(`Validation rule with id "${rule.id}" is already registered`);
    }
    this.customRules.set(rule.id, rule);
  }

  /**
   * Get all registered validation rules (including built-in descriptions).
   */
  getRules(): readonly ValidationRule[] {
    const builtInRules: ValidationRule[] = [
      {
        id: 'schema',
        name: 'Schema Validation',
        description: 'Validates intent structure against Zod schemas',
        severity: 'error',
        category: 'SCHEMA_ERROR',
        validate: () => [], // Actual validation handled by SchemaValidator
      },
      {
        id: 'constraints',
        name: 'Constraint Validation',
        description: 'Validates business rules and cross-field constraints',
        severity: 'error',
        category: 'CONSTRAINT_ERROR',
        validate: () => [], // Actual validation handled by ConstraintValidator
      },
      {
        id: 'references',
        name: 'Reference Validation',
        description: 'Validates internal references and detects circular dependencies',
        severity: 'error',
        category: 'REF_ERROR',
        validate: () => [], // Actual validation handled by RefValidator
      },
      {
        id: 'security',
        name: 'Security Validation',
        description: 'Scans for injection attacks and security vulnerabilities',
        severity: 'error',
        category: 'SECURITY_ERROR',
        validate: () => [], // Actual validation handled by SecurityValidator
      },
    ];

    return [...builtInRules, ...this.customRules.values()];
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  /**
   * Build validation metadata.
   */
  private buildMetadata(
    schemaVersion: string,
    rulesApplied: number,
    durationMs: number
  ): ValidationMetadata {
    return {
      schemaVersion,
      validatedAt: new Date().toISOString(),
      rulesApplied,
      durationMs,
    };
  }

  /**
   * Build validated intent from parsed intent.
   */
  private buildValidatedIntent(intent: ParsedIntent): ValidatedIntent {
    const data = intent.data as Record<string, unknown>;

    return {
      apiVersion: data.apiVersion as string,
      kind: data.kind as string,
      metadata: data.metadata as ValidatedIntent['metadata'],
      spec: data.spec as ValidatedIntent['spec'],
      _raw: data,
    };
  }

  /**
   * Sort issues by path for deterministic output.
   */
  private sortIssues(issues: ValidationIssue[]): ValidationIssue[] {
    return [...issues].sort((a, b) => {
      // First sort by category
      const categoryOrder: Record<string, number> = {
        'SCHEMA_ERROR': 1,
        'CONSTRAINT_ERROR': 2,
        'REF_ERROR': 3,
        'SECURITY_ERROR': 4,
      };

      const categoryDiff = (categoryOrder[a.category] ?? 99) - (categoryOrder[b.category] ?? 99);
      if (categoryDiff !== 0) {
        return categoryDiff;
      }

      // Then by path
      const pathCompare = a.path.localeCompare(b.path, 'en');
      if (pathCompare !== 0) {
        return pathCompare;
      }

      // Then by code
      return a.code.localeCompare(b.code, 'en');
    });
  }
}

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

/**
 * Create a new IntentValidator instance.
 */
export function createIntentValidator(): IIntentValidator {
  return new IntentValidator();
}
