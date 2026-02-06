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
import type { Report, ManualBoldVerification, FieldStatus, FieldResult, WarningResult, OverallStatus } from '@/lib/types';
import { ResultsDetails } from '@/components/verify/ResultsDetails';
import {
  getReport,
  deleteReport,
  updateReport,
  formatDate,
  formatDuration,
  getBrandName,
} from '@/lib/utils';
import { compareTextField, compareNumericField } from '@/lib/validation';
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

/**
 * Helper to get the effective status of a field (considering manual verification)
 */
function getEffectiveFieldStatus(field: FieldResult): FieldStatus {
  if (field.manualVerification === 'pass') return 'pass' as FieldStatus;
  if (field.manualVerification === 'fail') return 'fail' as FieldStatus;
  return field.status;
}

/**
 * Helper to get the effective status of the warning (considering manual bold verification)
 */
function getEffectiveWarningStatus(warning: WarningResult): FieldStatus {
  // If bold was manually verified, use that to determine warning status
  if (warning.manualBoldVerification === 'pass') {
    // Bold is confirmed - check if wording and uppercase also pass
    if (warning.wordingStatus === ('pass' as FieldStatus) && 
        warning.uppercaseStatus === ('pass' as FieldStatus)) {
      return 'pass' as FieldStatus;
    }
  }
  if (warning.manualBoldVerification === 'fail') {
    return 'fail' as FieldStatus;
  }
  return warning.overallStatus;
}

/**
 * Recalculates the overall application status based on all fields and warning
 * - Government warning wording/uppercase fail → Fail
 * - Field comparisons with conflicts → Needs Review
 * - Bold detection uncertain → Needs Review
 */
function recalculateOverallStatus(
  fieldResults: FieldResult[],
  warningResult: WarningResult
): { overallStatus: OverallStatus; topReasons: string[] } {
  const reasons: string[] = [];
  let hasNeedsReview = false;
  let hasFail = false;
  
  // Check each field's effective status
  // not_provided is treated as pass (no expected value = no comparison needed)
  for (const field of fieldResults) {
    const effectiveStatus = getEffectiveFieldStatus(field);
    
    if (effectiveStatus === ('pass' as FieldStatus) || effectiveStatus === ('not_provided' as FieldStatus)) {
      // Pass - no action needed
    } else if (effectiveStatus === ('needs_review' as FieldStatus)) {
      hasNeedsReview = true;
      reasons.push(`${field.fieldName}: ${field.reason || 'Needs review'}`);
    } else {
      // For field comparisons, treat fail/missing as needs_review
      hasNeedsReview = true;
      reasons.push(`${field.fieldName}: ${field.reason || 'Needs review'}`);
    }
  }
  
  // Check warning's effective status - this CAN cause a Fail
  const effectiveWarningStatus = getEffectiveWarningStatus(warningResult);
  
  if (effectiveWarningStatus === ('pass' as FieldStatus)) {
    // Pass - no action needed
  } else if (effectiveWarningStatus === ('fail' as FieldStatus)) {
    // Government warning wording/uppercase failure = Fail
    hasFail = true;
    reasons.unshift(`Government Warning: ${warningResult.reason || 'Failed validation'}`);
  } else if (effectiveWarningStatus === ('missing' as FieldStatus)) {
    // Missing government warning = Fail
    hasFail = true;
    reasons.unshift('Government Warning: Not found on label');
  } else {
    // needs_review (e.g., bold detection uncertain)
    hasNeedsReview = true;
    reasons.unshift(`Government Warning: ${warningResult.reason || 'Needs review'}`);
  }
  
  // Determine overall status
  let overallStatus: OverallStatus;
  if (hasFail) {
    overallStatus = 'fail';
  } else if (hasNeedsReview) {
    overallStatus = 'needs_review';
  } else {
    overallStatus = 'pass';
  }
  
  // Top reasons (max 3)
  const topReasons = reasons.slice(0, 3);
  if (topReasons.length === 0 && overallStatus === 'pass') {
    topReasons.push('All validated fields match');
  }
  
  return { overallStatus, topReasons };
}

// ============================================================================
// Sub-Components
// ============================================================================

interface SummaryStatsProps {
  report: Report;
}

/**
 * Calculate field-level status counts from application result
 * Uses effective status (considering manual verifications and edits)
 * - Field comparisons: fail/missing → needsReview (display only)
 * - Government warning: fail → fail (actual failure)
 */
