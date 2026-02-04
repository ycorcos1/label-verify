'use client';

import { Loader } from 'lucide-react';
import { Card, CardContent, StatusBadge } from '@/components/ui';
import { formatDuration } from '@/lib/utils';
import type { BatchApplicationResult, BatchApplicationStatus } from './useBatchVerification';

// ============================================================================
// Types
// ============================================================================

export interface BatchApplicationRowProps {
  /** The batch application result to display */
  result: BatchApplicationResult;
  /** Whether this row is selected */
  isSelected?: boolean;
  /** Callback when row is clicked */
  onClick?: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Maps batch status to StatusBadge status type
 */
function mapBatchStatusToStatusType(
  batchStatus: BatchApplicationStatus,
  overallStatus?: string
): 'pass' | 'fail' | 'needs_review' | 'error' | 'processing' | 'queued' {
  if (batchStatus === 'queued') {
    return 'queued';
  }
  if (batchStatus === 'processing') {
    return 'processing';
  }
  if (batchStatus === 'error') {
    return 'error';
  }
  // Completed - use the overall status from the result
  if (overallStatus === 'pass') {
    return 'pass';
  }
  if (overallStatus === 'fail') {
    return 'fail';
  }
  if (overallStatus === 'needs_review') {
    return 'needs_review';
  }
  if (overallStatus === 'error') {
    return 'error';
  }
  return 'queued';
}

/**
 * Gets a border accent color based on status
 */
function getStatusBorderClass(
  batchStatus: BatchApplicationStatus,
  overallStatus?: string
): string {
  if (batchStatus === 'queued') {
    return 'border-l-zinc-300 dark:border-l-zinc-600';
  }
  if (batchStatus === 'processing') {
    return 'border-l-blue-400 dark:border-l-blue-500';
  }
  if (batchStatus === 'error') {
    return 'border-l-red-400 dark:border-l-red-500';
  }
  // Completed
  if (overallStatus === 'pass') {
    return 'border-l-emerald-400 dark:border-l-emerald-500';
  }
  if (overallStatus === 'fail') {
    return 'border-l-red-400 dark:border-l-red-500';
  }
  if (overallStatus === 'needs_review') {
    return 'border-l-amber-400 dark:border-l-amber-500';
  }
  if (overallStatus === 'error') {
    return 'border-l-red-400 dark:border-l-red-500';
  }
  return 'border-l-zinc-300 dark:border-l-zinc-600';
}

// ============================================================================
// Component
// ============================================================================

/**
 * BatchApplicationRow displays a single application in the batch results list.
 * 
 * Features:
 * - Status badge with icon + label
 * - Application name
 * - Image count
 * - Top reason (if available)
 * - Processing time (after completion)
 * - Left accent border colored by status
 */
export function BatchApplicationRow({
  result,
  isSelected = false,
  onClick,
}: BatchApplicationRowProps) {
  const statusType = mapBatchStatusToStatusType(
    result.status,
    result.result?.overallStatus
  );
  const borderClass = getStatusBorderClass(
    result.status,
    result.result?.overallStatus
  );

  const isProcessingOrQueued = result.status === 'queued' || result.status === 'processing';
  const topReason = result.result?.topReasons?.[0] || result.errorMessage;

  return (
    <Card
      className={`
        border-l-4 ${borderClass}
        cursor-pointer transition-all
        hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-600
        ${isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
      `}
      onClick={onClick}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left side: Name, status, reason */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {result.applicationName}
              </h4>
              <StatusBadge status={statusType} size="sm" />
            </div>

            {/* Image count and processing time */}
            <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                {result.imageCount} image{result.imageCount !== 1 ? 's' : ''}
              </span>
              {result.processingTimeMs !== null && (
                <span>{formatDuration(result.processingTimeMs)}</span>
              )}
              {result.status === 'processing' && (
                <span className="flex items-center gap-1">
                  <Loader className="h-3 w-3 animate-spin" aria-hidden="true" />
                  Processing...
                </span>
              )}
            </div>

            {/* Top reason */}
            {topReason && !isProcessingOrQueued && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                {topReason}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// List Component
// ============================================================================

export interface BatchApplicationListProps {
  /** List of batch application results */
  results: BatchApplicationResult[];
  /** Currently selected application ID */
  selectedId?: string;
  /** Callback when an application is selected */
  onSelect?: (applicationId: string) => void;
  /** Empty state message */
  emptyMessage?: string;
}

/**
 * BatchApplicationList renders a scrollable list of batch application rows
 */
export function BatchApplicationList({
  results,
  selectedId,
  onSelect,
  emptyMessage = 'No applications to display.',
}: BatchApplicationListProps) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
      {results.map((result) => (
        <BatchApplicationRow
          key={result.applicationId}
          result={result}
          isSelected={selectedId === result.applicationId}
          onClick={() => onSelect?.(result.applicationId)}
        />
      ))}
    </div>
  );
}
