# SPARC Pseudocode - Agentics Deployment Exporters

## 1. Overview

### 1.1 Purpose

This document provides comprehensive pseudocode specifications for the Agentics Deployment Exporters system. The pseudocode serves as:

- **Implementation Blueprint**: Language-agnostic algorithm definitions for deterministic transformation pipelines
- **Verification Reference**: Precise logic flows for testing and validation
- **Documentation**: Clear specification of all transformation behaviors

### 1.2 Transformation Pipeline Concept

The system operates as a pure transformation pipeline with the following properties:

```
PROPERTIES:
    - Immutability: Input intents are never modified
    - Determinism: Same input always produces identical output
    - Reproducibility: Builds can be replicated exactly given same inputs
    - Traceability: Every output links back to its source intent
```

```
PIPELINE OVERVIEW:

    DeploymentIntent (Immutable)
           |
           v
    +----------------+
    |   INGESTION    |  Parse and freeze intent
    +----------------+
           |
           v
    +----------------+
    |  VALIDATION    |  Schema and integrity checks
    +----------------+
           |
           v
    +----------------+
    | NORMALIZATION  |  Canonical form conversion
    +----------------+
           |
           v
    +----------------+
    |   TRANSFORM    |  Format-specific conversion
    +----------------+
           |
           v
    +----------------+
    | VERIFICATION   |  Output integrity checks
    +----------------+
           |
           v
    Deployable Artifacts (Signed)
```

---

## 2. Core Algorithms

### 2.1 Intent Ingestion Flow

```
ALGORITHM: IngestDeploymentIntent
INPUT: intentPath (string) - Path to DeploymentIntent JSON file
OUTPUT: FrozenIntent object or IngestionError

CONSTANTS:
    SUPPORTED_SCHEMA_VERSIONS = ["1.0", "1.1", "2.0"]
    MAX_INTENT_SIZE_BYTES = 10_485_760  // 10 MB

BEGIN
    // Phase 1: File Access and Size Validation
    IF NOT fileExists(intentPath) THEN
        RETURN IngestionError(
            code: "INTENT_NOT_FOUND",
            path: intentPath,
            message: "DeploymentIntent file does not exist"
        )
    END IF

    fileSize = getFileSize(intentPath)
    IF fileSize > MAX_INTENT_SIZE_BYTES THEN
        RETURN IngestionError(
            code: "INTENT_TOO_LARGE",
            path: intentPath,
            actualSize: fileSize,
            maxSize: MAX_INTENT_SIZE_BYTES
        )
    END IF

    // Phase 2: Raw Content Reading
    rawIntent = readFileAsUTF8(intentPath)

    IF rawIntent is empty THEN
        RETURN IngestionError(
            code: "EMPTY_INTENT",
            path: intentPath
        )
    END IF

    // Phase 3: JSON Parsing
    TRY
        parsedIntent = parseJSON(rawIntent)
    CATCH JSONParseError AS error
        RETURN IngestionError(
            code: "INVALID_JSON",
            path: intentPath,
            parseError: error.message,
            position: error.position
        )
    END TRY

    // Phase 4: Schema Version Validation
    schemaVersion = parsedIntent.schemaVersion

    IF schemaVersion IS NULL OR schemaVersion IS UNDEFINED THEN
        RETURN IngestionError(
            code: "MISSING_SCHEMA_VERSION",
            path: intentPath
        )
    END IF

    IF schemaVersion NOT IN SUPPORTED_SCHEMA_VERSIONS THEN
        RETURN IngestionError(
            code: "UNSUPPORTED_SCHEMA_VERSION",
            path: intentPath,
            actualVersion: schemaVersion,
            supportedVersions: SUPPORTED_SCHEMA_VERSIONS
        )
    END IF

    // Phase 5: Structural Integrity Check
    integrityResult = validateStructuralIntegrity(parsedIntent)

    IF NOT integrityResult.valid THEN
        RETURN IngestionError(
            code: "STRUCTURAL_INTEGRITY_FAILURE",
            path: intentPath,
            violations: integrityResult.violations
        )
    END IF

    // Phase 6: Freeze Intent (Make Deeply Immutable)
    frozenIntent = deepFreeze(parsedIntent)

    // Add ingestion metadata
    frozenIntent._metadata = {
        ingestedAt: getCurrentTimestampUTC(),
        sourcePath: absolutePath(intentPath),
        sourceChecksum: computeSHA256(rawIntent),
        ingestionVersion: SYSTEM_VERSION
    }

    RETURN FrozenIntent(frozenIntent)
END

SUBROUTINE: validateStructuralIntegrity
INPUT: intent (object)
OUTPUT: IntegrityResult

BEGIN
    violations = []

    // Required top-level fields
    requiredFields = ["schemaVersion", "intentId", "components", "metadata"]

    FOR EACH field IN requiredFields DO
        IF NOT hasProperty(intent, field) THEN
            violations.append({
                field: field,
                error: "MISSING_REQUIRED_FIELD"
            })
        END IF
    END FOR

    // Intent ID format validation
    IF hasProperty(intent, "intentId") THEN
        IF NOT matchesPattern(intent.intentId, "^[a-z0-9-]{8,64}$") THEN
            violations.append({
                field: "intentId",
                error: "INVALID_FORMAT",
                pattern: "^[a-z0-9-]{8,64}$"
            })
        END IF
    END IF

    // Components array validation
    IF hasProperty(intent, "components") THEN
        IF NOT isArray(intent.components) THEN
            violations.append({
                field: "components",
                error: "EXPECTED_ARRAY"
            })
        ELSE IF length(intent.components) == 0 THEN
            violations.append({
                field: "components",
                error: "EMPTY_ARRAY"
            })
        END IF
    END IF

    RETURN IntegrityResult(
        valid: length(violations) == 0,
        violations: violations
    )
END

SUBROUTINE: deepFreeze
INPUT: obj (any)
OUTPUT: deeply frozen object

BEGIN
    IF obj IS NULL OR obj IS UNDEFINED THEN
        RETURN obj
    END IF

    IF isPrimitive(obj) THEN
        RETURN obj
    END IF

    IF isArray(obj) THEN
        FOR i = 0 TO length(obj) - 1 DO
            obj[i] = deepFreeze(obj[i])
        END FOR
    ELSE IF isObject(obj) THEN
        FOR EACH key IN getOwnPropertyNames(obj) DO
            obj[key] = deepFreeze(obj[key])
        END FOR
    END IF

    freeze(obj)
    RETURN obj
END
```

### 2.2 Validation Pipeline

```
ALGORITHM: ValidateIntent
INPUT: intent (FrozenIntent)
OUTPUT: ValidationResult or ValidationError

CONSTANTS:
    CHECKSUM_ALGORITHM = "SHA-256"

BEGIN
    errors = []
    warnings = []

    // Step 1: Version Compatibility Check
    IF intent.schemaVersion NOT IN SUPPORTED_SCHEMA_VERSIONS THEN
        errors.append(ValidationError(
            code: "UNSUPPORTED_VERSION",
            field: "schemaVersion",
            actual: intent.schemaVersion,
            supported: SUPPORTED_SCHEMA_VERSIONS
        ))
        // Fail fast on version mismatch
        RETURN ValidationResult(
            valid: false,
            errors: errors,
            warnings: warnings
        )
    END IF

    // Step 2: Checksum Verification
    IF hasProperty(intent, "checksum") THEN
        computedChecksum = computePayloadChecksum(intent.payload, CHECKSUM_ALGORITHM)

        IF intent.checksum != computedChecksum THEN
            errors.append(ValidationError(
                code: "CHECKSUM_MISMATCH",
                field: "checksum",
                expected: intent.checksum,
                computed: computedChecksum
            ))
        END IF
    ELSE
        warnings.append(ValidationWarning(
            code: "MISSING_CHECKSUM",
            message: "Intent lacks checksum field; integrity cannot be verified"
        ))
    END IF

    // Step 3: Component Schema Validation
    FOR EACH component IN intent.components DO
        componentResult = validateComponentSchema(component)

        IF NOT componentResult.valid THEN
            FOR EACH error IN componentResult.errors DO
                errors.append(error.withContext({
                    componentId: component.id,
                    componentType: component.type
                }))
            END FOR
        END IF

        warnings.appendAll(componentResult.warnings)
    END FOR

    // Step 4: Cross-Reference Validation
    referenceResult = validateCrossReferences(intent)
    errors.appendAll(referenceResult.errors)
    warnings.appendAll(referenceResult.warnings)

    // Step 5: Semantic Validation
    semanticResult = validateSemantics(intent)
    errors.appendAll(semanticResult.errors)
    warnings.appendAll(semanticResult.warnings)

    RETURN ValidationResult(
        valid: length(errors) == 0,
        errors: errors,
        warnings: warnings,
        intent: intent
    )
END

SUBROUTINE: validateComponentSchema
INPUT: component (object)
OUTPUT: ComponentValidationResult

BEGIN
    errors = []
    warnings = []

    // Required component fields
    requiredFields = ["id", "type", "spec"]

    FOR EACH field IN requiredFields DO
        IF NOT hasProperty(component, field) THEN
            errors.append(ValidationError(
                code: "MISSING_COMPONENT_FIELD",
                field: field
            ))
        END IF
    END FOR

    // Component ID format
    IF hasProperty(component, "id") THEN
        IF NOT matchesPattern(component.id, "^[a-z][a-z0-9-]*$") THEN
            errors.append(ValidationError(
                code: "INVALID_COMPONENT_ID",
                field: "id",
                value: component.id,
                pattern: "^[a-z][a-z0-9-]*$"
            ))
        END IF
    END IF

    // Type-specific schema validation
    IF hasProperty(component, "type") THEN
        schema = getSchemaForType(component.type)

        IF schema IS NULL THEN
            errors.append(ValidationError(
                code: "UNKNOWN_COMPONENT_TYPE",
                field: "type",
                value: component.type
            ))
        ELSE
            schemaResult = validateAgainstSchema(component.spec, schema)
            errors.appendAll(schemaResult.errors)
            warnings.appendAll(schemaResult.warnings)
        END IF
    END IF

    RETURN ComponentValidationResult(
        valid: length(errors) == 0,
        errors: errors,
        warnings: warnings
    )
END

SUBROUTINE: validateCrossReferences
INPUT: intent (FrozenIntent)
OUTPUT: ReferenceValidationResult

BEGIN
    errors = []
    warnings = []

    // Build component ID index
    componentIds = SET()
    FOR EACH component IN intent.components DO
        IF component.id IN componentIds THEN
            errors.append(ValidationError(
                code: "DUPLICATE_COMPONENT_ID",
                field: "components",
                value: component.id
            ))
        END IF
        componentIds.add(component.id)
    END FOR

    // Validate all references
    FOR EACH component IN intent.components DO
        IF hasProperty(component, "dependsOn") THEN
            FOR EACH dependency IN component.dependsOn DO
                IF dependency NOT IN componentIds THEN
                    errors.append(ValidationError(
                        code: "UNRESOLVED_DEPENDENCY",
                        componentId: component.id,
                        field: "dependsOn",
                        missingRef: dependency
                    ))
                END IF
            END FOR
        END IF

        // Check for circular dependencies
        IF hasCyclicDependency(component, intent.components) THEN
            errors.append(ValidationError(
                code: "CIRCULAR_DEPENDENCY",
                componentId: component.id
            ))
        END IF
    END FOR

    RETURN ReferenceValidationResult(
        valid: length(errors) == 0,
        errors: errors,
        warnings: warnings
    )
END

SUBROUTINE: computePayloadChecksum
INPUT: payload (object), algorithm (string)
OUTPUT: checksum (string)

BEGIN
    // Serialize deterministically
    canonicalJSON = serializeCanonical(payload)

    // Compute hash
    hash = createHash(algorithm)
    hash.update(canonicalJSON)

    RETURN hash.digest("hex")
END
```

