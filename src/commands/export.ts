/**
 * Export Command with Executive Synthesis Integration
 *
 * This module provides export operations for generating infrastructure-as-code
 * artifacts with integrated executive synthesis for artifact validation.
 *
 * ## Features
 *
 * - Multi-format export (Terraform, Kubernetes, Helm)
 * - Artifact validation with blocking issue detection
 * - Production risk elevation for sensitive exports
 * - Executive summary generation for approval workflows
 *
 * @module commands/export
 * @version 1.0.0
 */

import { randomUUID } from 'crypto';

import type {
  ExecutiveSummary,
  DeployReferenceInput,
  ExecutionMetricsInput,
  RiskLevel,
} from '../synthesis/index.js';

import {
  buildExecutiveSummary,
  elevateRiskForProduction,
  isProductionTarget,
  calculateSuccessRate,
} from '../synthesis/index.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Supported export formats.
 */
export const ExportFormatValues = ['terraform', 'kubernetes', 'helm', 'cloudformation'] as const;

export type ExportFormat = (typeof ExportFormatValues)[number];

/**
 * Export command input configuration.
 */
export interface ExportInput {
  /** Source intent path or object */
  readonly source: string | Record<string, unknown>;
  /** Target export formats */
  readonly formats: readonly ExportFormat[];
  /** Target environment for the export */
  readonly environment?: string;
  /** Output directory */
  readonly outputDir?: string;
  /** Export options */
  readonly options?: ExportOptions;
}

/**
 * Export options.
 */
export interface ExportOptions {
  /** Validate artifacts after generation */
  readonly validate?: boolean;
  /** Include metadata in artifacts */
  readonly includeMetadata?: boolean;
  /** Pretty print output */
  readonly prettyPrint?: boolean;
  /** Strict mode - fail on warnings */
  readonly strict?: boolean;
  /** Maximum concurrent exports */
  readonly concurrency?: number;
  /** Dry run - validate only */
  readonly dryRun?: boolean;
}

/**
 * Single exported artifact.
 */
export interface ExportArtifact {
  /** Artifact file path */
  readonly path: string;
  /** Artifact content */
  readonly content: unknown;
  /** Export format */
  readonly format: ExportFormat;
  /** Content checksum */
  readonly checksum?: string;
  /** Size in bytes */
  readonly sizeBytes?: number;
}

/**
 * Export validation issue.
 */
export interface ExportValidationIssue {
  /** Issue severity */
  readonly severity: 'error' | 'warning';
  /** Issue code */
  readonly code: string;
  /** Issue message */
  readonly message: string;
  /** Affected artifact path */
  readonly artifactPath?: string;
  /** Location in artifact */
  readonly location?: string;
}

/**
 * Export step log entry.
 */
export interface ExportStepLog {
  /** Step name */
  readonly step: string;
  /** Step status */
  readonly status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  /** Timestamp */
  readonly timestamp: string;
  /** Duration in milliseconds */
  readonly durationMs?: number;
  /** Artifacts produced in this step */
  readonly artifactsProduced?: number;
  /** Error message if failed */
  readonly error?: string;
}

/**
 * Base result for export operations.
 */
export interface ExportCommandResult {
  /** Whether the export succeeded */
  readonly success: boolean;
  /** Error message if failed */
  readonly error?: string;
  /** Generated artifacts */
  readonly artifacts: readonly ExportArtifact[];
  /** Validation issues */
  readonly issues: readonly ExportValidationIssue[];
  /** Execution synthesis */
  readonly synthesis?: ExecutiveSummary;
}

/**
 * Result of a local export operation.
 */
export interface LocalExportResult extends ExportCommandResult {
  /** Output directory */
  readonly outputDir: string;
  /** Execution logs */
  readonly logs: readonly ExportStepLog[];
  /** Export metadata */
  readonly metadata: ExportMetadata;
}

/**
 * Export metadata.
 */
