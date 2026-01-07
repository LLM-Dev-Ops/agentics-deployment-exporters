/**
 * HTTP Server for Agentics Deployment Exporters
 * Exposes /v1/exporters endpoint for Cloud Run deployment
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { exportIntent, createDefaultOrchestrator, AVAILABLE_FORMATS, VERSION } from './index.js';

const PORT = parseInt(process.env.PORT || '8080', 10);

interface ExportRequest {
  intent: Record<string, unknown>;
  formats?: string[];
  options?: {
    concurrency?: number;
    continueOnError?: boolean;
    dryRun?: boolean;
  };
}

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

async function handleExport(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJSON(res, 405, { error: 'Method not allowed', allowed: ['POST'] });
    return;
  }

  try {
    const body = await parseBody(req);
    const request: ExportRequest = JSON.parse(body);

    if (!request.intent) {
      sendJSON(res, 400, { error: 'Missing required field: intent' });
      return;
    }

    const options: Record<string, unknown> = {};
    if (request.formats) options.formats = request.formats;
    if (request.options?.concurrency !== undefined) options.concurrency = request.options.concurrency;
    if (request.options?.continueOnError !== undefined) options.continueOnError = request.options.continueOnError;
    if (request.options?.dryRun !== undefined) options.dryRun = request.options.dryRun;

    const result = await exportIntent(request.intent, options as never);

    sendJSON(res, result.success ? 200 : 422, result);
  } catch (error) {
    sendJSON(res, 400, {
      error: 'Invalid request',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function handleHealth(_req: IncomingMessage, res: ServerResponse): void {
  sendJSON(res, 200, {
    status: 'healthy',
    version: VERSION,
    formats: AVAILABLE_FORMATS,
  });
}

function handleInfo(_req: IncomingMessage, res: ServerResponse): void {
  const orchestrator = createDefaultOrchestrator();
  const exporters = orchestrator.getExporters();

  sendJSON(res, 200, {
    name: '@agentics/deployment-exporters',
    version: VERSION,
    formats: AVAILABLE_FORMATS,
    exporters: exporters.map((e) => ({
      id: e.id,
      name: e.name,
      version: e.version,
    })),
    endpoints: {
      'POST /v1/exporters': 'Export deployment intent to infrastructure code',
      'GET /v1/exporters': 'Get exporter information',
      'GET /health': 'Health check endpoint',
    },
  });
}

async function requestHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = req.url || '/';

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (url === '/v1/exporters' && req.method === 'POST') {
      await handleExport(req, res);
    } else if (url === '/v1/exporters' && req.method === 'GET') {
      handleInfo(req, res);
    } else if (url === '/health' || url === '/') {
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
  console.log(`Agentics Deployment Exporters v${VERSION}`);
  console.log(`Server listening on port ${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  POST /v1/exporters - Export deployment intent`);
  console.log(`  GET  /v1/exporters - Get exporter info`);
  console.log(`  GET  /health       - Health check`);
});
