'use client';

import { useState } from 'react';
import { Layers, SplitSquareVertical, Pencil, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, Button, StatusBadge } from '@/components/ui';
import type { ApplicationGroup, ImageItemWithStatus } from '@/lib/types';

export interface ApplicationGroupCardProps {
  /**
   * The application group to display
   */
  group: ApplicationGroup;
  /**
   * Callback when the split button is clicked
   */
  onSplit: (groupId: string) => void;
  /**
   * Callback when the group is renamed
   */
  onRename: (groupId: string, newName: string) => void;
  /**
   * Whether the card is in a processing state
   */
  isProcessing?: boolean;
  /**
   * Whether this group is selected/active
   */
  isSelected?: boolean;
  /**
   * Callback when the card is clicked
   */
  onClick?: (groupId: string) => void;
}

/**
 * Maps ImageProcessingStatus to StatusBadge StatusType
 */
function getGroupStatus(images: ImageItemWithStatus[]): 'queued' | 'processing' | 'pass' | 'error' {
  if (images.some(img => img.status === 'processing')) {
    return 'processing';
  }
  if (images.some(img => img.status === 'error')) {
    return 'error';
  }
  if (images.every(img => img.status === 'completed')) {
    return 'pass';
  }
  return 'queued';
}

/**
 * Small thumbnail preview for group card
 */
function MiniThumbnail({ image }: { image: ImageItemWithStatus }) {
  return (
    <div
      className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-700"
      title={image.name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.previewUrl}
        alt={image.name}
        className="h-full w-full object-cover"
      />
      {image.status === 'processing' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
        </div>
      )}
    </div>
  );
}

/**
 * ApplicationGroupCard component displays a grouped set of images
 * representing a single application with mini thumbnail previews
 * and actions for split/rename.
 */
export function ApplicationGroupCard({
  group,
  onSplit,
  onRename,
  isProcessing = false,
  isSelected = false,
  onClick,
}: ApplicationGroupCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [isExpanded, setIsExpanded] = useState(false);

  const status = getGroupStatus(group.images);
  const displayedImages = isExpanded ? group.images : group.images.slice(0, 4);
  const hasMoreImages = group.images.length > 4;

  const handleRename = () => {
    if (editName.trim() && editName.trim() !== group.name) {
      onRename(group.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(group.name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <Card
      className={`
        transition-colors duration-150
        ${isSelected
          ? 'border-blue-400 ring-2 ring-blue-200 dark:border-blue-500 dark:ring-blue-900/50'
          : 'hover:border-zinc-300 dark:hover:border-zinc-600'
        }
        ${onClick ? 'cursor-pointer' : ''}
      `}
      onClick={() => onClick?.(group.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Group info */}
          <div className="min-w-0 flex-1">
            {/* Group name / editing */}
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="
                    flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm
                    focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400
                    dark:border-zinc-600 dark:bg-zinc-800 dark:focus:border-blue-500
                  "
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRename();
                  }}
                  className="h-7 w-7 p-0"
                  aria-label="Save name"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelEdit();
                  }}
                  className="h-7 w-7 p-0"
                  aria-label="Cancel"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 flex-shrink-0 text-zinc-400" aria-hidden="true" />
                <h4 className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {group.name}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  disabled={isProcessing}
                  className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                  aria-label="Rename group"
                >
                  <Pencil className="h-3 w-3" aria-hidden="true" />
                </Button>
              </div>
            )}

            {/* Image count and status */}
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {group.images.length} image{group.images.length !== 1 ? 's' : ''}
              </span>
              <StatusBadge status={status} size="sm" />
            </div>

            {/* Mini thumbnail strip */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {displayedImages.map((image) => (
                <MiniThumbnail key={image.id} image={image} />
              ))}
              {!isExpanded && hasMoreImages && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(true);
                  }}
                  className="
                    flex h-10 w-10 items-center justify-center rounded border border-dashed
                    border-zinc-300 bg-zinc-50 text-xs text-zinc-500
                    hover:border-zinc-400 hover:bg-zinc-100
                    dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400
                    dark:hover:border-zinc-500 dark:hover:bg-zinc-700
                  "
                >
                  +{group.images.length - 4}
                </button>
              )}
            </div>

            {/* Collapse button when expanded */}
            {isExpanded && hasMoreImages && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="mt-2 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              >
                <ChevronUp className="h-3 w-3" aria-hidden="true" />
                Show less
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-shrink-0 flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSplit(group.id);
              }}
              disabled={isProcessing}
              className="h-8 gap-1.5 px-2 text-xs"
              aria-label="Split group"
            >
              <SplitSquareVertical className="h-3.5 w-3.5" aria-hidden="true" />
              Split
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