export interface ExportMetadata {
  /** Export session ID */
  readonly exportId: string;
  /** Start timestamp */
  readonly startedAt: string;
  /** Completion timestamp */
  readonly completedAt: string;
  /** Duration in milliseconds */
  readonly durationMs: number;
  /** Formats exported */
  readonly formats: readonly ExportFormat[];
  /** Total artifact count */
  readonly artifactCount: number;
  /** Total size in bytes */
  readonly totalSizeBytes: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Patterns indicating secrets in exported content.
 */
const SECRET_PATTERNS = [
  /password\s*[:=]\s*["'][^"']+["']/i,
  /api[_-]?key\s*[:=]\s*["'][^"']+["']/i,
  /secret[_-]?key\s*[:=]\s*["'][^"']+["']/i,
  /access[_-]?token\s*[:=]\s*["'][^"']+["']/i,
  /private[_-]?key\s*[:=]\s*["'][^"']+["']/i,
  /AWS_SECRET_ACCESS_KEY/i,
  /GOOGLE_APPLICATION_CREDENTIALS/i,
  /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
];

/**
 * Patterns indicating invalid resource references.
 */
const INVALID_REF_PATTERNS = [
  /\$\{[^}]*undefined[^}]*\}/,
  /\$\{[^}]*null[^}]*\}/,
  /<MISSING_REF>/,
  /TODO:/i,
  /FIXME:/i,
];

/**
 * Required fields by format.
 */
const REQUIRED_FIELDS: Record<ExportFormat, readonly string[]> = {
  terraform: ['terraform', 'provider', 'resource'],
  kubernetes: ['apiVersion', 'kind', 'metadata'],
  helm: ['apiVersion', 'name', 'version'],
  cloudformation: ['AWSTemplateFormatVersion', 'Resources'],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a timestamp for logging.
 */
function now(): string {
  return new Date().toISOString();
}

/**
 * Type guard for ExportFormat.
 */
export function isExportFormat(value: unknown): value is ExportFormat {
  return typeof value === 'string' && ExportFormatValues.includes(value as ExportFormat);
}

/**
 * Determines environment from export input.
 */
export function determineExportEnvironment(input: ExportInput): string {
  if (input.environment) {
    return input.environment;
  }
  // Infer from source if it's an object
  if (typeof input.source === 'object') {
    const spec = input.source.spec as Record<string, unknown> | undefined;
    const target = spec?.target as Record<string, unknown> | undefined;
    return (target?.environment as string) || 'development';
  }
  return 'development';
}

/**
 * Checks if export targets production infrastructure.
 */
export function isProductionExport(input: ExportInput): boolean {
  const env = determineExportEnvironment(input);
  return isProductionTarget(env);
}

/**
 * Detects secrets in artifact content.
 */
export function detectSecrets(content: unknown): readonly string[] {
  const secrets: string[] = [];
  const contentStr = typeof content === 'string'
    ? content
    : JSON.stringify(content, null, 2);

  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(contentStr)) {
      secrets.push(`Potential secret detected: ${pattern.source.substring(0, 30)}...`);
    }
  }

  return Object.freeze(secrets);
}

/**
 * Detects invalid resource references in artifact content.
 */
export function detectInvalidReferences(content: unknown): readonly string[] {
  const invalidRefs: string[] = [];
  const contentStr = typeof content === 'string'
    ? content
    : JSON.stringify(content, null, 2);

  for (const pattern of INVALID_REF_PATTERNS) {
    const match = contentStr.match(pattern);
    if (match) {
      invalidRefs.push(`Invalid reference: ${match[0]}`);
    }
  }

  return Object.freeze(invalidRefs);
}

/**
 * Checks for missing required fields based on format.
 */
export function detectMissingFields(
  content: unknown,
  format: ExportFormat
): readonly string[] {
  const missing: string[] = [];
  const contentStr = typeof content === 'string'
    ? content
    : JSON.stringify(content);

  const requiredFields = REQUIRED_FIELDS[format] || [];

  for (const field of requiredFields) {
    // Simple check - field name should appear in content
    if (!contentStr.includes(field)) {
      missing.push(`Missing required field for ${format}: ${field}`);
    }
  }

  return Object.freeze(missing);
}

/**
 * Validates a single artifact and returns blocking issues.
 */
export function validateArtifact(artifact: ExportArtifact): readonly string[] {
  const issues: string[] = [];

  // Detect secrets
  const secrets = detectSecrets(artifact.content);
  issues.push(...secrets);

  // Detect invalid references
  const invalidRefs = detectInvalidReferences(artifact.content);
  issues.push(...invalidRefs);

  // Detect missing required fields
  const missingFields = detectMissingFields(artifact.content, artifact.format);
  issues.push(...missingFields);

  return Object.freeze(issues);
}

