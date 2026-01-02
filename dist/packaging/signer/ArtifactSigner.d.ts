/**
 * Artifact Signer for Cryptographic Signing
 *
 * Signs artifacts using Ed25519 (default), RSA-PSS, or ECDSA algorithms.
 * All signing operations are deterministic given the same key and content.
 *
 * Key features:
 * - Multiple algorithm support (Ed25519, RSA-PSS, ECDSA)
 * - Key pair generation and management
 * - Timestamp inclusion in signatures
 * - Public key export for verification
 *
 * @module packaging/signer/ArtifactSigner
 * @version 1.0.0
 */
import type { SigningAlgorithm } from '../../core/types.js';
import type { SignerConfig, SigningKeyPair, SignOptions, SignatureResult, VerifyOptions, VerificationResult } from '../types.js';
/**
 * Signs and verifies artifacts using cryptographic signatures.
 *
 * The signer supports multiple algorithms and can generate key pairs
 * or use provided keys. All operations are async for consistency
 * with potential future HSM integration.
 *
 * @example
 * ```typescript
 * // Create signer with auto-generated key pair
 * const signer = new ArtifactSigner({ algorithm: 'ed25519' });
 *
 * // Sign content
 * const content = Buffer.from('Hello, World!');
 * const result = await signer.sign(content);
 * console.log(result.signature);
 *
 * // Verify signature
 * const verification = await signer.verify(content, result.signature);
 * console.log(verification.valid); // true
 * ```
 */
export declare class ArtifactSigner {
    private readonly algorithm;
    private readonly keyId;
    private privateKey;
    private publicKey;
    private readonly publicKeyPem;
    /**
     * Create a new ArtifactSigner.
     *
     * @param config - Signer configuration
     */
    constructor(config?: SignerConfig);
    /**
     * Sign content and return signature result.
     *
     * @param content - Content to sign (string or Buffer)
     * @param options - Signing options
     * @returns Promise resolving to signature result
     * @throws Error if signer is not configured
     */
    sign(content: string | Buffer, options?: SignOptions): Promise<SignatureResult>;
    /**
     * Verify a signature against content.
     *
     * @param content - Original content
     * @param signature - Base64-encoded signature
     * @param options - Verification options
     * @returns Promise resolving to verification result
     */
    verify(content: string | Buffer, signature: string, options?: VerifyOptions): Promise<VerificationResult>;
    /**
     * Get the public key in PEM format.
     *
     * @returns Base64-encoded public key
     */
    getPublicKey(): Promise<string>;
    /**
     * Check if the signer is properly configured.
     *
     * @returns True if signer has valid keys and is ready to use
     */
    isConfigured(): boolean;
    /**
     * Get the key identifier.
     */
    getKeyId(): string;
    /**
     * Get the signing algorithm.
     */
    getAlgorithm(): SigningAlgorithm;
    /**
     * Export the key pair for storage.
     *
     * @returns Signing key pair
     */
    exportKeyPair(): SigningKeyPair;
    /**
     * Generate a new key pair for the configured algorithm.
     */
    private generateKeyPair;
    /**
     * Initialize from an existing key pair.
     */
    private initializeFromKeyPair;
    /**
     * Initialize from a private key (derive public key).
     */
    private initializeFromPrivateKey;
    /**
     * Prepare data for signing by optionally including timestamp and metadata.
     */
    private prepareDataForSigning;
}
/**
 * Create an ArtifactSigner with Ed25519 algorithm (default, recommended).
 */
export declare function createEd25519Signer(keyId?: string): ArtifactSigner;
/**
 * Create an ArtifactSigner with RSA-PSS algorithm.
 */
export declare function createRSAPSSSigner(keyId?: string): ArtifactSigner;
/**
 * Create an ArtifactSigner with ECDSA P-256 algorithm.
 */
export declare function createECDSAP256Signer(keyId?: string): ArtifactSigner;
/**
 * Create an ArtifactSigner with ECDSA P-384 algorithm.
 */
export declare function createECDSAP384Signer(keyId?: string): ArtifactSigner;
/**
 * Create an ArtifactSigner from an existing key pair.
 */
export declare function createSignerFromKeyPair(keyPair: SigningKeyPair): ArtifactSigner;
//# sourceMappingURL=ArtifactSigner.d.ts.map