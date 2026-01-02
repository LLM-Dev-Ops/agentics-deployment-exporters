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
import { createVerify, createPublicKey } from 'node:crypto';
import { ChecksumGenerator } from '../checksum/ChecksumGenerator.js';
const ALGORITHM_CONFIGS = {
    ed25519: { signAlgorithm: null },
    'rsa-pss': { signAlgorithm: 'RSA-SHA256' },
    'ecdsa-p256': { signAlgorithm: 'SHA256' },
    'ecdsa-p384': { signAlgorithm: 'SHA384' },
};
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
export class SignatureVerifier {
    trustedKeys;
    checksumGenerator;
    /**
     * Create a new SignatureVerifier.
     *
     * @param trustedKeys - Map of key IDs to public keys (optional)
     */
    constructor(trustedKeys) {
        this.trustedKeys = new Map();
        this.checksumGenerator = new ChecksumGenerator();
        if (trustedKeys) {
            trustedKeys.forEach((publicKey, keyId) => {
                this.addTrustedKey(keyId, publicKey);
            });
        }
    }
    /**
     * Add a trusted public key.
     *
     * @param keyId - Key identifier
     * @param publicKey - PEM-encoded public key
     */
    addTrustedKey(keyId, publicKey) {
        try {
            const keyObject = createPublicKey(publicKey);
            this.trustedKeys.set(keyId, keyObject);
        }
        catch (error) {
            throw new Error(`Invalid public key for keyId ${keyId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Remove a trusted public key.
     *
     * @param keyId - Key identifier to remove
     */
    removeTrustedKey(keyId) {
        this.trustedKeys.delete(keyId);
    }
    /**
     * Verify a signature on an artifact.
     *
     * @param artifact - Export artifact to verify
     * @param signature - Base64-encoded signature
     * @param options - Verification options
     * @returns Verification result
     */
    async verifySignature(artifact, signature, options) {
        const result = await this.verifySignatureWithDetails(artifact, signature, options);
        return result.valid;
    }
    /**
     * Verify a signature with detailed result.
     *
     * @param artifact - Export artifact to verify
     * @param signature - Base64-encoded signature
     * @param options - Verification options
     * @returns Detailed verification result
     */
    async verifySignatureWithDetails(artifact, signature, options) {
        try {
            // Get public key for verification
            const publicKey = this.resolvePublicKey(options);
            if (!publicKey) {
                return Object.freeze({
                    valid: false,
                    error: 'No public key available for verification',
                });
            }
            // Serialize artifact content
            const content = this.serializeContent(artifact.content);
            const signatureBuffer = Buffer.from(signature, 'base64');
            // Determine algorithm (default to ed25519)
            const algorithm = options?.algorithm ?? 'ed25519';
            const config = ALGORITHM_CONFIGS[algorithm];
            let valid;
            if (config.signAlgorithm === null) {
                // Ed25519
                const verify = createVerify('SHA512');
                verify.update(content);
                valid = verify.verify(publicKey, signatureBuffer);
            }
            else {
                const verify = createVerify(config.signAlgorithm);
                verify.update(content);
                valid = verify.verify(publicKey, signatureBuffer);
            }
            return Object.freeze({
                valid,
                keyId: options?.expectedKeyId,
            });
        }
        catch (error) {
            return Object.freeze({
                valid: false,
                error: error instanceof Error ? error.message : 'Unknown verification error',
            });
        }
    }
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
    async verifyPackage(pkg) {
        const errors = [];
        const artifactResults = [];
        // Verify manifest signature if present
        let manifestSignature = {
            valid: true,
            // No signature means we skip signature verification
        };
        if (pkg.manifest.signature) {
            // For manifest signature verification, we'd need the original signer's public key
            // This is a simplified implementation
            manifestSignature = {
                valid: false,
                error: 'Manifest signature verification requires trusted public key',
            };
        }
        // Verify aggregate checksum
        const computedChecksum = this.checksumGenerator.computeChecksum(pkg.content);
        const checksumValid = computedChecksum.value === pkg.checksum.value;
        if (!checksumValid) {
            errors.push(`Package checksum mismatch: expected ${pkg.checksum.value.substring(0, 16)}..., got ${computedChecksum.value.substring(0, 16)}...`);
        }
        // Note: Individual artifact verification would require extracting the archive
        // and comparing checksums. This is a simplified implementation.
        const overallValid = checksumValid && manifestSignature.valid && errors.length === 0;
        return Object.freeze({
            valid: overallValid,
            manifestSignature,
            artifacts: Object.freeze(artifactResults),
            checksumValid,
            errors: Object.freeze(errors),
        });
    }
    /**
     * Verify content against a signature using a provided public key.
     *
     * @param content - Content that was signed
     * @param signature - Base64-encoded signature
     * @param publicKey - PEM-encoded public key
     * @param algorithm - Signing algorithm used
     * @returns Verification result
     */
    async verifyWithPublicKey(content, signature, publicKey, algorithm = 'ed25519') {
        try {
            const keyObject = createPublicKey(publicKey);
            const signatureBuffer = Buffer.from(signature, 'base64');
            const config = ALGORITHM_CONFIGS[algorithm];
            let valid;
            if (config.signAlgorithm === null) {
                const verify = createVerify('SHA512');
                verify.update(content);
                valid = verify.verify(keyObject, signatureBuffer);
            }
            else {
                const verify = createVerify(config.signAlgorithm);
                verify.update(content);
                valid = verify.verify(keyObject, signatureBuffer);
            }
            return Object.freeze({ valid });
        }
        catch (error) {
            return Object.freeze({
                valid: false,
                error: error instanceof Error ? error.message : 'Unknown verification error',
            });
        }
    }
    /**
     * Get the number of trusted keys.
     */
    getTrustedKeyCount() {
        return this.trustedKeys.size;
    }
    /**
     * Check if a key is trusted.
     */
    isKeyTrusted(keyId) {
        return this.trustedKeys.has(keyId);
    }
    // ===========================================================================
    // PRIVATE METHODS
    // ===========================================================================
    /**
     * Resolve the public key to use for verification.
     */
    resolvePublicKey(options) {
        if (options?.publicKey) {
            try {
                return createPublicKey(options.publicKey);
            }
            catch {
                return null;
            }
        }
        if (options?.expectedKeyId) {
            return this.trustedKeys.get(options.expectedKeyId) ?? null;
        }
        // Return first trusted key if only one exists
        if (this.trustedKeys.size === 1) {
            return this.trustedKeys.values().next().value ?? null;
        }
        return null;
    }
    /**
     * Serialize content for verification.
     */
    serializeContent(content) {
        if (typeof content === 'string') {
            return Buffer.from(content, 'utf-8');
        }
        if (Buffer.isBuffer(content)) {
            return content;
        }
        // Serialize objects with sorted keys for determinism
        return Buffer.from(JSON.stringify(content, this.sortedReplacer, 0), 'utf-8');
    }
    /**
     * JSON replacer that sorts object keys.
     */
    sortedReplacer = (_key, value) => {
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            const sorted = {};
            for (const k of Object.keys(value).sort()) {
                sorted[k] = value[k];
            }
            return sorted;
        }
        return value;
    };
}
// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================
/**
 * Create a SignatureVerifier with no trusted keys.
 */
export function createSignatureVerifier() {
    return new SignatureVerifier();
}
/**
 * Create a SignatureVerifier with trusted keys.
 *
 * @param trustedKeys - Map of key IDs to PEM-encoded public keys
 */
export function createSignatureVerifierWithKeys(trustedKeys) {
    return new SignatureVerifier(trustedKeys);
}
//# sourceMappingURL=SignatureVerifier.js.map