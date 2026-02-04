/**
 * ReportPDF - PDF Template Component for LabelVerify Reports
 * 
 * Creates a styled PDF document for report export using @react-pdf/renderer.
 * Mirrors the report detail view structure with professional, clean styling.
 * No branding included per PRD requirements.
 * 
 * @see docs/prd_v2_improvements.md - Item 3 (PDF Export)
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Report, FieldResult, WarningResult, FieldStatus } from '@/lib/types';
import { getBrandName } from '@/lib/utils';

// ============================================================================
// Styles
// ============================================================================

const colors = {
  primary: '#18181b',      // zinc-900
  secondary: '#71717a',    // zinc-500
  muted: '#a1a1aa',        // zinc-400
  border: '#e4e4e7',       // zinc-200
  background: '#fafafa',   // zinc-50
  white: '#ffffff',
  
  // Status colors
  pass: '#059669',         // emerald-600
  passBg: '#d1fae5',       // emerald-100
  fail: '#dc2626',         // red-600
  failBg: '#fee2e2',       // red-100
  review: '#d97706',       // amber-600
  reviewBg: '#fef3c7',     // amber-100
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: colors.primary,
    backgroundColor: colors.white,
  },
  
  // Header
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  headerMeta: {
    fontSize: 9,
    color: colors.secondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  statusPass: {
    backgroundColor: colors.passBg,
    color: colors.pass,
  },
  statusFail: {
    backgroundColor: colors.failBg,
    color: colors.fail,
  },
  statusReview: {
    backgroundColor: colors.reviewBg,
    color: colors.review,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
    color: colors.primary,
  },

  // Summary Stats
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    padding: 10,
    backgroundColor: colors.background,
    borderRadius: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 8,
    color: colors.secondary,
    textTransform: 'uppercase',
  },

  // Government Warning
  warningBox: {
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 9,
    lineHeight: 1.4,
    color: colors.primary,
  },
  warningChecks: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
  },
  warningCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkIcon: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  checkPass: {
    backgroundColor: colors.pass,
  },
  checkFail: {
    backgroundColor: colors.fail,
  },
  checkReview: {
    backgroundColor: colors.review,
  },

  // Field Table
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: colors.secondary,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    fontSize: 9,
    color: colors.primary,
  },
  tableCellField: {
    width: '20%',
    fontFamily: 'Helvetica-Bold',
  },
  tableCellExtracted: {
    width: '30%',
  },
  tableCellExpected: {
    width: '30%',
  },
  tableCellStatus: {
    width: '20%',
  },

  // Images
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageContainer: {
    width: 120,
    marginBottom: 8,
  },
  image: {
    width: 120,
    height: 120,
    objectFit: 'cover',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageCaption: {
    fontSize: 7,
    color: colors.secondary,
    marginTop: 4,
    textAlign: 'center',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: colors.muted,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },

  // No images message
  noImagesMessage: {
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 4,
    textAlign: 'center',
  },
  noImagesText: {
    fontSize: 9,
    color: colors.secondary,
    fontStyle: 'italic',
  },
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats a date string for display in PDF
 */
function formatPdfDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats duration in milliseconds to readable string
 */
function formatPdfDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Gets display text for field status
 */
function getStatusText(status: FieldStatus | string): string {
  switch (status) {
    case 'pass': return 'Pass';
    case 'fail': return 'Fail';
    case 'needs_review': return 'Review';
    case 'missing': return 'Missing';
    case 'not_provided': return 'N/A';
    default: return String(status);
  }
}

/**
 * Gets style for status badge
 */
function getStatusStyle(status: string): object {
  switch (status) {
    case 'pass':
      return styles.statusPass;
    case 'fail':
    case 'error':
    case 'missing':
      return styles.statusFail;
    case 'needs_review':
    default:
      return styles.statusReview;
  }
}

/**
 * Gets style for check icon
 */
function getCheckStyle(status: FieldStatus | string): object {
  switch (status) {
    case 'pass':
      return styles.checkPass;
    case 'fail':
    case 'missing':
      return styles.checkFail;
    default:
      return styles.checkReview;
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

interface StatusBadgeProps {
  status: string;
}

/**
 * Status badge component for PDF
 */
function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Text style={[styles.statusBadge, getStatusStyle(status)]}>
      {getStatusText(status).toUpperCase()}
    </Text>
  );
}

interface SummaryStatsProps {
  report: Report;
}

/**
 * Summary statistics section
 */
function SummaryStats({ report }: SummaryStatsProps) {
  const app = report.applications[0];
  
  return (
    <View style={styles.statsRow}>
      <View style={styles.statBox}>
        <Text style={styles.statValue}>{app?.imageCount || 0}</Text>
        <Text style={styles.statLabel}>Images</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statValue}>{app?.result.fieldResults.length || 0}</Text>
        <Text style={styles.statLabel}>Fields</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statValue}>{formatPdfDuration(report.totalDurationMs)}</Text>
        <Text style={styles.statLabel}>Duration</Text>
      </View>
    </View>
  );
}

interface WarningBlockProps {
  warningResult: WarningResult;
}

/**
 * Government warning section
 */
