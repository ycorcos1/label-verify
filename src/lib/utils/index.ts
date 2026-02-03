/**
 * Utility functions for LabelVerify
 *
 * Helper utilities for common operations throughout the application.
 */

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
