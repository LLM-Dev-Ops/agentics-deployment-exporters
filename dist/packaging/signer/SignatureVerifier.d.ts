/**
 * Signature Verifier for Package Verification
 *
 * Verifies signatures on artifacts and packages to ensure integrity
 * and authenticity. Supports all algorithms used by ArtifactSigner.
 *
 * Key features:
 * - Multi-algorithm signature verification
 * - Package-level verification
 * - Public key management
 * - Detailed verification results
 *
 * @module packaging/signer/SignatureVerifier
 * @version 1.0.0
 */
import type { ExportArtifact, SigningAlgorithm } from '../../core/types.js';
import type { ArtifactPackage, VerificationResult, VerifyOptions } from '../types.js';
/**
 * Verification result with detailed information.
 */
export interface PackageVerificationResult {
    /** Overall verification status */
    readonly valid: boolean;
    /** Manifest signature verification */
    readonly manifestSignature: VerificationResult;
    /** Individual artifact verifications */
    readonly artifacts: readonly ArtifactVerificationResult[];
    /** Aggregate checksum verification */
    readonly checksumValid: boolean;
    /** Any errors encountered */
    readonly errors: readonly string[];
}
/**
 * Single artifact verification result.
 */
export interface ArtifactVerificationResult {
    /** Artifact path */
    readonly path: string;
    /** Checksum verification status */
    readonly checksumValid: boolean;
    /** Expected checksum */
    readonly expectedChecksum: string;
    /** Actual checksum */
    readonly actualChecksum: string;
}
/**
 * Verifies signatures on artifacts and packages.
 *
 * The verifier can be used standalone or with public keys from
 * the original signer. It supports all algorithms used by ArtifactSigner.
 *
 * @example
 * ```typescript
 * const verifier = new SignatureVerifier();
 *
 * // Verify a signature
 * const result = await verifier.verifySignature(
 *   artifact,
 *   signature,
 *   { publicKey: signerPublicKey }
 * );
 *
 * // Verify entire package
 * const packageResult = await verifier.verifyPackage(pkg);
 * ```
 */
export declare class SignatureVerifier {
    private readonly trustedKeys;
    private readonly checksumGenerator;
    /**
     * Create a new SignatureVerifier.
     *
     * @param trustedKeys - Map of key IDs to public keys (optional)
     */
    constructor(trustedKeys?: Map<string, string>);
    /**
     * Add a trusted public key.
     *
     * @param keyId - Key identifier
     * @param publicKey - PEM-encoded public key
     */
    addTrustedKey(keyId: string, publicKey: string): void;
    /**
     * Remove a trusted public key.
     *
     * @param keyId - Key identifier to remove
     */
    removeTrustedKey(keyId: string): void;
    /**
     * Verify a signature on an artifact.
     *
     * @param artifact - Export artifact to verify
     * @param signature - Base64-encoded signature
     * @param options - Verification options
     * @returns Verification result
     */
    verifySignature(artifact: ExportArtifact, signature: string, options?: VerifyOptions & {
        algorithm?: SigningAlgorithm;
    }): Promise<boolean>;
    /**
     * Verify a signature with detailed result.
     *
     * @param artifact - Export artifact to verify
     * @param signature - Base64-encoded signature
     * @param options - Verification options
     * @returns Detailed verification result
     */
    verifySignatureWithDetails(artifact: ExportArtifact, signature: string, options?: VerifyOptions & {
        algorithm?: SigningAlgorithm;
    }): Promise<VerificationResult>;
    /**
     * Verify an entire artifact package.
     *
     * This verifies:
     * 1. The manifest signature (if present)
     * 2. All artifact checksums
     * 3. The aggregate checksum
     *
     * @param pkg - Artifact package to verify
     * @returns Package verification result
     */
    verifyPackage(pkg: ArtifactPackage): Promise<PackageVerificationResult>;
    /**
     * Verify content against a signature using a provided public key.
     *
     * @param content - Content that was signed
     * @param signature - Base64-encoded signature
     * @param publicKey - PEM-encoded public key
     * @param algorithm - Signing algorithm used
     * @returns Verification result
     */
    verifyWithPublicKey(content: Buffer, signature: string, publicKey: string, algorithm?: SigningAlgorithm): Promise<VerificationResult>;
    /**
     * Get the number of trusted keys.
     */
    getTrustedKeyCount(): number;
    /**
     * Check if a key is trusted.
     */
    isKeyTrusted(keyId: string): boolean;
    /**
     * Resolve the public key to use for verification.
     */
    private resolvePublicKey;
    /**
     * Serialize content for verification.
     */
    private serializeContent;
    /**
     * JSON replacer that sorts object keys.
     */
    private sortedReplacer;
}
/**
 * Create a SignatureVerifier with no trusted keys.
 */
export declare function createSignatureVerifier(): SignatureVerifier;
/**
 * Create a SignatureVerifier with trusted keys.
 *
 * @param trustedKeys - Map of key IDs to PEM-encoded public keys
 */
export declare function createSignatureVerifierWithKeys(trustedKeys: Map<string, string>): SignatureVerifier;
//# sourceMappingURL=SignatureVerifier.d.ts.map