### 2.3 Normalization Process

```
ALGORITHM: NormalizeIntent
INPUT: validatedIntent (ValidationResult with valid=true)
OUTPUT: ImmutableNormalizedIntent

BEGIN
    intent = validatedIntent.intent

    // Step 1: Create Canonical Form
    normalized = createCanonicalForm(intent)

    // Step 2: Apply Deterministic Sorting
    normalized = sortDeterministically(normalized)

    // Step 3: Resolve Internal References
    normalized = resolveInternalReferences(normalized)

    // Step 4: Expand Defaults
    normalized = expandDefaults(normalized)

    // Step 5: Compute Canonical Checksum
    normalized.canonicalChecksum = computeCanonicalChecksum(normalized)

    // Step 6: Freeze and Return
    RETURN ImmutableNormalizedIntent(deepFreeze(normalized))
END

SUBROUTINE: createCanonicalForm
INPUT: intent (FrozenIntent)
OUTPUT: canonical object

BEGIN
    canonical = {
        schemaVersion: intent.schemaVersion,
        intentId: intent.intentId,
        metadata: canonicalizeMetadata(intent.metadata),
        components: []
    }

    FOR EACH component IN intent.components DO
        canonicalComponent = {
            id: component.id,
            type: component.type,
            spec: canonicalizeSpec(component.spec, component.type),
            dependsOn: component.dependsOn OR [],
            labels: component.labels OR {},
            annotations: component.annotations OR {}
        }
        canonical.components.append(canonicalComponent)
    END FOR

    RETURN canonical
END

SUBROUTINE: sortDeterministically
INPUT: obj (object)
OUTPUT: sorted object

BEGIN
    IF isPrimitive(obj) THEN
        RETURN obj
    END IF

    IF isArray(obj) THEN
        // Arrays of objects with 'id' field are sorted by id
        IF length(obj) > 0 AND isObject(obj[0]) AND hasProperty(obj[0], "id") THEN
            sorted = sortBy(obj, "id", ASCENDING)
        ELSE
            sorted = obj  // Preserve array order for non-id arrays
        END IF

        RETURN sorted.map(item => sortDeterministically(item))
    END IF

    IF isObject(obj) THEN
        sortedKeys = sort(getOwnPropertyNames(obj), LEXICOGRAPHIC_ASCENDING)
        result = {}

        FOR EACH key IN sortedKeys DO
            result[key] = sortDeterministically(obj[key])
        END FOR

        RETURN result
    END IF

    RETURN obj
END

SUBROUTINE: resolveInternalReferences
INPUT: normalized (object)
OUTPUT: resolved object

BEGIN
    // Build reference map
    referenceMap = {}
    FOR EACH component IN normalized.components DO
        referenceMap["$ref:" + component.id] = component
    END FOR

    // Resolve all $ref strings
    resolved = deepResolveReferences(normalized, referenceMap)

    RETURN resolved
END

SUBROUTINE: deepResolveReferences
INPUT: obj (any), referenceMap (Map)
OUTPUT: resolved object

BEGIN
    IF isPrimitive(obj) THEN
        IF isString(obj) AND startsWith(obj, "$ref:") THEN
            refKey = obj
            IF referenceMap.has(refKey) THEN
                // Return reference metadata, not full object (to avoid cycles)
                target = referenceMap[refKey]
                RETURN {
                    _resolvedRef: true,
                    id: target.id,
                    type: target.type
                }
            ELSE
                THROW ReferenceResolutionError(
                    code: "UNRESOLVED_REFERENCE",
                    reference: obj
                )
            END IF
        END IF
        RETURN obj
    END IF

    IF isArray(obj) THEN
        RETURN obj.map(item => deepResolveReferences(item, referenceMap))
    END IF

    IF isObject(obj) THEN
        result = {}
        FOR EACH key IN getOwnPropertyNames(obj) DO
            result[key] = deepResolveReferences(obj[key], referenceMap)
        END FOR
        RETURN result
    END IF

    RETURN obj
END

SUBROUTINE: expandDefaults
INPUT: normalized (object)
OUTPUT: object with expanded defaults

BEGIN
    FOR EACH component IN normalized.components DO
        typeDefaults = getDefaultsForType(component.type)

        // Deep merge defaults (component values take precedence)
        component.spec = deepMerge(typeDefaults, component.spec)

        // Ensure standard fields exist
        IF NOT hasProperty(component, "labels") THEN
            component.labels = {}
        END IF

        IF NOT hasProperty(component, "annotations") THEN
            component.annotations = {}
        END IF

        // Add system annotations
        component.annotations["agentics.io/normalized-at"] = getCurrentTimestampUTC()
        component.annotations["agentics.io/normalizer-version"] = NORMALIZER_VERSION
    END FOR

    RETURN normalized
END

SUBROUTINE: computeCanonicalChecksum
INPUT: normalized (object)
OUTPUT: checksum (string)

BEGIN
    // Create checksum-specific representation (excluding computed fields)
    checksumInput = {
        schemaVersion: normalized.schemaVersion,
        intentId: normalized.intentId,
        components: normalized.components.map(c => ({
            id: c.id,
            type: c.type,
            spec: c.spec,
            dependsOn: c.dependsOn
        }))
    }

    canonicalJSON = serializeCanonical(checksumInput)
    RETURN computeSHA256(canonicalJSON)
END
```

### 2.4 Export Orchestration

```
ALGORITHM: ExportToTargets
INPUT: normalizedIntent (ImmutableNormalizedIntent), targetFormats (array of strings)
OUTPUT: ExportManifest or ExportError

CONSTANTS:
    SUPPORTED_FORMATS = ["terraform", "kubernetes", "helm", "cloudformation", "iam", "database"]

BEGIN
    // Validate requested formats
    FOR EACH format IN targetFormats DO
        IF format NOT IN SUPPORTED_FORMATS THEN
            RETURN ExportError(
                code: "UNSUPPORTED_FORMAT",
                format: format,
                supportedFormats: SUPPORTED_FORMATS
            )
        END IF
    END FOR

    results = {}
    exportErrors = []

    // Execute exports
    FOR EACH format IN targetFormats DO
        TRY
            exporter = getExporter(format)

            // Transform intent to target format
            artifacts = exporter.transform(normalizedIntent)

            // Validate generated artifacts
            validationResult = exporter.validate(artifacts)
            IF NOT validationResult.valid THEN
                exportErrors.append({
                    format: format,
                    error: "VALIDATION_FAILED",
                    details: validationResult.errors
                })
                CONTINUE
            END IF

            // Sign artifacts for integrity
            signedArtifacts = signArtifacts(artifacts, normalizedIntent)

            // Package into deployable format
            packagedArtifacts = packageArtifacts(signedArtifacts, format)

            results[format] = ExportResult(
                format: format,
                artifacts: packagedArtifacts,
                checksum: computePackageChecksum(packagedArtifacts),
                generatedAt: getCurrentTimestampUTC()
            )

        CATCH TransformError AS error
            exportErrors.append({
                format: format,
                error: "TRANSFORM_FAILED",
                details: error.message,
                stack: error.stack
            })
        END TRY
    END FOR

    // Determine overall success
    IF length(exportErrors) > 0 AND length(results) == 0 THEN
        RETURN ExportError(
            code: "ALL_EXPORTS_FAILED",
            errors: exportErrors
        )
    END IF

    RETURN ExportManifest(
        intentId: normalizedIntent.intentId,
        canonicalChecksum: normalizedIntent.canonicalChecksum,
        exports: results,
        errors: exportErrors,
        generatedAt: getCurrentTimestampUTC(),
        exporterVersion: EXPORTER_VERSION
    )
END

SUBROUTINE: getExporter
INPUT: format (string)
OUTPUT: Exporter instance

BEGIN
    exporterRegistry = {
        "terraform": TerraformExporter,
        "kubernetes": KubernetesExporter,
        "helm": HelmExporter,
        "cloudformation": CloudFormationExporter,
        "iam": IAMPolicyExporter,
        "database": DatabaseSchemaExporter
    }

    IF format NOT IN exporterRegistry THEN
        THROW ExporterNotFoundError(format)
    END IF

    RETURN new exporterRegistry[format]()
END

SUBROUTINE: signArtifacts
INPUT: artifacts (array), sourceIntent (ImmutableNormalizedIntent)
OUTPUT: array of signed artifacts

BEGIN
    signedArtifacts = []

    FOR EACH artifact IN artifacts DO
        signature = {
            algorithm: "SHA-256",
            contentHash: computeSHA256(artifact.content),
            sourceIntentId: sourceIntent.intentId,
            sourceChecksum: sourceIntent.canonicalChecksum,
            signedAt: getCurrentTimestampUTC(),
            signerVersion: SIGNER_VERSION
        }

        signedArtifacts.append({
            ...artifact,
            _signature: signature
        })
    END FOR

    RETURN signedArtifacts
END

SUBROUTINE: packageArtifacts
INPUT: artifacts (array), format (string)
OUTPUT: Package object

BEGIN
    package = {
        format: format,
        version: getFormatVersion(format),
        files: [],
        manifest: {}
    }

    FOR EACH artifact IN artifacts DO
        package.files.append({
            path: artifact.path,
            content: artifact.content,
            contentType: artifact.contentType,
            signature: artifact._signature
        })
    END FOR

    // Create format-specific manifest
    package.manifest = createPackageManifest(format, package.files)

    RETURN package
END
```

