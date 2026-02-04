'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, StatusBadge } from '@/components/ui';
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
  /** Callback when an image is clicked for full preview */
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
 * Government Warning block - pinned at top of details
 */
function WarningBlock({ warningResult }: WarningBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const hasWarning = !!warningResult.extractedWarning;
  const warningText = warningResult.extractedWarning || 'Not found on label';
  const isLong = warningText.length > 200;

  const overallStatusType = mapFieldStatusToStatusType(warningResult.overallStatus);
  const wordingStatusType = mapFieldStatusToStatusType(warningResult.wordingStatus);
  const uppercaseStatusType = mapFieldStatusToStatusType(warningResult.uppercaseStatus);

  // Determine background based on overall status
  let bgClass = 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700';
  if (warningResult.overallStatus === 'pass') {
    bgClass = 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800';
  } else if (warningResult.overallStatus === 'fail' || warningResult.overallStatus === 'missing') {
    bgClass = 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
  } else if (warningResult.overallStatus === 'needs_review') {
    bgClass = 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
  }

  return (
    <div className={`rounded-lg border ${bgClass} p-4`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="h-5 w-5 mt-0.5 text-amber-600 dark:text-amber-400 flex-shrink-0"
            aria-hidden="true"
          />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                Government Warning
              </span>
              <StatusBadge status={overallStatusType} size="sm" />
            </div>

            {/* Extracted warning text */}
            <div className="text-sm text-zinc-700 dark:text-zinc-300">
              {expanded || !isLong ? (
                <span className="whitespace-pre-wrap">{warningText}</span>
              ) : (
                <span>{truncateText(warningText, 200)}</span>
              )}
              {isLong && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="ml-2 text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  {expanded ? (
                    <>
                      Show less <ChevronUp className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      Show more <ChevronDown className="h-3 w-3" />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Sub-status badges */}
            {hasWarning && (
              <div className="flex flex-wrap gap-2 mt-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400">Wording:</span>
                  <StatusBadge status={wordingStatusType} size="sm" />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400">Uppercase:</span>
                  <StatusBadge status={uppercaseStatusType} size="sm" />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400">Bold:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    Manual confirm
                  </span>
                </div>
              </div>
            )}

            {/* Reason */}
            {warningResult.reason && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
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
// Main Component
// ============================================================================

/**
 * ResultsDetails displays the field-by-field validation results.
 * 
 * Features:
 * - Pinned Government Warning block at top
 * - Field comparison list with extracted vs expected values
 * - Status badges for each field
 * - Expandable long text content
 * - Candidate display for conflicting values
 */
export function ResultsDetails({
  result,
  imagePreviewUrls = [],
  onImagePreview,
}: ResultsDetailsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Verification Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Government Warning block - pinned at top */}
        <WarningBlock warningResult={result.warningResult} />

        {/* Image previews (optional) */}
        {imagePreviewUrls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-zinc-500 dark:text-zinc-400 w-full mb-1">
              Source Images:
            </span>
            {imagePreviewUrls.map((url, index) => (
              <button
                key={index}
                onClick={() => onImagePreview?.(index)}
                className="relative group"
              >
                <img
                  src={url}
                  alt={`Source image ${index + 1}`}
                  className="h-16 w-16 object-cover rounded border border-zinc-200 dark:border-zinc-700 group-hover:ring-2 group-hover:ring-blue-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded flex items-center justify-center">
                  <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Field comparison list */}
        <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
          <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Field Comparison
          </div>
          <div>
            {result.fieldResults.map((field, index) => (
              <FieldComparisonRow key={index} field={field} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
