/**
 * ConcurrencyManager - Parallel execution control for export orchestration.
 *
 * This module handles:
 * - Executing exporters in parallel with configurable concurrency limits
 * - Managing execution phases (groups of exporters that can run in parallel)
 * - Error handling per continueOnError setting
 * - Timeout handling for individual exporters
 * - Progress tracking and reporting
 *
 * Key principles:
 * - Atomic operations: all-or-nothing unless continueOnError is set
 * - Traceability: track which exporter produced which artifact
 * - Determinism: same execution order for same input (within phases)
 */

import type {
  ConcurrencyOptions,
  ExportArtifact,
  ExportError,
  ExporterId,
  ExporterContext,
  ExporterExecutionResult,
  ExecutionPlan,
  IExporter,
  NormalizedIntent,
  ProgressEvent,
  ProgressHandler,
} from './types.js';

/**
 * Error thrown when execution times out.
 */
export class ExecutionTimeoutError extends Error {
  constructor(
    public readonly exporterId: ExporterId,
    public readonly timeoutMs: number,
    message?: string
  ) {
    super(message ?? `Exporter "${exporterId}" timed out after ${timeoutMs}ms`);
    this.name = 'ExecutionTimeoutError';
  }
}

/**
 * Error thrown when execution fails and continueOnError is false.
 */
export class ExecutionAbortedError extends Error {
  constructor(
    public readonly exporterId: ExporterId,
    public readonly cause: Error,
    message?: string
  ) {
    super(message ?? `Execution aborted due to failure in exporter "${exporterId}"`);
    this.name = 'ExecutionAbortedError';
  }
}

/**
 * Default concurrency options.
 */
const DEFAULT_CONCURRENCY_OPTIONS: ConcurrencyOptions = {
  maxConcurrency: 4,
  continueOnError: false,
  timeoutMs: 0, // No timeout
};

/**
 * Manages concurrent execution of exporters.
 */
export class ConcurrencyManager {
  private progressHandlers: Set<ProgressHandler> = new Set();
  private aborted = false;

  /**
   * Execute a plan with parallel execution support.
   *
   * @param plan - The execution plan
   * @param exporters - Map of exporter ID to exporter instance
   * @param intent - The normalized intent
   * @param context - Execution context
   * @param options - Concurrency options
   * @returns Array of execution results
   */
  async executeParallel(
    plan: ExecutionPlan,
    exporters: ReadonlyMap<ExporterId, IExporter>,
    intent: NormalizedIntent,
    context: Omit<ExporterContext, 'dependencyArtifacts' | 'intent'>,
    options: Partial<ConcurrencyOptions> = {}
  ): Promise<readonly ExporterExecutionResult[]> {
    const opts: ConcurrencyOptions = {
      ...DEFAULT_CONCURRENCY_OPTIONS,
      ...options,
    };

    this.aborted = false;

    const results: ExporterExecutionResult[] = [];
    const artifactsByExporter = new Map<ExporterId, readonly ExportArtifact[]>();
    let overallProgress = 0;
    const totalExporters = plan.order.length;

    this.emitProgress({
      type: 'execution-start',
      timestamp: new Date().toISOString(),
      progress: 0,
      message: `Starting execution of ${totalExporters} exporters in ${plan.phases.length} phases`,
      totalPhases: plan.phases.length,
    });

    try {
      // Execute phase by phase
      for (let phaseIndex = 0; phaseIndex < plan.phases.length; phaseIndex++) {
        if (this.aborted) {
          break;
        }

        const phase = plan.phases[phaseIndex] ?? [];

        this.emitProgress({
          type: 'phase-start',
          timestamp: new Date().toISOString(),
          progress: overallProgress,
          phase: phaseIndex,
          totalPhases: plan.phases.length,
          message: `Starting phase ${phaseIndex + 1}/${plan.phases.length} with ${phase.length} exporters`,
        });

        // Execute exporters in this phase with concurrency limit
        const phaseResults = await this.executePhase(
          phase,
          exporters,
          intent,
          { ...context, dependencyArtifacts: artifactsByExporter },
          artifactsByExporter,
          opts
        );

        // Process results
        for (const result of phaseResults) {
          results.push(result);

          if (result.success) {
            artifactsByExporter.set(result.exporterId, result.artifacts);
          } else if (!opts.continueOnError) {
            this.aborted = true;
            throw new ExecutionAbortedError(
              result.exporterId,
              result.error?.cause ?? new Error(result.error?.message ?? 'Unknown error')
            );
          }
        }

        overallProgress = Math.round(
          ((phaseIndex + 1) / plan.phases.length) * 100
        );

        this.emitProgress({
          type: 'phase-complete',
          timestamp: new Date().toISOString(),
          progress: overallProgress,
          phase: phaseIndex,
          totalPhases: plan.phases.length,
          message: `Completed phase ${phaseIndex + 1}/${plan.phases.length}`,
        });
      }

      this.emitProgress({
        type: 'execution-complete',
        timestamp: new Date().toISOString(),
        progress: 100,
        message: `Execution complete: ${results.filter((r) => r.success).length}/${results.length} exporters succeeded`,
      });

      return results;
    } catch (error) {
      this.emitProgress({
        type: 'execution-error',
        timestamp: new Date().toISOString(),
        progress: overallProgress,
        message: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: this.createExportError(
          error instanceof ExecutionAbortedError
            ? error.exporterId
            : 'orchestrator',
          error instanceof Error ? error : new Error(String(error)),
          'execution'
        ),
      });
      throw error;
    }
  }

