/**
 * Archive Creator for Package Bundling
 *
 * Creates tar.gz and zip archives from export artifacts.
 * All operations produce deterministic output for reproducible builds.
 *
 * Key features:
 * - Deterministic archive creation (sorted entries, fixed timestamps)
 * - Support for tar.gz and zip formats
 * - Configurable compression levels
 * - Atomic write operations
 *
 * @module packaging/builder/ArchiveCreator
 * @version 1.0.0
 */
import type { ExportArtifact } from '../../core/types.js';
import type { ArchiveEntry, ArchiveOptions } from '../types.js';
/**
 * Creates archives from export artifacts.
 *
 * All archive creation is deterministic - same input produces
 * byte-identical output for reproducible builds.
 *
 * @example
 * ```typescript
 * const creator = new ArchiveCreator();
 *
 * // Create tar.gz archive
 * const tarGz = await creator.createTarGz(artifacts);
 *
 * // Create zip archive
 * const zip = await creator.createZip(artifacts);
 *
 * // With options
 * const customArchive = await creator.createTarGz(artifacts, {
 *   compressionLevel: 9,
 *   baseDir: 'deployment/',
 * });
 * ```
 */
export declare class ArchiveCreator {
    private readonly defaultOptions;
    /**
     * Create a new ArchiveCreator.
     *
     * @param defaultOptions - Default options for archive creation
     */
    constructor(defaultOptions?: ArchiveOptions);
    /**
     * Create a tar.gz archive from artifacts.
     *
     * @param artifacts - Export artifacts to archive
     * @param options - Archive options
     * @returns Buffer containing the tar.gz archive
     */
    createTarGz(artifacts: readonly ExportArtifact[], options?: ArchiveOptions): Promise<Buffer>;
    /**
     * Create a zip archive from artifacts.
     *
     * @param artifacts - Export artifacts to archive
     * @param options - Archive options
     * @returns Buffer containing the zip archive
     */
    createZip(artifacts: readonly ExportArtifact[], options?: ArchiveOptions): Promise<Buffer>;
    /**
     * Create archive from generic entries.
     *
     * @param entries - Archive entries
     * @param format - Archive format
     * @param options - Archive options
     * @returns Archive buffer
     */
    createFromEntries(entries: readonly ArchiveEntry[], format: 'tar.gz' | 'zip', options?: ArchiveOptions): Promise<Buffer>;
    /**
     * Prepare archive entries from artifacts.
     */
    private prepareEntries;
    /**
     * Create a TAR archive (uncompressed).
     */
    private createTar;
    /**
     * Compress buffer with gzip.
     */
    private gzipCompress;
    /**
     * Create a ZIP archive.
     */
    private createZipArchive;
    /**
     * Compress buffer with deflate for ZIP.
     */
    private deflateCompress;
    /**
     * Serialize artifact content to string.
     */
    private serializeContent;
    /**
     * JSON replacer that sorts object keys.
     */
    private sortedReplacer;
}
/**
 * Create an ArchiveCreator with default options.
 */
export declare function createArchiveCreator(): ArchiveCreator;
/**
 * Create an ArchiveCreator with maximum compression.
 */
export declare function createMaxCompressionArchiveCreator(): ArchiveCreator;
/**
 * Create an ArchiveCreator with fast compression.
 */
export declare function createFastArchiveCreator(): ArchiveCreator;
//# sourceMappingURL=ArchiveCreator.d.ts.map