---

## 3. Exporter-Specific Transforms

### 3.1 Terraform Exporter

```
ALGORITHM: TerraformExporter.transform
INPUT: normalizedIntent (ImmutableNormalizedIntent)
OUTPUT: array of Terraform artifacts

CONSTANTS:
    TERRAFORM_VERSION = "1.5"
    PROVIDER_VERSIONS = {
        "aws": "~> 5.0",
        "azurerm": "~> 3.0",
        "google": "~> 5.0"
    }

BEGIN
    artifacts = []

    // Generate provider configurations
    providers = extractProviders(normalizedIntent)
    providerConfig = generateProviderConfig(providers)
    artifacts.append({
        path: "providers.tf",
        content: providerConfig,
        contentType: "text/x-terraform"
    })

    // Generate variables
    variables = extractVariables(normalizedIntent)
    variablesConfig = generateVariablesConfig(variables)
    artifacts.append({
        path: "variables.tf",
        content: variablesConfig,
        contentType: "text/x-terraform"
    })

    // Generate resources by component
    FOR EACH component IN normalizedIntent.components DO
        resourceConfig = transformComponentToTerraform(component)

        // Sanitize filename
        filename = sanitizeFilename(component.id) + ".tf"

        artifacts.append({
            path: "resources/" + filename,
            content: resourceConfig,
            contentType: "text/x-terraform"
        })
    END FOR

    // Generate outputs
    outputs = extractOutputs(normalizedIntent)
    outputsConfig = generateOutputsConfig(outputs)
    artifacts.append({
        path: "outputs.tf",
        content: outputsConfig,
        contentType: "text/x-terraform"
    })

    // Generate terraform.tfvars template
    tfvarsTemplate = generateTfvarsTemplate(variables)
    artifacts.append({
        path: "terraform.tfvars.example",
        content: tfvarsTemplate,
        contentType: "text/x-terraform-vars"
    })

    RETURN artifacts
END

SUBROUTINE: transformComponentToTerraform
INPUT: component (object)
OUTPUT: HCL string

BEGIN
    hcl = StringBuilder()

    resourceType = mapComponentTypeToTerraform(component.type)
    resourceName = sanitizeResourceName(component.id)

    hcl.appendLine("# Component: " + component.id)
    hcl.appendLine("# Type: " + component.type)
    hcl.appendLine("")

    hcl.appendLine("resource \"" + resourceType + "\" \"" + resourceName + "\" {")

    // Map spec fields to HCL attributes
    FOR EACH key, value IN component.spec DO
        hclAttribute = mapSpecKeyToHCL(key, component.type)
        hclValue = formatTerraformValue(value)

        hcl.appendLine("  " + hclAttribute + " = " + hclValue)
    END FOR

    // Add labels as tags
    IF length(component.labels) > 0 THEN
        hcl.appendLine("")
        hcl.appendLine("  tags = {")
        FOR EACH key, value IN sortByKey(component.labels) DO
            hcl.appendLine("    \"" + escapeHCL(key) + "\" = \"" + escapeHCL(value) + "\"")
        END FOR
        hcl.appendLine("  }")
    END IF

    // Add dependencies
    IF length(component.dependsOn) > 0 THEN
        hcl.appendLine("")
        hcl.appendLine("  depends_on = [")
        FOR EACH dep IN sortArray(component.dependsOn) DO
            depResource = mapToTerraformResourceRef(dep)
            hcl.appendLine("    " + depResource + ",")
        END FOR
        hcl.appendLine("  ]")
    END IF

    hcl.appendLine("}")

    RETURN hcl.toString()
END

SUBROUTINE: formatTerraformValue
INPUT: value (any)
OUTPUT: HCL-formatted string

BEGIN
    IF value IS NULL THEN
        RETURN "null"
    END IF

    IF isBoolean(value) THEN
        RETURN value ? "true" : "false"
    END IF

    IF isNumber(value) THEN
        RETURN toString(value)
    END IF

    IF isString(value) THEN
        IF startsWith(value, "var.") OR startsWith(value, "local.") THEN
            RETURN value  // Variable reference, no quotes
        END IF
        RETURN "\"" + escapeHCL(value) + "\""
    END IF

    IF isArray(value) THEN
        elements = value.map(v => formatTerraformValue(v))
        RETURN "[" + join(elements, ", ") + "]"
    END IF

    IF isObject(value) THEN
        hcl = StringBuilder()
        hcl.append("{")
        FOR EACH key, val IN sortByKey(value) DO
            hcl.append("\n    " + key + " = " + formatTerraformValue(val))
        END FOR
        hcl.append("\n  }")
        RETURN hcl.toString()
    END IF

    RETURN "\"" + toString(value) + "\""
END
```

### 3.2 Kubernetes Manifest Exporter

```
ALGORITHM: KubernetesExporter.transform
INPUT: normalizedIntent (ImmutableNormalizedIntent)
OUTPUT: array of Kubernetes manifest artifacts

CONSTANTS:
    K8S_API_VERSIONS = {
        "deployment": "apps/v1",
        "service": "v1",
        "configmap": "v1",
        "secret": "v1",
        "ingress": "networking.k8s.io/v1",
        "pvc": "v1",
        "serviceaccount": "v1"
    }

BEGIN
    artifacts = []

    // Group components by namespace
    namespaceGroups = groupByNamespace(normalizedIntent.components)

    FOR EACH namespace, components IN namespaceGroups DO
        // Generate namespace manifest if not default
        IF namespace != "default" THEN
            nsManifest = generateNamespaceManifest(namespace)
            artifacts.append({
                path: namespace + "/namespace.yaml",
                content: nsManifest,
                contentType: "application/x-yaml"
            })
        END IF

        // Sort components by dependency order
        sortedComponents = topologicalSort(components)

        FOR EACH component IN sortedComponents DO
            k8sManifests = transformComponentToK8s(component, namespace)

            FOR EACH manifest IN k8sManifests DO
                filename = component.id + "-" + manifest.kind.toLowerCase() + ".yaml"
                artifacts.append({
                    path: namespace + "/" + filename,
                    content: serializeYAML(manifest),
                    contentType: "application/x-yaml"
                })
            END FOR
        END FOR
    END FOR

    // Generate kustomization.yaml
    kustomization = generateKustomization(artifacts)
    artifacts.append({
        path: "kustomization.yaml",
        content: serializeYAML(kustomization),
        contentType: "application/x-yaml"
    })

    RETURN artifacts
END

SUBROUTINE: transformComponentToK8s
INPUT: component (object), namespace (string)
OUTPUT: array of Kubernetes manifest objects

BEGIN
    manifests = []

    // Common labels for all resources
    commonLabels = {
        "app.kubernetes.io/name": component.id,
        "app.kubernetes.io/managed-by": "agentics-exporter",
        "app.kubernetes.io/part-of": component.spec.application OR "default",
        ...component.labels
    }

    // Common annotations
    commonAnnotations = {
        "agentics.io/source-intent": component._metadata.sourceIntentId,
        "agentics.io/component-type": component.type,
        ...component.annotations
    }

    // Map component type to K8s resources
    SWITCH component.type DO
        CASE "container":
            manifests.append(generateDeployment(component, namespace, commonLabels, commonAnnotations))
            manifests.append(generateService(component, namespace, commonLabels))
            IF component.spec.ingress THEN
                manifests.append(generateIngress(component, namespace, commonLabels))
            END IF

        CASE "stateful-container":
            manifests.append(generateStatefulSet(component, namespace, commonLabels, commonAnnotations))
            manifests.append(generateHeadlessService(component, namespace, commonLabels))
            manifests.append(generatePVC(component, namespace, commonLabels))

        CASE "config":
            manifests.append(generateConfigMap(component, namespace, commonLabels))

        CASE "secret":
            manifests.append(generateSecretTemplate(component, namespace, commonLabels))

        CASE "cron-job":
            manifests.append(generateCronJob(component, namespace, commonLabels, commonAnnotations))

        DEFAULT:
            THROW UnsupportedComponentTypeError(component.type)
    END SWITCH

    RETURN manifests
END

SUBROUTINE: generateDeployment
INPUT: component, namespace, labels, annotations
OUTPUT: Deployment manifest object

BEGIN
    deployment = {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: {
            name: component.id,
            namespace: namespace,
            labels: labels,
            annotations: annotations
        },
        spec: {
            replicas: component.spec.replicas OR 1,
            selector: {
                matchLabels: {
                    "app.kubernetes.io/name": component.id
                }
            },
            template: {
                metadata: {
                    labels: labels,
                    annotations: filterPodAnnotations(annotations)
                },
                spec: {
                    containers: [{
                        name: component.id,
                        image: component.spec.image,
                        ports: mapPorts(component.spec.ports),
                        env: mapEnvironment(component.spec.environment),
                        resources: mapResources(component.spec.resources),
                        livenessProbe: mapProbe(component.spec.healthCheck),
                        readinessProbe: mapProbe(component.spec.readinessCheck)
                    }],
                    serviceAccountName: component.spec.serviceAccount OR "default"
                }
            }
        }
    }

    // Add deterministic revision annotation
    deployment.spec.template.metadata.annotations["agentics.io/revision"] =
        computeSHA256(serializeCanonical(deployment.spec.template.spec)).substring(0, 8)

    RETURN deployment
END

SUBROUTINE: topologicalSort
INPUT: components (array)
OUTPUT: sorted array respecting dependencies

BEGIN
    // Build dependency graph
    graph = {}
    inDegree = {}

    FOR EACH component IN components DO
        graph[component.id] = component.dependsOn OR []
        inDegree[component.id] = 0
    END FOR

    // Calculate in-degrees
    FOR EACH component IN components DO
        FOR EACH dep IN component.dependsOn OR [] DO
            IF dep IN inDegree THEN
                inDegree[dep] = inDegree[dep] + 1
            END IF
        END FOR
    END FOR

    // Kahn's algorithm
    queue = []
    FOR EACH id, degree IN inDegree DO
        IF degree == 0 THEN
            queue.append(id)
        END IF
    END FOR

    // Sort queue for determinism
    queue = sortArray(queue)

    sorted = []
    WHILE length(queue) > 0 DO
        current = queue.shift()
        sorted.append(findComponentById(components, current))

        FOR EACH dep IN graph[current] DO
            inDegree[dep] = inDegree[dep] - 1
            IF inDegree[dep] == 0 THEN
                queue.append(dep)
            END IF
        END FOR

        // Re-sort for determinism
        queue = sortArray(queue)
    END WHILE

    RETURN sorted
END
```