  /**
   * Execute a single phase with concurrency control.
   */
  private async executePhase(
    exporterIds: readonly ExporterId[],
    exporters: ReadonlyMap<ExporterId, IExporter>,
    intent: NormalizedIntent,
    context: Omit<ExporterContext, 'intent'> & {
      dependencyArtifacts: ReadonlyMap<ExporterId, readonly ExportArtifact[]>;
    },
    artifactsByExporter: Map<ExporterId, readonly ExportArtifact[]>,
    options: ConcurrencyOptions
  ): Promise<ExporterExecutionResult[]> {
    const results: ExporterExecutionResult[] = [];

    // Process in batches of maxConcurrency
    for (let i = 0; i < exporterIds.length; i += options.maxConcurrency) {
      if (this.aborted) {
        // Mark remaining as skipped
        for (let j = i; j < exporterIds.length; j++) {
          const id = exporterIds[j];
          if (id !== undefined) {
            results.push({
              exporterId: id,
              success: false,
              artifacts: [],
              error: this.createExportError(
                id,
                new Error('Execution aborted'),
                'execution'
              ),
              durationMs: 0,
            });
          }
        }
        break;
      }

      const batch = exporterIds.slice(i, i + options.maxConcurrency);

      // Execute batch in parallel
      const batchPromises = batch.map((id) =>
        this.executeExporter(
          id,
          exporters,
          intent,
          context,
          artifactsByExporter,
          options
        )
      );

      const batchResults = await Promise.all(batchPromises);

      // Collect results and check for failures
      for (const result of batchResults) {
        results.push(result);

        if (!result.success && !options.continueOnError) {
          this.aborted = true;
        }
      }
    }

    return results;
  }

