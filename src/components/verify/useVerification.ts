'use client';

import { useState, useCallback } from 'react';
import type {
  ImageItemWithStatus,
  ExtractionResponse,
  ExtractedValues,
  ApplicationValues,
  ApplicationResult,
} from '@/lib/types';
import {
  mergeRawExtractions,
  resizeImageIfNeeded,
  type MergedExtractionResult,
} from '@/lib/utils';
import { computeApplicationResult, computeErrorResult } from '@/lib/validation';

// ============================================================================
// Types
// ============================================================================

export type VerificationState =
  | 'idle'
  | 'processing'
  | 'completed'
  | 'error';

export interface VerificationResult {
  /** The merged extracted values from all images */
  extractedValues: ExtractedValues;
  /** Merge result with provenance information */
  mergeResult: MergedExtractionResult;
  /** The application-level validation result */
  applicationResult: ApplicationResult;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

export interface UseVerificationOptions {
  /** Application ID (optional, will be generated if not provided) */
  applicationId?: string;
  /** Application name (optional, defaults to "Application") */
  applicationName?: string;
}

export interface UseVerificationReturn {
  /** Current verification state */
  state: VerificationState;
  /** Verification result (null until completed) */
  result: VerificationResult | null;
  /** Error message if state is 'error' */
  errorMessage: string | null;
  /** Run verification on the provided images */
  runVerification: (
    images: ImageItemWithStatus[],
    applicationValues?: ApplicationValues,
    onImageStatusChange?: (imageId: string, status: ImageItemWithStatus['status'], errorMessage?: string) => void
  ) => Promise<VerificationResult | null>;
  /** Reset to idle state */
  reset: () => void;
  /** Retry verification after an error */
  retry: (
    images: ImageItemWithStatus[],
    applicationValues?: ApplicationValues,
    onImageStatusChange?: (imageId: string, status: ImageItemWithStatus['status'], errorMessage?: string) => void
  ) => Promise<VerificationResult | null>;
  /** Per-image extraction results (for debugging/advanced display) */
  imageExtractions: Map<string, ExtractionResponse>;
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
 * Hook to manage the complete verification pipeline:
 * 1. Resize images (client-side)
 * 2. Extract data from each image via API
 * 3. Merge extractions into application-level values
 * 4. Validate against application values (if provided)
 */
export function useVerification(
  options: UseVerificationOptions = {}
): UseVerificationReturn {
  const { applicationId, applicationName = 'Application' } = options;

  const [state, setState] = useState<VerificationState>('idle');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageExtractions, setImageExtractions] = useState<Map<string, ExtractionResponse>>(new Map());

  /**
   * Extracts data from a single image, handling resize and API call
   */
  const extractSingleImage = useCallback(
    async (
      image: ImageItemWithStatus,
      onStatusChange?: (status: ImageItemWithStatus['status'], errorMessage?: string) => void
    ): Promise<ExtractionResponse | null> => {
      try {
        // Update status to processing
        onStatusChange?.('processing');

        // Resize image if needed (to reduce API payload)
        const { dataUrl } = await resizeImageIfNeeded(image.file, 4 * 1024 * 1024, {
          maxWidth: 2048,
          maxHeight: 2048,
          quality: 0.85,
        });

        // Call the extraction API
        const extraction = await extractFromImage(dataUrl);

        // Update status to completed
        onStatusChange?.('completed');

        return extraction;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        onStatusChange?.('error', message);
        return null;
      }
    },
    []
  );

