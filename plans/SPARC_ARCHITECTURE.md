# SPARC Architecture Document
# Agentics Deployment Exporters

Version: 1.0.0
Date: 2026-01-02
Status: Design Phase

---

## Table of Contents

1. [Architectural Overview](#1-architectural-overview)
2. [Module Boundaries](#2-module-boundaries)
3. [Interface Contracts](#3-interface-contracts)
4. [Dependency Rules](#4-dependency-rules)
5. [Extension Points](#5-extension-points)
6. [Error Boundaries](#6-error-boundaries)
7. [Audit Integration Points](#7-audit-integration-points)

---

## 1. Architectural Overview

### 1.1 System Philosophy

The Agentics Deployment Exporters system is a **pure translation layer** that transforms
DeploymentIntent specifications into platform-specific deployable artifacts. The architecture
adheres to the following principles:

- **Thin Adapters**: Each exporter is a minimal, replaceable adapter with no business logic
- **Unidirectional Data Flow**: Intent flows in, artifacts flow out, no circular dependencies
- **No Infrastructure Logic**: Core contains no cloud/platform-specific code
- **Deterministic Output**: Same input always produces identical output
- **Pluggable Extensions**: New formats can be added without modifying core

### 1.2 High-Level System Diagram

```
+==============================================================================+
|                         AGENTICS DEPLOYMENT EXPORTERS                        |
+==============================================================================+

                              INPUT BOUNDARY
    +--------------------------------------------------------------------+
    |                     DeploymentIntent (JSON/YAML)                   |
    +--------------------------------------------------------------------+
                                    |
                                    v
    +====================================================================+
    |                        CORE ORCHESTRATION                          |
    +====================================================================+
    |                                                                    |
    |  +----------------+    +------------------+    +----------------+  |
    |  | IntentLoader   |--->| IntentValidator  |--->| IntentNormalizer|  |
    |  +----------------+    +------------------+    +----------------+  |
    |          |                      |                      |          |
    |          v                      v                      v          |
    |  +---------------------------------------------------------------+|
    |  |                    ExportOrchestrator                         ||
    |  |  - Routes normalized intent to appropriate exporters          ||
    |  |  - Manages parallel/sequential execution                      ||
    |  |  - Coordinates artifact collection                            ||
    |  +---------------------------------------------------------------+|
    |                               |                                   |
    +===============================|===================================+
                                    |
            +-----------------------+-----------------------+
            |                       |                       |
            v                       v                       v
    +===============+       +===============+       +===============+
    |   EXPORTERS   |       |  SERIALIZERS  |       |   PACKAGING   |
    +===============+       +===============+       +===============+
    |               |       |               |       |               |
    | Terraform     |<----->| HCL           |       | Signer        |
    | Kubernetes    |<----->| YAML          |       | Checksum      |
    | Helm          |<----->| JSON          |       | PackageBuilder|
    | CloudFormation|<----->| SQL           |       | Manifest      |
    | ARM Template  |       | TOML          |       |               |
    | GCP Deployment|       |               |       |               |
    | IAM Policy    |       +===============+       +===============+
    | DB Schema     |               |                       |
    | Docker Compose|               |                       |
    | ConfigBundle  |               |                       |
    +===============+               |                       |
            |                       |                       |
            +-----------------------+-----------------------+
                                    |
                                    v
    +====================================================================+
    |                      OUTPUT VERIFICATION                           |
    +====================================================================+
    |  +----------------+  +------------------+  +--------------------+  |
    |  | SchemaValidator|  | IntegrityChecker |  | DeterminismVerifier|  |
    |  +----------------+  +------------------+  +--------------------+  |
    +====================================================================+
                                    |
                                    v
    +====================================================================+
    |                     ARTIFACT COLLECTOR                             |
    +====================================================================+
    |                                                                    |
    |   [Terraform/*.tf]  [k8s/*.yaml]  [helm/Chart.yaml]  [*.json]    |
    |   [cfn/*.yaml]      [arm/*.json]  [gcp/*.yaml]       [*.sql]     |
    |   [docker-compose.yaml]  [config/*]  [manifest.json]             |
    |                                                                    |
    +--------------------------------------------------------------------+
                                    |
                              OUTPUT BOUNDARY
    +--------------------------------------------------------------------+
    |                    Signed Artifact Package                         |
    |              (with checksums and lineage metadata)                 |
    +--------------------------------------------------------------------+
```

### 1.3 Component Interaction Model

```
                    COMPONENT INTERACTION FLOW
    ================================================================

    [1] PARSE PHASE
    +-----------+       +-----------+       +-----------+
    |  Intent   |  -->  |  Loader   |  -->  |  Parser   |
    |  (File)   |       |           |       |           |
    +-----------+       +-----------+       +-----------+
                                                  |
    [2] VALIDATE PHASE                            v
                              +-------------------+-------------------+
                              |          IntentValidator              |
                              |  - Schema validation                  |
                              |  - Reference integrity                |
                              |  - Constraint verification            |
                              +-----------------+---------------------+
                                                |
    [3] NORMALIZE PHASE                         v
                              +-------------------+-------------------+
                              |         IntentNormalizer              |
                              |  - Canonicalize structure             |
                              |  - Resolve defaults                   |
                              |  - Expand references                  |
                              +-----------------+---------------------+
                                                |
    [4] ROUTE PHASE                             v
                              +-------------------+-------------------+
                              |         ExportOrchestrator            |
                              |  - Determine target exporters         |
                              |  - Build execution plan               |
                              |  - Manage concurrency                 |
                              +-----------------+---------------------+
                                                |
    [5] TRANSFORM PHASE        +----------------+----------------+
                               |                |                |
                               v                v                v
                        +-----------+    +-----------+    +-----------+
                        | Exporter  |    | Exporter  |    | Exporter  |
                        |     A     |    |     B     |    |     N     |
                        +-----------+    +-----------+    +-----------+
                               |                |                |
    [6] SERIALIZE PHASE        v                v                v
                        +-----------+    +-----------+    +-----------+
                        |Serializer |    |Serializer |    |Serializer |
                        |   (HCL)   |    |  (YAML)   |    |  (JSON)   |
                        +-----------+    +-----------+    +-----------+
                               |                |                |
                               +----------------+----------------+
                                                |
    [7] VERIFY PHASE                            v
                              +-------------------+-------------------+
                              |         OutputVerification            |
                              |  - Schema compliance                  |
                              |  - Determinism check                  |
                              |  - Integrity validation               |
                              +-----------------+---------------------+
                                                |
    [8] PACKAGE PHASE                           v
                              +-------------------+-------------------+
                              |           Packaging                   |
                              |  - Sign artifacts                     |
                              |  - Generate checksums                 |
                              |  - Build manifest                     |
                              |  - Create archive                     |
                              +---------------------------------------+
```

### 1.4 Data Flow Direction (Unidirectional)

```
    UNIDIRECTIONAL DATA FLOW GUARANTEE
    ==================================

    +-------+     +-------+     +-------+     +-------+     +-------+
    | PARSE |---->|VALIDATE|--->|NORMALIZE|-->|TRANSFORM|-->|PACKAGE|
    +-------+     +-------+     +-------+     +-------+     +-------+
         |             |             |             |             |
         v             v             v             v             v
    +-----------------------------------------------------------------+
    |                    IMMUTABLE DATA PIPELINE                      |
    +-----------------------------------------------------------------+

    Rules:
    - Data flows LEFT to RIGHT only
    - Each stage produces NEW immutable data
    - No stage modifies upstream data
    - No callbacks or reverse dependencies
    - Pure function transformations at each stage


    DATA IMMUTABILITY CHAIN:

    DeploymentIntent (raw)
           |
           | [parse: read-only]
           v
    ParsedIntent (immutable)
           |
           | [validate: read-only]
           v
    ValidatedIntent (immutable)
           |
           | [normalize: read-only]
           v
    NormalizedIntent (immutable)
           |
           | [transform: read-only]
           v
    ExportArtifact[] (immutable)
           |
           | [serialize: read-only]
           v
    SerializedContent[] (immutable)
           |
           | [package: read-only]
           v
    SignedPackage (immutable, final)
```

---

## 2. Module Boundaries

### 2.1 Core Export Orchestration (`/src/core`)

```
/src/core/
    |
    +-- index.ts                    # Public API exports
    |
    +-- loader/
    |       +-- IntentLoader.ts     # File I/O and parsing
    |       +-- IntentParser.ts     # JSON/YAML parsing
    |       +-- types.ts            # Loader type definitions
    |
    +-- validator/
    |       +-- IntentValidator.ts  # Main validation orchestrator
    |       +-- SchemaValidator.ts  # JSON Schema validation
    |       +-- RefValidator.ts     # Reference integrity checks
    |       +-- ConstraintValidator.ts  # Business rule validation
    |       +-- types.ts            # Validation types
    |
    +-- normalizer/
    |       +-- IntentNormalizer.ts # Main normalization orchestrator
    |       +-- DefaultResolver.ts  # Default value resolution
    |       +-- RefExpander.ts      # Reference expansion
    |       +-- Canonicalizer.ts    # Structure canonicalization
    |       +-- types.ts            # Normalizer types
    |
    +-- orchestrator/
    |       +-- ExportOrchestrator.ts   # Main orchestration logic
    |       +-- ExecutionPlanner.ts     # Build execution DAG
    |       +-- ConcurrencyManager.ts   # Parallel execution control
    |       +-- types.ts                # Orchestrator types
    |
    +-- collector/
            +-- ArtifactCollector.ts    # Aggregate outputs
            +-- ArtifactMerger.ts       # Merge overlapping artifacts
            +-- types.ts                # Collector types
```

#### 2.1.1 IntentLoader

```
PURPOSE: Read and parse DeploymentIntent from various sources

RESPONSIBILITIES:
  - File system reading (sync/async)
  - Stream processing for large files
  - Format detection (JSON/YAML)
  - Initial parsing to raw object

INPUTS:
  - File path (string)
  - Stream (ReadableStream)
  - Raw content (string)

OUTPUTS:
  - ParsedIntent object
  - ParseError on failure

DEPENDENCIES:
  - File system (abstracted via interface)
  - YAML parser (external, injected)
  - JSON parser (native)

CONSTRAINTS:
  - Must handle files up to 100MB
  - Must detect encoding (UTF-8, UTF-16)
  - Must preserve source location metadata
```

#### 2.1.2 IntentValidator

```
PURPOSE: Validate parsed intent against schema and business rules

RESPONSIBILITIES:
  - JSON Schema validation
  - Reference integrity checking
  - Cross-field constraint validation
  - Required field verification
  - Type coercion validation

INPUTS:
  - ParsedIntent object
  - Validation configuration

OUTPUTS:
  - ValidatedIntent (on success)
  - ValidationError[] (on failure)

VALIDATION LAYERS:
  1. Structural validation (JSON Schema)
  2. Semantic validation (business rules)
  3. Reference validation (integrity)
  4. Security validation (injection prevention)

ERROR CATEGORIES:
  - SCHEMA_ERROR: Structure doesn't match schema
  - REF_ERROR: Referenced entity doesn't exist
  - CONSTRAINT_ERROR: Business rule violation
  - SECURITY_ERROR: Potential security issue
```

#### 2.1.3 IntentNormalizer

```
PURPOSE: Transform validated intent to canonical form

RESPONSIBILITIES:
  - Apply default values
  - Expand shorthand notations
  - Resolve references inline
  - Canonicalize key ordering
  - Remove deprecated fields
  - Version migration

INPUTS:
  - ValidatedIntent
  - Normalization options

OUTPUTS:
  - NormalizedIntent (canonical form)

TRANSFORMATIONS:
  1. Default application
  2. Reference expansion
  3. Alias resolution
  4. Format canonicalization
  5. Version normalization

GUARANTEES:
  - Idempotent (normalize(normalize(x)) === normalize(x))
  - Deterministic (same input always produces same output)
  - Reversible (original can be reconstructed with metadata)
```

#### 2.1.4 ExportOrchestrator

```
PURPOSE: Coordinate exporter execution and artifact collection

RESPONSIBILITIES:
  - Determine required exporters
  - Build execution dependency graph
  - Manage parallel execution
  - Handle partial failures
  - Coordinate artifact collection

INPUTS:
  - NormalizedIntent
  - Export configuration
  - Exporter registry

OUTPUTS:
  - ExportResult containing all artifacts
  - ExportError on complete failure

EXECUTION MODEL:
  +--------------------------------------------------+
  |               EXECUTION DAG                      |
  +--------------------------------------------------+
  |                                                  |
  |           [IAM Policy Exporter]                  |
  |                    |                             |
  |          +--------+--------+                     |
  |          |                 |                     |
  |          v                 v                     |
  |  [Terraform]        [CloudFormation]            |
  |       |                    |                     |
  |       v                    v                     |
  |  [Kubernetes]        [ARM Template]             |
  |       |                                          |
  |       v                                          |
  |   [Helm]                                         |
  |                                                  |
  +--------------------------------------------------+
```

#### 2.1.5 ArtifactCollector

```
PURPOSE: Aggregate and organize exported artifacts

RESPONSIBILITIES:
  - Collect artifacts from all exporters
  - Organize by target platform
  - Handle artifact conflicts
  - Generate artifact index

INPUTS:
  - ExportArtifact[] from exporters
  - Collection configuration

OUTPUTS:
  - ArtifactCollection (organized)
  - CollectionManifest (index)

ORGANIZATION STRUCTURE:
  output/
    +-- terraform/
    |     +-- main.tf
    |     +-- variables.tf
    |     +-- outputs.tf
    +-- kubernetes/
    |     +-- deployments/
    |     +-- services/
    |     +-- configmaps/
    +-- helm/
    |     +-- Chart.yaml
    |     +-- values.yaml
    |     +-- templates/
    +-- manifest.json
```

### 2.2 Exporter Adapters (`/src/exporters`)

```
/src/exporters/
    |
    +-- index.ts                    # Exporter registry
    +-- base/
    |       +-- BaseExporter.ts     # Abstract base class
    |       +-- types.ts            # Shared exporter types
    |
    +-- terraform/
    |       +-- TerraformExporter.ts
    |       +-- ResourceMapper.ts
    |       +-- ProviderGenerator.ts
    |       +-- ModuleGenerator.ts
    |
    +-- kubernetes/
    |       +-- KubernetesExporter.ts
    |       +-- ManifestGenerator.ts
    |       +-- ResourceQuotaMapper.ts
    |
    +-- helm/
    |       +-- HelmExporter.ts
    |       +-- ChartGenerator.ts
    |       +-- ValuesMapper.ts
    |
    +-- cloudformation/
    |       +-- CloudFormationExporter.ts
    |       +-- StackGenerator.ts
    |       +-- IntrinsicFunctionMapper.ts
    |
    +-- arm/
    |       +-- ARMTemplateExporter.ts
    |       +-- ResourceGenerator.ts
    |       +-- ParameterMapper.ts
    |
    +-- gcp/
    |       +-- GCPDeploymentExporter.ts
    |       +-- ConfigGenerator.ts
    |       +-- TypeMapper.ts
    |
    +-- iam/
    |       +-- IAMPolicyExporter.ts
    |       +-- PolicyDocumentGenerator.ts
    |       +-- RoleMapper.ts
    |
    +-- database/
    |       +-- DatabaseSchemaExporter.ts
    |       +-- DDLGenerator.ts
    |       +-- MigrationGenerator.ts
    |
    +-- docker/
    |       +-- DockerComposeExporter.ts
    |       +-- ServiceMapper.ts
    |       +-- NetworkGenerator.ts
    |
    +-- config/
            +-- ConfigBundleExporter.ts
            +-- EnvFileGenerator.ts
            +-- SecretMapper.ts
```

#### 2.2.1 TerraformExporter

```
PURPOSE: Generate Terraform HCL configuration files

OUTPUT FORMAT: HashiCorp Configuration Language (HCL)

FILE STRUCTURE:
  terraform/
    +-- main.tf           # Primary resources
    +-- variables.tf      # Input variables
    +-- outputs.tf        # Output values
    +-- providers.tf      # Provider configuration
    +-- versions.tf       # Version constraints
    +-- modules/          # Child modules
    +-- data.tf           # Data sources

MAPPINGS:
  Intent.compute      --> aws_instance, google_compute_instance, azurerm_virtual_machine
  Intent.network      --> VPC, Subnets, Security Groups
  Intent.storage      --> S3, GCS, Azure Blob
  Intent.database     --> RDS, CloudSQL, Azure SQL
  Intent.kubernetes   --> EKS, GKE, AKS

FEATURES:
  - Multi-provider support
  - Module generation
  - Backend configuration
  - State management hints
  - Workspace separation
```

#### 2.2.2 KubernetesExporter

```
PURPOSE: Generate Kubernetes manifest files

OUTPUT FORMAT: YAML (Kubernetes API objects)

FILE STRUCTURE:
  kubernetes/
    +-- namespace.yaml
    +-- deployments/
    |     +-- <service-name>-deployment.yaml
    +-- services/
    |     +-- <service-name>-service.yaml
    +-- configmaps/
    |     +-- <config-name>-configmap.yaml
    +-- secrets/
    |     +-- <secret-name>-secret.yaml
    +-- ingress/
    |     +-- <ingress-name>-ingress.yaml
    +-- rbac/
          +-- roles.yaml
          +-- bindings.yaml

MAPPINGS:
  Intent.services     --> Deployment, Service, HPA
  Intent.config       --> ConfigMap, Secret
  Intent.networking   --> Ingress, NetworkPolicy
  Intent.security     --> RBAC, PodSecurityPolicy
  Intent.storage      --> PV, PVC, StorageClass

API VERSIONS:
  - apps/v1 for Deployments
  - v1 for Services, ConfigMaps
  - networking.k8s.io/v1 for Ingress
```

#### 2.2.3 HelmExporter

```
PURPOSE: Generate Helm chart structure

OUTPUT FORMAT: Helm Chart (YAML + templates)

FILE STRUCTURE:
  helm/
    +-- Chart.yaml           # Chart metadata
    +-- values.yaml          # Default values
    +-- values.schema.json   # Values schema
    +-- templates/
    |     +-- deployment.yaml
    |     +-- service.yaml
    |     +-- configmap.yaml
    |     +-- _helpers.tpl
    |     +-- NOTES.txt
    +-- charts/              # Dependencies
    +-- crds/                # CRDs if needed

TEMPLATE FEATURES:
  - Parameterized resources
  - Conditional rendering
  - Loop constructs
  - Named templates
  - Release-aware naming

CHART DEPENDENCIES:
  - Auto-detect common charts (nginx, redis, postgres)
  - Generate requirements.yaml
  - Lock file generation
```

#### 2.2.4 CloudFormationExporter

```
PURPOSE: Generate AWS CloudFormation templates

OUTPUT FORMAT: YAML/JSON (CloudFormation syntax)

FILE STRUCTURE:
  cloudformation/
    +-- main-stack.yaml       # Root stack
    +-- nested/
    |     +-- network.yaml    # VPC, Subnets
    |     +-- compute.yaml    # EC2, ECS
    |     +-- database.yaml   # RDS
    |     +-- storage.yaml    # S3
    +-- parameters/
          +-- dev.json
          +-- prod.json

TEMPLATE SECTIONS:
  - AWSTemplateFormatVersion
  - Description
  - Parameters
  - Mappings
  - Conditions
  - Resources
  - Outputs

INTRINSIC FUNCTIONS:
  - !Ref, !GetAtt
  - !Sub, !Join
  - !If, !Equals
  - !ImportValue
```

#### 2.2.5 ARMTemplateExporter

```
PURPOSE: Generate Azure Resource Manager templates

OUTPUT FORMAT: JSON (ARM template syntax)

FILE STRUCTURE:
  arm/
    +-- azuredeploy.json            # Main template
    +-- azuredeploy.parameters.json # Parameters
    +-- nested/
    |     +-- network.json
    |     +-- compute.json
    +-- scripts/
          +-- deploy.sh
          +-- deploy.ps1

TEMPLATE SECTIONS:
  - $schema
  - contentVersion
  - parameters
  - variables
  - resources
  - outputs

RESOURCE TYPES:
  - Microsoft.Compute/*
  - Microsoft.Network/*
  - Microsoft.Storage/*
  - Microsoft.Sql/*
```

#### 2.2.6 GCPDeploymentExporter

```
PURPOSE: Generate Google Cloud Deployment Manager configs

OUTPUT FORMAT: YAML (Deployment Manager syntax)

FILE STRUCTURE:
  gcp/
    +-- deployment.yaml     # Main deployment
    +-- config.yaml         # Configuration
    +-- templates/
    |     +-- vm.jinja
    |     +-- network.jinja
    +-- schemas/
          +-- vm.jinja.schema

TEMPLATE TYPES:
  - Jinja2 templates
  - Python templates
  - Composite types

RESOURCE TYPES:
  - compute.v1.instance
  - compute.v1.network
  - storage.v1.bucket
  - sqladmin.v1beta4.instance
```

#### 2.2.7 IAMPolicyExporter

```
PURPOSE: Generate IAM policy documents for all cloud providers

OUTPUT FORMAT: JSON (provider-specific IAM syntax)

FILE STRUCTURE:
  iam/
    +-- aws/
    |     +-- policies/
    |     +-- roles/
    |     +-- trust-policies/
    +-- gcp/
    |     +-- roles/
    |     +-- bindings/
    +-- azure/
          +-- role-definitions/
          +-- role-assignments/

POLICY ELEMENTS:
  AWS:  Version, Statement, Effect, Action, Resource, Condition
  GCP:  bindings, role, members, condition
  Azure: Name, IsCustom, permissions, assignableScopes
```

#### 2.2.8 DatabaseSchemaExporter

```
PURPOSE: Generate database DDL and migration scripts

OUTPUT FORMAT: SQL (dialect-specific)

FILE STRUCTURE:
  database/
    +-- schema/
    |     +-- tables.sql
    |     +-- indexes.sql
    |     +-- constraints.sql
    |     +-- functions.sql
    +-- migrations/
    |     +-- 001_initial.sql
    |     +-- 002_add_indexes.sql
    +-- seeds/
          +-- reference_data.sql

SUPPORTED DIALECTS:
  - PostgreSQL
  - MySQL
  - SQL Server
  - Oracle
  - SQLite

MIGRATION FORMATS:
  - Raw SQL
  - Flyway compatible
  - Liquibase compatible
  - Prisma compatible
```

#### 2.2.9 DockerComposeExporter

```
PURPOSE: Generate Docker Compose configuration

OUTPUT FORMAT: YAML (Compose v3 syntax)

FILE STRUCTURE:
  docker/
    +-- docker-compose.yaml       # Main compose file
    +-- docker-compose.dev.yaml   # Development overrides
    +-- docker-compose.prod.yaml  # Production overrides
    +-- .env.example              # Environment template

COMPOSE SECTIONS:
  - version
  - services
  - networks
  - volumes
  - secrets
  - configs

FEATURES:
  - Multi-stage builds
  - Health checks
  - Resource limits
  - Network segmentation
```

#### 2.2.10 ConfigBundleExporter

```
PURPOSE: Generate application configuration bundles

OUTPUT FORMAT: Various (env, json, yaml, toml)

FILE STRUCTURE:
  config/
    +-- .env.development
    +-- .env.staging
    +-- .env.production
    +-- config.json
    +-- config.yaml
    +-- secrets.encrypted.json

CONFIGURATION TYPES:
  - Environment variables
  - JSON configuration
  - YAML configuration
  - TOML configuration
  - INI files

FEATURES:
  - Environment-specific configs
  - Secret placeholder generation
  - Config validation schemas
  - Documentation generation
```

### 2.3 Format Serializers (`/src/serializers`)

```
/src/serializers/
    |
    +-- index.ts              # Serializer registry
    +-- base/
    |       +-- BaseSerializer.ts
    |       +-- types.ts
    |
    +-- hcl/
    |       +-- HCLSerializer.ts
    |       +-- HCLFormatter.ts
    |       +-- HCLEscaper.ts
    |
    +-- yaml/
    |       +-- YAMLSerializer.ts
    |       +-- YAMLFormatter.ts
    |       +-- YAMLAnchors.ts
    |
    +-- json/
    |       +-- JSONSerializer.ts
    |       +-- JSONFormatter.ts
    |
    +-- sql/
    |       +-- SQLSerializer.ts
    |       +-- SQLFormatter.ts
    |       +-- DialectAdapters.ts
    |
    +-- toml/
            +-- TOMLSerializer.ts
            +-- TOMLFormatter.ts
```

#### 2.3.1 HCLSerializer

```
PURPOSE: Serialize to HashiCorp Configuration Language

FEATURES:
  - Proper block formatting
  - Attribute alignment
  - Expression handling
  - Comment preservation
  - Multi-line strings (heredoc)

OUTPUT EXAMPLE:
  resource "aws_instance" "example" {
    ami           = var.ami_id
    instance_type = "t3.micro"

    tags = {
      Name = "example-instance"
    }
  }

FORMATTING OPTIONS:
  - Indent size (default: 2)
  - Attribute alignment (default: true)
  - Blank lines between blocks (default: 1)
```

#### 2.3.2 YAMLSerializer

```
PURPOSE: Serialize to YAML format

FEATURES:
  - Multi-document support
  - Anchor/alias generation
  - Flow vs block style selection
  - Comment injection
  - Proper quoting

OUTPUT STYLES:
  - Block style (default)
  - Flow style (compact)
  - Mixed (configurable)

YAML VERSIONS:
  - YAML 1.2 (default)
  - YAML 1.1 (legacy)
```

#### 2.3.3 JSONSerializer

```
PURPOSE: Serialize to JSON format

FEATURES:
  - Pretty printing
  - Minification
  - Key sorting
  - Circular reference handling
  - BigInt support

OUTPUT MODES:
  - Pretty (indented)
  - Compact (minified)
  - Sorted keys
```

#### 2.3.4 SQLSerializer

```
PURPOSE: Serialize to SQL dialect-specific syntax

DIALECTS:
  - PostgreSQL
  - MySQL
  - SQL Server
  - Oracle
  - SQLite

FEATURES:
  - Identifier quoting
  - Type mapping
  - Constraint syntax
  - Index syntax
  - Comment style
```

#### 2.3.5 TOMLSerializer

```
PURPOSE: Serialize to TOML format

FEATURES:
  - Table grouping
  - Array of tables
  - Inline tables
  - Multi-line strings
  - Date/time handling
```

### 2.4 Signing & Packaging (`/src/packaging`)

```
/src/packaging/
    |
    +-- index.ts
    +-- signer/
    |       +-- ArtifactSigner.ts
    |       +-- SignatureVerifier.ts
    |       +-- KeyManager.ts
    |
    +-- checksum/
    |       +-- ChecksumGenerator.ts
    |       +-- ChecksumVerifier.ts
    |
    +-- builder/
    |       +-- PackageBuilder.ts
    |       +-- ArchiveCreator.ts
    |       +-- CompressionAdapter.ts
    |
    +-- manifest/
            +-- ManifestGenerator.ts
            +-- LineageTracker.ts
```

#### 2.4.1 ArtifactSigner

```
PURPOSE: Cryptographically sign export artifacts

ALGORITHMS:
  - Ed25519 (default)
  - RSA-PSS
  - ECDSA

SIGNATURE FORMATS:
  - Detached (.sig files)
  - Embedded (JSON envelope)
  - PKCS#7

KEY SOURCES:
  - File system (PEM)
  - Environment variable
  - Key management service (AWS KMS, GCP KMS, Azure Key Vault)

OUTPUT:
  {
    "artifact": "terraform/main.tf",
    "algorithm": "Ed25519",
    "signature": "base64...",
    "keyId": "key-123",
    "timestamp": "2026-01-02T00:00:00Z"
  }
```

#### 2.4.2 ChecksumGenerator

```
PURPOSE: Generate integrity checksums for artifacts

ALGORITHMS:
  - SHA-256 (default)
  - SHA-512
  - BLAKE3

OUTPUT FORMAT:
  {
    "files": {
      "terraform/main.tf": {
        "sha256": "abc123...",
        "size": 1234,
        "modified": "2026-01-02T00:00:00Z"
      }
    },
    "aggregate": {
      "sha256": "def456..."
    }
  }
```

#### 2.4.3 PackageBuilder

```
PURPOSE: Create distributable artifact packages

PACKAGE FORMATS:
  - tar.gz (default)
  - zip
  - directory (uncompressed)

PACKAGE STRUCTURE:
  package.tar.gz/
    +-- artifacts/
    |     +-- terraform/
    |     +-- kubernetes/
    |     +-- ...
    +-- manifest.json
    +-- checksums.json
    +-- signature.sig
    +-- lineage.json
```

#### 2.4.4 ManifestGenerator

```
PURPOSE: Generate package manifest with metadata

MANIFEST CONTENTS:
  {
    "version": "1.0.0",
    "generated": "2026-01-02T00:00:00Z",
    "generator": "agentics-deployment-exporters@1.0.0",
    "intent": {
      "name": "my-deployment",
      "version": "1.0.0",
      "hash": "sha256:..."
    },
    "artifacts": [
      {
        "path": "terraform/main.tf",
        "exporter": "TerraformExporter",
        "format": "hcl",
        "checksum": "sha256:..."
      }
    ],
    "exporters": {
      "TerraformExporter": { "version": "1.0.0" }
    }
  }
```

### 2.5 Output Verification (`/src/verification`)

```
/src/verification/
    |
    +-- index.ts
    +-- schema/
    |       +-- SchemaValidator.ts
    |       +-- SchemaRegistry.ts
    |
    +-- integrity/
    |       +-- IntegrityChecker.ts
    |       +-- ReferenceChecker.ts
    |
    +-- determinism/
            +-- DeterminismVerifier.ts
            +-- HashComparator.ts
```

#### 2.5.1 SchemaValidator

```
PURPOSE: Validate output artifacts against format schemas

VALIDATIONS:
  - Terraform HCL syntax
  - Kubernetes manifest schemas
  - CloudFormation template validation
  - ARM template schema validation
  - SQL syntax validation

SCHEMA SOURCES:
  - Built-in schemas
  - Remote schema fetching
  - Custom schema injection
```

#### 2.5.2 IntegrityChecker

```
PURPOSE: Verify artifact integrity and completeness

CHECKS:
  - All referenced files exist
  - No dangling references
  - Resource naming consistency
  - Provider/API version compatibility
  - Cross-artifact reference validity
```

#### 2.5.3 DeterminismVerifier

```
PURPOSE: Ensure deterministic output generation

VERIFICATION METHOD:
  1. Export with seed A
  2. Export with seed A (second run)
  3. Compare outputs byte-for-byte
  4. Report any differences

DETERMINISM REQUIREMENTS:
  - Same input = same output
  - No random UUIDs
  - No timestamps in artifacts
  - Sorted keys/resources
  - Consistent ordering
```

---

## 3. Interface Contracts

### 3.1 Exporter Interface

```typescript
/**
 * Core interface that all exporters must implement.
 * Exporters are thin adapters that transform normalized intent
 * into platform-specific artifacts.
 */
interface IExporter {
  /**
   * Unique identifier for this exporter
   */
  readonly id: ExporterId;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * Target output format (terraform, kubernetes, etc.)
   */
  readonly targetFormat: ExportFormat;

  /**
   * Exporter version following semver
   */
  readonly version: SemanticVersion;

  /**
   * Supported intent sections this exporter can handle
   */
  readonly supportedSections: IntentSection[];

  /**
   * Transform normalized intent into export artifacts.
   * This is a pure function - same input always produces same output.
   *
   * @param intent - The normalized deployment intent
   * @param options - Export options and configuration
   * @returns Array of export artifacts
   * @throws ExportTransformError on transformation failure
   */
  transform(
    intent: NormalizedIntent,
    options?: ExportOptions
  ): Promise<ExportArtifact[]>;

  /**
   * Validate a produced artifact against format-specific rules.
   *
   * @param artifact - The artifact to validate
   * @returns Validation result with any errors/warnings
   */
  validate(artifact: ExportArtifact): Promise<ValidationResult>;

  /**
   * Check if this exporter can handle the given intent.
   *
   * @param intent - The intent to check
   * @returns True if exporter is applicable
   */
  canHandle(intent: NormalizedIntent): boolean;

  /**
   * Get the required serializers for this exporter's output.
   */
  getRequiredSerializers(): SerializerType[];
}

/**
 * Type definitions for exporter interface
 */
type ExporterId = string;
type ExportFormat =
  | 'terraform'
  | 'kubernetes'
  | 'helm'
  | 'cloudformation'
  | 'arm'
  | 'gcp-dm'
  | 'iam'
  | 'sql'
  | 'docker-compose'
  | 'config';

type SemanticVersion = `${number}.${number}.${number}`;

type IntentSection =
  | 'compute'
  | 'network'
  | 'storage'
  | 'database'
  | 'kubernetes'
  | 'security'
  | 'config';

interface ExportArtifact {
  /** Relative path within output directory */
  path: string;
  /** Raw content (pre-serialization) */
  content: unknown;
  /** Target format for serialization */
  format: SerializerType;
  /** Content encoding */
  encoding: 'utf-8' | 'binary';
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

interface ExportOptions {
  /** Target cloud provider */
  provider?: 'aws' | 'gcp' | 'azure' | 'multi';
  /** Target environment */
  environment?: string;
  /** Additional variables */
  variables?: Record<string, unknown>;
  /** Enable verbose output */
  verbose?: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

### 3.2 Serializer Interface

```typescript
/**
 * Interface for format serializers.
 * Serializers are pure functions that convert objects to string representations.
 */
interface ISerializer {
  /**
   * Serializer identifier
   */
  readonly id: SerializerId;

  /**
   * Target format type
   */
  readonly formatType: SerializerType;

  /**
   * File extension(s) this serializer produces
   */
  readonly fileExtensions: string[];

  /**
   * MIME type for the output
   */
  readonly mimeType: string;

  /**
   * Serialize content to string format.
   * Must be deterministic - same input always produces same output.
   *
   * @param content - The content to serialize
   * @param options - Serialization options
   * @returns Serialized string
   * @throws SerializationError on failure
   */
  serialize(
    content: unknown,
    options?: SerializerOptions
  ): string;

  /**
   * Deserialize string back to object.
   *
   * @param text - The text to deserialize
   * @returns Deserialized object
   * @throws DeserializationError on failure
   */
  deserialize(text: string): unknown;

  /**
   * Format/prettify existing serialized content.
   *
   * @param text - The text to format
   * @param options - Formatting options
   * @returns Formatted text
   */
  format(text: string, options?: FormatOptions): string;

  /**
   * Validate that text is valid for this format.
   *
   * @param text - The text to validate
   * @returns Validation result
   */
  validate(text: string): ValidationResult;
}

type SerializerId = string;
type SerializerType = 'hcl' | 'yaml' | 'json' | 'sql' | 'toml' | 'ini' | 'env';

interface SerializerOptions {
  /** Indentation size (spaces) */
  indent?: number;
  /** Use tabs instead of spaces */
  useTabs?: boolean;
  /** Sort object keys */
  sortKeys?: boolean;
  /** Include comments */
  includeComments?: boolean;
  /** Line width for wrapping */
  lineWidth?: number;
}

interface FormatOptions extends SerializerOptions {
  /** Validate before formatting */
  validateFirst?: boolean;
}
```

### 3.3 Signer Interface

```typescript
/**
 * Interface for artifact signing implementations.
 */
interface ISigner {
  /**
   * Signer identifier
   */
  readonly id: SignerId;

  /**
   * Signing algorithm
   */
  readonly algorithm: SigningAlgorithm;

  /**
   * Sign artifact content.
   *
   * @param content - Content to sign (string or buffer)
   * @param options - Signing options
   * @returns Signature result
   */
  sign(
    content: string | Buffer,
    options?: SignOptions
  ): Promise<SignatureResult>;

  /**
   * Verify a signature.
   *
   * @param content - Original content
   * @param signature - Signature to verify
   * @param options - Verification options
   * @returns Verification result
   */
  verify(
    content: string | Buffer,
    signature: string,
    options?: VerifyOptions
  ): Promise<VerificationResult>;

  /**
   * Get public key for verification.
   */
  getPublicKey(): Promise<string>;

  /**
   * Check if signer is properly configured.
   */
  isConfigured(): boolean;
}

type SignerId = string;
type SigningAlgorithm = 'ed25519' | 'rsa-pss' | 'ecdsa-p256' | 'ecdsa-p384';

interface SignOptions {
  /** Key identifier */
  keyId?: string;
  /** Include timestamp */
  timestamp?: boolean;
  /** Additional metadata to include */
  metadata?: Record<string, string>;
}

interface SignatureResult {
  /** Base64-encoded signature */
  signature: string;
  /** Algorithm used */
  algorithm: SigningAlgorithm;
  /** Key identifier */
  keyId: string;
  /** Signing timestamp (if requested) */
  timestamp?: string;
  /** Public key (for verification) */
  publicKey?: string;
}

interface VerifyOptions {
  /** Expected key ID */
  expectedKeyId?: string;
  /** Public key to use */
  publicKey?: string;
  /** Allow expired signatures */
  allowExpired?: boolean;
}

interface VerificationResult {
  valid: boolean;
  keyId?: string;
  timestamp?: string;
  error?: string;
}
```

### 3.4 Loader Interface

```typescript
/**
 * Interface for intent loading implementations.
 */
interface IIntentLoader {
  /**
   * Load intent from file path.
   *
   * @param path - File path to load
   * @returns Parsed intent
   */
  loadFromFile(path: string): Promise<ParsedIntent>;

  /**
   * Load intent from string content.
   *
   * @param content - String content
   * @param format - Content format (json or yaml)
   * @returns Parsed intent
   */
  loadFromString(
    content: string,
    format: 'json' | 'yaml'
  ): Promise<ParsedIntent>;

  /**
   * Load intent from stream.
   *
   * @param stream - Readable stream
   * @param format - Content format
   * @returns Parsed intent
   */
  loadFromStream(
    stream: ReadableStream,
    format: 'json' | 'yaml'
  ): Promise<ParsedIntent>;

  /**
   * Detect format from content.
   *
   * @param content - Content to analyze
   * @returns Detected format
   */
  detectFormat(content: string): 'json' | 'yaml' | 'unknown';
}

interface ParsedIntent {
  /** Raw parsed data */
  data: Record<string, unknown>;
  /** Source location metadata */
  sourceMap?: SourceMap;
  /** Detected format */
  format: 'json' | 'yaml';
  /** Original source (for error reporting) */
  source?: string;
}
```

### 3.5 Validator Interface

```typescript
/**
 * Interface for intent validation implementations.
 */
interface IIntentValidator {
  /**
   * Validate parsed intent.
   *
   * @param intent - Parsed intent to validate
   * @param options - Validation options
   * @returns Validation result
   */
  validate(
    intent: ParsedIntent,
    options?: ValidationOptions
  ): Promise<IntentValidationResult>;

  /**
   * Register custom validation rule.
   *
   * @param rule - Validation rule to register
   */
  registerRule(rule: ValidationRule): void;

  /**
   * Get all registered rules.
   */
  getRules(): ValidationRule[];
}

interface ValidationOptions {
  /** Strict mode (fail on warnings) */
  strict?: boolean;
  /** Skip specific rule IDs */
  skipRules?: string[];
  /** Additional context for validation */
  context?: Record<string, unknown>;
}

interface IntentValidationResult {
  valid: boolean;
  errors: IntentValidationError[];
  warnings: IntentValidationWarning[];
  /** Validated and typed intent (if valid) */
  intent?: ValidatedIntent;
}

interface ValidationRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning';
  validate(intent: ParsedIntent): ValidationRuleResult;
}
```

### 3.6 Orchestrator Interface

```typescript
/**
 * Interface for export orchestration.
 */
interface IExportOrchestrator {
  /**
   * Execute export process.
   *
   * @param intent - Normalized intent
   * @param options - Orchestration options
   * @returns Export result with all artifacts
   */
  execute(
    intent: NormalizedIntent,
    options?: OrchestrationOptions
  ): Promise<ExportResult>;

  /**
   * Register an exporter.
   *
   * @param exporter - Exporter to register
   */
  registerExporter(exporter: IExporter): void;

  /**
   * Get execution plan without executing.
   *
   * @param intent - Intent to plan for
   * @returns Execution plan
   */
  plan(intent: NormalizedIntent): ExecutionPlan;

  /**
   * Subscribe to export progress events.
   *
   * @param handler - Event handler
   */
  onProgress(handler: ProgressHandler): void;
}

interface OrchestrationOptions {
  /** Export formats to include */
  formats?: ExportFormat[];
  /** Maximum parallel exporters */
  concurrency?: number;
  /** Continue on exporter failure */
  continueOnError?: boolean;
  /** Dry run (plan only) */
  dryRun?: boolean;
}

interface ExportResult {
  success: boolean;
  artifacts: ExportArtifact[];
  errors: ExportError[];
  warnings: ExportWarning[];
  metadata: ExportMetadata;
}

interface ExecutionPlan {
  /** Exporters to execute */
  exporters: ExporterPlanItem[];
  /** Execution order */
  order: ExporterId[];
  /** Dependencies between exporters */
  dependencies: Map<ExporterId, ExporterId[]>;
  /** Estimated artifacts */
  estimatedArtifacts: number;
}

type ProgressHandler = (event: ProgressEvent) => void;

interface ProgressEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  exporterId?: ExporterId;
  progress?: number;
  message?: string;
  artifact?: ExportArtifact;
  error?: Error;
}
```

---

## 4. Dependency Rules

### 4.1 Dependency Hierarchy

```
DEPENDENCY HIERARCHY (Clean Architecture)
==========================================

    +------------------------------------------+
    |              EXTERNAL WORLD              |
    |  (File System, Network, Cloud Services)  |
    +------------------------------------------+
                        |
                        | [Infrastructure Adapters]
                        v
    +------------------------------------------+
    |           INTERFACE ADAPTERS             |
    |     (CLI, API, Event Handlers)           |
    +------------------------------------------+
                        |
                        | [Use Case Boundary]
                        v
    +------------------------------------------+
    |            APPLICATION LAYER             |
    |   (ExportOrchestrator, ArtifactCollector)|
    +------------------------------------------+
                        |
                        | [Domain Boundary]
                        v
    +------------------------------------------+
    |              DOMAIN LAYER                |
    |  (Exporters, Serializers, Validators)    |
    +------------------------------------------+
                        |
                        | [Core Boundary]
                        v
    +------------------------------------------+
    |                 CORE                     |
    |    (Interfaces, Types, Pure Functions)   |
    +------------------------------------------+

DEPENDENCY DIRECTION: Outer layers depend on inner layers
                      Inner layers NEVER depend on outer layers
```

### 4.2 Module Dependency Matrix

```
MODULE DEPENDENCY MATRIX
========================

                     | Core | Exporters | Serializers | Packaging | Verification |
---------------------|------|-----------|-------------|-----------|--------------|
Core                 |  -   |    NO     |     NO      |    NO     |      NO      |
Exporters            | YES  |    NO     |    YES*     |    NO     |      NO      |
Serializers          | YES  |    NO     |     -       |    NO     |      NO      |
Packaging            | YES  |    NO     |    YES      |    -      |      NO      |
Verification         | YES  |    NO     |    YES      |    NO     |      -       |
Orchestrator         | YES  |   YES     |    YES      |   YES     |     YES      |

YES  = Depends on (allowed)
NO   = Must not depend on
YES* = Depends on via interface only
-    = Self (N/A)
```

### 4.3 Core Independence Rules

```typescript
/**
 * CORE MODULE RULES
 *
 * The core module (/src/core) must:
 * 1. Have ZERO external dependencies (no npm packages)
 * 2. Contain only interfaces, types, and pure functions
 * 3. Be completely platform-agnostic
 * 4. Be testable without mocks
 */

// ALLOWED in Core:
interface IExporter { /* ... */ }
type ExportFormat = 'terraform' | 'kubernetes';
function validateSchema(data: unknown): ValidationResult;

// NOT ALLOWED in Core:
import fs from 'fs';              // External dependency
import yaml from 'yaml';          // External dependency
import { S3 } from 'aws-sdk';     // Platform-specific
```

### 4.4 Exporter Independence Rules

```typescript
/**
 * EXPORTER MODULE RULES
 *
 * Each exporter must:
 * 1. Depend only on Core interfaces
 * 2. Not depend on other exporters
 * 3. Not depend directly on serializers (use interface)
 * 4. Be independently testable
 * 5. Be independently replaceable
 */

// CORRECT: Depends on interface
class TerraformExporter implements IExporter {
  constructor(private serializer: ISerializer) {}
}

// INCORRECT: Direct dependency on another exporter
import { KubernetesExporter } from '../kubernetes';

// INCORRECT: Direct dependency on serializer implementation
import { HCLSerializer } from '../../serializers/hcl';
```

### 4.5 Serializer Purity Rules

```typescript
/**
 * SERIALIZER MODULE RULES
 *
 * Serializers must be:
 * 1. Pure functions (no side effects)
 * 2. Deterministic (same input = same output)
 * 3. Stateless (no instance variables)
 * 4. Synchronous (no async operations)
 */

// CORRECT: Pure function serializer
class YAMLSerializer implements ISerializer {
  serialize(content: unknown, options?: SerializerOptions): string {
    // Pure transformation, no side effects
    return yaml.stringify(content, options);
  }
}

// INCORRECT: Stateful serializer
class BadSerializer implements ISerializer {
  private cache = new Map();  // State!

  serialize(content: unknown): string {
    if (this.cache.has(content)) {  // Side effect!
      return this.cache.get(content);
    }
    // ...
  }
}
```

### 4.6 No Circular Dependencies

```
CIRCULAR DEPENDENCY PREVENTION
==============================

Detected circular dependency example (PROHIBITED):

    ModuleA ----imports----> ModuleB
       ^                        |
       |                        |
       +------imports-----------+

Solution: Extract shared interface to Core

    +--------+
    |  Core  |  <-- Shared interface
    +--------+
        ^
        |
    +---+---+
    |       |
    v       v
ModuleA   ModuleB  <-- Both depend on Core only
```

### 4.7 Dependency Injection Pattern

```typescript
/**
 * DEPENDENCY INJECTION RULES
 *
 * All dependencies must be:
 * 1. Injected via constructor
 * 2. Typed as interfaces (not implementations)
 * 3. Configurable at runtime
 */

// CORRECT: Dependencies injected
class ExportOrchestrator {
  constructor(
    private readonly exporterRegistry: IExporterRegistry,
    private readonly serializerRegistry: ISerializerRegistry,
    private readonly artifactCollector: IArtifactCollector,
    private readonly validator: IValidator,
    private readonly logger: ILogger
  ) {}
}

// INCORRECT: Hard-coded dependencies
class BadOrchestrator {
  private registry = new ExporterRegistry();  // Hard-coded!
  private logger = console;                    // Hard-coded!
}
```

---

## 5. Extension Points

### 5.1 Adding New Exporters

```
EXPORTER EXTENSION GUIDE
========================

Step 1: Create exporter directory
---------------------------------
/src/exporters/
    +-- newformat/
            +-- NewFormatExporter.ts
            +-- index.ts
            +-- types.ts

Step 2: Implement IExporter interface
-------------------------------------
```

```typescript
// /src/exporters/newformat/NewFormatExporter.ts

import { IExporter, ExportArtifact, NormalizedIntent } from '../../core';

export class NewFormatExporter implements IExporter {
  readonly id = 'newformat-exporter';
  readonly name = 'NewFormat Exporter';
  readonly targetFormat = 'newformat' as const;
  readonly version = '1.0.0' as const;
  readonly supportedSections = ['compute', 'network'] as const;

  async transform(
    intent: NormalizedIntent,
    options?: ExportOptions
  ): Promise<ExportArtifact[]> {
    const artifacts: ExportArtifact[] = [];

    // Transform logic here
    if (intent.compute) {
      artifacts.push({
        path: 'newformat/compute.nf',
        content: this.transformCompute(intent.compute),
        format: 'newformat',
        encoding: 'utf-8'
      });
    }

    return artifacts;
  }

  async validate(artifact: ExportArtifact): Promise<ValidationResult> {
    // Validation logic
    return { valid: true, errors: [], warnings: [] };
  }

  canHandle(intent: NormalizedIntent): boolean {
    return this.supportedSections.some(
      section => intent[section] !== undefined
    );
  }

  getRequiredSerializers(): SerializerType[] {
    return ['newformat'];
  }

  private transformCompute(compute: unknown): unknown {
    // Transform compute section to new format
    return {};
  }
}
```

```
Step 3: Register exporter
-------------------------
```

```typescript
// /src/exporters/index.ts

import { NewFormatExporter } from './newformat';

export function createExporterRegistry(): IExporterRegistry {
  const registry = new ExporterRegistry();

  // Register built-in exporters
  registry.register(new TerraformExporter());
  registry.register(new KubernetesExporter());
  // ...

  // Register new exporter
  registry.register(new NewFormatExporter());

  return registry;
}
```

```
Step 4: Add serializer (if needed)
----------------------------------
See Section 5.2 for serializer extension.

Step 5: Add tests
-----------------
/tests/exporters/newformat/
    +-- NewFormatExporter.test.ts
    +-- fixtures/
            +-- input/
            +-- expected/
```

### 5.2 Custom Serialization Formats

```
SERIALIZER EXTENSION GUIDE
==========================

Step 1: Create serializer directory
-----------------------------------
/src/serializers/
    +-- newformat/
            +-- NewFormatSerializer.ts
            +-- NewFormatFormatter.ts
            +-- index.ts
```

```typescript
// /src/serializers/newformat/NewFormatSerializer.ts

import { ISerializer, SerializerOptions } from '../../core';

export class NewFormatSerializer implements ISerializer {
  readonly id = 'newformat-serializer';
  readonly formatType = 'newformat' as const;
  readonly fileExtensions = ['.nf', '.newformat'];
  readonly mimeType = 'application/x-newformat';

  serialize(content: unknown, options?: SerializerOptions): string {
    const indent = options?.indent ?? 2;
    const sortKeys = options?.sortKeys ?? true;

    // Implement serialization logic
    return this.toNewFormat(content, { indent, sortKeys });
  }

  deserialize(text: string): unknown {
    // Implement deserialization logic
    return this.parseNewFormat(text);
  }

  format(text: string, options?: FormatOptions): string {
    // Reformat existing content
    const parsed = this.deserialize(text);
    return this.serialize(parsed, options);
  }

  validate(text: string): ValidationResult {
    try {
      this.deserialize(text);
      return { valid: true, errors: [], warnings: [] };
    } catch (error) {
      return {
        valid: false,
        errors: [{ message: error.message }],
        warnings: []
      };
    }
  }

  private toNewFormat(obj: unknown, opts: { indent: number; sortKeys: boolean }): string {
    // Custom serialization implementation
    return '';
  }

  private parseNewFormat(text: string): unknown {
    // Custom parsing implementation
    return {};
  }
}
```

```
Step 2: Register serializer
---------------------------
```

```typescript
// /src/serializers/index.ts

import { NewFormatSerializer } from './newformat';

export function createSerializerRegistry(): ISerializerRegistry {
  const registry = new SerializerRegistry();

  registry.register(new HCLSerializer());
  registry.register(new YAMLSerializer());
  registry.register(new JSONSerializer());
  registry.register(new SQLSerializer());
  registry.register(new TOMLSerializer());
  registry.register(new NewFormatSerializer());  // Add new serializer

  return registry;
}
```

### 5.3 Signing Algorithm Plugins

```
SIGNER EXTENSION GUIDE
======================

Step 1: Create signer implementation
------------------------------------
/src/packaging/signer/
    +-- algorithms/
            +-- NewAlgorithmSigner.ts
```

```typescript
// /src/packaging/signer/algorithms/NewAlgorithmSigner.ts

import { ISigner, SignatureResult, SigningAlgorithm } from '../../../core';

export class NewAlgorithmSigner implements ISigner {
  readonly id = 'newalgo-signer';
  readonly algorithm: SigningAlgorithm = 'newalgo' as SigningAlgorithm;

  private privateKey: Buffer | null = null;
  private publicKey: Buffer | null = null;

  async configure(config: SignerConfig): Promise<void> {
    // Load keys from config
    this.privateKey = await this.loadPrivateKey(config.privateKeyPath);
    this.publicKey = await this.loadPublicKey(config.publicKeyPath);
  }

  async sign(
    content: string | Buffer,
    options?: SignOptions
  ): Promise<SignatureResult> {
    if (!this.privateKey) {
      throw new Error('Signer not configured');
    }

    const data = typeof content === 'string'
      ? Buffer.from(content, 'utf-8')
      : content;

    // Implement signing with new algorithm
    const signature = this.signWithNewAlgo(data, this.privateKey);

    return {
      signature: signature.toString('base64'),
      algorithm: this.algorithm,
      keyId: options?.keyId ?? 'default',
      timestamp: options?.timestamp ? new Date().toISOString() : undefined
    };
  }

  async verify(
    content: string | Buffer,
    signature: string,
    options?: VerifyOptions
  ): Promise<VerificationResult> {
    const publicKey = options?.publicKey
      ? Buffer.from(options.publicKey, 'base64')
      : this.publicKey;

    if (!publicKey) {
      return { valid: false, error: 'No public key available' };
    }

    const data = typeof content === 'string'
      ? Buffer.from(content, 'utf-8')
      : content;

    const isValid = this.verifyWithNewAlgo(
      data,
      Buffer.from(signature, 'base64'),
      publicKey
    );

    return { valid: isValid };
  }

  async getPublicKey(): Promise<string> {
    if (!this.publicKey) {
      throw new Error('Signer not configured');
    }
    return this.publicKey.toString('base64');
  }

  isConfigured(): boolean {
    return this.privateKey !== null;
  }

  private signWithNewAlgo(data: Buffer, key: Buffer): Buffer {
    // Implement algorithm
    return Buffer.alloc(0);
  }

  private verifyWithNewAlgo(
    data: Buffer,
    signature: Buffer,
    key: Buffer
  ): boolean {
    // Implement verification
    return false;
  }

  private async loadPrivateKey(path: string): Promise<Buffer> {
    // Load key from file
    return Buffer.alloc(0);
  }

  private async loadPublicKey(path: string): Promise<Buffer> {
    // Load key from file
    return Buffer.alloc(0);
  }
}
```

```
Step 2: Register signer
-----------------------
```

```typescript
// /src/packaging/signer/index.ts

import { NewAlgorithmSigner } from './algorithms/NewAlgorithmSigner';

export function createSignerRegistry(): ISignerRegistry {
  const registry = new SignerRegistry();

  registry.register(new Ed25519Signer());
  registry.register(new RSAPSSSigner());
  registry.register(new ECDSASigner());
  registry.register(new NewAlgorithmSigner());  // Add new signer

  return registry;
}
```

### 5.4 Extension Architecture Diagram

```
EXTENSION ARCHITECTURE
======================

    +------------------------------------------------------------+
    |                    EXTENSION REGISTRY                      |
    |                                                            |
    |  +------------------+  +------------------+  +----------+  |
    |  | ExporterRegistry |  | SerializerReg.   |  | SignerReg|  |
    |  +------------------+  +------------------+  +----------+  |
    |          |                    |                   |        |
    +----------|--------------------|--------------------|-------+
               |                    |                    |
               v                    v                    v
    +----------+----------+  +------+------+  +---------+--------+
    |     EXPORTERS       |  | SERIALIZERS |  |      SIGNERS     |
    +---------------------+  +-------------+  +------------------+
    | [Built-in]          |  | [Built-in]  |  | [Built-in]       |
    | - Terraform         |  | - HCL       |  | - Ed25519        |
    | - Kubernetes        |  | - YAML      |  | - RSA-PSS        |
    | - Helm              |  | - JSON      |  | - ECDSA          |
    | - CloudFormation    |  | - SQL       |  |                  |
    | - ARM               |  | - TOML      |  | [Custom]         |
    | - GCP               |  |             |  | - Your Signer    |
    | - IAM               |  | [Custom]    |  +------------------+
    | - Database          |  | - Your Fmt  |
    | - Docker Compose    |  +-------------+
    | - Config            |
    |                     |
    | [Custom]            |
    | - Your Exporter     |
    +---------------------+

    PLUGIN LOADING:

    1. Core loads registry
    2. Registry scans plugin directory
    3. Plugins are validated against interface
    4. Valid plugins are registered
    5. Orchestrator uses registered plugins
```

---

## 6. Error Boundaries

### 6.1 Error Hierarchy

```
ERROR HIERARCHY
===============

    BaseExportError
        |
        +-- ParseError
        |       +-- InvalidJSONError
        |       +-- InvalidYAMLError
        |       +-- EncodingError
        |
        +-- ValidationError
        |       +-- SchemaValidationError
        |       +-- ReferenceError
        |       +-- ConstraintError
        |       +-- SecurityError
        |
        +-- TransformError
        |       +-- UnsupportedFeatureError
        |       +-- MappingError
        |       +-- ResourceConflictError
        |
        +-- SerializationError
        |       +-- FormatError
        |       +-- EncodingError
        |       +-- OverflowError
        |
        +-- PackagingError
                +-- SigningError
                +-- ChecksumError
                +-- ArchiveError
```

### 6.2 Error Boundary Stages

```
ERROR BOUNDARY STAGES
=====================

STAGE 1: PARSE BOUNDARY (Pre-validation)
----------------------------------------
Location: IntentLoader
Catches:  File I/O errors, parsing errors, encoding errors
Action:   Fail fast with descriptive error
Recovery: None (invalid input)

    +------------------+
    | DeploymentIntent |
    +------------------+
            |
            v
    +-----------------+
    |   Parse Stage   |  <-- BOUNDARY 1
    +-----------------+
            |
    [ParseError?] ---> Exit with error report
            |
            v


STAGE 2: VALIDATION BOUNDARY (Pre-export)
-----------------------------------------
Location: IntentValidator
Catches:  Schema errors, reference errors, constraint errors
Action:   Collect all errors before failing
Recovery: Return detailed validation report

            |
            v
    +-------------------+
    | Validation Stage  |  <-- BOUNDARY 2
    +-------------------+
            |
    [ValidationError[]] ---> Exit with validation report
            |
            v


STAGE 3: TRANSFORM BOUNDARY (During export)
-------------------------------------------
Location: Each Exporter
Catches:  Mapping errors, unsupported features, conflicts
Action:   Per-exporter error handling
Recovery: Skip failed exporter, continue others (configurable)

            |
            v
    +--------------------+
    | Transform Stage    |  <-- BOUNDARY 3
    +--------------------+
            |
    [TransformError?] ---> Skip or fail (based on config)
            |
            v


STAGE 4: SERIALIZATION BOUNDARY (Post-transform)
------------------------------------------------
Location: Serializers
Catches:  Format errors, encoding issues, size limits
Action:   Fail artifact, not entire export
Recovery: Report failed artifacts in result

            |
            v
    +----------------------+
    | Serialization Stage  |  <-- BOUNDARY 4
    +----------------------+
            |
    [SerializationError?] ---> Mark artifact as failed
            |
            v


STAGE 5: PACKAGING BOUNDARY (Final stage)
-----------------------------------------
Location: Packaging module
Catches:  Signing errors, archive errors, checksum failures
Action:   Fail entire package
Recovery: Return partial results without packaging

            |
            v
    +-------------------+
    |  Packaging Stage  |  <-- BOUNDARY 5
    +-------------------+
            |
    [PackagingError?] ---> Return unpackaged artifacts
            |
            v
    +-------------------+
    |   Final Output    |
    +-------------------+
```

### 6.3 Error Structure

```typescript
/**
 * Base error class for all export errors.
 */
abstract class BaseExportError extends Error {
  abstract readonly code: string;
  abstract readonly stage: ErrorStage;
  abstract readonly recoverable: boolean;

  constructor(
    message: string,
    readonly details?: Record<string, unknown>,
    readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON(): ErrorReport {
    return {
      code: this.code,
      stage: this.stage,
      message: this.message,
      details: this.details,
      recoverable: this.recoverable,
      stack: this.stack
    };
  }
}

type ErrorStage = 'parse' | 'validate' | 'transform' | 'serialize' | 'package';

/**
 * Validation error with multiple issues.
 */
class ValidationError extends BaseExportError {
  readonly code = 'VALIDATION_ERROR';
  readonly stage = 'validate' as const;
  readonly recoverable = false;

  constructor(
    readonly issues: ValidationIssue[],
    message?: string
  ) {
    super(message ?? `Validation failed with ${issues.length} issue(s)`);
  }

  get errors(): ValidationIssue[] {
    return this.issues.filter(i => i.severity === 'error');
  }

  get warnings(): ValidationIssue[] {
    return this.issues.filter(i => i.severity === 'warning');
  }
}

interface ValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
  expected?: unknown;
  actual?: unknown;
}

/**
 * Transform error from exporter.
 */
class TransformError extends BaseExportError {
  readonly code = 'TRANSFORM_ERROR';
  readonly stage = 'transform' as const;
  readonly recoverable = true;

  constructor(
    readonly exporterId: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message, details);
  }
}
```

### 6.4 Error Recovery Strategies

```
ERROR RECOVERY STRATEGIES
=========================

STRATEGY 1: Fail Fast
---------------------
Use for: Critical errors where continuation is unsafe
Example: Schema validation failure

    [Error] --> Log --> Report --> Exit(1)


STRATEGY 2: Skip and Continue
-----------------------------
Use for: Non-critical exporter failures
Example: One exporter fails, others succeed

    [Error] --> Log --> Mark Failed --> Continue
                              |
                              v
                    Include in final report


STRATEGY 3: Retry with Backoff
------------------------------
Use for: Transient errors (network, resource limits)
Example: KMS signing temporarily unavailable

    [Error] --> Wait(1s) --> Retry
                   |
                   v (3 failures)
            Fail permanently


STRATEGY 4: Fallback
--------------------
Use for: Feature degradation
Example: Signing fails, output unsigned artifacts

    [Error] --> Try alternative --> Success
                      |
                      v (all fail)
                 Degrade gracefully


STRATEGY 5: Aggregate and Report
--------------------------------
Use for: Multiple validation errors
Example: Schema has 10 issues

    [Error1]  --+
    [Error2]  --+--> Collect all --> Single report
    [ErrorN]  --+
```

---

## 7. Audit Integration Points

### 7.1 Export Event Logging

```
EXPORT EVENT LOGGING
====================

EVENT TAXONOMY:
---------------

    export.started
    export.intent.loaded
    export.intent.validated
    export.intent.normalized
    export.transform.started        (per exporter)
    export.transform.completed      (per exporter)
    export.transform.failed         (per exporter)
    export.artifact.created         (per artifact)
    export.artifact.serialized      (per artifact)
    export.verification.started
    export.verification.completed
    export.package.started
    export.package.signed
    export.package.completed
    export.completed
    export.failed


EVENT STRUCTURE:
----------------
```

```typescript
interface AuditEvent {
  /** Unique event ID (UUIDv7 for ordering) */
  eventId: string;

  /** Event type from taxonomy */
  eventType: ExportEventType;

  /** ISO 8601 timestamp */
  timestamp: string;

  /** Export session ID (groups related events) */
  sessionId: string;

  /** Correlation ID for distributed tracing */
  correlationId?: string;

  /** Actor who initiated the export */
  actor: AuditActor;

  /** Resource being acted upon */
  resource: AuditResource;

  /** Event outcome */
  outcome: 'success' | 'failure' | 'partial';

  /** Event-specific data */
  data: Record<string, unknown>;

  /** Security classification */
  classification: 'public' | 'internal' | 'confidential';
}

interface AuditActor {
  type: 'user' | 'service' | 'system';
  id: string;
  name?: string;
  ip?: string;
  userAgent?: string;
}

interface AuditResource {
  type: 'intent' | 'artifact' | 'package';
  id: string;
  name?: string;
  path?: string;
}
```

### 7.2 Artifact Lineage Tracking

```
ARTIFACT LINEAGE TRACKING
=========================

LINEAGE MODEL:
--------------

    DeploymentIntent (source)
           |
           | [version: 1.0.0]
           | [hash: sha256:abc...]
           |
           v
    +------------------+
    |  Export Session  |
    |  ID: sess-123    |
    |  Time: 2026-01-02|
    +------------------+
           |
           +---> TerraformExporter v1.0.0
           |          |
           |          +---> main.tf
           |          |     [hash: sha256:...]
           |          |     [lines: 150]
           |          |
           |          +---> variables.tf
           |                [hash: sha256:...]
           |
           +---> KubernetesExporter v1.0.0
                      |
                      +---> deployment.yaml
                            [hash: sha256:...]


LINEAGE RECORD STRUCTURE:
-------------------------
```

```typescript
interface LineageRecord {
  /** Unique lineage ID */
  lineageId: string;

  /** Export session this lineage belongs to */
  sessionId: string;

  /** Source intent information */
  source: {
    type: 'deployment-intent';
    version: string;
    hash: string;
    path?: string;
  };

  /** Transformation applied */
  transformation: {
    exporterId: string;
    exporterVersion: string;
    timestamp: string;
    durationMs: number;
  };

  /** Output artifact information */
  artifact: {
    path: string;
    format: string;
    hash: string;
    size: number;
    encoding: string;
  };

  /** Input sections used to create this artifact */
  inputs: string[];

  /** Dependencies on other artifacts */
  dependencies: string[];
}

interface LineageManifest {
  /** Manifest version */
  version: '1.0';

  /** Generation timestamp */
  generated: string;

  /** All lineage records */
  records: LineageRecord[];

  /** Dependency graph */
  graph: LineageGraph;
}

interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
}
```

### 7.3 Version Correlation

```
VERSION CORRELATION MAP
=======================

PURPOSE: Track which versions of intent produced which artifact versions

CORRELATION RECORD:
-------------------

    +---------------------------------------------------------------+
    |                    VERSION CORRELATION                         |
    +---------------------------------------------------------------+
    | Intent Version | Export Date | Exporter Versions | Artifacts  |
    +----------------+-------------+-------------------+-------------+
    | 1.0.0          | 2026-01-01  | TF:1.0, K8s:1.0   | pkg-001    |
    | 1.0.1          | 2026-01-02  | TF:1.0, K8s:1.0   | pkg-002    |
    | 1.1.0          | 2026-01-03  | TF:1.1, K8s:1.0   | pkg-003    |
    +---------------------------------------------------------------+

DIFF TRACKING:
--------------
```

```typescript
interface VersionCorrelation {
  /** Correlation ID */
  correlationId: string;

  /** Source intent version */
  intentVersion: {
    version: string;
    hash: string;
    timestamp: string;
  };

  /** Exporter versions used */
  exporterVersions: Record<ExporterId, string>;

  /** Serializer versions used */
  serializerVersions: Record<SerializerId, string>;

  /** Output package info */
  package: {
    id: string;
    hash: string;
    timestamp: string;
  };

  /** Changes from previous version */
  changes?: {
    previousCorrelationId: string;
    intentDiff: IntentDiff;
    artifactDiffs: ArtifactDiff[];
  };
}

interface IntentDiff {
  added: string[];      // Paths added
  removed: string[];    // Paths removed
  modified: string[];   // Paths modified
}

interface ArtifactDiff {
  path: string;
  status: 'added' | 'removed' | 'modified' | 'unchanged';
  previousHash?: string;
  currentHash: string;
}
```

### 7.4 Audit Integration Architecture

```
AUDIT INTEGRATION ARCHITECTURE
==============================

    +------------------------------------------------------------------+
    |                        EXPORT SYSTEM                              |
    +------------------------------------------------------------------+
    |                                                                   |
    |   +-----------------+     +------------------+                    |
    |   | ExportOrchestrator|-->| AuditEmitter    |                    |
    |   +-----------------+     +------------------+                    |
    |           |                       |                               |
    |           |                       v                               |
    |           |               +---------------+                       |
    |           |               | EventBuffer   |                       |
    |           |               +---------------+                       |
    |           |                       |                               |
    +-----------|---------------------- | ------------------------------+
                |                       |
                v                       v
    +------------------+    +-------------------+    +------------------+
    |  Artifact Store  |    |   Audit Store     |    | Lineage Store    |
    +------------------+    +-------------------+    +------------------+
    | - S3 / GCS / Azure|    | - Elasticsearch  |    | - Graph DB       |
    | - Local FS       |    | - CloudWatch     |    | - Neo4j          |
    | - Git repo       |    | - Splunk         |    | - Custom store   |
    +------------------+    +-------------------+    +------------------+


AUDIT EVENT FLOW:
-----------------

    1. Export action occurs
           |
           v
    2. AuditEmitter captures event
           |
           v
    3. Event enriched with context
           |
           v
    4. Event buffered (async)
           |
           v
    5. Batch written to audit store
           |
           v
    6. Lineage updated (if artifact event)
           |
           v
    7. Version correlation updated (on completion)


QUERY PATTERNS:
---------------

    Q1: "Show all exports of intent X"
        SELECT * FROM audits
        WHERE resource.type = 'intent'
        AND resource.id = 'X'
        ORDER BY timestamp DESC

    Q2: "Show lineage of artifact Y"
        MATCH (a:Artifact {id: 'Y'})-[:DERIVED_FROM*]->(s:Source)
        RETURN a, s

    Q3: "Compare versions V1 and V2"
        SELECT * FROM version_correlations
        WHERE intentVersion IN ('V1', 'V2')
```

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| DeploymentIntent | Input specification describing desired infrastructure |
| NormalizedIntent | Canonical form of intent after validation and normalization |
| ExportArtifact | Single output file produced by an exporter |
| Exporter | Component that transforms intent to platform-specific format |
| Serializer | Pure function that converts objects to string representation |
| Signer | Component that cryptographically signs artifacts |
| Lineage | Chain of transformations from source to artifact |

## Appendix B: File Structure Summary

```
/src/
    +-- core/
    |       +-- loader/
    |       +-- validator/
    |       +-- normalizer/
    |       +-- orchestrator/
    |       +-- collector/
    |
    +-- exporters/
    |       +-- terraform/
    |       +-- kubernetes/
    |       +-- helm/
    |       +-- cloudformation/
    |       +-- arm/
    |       +-- gcp/
    |       +-- iam/
    |       +-- database/
    |       +-- docker/
    |       +-- config/
    |
    +-- serializers/
    |       +-- hcl/
    |       +-- yaml/
    |       +-- json/
    |       +-- sql/
    |       +-- toml/
    |
    +-- packaging/
    |       +-- signer/
    |       +-- checksum/
    |       +-- builder/
    |       +-- manifest/
    |
    +-- verification/
            +-- schema/
            +-- integrity/
            +-- determinism/
```

## Appendix C: Technology Stack Recommendations

| Component | Recommended Technology | Alternative |
|-----------|----------------------|-------------|
| Language | TypeScript 5.x | - |
| Runtime | Node.js 20 LTS | Deno, Bun |
| Testing | Vitest | Jest |
| Schema Validation | Zod | AJV |
| YAML Parsing | yaml | js-yaml |
| HCL Generation | Custom | hcl2-parser |
| Signing | noble-ed25519 | node:crypto |
| Compression | zlib | pako |

---

*Document generated as part of SPARC Architecture phase.*
*For questions or updates, see the contribution guidelines.*
