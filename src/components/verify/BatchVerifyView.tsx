'use client';

import { useState, useCallback, useEffect } from 'react';
import { Upload, Layers, Play, ClipboardList, Users, File, Info, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { UploadDropzone } from './UploadDropzone';
import { ThumbnailList } from './ThumbnailList';
import { ApplicationGroupCard } from './ApplicationGroupCard';
import { UngroupedImageCard } from './UngroupedImageCard';
import { ApplicationValuesForm } from './ApplicationValuesForm';
import { useImageUpload } from './useImageUpload';
import { useImageGrouping } from './useImageGrouping';
import { useApplicationValues } from './useApplicationValues';

/**
 * BatchVerifyView component for verifying multiple applications
 * with auto-grouping and manual grouping support.
 */
export function BatchVerifyView() {
  const {
    images,
    addFiles,
    removeImage,
    hasImages,
    isProcessing,
  } = useImageUpload();

  const {
    groups,
    ungroupedImages,
    summary,
    setImagesAndGroup,
    groupImages,
    splitGroup,
    renameGroup,
  } = useImageGrouping({ autoGroup: true });

  // Application values for the selected application in details panel
  const {
    values: selectedAppValues,
    setValues: setSelectedAppValues,
  } = useApplicationValues();

  // Track selected image IDs for manual grouping
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Update grouping when images change
  useEffect(() => {
    setImagesAndGroup(images);
  }, [images, setImagesAndGroup]);

  // Handle selection change for an image
  const handleSelectionChange = useCallback((imageId: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(imageId);
      } else {
        next.delete(imageId);
      }
      return next;
    });
  }, []);

  // Handle group selected images
  const handleGroupSelected = useCallback(() => {
    if (selectedIds.size >= 2) {
      groupImages(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  }, [selectedIds, groupImages]);

  // Handle clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Count selected items
  const selectedCount = selectedIds.size;
  const canGroup = selectedCount >= 2;

  // Determine if verification can be run
  const canRunVerification = hasImages && !isProcessing;

  // Check if there are any groups or ungrouped images to display
  const hasApplications = groups.length > 0 || ungroupedImages.length > 0;

  return (
    <div className="space-y-6">
      {/* Batch Upload section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" aria-hidden="true" />
            Batch Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UploadDropzone
            onFilesAccepted={addFiles}
            disabled={isProcessing}
            helperText="Upload images for multiple applications. Images will be auto-grouped by filename when possible."
          />
          <ThumbnailList
            images={images}
            onRemove={removeImage}
            canRemove={!isProcessing}
            showCheckboxes={hasImages}
            selectedIds={selectedIds}
            onSelectionChange={handleSelectionChange}
          />
        </CardContent>
      </Card>

      {/* Grouping Summary */}
      {hasImages && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800/50 dark:bg-blue-950/20">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-blue-500" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Detected {summary.totalGroups} application{summary.totalGroups !== 1 ? 's' : ''} from {summary.totalImages} image{summary.totalImages !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {groups.length > 0 && (
                      <span>{groups.length} grouped application{groups.length !== 1 ? 's' : ''}</span>
                    )}
                    {groups.length > 0 && summary.ungroupedImages > 0 && <span> • </span>}
                    {summary.ungroupedImages > 0 && (
                      <span>{summary.ungroupedImages} ungrouped image{summary.ungroupedImages !== 1 ? 's' : ''}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Selection actions */}
              {selectedCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {selectedCount} selected
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleGroupSelected}
                    disabled={!canGroup || isProcessing}
                  >
                    <Users className="h-4 w-4" aria-hidden="true" />
                    Group Selected
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelection}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Application Groups section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" aria-hidden="true" />
            Application Groups
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasApplications ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Layers className="h-8 w-8 text-zinc-400" aria-hidden="true" />
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                No applications detected.
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                Upload images to see detected application groups.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Grouped Applications */}
              {groups.length > 0 && (
                <div>
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    <Users className="h-4 w-4" aria-hidden="true" />
                    Grouped Applications ({groups.length})
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {groups.map((group) => (
                      <ApplicationGroupCard
                        key={group.id}
                        group={group}
                        onSplit={splitGroup}
                        onRename={renameGroup}
                        isProcessing={isProcessing}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Ungrouped Images (each is its own application) */}
              {ungroupedImages.length > 0 && (
                <div>
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    <File className="h-4 w-4" aria-hidden="true" />
                    Ungrouped Images ({ungroupedImages.length})
                  </h4>
                  <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                    Each ungrouped image will be processed as a separate application.
                    Select multiple images and click &quot;Group Selected&quot; to combine them.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {ungroupedImages.map((image) => (
                      <UngroupedImageCard
                        key={image.id}
                        image={image}
                        isSelected={selectedIds.has(image.id)}
                        showCheckbox
                        onSelectionChange={handleSelectionChange}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" disabled={!canRunVerification}>
          <Play className="h-4 w-4" aria-hidden="true" />
          Run Batch Verification
        </Button>
        <Button variant="secondary" size="md" disabled>
          Retry Failed
        </Button>
      </div>

      {/* Results section with two-pane layout placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
            Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Two-pane layout for desktop */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left pane: Application list */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Applications
              </h4>
              <div className="flex flex-col items-center justify-center py-6">
                <ClipboardList className="h-6 w-6 text-zinc-400" aria-hidden="true" />
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  No results yet.
                </p>
              </div>
            </div>

            {/* Right pane: Details panel */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Details
              </h4>
              <div className="flex flex-col items-center justify-center py-6">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Select an application to view details.
                </p>
              </div>
              
              {/* Application Values form for selected application (shown when an app is selected) */}
              {/* For now, show as collapsed section; will be connected when selection is implemented */}
              <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                <h5 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Application Values
                  <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                    (Optional)
                  </span>
                </h5>
                <ApplicationValuesForm
                  values={selectedAppValues}
                  onChange={setSelectedAppValues}
                  suggestions={undefined}
                  disabled={isProcessing}
                  compact
                />
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            Run batch verification to see progressive results as each application is processed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