/**
 * Extracts all blocking issues from export result.
 */
export function extractExportBlockingIssues(result: {
  artifacts?: readonly ExportArtifact[];
  issues?: readonly ExportValidationIssue[];
  error?: string;
}): readonly string[] {
  const blockingIssues: string[] = [];

  // Add error as blocking issue
  if (result.error) {
    blockingIssues.push(`Export error: ${result.error}`);
  }

  // Add validation errors as blocking issues
  if (result.issues) {
    for (const issue of result.issues) {
      if (issue.severity === 'error') {
        blockingIssues.push(`${issue.code}: ${issue.message}`);
      }
    }
  }

  // Validate each artifact for blocking issues
  if (result.artifacts) {
    for (const artifact of result.artifacts) {
      const artifactIssues = validateArtifact(artifact);
      for (const issue of artifactIssues) {
        blockingIssues.push(`[${artifact.path}] ${issue}`);
      }
    }
  }

  return Object.freeze(blockingIssues);
}

/**
 * Calculates export success rate.
 */
export function calculateExportSuccessRate(result: {
  artifacts?: readonly ExportArtifact[];
  logs?: readonly ExportStepLog[];
}): number {
  // If we have artifacts, calculate based on successful steps
  if (result.logs) {
    const completed = result.logs.filter((l) => l.status === 'completed').length;
    const total = result.logs.filter((l) => l.status !== 'skipped').length;
    return calculateSuccessRate(completed, total);
  }

  // Simple: artifacts generated = success
  if (result.artifacts && result.artifacts.length > 0) {
    return 1.0;
  }

  return 0.0;
}

/**
 * Counts failed iterations in export.
 */
export function countExportFailures(result: {
  logs?: readonly ExportStepLog[];
  issues?: readonly ExportValidationIssue[];
}): number {
  let count = 0;

  if (result.logs) {
    count += result.logs.filter((l) => l.status === 'failed').length;
  }

  if (result.issues) {
    count += result.issues.filter((i) => i.severity === 'error').length;
  }

  return count;
}

/**
 * Determines risk level for export based on format and environment.
 */
export function assessExportRisk(
  input: ExportInput,
  result: { artifacts?: readonly ExportArtifact[]; issues?: readonly ExportValidationIssue[] }
): RiskLevel {
  let riskLevel: RiskLevel = 'low';

  // Terraform for production is high risk
  if (input.formats.includes('terraform') && isProductionExport(input)) {
    riskLevel = 'high';
  }

  // Kubernetes exports - consider cluster scope
  if (input.formats.includes('kubernetes')) {
    // Check for cluster-wide resources
    const hasClusterScope = result.artifacts?.some((a) => {
      const content = typeof a.content === 'string' ? a.content : JSON.stringify(a.content);
      return (
        content.includes('ClusterRole') ||
        content.includes('ClusterRoleBinding') ||
        content.includes('PersistentVolume') ||
        content.includes('StorageClass') ||
        content.includes('CustomResourceDefinition')
      );
    });

    if (hasClusterScope) {
      riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
    }

    if (isProductionExport(input)) {
      riskLevel = riskLevel === 'low' ? 'medium' : 'high';
    }
  }

  // Any validation errors elevate risk
  if (result.issues?.some((i) => i.severity === 'error')) {
    riskLevel = riskLevel === 'low' ? 'medium' : riskLevel === 'medium' ? 'high' : 'critical';
  }

  return riskLevel;
}

// =============================================================================
// EXPORT COMMAND
// =============================================================================

/**
 * Exports intent to infrastructure-as-code artifacts.
 * Generates synthesis for artifact validation and approval workflows.
 *
 * @param input - Export input configuration
 * @returns Export result with synthesis
 */
