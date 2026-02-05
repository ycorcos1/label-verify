'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import {
  FileText,
  AlertTriangle,
  Download,
  ChevronLeft,
  RefreshCw,
  Loader,
  CheckCircle2,
  XCircle,
  Clock,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, StatusBadge, LoadingState } from '@/components/ui';
import type { Report } from '@/lib/types';
import { ResultsDetails } from '@/components/verify/ResultsDetails';
import {
  getReport,
  deleteReport,
  formatDate,
  formatDuration,
  getBrandName,
} from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { pdf } from '@react-pdf/renderer';
import { ReportPDF } from '@/components/pdf';

// ============================================================================
// Types
// ============================================================================

interface ReportDetailPageProps {
  params: Promise<{
    reportId: string;
  }>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Maps overall status to StatusBadge status type
 */
function mapOverallStatusToStatusType(
  status: string
): 'pass' | 'fail' | 'needs_review' | 'error' {
  if (status === 'pass') return 'pass';
  if (status === 'fail') return 'fail';
  if (status === 'needs_review') return 'needs_review';
  if (status === 'error') return 'error';
  return 'needs_review';
}

// ============================================================================
// Sub-Components
// ============================================================================

interface SummaryStatsProps {
  report: Report;
}

/**
 * Summary statistics bar for the report
 */
function SummaryStats({ report }: SummaryStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <div>
          <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
            {report.summary.pass}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Pass</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2">
        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
        <div>
          <p className="text-lg font-semibold text-red-700 dark:text-red-300">
            {report.summary.fail}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400">Fail</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <div>
          <p className="text-lg font-semibold text-amber-700 dark:text-amber-300">
            {report.summary.needsReview}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400">Review</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-2">
        <Clock className="h-4 w-4 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
        <div>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {formatDuration(report.totalDurationMs)}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Duration</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ReportDetailPage({ params }: ReportDetailPageProps) {
  const resolvedParams = use(params);
  const reportId = resolvedParams.reportId;
  const router = useRouter();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  /**
   * Load the report from IndexedDB
   */
  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getReport(reportId);
    if (result.success) {
      setReport(result.data);
    } else {
      setError(result.error.message);
    }
    setLoading(false);
  }, [reportId]);

  // Load report on mount
  useEffect(() => {
    loadReport();
  }, [loadReport]);

  /**
   * Handle downloading the report as PDF
   */
  const handleDownloadPdf = useCallback(async () => {
    if (!report) return;
    
    setGeneratingPdf(true);
    setError(null);
    
    try {
      // Generate PDF blob from the ReportPDF component
      const blob = await pdf(<ReportPDF report={report} />).toBlob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Generate filename with brand name and date
      const brandName = getBrandName(report).replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const dateStr = new Date(report.createdAt).toISOString().split('T')[0];
      a.download = `${brandName}-verification-report-${dateStr}.pdf`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed:', err);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  }, [report]);

  /**
   * Handle deleting the report
   */
  const handleDelete = useCallback(async () => {
    if (!report) return;
    setDeleting(true);
    const result = await deleteReport(report.id);
    if (result.success) {
      router.push('/reports');
    } else {
      setError(`Failed to delete report: ${result.error.message}`);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [report, router]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <Link href="/reports" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Reports
          </Link>
          <span>/</span>
          <span>Loading...</span>
        </div>
        <Card>
          <CardContent>
            <LoadingState
              type="loading"
              message="Loading Report..."
              description="Retrieving saved verification data."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !report) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <Link href="/reports" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Reports
          </Link>
          <span>/</span>
          <span>Error</span>
        </div>
        <Card accentColor="red">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-8 w-8 text-red-500" aria-hidden="true" />
            <p className="mt-4 text-sm text-red-700 dark:text-red-300">
              {error || 'Report not found'}
            </p>
            <Link href="/reports">
              <Button variant="primary" size="sm" className="mt-4">
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Back to Reports
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/reports" className="hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" />
          Reports
        </Link>
        <span>/</span>
        <span className="truncate max-w-[200px]">{getBrandName(report)}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <StatusBadge
            status={mapOverallStatusToStatusType(report.applications[0]?.result.overallStatus || 'needs_review')}
            size="lg"
          />
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {getBrandName(report)}
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {formatDate(report.createdAt)} • {report.applications[0]?.imageCount || 0} image{(report.applications[0]?.imageCount || 0) !== 1 ? 's' : ''} • {formatDuration(report.totalDurationMs)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleDownloadPdf}
            disabled={generatingPdf}
          >
            {generatingPdf ? (
              <>
                <Loader className="h-4 w-4 animate-spin" aria-hidden="true" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" aria-hidden="true" />
                Download PDF
              </>
            )}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
          >
            {deleting ? (
              <Loader className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              'Delete'
            )}
          </Button>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <Card accentColor="red">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                Delete this report?
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                This action cannot be undone.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Images not stored banner - only show if no images were saved */}
      {!report.applications.some(app => app.imageThumbnails && app.imageThumbnails.length > 0) && (
        <Card accentColor="yellow">
          <CardContent className="flex items-start gap-3 py-4">
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                Images not stored
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Re-upload required to re-run verification. Only extracted data and validation results are saved.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <SummaryStats report={report} />

      {/* Verification Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" aria-hidden="true" />
            Verification Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {report.applications.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">
              No verification data in this report.
            </p>
          ) : (
            <ResultsDetails
              result={report.applications[0].result}
              extractedValues={report.applications[0].extractedValues}
              imagePreviewUrls={report.applications[0].imageThumbnails || []}
              imageAltTexts={report.applications[0].imageNames || []}
              showImagePreviewModal={report.applications[0].imageThumbnails && report.applications[0].imageThumbnails.length > 0}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
