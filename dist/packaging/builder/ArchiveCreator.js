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
import { createGzip } from 'node:zlib';
import { Readable, PassThrough } from 'node:stream';
// =============================================================================
// CONSTANTS
// =============================================================================
/**
 * Default compression level.
 */
const DEFAULT_COMPRESSION_LEVEL = 6;
/**
 * Fixed modification time for deterministic archives (Unix epoch).
 * Using a fixed time ensures reproducible builds.
 */
const FIXED_MTIME = new Date('2024-01-01T00:00:00.000Z');
/**
 * Default file permissions (read/write for owner, read for others).
 */
const DEFAULT_FILE_MODE = 0o644;
/**
 * Default directory permissions.
 */
const DEFAULT_DIR_MODE = 0o755;
// =============================================================================
// TAR UTILITIES
// =============================================================================
/**
 * TAR header block size.
 */
const TAR_BLOCK_SIZE = 512;
/**
 * Create a TAR header for a file entry.
 *
 * This creates a POSIX ustar format header.
 */
function createTarHeader(path, size, mode, mtime) {
    const header = Buffer.alloc(TAR_BLOCK_SIZE);
    // Name (100 bytes) - handle long names with prefix field
    let name = path;
    let prefix = '';
    if (name.length > 100) {
        // Split path into prefix and name
        const lastSlash = name.lastIndexOf('/', 99);
        if (lastSlash > 0 && name.length - lastSlash - 1 <= 100) {
            prefix = name.substring(0, lastSlash);
            name = name.substring(lastSlash + 1);
        }
        else {
            // Truncate if necessary (shouldn't happen with proper paths)
            name = name.substring(0, 100);
        }
    }
    // Write header fields
    header.write(name, 0, 100, 'utf8');
    header.write(octal(mode, 7), 100, 8, 'utf8');
    header.write(octal(0, 7), 108, 8, 'utf8'); // uid
    header.write(octal(0, 7), 116, 8, 'utf8'); // gid
    header.write(octal(size, 11), 124, 12, 'utf8');
    header.write(octal(Math.floor(mtime.getTime() / 1000), 11), 136, 12, 'utf8');
    // Checksum placeholder (8 spaces)
    header.fill(' ', 148, 156);
    // Type flag (0 = regular file)
    header.write('0', 156, 1, 'utf8');
    // Link name (100 bytes) - empty
    // Magic "ustar\0"
    header.write('ustar\0', 257, 6, 'utf8');
    // Version "00"
    header.write('00', 263, 2, 'utf8');
    // User name (32 bytes)
    header.write('root', 265, 32, 'utf8');
    // Group name (32 bytes)
    header.write('root', 297, 32, 'utf8');
    // Prefix
    if (prefix) {
        header.write(prefix, 345, 155, 'utf8');
    }
    // Calculate and write checksum
    let checksum = 0;
    for (let i = 0; i < TAR_BLOCK_SIZE; i++) {
        checksum += header[i];
    }
    header.write(octal(checksum, 6) + '\0 ', 148, 8, 'utf8');
    return header;
}
/**
 * Convert number to octal string with padding.
 */
function octal(value, length) {
    return value.toString(8).padStart(length, '0');
}
/**
 * Pad content to TAR block boundary.
 */
function padToBlock(content) {
    const remainder = content.length % TAR_BLOCK_SIZE;
    if (remainder === 0) {
        return content;
    }
    const padding = TAR_BLOCK_SIZE - remainder;
    return Buffer.concat([content, Buffer.alloc(padding)]);
}
// =============================================================================
// ZIP UTILITIES
// =============================================================================
/**
 * ZIP local file header signature.
 */
const ZIP_LOCAL_HEADER_SIG = 0x04034b50;
/**
 * ZIP central directory header signature.
 */
const ZIP_CENTRAL_HEADER_SIG = 0x02014b50;
/**
 * ZIP end of central directory signature.
 */
const ZIP_END_SIG = 0x06054b50;
/**
 * DOS time/date format conversion.
 */
function toDosTime(date) {
    return {
        time: (date.getSeconds() >> 1) |
            (date.getMinutes() << 5) |
            (date.getHours() << 11),
        date: date.getDate() |
            ((date.getMonth() + 1) << 5) |
            ((date.getFullYear() - 1980) << 9),
    };
}
/**
 * Create a ZIP local file header.
 */
function createZipLocalHeader(path, size, compressedSize, crc32, mtime) {
    const pathBuffer = Buffer.from(path, 'utf8');
    const header = Buffer.alloc(30 + pathBuffer.length);
    const { time, date } = toDosTime(mtime);
    header.writeUInt32LE(ZIP_LOCAL_HEADER_SIG, 0);
    header.writeUInt16LE(20, 4); // Version needed
    header.writeUInt16LE(0, 6); // General purpose flag
    header.writeUInt16LE(8, 8); // Compression method (deflate)
    header.writeUInt16LE(time, 10);
    header.writeUInt16LE(date, 12);
    header.writeUInt32LE(crc32, 14);
    header.writeUInt32LE(compressedSize, 18);
    header.writeUInt32LE(size, 22);
    header.writeUInt16LE(pathBuffer.length, 26);
    header.writeUInt16LE(0, 28); // Extra field length
    pathBuffer.copy(header, 30);
    return header;
}
/**
 * Create a ZIP central directory header.
 */