### 3.3 Helm Chart Exporter

```
ALGORITHM: HelmExporter.transform
INPUT: normalizedIntent (ImmutableNormalizedIntent)
OUTPUT: array of Helm chart artifacts

BEGIN
    artifacts = []
    chartName = sanitizeChartName(normalizedIntent.intentId)

    // Chart.yaml
    chartMetadata = {
        apiVersion: "v2",
        name: chartName,
        description: normalizedIntent.metadata.description OR "Generated by Agentics Exporter",
        type: "application",
        version: normalizedIntent.metadata.version OR "0.1.0",
        appVersion: normalizedIntent.metadata.appVersion OR "1.0.0",
        maintainers: normalizedIntent.metadata.maintainers OR []
    }
    artifacts.append({
        path: chartName + "/Chart.yaml",
        content: serializeYAML(chartMetadata),
        contentType: "application/x-yaml"
    })

    // values.yaml - extract all configurable values
    values = extractHelmValues(normalizedIntent)
    artifacts.append({
        path: chartName + "/values.yaml",
        content: serializeYAML(values),
        contentType: "application/x-yaml"
    })

    // templates/_helpers.tpl
    helpers = generateHelmHelpers(chartName)
    artifacts.append({
        path: chartName + "/templates/_helpers.tpl",
        content: helpers,
        contentType: "text/x-gotmpl"
    })

    // Generate templates for each component
    FOR EACH component IN normalizedIntent.components DO
        templates = generateHelmTemplates(component, chartName)

        FOR EACH template IN templates DO
            artifacts.append({
                path: chartName + "/templates/" + template.filename,
                content: template.content,
                contentType: "text/x-gotmpl"
            })
        END FOR
    END FOR

    // NOTES.txt
    notes = generateHelmNotes(normalizedIntent)
    artifacts.append({
        path: chartName + "/templates/NOTES.txt",
        content: notes,
        contentType: "text/plain"
    })

    RETURN artifacts
END

SUBROUTINE: extractHelmValues
INPUT: normalizedIntent (ImmutableNormalizedIntent)
OUTPUT: values object for values.yaml

BEGIN
    values = {
        global: {
            imageRegistry: "",
            imagePullSecrets: []
        }
    }

    FOR EACH component IN normalizedIntent.components DO
        componentValues = {
            enabled: true,
            replicaCount: component.spec.replicas OR 1
        }

        // Extract image configuration
        IF hasProperty(component.spec, "image") THEN
            imageParts = parseImageReference(component.spec.image)
            componentValues.image = {
                repository: imageParts.repository,
                tag: imageParts.tag OR "latest",
                pullPolicy: "IfNotPresent"
            }
        END IF

        // Extract resource limits
        IF hasProperty(component.spec, "resources") THEN
            componentValues.resources = {
                limits: component.spec.resources.limits OR {},
                requests: component.spec.resources.requests OR {}
            }
        END IF

        // Extract environment variables as configurable
        IF hasProperty(component.spec, "environment") THEN
            componentValues.env = {}
            FOR EACH envVar IN component.spec.environment DO
                IF NOT envVar.secret THEN
                    componentValues.env[envVar.name] = envVar.value
                END IF
            END FOR
        END IF

        // Extract service configuration
        IF hasProperty(component.spec, "ports") THEN
            componentValues.service = {
                type: "ClusterIP",
                port: component.spec.ports[0].containerPort
            }
        END IF

        values[sanitizeValueKey(component.id)] = componentValues
    END FOR

    RETURN sortDeterministically(values)
END

SUBROUTINE: generateHelmTemplates
INPUT: component (object), chartName (string)
OUTPUT: array of template objects

BEGIN
    templates = []
    valuePrefix = "{{ .Values." + sanitizeValueKey(component.id) + " }}"

    // Deployment template
    deploymentContent = StringBuilder()
    deploymentContent.appendLine("{{- if " + valuePrefix + ".enabled }}")
    deploymentContent.appendLine("apiVersion: apps/v1")
    deploymentContent.appendLine("kind: Deployment")
    deploymentContent.appendLine("metadata:")
    deploymentContent.appendLine("  name: {{ include \"" + chartName + ".fullname\" . }}-" + component.id)
    deploymentContent.appendLine("  labels:")
    deploymentContent.appendLine("    {{- include \"" + chartName + ".labels\" . | nindent 4 }}")
    deploymentContent.appendLine("spec:")
    deploymentContent.appendLine("  replicas: {{ " + valuePrefix + ".replicaCount }}")
    deploymentContent.appendLine("  selector:")
    deploymentContent.appendLine("    matchLabels:")
    deploymentContent.appendLine("      {{- include \"" + chartName + ".selectorLabels\" . | nindent 6 }}")
    deploymentContent.appendLine("      app.kubernetes.io/component: " + component.id)
    // ... continue with full deployment template
    deploymentContent.appendLine("{{- end }}")

    templates.append({
        filename: component.id + "-deployment.yaml",
        content: deploymentContent.toString()
    })

    // Service template
    IF hasProperty(component.spec, "ports") THEN
        serviceContent = generateHelmServiceTemplate(component, chartName, valuePrefix)
        templates.append({
            filename: component.id + "-service.yaml",
            content: serviceContent
        })
    END IF

    RETURN templates
END
```

### 3.4 CloudFormation Exporter

