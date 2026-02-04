'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Trash2,
  Download,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, Button, StatusBadge, LoadingState } from '@/components/ui';
import {
  listReports,
  getReport,
  deleteReport,
  clearAllReports,
  downloadReportJson,
  formatDate,
  formatDuration,
  type ReportListItem,
} from '@/lib/utils';

/**
 * Reports page - displays the list of saved verification reports.
 * 
 * Features:
 * - List all saved reports with summary info
 * - Open report detail view
 * - Download report as JSON
 * - Delete individual reports
 * - Clear all reports
 */
export default function ReportsPage() {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  /**
   * Load reports from IndexedDB
   */
  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listReports();
    if (result.success) {
      setReports(result.data);
    } else {
      setError(result.error.message);
    }
    setLoading(false);
  }, []);

  // Load reports on mount
  useEffect(() => {
    loadReports();
  }, [loadReports]);

  /**
   * Handle downloading a report as JSON
   */
  const handleDownload = useCallback(async (id: string) => {
    const result = await getReport(id);
    if (result.success) {
      downloadReportJson(result.data);
    } else {
      setError(`Failed to download report: ${result.error.message}`);
    }
  }, []);

  /**
   * Handle deleting a report
   */
  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    const result = await deleteReport(id);
    if (result.success) {
      setReports((prev) => prev.filter((r) => r.id !== id));
    } else {
      setError(`Failed to delete report: ${result.error.message}`);
    }
    setDeletingId(null);
  }, []);

  /**
   * Handle clearing all reports
   */
  const handleClearAll = useCallback(async () => {
    setClearingAll(true);
    const result = await clearAllReports();
    if (result.success) {
      setReports([]);
      setShowClearConfirm(false);
    } else {
      setError(`Failed to clear reports: ${result.error.message}`);
    }
    setClearingAll(false);
  }, []);

  /**
   * Get status summary display for a report
   */
  const getStatusSummary = (summary: ReportListItem['summary']) => {
    const parts: string[] = [];
    if (summary.pass > 0) parts.push(`${summary.pass} Pass`);
    if (summary.fail > 0) parts.push(`${summary.fail} Fail`);
    if (summary.needsReview > 0) parts.push(`${summary.needsReview} Review`);
    if (summary.error > 0) parts.push(`${summary.error} Error`);
    return parts.join(', ') || 'No results';
  };

  /**
   * Get the primary status for a report (for badge display)
   */
  const getPrimaryStatus = (summary: ReportListItem['summary']): 'pass' | 'fail' | 'needs_review' | 'error' => {
    if (summary.fail > 0 || summary.error > 0) return 'fail';
    if (summary.needsReview > 0) return 'needs_review';
    if (summary.pass > 0) return 'pass';
    return 'needs_review';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Reports
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            View and manage your saved verification reports.
          </p>
        </div>

        {reports.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadReports}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              disabled={clearingAll}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700 dark:hover:text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Clear all confirmation dialog */}
      {showClearConfirm && (
        <Card accentColor="red">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                Delete all reports?
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                This will permanently delete all {reports.length} saved report{reports.length !== 1 ? 's' : ''}. This action cannot be undone.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={clearingAll}
                >
                  {clearingAll ? 'Deleting...' : 'Delete All'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowClearConfirm(false)}
                  disabled={clearingAll}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {loading && reports.length === 0 && (
        <Card>
          <CardContent>
            <LoadingState
              type="loading"
              message="Loading Reports..."
              description="Retrieving your saved verification reports."
            />
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && reports.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <FileText className="h-6 w-6 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
            </div>
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              No reports yet.
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
              Reports will appear here after you run verifications.
            </p>
            <Link href="/verify">
              <Button variant="primary" size="sm" className="mt-4">
                Go to Verify
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Reports list */}
      {reports.length > 0 && (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="py-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Report info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <StatusBadge
                        status={getPrimaryStatus(report.summary)}
                        size="sm"
                      />
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {report.brandName}
                      </h3>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{formatDate(report.createdAt)}</span>
                      <span>{report.summary.total === 1 ? `${report.summary.total} image` : `${report.summary.total} images`}</span>
                      <span>{formatDuration(report.totalDurationMs)}</span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {getStatusSummary(report.summary)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/reports/${report.id}`}>
                      <Button variant="primary" size="sm">
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        Open
                      </Button>
                    </Link>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDownload(report.id)}
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      JSON
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(report.id)}
                      disabled={deletingId === report.id}
                    >
                      {deletingId === report.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      )}
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Report count summary */}
      {reports.length > 0 && (
        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
          {reports.length} report{reports.length !== 1 ? 's' : ''} saved locally
        </p>
      )}
    </div>
  );
}
