/**
 * Type Definitions for Packaging Module
 *
 * This module defines all types used by the packaging components including
 * checksum, signing, manifest, and archive creation.
 *
 * @module packaging/types
 * @version 1.0.0
 */

import type {
  ExportArtifact,
  NormalizedIntent,
  SemanticVersion,
  SigningAlgorithm,
} from '../core/types.js';

// =============================================================================
// CHECKSUM TYPES
// =============================================================================

/**
 * Supported checksum algorithms.
 */
export const ChecksumAlgorithmValues = ['sha256', 'sha512', 'blake3'] as const;

export type ChecksumAlgorithm = (typeof ChecksumAlgorithmValues)[number];

/**
 * Checksum result with algorithm metadata.
 */
export interface ChecksumResult {
  /** Hex-encoded checksum value */
  readonly value: string;
  /** Algorithm used to generate checksum */
  readonly algorithm: ChecksumAlgorithm;
  /** Prefixed format (e.g., "sha256:abc123...") */
  readonly prefixed: string;
}

/**
 * Individual file checksum entry.
 */
export interface FileChecksum {
  /** Relative path to the file */
  readonly path: string;
  /** Checksum result */
  readonly checksum: ChecksumResult;
  /** File size in bytes */
  readonly size: number;
}

/**
 * Manifest containing all file checksums.
 */
export interface ChecksumManifest {
  /** Checksum algorithm used */
  readonly algorithm: ChecksumAlgorithm;
  /** Individual file checksums */
  readonly files: readonly FileChecksum[];
  /** Aggregate checksum of all files */
  readonly aggregateChecksum: ChecksumResult;
  /** Timestamp when checksums were generated */
  readonly generatedAt: string;
}

// =============================================================================
// SIGNING TYPES
// =============================================================================

/**
 * Key pair for signing operations.
 */
export interface SigningKeyPair {
  /** Base64-encoded private key */
  readonly privateKey: string;
  /** Base64-encoded public key */
  readonly publicKey: string;
  /** Key identifier */
  readonly keyId: string;
  /** Algorithm this key pair uses */
  readonly algorithm: SigningAlgorithm;
  /** When the key was generated */
  readonly createdAt: string;
}

/**
 * Options for signing operations.
 */
export interface SignOptions {
  /** Key identifier to use */
  readonly keyId?: string;
  /** Include timestamp in signature */
  readonly timestamp?: boolean;
  /** Additional metadata to include in signature */
  readonly metadata?: Readonly<Record<string, string>>;
}

/**
 * Result of a signing operation.
 */
export interface SignatureResult {
  /** Base64-encoded signature */
  readonly signature: string;
  /** Algorithm used */
  readonly algorithm: SigningAlgorithm;
  /** Key identifier used */
  readonly keyId: string;
  /** Timestamp when signed (if requested) */
  readonly timestamp?: string;
  /** Base64-encoded public key for verification */
  readonly publicKey?: string;
}

/**
 * Options for signature verification.
 */
export interface VerifyOptions {
  /** Expected key identifier */
  readonly expectedKeyId?: string;
  /** Public key to use for verification */
  readonly publicKey?: string;
  /** Allow expired signatures */
  readonly allowExpired?: boolean;
}

/**
 * Result of signature verification.
 */
export interface VerificationResult {
  /** Whether the signature is valid */
  readonly valid: boolean;
  /** Key identifier that was used */
  readonly keyId?: string;
  /** Timestamp from the signature */
  readonly timestamp?: string;
  /** Error message if verification failed */
  readonly error?: string;
}

/**
 * Signer configuration.
 */
export interface SignerConfig {
  /** Signing algorithm to use */
  readonly algorithm: SigningAlgorithm;
  /** Key pair for signing (optional - will generate if not provided) */
  readonly keyPair?: SigningKeyPair;
  /** Private key in PEM or raw format */
  readonly privateKey?: string | Buffer;
  /** Key identifier */
  readonly keyId?: string;
}

// =============================================================================
// PACKAGE TYPES
// =============================================================================

/**
 * Package build options.
 */
export interface PackageOptions {
  /** Archive format to use */
  readonly format?: 'tar.gz' | 'zip';
  /** Whether to sign the package */
  readonly sign?: boolean;
  /** Signing options (if sign is true) */
  readonly signOptions?: SignOptions;
  /** Checksum algorithm to use */
  readonly checksumAlgorithm?: ChecksumAlgorithm;
  /** Include lineage tracking */
  readonly includeLineage?: boolean;
  /** Compression level (1-9) */
  readonly compressionLevel?: number;
}

/**
 * Individual artifact entry in the package.
 */
export interface PackageArtifactEntry {
  /** Relative path in the package */
  readonly path: string;
  /** Exporter that produced this artifact */
  readonly exporter: string;
  /** Serialization format */
  readonly format: string;
  /** Checksum of the artifact content */
  readonly checksum: string;
  /** Size in bytes */
  readonly size: number;
}