function createZipCentralHeader(path, size, compressedSize, crc32, mtime, offset) {
    const pathBuffer = Buffer.from(path, 'utf8');
    const header = Buffer.alloc(46 + pathBuffer.length);
    const { time, date } = toDosTime(mtime);
    header.writeUInt32LE(ZIP_CENTRAL_HEADER_SIG, 0);
    header.writeUInt16LE(20, 4); // Version made by
    header.writeUInt16LE(20, 6); // Version needed
    header.writeUInt16LE(0, 8); // General purpose flag
    header.writeUInt16LE(8, 10); // Compression method
    header.writeUInt16LE(time, 12);
    header.writeUInt16LE(date, 14);
    header.writeUInt32LE(crc32, 16);
    header.writeUInt32LE(compressedSize, 20);
    header.writeUInt32LE(size, 24);
    header.writeUInt16LE(pathBuffer.length, 28);
    header.writeUInt16LE(0, 30); // Extra field length
    header.writeUInt16LE(0, 32); // Comment length
    header.writeUInt16LE(0, 34); // Disk number start
    header.writeUInt16LE(0, 36); // Internal file attributes
    header.writeUInt32LE(DEFAULT_FILE_MODE << 16, 38); // External file attributes
    header.writeUInt32LE(offset, 42); // Relative offset
    pathBuffer.copy(header, 46);
    return header;
}
/**
 * Create ZIP end of central directory record.
 */
function createZipEndRecord(entryCount, centralDirSize, centralDirOffset) {
    const record = Buffer.alloc(22);
    record.writeUInt32LE(ZIP_END_SIG, 0);
    record.writeUInt16LE(0, 4); // Disk number
    record.writeUInt16LE(0, 6); // Disk with central dir
    record.writeUInt16LE(entryCount, 8); // Entries on this disk
    record.writeUInt16LE(entryCount, 10); // Total entries
    record.writeUInt32LE(centralDirSize, 12);
    record.writeUInt32LE(centralDirOffset, 16);
    record.writeUInt16LE(0, 20); // Comment length
    return record;
}
/**
 * Simple CRC32 implementation for ZIP files.
 */