  /**
   * Execute a single exporter.
   */
  private async executeExporter(
    exporterId: ExporterId,
    exporters: ReadonlyMap<ExporterId, IExporter>,
    intent: NormalizedIntent,
    context: Omit<ExporterContext, 'intent'> & {
      dependencyArtifacts: ReadonlyMap<ExporterId, readonly ExportArtifact[]>;
    },
    _artifactsByExporter: Map<ExporterId, readonly ExportArtifact[]>,
    options: ConcurrencyOptions
  ): Promise<ExporterExecutionResult> {
    const exporter = exporters.get(exporterId);
    if (exporter === undefined) {
      return {
        exporterId,
        success: false,
        artifacts: [],
        error: this.createExportError(
          exporterId,
          new Error(`Exporter "${exporterId}" not found`),
          'execution'
        ),
        durationMs: 0,
      };
    }

    const startTime = Date.now();

    this.emitProgress({
      type: 'exporter-start',
      timestamp: new Date().toISOString(),
      progress: 0,
      exporterId,
      exporterName: exporter.name,
      message: `Starting exporter: ${exporter.name}`,
    });

    try {
      // Build full context
      const fullContext: ExporterContext = {
        intent,
        options: context.options,
        dependencyArtifacts: context.dependencyArtifacts,
        correlationId: context.correlationId,
        exportId: context.exportId,
      };

      // Execute with optional timeout
      const artifacts = await this.executeWithTimeout(
        () =>
          exporter.transform(intent, fullContext.options),
        exporterId,
        options.timeoutMs
      );

      const durationMs = Date.now() - startTime;

      this.emitProgress({
        type: 'exporter-complete',
        timestamp: new Date().toISOString(),
        progress: 100,
        exporterId,
        exporterName: exporter.name,
        message: `Completed exporter: ${exporter.name} (${artifacts.length} artifacts in ${durationMs}ms)`,
      });

      return {
        exporterId,
        success: true,
        artifacts,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;

      const exportError = this.createExportError(
        exporterId,
        error instanceof Error ? error : new Error(String(error)),
        'execution'
      );

      this.emitProgress({
        type: 'exporter-error',
        timestamp: new Date().toISOString(),
        progress: 0,
        exporterId,
        exporterName: exporter.name,
        message: `Failed exporter: ${exporter.name} - ${exportError.message}`,
        error: exportError,
      });

      return {
        exporterId,
        success: false,
        artifacts: [],
        error: exportError,
        durationMs,
      };
    }
  }

  /**
   * Execute a function with an optional timeout.
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    exporterId: ExporterId,
    timeoutMs: number
  ): Promise<T> {
    if (timeoutMs <= 0) {
      return fn();
    }

    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new ExecutionTimeoutError(exporterId, timeoutMs));
      }, timeoutMs);

      fn()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Create an ExportError from an Error.
   */
  private createExportError(
    exporterId: ExporterId,
    error: Error,
    stage: 'planning' | 'execution' | 'validation' | 'collection'
  ): ExportError {
    return {
      code: this.getErrorCode(error),
      message: error.message,
      exporterId,
      stage,
      recoverable: this.isRecoverableError(error),
      cause: error,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get error code based on error type.
   */
  private getErrorCode(error: Error): string {
    if (error instanceof ExecutionTimeoutError) {
      return 'T3003';
    }
    if (error instanceof ExecutionAbortedError) {
      return 'T3004';
    }
    if (error.name === 'ValidationError') {
      return 'V1001';
    }
    return 'T3001';
  }

  /**
   * Determine if an error is recoverable.
   */
  private isRecoverableError(error: Error): boolean {
    // Timeout errors are potentially recoverable with retry
    if (error instanceof ExecutionTimeoutError) {
      return true;
    }
    // Aborted errors are not recoverable
    if (error instanceof ExecutionAbortedError) {
      return false;
    }
    // Most other errors are potentially recoverable
    return true;
  }

  /**
   * Subscribe to progress events.
   * @returns Unsubscribe function
   */
  onProgress(handler: ProgressHandler): () => void {
    this.progressHandlers.add(handler);
    return () => {
      this.progressHandlers.delete(handler);
    };
  }

  /**
   * Emit a progress event to all handlers.
   */
  private emitProgress(event: Omit<ProgressEvent, 'timestamp'> & { timestamp?: string }): void {
    const fullEvent: ProgressEvent = {
      ...event,
      timestamp: event.timestamp ?? new Date().toISOString(),
    };

    for (const handler of Array.from(this.progressHandlers)) {
      try {
        handler(fullEvent);
      } catch {
        // Ignore handler errors
      }
    }
  }

  /**
   * Abort current execution.
   */
  abort(): void {
    this.aborted = true;
  }

  /**
   * Check if execution was aborted.
   */
  isAborted(): boolean {
    return this.aborted;
  }

  /**
   * Reset abort state.
   */
  reset(): void {
    this.aborted = false;
  }

  /**
   * Calculate optimal concurrency based on phase composition.
   */
  static calculateOptimalConcurrency(
    plan: ExecutionPlan,
    maxConcurrency: number
  ): number {
    if (plan.phases.length === 0) {
      return 1;
    }

    // Find the maximum phase size
    let maxPhaseSize = 0;
    for (const phase of plan.phases) {
      maxPhaseSize = Math.max(maxPhaseSize, phase.length);
    }

    // Don't exceed max concurrency or the largest phase size
    return Math.min(maxConcurrency, maxPhaseSize);
  }
}
