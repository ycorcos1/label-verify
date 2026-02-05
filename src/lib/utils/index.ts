/**
 * Utility functions for LabelVerify
 *
 * Helper utilities for common operations throughout the application.
 */

// Re-export image resize utilities
export {
  resizeImage,
  resizeImageIfNeeded,
  fileToDataUrl,
  createThumbnail,
  resizeImages,
  type ImageResizeOptions,
  type ResizeResult,
} from './imageResize';

// Re-export merge extraction utilities
export {
  mergeExtractions,
  mergeRawExtractions,
  provenanceToFieldStatus,
  type MergedFieldResult,
  type FieldProvenance,
  type MergedExtractionResult,
  type IndexedExtraction,
  type FormattingObservationsResult,
} from './mergeExtractions';

// Re-export report store utilities
export {
  saveReport,
  saveSingleAppReport,
  saveApplicationsAsReports,
  listReports,
  getReport,
  updateReport,
  deleteReport,
  clearAllReports,
  exportReportAsJson,
  downloadReportJson,
  isIndexedDBAvailable,
  getBrandName,
  type ReportListItem,
  type CreateReportParams,
  type CreateSingleAppReportParams,
  type ReportStoreError,
  type ReportStoreResult,
} from './reportStore';

// ============================================================================
// UUID Generation
// ============================================================================

/**
 * Generates a unique, unguessable identifier using the Web Crypto API
 * @returns A UUID v4 string
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generates a short ID for display purposes (first 8 characters of UUID)
 * @returns A short ID string
 */
export function generateShortId(): string {
  return crypto.randomUUID().slice(0, 8);
}

// ============================================================================
// Safe JSON Operations
// ============================================================================

/**
 * Result of a safe JSON parse operation
 */
export type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error };

/**
 * Safely parses a JSON string, returning a result object instead of throwing
 * @param jsonString - The JSON string to parse
 * @returns A result object with either the parsed data or an error
 */
