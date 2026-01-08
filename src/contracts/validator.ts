/**
 * Contract Validator for Agentics Deployment Exporters
 *
 * Provides JSON Schema validation using AJV for strict request validation.
 * All validation is deterministic and side-effect free.
 *
 * @module contracts/validator
 * @version 1.0.0
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import type {
  ExporterRequest,
  ValidationResult,
  ValidationErrorDetail,
} from './types.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCHEMA_PATH = join(__dirname, 'schemas', 'exporters', 'v1', 'request.schema.json');
const SCHEMA_VERSION = 'v1';

// =============================================================================
// DYNAMIC IMPORTS FOR AJV (handles ESM/CJS interop)
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AjvInstance = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AjvValidateFunction = any;

interface AjvErrorObject {
  keyword: string;
  instancePath: string;
  schemaPath: string;
  params: Record<string, unknown>;
  message?: string;
  schema?: unknown;
  data?: unknown;
}

/**
 * Loads AJV dynamically to handle ESM/CJS interop.
 */
async function loadAjv(): Promise<{ Ajv: new (opts?: object) => AjvInstance; addFormats: (ajv: AjvInstance) => void }> {
  const ajvModule = await import('ajv');
  const ajvFormatsModule = await import('ajv-formats');

  // Handle both default export styles
  const Ajv = ((ajvModule as unknown as { default?: new (opts?: object) => AjvInstance }).default ?? ajvModule) as new (opts?: object) => AjvInstance;
  const addFormats = ((ajvFormatsModule as unknown as { default?: (ajv: AjvInstance) => void }).default ?? ajvFormatsModule) as (ajv: AjvInstance) => void;

  return { Ajv, addFormats };
}

// =============================================================================
// VALIDATOR CLASS
// =============================================================================

/**
 * Contract validator for exporter requests.
 * Uses AJV for JSON Schema validation with strict mode enabled.
 */
export class ContractValidator {
  private ajv: AjvInstance | null = null;
  private validateFn: AjvValidateFunction | null = null;
  private readonly schemaVersion: string;
  private initPromise: Promise<void> | null = null;

  /**
   * Creates a new ContractValidator instance.
   * Initialization is lazy - call init() or any validation method to initialize.
   */
  constructor() {
    this.schemaVersion = SCHEMA_VERSION;
  }

  /**
   * Initializes the validator by loading AJV and compiling the schema.
   * This is called automatically on first use.
   */
  async init(): Promise<void> {
    if (this.validateFn) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    const { Ajv, addFormats } = await loadAjv();

    // Initialize AJV with strict mode
    this.ajv = new Ajv({
      strict: true,
      strictSchema: true,
      strictNumbers: true,
      strictTypes: true,
      strictTuples: true,
      strictRequired: true,
      allErrors: true,
      verbose: true,
      validateFormats: true,
    });

    // Add format validators (date-time, uri, etc.)
    addFormats(this.ajv);

    // Load and compile schema
    const schemaContent = readFileSync(SCHEMA_PATH, 'utf-8');
    const schema = JSON.parse(schemaContent);
    this.validateFn = this.ajv.compile(schema);
  }

  /**
   * Validates an exporter request against the JSON Schema.
   * Pure function - no side effects.
   *
   * @param request - The request to validate
   * @returns Validation result with errors if any
   */
  async validate(request: unknown): Promise<ValidationResult> {
    await this.init();

    const valid = this.validateFn!(request);

    if (valid) {
      return {
        valid: true,
        errors: [],
        schemaVersion: this.schemaVersion,
      };
    }

    const errors = this.transformErrors(this.validateFn!.errors || []);

    return {
      valid: false,
      errors,
      schemaVersion: this.schemaVersion,
    };
  }

  /**
   * Validates and returns a typed request if valid.
   * Throws if validation fails.
   *
   * @param request - The request to validate
   * @returns The validated and typed request
   * @throws Error if validation fails
   */
  async validateOrThrow(request: unknown): Promise<ExporterRequest> {
    const result = await this.validate(request);

    if (!result.valid) {
      const errorMessages = result.errors
        .map((e) => `${e.path}: ${e.message}`)
        .join('; ');
      throw new Error(`Contract validation failed: ${errorMessages}`);
    }

    return request as ExporterRequest;
  }