function calculateFieldCounts(report: Report): { pass: number; fail: number; needsReview: number } {
  // Get the first application's result (this is a single application report view)
  const application = report.applications?.[0];
  const appResult = application?.result;
  
  if (!appResult) {
    return { pass: 0, fail: 0, needsReview: 0 };
  }

  let pass = 0;
  let fail = 0;
  let needsReview = 0;

  // Count field results - for fields, treat fail/missing as needsReview, not_provided as pass
  for (const field of appResult.fieldResults || []) {
    const effectiveStatus = getEffectiveFieldStatus(field);
    if (effectiveStatus === ('pass' as FieldStatus) || effectiveStatus === ('not_provided' as FieldStatus)) {
      pass++;
    } else {
      // All non-pass field statuses count as needsReview (not fail)
      needsReview++;
    }
  }

  // Count warning result - this CAN be a fail
  if (appResult.warningResult) {
    const effectiveWarningStatus = getEffectiveWarningStatus(appResult.warningResult);
    if (effectiveWarningStatus === ('pass' as FieldStatus)) {
      pass++;
    } else if (effectiveWarningStatus === ('fail' as FieldStatus) || effectiveWarningStatus === ('missing' as FieldStatus)) {
      // Government warning wording/uppercase failure = actual fail
      fail++;
    } else {
      // needs_review (e.g., bold detection uncertain)
      needsReview++;
    }
  }

  return { pass, fail, needsReview };
}

/**
 * Summary statistics bar for the report
 * Shows field-level counts (not application-level)
 * - Pass: all passes including fields with no expected value
 * - Fail: government warning wording/uppercase failures
 * - Review: field conflicts, bold detection uncertain
 */
