'use client';

import { File } from 'lucide-react';
import { Card, CardContent, StatusBadge } from '@/components/ui';
import type { ImageItemWithStatus } from '@/lib/types';
import { formatBytes } from '@/lib/utils';

export interface UngroupedImageCardProps {
  /**
   * The image to display
   */
  image: ImageItemWithStatus;
  /**
   * Whether the card is selected
   */
  isSelected?: boolean;
  /**
   * Whether to show selection checkbox
   */
  showCheckbox?: boolean;
  /**
   * Callback when selection changes
   */
  onSelectionChange?: (imageId: string, selected: boolean) => void;
  /**
   * Callback when the card is clicked
   */
  onClick?: (imageId: string) => void;
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
 * UngroupedImageCard displays a standalone image that hasn't been
 * grouped with any other images. Used in batch mode for images that
 * didn't match any grouping patterns or were manually ungrouped.
 */
export function UngroupedImageCard({
  image,
  isSelected = false,
  showCheckbox = false,
  onSelectionChange,
  onClick,
}: UngroupedImageCardProps) {
  return (
    <Card
      className={`
        transition-colors duration-150
        ${isSelected
          ? 'border-blue-400 bg-blue-50/50 ring-2 ring-blue-200 dark:border-blue-500 dark:bg-blue-950/20 dark:ring-blue-900/50'
          : 'hover:border-zinc-300 dark:hover:border-zinc-600'
        }
        ${onClick ? 'cursor-pointer' : ''}
      `}
      onClick={() => onClick?.(image.id)}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Checkbox for selection */}
          {showCheckbox && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onSelectionChange?.(image.id, e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 flex-shrink-0 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600"
              aria-label={`Select ${image.name}`}
            />
          )}

          {/* Thumbnail preview */}
          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.previewUrl}
              alt={image.name}
              className="h-full w-full object-cover"
            />
            {image.status === 'processing' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </div>
            )}
          </div>

          {/* File info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <File className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400" aria-hidden="true" />
              <p
                className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100"
                title={image.name}
              >
                {image.name}
              </p>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {formatBytes(image.size)}
              </span>
              <StatusBadge status={getStatusType(image.status)} size="sm" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