  /**
   * Checks if a request is valid without returning detailed errors.
   *
   * @param request - The request to check
   * @returns true if valid, false otherwise
   */
  async isValid(request: unknown): Promise<boolean> {
    await this.init();
    return this.validateFn!(request);
  }

  /**
   * Synchronous validation (requires init() to have been called first).
   * Throws if not initialized.
   *
   * @param request - The request to validate
   * @returns Validation result with errors if any
   */
  validateSync(request: unknown): ValidationResult {
    if (!this.validateFn) {
      throw new Error('ContractValidator not initialized. Call init() first or use async validate().');
    }

    const valid = this.validateFn(request);

    if (valid) {
      return {
        valid: true,
        errors: [],
        schemaVersion: this.schemaVersion,
      };
    }

    const errors = this.transformErrors(this.validateFn.errors || []);

    return {
      valid: false,
      errors,
      schemaVersion: this.schemaVersion,
    };
  }

  /**
   * Gets the schema version used for validation.
   *
   * @returns The schema version string
   */
  getSchemaVersion(): string {
    return this.schemaVersion;
  }

  /**
   * Gets the raw JSON Schema object.
   *
   * @returns The JSON Schema
   */
  getSchema(): object {
    const schemaContent = readFileSync(SCHEMA_PATH, 'utf-8');
    return JSON.parse(schemaContent);
  }

  /**
   * Transforms AJV errors into our ValidationErrorDetail format.
   *
   * @param ajvErrors - AJV error objects
   * @returns Transformed error details
   */
  private transformErrors(ajvErrors: AjvErrorObject[]): readonly ValidationErrorDetail[] {
    return ajvErrors.map((error): ValidationErrorDetail => {
      const path = error.instancePath || '/';

      let message = error.message || 'Validation error';

      // Enhance error messages based on keyword
      switch (error.keyword) {
        case 'additionalProperties':
          message = `Additional property '${error.params?.additionalProperty}' is not allowed`;
          break;
        case 'required':
          message = `Missing required property '${error.params?.missingProperty}'`;
          break;
        case 'enum':
          message = `Value must be one of: ${(error.params?.allowedValues as string[])?.join(', ')}`;
          break;
        case 'pattern':
          message = `Value does not match pattern: ${error.params?.pattern}`;
          break;
        case 'type':
          message = `Expected ${error.params?.type}, got ${typeof error.data}`;
          break;
        case 'minLength':
          message = `String must be at least ${error.params?.limit} characters`;
          break;
        case 'maxLength':
          message = `String must not exceed ${error.params?.limit} characters`;
          break;
        case 'minimum':
          message = `Value must be >= ${error.params?.limit}`;
          break;
        case 'maximum':
          message = `Value must be <= ${error.params?.limit}`;
          break;
      }

      return {
        path,
        message,
        expected: error.schema,
        actual: error.data,
        keyword: error.keyword,
      };
    });
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a new ContractValidator instance.
 * Factory function for convenient instantiation.
 *
 * @returns A new ContractValidator
 */
export function createContractValidator(): ContractValidator {
  return new ContractValidator();
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let _defaultValidator: ContractValidator | null = null;

/**
 * Gets the default (singleton) validator instance.
 * Lazy initialization for efficiency.
 *
 * @returns The default ContractValidator
 */
export function getDefaultValidator(): ContractValidator {
  if (!_defaultValidator) {
    _defaultValidator = createContractValidator();
  }
  return _defaultValidator;
}

/**
 * Validates a request using the default validator.
 * Convenience function for one-off validations.
 *
 * @param request - The request to validate
 * @returns Validation result
 */
export async function validateRequest(request: unknown): Promise<ValidationResult> {
  return getDefaultValidator().validate(request);
}

/**
 * Validates a request and throws if invalid.
 * Convenience function for one-off validations.
 *
 * @param request - The request to validate
 * @returns The validated request
 * @throws Error if validation fails
 */
export async function validateRequestOrThrow(request: unknown): Promise<ExporterRequest> {
  return getDefaultValidator().validateOrThrow(request);
}
