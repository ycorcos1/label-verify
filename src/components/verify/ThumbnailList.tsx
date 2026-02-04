'use client';

import { useState, useCallback } from 'react';
import { X, Eye } from 'lucide-react';
import { StatusBadge, Button, ImagePreviewModal } from '@/components/ui';
import type { ImageItemWithStatus } from '@/lib/types';
import { formatBytes } from '@/lib/utils';

export interface ThumbnailListProps {
  /**
   * Array of images with their processing status
   */
  images: ImageItemWithStatus[];
  /**
   * Callback when an image is removed
   */
  onRemove: (imageId: string) => void;
  /**
   * Whether images can be removed (disabled during processing)
   */
  canRemove?: boolean;
  /**
   * Optional callback when an image thumbnail is clicked (for preview)
   * If not provided and enablePreviewModal is true, the built-in modal will be used
   */
  onImageClick?: (image: ImageItemWithStatus) => void;
  /**
   * Whether to show selection checkboxes (for batch grouping)
   */
  showCheckboxes?: boolean;
  /**
   * Set of selected image IDs (for batch mode)
   */
  selectedIds?: Set<string>;
  /**
   * Callback when an image selection changes
   */
  onSelectionChange?: (imageId: string, selected: boolean) => void;
  /**
   * Whether to enable the built-in image preview modal (default: true)
   */
  enablePreviewModal?: boolean;
}

/**
 * Maps ImageProcessingStatus to StatusBadge StatusType
 */
function getStatusType(status: ImageItemWithStatus['status']): 'queued' | 'processing' | 'pass' | 'error' {
  switch (status) {
    case 'queued':
      return 'queued';
    case 'processing':
      return 'processing';
    case 'completed':
      return 'pass';
    case 'error':
      return 'error';
    default:
      return 'queued';
  }
}

/**
 * Single thumbnail item component
 */
function ThumbnailItem({
  image,
  onRemove,
  canRemove,
  onImageClick,
  showCheckbox,
  isSelected,
  onSelectionChange,
}: {
  image: ImageItemWithStatus;
  onRemove: (imageId: string) => void;
  canRemove: boolean;
  onImageClick?: (image: ImageItemWithStatus) => void;
  showCheckbox: boolean;
  isSelected: boolean;
  onSelectionChange?: (imageId: string, selected: boolean) => void;
}) {
  // Note: Preview URL cleanup is handled by useImageUpload hook
  // Do not revoke URLs here as it causes race conditions

  const handleImageClick = () => {
    if (onImageClick) {
      onImageClick(image);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleImageClick();
    }
  };

  return (
    <div
      className={`
        group relative flex items-start gap-3 rounded-lg border p-3
        transition-colors duration-150
        ${isSelected
          ? 'border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/20'
          : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600'
        }
      `}
    >
      {/* Checkbox for batch selection */}
      {showCheckbox && (
        <div className="flex items-center pt-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelectionChange?.(image.id, e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600"
            aria-label={`Select ${image.name}`}
          />
        </div>
      )}

      {/* Thumbnail preview */}
      <div
        className={`
          relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-700
          ${onImageClick ? 'cursor-pointer group/thumb' : ''}
        `}
        onClick={handleImageClick}
        onKeyDown={handleKeyDown}
        role={onImageClick ? 'button' : undefined}
        tabIndex={onImageClick ? 0 : undefined}
        aria-label={onImageClick ? `Preview ${image.name}` : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.previewUrl}
          alt={image.name}
          className="h-full w-full object-cover transition-transform duration-150 group-hover/thumb:scale-105"
        />
        {/* Hover overlay for clickable preview */}
        {onImageClick && image.status !== 'processing' && (
          <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/40 transition-colors duration-150 flex items-center justify-center">
            <Eye className="h-5 w-5 text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-150 drop-shadow-lg" />
          </div>
        )}
        {/* Loading overlay for processing state */}
        {image.status === 'processing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
      </div>

      {/* File info */}
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100"
          title={image.name}
        >
          {image.name}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {formatBytes(image.size)}
        </p>
        <div className="mt-1.5">
          <StatusBadge status={getStatusType(image.status)} />
        </div>
        {/* Error message */}
        {image.status === 'error' && image.errorMessage && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            {image.errorMessage}
          </p>
        )}
      </div>

      {/* Remove button */}
      {canRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(image.id)}
          className="
            absolute right-1 top-1 h-9 w-9 rounded-full p-0
            opacity-0 transition-opacity group-hover:opacity-100
            focus:opacity-100
          "
          aria-label={`Remove ${image.name}`}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

/**
 * ThumbnailList component displays uploaded images with their processing status.
 * Each thumbnail shows:
 * - Image preview (clickable to open full-size modal)
 * - Filename
 * - File size
 * - Status badge (Queued, Processing, Completed, Error)
 * - Remove button (when allowed)
 */
export function ThumbnailList({
  images,
  onRemove,
  canRemove = true,
  onImageClick,
  showCheckboxes = false,
  selectedIds = new Set(),
  onSelectionChange,
  enablePreviewModal = true,
}: ThumbnailListProps) {
  // Internal modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);

  /**
   * Handle image thumbnail click
   */
  const handleImageClick = useCallback((image: ImageItemWithStatus) => {
    // If external handler is provided, use it
    if (onImageClick) {
      onImageClick(image);
      return;
    }
    
    // Otherwise use internal modal if enabled
    if (enablePreviewModal) {
      const index = images.findIndex((img) => img.id === image.id);
      if (index !== -1) {
        setModalIndex(index);
        setModalOpen(true);
      }
    }
  }, [onImageClick, enablePreviewModal, images]);

  /**
   * Handle modal close
   */
  const handleModalClose = useCallback(() => {
    setModalOpen(false);
  }, []);

  /**
   * Handle modal index change
   */
  const handleModalIndexChange = useCallback((index: number) => {
    setModalIndex(index);
  }, []);

  if (images.length === 0) {
    return null;
  }

  // Determine if we should show the click handler (either external or internal modal)
  const shouldEnableClick = onImageClick || enablePreviewModal;

  // Prepare image URLs and alt texts for the modal
  const imageUrls = images.map((img) => img.previewUrl);
  const imageAltTexts = images.map((img) => img.name);

  return (
    <>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Uploaded Images ({images.length})
            </h4>
            {shouldEnableClick && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Click to preview
              </span>
            )}
          </div>
          {showCheckboxes && selectedIds.size > 0 && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {selectedIds.size} selected
            </span>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <ThumbnailItem
              key={image.id}
              image={image}
              onRemove={onRemove}
              canRemove={canRemove}
              onImageClick={shouldEnableClick ? handleImageClick : undefined}
              showCheckbox={showCheckboxes}
              isSelected={selectedIds.has(image.id)}
              onSelectionChange={onSelectionChange}
            />
          ))}
        </div>
      </div>

      {/* Image preview modal (only rendered if using internal modal) */}
      {enablePreviewModal && !onImageClick && (
        <ImagePreviewModal
          imageUrls={imageUrls}
          currentIndex={modalIndex}
          isOpen={modalOpen}
          onClose={handleModalClose}
          onIndexChange={handleModalIndexChange}
          altTexts={imageAltTexts}
        />
      )}
    </>
  );
}