function SummaryStats({ report }: SummaryStatsProps) {
  const counts = calculateFieldCounts(report);
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <div>
          <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
            {counts.pass}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Pass</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2">
        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
        <div>
          <p className="text-lg font-semibold text-red-700 dark:text-red-300">
            {counts.fail}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400">Fail</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <div>
          <p className="text-lg font-semibold text-amber-700 dark:text-amber-300">
            {counts.needsReview}
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
  const [savingManualVerification, setSavingManualVerification] = useState(false);

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

  /**
   * Handle manual bold verification
   * Updates the report with the user's decision and recalculates overall status
   */
  const handleManualBoldVerification = useCallback(async (decision: ManualBoldVerification) => {
    if (!report || !report.applications[0]) return;
    
    setSavingManualVerification(true);
    setError(null);
    
    try {
      // Create updated report with manual verification
      const updatedReport = { ...report };
      const app = { ...updatedReport.applications[0] };
      const result = { ...app.result };
      const warningResult = { ...result.warningResult };
      
      // Set the manual verification
      warningResult.manualBoldVerification = decision;
      
      // Update bold status display and warning reason
      if (decision === 'pass') {
        warningResult.boldStatus = 'detected';
        if (warningResult.wordingStatus === ('pass' as FieldStatus) && 
            warningResult.uppercaseStatus === ('pass' as FieldStatus)) {
          warningResult.overallStatus = 'pass' as FieldStatus;
          warningResult.reason = 'Government warning matches all requirements (bold manually verified)';
        }
      } else if (decision === 'fail') {
        warningResult.boldStatus = 'not_detected';
        warningResult.overallStatus = 'fail' as FieldStatus;
        warningResult.reason = '"GOVERNMENT WARNING:" is not bold (manually verified)';
      }
      
      result.warningResult = warningResult;
      
      // Recalculate overall status considering ALL fields and the warning
      const { overallStatus, topReasons } = recalculateOverallStatus(result.fieldResults, warningResult);
      result.overallStatus = overallStatus;
      result.topReasons = topReasons;
      
      app.result = result;
      updatedReport.applications[0] = app;
      
      // Update summary counts
      updatedReport.summary = {
        total: 1,
        pass: result.overallStatus === 'pass' ? 1 : 0,
        fail: result.overallStatus === 'fail' ? 1 : 0,
        needsReview: result.overallStatus === 'needs_review' ? 1 : 0,
        error: result.overallStatus === 'error' ? 1 : 0,
      };
      
      // Save to IndexedDB
      const saveResult = await updateReport(updatedReport);
      
      if (saveResult.success) {
        setReport(updatedReport);
      } else {
        setError(`Failed to save verification: ${saveResult.error.message}`);
      }
    } catch (err) {
      console.error('Manual verification failed:', err);
      setError('Failed to save manual verification. Please try again.');
    } finally {
      setSavingManualVerification(false);
    }
  }, [report]);

  /**
   * Handle field value edit
   * Re-runs comparison with the new value and updates status
   */
  const handleFieldEdit = useCallback(async (
    fieldIndex: number, 
    editType: 'extracted' | 'expected', 
    newValue: string
  ) => {
    if (!report || !report.applications[0]) return;
    
    setSavingManualVerification(true);
    setError(null);
    
    try {
      // Create updated report
      const updatedReport = { ...report };
      const app = { ...updatedReport.applications[0] };
      const result = { ...app.result };
      const fieldResults = [...result.fieldResults];
      
      // Get the field and update the value
      const field = { ...fieldResults[fieldIndex] };
      
      if (editType === 'extracted') {
        field.extractedValue = newValue || undefined;
        field.extractedEdited = true;
      } else {
        field.expectedValue = newValue || undefined;
        field.expectedEdited = true;
      }
      
      // Re-run comparison based on field type
      const extractedVal = field.extractedValue;
      const expectedVal = field.expectedValue;
      
      // Determine which comparison to use based on field name
      let comparisonResult;
      if (field.fieldName === 'ABV/Proof') {
        comparisonResult = compareNumericField(extractedVal, expectedVal, 'abv');
      } else if (field.fieldName === 'Net Contents') {
        comparisonResult = compareNumericField(extractedVal, expectedVal, 'netContents');
      } else {
        comparisonResult = compareTextField(extractedVal, expectedVal);
      }
      
      // Update field with new comparison result
      field.status = comparisonResult.status;
      field.reason = comparisonResult.reason || (comparisonResult.status === 'pass' ? 'Values match (after edit)' : undefined);
      field.manualVerification = undefined; // Clear manual verification since we re-compared
      
      fieldResults[fieldIndex] = field;
      result.fieldResults = fieldResults;
      
      // Also update the extractedValues in the application if extracted was edited
      if (editType === 'extracted') {
        const extractedValues = { ...app.extractedValues };
        // Map field name to extractedValues key
        const fieldNameMap: Record<string, keyof typeof extractedValues> = {
          'Brand Name': 'brand',
          'Class/Type': 'classType',
          'ABV/Proof': 'abvOrProof',
          'Net Contents': 'netContents',
          'Producer/Bottler': 'producer',
          'Country of Origin': 'country',
        };
        const key = fieldNameMap[field.fieldName];
        if (key) {
          (extractedValues as Record<string, string | undefined>)[key] = newValue || undefined;
        }
        app.extractedValues = extractedValues;
      }
      
      // Update applicationValues if expected was edited
      if (editType === 'expected') {
        const applicationValues = { ...app.applicationValues };
        const fieldNameMap: Record<string, keyof typeof applicationValues> = {
          'Brand Name': 'brand',
          'Class/Type': 'classType',
          'ABV/Proof': 'abvOrProof',
          'Net Contents': 'netContents',
          'Producer/Bottler': 'producer',
          'Country of Origin': 'country',
        };
        const key = fieldNameMap[field.fieldName];
        if (key) {
          (applicationValues as Record<string, string | undefined>)[key] = newValue || undefined;
        }
        app.applicationValues = applicationValues;
      }
      
      // Recalculate overall status
      const { overallStatus, topReasons } = recalculateOverallStatus(fieldResults, result.warningResult);
      result.overallStatus = overallStatus;
      result.topReasons = topReasons;
      
      app.result = result;
      updatedReport.applications[0] = app;
      
      // Update summary counts
      updatedReport.summary = {
        total: 1,
        pass: result.overallStatus === 'pass' ? 1 : 0,
        fail: result.overallStatus === 'fail' ? 1 : 0,
        needsReview: result.overallStatus === 'needs_review' ? 1 : 0,
        error: result.overallStatus === 'error' ? 1 : 0,
      };
      
      // Save to IndexedDB
      const saveResult = await updateReport(updatedReport);
      
      if (saveResult.success) {
        setReport(updatedReport);
      } else {
        setError(`Failed to save edit: ${saveResult.error.message}`);
      }
    } catch (err) {
      console.error('Field edit failed:', err);
      setError('Failed to save field edit. Please try again.');
    } finally {
      setSavingManualVerification(false);
    }
  }, [report]);

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
              onManualBoldVerification={handleManualBoldVerification}
              onFieldEdit={handleFieldEdit}
              isManualVerificationLoading={savingManualVerification}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