function crc32(data) {
    const table = getCRC32Table();
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
        crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
}
let crc32Table = null;
function getCRC32Table() {
    if (crc32Table) {
        return crc32Table;
    }
    crc32Table = [];
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        crc32Table[n] = c;
    }
    return crc32Table;
}
// =============================================================================
// ARCHIVE CREATOR
// =============================================================================
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
export class ArchiveCreator {
    defaultOptions;
    /**
     * Create a new ArchiveCreator.
     *
     * @param defaultOptions - Default options for archive creation
     */
    constructor(defaultOptions) {
        this.defaultOptions = {
            compressionLevel: DEFAULT_COMPRESSION_LEVEL,
            ...defaultOptions,
        };
    }
    /**
     * Create a tar.gz archive from artifacts.
     *
     * @param artifacts - Export artifacts to archive
     * @param options - Archive options
     * @returns Buffer containing the tar.gz archive
     */
    async createTarGz(artifacts, options) {
        const mergedOptions = { ...this.defaultOptions, ...options };
        const entries = this.prepareEntries(artifacts, mergedOptions);
        // Create tar archive
        const tarBuffer = this.createTar(entries);
        // Compress with gzip
        return this.gzipCompress(tarBuffer, mergedOptions.compressionLevel ?? DEFAULT_COMPRESSION_LEVEL);
    }
    /**
     * Create a zip archive from artifacts.
     *
     * @param artifacts - Export artifacts to archive
     * @param options - Archive options
     * @returns Buffer containing the zip archive
     */
    async createZip(artifacts, options) {
        const mergedOptions = { ...this.defaultOptions, ...options };
        const entries = this.prepareEntries(artifacts, mergedOptions);
        return this.createZipArchive(entries, mergedOptions.compressionLevel ?? DEFAULT_COMPRESSION_LEVEL);
    }
    /**
     * Create archive from generic entries.
     *
     * @param entries - Archive entries
     * @param format - Archive format
     * @param options - Archive options
     * @returns Archive buffer
     */
    async createFromEntries(entries, format, options) {
        const mergedOptions = { ...this.defaultOptions, ...options };
        // Sort entries for deterministic output
        const sortedEntries = [...entries].sort((a, b) => a.path.localeCompare(b.path));
        if (format === 'tar.gz') {
            const tarBuffer = this.createTar(sortedEntries);
            return this.gzipCompress(tarBuffer, mergedOptions.compressionLevel ?? DEFAULT_COMPRESSION_LEVEL);
        }
        else {
            return this.createZipArchive(sortedEntries, mergedOptions.compressionLevel ?? DEFAULT_COMPRESSION_LEVEL);
        }
    }
    // ===========================================================================
    // PRIVATE METHODS
    // ===========================================================================
    /**
     * Prepare archive entries from artifacts.
     */
    prepareEntries(artifacts, options) {
        // Sort artifacts by path for deterministic ordering
        const sorted = [...artifacts].sort((a, b) => a.path.localeCompare(b.path));
        return sorted.map((artifact) => {
            const content = this.serializeContent(artifact.content);
            const path = options.baseDir
                ? `${options.baseDir}${artifact.path}`
                : artifact.path;
            return {
                path,
                content: Buffer.from(content, 'utf-8'),
                mode: DEFAULT_FILE_MODE,
                mtime: FIXED_MTIME,
            };
        });
    }
    /**
     * Create a TAR archive (uncompressed).
     */
    createTar(entries) {
        const chunks = [];
        for (const entry of entries) {
            const content = typeof entry.content === 'string'
                ? Buffer.from(entry.content, 'utf-8')
                : entry.content;
            const header = createTarHeader(entry.path, content.length, entry.mode ?? DEFAULT_FILE_MODE, entry.mtime ?? FIXED_MTIME);
            chunks.push(header);
            chunks.push(padToBlock(content));
        }
        // Add two empty blocks to mark end of archive
        chunks.push(Buffer.alloc(TAR_BLOCK_SIZE * 2));
        return Buffer.concat(chunks);
    }
    /**
     * Compress buffer with gzip.
     */
    gzipCompress(buffer, level) {
        return new Promise((resolve, reject) => {
            const gzip = createGzip({
                level: Math.max(1, Math.min(9, level)),
            });
            const chunks = [];
            const input = Readable.from(buffer);
            const output = new PassThrough();
            input.pipe(gzip).pipe(output);
            output.on('data', (chunk) => chunks.push(chunk));
            output.on('end', () => resolve(Buffer.concat(chunks)));
            output.on('error', reject);
        });
    }
    /**
     * Create a ZIP archive.
     */
    async createZipArchive(entries, level) {
        const chunks = [];
        const centralHeaders = [];
        let offset = 0;
        for (const entry of entries) {
            const content = typeof entry.content === 'string'
                ? Buffer.from(entry.content, 'utf-8')
                : entry.content;
            // Compress content
            const compressed = await this.deflateCompress(content, level);
            const checksum = crc32(content);
            const mtime = entry.mtime ?? FIXED_MTIME;
            // Create local header
            const localHeader = createZipLocalHeader(entry.path, content.length, compressed.length, checksum, mtime);
            // Create central header
            const centralHeader = createZipCentralHeader(entry.path, content.length, compressed.length, checksum, mtime, offset);
            chunks.push(localHeader);
            chunks.push(compressed);
            centralHeaders.push(centralHeader);
            offset += localHeader.length + compressed.length;
        }
        // Add central directory
        const centralDirOffset = offset;
        const centralDir = Buffer.concat(centralHeaders);
        chunks.push(centralDir);
        // Add end of central directory record
        const endRecord = createZipEndRecord(entries.length, centralDir.length, centralDirOffset);
        chunks.push(endRecord);
        return Buffer.concat(chunks);
    }
    /**
     * Compress buffer with deflate for ZIP.
     */
    deflateCompress(buffer, level) {
        return new Promise((resolve, reject) => {
            const { deflateRaw } = require('node:zlib');
            deflateRaw(buffer, { level: Math.max(1, Math.min(9, level)) }, (err, result) => {
                if (err)
                    reject(err);
                else
                    resolve(result);
            });
        });
    }
    /**
     * Serialize artifact content to string.
     */
    serializeContent(content) {
        if (typeof content === 'string') {
            return content;
        }
        if (Buffer.isBuffer(content)) {
            return content.toString('utf-8');
        }
        // Serialize objects with sorted keys for determinism
        return JSON.stringify(content, this.sortedReplacer, 2);
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
 * Create an ArchiveCreator with default options.
 */
export function createArchiveCreator() {
    return new ArchiveCreator();
}
/**
 * Create an ArchiveCreator with maximum compression.
 */
export function createMaxCompressionArchiveCreator() {
    return new ArchiveCreator({ compressionLevel: 9 });
}
/**
 * Create an ArchiveCreator with fast compression.
 */
export function createFastArchiveCreator() {
    return new ArchiveCreator({ compressionLevel: 1 });
}
//# sourceMappingURL=ArchiveCreator.js.map