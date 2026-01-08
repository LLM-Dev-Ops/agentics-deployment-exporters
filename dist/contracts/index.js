/**
 * Contracts Module - Agentics Deployment Exporters
 *
 * This module provides JSON Schema-based contract validation for the
 * Agentics Deployment Exporters system. It includes:
 *
 * - **Types**: TypeScript type definitions for requests, responses, and intents
 * - **Validator**: JSON Schema validation using AJV
 * - **Execution Proof**: Cryptographic proof generation for validated intents
 *
 * All validation is:
 * - Deterministic (same input = same output)
 * - Strict mode (no additional properties allowed)
 * - Type-safe (compile-time and runtime validation)
 *
 * @example
 * ```typescript
 * import {
 *   // Types
 *   type ExporterRequest,
 *   type Intent,
 *   type ExportFormat,
 *   type ValidationResult,
 *
 *   // Validation
 *   ContractValidator,
 *   createContractValidator,
 *   validateRequest,
 *   validateRequestOrThrow,
 *
 *   // Execution Proof
 *   ExecutionProofGenerator,
 *   generateExecutionProof,
 *   verifyExecutionProof,
 *   computeSHA256,
 *
 *   // Type Guards
 *   isIntent,
 *   isExportFormat,
 * } from '@agentics/deployment-exporters/contracts';
 *
 * // Validate a request
 * const result = validateRequest({
 *   intent: {
 *     apiVersion: 'agentics.io/v1',
 *     kind: 'DeploymentIntent',
 *     metadata: { name: 'my-app' },
 *   },
 *   formats: ['terraform', 'kubernetes'],
 * });
 *
 * if (result.valid) {
 *   // Generate execution proof
 *   const proof = generateExecutionProof(request.intent, {
 *     schemaVersion: 'v1',
 *     validationPassed: true,
 *     artifacts: {
 *       'terraform/main.tf': terraformContent,
 *       'kubernetes/deployment.yaml': k8sContent,
 *     },
 *   });
 * }
 * ```
 *
 * @module contracts
 * @version 1.0.0
 */
export { 
// Constants
ExportFormatValues, 
// Type guards
isIntent, isExportFormat, isExporterRequest, } from './types.js';
// =============================================================================
// VALIDATOR
// =============================================================================
export { 
// Validator class
ContractValidator, 
// Factory functions
createContractValidator, getDefaultValidator, 
// Convenience functions
validateRequest, validateRequestOrThrow, } from './validator.js';
export { 
// Proof generator
ExecutionProofGenerator, createExecutionProofGenerator, getDefaultProofGenerator, 
// Convenience functions
generateExecutionProof, verifyExecutionProof, 
// Utility functions
computeSHA256, computeIntentHash, canonicalizeObject, } from './execution-proof.js';
//# sourceMappingURL=index.js.map