export function safeJsonParse<T = unknown>(jsonString: string): SafeParseResult<T> {
  try {
    const data = JSON.parse(jsonString) as T;
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Safely parses a JSON string, returning a default value on failure
 * @param jsonString - The JSON string to parse
 * @param defaultValue - The default value to return on parse failure
 * @returns The parsed data or the default value
 */
export function safeJsonParseWithDefault<T>(jsonString: string, defaultValue: T): T {
  const result = safeJsonParse<T>(jsonString);
  return result.success ? result.data : defaultValue;
}

/**
 * Safely stringifies a value to JSON, returning null on failure
 * @param value - The value to stringify
 * @returns The JSON string or null on failure
 */
export function safeJsonStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

/**
 * Safely stringifies a value to JSON with pretty formatting
 * @param value - The value to stringify
 * @param indent - Number of spaces for indentation (default: 2)
 * @returns The formatted JSON string or null on failure
 */
export function safeJsonStringifyPretty(value: unknown, indent: number = 2): string | null {
  try {
    return JSON.stringify(value, null, indent);
  } catch {
    return null;
  }
}

// ============================================================================
// String Normalization
// ============================================================================

/**
 * Normalizes whitespace in a string (collapses multiple spaces/newlines to single space)
 * @param str - The string to normalize
 * @returns The normalized string
 */
export function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Normalizes a string for comparison (lowercase, normalized whitespace)
 * @param str - The string to normalize
 * @returns The normalized string
 */
export function normalizeForComparison(str: string): string {
  return normalizeWhitespace(str).toLowerCase();
}

/**
 * Removes common punctuation for fuzzy comparison
 * @param str - The string to process
 * @returns The string with punctuation removed
 */
export function removePunctuation(str: string): string {
  return str.replace(/[.,;:!?'"()\-–—]/g, '');
}

/**
 * Removes diacritics/accents from a string for fuzzy comparison.
 * Uses Unicode NFD normalization to decompose characters, then strips combining marks.
 * 
 * Examples:
 * - "Bärenjäger" → "Barenjager"
 * - "Café" → "Cafe"
 * - "Château" → "Chateau"
 * - "naïve" → "naive"
 * - "señor" → "senor"
 * 
 * @param str - The string to process
 * @returns The string with diacritics removed
 */
export function removeAccents(str: string): string {
  if (!str) return str;
  // NFD normalization decomposes characters into base + combining marks
  // Then we remove all combining diacritical marks (Unicode range U+0300 to U+036F)
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// ============================================================================
// File Utilities
// ============================================================================

/**
 * Gets the file extension from a filename
 * @param filename - The filename
 * @returns The lowercase extension without the dot, or empty string
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return '';
  }
  return filename.slice(lastDot + 1).toLowerCase();
}

/**
 * Gets the base name of a file without extension
 * @param filename - The filename
 * @returns The filename without extension
 */
export function getBaseName(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) {
    return filename;
  }
  return filename.slice(0, lastDot);
}

/**
 * Formats bytes to a human-readable string
 * @param bytes - The number of bytes
 * @returns A formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ============================================================================
// Date/Time Utilities
// ============================================================================

/**
 * Gets the current timestamp in ISO format
 * @returns ISO 8601 formatted timestamp
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Formats a duration in milliseconds to a human-readable string
 * @param ms - Duration in milliseconds
 * @returns Formatted string (e.g., "2.5s" or "1m 30s")
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Formats a date string for display
 * @param isoString - ISO 8601 date string
 * @returns Formatted date string
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// Filename Normalization for Auto-Grouping
// ============================================================================

/**
 * Common suffixes to remove for grouping (front, back, label, etc.)
 * Matches patterns like: _front, -front, _back, -back, _label, -label, (front), (back), etc.
 */
const PANEL_SUFFIX_PATTERN = /[_\-\s]*\(?(front|back|label|other|side|left|right|top|bottom|detail|close|closeup|close-up)\)?\s*\d*$/i;

/**
 * Patterns that indicate a non-descriptive filename (should not be auto-grouped)
 */
const NON_DESCRIPTIVE_PATTERNS = [
  /^img[_\-\s]?\d+$/i,           // img_1234, IMG1234, etc.
  /^dsc[_\-\s]?\d+$/i,           // DSC_1234, DSC1234, etc.
  /^dscn?\d+$/i,                 // DSCN1234, DSC1234
  /^photo[_\-\s]?\d+$/i,         // photo_001, photo1, etc.
  /^image[_\-\s]?\d+$/i,         // image_001, image1, etc.
  /^pic[_\-\s]?\d+$/i,           // pic_001, pic1, etc.
  /^screenshot[_\-\s]?\d*$/i,    // screenshot, screenshot_1, etc.
  /^\d+$/,                       // purely numeric: 1234, 001, etc.
  /^[a-f0-9]{8,}$/i,             // hex strings (UUIDs, hashes)
  /^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$/i, // UUID format
];

/**
 * Checks if a filename base is non-descriptive (generic camera/system name)
 * @param baseName - The filename without extension
 * @returns true if the filename is non-descriptive
 */
export function isNonDescriptiveFilename(baseName: string): boolean {
  const normalized = baseName.trim().toLowerCase();
  return NON_DESCRIPTIVE_PATTERNS.some(pattern => pattern.test(normalized));
}

/**
 * Normalizes a filename for grouping purposes:
 * 1. Strip extension
 * 2. Lowercase
 * 3. Remove common panel suffixes (_front, _back, _label, etc.)
 * 
 * @param filename - The original filename
 * @returns The normalized base name for grouping, or null if non-descriptive
 */
export function normalizeFilenameForGrouping(filename: string): string | null {
  // Get base name without extension
  const baseName = getBaseName(filename);
  
  // Check if non-descriptive first
  if (isNonDescriptiveFilename(baseName)) {
    return null;
  }
  
  // Normalize: lowercase and remove panel suffixes
  let normalized = baseName.toLowerCase().trim();
  
  // Remove panel suffix patterns
  normalized = normalized.replace(PANEL_SUFFIX_PATTERN, '');
  
  // Clean up any trailing underscores, hyphens, or numbers left over
  normalized = normalized.replace(/[_\-\s]+\d*$/, '').trim();
  
  // If we end up with something too short or non-descriptive after normalization
  if (normalized.length < 2 || isNonDescriptiveFilename(normalized)) {
    return null;
  }
  
  return normalized;
}

/**
 * Converts a normalized group key to a display name
 * @param normalizedKey - The normalized filename key
 * @returns A human-readable display name
 */
export function groupKeyToDisplayName(normalizedKey: string): string {
  // Capitalize first letter of each word, replace separators with spaces
  return normalizedKey
    .replace(/[_\-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}
