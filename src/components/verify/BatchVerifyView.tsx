'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Upload, Layers, Play, ClipboardList, Users, File, Info, FileText, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, ErrorBanner, LoadingState, ProcessingProgress, ApplicationErrorCard, detectErrorType, ApplicationListCard, type ApplicationInfo } from '@/components/ui';
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
import { formatDuration, saveApplicationsAsReports, downloadReportJson, generateUUID, createThumbnail } from '@/lib/utils';
import type { ReportApplication, Report } from '@/lib/types';

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

  // Saved reports state (v2: one report per application)
  const [savedReports, setSavedReports] = useState<Report[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isQuotaError, setIsQuotaError] = useState(false);
  const [pendingReportData, setPendingReportData] = useState<Report | null>(null);

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
  const totalApplications = groups.length + ungroupedImages.length;

  // Build applications list for the modal
  const applicationsForModal: ApplicationInfo[] = useMemo(() => {
    const apps: ApplicationInfo[] = [];
    
    // Add grouped applications
    for (const group of groups) {
      apps.push({
        id: group.id,
        name: group.name,
        imageCount: group.images.length,
        images: group.images,
      });
    }
    
    // Add ungrouped images as individual applications
    for (const image of ungroupedImages) {
      apps.push({
        id: `ungrouped-${image.id}`,
        name: image.name.replace(/\.[^/.]+$/, ''), // Remove file extension
        imageCount: 1,
        images: [image],
      });
    }
    
    return apps;
  }, [groups, ungroupedImages]);

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
    setSavedReports([]);
    setSaveError(null);

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
   * Auto-save reports when batch verification completes (v2: one report per application)
   */
  useEffect(() => {
    const saveReportsAfterCompletion = async () => {
      if (batchState === 'completed' || batchState === 'partial_error') {
        // Build report applications from results with thumbnails
        const reportApps: ReportApplication[] = [];

        for (const [appId, appResult] of applicationResults.entries()) {
          if (appResult.result) {
            // Get images directly from the batch result (stored during processing)
            const appImages = appResult.images || [];

            // Create thumbnails for this application's images (500px, 85% quality for better readability)
            const thumbnails = await Promise.all(
              appImages.map(img => createThumbnail(img.file, 500, 0.85))
            );
            const imageNames = appImages.map(img => img.name);

            reportApps.push({
              id: appId,
              name: appResult.applicationName,
              imageCount: appResult.imageCount,
              extractedValues: appResult.extractedValues || {},
              applicationValues: applicationValuesMap.get(appId),
              result: appResult.result,
              imageThumbnails: thumbnails,
              imageNames: imageNames,
            });
          }
        }

        // Save each application as its own report (v2 format)
        if (reportApps.length > 0 && savedReports.length === 0) {
          const result = await saveApplicationsAsReports(reportApps);
          if (result.success) {
            setSavedReports(result.data);
          } else {
            // Check if it's a quota exceeded error
            const isQuota = result.error.code === 'QUOTA_EXCEEDED';
            setIsQuotaError(isQuota);
            setSaveError(result.error.message);
            
            // Store pending report data for forced download (without thumbnails to reduce size)
            if (isQuota) {
              const reportAppsWithoutThumbnails = reportApps.map(app => ({
                ...app,
                imageThumbnails: undefined,
              }));
              // Create a temporary combined report structure for download
              const tempReport: Report = {
                id: generateUUID(),
                createdAt: new Date().toISOString(),
                mode: 'batch',
                applications: reportAppsWithoutThumbnails,
                summary: {
                  total: reportApps.length,
                  pass: reportApps.filter(a => a.result.overallStatus === 'pass').length,
                  fail: reportApps.filter(a => a.result.overallStatus === 'fail').length,
                  needsReview: reportApps.filter(a => a.result.overallStatus === 'needs_review').length,
                  error: reportApps.filter(a => a.result.overallStatus === 'error').length,
                },
                totalDurationMs: batchSummary.totalProcessingTimeMs,
              };
              setPendingReportData(tempReport);
            }
          }
        }
      }
    };

    saveReportsAfterCompletion();
  }, [batchState, applicationResults, applicationValuesMap, batchSummary.totalProcessingTimeMs, savedReports.length]);

  /**
   * Handle downloading saved reports as JSON
   * In v2, downloads all saved reports (one per application)
   */
  const handleDownloadReportJson = useCallback(() => {
    if (savedReports.length > 0) {
      // Download each saved report
      for (const report of savedReports) {
        downloadReportJson(report);
      }
    } else if (pendingReportData) {
      downloadReportJson(pendingReportData);
    }
  }, [savedReports, pendingReportData]);

  /**
   * Handle dismissing the save error
   */
  const handleDismissSaveError = useCallback(() => {
    setSaveError(null);
    setIsQuotaError(false);
  }, []);

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

    // First, try to get images from the batch result (most reliable after verification)
    const batchResult = applicationResults.get(selectedApplicationId);
    if (batchResult?.images && batchResult.images.length > 0) {
      return batchResult.images.map((img) => img.previewUrl);
    }

    // Fallback: Check if it's a grouped application
    const group = groups.find((g) => g.id === selectedApplicationId);
    if (group) {
      return group.images.map((img) => img.previewUrl);
    }

    // Fallback: Check if it's an ungrouped application
    const ungroupedId = selectedApplicationId.replace('ungrouped-', '');
    const ungroupedImage = ungroupedImages.find((img) => img.id === ungroupedId);
    if (ungroupedImage) {
      return [ungroupedImage.previewUrl];
    }

    return [];
  }, [selectedApplicationId, applicationResults, groups, ungroupedImages]);

  /**
   * Get image names for the selected application (used as alt text)
   */
  const selectedAppImageNames = useMemo<string[]>(() => {
    if (!selectedApplicationId) return [];

    // First, try to get images from the batch result (most reliable after verification)
    const batchResult = applicationResults.get(selectedApplicationId);
    if (batchResult?.images && batchResult.images.length > 0) {
      return batchResult.images.map((img) => img.name);
    }

    // Fallback: Check if it's a grouped application
    const group = groups.find((g) => g.id === selectedApplicationId);
    if (group) {
      return group.images.map((img) => img.name);
    }

    // Fallback: Check if it's an ungrouped application
    const ungroupedId = selectedApplicationId.replace('ungrouped-', '');
    const ungroupedImage = ungroupedImages.find((img) => img.id === ungroupedId);
    if (ungroupedImage) {
      return [ungroupedImage.name];
    }

    return [];
  }, [selectedApplicationId, applicationResults, groups, ungroupedImages]);

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

      {/* Applications section - consolidated view */}
      {!hasResults && (
        hasApplications ? (
          <ApplicationListCard
            applications={applicationsForModal}
            applicationValuesMap={applicationValuesMap}
            onUpdateValues={handleApplicationValuesChange}
            onRunVerification={handleRunBatchVerification}
            isProcessing={isProcessing}
            canRunVerification={canRunVerification}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" aria-hidden="true" />
                Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8">
                <Layers className="h-8 w-8 text-zinc-400" aria-hidden="true" />
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                  No applications detected.
                </p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                  Upload images to see detected applications.
                </p>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* Batch Actions - retry button and re-run after results */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {hasResults && (
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
                Run Verification
              </>
            )}
          </Button>
        )}
        {hasFailedApplications && (
          <Button
            variant="secondary"
            size="md"
            onClick={handleRetryFailed}
            disabled={isProcessing}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry Failed
            <span className="ml-1 text-xs">({batchSummary.error})</span>
          </Button>
        )}
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
          {/* Reports saved notification (v2: one report per application) */}
          {savedReports.length > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
              <ClipboardList className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>
                {savedReports.length} report{savedReports.length !== 1 ? 's' : ''} saved automatically.
              </span>
              <div className="ml-auto flex items-center gap-3">
                <a
                  href="/reports"
                  className="font-medium underline hover:no-underline"
                >
                  View in Reports
                </a>
              </div>
            </div>
          )}

          {/* Save error notification - special handling for quota exceeded */}
          {saveError && isQuotaError && (
            <div className="mb-4">
              <ErrorBanner
                message="Storage Quota Exceeded"
                description={saveError}
                severity="error"
                isQuotaError={true}
                onDismiss={handleDismissSaveError}
                onDownload={handleDownloadReportJson}
                downloadLabel="Download Report Now"
              />
            </div>
          )}

          {/* Regular save error notification */}
          {saveError && !isQuotaError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              <ClipboardList className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>Could not save report: {saveError}</span>
              <button
                onClick={handleDownloadReportJson}
                className="ml-auto font-medium underline hover:no-underline"
              >
                Download report instead
              </button>
            </div>
          )}

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

              {/* Processing progress indicator */}
              {isProcessing && (
                <div className="mb-4">
                  <ProcessingProgress
                    current={batchSummary.total - batchSummary.pending}
                    total={batchSummary.total}
                    label="Processing applications"
                  />
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
                <LoadingState
                  type={selectedApplicationResult.status === 'queued' ? 'loading' : 'extracting'}
                  message={selectedApplicationResult.status === 'queued' ? 'Waiting in queue...' : 'Processing...'}
                  description={selectedApplicationResult.status === 'queued' 
                    ? 'This application will be processed shortly.' 
                    : 'Extracting data from label images.'}
                  size="sm"
                />
              ) : selectedApplicationResult.status === 'error' && !selectedApplicationResult.result ? (
                <ApplicationErrorCard
                  errorType={detectErrorType(selectedApplicationResult.errorMessage || 'Processing error')}
                  errorMessage={selectedApplicationResult.errorMessage}
                  applicationName={selectedApplicationResult.applicationName}
                  totalImageCount={selectedApplicationResult.imageCount}
                  onRetry={handleRetryFailed}
                />
              ) : selectedApplicationResult.result ? (
                <div className="space-y-3">
                  {/* Mis-grouping warning */}
                  {selectedApplicationResult.misgroupWarning && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500 dark:text-amber-400 mt-0.5" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                          Possible Mis-grouping Detected
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                          {selectedApplicationResult.misgroupWarning}
                        </p>
                        <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                          Consider splitting this group if images belong to different products.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Missing warning hint */}
                  {selectedApplicationResult.missingWarning && selectedApplicationResult.imageCount === 1 && (
                    <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
                      <Info className="h-4 w-4 flex-shrink-0 text-blue-500 dark:text-blue-400 mt-0.5" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          Government Warning Not Found
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                          Try uploading the back label if you have not already.
                        </p>
                      </div>
                    </div>
                  )}

                  <ResultsDetails
                    result={selectedApplicationResult.result}
                    extractedValues={selectedApplicationResult.extractedValues || undefined}
                    imagePreviewUrls={selectedAppImageUrls}
                    imageAltTexts={selectedAppImageNames}
                  />
                </div>
              ) : null}
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
