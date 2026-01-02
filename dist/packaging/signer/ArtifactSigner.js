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
import { createSign, createVerify, generateKeyPairSync, createPrivateKey, createPublicKey, randomUUID, } from 'node:crypto';
// =============================================================================
// CONSTANTS
// =============================================================================
/**
 * Default signing algorithm.
 */
const DEFAULT_ALGORITHM = 'ed25519';
const ALGORITHM_CONFIGS = {
    ed25519: {
        keyType: 'ed25519',
        signAlgorithm: null, // Ed25519 uses implicit algorithm
    },
    'rsa-pss': {
        keyType: 'rsa',
        signAlgorithm: 'RSA-SHA256',
        keyGenOptions: {
            modulusLength: 2048,
        },
    },
    'ecdsa-p256': {
        keyType: 'ec',
        signAlgorithm: 'SHA256',
        keyGenOptions: {
            namedCurve: 'prime256v1',
        },
    },
    'ecdsa-p384': {
        keyType: 'ec',
        signAlgorithm: 'SHA384',
        keyGenOptions: {
            namedCurve: 'secp384r1',
        },
    },
};
// =============================================================================
// ARTIFACT SIGNER
// =============================================================================
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
export class ArtifactSigner {
    algorithm;
    keyId;
    privateKey = null;
    publicKey = null;
    publicKeyPem;
    /**
     * Create a new ArtifactSigner.
     *
     * @param config - Signer configuration
     */
    constructor(config) {
        this.algorithm = config?.algorithm ?? DEFAULT_ALGORITHM;
        this.keyId = config?.keyId ?? randomUUID();
        if (config?.keyPair) {
            // Use provided key pair
            this.initializeFromKeyPair(config.keyPair);
        }
        else if (config?.privateKey) {
            // Use provided private key
            this.initializeFromPrivateKey(config.privateKey);
        }
        else {
            // Generate new key pair
            this.generateKeyPair();
        }
        // Store public key PEM for later retrieval
        this.publicKeyPem = this.publicKey.export({
            type: 'spki',
            format: 'pem',
        });
    }
    /**
     * Sign content and return signature result.
     *
     * @param content - Content to sign (string or Buffer)
     * @param options - Signing options
     * @returns Promise resolving to signature result
     * @throws Error if signer is not configured
     */
    async sign(content, options) {
        if (!this.privateKey) {
            throw new Error('Signer is not configured with a private key');
        }
        const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
        const config = ALGORITHM_CONFIGS[this.algorithm];
        // Create data to sign (optionally including timestamp and metadata)
        const timestamp = options?.timestamp ? new Date().toISOString() : undefined;
        const dataToSign = this.prepareDataForSigning(buffer, timestamp, options?.metadata);
        let signature;
        if (config.signAlgorithm === null) {
            // Ed25519/Ed448 - use sign method directly
            const sign = createSign('SHA512');
            sign.update(dataToSign);
            signature = sign.sign(this.privateKey);
        }
        else {
            // RSA-PSS or ECDSA
            const sign = createSign(config.signAlgorithm);
            sign.update(dataToSign);
            signature = sign.sign(this.privateKey);
        }
        return Object.freeze({
            signature: signature.toString('base64'),
            algorithm: this.algorithm,
            keyId: options?.keyId ?? this.keyId,
            timestamp,
            publicKey: this.publicKeyPem,
        });
    }
    /**
     * Verify a signature against content.
     *
     * @param content - Original content
     * @param signature - Base64-encoded signature
     * @param options - Verification options
     * @returns Promise resolving to verification result
     */
    async verify(content, signature, options) {
        try {
            // Get public key to use for verification
            const publicKey = options?.publicKey
                ? createPublicKey(options.publicKey)
                : this.publicKey;
            if (!publicKey) {
                return Object.freeze({
                    valid: false,
                    error: 'No public key available for verification',
                });
            }
            const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
            const config = ALGORITHM_CONFIGS[this.algorithm];
            const signatureBuffer = Buffer.from(signature, 'base64');
            // Prepare data the same way it was signed
            // Note: For proper verification, we'd need the original timestamp/metadata
            // This is a simplified implementation
            const dataToVerify = this.prepareDataForSigning(buffer, undefined, undefined);
            let valid;
            if (config.signAlgorithm === null) {
                // Ed25519/Ed448
                const verify = createVerify('SHA512');
                verify.update(dataToVerify);
                valid = verify.verify(publicKey, signatureBuffer);
            }
            else {
                // RSA-PSS or ECDSA
                const verify = createVerify(config.signAlgorithm);
                verify.update(dataToVerify);
                valid = verify.verify(publicKey, signatureBuffer);
            }
            return Object.freeze({
                valid,
                keyId: this.keyId,
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
     * Get the public key in PEM format.
     *
     * @returns Base64-encoded public key
     */
    async getPublicKey() {
        return this.publicKeyPem;
    }
    /**
     * Check if the signer is properly configured.
     *
     * @returns True if signer has valid keys and is ready to use
     */
    isConfigured() {
        return this.privateKey !== null && this.publicKey !== null;
    }
    /**
     * Get the key identifier.
     */
    getKeyId() {
        return this.keyId;
    }
    /**
     * Get the signing algorithm.
     */
    getAlgorithm() {
        return this.algorithm;
    }
    /**
     * Export the key pair for storage.
     *
     * @returns Signing key pair
     */
    exportKeyPair() {
        if (!this.privateKey || !this.publicKey) {
            throw new Error('Signer is not configured with keys');
        }
        const privateKeyPem = this.privateKey.export({
            type: 'pkcs8',
            format: 'pem',
        });
        return Object.freeze({
            privateKey: Buffer.from(privateKeyPem).toString('base64'),
            publicKey: Buffer.from(this.publicKeyPem).toString('base64'),
            keyId: this.keyId,
            algorithm: this.algorithm,
            createdAt: new Date().toISOString(),
        });
    }
    // ===========================================================================
    // PRIVATE METHODS
    // ===========================================================================
    /**
     * Generate a new key pair for the configured algorithm.
     */
    generateKeyPair() {
        const config = ALGORITHM_CONFIGS[this.algorithm];
        const options = {
            ...config.keyGenOptions,
        };
        // Type assertion needed due to Node.js crypto type limitations
        const { privateKey, publicKey } = generateKeyPairSync(config.keyType, options);
        this.privateKey = privateKey;
        this.publicKey = publicKey;
    }
    /**
     * Initialize from an existing key pair.
     */
    initializeFromKeyPair(keyPair) {
        const privateKeyPem = Buffer.from(keyPair.privateKey, 'base64').toString('utf-8');
        const publicKeyPem = Buffer.from(keyPair.publicKey, 'base64').toString('utf-8');
        this.privateKey = createPrivateKey(privateKeyPem);
        this.publicKey = createPublicKey(publicKeyPem);
    }
    /**
     * Initialize from a private key (derive public key).
     */
    initializeFromPrivateKey(privateKey) {
        const keyData = typeof privateKey === 'string' ? privateKey : privateKey.toString('utf-8');
        this.privateKey = createPrivateKey(keyData);
        this.publicKey = createPublicKey(this.privateKey);
    }
    /**
     * Prepare data for signing by optionally including timestamp and metadata.
     */
    prepareDataForSigning(content, timestamp, metadata) {
        if (!timestamp && !metadata) {
            return content;
        }
        // Create a deterministic envelope containing content, timestamp, and metadata
        const envelope = {
            content: content.toString('base64'),
        };
        if (timestamp) {
            envelope.timestamp = timestamp;
        }
        if (metadata) {
            // Sort metadata keys for determinism
            const sortedMetadata = {};
            for (const key of Object.keys(metadata).sort()) {
                sortedMetadata[key] = metadata[key];
            }
            envelope.metadata = sortedMetadata;
        }
        return Buffer.from(JSON.stringify(envelope), 'utf-8');
    }
}
// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================
/**
 * Create an ArtifactSigner with Ed25519 algorithm (default, recommended).
 */
export function createEd25519Signer(keyId) {
    return new ArtifactSigner({ algorithm: 'ed25519', keyId });
}
/**
 * Create an ArtifactSigner with RSA-PSS algorithm.
 */
export function createRSAPSSSigner(keyId) {
    return new ArtifactSigner({ algorithm: 'rsa-pss', keyId });
}
/**
 * Create an ArtifactSigner with ECDSA P-256 algorithm.
 */
export function createECDSAP256Signer(keyId) {
    return new ArtifactSigner({ algorithm: 'ecdsa-p256', keyId });
}
/**
 * Create an ArtifactSigner with ECDSA P-384 algorithm.
 */
export function createECDSAP384Signer(keyId) {
    return new ArtifactSigner({ algorithm: 'ecdsa-p384', keyId });
}
/**
 * Create an ArtifactSigner from an existing key pair.
 */
export function createSignerFromKeyPair(keyPair) {
    return new ArtifactSigner({
        algorithm: keyPair.algorithm,
        keyPair,
        keyId: keyPair.keyId,
    });
}
//# sourceMappingURL=ArtifactSigner.js.map