/**
 * ExportOrchestrator Module
 *
 * This module provides the core orchestration functionality for the
 * deployment exporters system. It handles:
 *
 * - Determining required exporters based on intent sections
 * - Building execution dependency graph (DAG)
 * - Managing parallel execution with concurrency control
 * - Handling partial failures (configurable via continueOnError)
 * - Coordinating artifact collection
 *
 * @example Basic Usage
 * ```typescript
 * import { createOrchestrator, NormalizedIntent } from './core/orchestrator';
 * import { TerraformExporter } from './exporters/terraform';
 * import { KubernetesExporter } from './exporters/kubernetes';
 *
 * const orchestrator = createOrchestrator();
 *
 * // Register exporters
 * orchestrator.registerExporter(new TerraformExporter());
 * orchestrator.registerExporter(new KubernetesExporter());
 *
 * // Subscribe to progress events
 * const unsubscribe = orchestrator.onProgress((event) => {
 *   console.log(`[${event.type}] ${event.message} (${event.progress}%)`);
 * });
 *
 * // Execute export
 * const result = await orchestrator.execute(normalizedIntent, {
 *   concurrency: 4,
 *   continueOnError: false,
 * });
 *
 * if (result.success) {
 *   console.log(`Produced ${result.artifacts.length} artifacts`);
 * } else {
 *   console.error('Export failed:', result.errors);
 * }
 *
 * // Cleanup
 * unsubscribe();
 * ```
 *
 * @example Dry Run (Planning Only)
 * ```typescript
 * const result = await orchestrator.execute(intent, { dryRun: true });
 * console.log(`Would execute ${result.metadata.executedExporters.length} exporters`);
 * ```
 *
 * @example Continue on Error
 * ```typescript
 * const result = await orchestrator.execute(intent, {
 *   continueOnError: true,
 * });
 *
 * // Collect partial results even if some exporters fail
 * const successfulArtifacts = result.artifacts;
 * const failedExporters = result.errors.map(e => e.exporterId);
 * ```
 *
 * @module core/orchestrator
 */

// Main orchestrator
export { ExportOrchestrator, createOrchestrator } from './ExportOrchestrator.js';

// Execution planner
export {
  ExecutionPlanner,
  CircularDependencyError,
  UnknownDependencyError,
} from './ExecutionPlanner.js';

// Concurrency manager
export {
  ConcurrencyManager,
  ExecutionTimeoutError,
  ExecutionAbortedError,
} from './ConcurrencyManager.js';

// Types
export type {
  // Core types
  ExporterId,
  ExportFormat,
  SemanticVersion,
  IntentSection,
  SerializerType,

  // Options
  ExportOptions,
  OrchestrationOptions,
  ConcurrencyOptions,

  // Results
  ExportResult,
  ExportArtifact,
  ExportError,
  ExportWarning,
  ExportMetadata,
  ExporterExecutionInfo,
  ExporterExecutionResult,

  // Validation
  ValidationResult,
  ValidationError,
  ValidationWarning,

  // Planning
  ExecutionPlan,
  ExporterPlanItem,

  // Progress
  ProgressEvent,
  ProgressEventType,
  ProgressHandler,

  // Intent and Exporter
  NormalizedIntent,
  IExporter,
  IExportOrchestrator,
  ExporterContext,
} from './types.js';
