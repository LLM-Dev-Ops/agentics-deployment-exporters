/**
 * Packaging Module for Agentics Deployment Exporters
 *
 * This module provides complete artifact packaging capabilities including:
 * - Checksum generation (SHA-256, SHA-512, BLAKE3)
 * - Cryptographic signing (Ed25519, RSA-PSS, ECDSA)
 * - Archive creation (tar.gz, zip)
 * - Manifest generation
 * - Lineage tracking
 *
 * All operations are designed for deterministic, reproducible output.
 *
 * @module packaging
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * import {
 *   PackageBuilder,
 *   ArtifactSigner,
 *   ChecksumGenerator,
 *   ManifestGenerator,
 *   LineageTracker,
 * } from './packaging';
 *
 * // Build a complete package
 * const builder = new PackageBuilder({ format: 'tar.gz', sign: true });
 * builder.addArtifacts(artifacts);
 *
 * const pkg = await builder.build({
 *   intent: { name: 'my-deployment', version: '1.0.0', hash: 'sha256:...' },
 *   exporters: { TerraformExporter: { version: '1.0.0' } },
 * });
 *
 * // Verify package integrity
 * const verifier = new SignatureVerifier();
 * const result = await verifier.verifyPackage(pkg);
 * ```
 */
export { ChecksumAlgorithmValues, isChecksumAlgorithm, isPackageManifest, isLineageRecord, } from './types.js';
// =============================================================================
// CHECKSUM MODULE
// =============================================================================
export { ChecksumGenerator, createChecksumGenerator, createSHA512Generator, createBLAKE3Generator, generateChecksum, verifyChecksum, } from './checksum/index.js';
// =============================================================================
// SIGNER MODULE
// =============================================================================
export { ArtifactSigner, createEd25519Signer, createRSAPSSSigner, createECDSAP256Signer, createECDSAP384Signer, createSignerFromKeyPair, } from './signer/index.js';
export { SignatureVerifier, createSignatureVerifier, createSignatureVerifierWithKeys, } from './signer/index.js';
// =============================================================================
// BUILDER MODULE
// =============================================================================
export { PackageBuilder, createPackageBuilder, createTarGzPackageBuilder, createZipPackageBuilder, createSignedPackageBuilder, buildPackage, } from './builder/index.js';
export { ArchiveCreator, createArchiveCreator, createMaxCompressionArchiveCreator, createFastArchiveCreator, } from './builder/index.js';
// =============================================================================
// MANIFEST MODULE
// =============================================================================
export { ManifestGenerator, createManifestGenerator, generateManifest, parseManifest, } from './manifest/index.js';
export { LineageTracker, LineageRecordBuilder, createLineageTracker, createLineageRecordBuilder, trackLineage, LineageStepTypes, } from './manifest/index.js';
//# sourceMappingURL=index.js.map