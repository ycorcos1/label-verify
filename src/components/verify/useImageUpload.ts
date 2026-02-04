'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ImageItemWithStatus } from '@/lib/types';
import { generateUUID } from '@/lib/utils';

export interface UseImageUploadOptions {
  /**
   * Maximum number of images allowed (optional)
   */
  maxImages?: number;
}

export interface UseImageUploadReturn {
  /**
   * Current array of images with status
   */
  images: ImageItemWithStatus[];
  /**
   * Add new files to the upload list
   */
  addFiles: (files: File[]) => void;
  /**
   * Remove an image by ID
   */
  removeImage: (imageId: string) => void;
  /**
   * Update the status of an image
   */
  updateImageStatus: (
    imageId: string,
    status: ImageItemWithStatus['status'],
    errorMessage?: string
  ) => void;
  /**
   * Clear all images
   */
  clearImages: () => void;
  /**
   * Whether there are any images
   */
  hasImages: boolean;
  /**
   * Whether any images are currently processing
   */
  isProcessing: boolean;
  /**
   * Set all images at once (useful for batch operations)
   */
  setImages: (images: ImageItemWithStatus[]) => void;
}

/**
 * Custom hook for managing image uploads.
 * Handles creating ImageItemWithStatus objects from File objects,
 * generating preview URLs, and cleaning them up on removal/unmount.
 */
export function useImageUpload(options: UseImageUploadOptions = {}): UseImageUploadReturn {
  const { maxImages } = options;
  const [images, setImages] = useState<ImageItemWithStatus[]>([]);
  
  // Keep track of all preview URLs for cleanup
  const previewUrlsRef = useRef<Set<string>>(new Set());

  // Cleanup all preview URLs on unmount
  useEffect(() => {
    const previewUrls = previewUrlsRef.current;
    return () => {
      previewUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      previewUrls.clear();
    };
  }, []);

  const addFiles = useCallback(
    (files: File[]) => {
      const newImages: ImageItemWithStatus[] = files.map((file) => {
        const previewUrl = URL.createObjectURL(file);
        previewUrlsRef.current.add(previewUrl);
        
        return {
          id: generateUUID(),
          file,
          name: file.name,
          previewUrl,
          size: file.size,
          status: 'queued' as const,
        };
      });

      setImages((prev) => {
        const combined = [...prev, ...newImages];
        // If maxImages is set, take only the first maxImages
        if (maxImages && combined.length > maxImages) {
          // Revoke URLs for images that won't be added
          const rejected = combined.slice(maxImages);
          rejected.forEach((img) => {
            URL.revokeObjectURL(img.previewUrl);
            previewUrlsRef.current.delete(img.previewUrl);
          });
          return combined.slice(0, maxImages);
        }
        return combined;
      });
    },
    [maxImages]
  );

  const removeImage = useCallback((imageId: string) => {
    setImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === imageId);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
        previewUrlsRef.current.delete(imageToRemove.previewUrl);
      }
      return prev.filter((img) => img.id !== imageId);
    });
  }, []);

  const updateImageStatus = useCallback(
    (
      imageId: string,
      status: ImageItemWithStatus['status'],
      errorMessage?: string
    ) => {
      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? { ...img, status, errorMessage: errorMessage || undefined }
            : img
        )
      );
    },
    []
  );

  const clearImages = useCallback(() => {
    setImages((prev) => {
      prev.forEach((img) => {
        URL.revokeObjectURL(img.previewUrl);
        previewUrlsRef.current.delete(img.previewUrl);
      });
      return [];
    });
  }, []);

  const setImagesDirectly = useCallback((newImages: ImageItemWithStatus[]) => {
    // Clean up old preview URLs
    setImages((prev) => {
      prev.forEach((img) => {
        if (!newImages.find((newImg) => newImg.previewUrl === img.previewUrl)) {
          URL.revokeObjectURL(img.previewUrl);
          previewUrlsRef.current.delete(img.previewUrl);
        }
      });
      return newImages;
    });
    // Add new preview URLs to tracking
    newImages.forEach((img) => {
      previewUrlsRef.current.add(img.previewUrl);
    });
  }, []);

  const hasImages = images.length > 0;
  const isProcessing = images.some((img) => img.status === 'processing');

  return {
    images,
    addFiles,
    removeImage,
    updateImageStatus,
    clearImages,
    hasImages,
    isProcessing,
    setImages: setImagesDirectly,
  };
}
