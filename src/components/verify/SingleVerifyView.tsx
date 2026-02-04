'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, Play, ClipboardList, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { UploadDropzone } from './UploadDropzone';
import { ThumbnailList } from './ThumbnailList';
import { ApplicationValuesForm } from './ApplicationValuesForm';
import { ResultsSummary } from './ResultsSummary';
import { ResultsDetails } from './ResultsDetails';
import { useImageUpload } from './useImageUpload';
import { useApplicationValues } from './useApplicationValues';
import { useVerification, type VerificationResult } from './useVerification';
import { generateUUID, safeJsonStringifyPretty, saveReport, downloadReportJson, type CreateReportParams } from '@/lib/utils';
import type { ReportApplication, Report } from '@/lib/types';

/**
 * SingleVerifyView component for verifying a single application
 * comprised of one or more label images.
 * 
 * Pipeline:
 * 1. Upload images → display thumbnails with status
 * 2. Optionally fill in application values
 * 3. Run Verification → extract data from each image
 * 4. Merge extractions → validate → render results
 */
export function SingleVerifyView() {
  // Generate a stable application ID for this session
  const [applicationId] = useState(() => generateUUID());
  
  const {
    images,
    addFiles,
    removeImage,
    updateImageStatus,
    hasImages,
    isProcessing: isUploading,
  } = useImageUpload();

  const {
    values: applicationValues,
    setValues: setApplicationValues,
  } = useApplicationValues();

  const {
    state: verificationState,
    result: verificationResult,
    errorMessage,
    runVerification,
    retry,
  } = useVerification({
    applicationId,
    applicationName: 'Label Application',
  });

  // UI state
  const [showDetails, setShowDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [savedReport, setSavedReport] = useState<Report | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Determine if verification can be run
  const isProcessing = verificationState === 'processing';
  const canRunVerification = hasImages && !isProcessing && !isUploading;
  const hasResults = verificationResult !== null;

  /**
   * Handle running verification
   */
  const handleRunVerification = useCallback(async () => {
    // Reset states
    setSavedReport(null);
    setSaveError(null);

    // Reset all image statuses to queued
    images.forEach((img) => {
      updateImageStatus(img.id, 'queued');
    });

    const result = await runVerification(
      images,
      applicationValues,
      (imageId, status, error) => {
        updateImageStatus(imageId, status, error);
      }
    );

    // Auto-save report after verification completes
    if (result && result.applicationResult) {
      const reportApp: ReportApplication = {
        id: applicationId,
        name: 'Label Application',
        imageCount: images.length,
        extractedValues: result.extractedValues,
        applicationValues: applicationValues,
        result: result.applicationResult,
      };

      const params: CreateReportParams = {
        mode: 'single',
        applications: [reportApp],
        totalDurationMs: result.processingTimeMs,
      };

      const saveResult = await saveReport(params);
      if (saveResult.success) {
        setSavedReport(saveResult.data);
      } else {
        setSaveError(saveResult.error.message);
      }
    }
  }, [images, applicationValues, runVerification, updateImageStatus, applicationId]);

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    
    // Reset all image statuses to queued
    images.forEach((img) => {
      updateImageStatus(img.id, 'queued');
    });

    await retry(
      images,
      applicationValues,
      (imageId, status, error) => {
        updateImageStatus(imageId, status, error);
      }
    );
    
    setIsRetrying(false);
  }, [images, applicationValues, retry, updateImageStatus]);

  /**
   * Handle downloading results as JSON
   */
  const handleDownloadJson = useCallback(() => {
    if (savedReport) {
      // Download the saved report
      downloadReportJson(savedReport);
    } else if (verificationResult) {
      // Fallback: create a temporary report structure for download
      const reportData = {
        id: applicationId,
        createdAt: new Date().toISOString(),
        mode: 'single',
        applicationResult: verificationResult.applicationResult,
        extractedValues: verificationResult.extractedValues,
        applicationValues,
        processingTimeMs: verificationResult.processingTimeMs,
      };

      const json = safeJsonStringifyPretty(reportData);
      if (!json) return;

      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `label-verify-${applicationId.slice(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [verificationResult, applicationId, applicationValues, savedReport]);

  /**
   * Get suggestions from extracted values
   */
  const suggestions = verificationResult?.extractedValues;

  return (
    <div className="space-y-6">
      {/* Upload section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" aria-hidden="true" />
            Upload Label Images
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UploadDropzone
            onFilesAccepted={addFiles}
            disabled={isProcessing}
            helperText="Upload front, back, and any additional label panels for this application."
          />
          <ThumbnailList
            images={images}
            onRemove={removeImage}
            canRemove={!isProcessing}
          />
        </CardContent>
      </Card>

      {/* Application Values section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" aria-hidden="true" />
            Application Values
            <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
              (Optional)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ApplicationValuesForm
            values={applicationValues}
            onChange={setApplicationValues}
            suggestions={suggestions}
            disabled={isProcessing}
          />
        </CardContent>
      </Card>

      {/* Run Verification CTA */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleRunVerification}
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
      </div>

      {/* Results section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
            Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasResults && !isProcessing && (
            <div className="flex flex-col items-center justify-center py-8">
              <ClipboardList className="h-8 w-8 text-zinc-400" aria-hidden="true" />
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                No results yet.
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                Upload label images and run verification to see results.
              </p>
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" aria-hidden="true" />
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                Processing images...
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                Extracting data and validating labels.
              </p>
            </div>
          )}

          {hasResults && !isProcessing && (
            <div className="space-y-4">
              {/* Report saved notification */}
              {savedReport && (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
                  <ClipboardList className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>Report saved automatically.</span>
                  <a
                    href={`/reports/${savedReport.id}`}
                    className="ml-auto font-medium underline hover:no-underline"
                  >
                    View in Reports
                  </a>
                </div>
              )}

              {/* Save error notification */}
              {saveError && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  <ClipboardList className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>Could not save report: {saveError}</span>
                  <button
                    onClick={handleDownloadJson}
                    className="ml-auto font-medium underline hover:no-underline"
                  >
                    Download JSON instead
                  </button>
                </div>
              )}

              <ResultsSummary
                result={verificationResult.applicationResult}
                onViewDetails={() => setShowDetails(!showDetails)}
                onDownloadJson={handleDownloadJson}
                onRetry={verificationResult.applicationResult.overallStatus === 'error' ? handleRetry : undefined}
                isRetrying={isRetrying}
                detailsExpanded={showDetails}
              />

              {showDetails && (
                <ResultsDetails
                  result={verificationResult.applicationResult}
                  extractedValues={verificationResult.extractedValues}
                  imagePreviewUrls={images.map((img) => img.previewUrl)}
                  imageAltTexts={images.map((img) => img.name)}
                />
              )}
            </div>
          )}

          {/* Error message display */}
          {errorMessage && verificationState === 'error' && !hasResults && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-center">
                <p className="text-sm text-red-700 dark:text-red-300">
                  {errorMessage}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={handleRetry}
                  disabled={isRetrying}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
