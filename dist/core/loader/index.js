/**
 * IntentLoader Module
 *
 * This module provides functionality for loading DeploymentIntent files
 * from various sources with support for:
 * - File system reading (sync/async)
 * - Stream processing for large files (up to 100MB)
 * - Format detection (JSON/YAML)
 * - Encoding detection (UTF-8, UTF-16)
 * - Source location metadata preservation
 *
 * @example
 * ```typescript
 * import { IntentLoader, loadIntentFromFile } from '@agentics/deployment-exporters/core/loader';
 *
 * // Using the class directly
 * const loader = new IntentLoader({ maxFileSize: 50 * 1024 * 1024 });
 * const intent = await loader.loadFromFile('/path/to/intent.yaml');
 *
 * // Using convenience functions
 * const intent = await loadIntentFromFile('/path/to/intent.json');
 * ```
 */
// Main loader class and factory functions
export { IntentLoader, createIntentLoader, loadIntentFromFile, loadIntentFromString, } from './IntentLoader.js';
// Parser functions
export { parseJSON, parseYAML, verifyDeterminism, } from './IntentParser.js';
// Types and configuration
export { DEFAULT_LOADER_CONFIG, 
// Source mapping
SourceMapBuilder, DEFAULT_PARSER_OPTIONS, 
// Error handling
LoaderError, LoaderErrorCodes, } from './types.js';
//# sourceMappingURL=index.js.map