```
ALGORITHM: CloudFormationExporter.transform
INPUT: normalizedIntent (ImmutableNormalizedIntent)
OUTPUT: array of CloudFormation template artifacts

CONSTANTS:
    CFN_VERSION = "2010-09-09"

BEGIN
    artifacts = []

    // Group components by stack affinity
    stacks = groupByStackAffinity(normalizedIntent.components)

    FOR EACH stackName, components IN stacks DO
        template = {
            AWSTemplateFormatVersion: CFN_VERSION,
            Description: "Generated from intent: " + normalizedIntent.intentId,
            Metadata: {
                "AgenticsExporter": {
                    SourceIntent: normalizedIntent.intentId,
                    CanonicalChecksum: normalizedIntent.canonicalChecksum,
                    GeneratedAt: getCurrentTimestampUTC()
                }
            },
            Parameters: {},
            Mappings: {},
            Conditions: {},
            Resources: {},
            Outputs: {}
        }

        // Extract parameters from components
        parameters = extractCFNParameters(components)
        template.Parameters = parameters

        // Generate resources
        FOR EACH component IN topologicalSort(components) DO
            resources = transformComponentToCFN(component)

            FOR EACH resourceName, resource IN resources DO
                template.Resources[resourceName] = resource
            END FOR
        END FOR

        // Generate outputs
        outputs = extractCFNOutputs(components)
        template.Outputs = outputs

        // Serialize with deterministic ordering
        templateContent = serializeJSON(sortDeterministically(template), indent=2)

        artifacts.append({
            path: stackName + ".template.json",
            content: templateContent,
            contentType: "application/json"
        })

        // Generate parameter file template
        parameterFile = generateCFNParameterFile(parameters)
        artifacts.append({
            path: stackName + ".parameters.json",
            content: parameterFile,
            contentType: "application/json"
        })
    END FOR

    RETURN artifacts
END

SUBROUTINE: transformComponentToCFN
INPUT: component (object)
OUTPUT: Map of resourceName -> resource definition

BEGIN
    resources = {}
    logicalId = toCFNLogicalId(component.id)

    SWITCH component.type DO
        CASE "container":
            // ECS Task Definition
            taskDefId = logicalId + "TaskDefinition"
            resources[taskDefId] = {
                Type: "AWS::ECS::TaskDefinition",
                Properties: {
                    Family: component.id,
                    NetworkMode: "awsvpc",
                    RequiresCompatibilities: ["FARGATE"],
                    Cpu: mapToCFNCpu(component.spec.resources),
                    Memory: mapToCFNMemory(component.spec.resources),
                    ContainerDefinitions: [{
                        Name: component.id,
                        Image: component.spec.image,
                        PortMappings: mapToCFNPortMappings(component.spec.ports),
                        Environment: mapToCFNEnvironment(component.spec.environment),
                        LogConfiguration: {
                            LogDriver: "awslogs",
                            Options: {
                                "awslogs-group": {"Ref": logicalId + "LogGroup"},
                                "awslogs-region": {"Ref": "AWS::Region"},
                                "awslogs-stream-prefix": component.id
                            }
                        }
                    }]
                }
            }

            // CloudWatch Log Group
            logGroupId = logicalId + "LogGroup"
            resources[logGroupId] = {
                Type: "AWS::Logs::LogGroup",
                Properties: {
                    LogGroupName: "/ecs/" + component.id,
                    RetentionInDays: 30
                }
            }

            // ECS Service
            serviceId = logicalId + "Service"
            resources[serviceId] = {
                Type: "AWS::ECS::Service",
                DependsOn: [taskDefId],
                Properties: {
                    ServiceName: component.id,
                    Cluster: {"Ref": "ECSCluster"},
                    TaskDefinition: {"Ref": taskDefId},
                    DesiredCount: component.spec.replicas OR 1,
                    LaunchType: "FARGATE",
                    NetworkConfiguration: {
                        AwsvpcConfiguration: {
                            Subnets: {"Ref": "Subnets"},
                            SecurityGroups: [{"Ref": logicalId + "SecurityGroup"}]
                        }
                    }
                }
            }

        CASE "database":
            // RDS Instance
            dbId = logicalId + "Database"
            resources[dbId] = {
                Type: "AWS::RDS::DBInstance",
                DeletionPolicy: "Snapshot",
                Properties: {
                    DBInstanceIdentifier: component.id,
                    DBInstanceClass: mapToRDSInstanceClass(component.spec.size),
                    Engine: component.spec.engine,
                    EngineVersion: component.spec.version,
                    AllocatedStorage: component.spec.storage OR 20,
                    MasterUsername: {"Ref": logicalId + "MasterUsername"},
                    MasterUserPassword: {"Ref": logicalId + "MasterPassword"},
                    MultiAZ: component.spec.highAvailability OR false,
                    StorageEncrypted: true
                }
            }

        // Additional cases...
    END SWITCH

    // Add dependencies
    IF length(component.dependsOn) > 0 THEN
        FOR EACH resourceName, resource IN resources DO
            IF NOT hasProperty(resource, "DependsOn") THEN
                resource.DependsOn = []
            END IF
            FOR EACH dep IN component.dependsOn DO
                resource.DependsOn.append(toCFNLogicalId(dep))
            END FOR
        END FOR
    END IF

    RETURN resources
END

SUBROUTINE: toCFNLogicalId
INPUT: componentId (string)
OUTPUT: valid CloudFormation logical ID

BEGIN
    // CloudFormation logical IDs must be alphanumeric
    logicalId = componentId.replace(/[^a-zA-Z0-9]/g, "")

    // Capitalize first letter
    logicalId = logicalId.charAt(0).toUpperCase() + logicalId.slice(1)

    RETURN logicalId
END
```

### 3.5 IAM Policy Exporter

```
ALGORITHM: IAMPolicyExporter.transform
INPUT: normalizedIntent (ImmutableNormalizedIntent)
OUTPUT: array of IAM policy artifacts

BEGIN
    artifacts = []

    // Extract all IAM-related components
    iamComponents = filterByType(normalizedIntent.components, ["iam-role", "iam-policy", "service-account"])

    // Generate trust policies
    FOR EACH component IN iamComponents WHERE component.type == "iam-role" DO
        trustPolicy = generateTrustPolicy(component)
        artifacts.append({
            path: "policies/" + component.id + "-trust-policy.json",
            content: serializeJSON(sortDeterministically(trustPolicy), indent=2),
            contentType: "application/json"
        })
    END FOR

    // Generate permission policies
    FOR EACH component IN iamComponents DO
        permissionPolicies = generatePermissionPolicies(component)

        FOR EACH policy IN permissionPolicies DO
            artifacts.append({
                path: "policies/" + policy.name + ".json",
                content: serializeJSON(sortDeterministically(policy.document), indent=2),
                contentType: "application/json"
            })
        END FOR
    END FOR

    // Generate role definitions (Terraform format)
    roleDefinitions = generateRoleDefinitions(iamComponents)
    artifacts.append({
        path: "iam-roles.tf",
        content: roleDefinitions,
        contentType: "text/x-terraform"
    })

    RETURN artifacts
END

SUBROUTINE: generatePermissionPolicies
INPUT: component (object)
OUTPUT: array of policy objects

BEGIN
    policies = []

    // Extract permissions from component spec
    permissions = component.spec.permissions OR []

    // Group permissions by service for cleaner policies
    serviceGroups = groupByService(permissions)

    FOR EACH service, actions IN serviceGroups DO
        statements = []

        // Deterministic ordering of actions
        sortedActions = sortArray(actions)

        // Group by resource pattern
        resourceGroups = groupByResourcePattern(sortedActions)

        FOR EACH resourcePattern, actionList IN resourceGroups DO
            statement = {
                Sid: generateStatementId(service, resourcePattern),
                Effect: "Allow",
                Action: actionList.map(a => service + ":" + a),
                Resource: expandResourcePattern(resourcePattern, component)
            }

            // Add conditions if specified
            IF hasConditions(actionList) THEN
                statement.Condition = mergeConditions(actionList)
            END IF

            statements.append(statement)
        END FOR

        policy = {
            name: component.id + "-" + service + "-policy",
            document: {
                Version: "2012-10-17",
                Statement: statements
            }
        }

        policies.append(policy)
    END FOR

    RETURN policies
END

SUBROUTINE: generateTrustPolicy
INPUT: component (object)
OUTPUT: trust policy document

BEGIN
    principals = []

    // Extract trusted entities
    trustedEntities = component.spec.trustedEntities OR []

    FOR EACH entity IN trustedEntities DO
        SWITCH entity.type DO
            CASE "service":
                principals.append({
                    Service: entity.identifier
                })
            CASE "account":
                principals.append({
                    AWS: "arn:aws:iam::" + entity.accountId + ":root"
                })
            CASE "federated":
                principals.append({
                    Federated: entity.provider
                })
        END SWITCH
    END FOR

    trustPolicy = {
        Version: "2012-10-17",
        Statement: [{
            Sid: "TrustPolicy",
            Effect: "Allow",
            Principal: mergePrincipals(principals),
            Action: "sts:AssumeRole"
        }]
    }

    // Add conditions for web identity federation
    IF hasWebIdentityFederation(trustedEntities) THEN
        trustPolicy.Statement[0].Condition = generateOIDCConditions(trustedEntities)
    END IF

    RETURN trustPolicy
END
```

### 3.6 Database Schema Exporter

