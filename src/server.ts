/**
 * HTTP Server for Agentics Deployment Exporters
 * Exposes POST /v1/exporters for IaC artifact generation
 * and GET /health for health checks.
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = parseInt(process.env.PORT || '8080', 10);
const SERVICE_NAME = 'agentics-deployment-exporters';

// ─── Request / Response types ───────────────────────────────────────────────

interface ExporterRequestBody {
  intent_ref: { id: string; plan_id: string };
  format_spec: { format: 'terraform' | 'kubernetes' | 'erp'; output_path?: string };
}

interface Artifact {
  name: string;
  content: string;
  type: string;
}

interface ExporterResponseBody {
  export: {
    id: string;
    format: string;
    artifacts: Artifact[];
    generated_at: string;
  };
  execution_metadata: {
    trace_id: string;
    timestamp: string;
    service: string;
  };
}

// ─── Template generators ────────────────────────────────────────────────────

function generateTerraformArtifacts(intentId: string): Artifact[] {
  return [
    {
      name: 'main.tf',
      content: [
        'terraform {',
        '  required_version = ">= 1.0"',
        '  required_providers {',
        '    aws = {',
        '      source  = "hashicorp/aws"',
        '      version = "~> 5.0"',
        '    }',
        '  }',
        '}',
        '',
        'provider "aws" {',
        '  region = var.region',
        '}',
        '',
        `# Generated from intent ${intentId}`,
        'resource "aws_instance" "app" {',
        '  ami           = var.ami_id',
        '  instance_type = var.instance_type',
        '',
        '  tags = {',
        '    Name = "app"',
        '  }',
        '}',
      ].join('\n'),
      type: 'terraform',
    },
    {
      name: 'variables.tf',
      content: [
        'variable "region" {',
        '  type    = string',
        '  default = "us-east-1"',
        '}',
        '',
        'variable "ami_id" {',
        '  type = string',
        '}',
        '',
        'variable "instance_type" {',
        '  type    = string',
        '  default = "t3.micro"',
        '}',
      ].join('\n'),
      type: 'terraform',
    },
  ];
}

function generateKubernetesArtifacts(intentId: string): Artifact[] {
  return [
    {
      name: 'deployment.yaml',
      content: [
        'apiVersion: apps/v1',
        'kind: Deployment',
        'metadata:',
        '  name: app',
        '  labels:',
        `    intent-id: "${intentId}"`,
        'spec:',
        '  replicas: 2',
        '  selector:',
        '    matchLabels:',
        '      app: app',
        '  template:',
        '    metadata:',
        '      labels:',
        '        app: app',
        '    spec:',
        '      containers:',
        '        - name: app',
        '          image: app:latest',
        '          ports:',
        '            - containerPort: 8080',
      ].join('\n'),
      type: 'kubernetes',
    },
    {
      name: 'service.yaml',
      content: [
        'apiVersion: v1',
        'kind: Service',
        'metadata:',
        '  name: app',
        'spec:',
        '  selector:',
        '    app: app',
        '  ports:',
        '    - port: 80',
        '      targetPort: 8080',
        '  type: ClusterIP',
      ].join('\n'),
      type: 'kubernetes',
    },
  ];
}

function generateErpArtifacts(intentId: string): Artifact[] {
  return [
    {
      name: 'manifest.json',
      content: JSON.stringify(
        {
          schema: 'erp/v1',
          intent_id: intentId,
          modules: [
            { name: 'core', version: '1.0.0', enabled: true },
          ],
          configuration: {
            database: { type: 'postgresql', version: '15' },
            cache: { type: 'redis', version: '7' },
          },
        },
        null,
        2,
      ),
      type: 'erp',
    },
  ];
}

function generateArtifacts(format: string, intentId: string): Artifact[] {
  switch (format) {
    case 'terraform':
      return generateTerraformArtifacts(intentId);
    case 'kubernetes':
      return generateKubernetesArtifacts(intentId);
    case 'erp':
      return generateErpArtifacts(intentId);
    default:
      return [];
  }
}

// ─── HTTP helpers ───────────────────────────────────────────────────────────

async function parseBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function sendJSON(res: ServerResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

// ─── Route handlers ─────────────────────────────────────────────────────────

async function handleExport(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJSON(res, 405, { error: 'Method not allowed', allowed: ['POST'] });
    return;
  }

  // Parse body
  let body: ExporterRequestBody;
  try {
    const raw = await parseBody(req);
    body = JSON.parse(raw) as ExporterRequestBody;
  } catch {
    sendJSON(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  // Validate required fields
  if (!body.intent_ref?.id || !body.intent_ref?.plan_id) {
    sendJSON(res, 400, { error: 'intent_ref.id and intent_ref.plan_id are required' });
    return;
  }
  const format = body.format_spec?.format;
  if (!format || !['terraform', 'kubernetes', 'erp'].includes(format)) {
    sendJSON(res, 400, {
      error: 'format_spec.format is required and must be one of: terraform, kubernetes, erp',
    });
    return;
  }

  // Generate artifacts
  const artifacts = generateArtifacts(format, body.intent_ref.id);
  const traceId =
    (req.headers['x-correlation-id'] as string | undefined) ?? randomUUID();

  const response: ExporterResponseBody = {
    export: {
      id: `export-${randomUUID()}`,
      format,
      artifacts,
      generated_at: new Date().toISOString(),
    },
    execution_metadata: {
      trace_id: traceId,
      timestamp: new Date().toISOString(),
      service: SERVICE_NAME,
    },
  };

  sendJSON(res, 200, response);
}

function handleHealth(_req: IncomingMessage, res: ServerResponse): void {
  sendJSON(res, 200, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}

// ─── Main request router ────────────────────────────────────────────────────

async function requestHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = req.url || '/';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Correlation-ID');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (url === '/v1/exporters' && req.method === 'POST') {
      await handleExport(req, res);
    } else if (url === '/health') {
      handleHealth(req, res);
    } else {
      sendJSON(res, 404, { error: 'Not found', path: url });
    }
  } catch (error) {
    console.error('Request error:', error);
    sendJSON(res, 500, {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

const server = createServer(requestHandler);

server.listen(PORT, () => {
  console.log(`${SERVICE_NAME} listening on port ${PORT}`);
  console.log(`  POST /v1/exporters - Generate IaC artifacts`);
  console.log(`  GET  /health       - Health check`);
});
