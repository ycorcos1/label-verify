'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { ApplicationGroup, ImageItemWithStatus } from '@/lib/types';
import { generateUUID, normalizeFilenameForGrouping, groupKeyToDisplayName } from '@/lib/utils';

export interface UseImageGroupingOptions {
  /**
   * Whether to auto-group images when they are added
   */
  autoGroup?: boolean;
}

export interface GroupingSummary {
  /** Total number of images */
  totalImages: number;
  /** Number of application groups (including ungrouped singles) */
  totalGroups: number;
  /** Number of images that are grouped with at least one other */
  groupedImages: number;
  /** Number of images that remain ungrouped/standalone */
  ungroupedImages: number;
}

export interface UseImageGroupingReturn {
  /**
   * Current application groups
   */
  groups: ApplicationGroup[];
  /**
   * Images that are not assigned to any group (standalone applications)
   */
  ungroupedImages: ImageItemWithStatus[];
  /**
   * Grouping summary statistics
   */
  summary: GroupingSummary;
  /**
   * Set the images and compute groups
   */
  setImagesAndGroup: (images: ImageItemWithStatus[]) => void;
  /**
   * Manually group selected images into a new application
   */
  groupImages: (imageIds: string[], groupName?: string) => void;
  /**
   * Split a group back into individual ungrouped images
   */
  splitGroup: (groupId: string) => void;
  /**
   * Rename a group
   */
  renameGroup: (groupId: string, newName: string) => void;
  /**
   * Remove an image from a group (moves to ungrouped)
   */
  removeImageFromGroup: (groupId: string, imageId: string) => void;
  /**
   * Move an image from ungrouped to a group
   */
  addImageToGroup: (groupId: string, imageId: string) => void;
  /**
   * Get all images (grouped + ungrouped) as a flat list
   */
  allImages: ImageItemWithStatus[];
}

/**
 * Auto-groups images based on their normalized filenames.
 * Images with non-descriptive names remain ungrouped.
 */
function autoGroupImages(
  images: ImageItemWithStatus[]
): { groups: ApplicationGroup[]; ungrouped: ImageItemWithStatus[] } {
  const groupMap = new Map<string, ImageItemWithStatus[]>();
  const ungrouped: ImageItemWithStatus[] = [];

  // First pass: categorize images by normalized name
  for (const image of images) {
    const normalizedKey = normalizeFilenameForGrouping(image.name);
    
    if (normalizedKey === null) {
      // Non-descriptive filename - don't group
      ungrouped.push(image);
    } else {
      if (!groupMap.has(normalizedKey)) {
        groupMap.set(normalizedKey, []);
      }
      groupMap.get(normalizedKey)!.push(image);
    }
  }

  // Second pass: create groups for sets with multiple images
  const groups: ApplicationGroup[] = [];
  
  for (const [key, groupImages] of groupMap) {
    if (groupImages.length > 1) {
      // Multiple images share this base name - create a group
      groups.push({
        id: generateUUID(),
        name: groupKeyToDisplayName(key),
        images: groupImages,
      });
    } else {
      // Single image with this base name - keep as ungrouped
      ungrouped.push(groupImages[0]);
    }
  }

  return { groups, ungrouped };
}

/**
 * Custom hook for managing image grouping in batch verification mode.
 * Handles auto-grouping based on filenames and manual grouping operations.
 */
