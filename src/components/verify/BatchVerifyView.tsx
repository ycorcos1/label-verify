'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Upload, Layers, Play, ClipboardList, Users, File, Info, FileText, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { UploadDropzone } from './UploadDropzone';
import { ThumbnailList } from './ThumbnailList';
import { ApplicationGroupCard } from './ApplicationGroupCard';
import { UngroupedImageCard } from './UngroupedImageCard';
import { ApplicationValuesForm } from './ApplicationValuesForm';
import { ResultsDetails } from './ResultsDetails';
import { BatchResultsFilters, type BatchFilterStatus } from './BatchResultsFilters';
import { BatchApplicationList } from './BatchApplicationRow';
import { useImageUpload } from './useImageUpload';
import { useImageGrouping } from './useImageGrouping';
import { useApplicationValues } from './useApplicationValues';
import { useBatchVerification, type BatchApplicationResult } from './useBatchVerification';
import type { ApplicationValues } from '@/lib/types';
import { formatDuration } from '@/lib/utils';

/**
 * BatchVerifyView component for verifying multiple applications
 * with auto-grouping, manual grouping support, and controlled concurrency.
 */
export function BatchVerifyView() {
  const {
    images,
    addFiles,
    removeImage,
    updateImageStatus,
    hasImages,
    isProcessing: isUploading,
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

  // Batch verification hook with controlled concurrency
  const {
    state: batchState,
    applicationResults,
    summary: batchSummary,
    runBatchVerification,
    retryFailed,
    reset: resetBatch,
    filterByStatus,
  } = useBatchVerification({ concurrencyLimit: 3 });

  // Application values map for all applications
  const [applicationValuesMap, setApplicationValuesMap] = useState<Map<string, ApplicationValues>>(new Map());

  // Application values for the selected application in details panel
  const {
    values: selectedAppValues,
    setValues: setSelectedAppValues,
  } = useApplicationValues();

  // Track selected image IDs for manual grouping
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter state for results
  const [activeFilter, setActiveFilter] = useState<BatchFilterStatus>('all');

  // Selected application for details panel
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);

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
  const isProcessing = batchState === 'processing';
  const canRunVerification = hasImages && !isProcessing && !isUploading;

  // Check if there are any groups or ungrouped images to display
  const hasApplications = groups.length > 0 || ungroupedImages.length > 0;

  // Check if verification has been run
  const hasResults = applicationResults.size > 0;

  // Check if there are failed applications to retry
  const hasFailedApplications = batchSummary.error > 0;

  /**
   * Handle running batch verification
   */
  const handleRunBatchVerification = useCallback(async () => {
    // Reset batch state
    resetBatch();
    setSelectedApplicationId(null);
    setActiveFilter('all');

    await runBatchVerification(
      groups,
      ungroupedImages,
      applicationValuesMap,
      (imageId, status, error) => {
        updateImageStatus(imageId, status, error);
      }
    );
  }, [groups, ungroupedImages, applicationValuesMap, runBatchVerification, resetBatch, updateImageStatus]);

  /**
   * Handle retrying failed applications
   */
  const handleRetryFailed = useCallback(async () => {
    await retryFailed(
      groups,
      ungroupedImages,
      applicationValuesMap,
      (imageId, status, error) => {
        updateImageStatus(imageId, status, error);
      }
    );
  }, [groups, ungroupedImages, applicationValuesMap, retryFailed, updateImageStatus]);

  /**
   * Handle updating application values for a specific application
   */
  const handleApplicationValuesChange = useCallback((appId: string, values: ApplicationValues) => {
    setApplicationValuesMap((prev) => {
      const next = new Map(prev);
      next.set(appId, values);
      return next;
    });
  }, []);

  /**
   * Get filtered results based on active filter
   */
  const filteredResults = useMemo(() => {
    return filterByStatus(activeFilter);
  }, [filterByStatus, activeFilter]);

  /**
   * Get selected application result
   */
  const selectedApplicationResult = useMemo<BatchApplicationResult | undefined>(() => {
    if (!selectedApplicationId) return undefined;
    return applicationResults.get(selectedApplicationId);
  }, [selectedApplicationId, applicationResults]);

  /**
   * Update selected app values when selection changes
   */
  useEffect(() => {
    if (selectedApplicationId) {
      const appValues = applicationValuesMap.get(selectedApplicationId) || {};
      setSelectedAppValues(appValues);
    }
  }, [selectedApplicationId, applicationValuesMap, setSelectedAppValues]);

  /**
   * Handle updating values for the selected application
   */
  const handleSelectedAppValuesChange = useCallback((values: ApplicationValues) => {
    setSelectedAppValues(values);
    if (selectedApplicationId) {
      handleApplicationValuesChange(selectedApplicationId, values);
    }
  }, [selectedApplicationId, setSelectedAppValues, handleApplicationValuesChange]);

  /**
   * Get suggestions from the selected application's extracted values
   */
  const suggestions = selectedApplicationResult?.extractedValues || undefined;

  /**
   * Get image preview URLs for the selected application
   */
  const selectedAppImageUrls = useMemo<string[]>(() => {
    if (!selectedApplicationId) return [];

    // Check if it's a grouped application
    const group = groups.find((g) => g.id === selectedApplicationId);
    if (group) {
      return group.images.map((img) => img.previewUrl);
    }

    // Check if it's an ungrouped application
    const ungroupedId = selectedApplicationId.replace('ungrouped-', '');
    const ungroupedImage = ungroupedImages.find((img) => img.id === ungroupedId);
    if (ungroupedImage) {
      return [ungroupedImage.previewUrl];
    }

    return [];
  }, [selectedApplicationId, groups, ungroupedImages]);

  /**
   * Get image names for the selected application (used as alt text)
   */
  const selectedAppImageNames = useMemo<string[]>(() => {
    if (!selectedApplicationId) return [];

    // Check if it's a grouped application
    const group = groups.find((g) => g.id === selectedApplicationId);
    if (group) {
      return group.images.map((img) => img.name);
    }

    // Check if it's an ungrouped application
    const ungroupedId = selectedApplicationId.replace('ungrouped-', '');
    const ungroupedImage = ungroupedImages.find((img) => img.id === ungroupedId);
    if (ungroupedImage) {
      return [ungroupedImage.name];
    }

    return [];
  }, [selectedApplicationId, groups, ungroupedImages]);

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
        <Button
          size="lg"
          onClick={handleRunBatchVerification}
          disabled={!canRunVerification}
        >
          {isProcessing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              Processing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" aria-hidden="true" />
              Run Batch Verification
            </>
          )}
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={handleRetryFailed}
          disabled={!hasFailedApplications || isProcessing}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Retry Failed
          {hasFailedApplications && (
            <span className="ml-1 text-xs">({batchSummary.error})</span>
          )}
        </Button>
      </div>

      {/* Results section with two-pane layout */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
              Results
            </CardTitle>
            
            {/* Batch summary stats */}
            {hasResults && (
              <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                <span>
                  {batchSummary.total} application{batchSummary.total !== 1 ? 's' : ''}
                </span>
                <span>
                  {formatDuration(batchSummary.totalProcessingTimeMs)}
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          {hasResults && (
            <div className="mb-4">
              <BatchResultsFilters
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                counts={{
                  total: batchSummary.total,
                  pass: batchSummary.pass,
                  fail: batchSummary.fail,
                  needsReview: batchSummary.needsReview,
                  error: batchSummary.error,
                }}
                disabled={isProcessing}
              />
            </div>
          )}

          {/* Two-pane layout for desktop */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left pane: Application list */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Applications
              </h4>
              
              {!hasResults && !isProcessing && (
                <div className="flex flex-col items-center justify-center py-6">
                  <ClipboardList className="h-6 w-6 text-zinc-400" aria-hidden="true" />
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    No results yet.
                  </p>
                </div>
              )}

              {(hasResults || isProcessing) && (
                <BatchApplicationList
                  results={filteredResults}
                  selectedId={selectedApplicationId || undefined}
                  onSelect={setSelectedApplicationId}
                  emptyMessage={
                    activeFilter === 'all'
                      ? 'No applications to display.'
                      : `No applications with status "${activeFilter}".`
                  }
                />
              )}
            </div>

            {/* Right pane: Details panel */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Details
              </h4>
              
              {!selectedApplicationResult ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Select an application to view details.
                  </p>
                </div>
              ) : selectedApplicationResult.status === 'queued' || selectedApplicationResult.status === 'processing' ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <RefreshCw className="h-6 w-6 text-blue-500 animate-spin" aria-hidden="true" />
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {selectedApplicationResult.status === 'queued' ? 'Waiting in queue...' : 'Processing...'}
                  </p>
                </div>
              ) : selectedApplicationResult.status === 'error' && !selectedApplicationResult.result ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-center">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {selectedApplicationResult.errorMessage || 'An error occurred during processing.'}
                    </p>
                  </div>
                </div>
              ) : selectedApplicationResult.result ? (
                <ResultsDetails
                  result={selectedApplicationResult.result}
                  extractedValues={selectedApplicationResult.extractedValues || undefined}
                  imagePreviewUrls={selectedAppImageUrls}
                  imageAltTexts={selectedAppImageNames}
                />
              ) : null}
              
              {/* Application Values form for selected application */}
              {selectedApplicationId && (
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
                    onChange={handleSelectedAppValuesChange}
                    suggestions={suggestions}
                    disabled={isProcessing}
                    compact
                  />
                </div>
              )}
            </div>
          </div>
          
          {!hasResults && !isProcessing && (
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              Run batch verification to see progressive results as each application is processed.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
