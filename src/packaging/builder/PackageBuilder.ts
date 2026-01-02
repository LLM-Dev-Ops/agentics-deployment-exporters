/**
 * Package Builder for Artifact Bundling
 *
 * Builds complete artifact packages with manifests, checksums, and signatures.
 * Implements atomic operations for reliability.
 *
 * Key features:
 * - Incremental artifact addition
 * - Automatic manifest generation
 * - Optional signing and checksums
 * - Atomic finalization
 *
 * @module packaging/builder/PackageBuilder
 * @version 1.0.0
 */

import { randomUUID } from 'node:crypto';
import type { ExportArtifact, SemanticVersion } from '../../core/types.js';
import type {
  ArtifactPackage,
  BuilderState,
  PackageManifest,
  PackageOptions,
  IntentReference,
  PackageArtifactEntry,
  ExporterInfo,
} from '../types.js';
import { ChecksumGenerator } from '../checksum/ChecksumGenerator.js';
import { ArtifactSigner } from '../signer/ArtifactSigner.js';
import { ArchiveCreator } from './ArchiveCreator.js';
import { ManifestGenerator } from '../manifest/ManifestGenerator.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default package options.
 */
const DEFAULT_OPTIONS: PackageOptions = {
  format: 'tar.gz',
  sign: false,
  checksumAlgorithm: 'sha256',
  includeLineage: false,
  compressionLevel: 6,
};

/**
 * Package manifest version.
 */
const MANIFEST_VERSION: SemanticVersion = '1.0.0';

/**
 * Generator identification.
 */
const GENERATOR_ID = 'agentics-deployment-exporters@1.0.0';

// =============================================================================
// PACKAGE METADATA
// =============================================================================

/**
 * Metadata for package creation.
 */
export interface PackageBuildMetadata {
  /** Intent reference */
  readonly intent: IntentReference;
  /** Exporter information */
  readonly exporters: Readonly<Record<string, ExporterInfo>>;
  /** Override timestamp for deterministic output */
  readonly timestampOverride?: string;
}

// =============================================================================
// PACKAGE BUILDER
// =============================================================================

/**
 * Builds artifact packages incrementally.
 *
 * The builder accumulates artifacts and metadata, then produces
 * a complete package with manifest and optional signatures.
 * All operations are designed for atomic completion.
 *
 * @example
 * ```typescript
 * const builder = new PackageBuilder({
 *   format: 'tar.gz',
 *   sign: true,
 * });
 *
 * // Add artifacts
 * builder.addArtifact(artifact1);
 * builder.addArtifact(artifact2);
 *
 * // Build package
 * const pkg = await builder.build({
 *   intent: { name: 'my-deployment', version: '1.0.0', hash: 'sha256:...' },
 *   exporters: { TerraformExporter: { version: '1.0.0' } },
 * });
 * ```
 */
export class PackageBuilder {
  private readonly options: PackageOptions;
  private readonly artifacts: ExportArtifact[];
  private readonly checksumGenerator: ChecksumGenerator;
  private readonly archiveCreator: ArchiveCreator;
  private readonly manifestGenerator: ManifestGenerator;
  private signer: ArtifactSigner | null = null;
  private finalized: boolean = false;

  /**
   * Create a new PackageBuilder.
   *
   * @param options - Package build options
   */
  constructor(options?: PackageOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.artifacts = [];
    this.checksumGenerator = new ChecksumGenerator(this.options.checksumAlgorithm);
    this.archiveCreator = new ArchiveCreator({
      compressionLevel: this.options.compressionLevel,
    });
    this.manifestGenerator = new ManifestGenerator();

    if (this.options.sign) {
      this.signer = new ArtifactSigner();
    }
  }

  /**
   * Add an artifact to the package.
   *
   * @param artifact - Export artifact to add
   * @throws Error if builder has been finalized
   */
  public addArtifact(artifact: ExportArtifact): void {
    if (this.finalized) {
      throw new Error('Cannot add artifacts to a finalized builder');
    }
    this.artifacts.push(artifact);
  }

  /**
   * Add multiple artifacts to the package.
   *
   * @param artifacts - Export artifacts to add
   * @throws Error if builder has been finalized
   */
  public addArtifacts(artifacts: readonly ExportArtifact[]): void {
    for (const artifact of artifacts) {
      this.addArtifact(artifact);
    }
  }

  /**
   * Get the current artifact count.
   */
  public getArtifactCount(): number {
    return this.artifacts.length;
  }

  /**
   * Get the current builder state.
   */
  public getState(): BuilderState {
    return Object.freeze({
      artifacts: Object.freeze([...this.artifacts]),
      options: this.options,
      finalized: this.finalized,
    });
  }

  /**
   * Build the artifact package.
   *
   * This method:
   * 1. Generates checksums for all artifacts
   * 2. Creates the package manifest
   * 3. Optionally signs the manifest
   * 4. Creates the archive
   * 5. Returns the complete package
   *
   * @param metadata - Package metadata
   * @returns Built artifact package
   * @throws Error if no artifacts added or builder already finalized
   */
  public async build(metadata: PackageBuildMetadata): Promise<ArtifactPackage> {
    if (this.finalized) {
      throw new Error('Builder has already been finalized');
    }

    if (this.artifacts.length === 0) {
      throw new Error('Cannot build package with no artifacts');
    }

    // Mark as finalized to prevent further modifications
    this.finalized = true;

    // Generate manifest
    const manifest = await this.generateManifest(metadata);

    // Create archive with manifest
    const archiveContent = await this.createArchiveWithManifest(manifest);

    // Compute package checksum
    const packageChecksum = this.checksumGenerator.computeChecksum(archiveContent);

    return Object.freeze({
      content: archiveContent,
      checksum: packageChecksum,
      manifest,
      format: this.options.format ?? 'tar.gz',
    });
  }

