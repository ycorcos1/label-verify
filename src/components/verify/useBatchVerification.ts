'use client';

import { useState, useCallback, useRef } from 'react';
import pLimit from 'p-limit';
import type {
  ImageItemWithStatus,
  ApplicationGroup,
  ExtractionResponse,
  ExtractedValues,
  ApplicationValues,
  ApplicationResult,
  OverallStatus,
} from '@/lib/types';
import {
  mergeRawExtractions,
  resizeImageIfNeeded,
  generateUUID,
  type MergedExtractionResult,
} from '@/lib/utils';
import { computeApplicationResult, computeErrorResult } from '@/lib/validation';

// ============================================================================
// Types
// ============================================================================

export type BatchApplicationStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'error';

export interface BatchApplicationResult {
  /** Application group ID */
  applicationId: string;
  /** Application name */
  applicationName: string;
  /** Current processing status */
  status: BatchApplicationStatus;
  /** Verification result (null until completed) */
  result: ApplicationResult | null;
  /** Extracted values (null until completed) */
  extractedValues: ExtractedValues | null;
  /** Merge result with provenance (null until completed) */
  mergeResult: MergedExtractionResult | null;
  /** Processing time in milliseconds (null until completed) */
  processingTimeMs: number | null;
  /** Error message if status is 'error' */
  errorMessage?: string;
  /** Image count */
  imageCount: number;
  /** Warning if possible mis-grouping detected (brands disagree) */
  misgroupWarning?: string;
  /** Whether the government warning was not found */
  missingWarning?: boolean;
  /** Original image files for thumbnail generation */
  images?: ImageItemWithStatus[];
}

export interface BatchVerificationSummary {
  /** Total number of applications */
  total: number;
  /** Number of applications that passed */
  pass: number;
  /** Number of applications that failed */
  fail: number;
  /** Number of applications needing review */
  needsReview: number;
  /** Number of applications with errors */
  error: number;
  /** Number of applications still processing/queued */
  pending: number;
  /** Total processing time in milliseconds */
  totalProcessingTimeMs: number;
}

export type BatchVerificationState =
  | 'idle'
  | 'processing'
  | 'completed'
  | 'partial_error';

export interface UseBatchVerificationOptions {
  /** Concurrency limit for parallel application processing (default: 3) */
  concurrencyLimit?: number;
}

export interface UseBatchVerificationReturn {
  /** Current batch verification state */
  state: BatchVerificationState;
  /** Per-application results */
  applicationResults: Map<string, BatchApplicationResult>;
  /** Summary statistics */
  summary: BatchVerificationSummary;
  /** Run batch verification on the provided applications */
  runBatchVerification: (
    groups: ApplicationGroup[],
    ungroupedImages: ImageItemWithStatus[],
    applicationValuesMap?: Map<string, ApplicationValues>,
    onImageStatusChange?: (imageId: string, status: ImageItemWithStatus['status'], errorMessage?: string) => void
  ) => Promise<void>;
  /** Retry failed applications */
  retryFailed: (
    groups: ApplicationGroup[],
    ungroupedImages: ImageItemWithStatus[],
    applicationValuesMap?: Map<string, ApplicationValues>,
    onImageStatusChange?: (imageId: string, status: ImageItemWithStatus['status'], errorMessage?: string) => void
  ) => Promise<void>;
  /** Reset to idle state */
  reset: () => void;
  /** Get result for a specific application */
  getApplicationResult: (applicationId: string) => BatchApplicationResult | undefined;
  /** Filter applications by overall status */
  filterByStatus: (status: OverallStatus | 'all') => BatchApplicationResult[];
}

// ============================================================================
// API Call Helper
// ============================================================================

interface ExtractApiResponse {
  success: boolean;
  data?: ExtractionResponse;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

/**
 * Calls the /api/extract endpoint with an image
 */
async function extractFromImage(imageDataUrl: string): Promise<ExtractionResponse> {
  const response = await fetch('/api/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image: imageDataUrl }),
  });

  const result: ExtractApiResponse = await response.json();