  /**
   * Run the complete verification pipeline
   */
  const runVerification = useCallback(
    async (
      images: ImageItemWithStatus[],
      applicationValues?: ApplicationValues,
      onImageStatusChange?: (imageId: string, status: ImageItemWithStatus['status'], errorMessage?: string) => void
    ): Promise<VerificationResult | null> => {
      if (images.length === 0) {
        setErrorMessage('No images provided');
        setState('error');
        return null;
      }

      const startTime = performance.now();
      setState('processing');
      setErrorMessage(null);
      setResult(null);

      const extractions: ExtractionResponse[] = [];
      const extractionMap = new Map<string, ExtractionResponse>();
      let hasErrors = false;

      // Process each image sequentially
      for (const image of images) {
        const extraction = await extractSingleImage(image, (status, error) => {
          onImageStatusChange?.(image.id, status, error);
        });

        if (extraction) {
          extractions.push(extraction);
          extractionMap.set(image.id, extraction);
        } else {
          hasErrors = true;
        }
      }

      setImageExtractions(extractionMap);

      // If all extractions failed, report error
      if (extractions.length === 0) {
        const appId = applicationId || crypto.randomUUID();
        const errorResult = computeErrorResult(
          appId,
          applicationName,
          'Failed to extract data from all images',
          images.length
        );

        setErrorMessage('Failed to extract data from all images');
        setState('error');

        const errorVerificationResult: VerificationResult = {
          extractedValues: {},
          mergeResult: {
            extractedValues: {},
            provenance: {} as MergedExtractionResult['provenance'],
            hasConflicts: false,
            conflictCount: 0,
            contributingImageIndices: [],
          },
          applicationResult: errorResult,
          processingTimeMs: performance.now() - startTime,
        };

        setResult(errorVerificationResult);
        return errorVerificationResult;
      }

      // Merge extractions from multiple images
      const mergeResult = mergeRawExtractions(extractions);

      // Compute processing time
      const processingTimeMs = performance.now() - startTime;

      // Validate against application values
      const appId = applicationId || crypto.randomUUID();
      const applicationResult = computeApplicationResult(
        mergeResult.extractedValues,
        applicationValues,
        mergeResult,
        appId,
        applicationName,
        processingTimeMs,
        images.length
      );

      // If some images failed but we got partial results, mark as needs review
      if (hasErrors && applicationResult.overallStatus !== 'error') {
        applicationResult.topReasons.push('Some images failed to process');
      }

      // Detect mis-grouping: check if brand names conflict across images
      if (mergeResult.provenance.brand?.needsReview && mergeResult.provenance.brand.conflictingCandidates) {
        const candidates = mergeResult.provenance.brand.conflictingCandidates;
        if (candidates.length >= 2) {
          const misgroupWarning = `Possible mis-grouping: found different brand names "${candidates[0]}" and "${candidates[1]}"`;
          if (!applicationResult.topReasons.includes(misgroupWarning)) {
            applicationResult.topReasons.unshift(misgroupWarning);
          }
        }
      }

      // Add missing warning hint if only one image was uploaded
      const missingWarning = !mergeResult.extractedValues.governmentWarning;
      if (missingWarning && images.length === 1) {
        const missingHint = 'Government warning not found - try uploading the back label';
        if (!applicationResult.topReasons.some(r => r.toLowerCase().includes('warning'))) {
          applicationResult.topReasons.push(missingHint);
        }
      }

      const verificationResult: VerificationResult = {
        extractedValues: mergeResult.extractedValues,
        mergeResult,
        applicationResult,
        processingTimeMs,
      };

      setResult(verificationResult);
      setState(hasErrors ? 'error' : 'completed');

      return verificationResult;
    },
    [extractSingleImage, applicationId, applicationName]
  );

  /**
   * Reset to idle state
   */
  const reset = useCallback(() => {
    setState('idle');
    setResult(null);
    setErrorMessage(null);
    setImageExtractions(new Map());
  }, []);

  /**
   * Retry verification after an error
   */
  const retry = useCallback(
    async (
      images: ImageItemWithStatus[],
      applicationValues?: ApplicationValues,
      onImageStatusChange?: (imageId: string, status: ImageItemWithStatus['status'], errorMessage?: string) => void
    ) => {
      reset();
      return runVerification(images, applicationValues, onImageStatusChange);
    },
    [reset, runVerification]
  );

  return {
    state,
    result,
    errorMessage,
    runVerification,
    reset,
    retry,
    imageExtractions,
  };
}