function WarningBlock({ warningResult }: WarningBlockProps) {
  const warningText = warningResult.extractedWarning || 'Not found on label';
  
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Government Warning</Text>
      <View style={[
        styles.warningBox,
        { borderLeftColor: warningResult.overallStatus === 'pass' ? colors.pass : 
                           warningResult.overallStatus === 'fail' ? colors.fail : colors.review }
      ]}>
        <Text style={styles.warningText}>{warningText}</Text>
        
        <View style={styles.warningChecks}>
          <View style={styles.warningCheck}>
            <View style={[styles.checkIcon, getCheckStyle(warningResult.wordingStatus)]} />
            <Text style={styles.tableCell}>Wording: {getStatusText(warningResult.wordingStatus)}</Text>
          </View>
          <View style={styles.warningCheck}>
            <View style={[styles.checkIcon, getCheckStyle(warningResult.uppercaseStatus)]} />
            <Text style={styles.tableCell}>Uppercase: {getStatusText(warningResult.uppercaseStatus)}</Text>
          </View>
          <View style={styles.warningCheck}>
            <View style={[styles.checkIcon, styles.checkReview]} />
            <Text style={styles.tableCell}>Bold: Manual Check</Text>
          </View>
        </View>
        
        {warningResult.reason && (
          <Text style={[styles.warningText, { marginTop: 8, fontStyle: 'italic' }]}>
            {warningResult.reason}
          </Text>
        )}
      </View>
    </View>
  );
}

interface FieldTableProps {
  fieldResults: FieldResult[];
}

/**
 * Field comparison table
 */
function FieldTable({ fieldResults }: FieldTableProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Field Comparison</Text>
      <View style={styles.table}>
        {/* Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.tableCellField]}>Field</Text>
          <Text style={[styles.tableHeaderCell, styles.tableCellExtracted]}>Extracted</Text>
          <Text style={[styles.tableHeaderCell, styles.tableCellExpected]}>Expected</Text>
          <Text style={[styles.tableHeaderCell, styles.tableCellStatus]}>Status</Text>
        </View>
        
        {/* Rows */}
        {fieldResults.map((field, index) => (
          <View 
            key={index} 
            style={[
              styles.tableRow,
              index === fieldResults.length - 1 && styles.tableRowLast
            ]}
          >
            <Text style={[styles.tableCell, styles.tableCellField]}>{field.fieldName}</Text>
            <Text style={[styles.tableCell, styles.tableCellExtracted]}>
              {field.extractedValue || '—'}
            </Text>
            <Text style={[styles.tableCell, styles.tableCellExpected]}>
              {field.expectedValue || '—'}
            </Text>
            <Text style={[styles.tableCell, styles.tableCellStatus, {
              color: field.status === 'pass' ? colors.pass : 
                     field.status === 'fail' || field.status === 'missing' ? colors.fail : 
                     colors.review
            }]}>
              {getStatusText(field.status)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

interface SourceImagesProps {
  thumbnails?: string[];
  imageNames?: string[];
}

/**
 * Source images section
 */
function SourceImages({ thumbnails, imageNames }: SourceImagesProps) {
  const hasImages = thumbnails && thumbnails.length > 0;
  
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Source Images</Text>
      
      {hasImages ? (
        <View style={styles.imagesGrid}>
          {thumbnails.map((thumbnail, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image src={thumbnail} style={styles.image} />
              <Text style={styles.imageCaption}>
                {imageNames?.[index] || `Image ${index + 1}`}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.noImagesMessage}>
          <Text style={styles.noImagesText}>
            Source images were not saved with this report.
          </Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export interface ReportPDFProps {
  report: Report;
}

/**
 * Main PDF Document component for LabelVerify reports
 * 
 * Generates a styled PDF containing:
 * - Header with brand name, date, and overall status
 * - Summary statistics
 * - Government Warning section with status indicators
 * - Field comparison table
 * - Source images (if available)
 */
export function ReportPDF({ report }: ReportPDFProps) {
  const brandName = getBrandName(report);
  const app = report.applications[0];
  const overallStatus = app?.result.overallStatus || 'needs_review';
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.brandName}>{brandName}</Text>
              <Text style={styles.headerMeta}>
                Verification Report • {formatPdfDate(report.createdAt)}
              </Text>
              <Text style={styles.headerMeta}>
                {app?.imageCount || 0} image{(app?.imageCount || 0) !== 1 ? 's' : ''} • 
                {formatPdfDuration(report.totalDurationMs)}
              </Text>
            </View>
            <StatusBadge status={overallStatus} />
          </View>
        </View>

        {/* Summary Stats */}
        <SummaryStats report={report} />

        {/* Government Warning */}
        {app?.result.warningResult && (
          <WarningBlock warningResult={app.result.warningResult} />
        )}

        {/* Field Comparison Table */}
        {app?.result.fieldResults && (
          <FieldTable fieldResults={app.result.fieldResults} />
        )}

        {/* Source Images */}
        <SourceImages
          thumbnails={app?.imageThumbnails}
          imageNames={app?.imageNames}
        />

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Label Verification Report</Text>
          <Text>Generated {formatPdfDate(new Date().toISOString())}</Text>
        </View>
      </Page>
    </Document>
  );
}

export default ReportPDF;