  /**
   * Build from provided artifacts without using builder state.
   *
   * Static method for one-shot package creation.
   *
   * @param artifacts - Export artifacts to package
   * @param metadata - Package metadata
   * @param options - Package options
   * @returns Built artifact package
   */
  public static async buildFromArtifacts(
    artifacts: readonly ExportArtifact[],
    metadata: PackageBuildMetadata,
    options?: PackageOptions
  ): Promise<ArtifactPackage> {
    const builder = new PackageBuilder(options);
    builder.addArtifacts(artifacts);
    return builder.build(metadata);
  }

  /**
   * Create a finalized buffer without metadata.
   *
   * This creates a simple archive without full manifest.
   *
   * @returns Archive buffer
   * @throws Error if no artifacts or already finalized
   */
  public async finalize(): Promise<Buffer> {
    if (this.finalized) {
      throw new Error('Builder has already been finalized');
    }

    if (this.artifacts.length === 0) {
      throw new Error('Cannot finalize package with no artifacts');
    }

    this.finalized = true;

    if (this.options.format === 'zip') {
      return this.archiveCreator.createZip(this.artifacts);
    }

    return this.archiveCreator.createTarGz(this.artifacts);
  }

  /**
   * Reset the builder for reuse.
   */
  public reset(): void {
    this.artifacts.length = 0;
    this.finalized = false;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Generate the package manifest.
   */
  private async generateManifest(metadata: PackageBuildMetadata): Promise<PackageManifest> {
    const timestamp = metadata.timestampOverride ?? new Date().toISOString();

    // Generate artifact entries with checksums
    const artifactEntries = this.generateArtifactEntries();

    // Create base manifest
    let manifest: PackageManifest = {
      version: MANIFEST_VERSION,
      generated: timestamp,
      generator: GENERATOR_ID,
      intent: metadata.intent,
      artifacts: artifactEntries,
      exporters: metadata.exporters,
    };

    // Add signature if signing is enabled
    if (this.signer && this.options.sign) {
      const manifestContent = JSON.stringify(manifest, this.sortedReplacer, 2);
      const signResult = await this.signer.sign(manifestContent, this.options.signOptions);
      manifest = {
        ...manifest,
        signature: signResult.signature,
      };
    }

    return Object.freeze(manifest);
  }

  /**
   * Generate artifact entries with checksums.
   */
  private generateArtifactEntries(): readonly PackageArtifactEntry[] {
    // Sort artifacts by path for deterministic ordering
    const sorted = [...this.artifacts].sort((a, b) => a.path.localeCompare(b.path));

    return sorted.map((artifact) => {
      const content = this.serializeContent(artifact.content);
      const buffer = Buffer.from(content, 'utf-8');
      const checksum = this.checksumGenerator.generateChecksum(buffer);

      // Extract exporter from metadata if available
      const exporter = (artifact.metadata?.exporter as string) ?? 'unknown';

      return Object.freeze({
        path: artifact.path,
        exporter,
        format: artifact.format,
        checksum,
        size: buffer.length,
      });
    });
  }

  /**
   * Create archive with embedded manifest.
   */
  private async createArchiveWithManifest(manifest: PackageManifest): Promise<Buffer> {
    // Create manifest artifact
    const manifestContent = JSON.stringify(manifest, this.sortedReplacer, 2);
    const manifestArtifact: ExportArtifact = {
      path: 'manifest.json',
      content: manifestContent,
      format: 'json',
      encoding: 'utf-8',
    };

    // Combine manifest with other artifacts
    const allArtifacts = [manifestArtifact, ...this.artifacts];

    if (this.options.format === 'zip') {
      return this.archiveCreator.createZip(allArtifacts);
    }

    return this.archiveCreator.createTarGz(allArtifacts);
  }

  /**
   * Serialize content to string.
   */
  private serializeContent(content: unknown): string {
    if (typeof content === 'string') {
      return content;
    }

    if (Buffer.isBuffer(content)) {
      return content.toString('utf-8');
    }

    return JSON.stringify(content, this.sortedReplacer, 2);
  }

  /**
   * JSON replacer that sorts object keys for determinism.
   */
  private sortedReplacer = (_key: string, value: unknown): unknown => {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(value as Record<string, unknown>).sort()) {
        sorted[k] = (value as Record<string, unknown>)[k];
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
 * Create a PackageBuilder with default options.
 */
export function createPackageBuilder(): PackageBuilder {
  return new PackageBuilder();
}

/**
 * Create a PackageBuilder for tar.gz packages.
 */
export function createTarGzPackageBuilder(): PackageBuilder {
  return new PackageBuilder({ format: 'tar.gz' });
}

/**
 * Create a PackageBuilder for zip packages.
 */
export function createZipPackageBuilder(): PackageBuilder {
  return new PackageBuilder({ format: 'zip' });
}

/**
 * Create a PackageBuilder with signing enabled.
 */
export function createSignedPackageBuilder(): PackageBuilder {
  return new PackageBuilder({ sign: true });
}

/**
 * Build a package from artifacts in one call.
 *
 * @param artifacts - Export artifacts
 * @param metadata - Package metadata
 * @param options - Package options
 * @returns Artifact package
 */
export async function buildPackage(
  artifacts: readonly ExportArtifact[],
  metadata: PackageBuildMetadata,
  options?: PackageOptions
): Promise<ArtifactPackage> {
  return PackageBuilder.buildFromArtifacts(artifacts, metadata, options);
}