/**
 * Intent reference in the manifest.
 */
export interface IntentReference {
  /** Intent name */
  readonly name: string;
  /** Intent version */
  readonly version: SemanticVersion;
  /** Content hash of the intent */
  readonly hash: string;
}

/**
 * Exporter information in the manifest.
 */
export interface ExporterInfo {
  /** Exporter version */
  readonly version: SemanticVersion;
  /** Checksum of the exporter */
  readonly checksum?: string;
}

/**
 * Package manifest following the SPARC architecture specification.
 */
export interface PackageManifest {
  /** Manifest schema version */
  readonly version: SemanticVersion;
  /** When the package was generated */
  readonly generated: string;
  /** Generator identification */
  readonly generator: string;
  /** Source intent reference */
  readonly intent: IntentReference;
  /** Included artifacts */
  readonly artifacts: readonly PackageArtifactEntry[];
  /** Exporters used */
  readonly exporters: Readonly<Record<string, ExporterInfo>>;
  /** Package signature (if signed) */
  readonly signature?: string;
  /** Lineage manifest (if included) */
  readonly lineage?: LineageManifest;
}

/**
 * Complete artifact package.
 */
export interface ArtifactPackage {
  /** Package content as buffer */
  readonly content: Buffer;
  /** Package checksum */
  readonly checksum: ChecksumResult;
  /** Package manifest */
  readonly manifest: PackageManifest;
  /** Package format */
  readonly format: 'tar.gz' | 'zip';
}

// =============================================================================
// LINEAGE TYPES
// =============================================================================

/**
 * Single step in the transformation lineage.
 */
export interface LineageStep {
  /** Step identifier */
  readonly id: string;
  /** Step type (parse, validate, normalize, transform, serialize) */
  readonly type: string;
  /** Input hash */
  readonly inputHash: string;
  /** Output hash */
  readonly outputHash: string;
  /** Component that performed this step */
  readonly component: string;
  /** Component version */
  readonly componentVersion: SemanticVersion;
  /** Timestamp of the step */
  readonly timestamp: string;
}

/**
 * Complete lineage record for a single artifact.
 */
export interface LineageRecord {
  /** Artifact path */
  readonly artifactPath: string;
  /** Source intent hash */
  readonly sourceIntentHash: string;
  /** Transformation chain */
  readonly chain: readonly LineageStep[];
  /** Final artifact hash */
  readonly artifactHash: string;
}

/**
 * Complete lineage manifest for a package.
 */
export interface LineageManifest {
  /** Manifest version */
  readonly version: SemanticVersion;
  /** When the lineage was generated */
  readonly generatedAt: string;
  /** Source intent reference */
  readonly sourceIntent: IntentReference;
  /** Individual artifact lineage records */
  readonly records: readonly LineageRecord[];
  /** Aggregate lineage hash */
  readonly aggregateHash: string;
}

// =============================================================================
// ARCHIVE TYPES
// =============================================================================

/**
 * Entry to include in an archive.
 */
export interface ArchiveEntry {
  /** Path within the archive */
  readonly path: string;
  /** File content */
  readonly content: Buffer | string;
  /** File mode (permissions) */
  readonly mode?: number;
  /** Modification time */
  readonly mtime?: Date;
}

/**
 * Options for archive creation.
 */
export interface ArchiveOptions {
  /** Compression level (1-9, where 9 is maximum compression) */
  readonly compressionLevel?: number;
  /** Base directory prefix in archive */
  readonly baseDir?: string;
  /** Include empty directories */
  readonly includeEmptyDirs?: boolean;
}

// =============================================================================
// BUILDER TYPES
// =============================================================================

/**
 * Package builder state.
 */
export interface BuilderState {
  /** Artifacts added to the builder */
  readonly artifacts: readonly ExportArtifact[];
  /** Manifest if set */
  readonly manifest?: PackageManifest;
  /** Options for the build */
  readonly options: PackageOptions;
  /** Whether the builder has been finalized */
  readonly finalized: boolean;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for ChecksumAlgorithm.
 */
export function isChecksumAlgorithm(value: unknown): value is ChecksumAlgorithm {
  return (
    typeof value === 'string' &&
    ChecksumAlgorithmValues.includes(value as ChecksumAlgorithm)
  );
}

/**
 * Type guard for PackageManifest.
 */
export function isPackageManifest(value: unknown): value is PackageManifest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.version === 'string' &&
    typeof obj.generated === 'string' &&
    typeof obj.generator === 'string' &&
    typeof obj.intent === 'object' &&
    Array.isArray(obj.artifacts) &&
    typeof obj.exporters === 'object'
  );
}

/**
 * Type guard for LineageRecord.
 */
export function isLineageRecord(value: unknown): value is LineageRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.artifactPath === 'string' &&
    typeof obj.sourceIntentHash === 'string' &&
    Array.isArray(obj.chain) &&
    typeof obj.artifactHash === 'string'
  );
}
