/**
 * Client-side Image Resize/Compress Utility
 *
 * Resizes and compresses images before sending to the API to:
 * 1. Reduce upload time
 * 2. Stay within API size limits
 * 3. Reduce OpenAI token usage (smaller images = faster processing)
 */

// ============================================================================
// Configuration
// ============================================================================

export interface ImageResizeOptions {
  /** Maximum width in pixels (default: 2048) */
  maxWidth?: number;
  /** Maximum height in pixels (default: 2048) */
  maxHeight?: number;
  /** JPEG quality 0-1 (default: 0.85) */
  quality?: number;
  /** Output format (default: 'image/jpeg') */
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp';
}

const DEFAULT_OPTIONS: Required<ImageResizeOptions> = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.85,
  outputFormat: 'image/jpeg',
};

// ============================================================================
// Types
// ============================================================================

export interface ResizeResult {
  /** Base64 data URL of the resized image */
  dataUrl: string;
  /** Original file size in bytes */
  originalSize: number;
  /** Compressed size in bytes (estimated from base64) */
  compressedSize: number;
  /** Original dimensions */
  originalWidth: number;
  originalHeight: number;
  /** New dimensions */
  newWidth: number;
  newHeight: number;
  /** Compression ratio (compressed/original) */
  compressionRatio: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Loads an image from a File object
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image: ${file.name}`));
    };

    img.src = objectUrl;
  });
}

/**
 * Calculates new dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let { width, height } = { width: originalWidth, height: originalHeight };

  // Only resize if larger than max dimensions
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  // Calculate aspect ratio
  const aspectRatio = width / height;

  // Fit within max dimensions while maintaining aspect ratio
  if (width > maxWidth) {
    width = maxWidth;
    height = Math.round(width / aspectRatio);
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * aspectRatio);
  }

  return { width, height };
}

/**
 * Estimates the byte size of a base64 data URL
 */
function estimateBase64Size(dataUrl: string): number {
  const base64Data = dataUrl.split(',')[1] || '';
  // Base64 encoding adds ~33% overhead, so actual bytes = base64 length * 3/4
  return Math.ceil((base64Data.length * 3) / 4);
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Resizes and compresses an image file using Canvas
 *
 * @param file - The image file to resize
 * @param options - Resize options
 * @returns Promise with the resized image data URL and metadata
 *
 * @example
 * ```typescript
 * const result = await resizeImage(file, { maxWidth: 1024, quality: 0.8 });
 * console.log(`Compressed from ${result.originalSize} to ${result.compressedSize}`);
 * // Send result.dataUrl to the API
 * ```
 */
export async function resizeImage(
  file: File,
  options: ImageResizeOptions = {}
): Promise<ResizeResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Load the image
  const img = await loadImage(file);
  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;

  // Calculate new dimensions
  const { width: newWidth, height: newHeight } = calculateDimensions(
    originalWidth,
    originalHeight,
    opts.maxWidth,
    opts.maxHeight
  );

  // Create canvas and draw resized image
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Use high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw the image
  ctx.drawImage(img, 0, 0, newWidth, newHeight);

  // Convert to data URL with compression
  const dataUrl = canvas.toDataURL(opts.outputFormat, opts.quality);
  const compressedSize = estimateBase64Size(dataUrl);

  return {
    dataUrl,
    originalSize: file.size,
    compressedSize,
    originalWidth,
    originalHeight,
    newWidth,
    newHeight,
    compressionRatio: compressedSize / file.size,
  };
}

/**
 * Resizes an image only if it exceeds size thresholds
 *
 * @param file - The image file to potentially resize
 * @param maxSizeBytes - Maximum file size before compression (default: 4MB)
 * @param options - Resize options
 * @returns The data URL (resized if needed) and whether it was resized
 */
export async function resizeImageIfNeeded(
  file: File,
  maxSizeBytes: number = 4 * 1024 * 1024,
  options: ImageResizeOptions = {}
): Promise<{ dataUrl: string; wasResized: boolean; result?: ResizeResult }> {
  // If file is small enough and dimensions unknown, load to check dimensions
  const img = await loadImage(file);
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const needsResize =
    file.size > maxSizeBytes ||
    img.naturalWidth > opts.maxWidth ||
    img.naturalHeight > opts.maxHeight;

  if (!needsResize) {
    // Convert original file to data URL without resizing
    const dataUrl = await fileToDataUrl(file);
    return { dataUrl, wasResized: false };
  }

  const result = await resizeImage(file, options);
  return { dataUrl: result.dataUrl, wasResized: true, result };
}

/**
 * Converts a File to a base64 data URL without resizing
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as data URL'));
      }
    };
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/**
 * Creates a preview thumbnail of an image
 *
 * @param file - The image file
 * @param maxSize - Maximum width/height for thumbnail (default: 200)
 * @returns Data URL of the thumbnail
 */
export async function createThumbnail(file: File, maxSize: number = 200): Promise<string> {
  const result = await resizeImage(file, {
    maxWidth: maxSize,
    maxHeight: maxSize,
    quality: 0.7,
    outputFormat: 'image/jpeg',
  });
  return result.dataUrl;
}

/**
 * Batch resize multiple images
 *
 * @param files - Array of image files
 * @param options - Resize options
 * @param onProgress - Optional callback for progress updates
 * @returns Array of resize results
 */
export async function resizeImages(
  files: File[],
  options: ImageResizeOptions = {},
  onProgress?: (completed: number, total: number) => void
): Promise<ResizeResult[]> {
  const results: ResizeResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const result = await resizeImage(files[i], options);
    results.push(result);
    onProgress?.(i + 1, files.length);
  }

  return results;
}