```
ALGORITHM: DatabaseSchemaExporter.transform
INPUT: normalizedIntent (ImmutableNormalizedIntent)
OUTPUT: array of database schema artifacts

BEGIN
    artifacts = []

    // Extract database components
    dbComponents = filterByType(normalizedIntent.components, ["database", "table", "index", "migration"])

    // Group by database
    databases = groupByDatabase(dbComponents)

    FOR EACH dbName, components IN databases DO
        dbType = inferDatabaseType(components)

        // Generate schema DDL
        ddlArtifacts = generateDDL(components, dbType)
        FOR EACH artifact IN ddlArtifacts DO
            artifacts.append({
                path: dbName + "/" + artifact.filename,
                content: artifact.content,
                contentType: artifact.contentType
            })
        END FOR

        // Generate migrations
        migrations = generateMigrations(components, dbType)
        FOR EACH migration IN migrations DO
            artifacts.append({
                path: dbName + "/migrations/" + migration.filename,
                content: migration.content,
                contentType: "text/x-sql"
            })
        END FOR

        // Generate seed data if present
        IF hasSeedData(components) THEN
            seedArtifacts = generateSeedData(components, dbType)
            FOR EACH artifact IN seedArtifacts DO
                artifacts.append({
                    path: dbName + "/seeds/" + artifact.filename,
                    content: artifact.content,
                    contentType: "text/x-sql"
                })
            END FOR
        END IF
    END FOR

    RETURN artifacts
END

SUBROUTINE: generateDDL
INPUT: components (array), dbType (string)
OUTPUT: array of DDL artifacts

BEGIN
    artifacts = []

    // Sort tables by dependency order
    tables = filterByType(components, ["table"])
    sortedTables = topologicalSortByForeignKeys(tables)

    ddl = StringBuilder()

    // Database-specific header
    SWITCH dbType DO
        CASE "postgresql":
            ddl.appendLine("-- PostgreSQL Schema")
            ddl.appendLine("-- Generated by Agentics Deployment Exporter")
            ddl.appendLine("")

        CASE "mysql":
            ddl.appendLine("-- MySQL Schema")
            ddl.appendLine("SET FOREIGN_KEY_CHECKS = 0;")
            ddl.appendLine("")
    END SWITCH

    // Generate CREATE TABLE statements
    FOR EACH table IN sortedTables DO
        ddl.appendLine(generateCreateTable(table, dbType))
        ddl.appendLine("")
    END FOR

    // Generate indexes
    indexes = filterByType(components, ["index"])
    FOR EACH index IN sortArray(indexes, "id") DO
        ddl.appendLine(generateCreateIndex(index, dbType))
    END FOR

    // Generate foreign key constraints
    FOR EACH table IN sortedTables DO
        constraints = extractForeignKeys(table)
        FOR EACH constraint IN constraints DO
            ddl.appendLine(generateAlterTableAddConstraint(table, constraint, dbType))
        END FOR
    END FOR

    artifacts.append({
        filename: "schema.sql",
        content: ddl.toString(),
        contentType: "text/x-sql"
    })

    RETURN artifacts
END

SUBROUTINE: generateCreateTable
INPUT: table (object), dbType (string)
OUTPUT: CREATE TABLE statement

BEGIN
    sql = StringBuilder()

    sql.appendLine("CREATE TABLE " + quoteIdentifier(table.id, dbType) + " (")

    columns = table.spec.columns
    columnDefs = []

    FOR EACH column IN columns DO
        colDef = "  " + quoteIdentifier(column.name, dbType)
        colDef = colDef + " " + mapDataType(column.type, dbType)

        IF column.nullable == false THEN
            colDef = colDef + " NOT NULL"
        END IF

        IF hasProperty(column, "default") THEN
            colDef = colDef + " DEFAULT " + formatDefaultValue(column.default, column.type, dbType)
        END IF

        IF column.primaryKey THEN
            colDef = colDef + " PRIMARY KEY"
        END IF

        IF column.unique THEN
            colDef = colDef + " UNIQUE"
        END IF

        columnDefs.append(colDef)
    END FOR

    sql.appendLine(join(columnDefs, ",\n"))
    sql.appendLine(");")

    // Add table comment if present
    IF hasProperty(table.spec, "description") THEN
        sql.appendLine(generateTableComment(table.id, table.spec.description, dbType))
    END IF

    RETURN sql.toString()
END

SUBROUTINE: generateMigrations
INPUT: components (array), dbType (string)
OUTPUT: array of migration artifacts

BEGIN
    migrations = []

    // Extract migration components or generate from schema
    migrationComponents = filterByType(components, ["migration"])

    IF length(migrationComponents) == 0 THEN
        // Generate initial migration from schema
        initialMigration = generateInitialMigration(components, dbType)
        migrations.append(initialMigration)
    ELSE
        // Use explicit migrations
        FOR EACH migration IN sortBy(migrationComponents, "spec.order") DO
            migrationArtifact = {
                filename: formatMigrationFilename(migration.spec.order, migration.id),
                content: generateMigrationContent(migration, dbType)
            }
            migrations.append(migrationArtifact)
        END FOR
    END IF

    RETURN migrations
END

SUBROUTINE: formatMigrationFilename
INPUT: order (number), name (string)
OUTPUT: migration filename

BEGIN
    // Deterministic timestamp-like prefix
    prefix = padLeft(toString(order), 4, "0")
    sanitizedName = name.replace(/[^a-z0-9]/gi, "_").toLowerCase()

    RETURN prefix + "_" + sanitizedName + ".sql"
END
```

---

## 4. Determinism Guarantees

### 4.1 Stable Key Ordering

```
ALGORITHM: EnsureStableKeyOrdering
INPUT: obj (any)
OUTPUT: object with deterministically ordered keys

INVARIANT:
    For any two executions with identical input,
    serializeJSON(EnsureStableKeyOrdering(input)) produces identical output

BEGIN
    IF isPrimitive(obj) THEN
        RETURN obj
    END IF

    IF isArray(obj) THEN
        // Arrays maintain original order, but recurse into elements
        RETURN obj.map(element => EnsureStableKeyOrdering(element))
    END IF

    IF isObject(obj) THEN
        // Get all keys and sort lexicographically
        keys = getOwnPropertyNames(obj)
        sortedKeys = keys.sort(LEXICOGRAPHIC_COMPARE)

        // Create new object with sorted key order
        result = createOrderedObject()

        FOR EACH key IN sortedKeys DO
            result[key] = EnsureStableKeyOrdering(obj[key])
        END FOR

        RETURN result
    END IF

    RETURN obj
END

FUNCTION: LEXICOGRAPHIC_COMPARE
INPUT: a (string), b (string)
OUTPUT: -1, 0, or 1

BEGIN
    // Byte-by-byte comparison for consistency across locales
    minLen = min(length(a), length(b))

    FOR i = 0 TO minLen - 1 DO
        charA = charCodeAt(a, i)
        charB = charCodeAt(b, i)

        IF charA < charB THEN
            RETURN -1
        ELSE IF charA > charB THEN
            RETURN 1
        END IF
    END FOR

    // Shorter string comes first
    IF length(a) < length(b) THEN
        RETURN -1
    ELSE IF length(a) > length(b) THEN
        RETURN 1
    END IF

    RETURN 0
END
```

### 4.2 Consistent Timestamp Handling

```
ALGORITHM: DeterministicTimestampHandling
DESCRIPTION: Ensures timestamps do not affect output determinism

PRINCIPLES:
    1. Timestamps are ONLY added to metadata, never to core transformations
    2. Checksums are computed BEFORE timestamps are added
    3. Timestamps use ISO 8601 format in UTC timezone

SUBROUTINE: addTimestampMetadata
INPUT: artifact (object)
OUTPUT: artifact with timestamp metadata

BEGIN
    // Clone to avoid mutation
    result = deepClone(artifact)

    // Add timestamp to dedicated metadata section
    IF NOT hasProperty(result, "_metadata") THEN
        result._metadata = {}
    END IF

    result._metadata.generatedAt = formatISO8601(getCurrentUTCTime())
    result._metadata.generatorVersion = GENERATOR_VERSION

    RETURN result
END

SUBROUTINE: computeContentChecksum
INPUT: artifact (object)
OUTPUT: checksum (string)

PRECONDITION: Checksum is computed on content WITHOUT metadata

BEGIN
    // Extract only content fields (exclude _metadata)
    contentOnly = {}

    FOR EACH key IN getOwnPropertyNames(artifact) DO
        IF key != "_metadata" AND NOT startsWith(key, "_") THEN
            contentOnly[key] = artifact[key]
        END IF
    END FOR

    // Serialize deterministically
    canonical = serializeCanonical(contentOnly)

    RETURN computeSHA256(canonical)
END
```

### 4.3 Reproducible Resource Naming

```
ALGORITHM: GenerateDeterministicResourceName
INPUT: component (object), context (object)
OUTPUT: resource name (string)

CONSTRAINTS:
    - Same input always produces same name
    - Names are unique within scope
    - Names comply with target platform constraints

BEGIN
    // Build naming input from stable fields
    namingInput = {
        intentId: context.intentId,
        componentId: component.id,
        componentType: component.type,
        schemaVersion: context.schemaVersion
    }

    // Generate hash-based suffix for uniqueness
    inputHash = computeSHA256(serializeCanonical(namingInput))
    shortHash = inputHash.substring(0, 8)

    // Base name from component ID
    baseName = sanitizeForPlatform(component.id, context.targetPlatform)

    // Combine with hash
    fullName = baseName + "-" + shortHash

    // Ensure length constraints
    maxLength = getMaxNameLength(context.targetPlatform)
    IF length(fullName) > maxLength THEN
        // Truncate base name, keep full hash
        truncatedBase = baseName.substring(0, maxLength - 9)
        fullName = truncatedBase + "-" + shortHash
    END IF

    RETURN fullName
END

SUBROUTINE: sanitizeForPlatform
INPUT: name (string), platform (string)
OUTPUT: sanitized name (string)

BEGIN
    SWITCH platform DO
        CASE "kubernetes":
            // Must be lowercase, alphanumeric, hyphens
            // Must start/end with alphanumeric
            // Max 63 characters
            sanitized = name.toLowerCase()
            sanitized = sanitized.replace(/[^a-z0-9-]/g, "-")
            sanitized = sanitized.replace(/^-+|-+$/g, "")
            sanitized = sanitized.replace(/-+/g, "-")
            RETURN sanitized.substring(0, 63)

        CASE "terraform":
            // Must start with letter, alphanumeric + underscore
            sanitized = name.replace(/[^a-zA-Z0-9_]/g, "_")
            IF NOT matchesPattern(sanitized, "^[a-zA-Z]") THEN
                sanitized = "r_" + sanitized
            END IF
            RETURN sanitized

        CASE "cloudformation":
            // Alphanumeric only
            sanitized = name.replace(/[^a-zA-Z0-9]/g, "")
            RETURN sanitized

        DEFAULT:
            RETURN name.replace(/[^a-zA-Z0-9-_]/g, "-")
    END SWITCH
END
```

---

## 5. Error Handling Flows

### 5.1 Validation Failures (Fail-Fast)

