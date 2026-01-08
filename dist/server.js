/**
 * HTTP Server for Agentics Deployment Exporters
 * Exposes /v1/exporters endpoint for Cloud Run deployment
 *
 * Contract Enforcement:
 * - All requests MUST pass JSON Schema validation before processing
 * - No fallback behavior or default injection
 * - All successful responses include mandatory execution proof
 * - Invalid requests are rejected immediately with detailed errors
 */
import { createServer } from 'node:http';
import { exportIntentStrict, createDefaultOrchestrator, AVAILABLE_FORMATS, VERSION } from './index.js';
import { validateRequest, generateExecutionProof, } from './contracts/index.js';
const PORT = parseInt(process.env.PORT || '8080', 10);
const CONTRACT_SCHEMA_VERSION = 'v1';
async function parseBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        req.on('error', reject);
    });
}
function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
}
function sendContractError(res, errors) {
    const response = {
        error: 'CONTRACT_VALIDATION_FAILED',
        code: 'E001',
        message: 'Request failed contract validation against exporters/v1/request.schema.json',
        schemaVersion: CONTRACT_SCHEMA_VERSION,
        validationErrors: errors,
    };
    sendJSON(res, 400, response);
}
async function handleExport(req, res) {
    if (req.method !== 'POST') {
        sendJSON(res, 405, { error: 'Method not allowed', allowed: ['POST'] });
        return;
    }
    // Parse request body
    let rawBody;
    let parsedBody;
    try {
        rawBody = await parseBody(req);
        parsedBody = JSON.parse(rawBody);
    }
    catch (parseError) {
        sendJSON(res, 400, {
            error: 'INVALID_JSON',
            code: 'E000',
            message: 'Request body is not valid JSON',
            details: parseError instanceof Error ? parseError.message : String(parseError),
        });
        return;
    }
    // MANDATORY: Contract validation at request entry - NO FALLBACK
    const validationResult = await validateRequest(parsedBody);
    if (!validationResult.valid) {
        sendContractError(res, validationResult.errors.map(e => ({
            path: e.path,
            message: e.message,
            expected: e.expected,
            actual: e.actual,
        })));
        return;
    }
    // Request has passed contract validation - safe to cast
    const request = parsedBody;
    // Execute export with strict mode - NO FALLBACKS
    // Build options object only with defined values to avoid undefined properties
    const exportOptions = {};
    if (request.formats !== undefined)
        exportOptions.formats = request.formats;
    if (request.options?.concurrency !== undefined)
        exportOptions.concurrency = request.options.concurrency;
    if (request.options?.dryRun !== undefined)
        exportOptions.dryRun = request.options.dryRun;
    const result = await exportIntentStrict(request.intent, exportOptions);
    // Generate mandatory execution proof
    const artifactMap = {};
    for (const artifact of result.artifacts) {
        const content = typeof artifact.content === 'string'
            ? artifact.content
            : JSON.stringify(artifact.content);
        artifactMap[artifact.path] = content;
    }
    // Build execution proof metadata without undefined values
    const proofMetadata = {
        durationMs: result.metadata.durationMs,
        artifactCount: result.artifacts.length,
    };
    if (request.formats !== undefined)
        proofMetadata.formats = request.formats;
    const executionProof = generateExecutionProof(request.intent, {
        schemaVersion: CONTRACT_SCHEMA_VERSION,
        validationPassed: result.success,
        artifacts: artifactMap,
        metadata: proofMetadata,
    });
    // Build response with mandatory execution proof
    const response = {
        ...result,
        executionProof,
    };
    sendJSON(res, result.success ? 200 : 422, response);
}
function handleHealth(_req, res) {
    sendJSON(res, 200, {
        status: 'healthy',
        version: VERSION,
        formats: AVAILABLE_FORMATS,
        contractSchemaVersion: CONTRACT_SCHEMA_VERSION,
    });
}
function handleInfo(_req, res) {
    const orchestrator = createDefaultOrchestrator();
    const exporters = orchestrator.getExporters();
    sendJSON(res, 200, {
        name: '@agentics/deployment-exporters',
        version: VERSION,
        formats: AVAILABLE_FORMATS,
        contractSchemaVersion: CONTRACT_SCHEMA_VERSION,
        contractEnforcement: {
            enabled: true,
            schemaPath: 'exporters/v1/request.schema.json',
            strictMode: true,
            noFallbacks: true,
            executionProofRequired: true,
        },
        exporters: exporters.map((e) => ({
            id: e.id,
            name: e.name,
            version: e.version,
        })),
        endpoints: {
            'POST /v1/exporters': 'Export deployment intent to infrastructure code (contract validated)',
            'GET /v1/exporters': 'Get exporter information',
            'GET /health': 'Health check endpoint',
        },
    });
}
async function requestHandler(req, res) {
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
        }
        else if (url === '/v1/exporters' && req.method === 'GET') {
            handleInfo(req, res);
        }
        else if (url === '/health' || url === '/') {
            handleHealth(req, res);
        }
        else {
            sendJSON(res, 404, { error: 'Not found', path: url });
        }
    }
    catch (error) {
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
    console.log(`Contract Schema Version: ${CONTRACT_SCHEMA_VERSION}`);
    console.log(`Server listening on port ${PORT}`);
    console.log(`Contract Enforcement: ENABLED (strict mode, no fallbacks)`);
    console.log(`Endpoints:`);
    console.log(`  POST /v1/exporters - Export deployment intent (contract validated)`);
    console.log(`  GET  /v1/exporters - Get exporter info`);
    console.log(`  GET  /health       - Health check`);
});
//# sourceMappingURL=server.js.map