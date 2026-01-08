# Agentics Deployment Exporters

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white" alt="Google Cloud" />
  <img src="https://img.shields.io/badge/Terraform-7B42BC?style=for-the-badge&logo=terraform&logoColor=white" alt="Terraform" />
  <img src="https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white" alt="Kubernetes" />
  <img src="https://img.shields.io/badge/Helm-0F1689?style=for-the-badge&logo=helm&logoColor=white" alt="Helm" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Contract_Enforced-✓-00C853?style=flat-square" alt="Contract Enforced" />
  <img src="https://img.shields.io/badge/Strict_Validation-✓-00C853?style=flat-square" alt="Strict Validation" />
  <img src="https://img.shields.io/badge/Execution_Proof-✓-00C853?style=flat-square" alt="Execution Proof" />
  <img src="https://img.shields.io/badge/No_Fallbacks-✓-00C853?style=flat-square" alt="No Fallbacks" />
</p>

<p align="center">
  <strong>Pure translation layer transforming DeploymentIntent specifications into platform-specific deployable artifacts with contract enforcement and cryptographic execution proof.</strong>
</p>

---

## Overview

Agentics Deployment Exporters is a deterministic, contract-enforced service that transforms declarative deployment intents into infrastructure-as-code artifacts for multiple platforms. Every request is validated against a strict JSON Schema contract, and every successful response includes a cryptographic execution proof.

### Key Features

- **Contract Enforcement**: All requests validated against `exporters/v1/request.schema.json`
- **No Fallbacks**: Missing required fields cause immediate rejection—no silent defaults
- **Execution Proof**: Every response includes SHA256 hashes of intent and artifacts
- **Multi-Format Export**: Terraform, Kubernetes, and Helm chart generation
- **Deterministic**: Same input always produces identical output
- **Cloud Native**: Deployed on Google Cloud Run with auto-scaling

## Live Service

**Production URL**: https://agentics-deployment-exporters-275061967156.us-central1.run.app

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check and version info |
| `GET` | `/v1/exporters` | Service capabilities and contract info |
| `POST` | `/v1/exporters` | Export deployment intent (contract validated) |

## Quick Start

### Health Check

```bash
curl https://agentics-deployment-exporters-275061967156.us-central1.run.app/health
```

Response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "formats": ["terraform", "kubernetes", "helm"],
  "contractSchemaVersion": "v1"
}
```

### Export a Deployment Intent

```bash
curl -X POST https://agentics-deployment-exporters-275061967156.us-central1.run.app/v1/exporters \
  -H "Content-Type: application/json" \
  -d '{
    "intent": {
      "apiVersion": "agentics.io/v1",
      "kind": "DeploymentIntent",
      "metadata": {
        "name": "my-application",
        "namespace": "production"
      },
      "spec": {
        "target": {
          "provider": "aws",
          "region": "us-west-2",
          "environment": "production"
        }
      }
    },
    "formats": ["terraform", "kubernetes"],
    "options": {
      "dryRun": false,
      "validate": true
    }
  }'