```
ALGORITHM: FailFastValidation
INPUT: intent (object)
OUTPUT: ValidationResult or throws ValidationError

PRINCIPLE: Stop at first critical error to provide clear feedback

BEGIN
    // Phase 1: Schema validation (critical - fail fast)
    schemaResult = validateSchema(intent)
    IF NOT schemaResult.valid THEN
        THROW ValidationError(
            phase: "SCHEMA",
            severity: "CRITICAL",
            errors: schemaResult.errors,
            message: "Intent does not conform to schema"
        )
    END IF

    // Phase 2: Structural validation (critical - fail fast)
    structuralResult = validateStructure(intent)
    IF NOT structuralResult.valid THEN
        THROW ValidationError(
            phase: "STRUCTURE",
            severity: "CRITICAL",
            errors: structuralResult.errors,
            message: "Intent has structural integrity issues"
        )
    END IF

    // Phase 3: Semantic validation (collect all errors)
    semanticErrors = []
    semanticWarnings = []

    FOR EACH component IN intent.components DO
        componentResult = validateComponentSemantics(component)
        semanticErrors.appendAll(componentResult.errors)
        semanticWarnings.appendAll(componentResult.warnings)
    END FOR

    IF length(semanticErrors) > 0 THEN
        THROW ValidationError(
            phase: "SEMANTIC",
            severity: "ERROR",
            errors: semanticErrors,
            warnings: semanticWarnings,
            message: "Intent has semantic validation errors"
        )
    END IF

    RETURN ValidationResult(
        valid: true,
        warnings: semanticWarnings,
        intent: intent
    )
END

CLASS: ValidationError extends Error
    phase: string        // SCHEMA, STRUCTURE, SEMANTIC
    severity: string     // CRITICAL, ERROR, WARNING
    errors: array        // List of specific errors
    warnings: array      // List of warnings

    CONSTRUCTOR(params):
        super(params.message)
        this.phase = params.phase
        this.severity = params.severity
        this.errors = params.errors OR []
        this.warnings = params.warnings OR []

        // Include error chain for debugging
        this.errorChain = this.errors.map(e => ({
            code: e.code,
            field: e.field,
            message: e.message,
            value: e.value
        }))
END CLASS
```

### 5.2 Transformation Errors (Atomic Rollback)

```
ALGORITHM: AtomicTransformation
INPUT: normalizedIntent, targetFormats
OUTPUT: ExportManifest or rolls back and throws TransformError

BEGIN
    // Initialize transaction context
    transaction = createTransactionContext()

    TRY
        results = {}

        FOR EACH format IN targetFormats DO
            // Create savepoint for this format
            savepoint = transaction.createSavepoint(format)

            TRY
                exporter = getExporter(format)

                // Transform with transaction tracking
                artifacts = exporter.transform(normalizedIntent)

                // Validate before committing
                validationResult = exporter.validate(artifacts)
                IF NOT validationResult.valid THEN
                    THROW TransformValidationError(
                        format: format,
                        errors: validationResult.errors
                    )
                END IF

                // Record successful transform
                transaction.recordSuccess(format, artifacts)
                results[format] = artifacts

            CATCH TransformError AS error
                // Rollback to savepoint
                transaction.rollbackTo(savepoint)

                // Record failure but continue with other formats
                transaction.recordFailure(format, error)
            END TRY
        END FOR

        // Check if any transforms succeeded
        IF length(results) == 0 THEN
            // All failed - full rollback
            transaction.rollbackAll()
            THROW AllTransformsFailedError(
                failures: transaction.getFailures()
            )
        END IF

        // Commit successful transforms
        transaction.commit()

        RETURN ExportManifest(
            results: results,
            failures: transaction.getFailures()
        )

    CATCH Error AS error
        // Unexpected error - full rollback
        transaction.rollbackAll()
        THROW TransformError(
            message: "Unexpected error during transformation",
            cause: error,
            transactionState: transaction.getState()
        )
    END TRY
END

CLASS: TransactionContext
    savepoints: Map<string, Savepoint>
    successes: Map<string, artifacts>
    failures: Map<string, Error>
    state: "ACTIVE" | "COMMITTED" | "ROLLED_BACK"

    createSavepoint(name):
        savepoint = {
            name: name,
            timestamp: getCurrentTimestamp(),
            stateSnapshot: captureCurrentState()
        }
        this.savepoints.set(name, savepoint)
        RETURN savepoint

    rollbackTo(savepoint):
        restoreState(savepoint.stateSnapshot)
        // Remove savepoints after this one
        this.savepoints = filterSavepointsBefore(savepoint)

    rollbackAll():
        IF this.state == "ACTIVE" THEN
            // Clear all artifacts created during transaction
            clearTemporaryArtifacts()
            this.state = "ROLLED_BACK"
        END IF

    commit():
        IF this.state == "ACTIVE" THEN
            // Finalize all artifacts
            finalizeArtifacts(this.successes)
            this.state = "COMMITTED"
        END IF
END CLASS
```

### 5.3 Output Verification Failures

```
ALGORITHM: VerifyOutput
INPUT: exportManifest (ExportManifest)
OUTPUT: VerificationResult

BEGIN
    verificationErrors = []
    verificationWarnings = []

    FOR EACH format, exportResult IN exportManifest.exports DO
        // Verify artifact integrity
        FOR EACH artifact IN exportResult.artifacts DO
            integrityResult = verifyArtifactIntegrity(artifact)

            IF NOT integrityResult.valid THEN
                verificationErrors.append({
                    format: format,
                    artifact: artifact.path,
                    error: "INTEGRITY_FAILURE",
                    details: integrityResult.errors
                })
            END IF
        END FOR

        // Verify format-specific constraints
        formatResult = verifyFormatConstraints(format, exportResult)
        verificationErrors.appendAll(formatResult.errors)
        verificationWarnings.appendAll(formatResult.warnings)

        // Verify completeness
        completenessResult = verifyCompleteness(format, exportResult, exportManifest.sourceIntent)
        IF NOT completenessResult.complete THEN
            verificationWarnings.append({
                format: format,
                warning: "INCOMPLETE_EXPORT",
                missingComponents: completenessResult.missing
            })
        END IF
    END FOR

    IF length(verificationErrors) > 0 THEN
        RETURN VerificationResult(
            valid: false,
            errors: verificationErrors,
            warnings: verificationWarnings,
            recommendation: "Regenerate artifacts after fixing source intent"
        )
    END IF

    RETURN VerificationResult(
        valid: true,
        errors: [],
        warnings: verificationWarnings
    )
END

SUBROUTINE: verifyArtifactIntegrity
INPUT: artifact (object)
OUTPUT: IntegrityResult

BEGIN
    errors = []

    // Verify signature if present
    IF hasProperty(artifact, "_signature") THEN
        signature = artifact._signature

        // Recompute content hash
        computedHash = computeSHA256(artifact.content)

        IF computedHash != signature.contentHash THEN
            errors.append({
                code: "HASH_MISMATCH",
                expected: signature.contentHash,
                actual: computedHash
            })
        END IF

        // Verify signature timestamp is reasonable
        signedAt = parseTimestamp(signature.signedAt)
        IF signedAt > getCurrentTimestamp() THEN
            errors.append({
                code: "FUTURE_TIMESTAMP",
                signedAt: signature.signedAt
            })
        END IF
    END IF

    // Verify content is valid for content type
    contentValidation = validateContentType(artifact.content, artifact.contentType)
    IF NOT contentValidation.valid THEN
        errors.append({
            code: "INVALID_CONTENT",
            contentType: artifact.contentType,
            details: contentValidation.errors
        })
    END IF

    RETURN IntegrityResult(
        valid: length(errors) == 0,
        errors: errors
    )
END
```

---

## 6. Verification Algorithms

### 6.1 Checksum Computation

```
ALGORITHM: ComputeChecksum
INPUT: data (any), algorithm (string)
OUTPUT: checksum (string)

SUPPORTED_ALGORITHMS = ["SHA-256", "SHA-384", "SHA-512"]

BEGIN
    IF algorithm NOT IN SUPPORTED_ALGORITHMS THEN
        THROW UnsupportedAlgorithmError(algorithm)
    END IF

    // Normalize data to canonical form
    canonicalData = toCanonicalForm(data)

    // Serialize to bytes
    bytes = encodeUTF8(canonicalData)

    // Compute hash
    hash = createHash(algorithm)
    hash.update(bytes)

    // Return hex-encoded digest
    RETURN hash.digest("hex")
END

SUBROUTINE: toCanonicalForm
INPUT: data (any)
OUTPUT: canonical string representation

BEGIN
    IF data IS NULL THEN
        RETURN "null"
    END IF

    IF isBoolean(data) THEN
        RETURN data ? "true" : "false"
    END IF

    IF isNumber(data) THEN
        // Use consistent number formatting
        IF isInteger(data) THEN
            RETURN toString(data)
        ELSE
            // Limit precision to avoid floating point issues
            RETURN toFixed(data, 15).replace(/\.?0+$/, "")
        END IF
    END IF

    IF isString(data) THEN
        // Escape special characters consistently
        RETURN escapeString(data)
    END IF

    IF isArray(data) THEN
        elements = data.map(e => toCanonicalForm(e))
        RETURN "[" + join(elements, ",") + "]"
    END IF

    IF isObject(data) THEN
        // Sort keys for determinism
        keys = sortArray(getOwnPropertyNames(data))
        pairs = keys.map(k => escapeString(k) + ":" + toCanonicalForm(data[k]))
        RETURN "{" + join(pairs, ",") + "}"
    END IF

    THROW UnsupportedTypeError(typeof(data))
END
```

### 6.2 Signature Verification