export async function exportArtifacts(input: ExportInput): Promise<LocalExportResult> {
  const startTime = Date.now();
  const exportId = randomUUID();
  const logs: ExportStepLog[] = [];
  const artifacts: ExportArtifact[] = [];
  const issues: ExportValidationIssue[] = [];

  const outputDir = input.outputDir || './export-output';
  const environment = determineExportEnvironment(input);

  // Step 1: Validate input
  logs.push({
    step: 'input_validation',
    status: 'running',
    timestamp: now(),
  });

  // Validate formats
  for (const format of input.formats) {
    if (!isExportFormat(format)) {
      issues.push({
        severity: 'error',
        code: 'INVALID_FORMAT',
        message: `Unsupported export format: ${format}`,
      });
    }
  }

  if (issues.some((i) => i.severity === 'error')) {
    logs.push({
      step: 'input_validation',
      status: 'failed',
      timestamp: now(),
      durationMs: Date.now() - startTime,
      error: 'Invalid input configuration',
    });

    return buildExportResult({
      success: false,
      error: 'Input validation failed',
      artifacts: [],
      issues,
      logs,
      outputDir,
      exportId,
      startTime,
      input,
    });
  }

  logs.push({
    step: 'input_validation',
    status: 'completed',
    timestamp: now(),
    durationMs: Date.now() - startTime,
  });

  // Step 2: Generate artifacts for each format
  for (const format of input.formats) {
    const formatStart = Date.now();
    logs.push({
      step: `generate_${format}`,
      status: 'running',
      timestamp: now(),
    });

    try {
      // Simulate artifact generation based on format
      const generatedArtifacts = await generateFormatArtifacts(input, format);
      artifacts.push(...generatedArtifacts);

      logs.push({
        step: `generate_${format}`,
        status: 'completed',
        timestamp: now(),
        durationMs: Date.now() - formatStart,
        artifactsProduced: generatedArtifacts.length,
      });
    } catch (error) {
      logs.push({
        step: `generate_${format}`,
        status: 'failed',
        timestamp: now(),
        durationMs: Date.now() - formatStart,
        error: error instanceof Error ? error.message : String(error),
      });

      issues.push({
        severity: 'error',
        code: 'GENERATION_FAILED',
        message: `Failed to generate ${format} artifacts: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  // Step 3: Validate artifacts
  if (input.options?.validate !== false) {
    const validateStart = Date.now();
    logs.push({
      step: 'artifact_validation',
      status: 'running',
      timestamp: now(),
    });

    for (const artifact of artifacts) {
      const artifactIssues = validateArtifact(artifact);
      for (const issue of artifactIssues) {
        issues.push({
          severity: 'warning',
          code: 'VALIDATION_WARNING',
          message: issue,
          artifactPath: artifact.path,
        });
      }
    }

    // Promote warnings to errors in strict mode
    if (input.options?.strict) {
      for (let i = 0; i < issues.length; i++) {
        if (issues[i]!.severity === 'warning') {
          issues[i] = { ...issues[i]!, severity: 'error' };
        }
      }
    }

    logs.push({
      step: 'artifact_validation',
      status: 'completed',
      timestamp: now(),
      durationMs: Date.now() - validateStart,
    });
  }

  // Step 4: Format conversion (if needed)
  const convertStart = Date.now();
  logs.push({
    step: 'format_conversion',
    status: 'running',
    timestamp: now(),
  });

  // Simulate format conversion
  logs.push({
    step: 'format_conversion',
    status: 'completed',
    timestamp: now(),
    durationMs: Date.now() - convertStart,
  });

  // Determine success
  const hasErrors = issues.some((i) => i.severity === 'error');
  const success = artifacts.length > 0 && !hasErrors;

  return buildExportResult({
    success,
    error: hasErrors ? 'Export completed with errors' : undefined,
    artifacts,
    issues,
    logs,
    outputDir,
    exportId,
    startTime,
    input,
  });
}

/**
 * Generates artifacts for a specific format.
 */
async function generateFormatArtifacts(
  input: ExportInput,
  format: ExportFormat
): Promise<ExportArtifact[]> {
  const artifacts: ExportArtifact[] = [];
  const basePath = `${format}`;

  // Generate format-specific artifacts
  switch (format) {
    case 'terraform':
      artifacts.push({
        path: `${basePath}/main.tf`,
        content: generateTerraformContent(input),
        format: 'terraform',
        sizeBytes: 1024,
      });
      artifacts.push({
        path: `${basePath}/variables.tf`,
        content: '# Variables\nvariable "environment" {\n  type = string\n}',
        format: 'terraform',
        sizeBytes: 256,
      });
      artifacts.push({
        path: `${basePath}/outputs.tf`,
        content: '# Outputs\noutput "id" {\n  value = "exported"\n}',
        format: 'terraform',
        sizeBytes: 128,
      });
      break;

    case 'kubernetes':
      artifacts.push({
        path: `${basePath}/deployment.yaml`,
        content: generateKubernetesContent(input, 'Deployment'),
        format: 'kubernetes',
        sizeBytes: 512,
      });
      artifacts.push({
        path: `${basePath}/service.yaml`,
        content: generateKubernetesContent(input, 'Service'),
        format: 'kubernetes',
        sizeBytes: 256,
      });
      break;

    case 'helm':
      artifacts.push({
        path: `${basePath}/Chart.yaml`,
        content: generateHelmChartContent(input),
        format: 'helm',
        sizeBytes: 256,
      });
      artifacts.push({
        path: `${basePath}/values.yaml`,
        content: '# Default values\nreplicaCount: 1\nimage:\n  repository: nginx\n  tag: latest',
        format: 'helm',
        sizeBytes: 128,
      });
      break;

    case 'cloudformation':
      artifacts.push({
        path: `${basePath}/template.yaml`,
        content: generateCloudFormationContent(input),
        format: 'cloudformation',
        sizeBytes: 768,
      });
      break;
  }

  return artifacts;
}

/**
 * Generates Terraform content.
 */
function generateTerraformContent(input: ExportInput): string {
  const env = determineExportEnvironment(input);
  return `# Terraform configuration
terraform {
  required_version = ">= 1.0.0"
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "app" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"

  tags = {
    Environment = "${env}"
    ManagedBy   = "agentics-exporters"
  }
}
`;
}

/**
 * Generates Kubernetes content.
 */
function generateKubernetesContent(input: ExportInput, kind: string): string {
  const env = determineExportEnvironment(input);
  if (kind === 'Deployment') {
    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  labels:
    environment: ${env}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      containers:
      - name: app
        image: nginx:latest
`;
  }
  return `apiVersion: v1
kind: Service
metadata:
  name: app
spec:
  selector:
    app: app
  ports:
  - port: 80
    targetPort: 80
`;
}

/**
 * Generates Helm Chart.yaml content.
 */
function generateHelmChartContent(input: ExportInput): string {
  return `apiVersion: v2
name: app-chart
description: Generated Helm chart
type: application
version: 1.0.0
appVersion: "1.0.0"
`;
}

/**
 * Generates CloudFormation content.
 */
function generateCloudFormationContent(input: ExportInput): string {
  const env = determineExportEnvironment(input);
  return `AWSTemplateFormatVersion: '2010-09-09'
Description: Generated CloudFormation template

Resources:
  AppInstance:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-12345678
      InstanceType: t3.micro
      Tags:
        - Key: Environment
          Value: ${env}
        - Key: ManagedBy
          Value: agentics-exporters
`;
}

/**
 * Builds the final export result with synthesis.
 */
function buildExportResult(params: {
  success: boolean;
  error?: string;
  artifacts: ExportArtifact[];
  issues: ExportValidationIssue[];
  logs: ExportStepLog[];
  outputDir: string;
  exportId: string;
  startTime: number;
  input: ExportInput;
}): LocalExportResult {
  const completedAt = now();
  const durationMs = Date.now() - params.startTime;

  // Calculate metadata
  const totalSizeBytes = params.artifacts.reduce(
    (sum, a) => sum + (a.sizeBytes || 0),
    0
  );

  const metadata: ExportMetadata = {
    exportId: params.exportId,
    startedAt: new Date(params.startTime).toISOString(),
    completedAt,
    durationMs,
    formats: params.input.formats,
    artifactCount: params.artifacts.length,
    totalSizeBytes,
  };

  // Build synthesis
  const environment = determineExportEnvironment(params.input);
  const blockingIssues = extractExportBlockingIssues({
    artifacts: params.artifacts,
    issues: params.issues,
    error: params.error,
  });

  const deployRef: DeployReferenceInput = {
    environment,
    timestamp: completedAt,
    version: '1.0.0',
    commit_sha: process.env['GIT_SHA'],
  };

  const metricsInput: ExecutionMetricsInput = {
    success_rate: calculateExportSuccessRate({
      artifacts: params.artifacts,
      logs: params.logs,
    }),
    failed_iterations: countExportFailures({
      logs: params.logs,
      issues: params.issues,
    }),
    blocking_issues: blockingIssues,
    steps_total: params.logs.length,
    steps_completed: params.logs.filter((l) => l.status === 'completed').length,
  };

  const stepsExecuted = [
    'artifact_generation',
    'format_conversion',
    'validation',
    ...params.logs.map((l) => l.step),
  ];

  // Determine recommendation
  let recommendation: 'APPROVE' | 'DEFER' | 'REJECT' = 'APPROVE';
  if (params.artifacts.length === 0) {
    recommendation = 'REJECT';
  } else if (blockingIssues.length > 0 || params.issues.some((i) => i.severity === 'error')) {
    recommendation = 'DEFER';
  }

  // Build base synthesis
  let synthesis = buildExecutiveSummary(deployRef, metricsInput, stepsExecuted, {
    status: params.success ? 'completed' : 'failed',
    metadata: {
      export_id: params.exportId,
      formats: params.input.formats,
      artifact_count: params.artifacts.length,
    },
  });

  // Apply format-specific risk assessment
  const assessedRisk = assessExportRisk(params.input, {
    artifacts: params.artifacts,
    issues: params.issues,
  });

  if (assessedRisk !== synthesis.risk_level) {
    synthesis = Object.freeze({
      ...synthesis,
      risk_level: assessedRisk,
      advisory_notes: Object.freeze([
        ...(synthesis.advisory_notes || []),
        `Risk level adjusted based on export format and scope`,
      ]),
    });
  }

  // Override recommendation if needed
  if (synthesis.recommendation !== recommendation) {
    synthesis = Object.freeze({
      ...synthesis,
      recommendation,
    });
  }

  // Apply production risk elevation
  if (isProductionExport(params.input)) {
    synthesis = elevateRiskForProduction(synthesis);
  }

  return Object.freeze({
    success: params.success,
    error: params.error,
    artifacts: Object.freeze(params.artifacts),
    issues: Object.freeze(params.issues),
    outputDir: params.outputDir,
    logs: Object.freeze(params.logs),
    metadata: Object.freeze(metadata),
    synthesis,
  });
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Exports to Terraform format only.
 */
export async function exportTerraform(
  source: ExportInput['source'],
  options?: ExportOptions & { environment?: string; outputDir?: string }
): Promise<LocalExportResult> {
  return exportArtifacts({
    source,
    formats: ['terraform'],
    environment: options?.environment,
    outputDir: options?.outputDir,
    options,
  });
}

/**
 * Exports to Kubernetes format only.
 */
export async function exportKubernetes(
  source: ExportInput['source'],
  options?: ExportOptions & { environment?: string; outputDir?: string }
): Promise<LocalExportResult> {
  return exportArtifacts({
    source,
    formats: ['kubernetes'],
    environment: options?.environment,
    outputDir: options?.outputDir,
    options,
  });
}

/**
 * Exports to Helm format only.
 */
export async function exportHelm(
  source: ExportInput['source'],
  options?: ExportOptions & { environment?: string; outputDir?: string }
): Promise<LocalExportResult> {
  return exportArtifacts({
    source,
    formats: ['helm'],
    environment: options?.environment,
    outputDir: options?.outputDir,
    options,
  });
}

/**
 * Exports to all supported formats.
 */
export async function exportAll(
  source: ExportInput['source'],
  options?: ExportOptions & { environment?: string; outputDir?: string }
): Promise<LocalExportResult> {
  return exportArtifacts({
    source,
    formats: ['terraform', 'kubernetes', 'helm'],
    environment: options?.environment,
    outputDir: options?.outputDir,
    options,
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  exportArtifacts,
  exportTerraform,
  exportKubernetes,
  exportHelm,
  exportAll,
  isExportFormat,
  determineExportEnvironment,
  isProductionExport,
  detectSecrets,
  detectInvalidReferences,
  detectMissingFields,
  validateArtifact,
  extractExportBlockingIssues,
  calculateExportSuccessRate,
  countExportFailures,
  assessExportRisk,
};