```

## Contract Schema

All requests must conform to the `exporters/v1/request.schema.json` contract:

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `intent` | object | The deployment intent specification |
| `intent.apiVersion` | string | API version (e.g., `agentics.io/v1`) |
| `intent.kind` | string | One of: `DeploymentIntent`, `InfrastructureIntent`, `ApplicationIntent` |
| `intent.metadata.name` | string | Unique name (lowercase, alphanumeric, hyphens) |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `intent.metadata.namespace` | string | Kubernetes namespace |
| `intent.metadata.labels` | object | Key-value labels |
| `intent.metadata.annotations` | object | Key-value annotations |
| `intent.spec` | object | Deployment specification |
| `formats` | array | Export formats: `terraform`, `kubernetes`, `helm`, etc. |
| `options` | object | Export options |

### Validation Errors

Invalid requests receive a detailed error response:

```json
{
  "error": "CONTRACT_VALIDATION_FAILED",
  "code": "E001",
  "message": "Request failed contract validation against exporters/v1/request.schema.json",
  "schemaVersion": "v1",
  "validationErrors": [
    {
      "path": "/intent",
      "message": "Missing required property 'apiVersion'",
      "expected": ["apiVersion", "kind", "metadata"]
    }
  ]
}
```

## Execution Proof

Every successful response includes a mandatory `executionProof` object:

```json
{
  "executionProof": {
    "executionId": "a4b716a3-ad56-447b-9ed5-48606edda61a",
    "timestamp": "2026-01-08T06:10:47.480Z",
    "schemaVersion": "v1",
    "intentHash": "48787496078ac3738fdcd6ffc31e231e01c662ee7d2b5510de38b16a5e5e9b1f",
    "validationPassed": true,
    "artifactChecksums": {
      "terraform/main.tf": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "kubernetes/deployment.yaml": "a1b2c3d4e5f6..."
    },
    "metadata": {
      "durationMs": 150,
      "artifactCount": 5
    }
  }
}
```

### Proof Verification

The execution proof enables:
- **Audit Trail**: Track exactly what was generated and when
- **Integrity Verification**: Verify artifacts haven't been modified
- **Reproducibility**: Same intent hash means identical input

## Supported Export Formats

| Format | Description | Output |
|--------|-------------|--------|
| `terraform` | Terraform HCL | `.tf` files |
| `kubernetes` | Kubernetes manifests | YAML files |
| `helm` | Helm charts | Chart directory |
| `cloudformation` | AWS CloudFormation | JSON/YAML templates |
| `arm` | Azure Resource Manager | JSON templates |
| `docker-compose` | Docker Compose | `docker-compose.yaml` |

## Local Development

### Prerequisites

- Node.js 20+
- npm 9+

### Installation

```bash
git clone https://github.com/your-org/agentics-deployment-exporters.git
cd agentics-deployment-exporters
npm install
```

### Build

```bash
npm run build
```

### Run Locally

```bash
node dist/server.js
# Server listening on port 8080
```

### Run Tests

```bash
npm test
```

## Project Structure

```
src/
├── contracts/           # Contract validation module
│   ├── schemas/         # JSON Schema definitions
│   │   └── exporters/v1/request.schema.json
│   ├── validator.ts     # AJV-based validator
│   ├── execution-proof.ts # Proof generation
│   ├── types.ts         # TypeScript types
│   └── index.ts         # Module exports
├── core/
│   ├── validator/       # Intent validation
│   ├── normalizer/      # Intent normalization
│   ├── orchestrator/    # Export orchestration
│   └── loader/          # Intent loading
├── exporters/
│   ├── terraform/       # Terraform exporter
│   ├── kubernetes/      # Kubernetes exporter
│   └── helm/            # Helm exporter
├── server.ts            # HTTP server
└── index.ts             # Main entry point
```

## Deployment

### Google Cloud Run

```bash
# Authenticate
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Deploy
gcloud run deploy agentics-deployment-exporters \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated
```

### Docker

```bash
# Build
docker build -t agentics-deployment-exporters .

# Run
docker run -p 8080:8080 agentics-deployment-exporters
```

## API Reference

### POST /v1/exporters

Export a deployment intent to infrastructure code.

**Request Body:**

```typescript
interface ExporterRequest {
  intent: {
    apiVersion: string;      // Required: "agentics.io/v1"
    kind: string;            // Required: "DeploymentIntent" | "InfrastructureIntent" | "ApplicationIntent"
    metadata: {
      name: string;          // Required: lowercase, alphanumeric, hyphens
      namespace?: string;
      labels?: Record<string, string>;
      annotations?: Record<string, string>;
      version?: string;
    };
    spec?: {
      target?: {
        provider?: "aws" | "gcp" | "azure" | "multi";
        region?: string;
        environment?: "development" | "staging" | "production";
      };
      resources?: Array<{
        type: string;
        name: string;
        config?: Record<string, unknown>;
      }>;
    };
  };
  formats?: string[];        // Default: ["terraform", "kubernetes"]
  options?: {
    outputDir?: string;
    dryRun?: boolean;
    validate?: boolean;
    strictMode?: boolean;
    concurrency?: number;    // 1-16
    timeout?: number;        // 1000-300000 ms
  };
}
```

**Response (Success):**

```typescript
interface ExportResponse {
  success: boolean;
  artifacts: Array<{
    path: string;
    content: string | object;
    format: string;
  }>;
  errors: Array<{
    code: string;
    message: string;
    exporterId: string;
    stage: string;
    recoverable: boolean;
  }>;
  warnings: Array<{
    code: string;
    message: string;
  }>;
  metadata: {
    exportId: string;
    correlationId: string;
    startedAt: string;
    completedAt: string;
    durationMs: number;
    intentHash: string;
    intentVersion: string;
    executedExporters: Array<{...}>;
  };
  executionProof: {
    executionId: string;
    timestamp: string;
    schemaVersion: string;
    intentHash: string;
    validationPassed: boolean;
    artifactChecksums: Record<string, string>;
  };
}
```

**Response (Validation Error):**

```typescript
interface ContractValidationError {
  error: "CONTRACT_VALIDATION_FAILED";
  code: "E001";
  message: string;
  schemaVersion: string;
  validationErrors: Array<{
    path: string;
    message: string;
    expected?: unknown;
    actual?: unknown;
  }>;
}
```

## Contract Enforcement Principles

1. **No Fallback Behavior**: Missing required fields cause immediate rejection
2. **No Default Injection**: Schema defaults are defined but never silently applied
3. **Strict Mode**: `additionalProperties: false` rejects unknown fields
4. **Mandatory Proof**: All successful responses include cryptographic execution proof
5. **Deterministic**: Same input always produces identical output and hash

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Ensure tests pass: `npm test`
4. Submit a pull request

---

<p align="center">
  <sub>Built with contract enforcement and cryptographic proof by the Agentics team</sub>
</p>
