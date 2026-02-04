'use client';

import { Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, Button, StatusBadge } from '@/components/ui';
import type { ApplicationResult, OverallStatus } from '@/lib/types';
import { formatDuration } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface ResultsSummaryProps {
  /** The verification result to display */
  result: ApplicationResult;
  /** Callback when "View Details" is clicked */
  onViewDetails?: () => void;
  /** Callback when "Download JSON" is clicked */
  onDownloadJson?: () => void;
  /** Callback when "Retry" is clicked (only shown for errors) */
  onRetry?: () => void;
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** Whether details are currently shown */
  detailsExpanded?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Maps OverallStatus to StatusBadge status type
 */
function mapOverallStatusToStatusType(status: OverallStatus): 'pass' | 'fail' | 'needs_review' | 'error' {
  return status;
}

/**
 * Gets a background color class based on status
 */
function getStatusBackgroundClass(status: OverallStatus): string {
  switch (status) {
    case 'pass':
      return 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800';
    case 'fail':
      return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
    case 'needs_review':
      return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
    case 'error':
      return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
    default:
      return 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700';
  }
}

// ============================================================================
// Component
// ============================================================================

/**
 * ResultsSummary displays the overall verification result as a banner.
 * 
 * Features:
 * - Status badge with icon + label
 * - Top reasons for the status (1-3)
 * - Processing time
 * - Actions: View Details, Download JSON, Retry (for errors)
 */
export function ResultsSummary({
  result,
  onViewDetails,
  onDownloadJson,
  onRetry,
  isRetrying = false,
  detailsExpanded = false,
}: ResultsSummaryProps) {
  const statusType = mapOverallStatusToStatusType(result.overallStatus);
  const backgroundClass = getStatusBackgroundClass(result.overallStatus);

  return (
    <Card className={`border ${backgroundClass}`}>
      <CardContent className="py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Status and reasons */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <StatusBadge status={statusType} size="md" />
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {result.imageCount} image{result.imageCount !== 1 ? 's' : ''} processed in{' '}
                {formatDuration(result.processingTimeMs)}
              </span>
            </div>

            {/* Top reasons */}
            {result.topReasons.length > 0 && (
              <ul className="space-y-1">
                {result.topReasons.map((reason, index) => (
                  <li
                    key={index}
                    className="text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-2"
                  >
                    <span className="text-zinc-400 dark:text-zinc-500 select-none">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            {result.overallStatus === 'error' && onRetry && (
              <Button
                variant="primary"
                size="sm"
                onClick={onRetry}
                disabled={isRetrying}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                {isRetrying ? 'Retrying...' : 'Retry'}
              </Button>
            )}
            {onViewDetails && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onViewDetails}
              >
                {detailsExpanded ? 'Hide Details' : 'View Details'}
              </Button>
            )}
            {onDownloadJson && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDownloadJson}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download JSON
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
