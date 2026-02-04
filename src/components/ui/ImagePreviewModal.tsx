'use client';

import { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from './Button';

// ============================================================================
// Types
// ============================================================================

export interface ImagePreviewModalProps {
  /** Array of image URLs to display */
  imageUrls: string[];
  /** Currently selected image index */
  currentIndex: number;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal is closed */
  onClose: () => void;
  /** Callback when navigating to a different image */
  onIndexChange?: (index: number) => void;
  /** Optional image alt text array */
  altTexts?: string[];
}

// ============================================================================
// Component
// ============================================================================

/**
 * ImagePreviewModal displays a full-screen modal for viewing images.
 * 
 * Features:
 * - Full-screen overlay with darkened background
 * - Navigation between multiple images (arrows)
 * - Keyboard navigation (Escape to close, arrows to navigate)
 * - Click outside to close
 * - Image counter display
 */
export function ImagePreviewModal({
  imageUrls,
  currentIndex,
  isOpen,
  onClose,
  onIndexChange,
  altTexts = [],
}: ImagePreviewModalProps) {
  const hasMultipleImages = imageUrls.length > 1;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < imageUrls.length - 1;

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowLeft':
          if (canGoPrev && onIndexChange) {
            e.preventDefault();
            onIndexChange(currentIndex - 1);
          }
          break;
        case 'ArrowRight':
          if (canGoNext && onIndexChange) {
            e.preventDefault();
            onIndexChange(currentIndex + 1);
          }
          break;
      }
    },
    [isOpen, canGoPrev, canGoNext, currentIndex, onClose, onIndexChange]
  );

  /**
   * Attach keyboard listeners
   */
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  /**
   * Handle backdrop click (close modal)
   */
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      // Only close if clicking on the backdrop itself, not the image
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  /**
   * Navigate to previous image
   */
  const handlePrev = useCallback(() => {
    if (canGoPrev && onIndexChange) {
      onIndexChange(currentIndex - 1);
    }
  }, [canGoPrev, currentIndex, onIndexChange]);

  /**
   * Navigate to next image
   */
  const handleNext = useCallback(() => {
    if (canGoNext && onIndexChange) {
      onIndexChange(currentIndex + 1);
    }
  }, [canGoNext, currentIndex, onIndexChange]);

  if (!isOpen || imageUrls.length === 0) {
    return null;
  }

  const currentUrl = imageUrls[currentIndex];
  const currentAlt = altTexts[currentIndex] || `Image ${currentIndex + 1}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 focus:ring-2 focus:ring-white"
        aria-label="Close preview"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </Button>

      {/* Image counter */}
      {hasMultipleImages && (
        <div className="absolute top-4 left-4 z-10 rounded-full bg-black/50 px-3 py-1.5 text-sm text-white">
          {currentIndex + 1} / {imageUrls.length}
        </div>
      )}

      {/* Previous button */}
      {hasMultipleImages && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrev}
          disabled={!canGoPrev}
          className={`
            absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full
            bg-black/50 text-white hover:bg-black/70 focus:ring-2 focus:ring-white
            ${!canGoPrev ? 'opacity-30 cursor-not-allowed' : ''}
          `}
          aria-label="Previous image"
        >
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </Button>
      )}

      {/* Next button */}
      {hasMultipleImages && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNext}
          disabled={!canGoNext}
          className={`
            absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full
            bg-black/50 text-white hover:bg-black/70 focus:ring-2 focus:ring-white
            ${!canGoNext ? 'opacity-30 cursor-not-allowed' : ''}
          `}
          aria-label="Next image"
        >
          <ChevronRight className="h-6 w-6" aria-hidden="true" />
        </Button>
      )}

      {/* Image container */}
      <div className="relative max-h-[90vh] max-w-[90vw] flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentUrl}
          alt={currentAlt}
          className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg shadow-2xl"
        />
      </div>

      {/* Thumbnail strip for multiple images */}
      {hasMultipleImages && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 rounded-lg bg-black/50 p-2">
          {imageUrls.map((url, index) => (
            <button
              key={index}
              onClick={() => onIndexChange?.(index)}
              className={`
                h-12 w-12 overflow-hidden rounded-md transition-all duration-150
                ${index === currentIndex
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-black/50'
                  : 'opacity-60 hover:opacity-100'
                }
              `}
              aria-label={`View image ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={altTexts[index] || `Thumbnail ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