export function useImageGrouping(
  options: UseImageGroupingOptions = {}
): UseImageGroupingReturn {
  const { autoGroup = true } = options;
  
  const [groups, setGroups] = useState<ApplicationGroup[]>([]);
  const [ungroupedImages, setUngroupedImages] = useState<ImageItemWithStatus[]>([]);

  // Compute summary
  const summary = useMemo<GroupingSummary>(() => {
    const groupedImageCount = groups.reduce((sum, g) => sum + g.images.length, 0);
    const ungroupedCount = ungroupedImages.length;
    const totalImages = groupedImageCount + ungroupedCount;
    
    // Each group counts as 1 application, each ungrouped image is also 1 application
    const totalGroups = groups.length + ungroupedCount;
    
    return {
      totalImages,
      totalGroups,
      groupedImages: groupedImageCount,
      ungroupedImages: ungroupedCount,
    };
  }, [groups, ungroupedImages]);

  // Get all images as a flat list
  const allImages = useMemo<ImageItemWithStatus[]>(() => {
    const fromGroups = groups.flatMap(g => g.images);
    return [...fromGroups, ...ungroupedImages];
  }, [groups, ungroupedImages]);

  // Set images and compute groups
  const setImagesAndGroup = useCallback(
    (images: ImageItemWithStatus[]) => {
      if (autoGroup) {
        const { groups: newGroups, ungrouped } = autoGroupImages(images);
        setGroups(newGroups);
        setUngroupedImages(ungrouped);
      } else {
        // No auto-grouping - all images start as ungrouped
        setGroups([]);
        setUngroupedImages(images);
      }
    },
    [autoGroup]
  );

  // Manually group selected images
  const groupImages = useCallback(
    (imageIds: string[], groupName?: string) => {
      if (imageIds.length < 2) return;

      const imageIdSet = new Set(imageIds);
      const imagesToGroup: ImageItemWithStatus[] = [];

      // Collect images from ungrouped
      const remainingUngrouped = ungroupedImages.filter((img) => {
        if (imageIdSet.has(img.id)) {
          imagesToGroup.push(img);
          return false;
        }
        return true;
      });

      // Collect images from existing groups
      const updatedGroups = groups.map((group) => {
        const remainingImages = group.images.filter((img) => {
          if (imageIdSet.has(img.id)) {
            imagesToGroup.push(img);
            return false;
          }
          return true;
        });
        return { ...group, images: remainingImages };
      }).filter((group) => group.images.length > 0);

      // Create new group
      if (imagesToGroup.length >= 2) {
        const defaultName = groupName || `Application ${updatedGroups.length + 1}`;
        const newGroup: ApplicationGroup = {
          id: generateUUID(),
          name: defaultName,
          images: imagesToGroup,
        };
        setGroups([...updatedGroups, newGroup]);
      } else {
        setGroups(updatedGroups);
      }

      setUngroupedImages(remainingUngrouped);
    },
    [groups, ungroupedImages]
  );

  // Split a group into individual ungrouped images
  const splitGroup = useCallback(
    (groupId: string) => {
      const groupToSplit = groups.find((g) => g.id === groupId);
      if (!groupToSplit) return;

      setGroups(groups.filter((g) => g.id !== groupId));
      setUngroupedImages([...ungroupedImages, ...groupToSplit.images]);
    },
    [groups, ungroupedImages]
  );

  // Rename a group
  const renameGroup = useCallback(
    (groupId: string, newName: string) => {
      setGroups(
        groups.map((g) =>
          g.id === groupId ? { ...g, name: newName } : g
        )
      );
    },
    [groups]
  );

  // Remove an image from a group
  const removeImageFromGroup = useCallback(
    (groupId: string, imageId: string) => {
      let removedImage: ImageItemWithStatus | undefined;

      const updatedGroups = groups
        .map((group) => {
          if (group.id === groupId) {
            const imageToRemove = group.images.find((img) => img.id === imageId);
            if (imageToRemove) {
              removedImage = imageToRemove;
            }
            return {
              ...group,
              images: group.images.filter((img) => img.id !== imageId),
            };
          }
          return group;
        })
        .filter((group) => group.images.length > 0);

      setGroups(updatedGroups);

      if (removedImage) {
        setUngroupedImages([...ungroupedImages, removedImage]);
      }
    },
    [groups, ungroupedImages]
  );

  // Add an image to a group
  const addImageToGroup = useCallback(
    (groupId: string, imageId: string) => {
      const imageToAdd = ungroupedImages.find((img) => img.id === imageId);
      if (!imageToAdd) return;

      const updatedGroups = groups.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            images: [...group.images, imageToAdd],
          };
        }
        return group;
      });

      setGroups(updatedGroups);
      setUngroupedImages(ungroupedImages.filter((img) => img.id !== imageId));
    },
    [groups, ungroupedImages]
  );

  return {
    groups,
    ungroupedImages,
    summary,
    setImagesAndGroup,
    groupImages,
    splitGroup,
    renameGroup,
    removeImageFromGroup,
    addImageToGroup,
    allImages,
  };
}
