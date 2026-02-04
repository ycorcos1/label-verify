'use client';

import { useState, useCallback } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Eye, Shield, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, StatusBadge, ImagePreviewModal } from '@/components/ui';
import type {
  ApplicationResult,
  FieldResult,
  WarningResult,
  FieldStatus,
  ExtractedValues,
} from '@/lib/types';

// ============================================================================
// Types
// ============================================================================

export interface ResultsDetailsProps {
  /** The verification result to display */
  result: ApplicationResult;
  /** Extracted values (for displaying suggestions) */
  extractedValues?: ExtractedValues;
  /** Image previews for showing source images (optional) */
  imagePreviewUrls?: string[];
  /** Image alt texts (optional) */
  imageAltTexts?: string[];
  /** Whether to show the built-in image preview modal (default: true) */
  showImagePreviewModal?: boolean;
  /** External callback when an image is clicked (used when parent manages modal) */
  onImagePreview?: (imageIndex: number) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Maps FieldStatus to StatusBadge status type
 */
function mapFieldStatusToStatusType(status: FieldStatus): 'pass' | 'fail' | 'needs_review' | 'missing' | 'not_provided' {
  switch (status) {
    case 'pass':
      return 'pass';
    case 'fail':
      return 'fail';
    case 'needs_review':
      return 'needs_review';
    case 'missing':
      return 'missing';
    case 'not_provided':
      return 'not_provided';
    default:
      return 'missing';
  }
}

/**
 * Gets a row background color based on status
 */
function getStatusRowClass(status: FieldStatus): string {
  switch (status) {
    case 'pass':
      return 'bg-emerald-50/50 dark:bg-emerald-950/20';
    case 'fail':
    case 'missing':
      return 'bg-red-50/50 dark:bg-red-950/20';
    case 'needs_review':
      return 'bg-amber-50/50 dark:bg-amber-950/20';
    default:
      return '';
  }
}

/**
 * Truncates text with ellipsis
 */
function truncateText(text: string | undefined, maxLength: number): string {
  if (!text) return '—';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// ============================================================================
// Sub-Components
// ============================================================================

interface WarningBlockProps {
  warningResult: WarningResult;
}

/**
 * Gets the appropriate icon for a warning status
 */
function getWarningIcon(status: FieldStatus) {
  switch (status) {
    case 'pass':
      return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />;
    case 'fail':
    case 'missing':
      return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />;
  }
}

/**
 * Government Warning block - pinned at top of details
 * 
 * This is the most prominent validation result, displayed with
 * enhanced visual styling to draw attention and make reviews fast.
 */
function WarningBlock({ warningResult }: WarningBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const hasWarning = !!warningResult.extractedWarning;
  const warningText = warningResult.extractedWarning || 'Not found on label';
  const isLong = warningText.length > 200;

  const overallStatusType = mapFieldStatusToStatusType(warningResult.overallStatus);
  const wordingStatusType = mapFieldStatusToStatusType(warningResult.wordingStatus);
  const uppercaseStatusType = mapFieldStatusToStatusType(warningResult.uppercaseStatus);

  // Determine styling based on overall status
  let containerClass = 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700';
  let accentClass = 'bg-zinc-400';
  let headerIconClass = 'text-zinc-600 dark:text-zinc-400';
  
  if (warningResult.overallStatus === 'pass') {
    containerClass = 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800';
    accentClass = 'bg-emerald-500';
    headerIconClass = 'text-emerald-600 dark:text-emerald-400';
  } else if (warningResult.overallStatus === 'fail' || warningResult.overallStatus === 'missing') {
    containerClass = 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
    accentClass = 'bg-red-500';
    headerIconClass = 'text-red-600 dark:text-red-400';
  } else if (warningResult.overallStatus === 'needs_review') {
    containerClass = 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
    accentClass = 'bg-amber-500';
    headerIconClass = 'text-amber-600 dark:text-amber-400';
  }

  return (
    <div className={`rounded-lg border ${containerClass} overflow-hidden`}>
      {/* Accent bar at top for visual prominence */}
      <div className={`h-1 ${accentClass}`} />
      
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Shield icon for government warning emphasis */}
          <div className={`flex-shrink-0 ${headerIconClass}`}>
            <Shield className="h-6 w-6" aria-hidden="true" />
          </div>
          
          <div className="flex-1 space-y-3">
            {/* Header with status */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                Government Warning
              </span>
              <StatusBadge status={overallStatusType} size="md" />
            </div>

            {/* Extracted warning text in a distinct box */}
            <div className="rounded-md bg-white/60 dark:bg-black/20 border border-zinc-200/50 dark:border-zinc-700/50 p-3">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
                Extracted Text
              </p>
              <div className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                {expanded || !isLong ? (
                  <span className="whitespace-pre-wrap">{warningText}</span>
                ) : (
                  <span>{truncateText(warningText, 200)}</span>
                )}
              </div>
              {isLong && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="mt-2 text-blue-600 dark:text-blue-400 hover:underline text-sm inline-flex items-center gap-1 font-medium"
                >
                  {expanded ? (
                    <>
                      Show less <ChevronUp className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      Show more <ChevronDown className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Sub-status checks with flex-wrap for natural wrapping */}
            {hasWarning && (
              <div className="flex flex-wrap gap-2">
                {/* Wording check */}
                <div className="flex items-center gap-2 text-sm rounded-md bg-white/40 dark:bg-black/10 px-2.5 py-1.5">
                  {getWarningIcon(warningResult.wordingStatus)}
                  <span className="text-zinc-600 dark:text-zinc-300">Wording</span>
                  <StatusBadge status={wordingStatusType} size="sm" />
                </div>
                
                {/* Uppercase check */}
                <div className="flex items-center gap-2 text-sm rounded-md bg-white/40 dark:bg-black/10 px-2.5 py-1.5">
                  {getWarningIcon(warningResult.uppercaseStatus)}
                  <span className="text-zinc-600 dark:text-zinc-300">Uppercase</span>
                  <StatusBadge status={uppercaseStatusType} size="sm" />
                </div>
                
                {/* Bold check - always manual confirm */}
                <div className="flex items-center gap-2 text-sm rounded-md bg-amber-100/50 dark:bg-amber-900/20 px-2.5 py-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  <span className="text-zinc-600 dark:text-zinc-300">Bold</span>
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-200/50 dark:bg-amber-800/30 px-1.5 py-0.5 rounded">
                    Manual confirm
                  </span>
                </div>
              </div>
            )}

            {/* Reason / explanation */}
            {warningResult.reason && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 italic">
                {warningResult.reason}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface FieldComparisonRowProps {
  field: FieldResult;
}

/**
 * A single field comparison row
 */
function FieldComparisonRow({ field }: FieldComparisonRowProps) {
  const [expanded, setExpanded] = useState(false);
  const statusType = mapFieldStatusToStatusType(field.status);
  const rowBgClass = getStatusRowClass(field.status);

  const extractedText = field.extractedValue || '—';
  const expectedText = field.expectedValue || '—';
  const isLongExtracted = extractedText.length > 80;
  const isLongExpected = expectedText.length > 80;
  const hasLongContent = isLongExtracted || isLongExpected;

  return (
    <div
      className={`border-b border-zinc-200 dark:border-zinc-700 last:border-b-0 ${rowBgClass}`}
    >
      <div className="px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          {/* Field name and status */}
          <div className="flex items-center gap-2 min-w-[140px]">
            <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
              {field.fieldName}
            </span>
            <StatusBadge status={statusType} size="sm" />
          </div>

          {/* Values comparison */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {/* Extracted value */}
            <div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-0.5">
                Extracted
              </span>
              <span className="text-zinc-900 dark:text-zinc-100">
                {expanded || !isLongExtracted ? extractedText : truncateText(extractedText, 80)}
              </span>
            </div>

            {/* Expected value */}
            <div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-0.5">
                Expected
              </span>
              <span className="text-zinc-900 dark:text-zinc-100">
                {expanded || !isLongExpected ? expectedText : truncateText(expectedText, 80)}
              </span>
            </div>
          </div>

          {/* Expand button for long content */}
          {hasLongContent && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-blue-600 dark:text-blue-400 hover:underline text-xs flex items-center gap-1 self-start"
            >
              {expanded ? (
                <>
                  Less <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  More <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          )}
        </div>

        {/* Reason */}
        {field.reason && (
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 pl-0 sm:pl-[156px]">
            {field.reason}
          </p>
        )}

        {/* Candidates (for conflicts) */}
        {field.candidates && field.candidates.length > 1 && (
          <div className="mt-2 pl-0 sm:pl-[156px]">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Candidates found:</span>
            <ul className="mt-1 space-y-0.5">
              {field.candidates.map((candidate, index) => (
                <li key={index} className="text-xs text-zinc-600 dark:text-zinc-400">
                  <span className="text-zinc-400 dark:text-zinc-500">•</span> {candidate}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Image Thumbnails Component
// ============================================================================

interface ImageThumbnailsProps {
  imageUrls: string[];
  altTexts?: string[];
  onImageClick: (index: number) => void;
}

/**
 * Displays source image thumbnails with click-to-preview functionality
 */
function ImageThumbnails({ imageUrls, altTexts = [], onImageClick }: ImageThumbnailsProps) {
  if (imageUrls.length === 0) return null;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Eye className="h-4 w-4 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Source Images ({imageUrls.length})
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Click to enlarge
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {imageUrls.map((url, index) => (
          <button
            key={index}
            onClick={() => onImageClick(index)}
            className="relative group rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
            aria-label={`View ${altTexts[index] || `image ${index + 1}`} in full size`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={altTexts[index] || `Source image ${index + 1}`}
              className="h-20 w-20 object-cover border border-zinc-200 dark:border-zinc-600 rounded-lg transition-transform duration-150 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-150 rounded-lg flex items-center justify-center">
              <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 drop-shadow-lg" />
            </div>
            {/* Image number badge */}
            <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
              {index + 1}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ResultsDetails displays the field-by-field validation results.
 * 
 * Features:
 * - Pinned Government Warning block at top (most prominent)
 * - Image preview with modal for larger view
 * - Field comparison list with extracted vs expected values
 * - Status badges with icons for each field
 * - Expandable long text content with "show more"
 * - Candidate display for conflicting values
 */
export function ResultsDetails({
  result,
  imagePreviewUrls = [],
  imageAltTexts = [],
  showImagePreviewModal = true,
  onImagePreview,
}: ResultsDetailsProps) {
  // Internal modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);

  /**
   * Handle image thumbnail click
   */
  const handleImageClick = useCallback((index: number) => {
    // If external handler is provided, use it
    if (onImagePreview) {
      onImagePreview(index);
      return;
    }
    
    // Otherwise use internal modal
    if (showImagePreviewModal) {
      setModalIndex(index);
      setModalOpen(true);
    }
  }, [onImagePreview, showImagePreviewModal]);

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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Verification Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Government Warning block - pinned at top, most prominent */}
          <WarningBlock warningResult={result.warningResult} />

          {/* Source image thumbnails with click-to-preview */}
          <ImageThumbnails
            imageUrls={imagePreviewUrls}
            altTexts={imageAltTexts}
            onImageClick={handleImageClick}
          />

          {/* Field comparison list */}
          <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
            <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              <span>Field Comparison</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                ({result.fieldResults.length} fields)
              </span>
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {result.fieldResults.map((field, index) => (
                <FieldComparisonRow key={index} field={field} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image preview modal (only rendered if using internal modal) */}
      {showImagePreviewModal && !onImagePreview && (
        <ImagePreviewModal
          imageUrls={imagePreviewUrls}
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
