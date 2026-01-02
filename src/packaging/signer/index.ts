/**
 * Signer Module Exports
 *
 * @module packaging/signer
 */

export {
  ArtifactSigner,
  createEd25519Signer,
  createRSAPSSSigner,
  createECDSAP256Signer,
  createECDSAP384Signer,
  createSignerFromKeyPair,
} from './ArtifactSigner.js';

export {
  SignatureVerifier,
  createSignatureVerifier,
  createSignatureVerifierWithKeys,
  type PackageVerificationResult,
  type ArtifactVerificationResult,
} from './SignatureVerifier.js';