  if (!response.ok || !result.success) {
    const errorMsg = result.error?.message || 'Failed to extract data from image';
    throw new Error(errorMsg);
  }

  if (!result.data) {
    throw new Error('No extraction data returned');
  }

  return result.data;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook to manage batch verification with controlled concurrency.
 * 
 * Features:
 * - Processes multiple applications in parallel (controlled by p-limit)
 * - Extracts images sequentially within each application
 * - Merges extractions and validates
 * - Progressive updates as each application completes
 * - Retry failed applications
 */
export function useBatchVerification(
  options: UseBatchVerificationOptions = {}
): UseBatchVerificationReturn {
  const { concurrencyLimit = 3 } = options;

  const [state, setState] = useState<BatchVerificationState>('idle');
  const [applicationResults, setApplicationResults] = useState<Map<string, BatchApplicationResult>>(new Map());
  
  // Track failed application IDs for retry
  const failedApplicationIds = useRef<Set<string>>(new Set());

  /**
   * Compute summary from current results
   */
  const computeSummary = useCallback((results: Map<string, BatchApplicationResult>): BatchVerificationSummary => {
    let pass = 0;
    let fail = 0;
    let needsReview = 0;
    let error = 0;
    let pending = 0;
    let totalProcessingTimeMs = 0;

    for (const result of results.values()) {
      if (result.status === 'queued' || result.status === 'processing') {
        pending++;
      } else if (result.status === 'error') {
        error++;
      } else if (result.result) {
        totalProcessingTimeMs += result.processingTimeMs || 0;
        switch (result.result.overallStatus) {
          case 'pass':
            pass++;
            break;
          case 'fail':
            fail++;
            break;
          case 'needs_review':
            needsReview++;
            break;
          case 'error':
            error++;
            break;
        }
      }
    }

    return {
      total: results.size,
      pass,
      fail,
      needsReview,
      error,
      pending,
      totalProcessingTimeMs,
    };
  }, []);

  const summary = computeSummary(applicationResults);

  /**
   * Update a single application result
   */
  const updateApplicationResult = useCallback(
    (applicationId: string, update: Partial<BatchApplicationResult>) => {
      setApplicationResults((prev) => {
        const next = new Map(prev);
        const existing = next.get(applicationId);
        if (existing) {
          next.set(applicationId, { ...existing, ...update });
        }
        return next;
      });
    },
    []
  );

  /**
   * Process a single image (resize + extract)
   */
  const processImage = useCallback(
    async (
      image: ImageItemWithStatus,
      onStatusChange?: (imageId: string, status: ImageItemWithStatus['status'], errorMessage?: string) => void
    ): Promise<ExtractionResponse | null> => {
      try {
        onStatusChange?.(image.id, 'processing');

        // Resize image if needed
        const { dataUrl } = await resizeImageIfNeeded(image.file, 4 * 1024 * 1024, {
          maxWidth: 2048,
          maxHeight: 2048,
          quality: 0.85,
        });

        // Call the extraction API
        const extraction = await extractFromImage(dataUrl);

        onStatusChange?.(image.id, 'completed');
        return extraction;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        onStatusChange?.(image.id, 'error', message);
        return null;
      }
    },
    []
  );

  /**
   * Process a single application (all its images)
   */
  const processApplication = useCallback(
    async (
      applicationId: string,
      applicationName: string,
      images: ImageItemWithStatus[],
      applicationValues?: ApplicationValues,
      onImageStatusChange?: (imageId: string, status: ImageItemWithStatus['status'], errorMessage?: string) => void
    ): Promise<BatchApplicationResult> => {
      const startTime = performance.now();

      // Update status to processing
      updateApplicationResult(applicationId, { status: 'processing' });

      // Mark all images as queued first
      for (const image of images) {
        onImageStatusChange?.(image.id, 'queued');
      }

      const extractions: ExtractionResponse[] = [];
      let hasErrors = false;

      // Process each image sequentially within this application
      for (const image of images) {
        const extraction = await processImage(image, onImageStatusChange);
        if (extraction) {
          extractions.push(extraction);
        } else {
          hasErrors = true;
        }
      }

      const processingTimeMs = performance.now() - startTime;

      // If all extractions failed
      if (extractions.length === 0) {
        const errorResult = computeErrorResult(
          applicationId,
          applicationName,
          'Failed to extract data from all images',
          images.length
        );

        failedApplicationIds.current.add(applicationId);

        const batchResult: BatchApplicationResult = {
          applicationId,
          applicationName,
          status: 'error',
          result: errorResult,
          extractedValues: {},
          mergeResult: null,
          processingTimeMs,
          errorMessage: 'Failed to extract data from all images',
          imageCount: images.length,
          images, // Store images for thumbnail generation later
        };

        updateApplicationResult(applicationId, batchResult);
        return batchResult;
      }

      // Merge extractions
      const mergeResult = mergeRawExtractions(extractions);

      // Detect mis-grouping: check if brand names conflict across images
      let misgroupWarning: string | undefined;
      if (mergeResult.provenance.brand?.needsReview && mergeResult.provenance.brand.conflictingCandidates) {
        const candidates = mergeResult.provenance.brand.conflictingCandidates;
        if (candidates.length >= 2) {
          misgroupWarning = `Possible mis-grouping detected: found different brand names "${candidates[0]}" and "${candidates[1]}"`;
        }
      }

      // Detect missing government warning
      const missingWarning = !mergeResult.extractedValues.governmentWarning;

      // Compute application result
      const appResult = computeApplicationResult(
        mergeResult.extractedValues,
        applicationValues,
        mergeResult,
        applicationId,
        applicationName,
        processingTimeMs,
        images.length
      );

      // If some images failed but we got partial results
      if (hasErrors && appResult.overallStatus !== 'error') {
        appResult.topReasons.push('Some images failed to process');
      }

      // Add mis-grouping warning to top reasons if detected
      if (misgroupWarning && !appResult.topReasons.includes(misgroupWarning)) {
        appResult.topReasons.unshift(misgroupWarning);
      }

      // Add missing warning hint if detected and only one image uploaded
      if (missingWarning && images.length === 1) {
        const missingHint = 'Government warning not found - try uploading the back label';
        if (!appResult.topReasons.some(r => r.includes('warning'))) {
          appResult.topReasons.push(missingHint);
        }
      }

      const batchResult: BatchApplicationResult = {
        applicationId,
        applicationName,
        status: 'completed',
        result: appResult,
        extractedValues: mergeResult.extractedValues,
        mergeResult,
        processingTimeMs,
        imageCount: images.length,
        misgroupWarning,
        missingWarning,
        images, // Store images for thumbnail generation later
      };

      updateApplicationResult(applicationId, batchResult);
      return batchResult;
    },
    [processImage, updateApplicationResult]
  );

  /**
   * Run batch verification on all applications
   */
  const runBatchVerification = useCallback(
    async (
      groups: ApplicationGroup[],
      ungroupedImages: ImageItemWithStatus[],
      applicationValuesMap?: Map<string, ApplicationValues>,
      onImageStatusChange?: (imageId: string, status: ImageItemWithStatus['status'], errorMessage?: string) => void
    ): Promise<void> => {
      // Reset state
      failedApplicationIds.current.clear();
      setState('processing');

      // Build list of all applications to process
      const applications: Array<{
        id: string;
        name: string;
        images: ImageItemWithStatus[];
      }> = [];

      // Add grouped applications
      for (const group of groups) {
        applications.push({
          id: group.id,
          name: group.name,
          images: group.images,
        });
      }

      // Add ungrouped images as individual applications
      for (const image of ungroupedImages) {
        const id = `ungrouped-${image.id}`;
        applications.push({
          id,
          name: image.name.replace(/\.[^/.]+$/, ''), // Remove extension for display name
          images: [image],
        });
      }

      // Initialize all applications as queued
      const initialResults = new Map<string, BatchApplicationResult>();
      for (const app of applications) {
        initialResults.set(app.id, {
          applicationId: app.id,
          applicationName: app.name,
          status: 'queued',
          result: null,
          extractedValues: null,
          mergeResult: null,
          processingTimeMs: null,
          imageCount: app.images.length,
        });
      }
      setApplicationResults(initialResults);

      // Create concurrency limiter
      const limit = pLimit(concurrencyLimit);

      // Process all applications with controlled concurrency
      const promises = applications.map((app) =>
        limit(() =>
          processApplication(
            app.id,
            app.name,
            app.images,
            applicationValuesMap?.get(app.id),
            onImageStatusChange
          )
        )
      );

      await Promise.all(promises);

      // Determine final state
      const finalResults = applicationResults;
      let hasAnyError = false;
      for (const result of finalResults.values()) {
        if (result.status === 'error' || result.result?.overallStatus === 'error') {
          hasAnyError = true;
          break;
        }
      }

      setState(hasAnyError ? 'partial_error' : 'completed');
    },
    [concurrencyLimit, processApplication, applicationResults]
  );

  /**
   * Retry only failed applications
   */
  const retryFailed = useCallback(
    async (
      groups: ApplicationGroup[],
      ungroupedImages: ImageItemWithStatus[],
      applicationValuesMap?: Map<string, ApplicationValues>,
      onImageStatusChange?: (imageId: string, status: ImageItemWithStatus['status'], errorMessage?: string) => void
    ): Promise<void> => {
      if (failedApplicationIds.current.size === 0) {
        return;
      }

      setState('processing');

      // Build list of failed applications to retry
      const failedIds = failedApplicationIds.current;
      const applications: Array<{
        id: string;
        name: string;
        images: ImageItemWithStatus[];
      }> = [];

      // Find failed grouped applications
      for (const group of groups) {
        if (failedIds.has(group.id)) {
          applications.push({
            id: group.id,
            name: group.name,
            images: group.images,
          });
        }
      }

      // Find failed ungrouped applications
      for (const image of ungroupedImages) {
        const id = `ungrouped-${image.id}`;
        if (failedIds.has(id)) {
          applications.push({
            id,
            name: image.name.replace(/\.[^/.]+$/, ''),
            images: [image],
          });
        }
      }

      // Clear failed IDs before retry
      failedApplicationIds.current.clear();

      // Mark retrying applications as queued
      for (const app of applications) {
        updateApplicationResult(app.id, {
          status: 'queued',
          result: null,
          extractedValues: null,
          mergeResult: null,
          processingTimeMs: null,
          errorMessage: undefined,
        });
      }

      // Create concurrency limiter
      const limit = pLimit(concurrencyLimit);

      // Process failed applications with controlled concurrency
      const promises = applications.map((app) =>
        limit(() =>
          processApplication(
            app.id,
            app.name,
            app.images,
            applicationValuesMap?.get(app.id),
            onImageStatusChange
          )
        )
      );

      await Promise.all(promises);

      // Determine final state
      let hasAnyError = false;
      for (const result of applicationResults.values()) {
        if (result.status === 'error' || result.result?.overallStatus === 'error') {
          hasAnyError = true;
          break;
        }
      }

      setState(hasAnyError ? 'partial_error' : 'completed');
    },
    [concurrencyLimit, processApplication, updateApplicationResult, applicationResults]
  );

  /**
   * Reset to idle state
   */
  const reset = useCallback(() => {
    setState('idle');
    setApplicationResults(new Map());
    failedApplicationIds.current.clear();
  }, []);

  /**
   * Get result for a specific application
   */
  const getApplicationResult = useCallback(
    (applicationId: string): BatchApplicationResult | undefined => {
      return applicationResults.get(applicationId);
    },
    [applicationResults]
  );

  /**
   * Filter applications by overall status
   */
  const filterByStatus = useCallback(
    (status: OverallStatus | 'all'): BatchApplicationResult[] => {
      const results = Array.from(applicationResults.values());
      
      if (status === 'all') {
        return results;
      }

      return results.filter((r) => {
        if (status === 'error') {
          return r.status === 'error' || r.result?.overallStatus === 'error';
        }
        return r.result?.overallStatus === status;
      });
    },
    [applicationResults]
  );

  return {
    state,
    applicationResults,
    summary,
    runBatchVerification,
    retryFailed,
    reset,
    getApplicationResult,
    filterByStatus,
  };
}