```
ALGORITHM: VerifySignature
INPUT: artifact (SignedArtifact), publicKey (optional)
OUTPUT: SignatureVerificationResult

BEGIN
    signature = artifact._signature

    IF signature IS NULL OR signature IS UNDEFINED THEN
        RETURN SignatureVerificationResult(
            valid: false,
            error: "NO_SIGNATURE",
            message: "Artifact is not signed"
        )
    END IF

    // Verify required signature fields
    requiredFields = ["algorithm", "contentHash", "sourceIntentId", "signedAt"]
    FOR EACH field IN requiredFields DO
        IF NOT hasProperty(signature, field) THEN
            RETURN SignatureVerificationResult(
                valid: false,
                error: "MISSING_FIELD",
                field: field
            )
        END IF
    END FOR

    // Verify content hash
    computedHash = computeChecksum(artifact.content, signature.algorithm)
    IF computedHash != signature.contentHash THEN
        RETURN SignatureVerificationResult(
            valid: false,
            error: "HASH_MISMATCH",
            expected: signature.contentHash,
            actual: computedHash
        )
    END IF

    // Verify timestamp format and reasonableness
    signedAt = parseISO8601(signature.signedAt)
    IF signedAt IS INVALID THEN
        RETURN SignatureVerificationResult(
            valid: false,
            error: "INVALID_TIMESTAMP",
            value: signature.signedAt
        )
    END IF

    now = getCurrentUTCTime()
    IF signedAt > now THEN
        RETURN SignatureVerificationResult(
            valid: false,
            error: "FUTURE_SIGNATURE",
            signedAt: signature.signedAt
        )
    END IF

    // Verify cryptographic signature if public key provided
    IF publicKey IS NOT NULL THEN
        signatureBytes = decodeBase64(signature.cryptographicSignature)
        dataToVerify = signature.contentHash + signature.signedAt

        isValidCrypto = verifyCryptoSignature(dataToVerify, signatureBytes, publicKey)
        IF NOT isValidCrypto THEN
            RETURN SignatureVerificationResult(
                valid: false,
                error: "CRYPTO_SIGNATURE_INVALID"
            )
        END IF
    END IF

    RETURN SignatureVerificationResult(
        valid: true,
        algorithm: signature.algorithm,
        signedAt: signedAt,
        sourceIntentId: signature.sourceIntentId
    )
END
```

### 6.3 Round-Trip Validation

```
ALGORITHM: RoundTripValidation
DESCRIPTION: Validates that transformation is deterministic by checking
             that re-transformation produces identical output

INPUT: normalizedIntent (ImmutableNormalizedIntent), format (string)
OUTPUT: RoundTripValidationResult

BEGIN
    exporter = getExporter(format)

    // First transformation
    artifacts1 = exporter.transform(normalizedIntent)
    checksum1 = computePackageChecksum(artifacts1)

    // Second transformation (should be identical)
    artifacts2 = exporter.transform(normalizedIntent)
    checksum2 = computePackageChecksum(artifacts2)

    // Compare checksums
    IF checksum1 != checksum2 THEN
        // Find specific differences
        differences = findArtifactDifferences(artifacts1, artifacts2)

        RETURN RoundTripValidationResult(
            valid: false,
            error: "NON_DETERMINISTIC_TRANSFORM",
            checksum1: checksum1,
            checksum2: checksum2,
            differences: differences
        )
    END IF

    // Verify individual artifact consistency
    FOR i = 0 TO length(artifacts1) - 1 DO
        a1 = artifacts1[i]
        a2 = artifacts2[i]

        IF a1.path != a2.path THEN
            RETURN RoundTripValidationResult(
                valid: false,
                error: "PATH_MISMATCH",
                index: i,
                path1: a1.path,
                path2: a2.path
            )
        END IF

        IF a1.content != a2.content THEN
            diff = computeContentDiff(a1.content, a2.content)
            RETURN RoundTripValidationResult(
                valid: false,
                error: "CONTENT_MISMATCH",
                path: a1.path,
                diff: diff
            )
        END IF
    END FOR

    RETURN RoundTripValidationResult(
        valid: true,
        checksum: checksum1,
        artifactCount: length(artifacts1)
    )
END

SUBROUTINE: computePackageChecksum
INPUT: artifacts (array)
OUTPUT: checksum (string)

BEGIN
    // Sort artifacts by path for deterministic ordering
    sortedArtifacts = sortBy(artifacts, "path")

    // Create composite checksum
    checksumInput = sortedArtifacts.map(a => ({
        path: a.path,
        contentHash: computeSHA256(a.content)
    }))

    RETURN computeSHA256(serializeCanonical(checksumInput))
END

SUBROUTINE: findArtifactDifferences
INPUT: artifacts1 (array), artifacts2 (array)
OUTPUT: array of differences

BEGIN
    differences = []

    paths1 = SET(artifacts1.map(a => a.path))
    paths2 = SET(artifacts2.map(a => a.path))

    // Files only in first set
    FOR EACH path IN paths1 DO
        IF path NOT IN paths2 THEN
            differences.append({
                type: "MISSING_IN_SECOND",
                path: path
            })
        END IF
    END FOR

    // Files only in second set
    FOR EACH path IN paths2 DO
        IF path NOT IN paths1 THEN
            differences.append({
                type: "MISSING_IN_FIRST",
                path: path
            })
        END IF
    END FOR

    // Compare content of matching files
    FOR EACH path IN paths1 INTERSECT paths2 DO
        a1 = findByPath(artifacts1, path)
        a2 = findByPath(artifacts2, path)

        IF a1.content != a2.content THEN
            differences.append({
                type: "CONTENT_DIFFERS",
                path: path,
                hash1: computeSHA256(a1.content),
                hash2: computeSHA256(a2.content)
            })
        END IF
    END FOR

    RETURN differences
END
```

---

## 7. Utility Functions

### 7.1 Serialization

```
SUBROUTINE: serializeCanonical
INPUT: obj (any)
OUTPUT: canonical JSON string

DESCRIPTION: Produces deterministic JSON serialization

BEGIN
    // Use custom replacer to ensure consistent ordering
    RETURN JSON.stringify(
        sortDeterministically(obj),
        canonicalReplacer,
        0  // No indentation for canonical form
    )
END

FUNCTION: canonicalReplacer
INPUT: key (string), value (any)
OUTPUT: transformed value

BEGIN
    // Handle special types
    IF value IS Date THEN
        RETURN formatISO8601(value)
    END IF

    IF value IS BigInt THEN
        RETURN toString(value)
    END IF

    IF value IS undefined THEN
        RETURN null  // Normalize undefined to null
    END IF

    // Handle NaN and Infinity
    IF isNumber(value) AND (isNaN(value) OR NOT isFinite(value)) THEN
        RETURN null
    END IF

    RETURN value
END
```

### 7.2 Hashing

```
SUBROUTINE: computeSHA256
INPUT: data (string or bytes)
OUTPUT: hex string

BEGIN
    hash = createHash("SHA-256")

    IF isString(data) THEN
        hash.update(encodeUTF8(data))
    ELSE
        hash.update(data)
    END IF

    RETURN hash.digest("hex")
END

SUBROUTINE: computeHMAC
INPUT: data (string), key (string), algorithm (string)
OUTPUT: hex string

BEGIN
    hmac = createHMAC(algorithm, key)
    hmac.update(encodeUTF8(data))
    RETURN hmac.digest("hex")
END
```

### 7.3 Schema Validation

```
SUBROUTINE: validateAgainstSchema
INPUT: data (object), schema (JSONSchema)
OUTPUT: SchemaValidationResult

BEGIN
    errors = []

    // Type validation
    IF hasProperty(schema, "type") THEN
        IF NOT matchesType(data, schema.type) THEN
            errors.append({
                code: "TYPE_MISMATCH",
                expected: schema.type,
                actual: typeof(data)
            })
            RETURN SchemaValidationResult(valid: false, errors: errors)
        END IF
    END IF

    // Required properties
    IF hasProperty(schema, "required") THEN
        FOR EACH field IN schema.required DO
            IF NOT hasProperty(data, field) THEN
                errors.append({
                    code: "MISSING_REQUIRED",
                    field: field
                })
            END IF
        END FOR
    END IF

    // Property validation
    IF hasProperty(schema, "properties") THEN
        FOR EACH propName, propSchema IN schema.properties DO
            IF hasProperty(data, propName) THEN
                propResult = validateAgainstSchema(data[propName], propSchema)
                IF NOT propResult.valid THEN
                    FOR EACH error IN propResult.errors DO
                        errors.append({
                            ...error,
                            path: propName + (error.path ? "." + error.path : "")
                        })
                    END FOR
                END IF
            END IF
        END FOR
    END IF

    // Pattern validation for strings
    IF schema.type == "string" AND hasProperty(schema, "pattern") THEN
        IF NOT matchesPattern(data, schema.pattern) THEN
            errors.append({
                code: "PATTERN_MISMATCH",
                pattern: schema.pattern,
                value: data
            })
        END IF
    END IF

    // Enum validation
    IF hasProperty(schema, "enum") THEN
        IF data NOT IN schema.enum THEN
            errors.append({
                code: "ENUM_MISMATCH",
                allowed: schema.enum,
                value: data
            })
        END IF
    END IF

    RETURN SchemaValidationResult(
        valid: length(errors) == 0,
        errors: errors
    )
END
```

---

## 8. Complexity Analysis Summary

| Algorithm | Time Complexity | Space Complexity |
|-----------|-----------------|------------------|
| IngestDeploymentIntent | O(n) | O(n) |
| ValidateIntent | O(n * m) | O(n) |
| NormalizeIntent | O(n log n) | O(n) |
| ExportToTargets | O(n * k) | O(n * k) |
| TerraformExporter.transform | O(n) | O(n) |
| KubernetesExporter.transform | O(n log n) | O(n) |
| TopologicalSort | O(V + E) | O(V) |
| ComputeChecksum | O(n) | O(1) |
| RoundTripValidation | O(2 * T(n)) | O(n) |

Where:
- n = number of components in intent
- m = average component size
- k = number of target formats
- V = vertices (components)
- E = edges (dependencies)
- T(n) = time complexity of single transformation

---

## 9. References

- JSON Canonical Form: RFC 8785
- SHA-256: FIPS 180-4
- ISO 8601: Date and time format
- Terraform HCL: HashiCorp Configuration Language
- Kubernetes API: kubernetes.io/docs/reference
- CloudFormation: AWS Template Reference
- Helm Charts: helm.sh/docs/chart_template_guide
