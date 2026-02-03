/**
 * Domain types for LabelVerify
 *
 * TypeScript interfaces and types for label verification workflow.
 */

// ============================================================================
// Field Status Enum
// ============================================================================

/**
 * Status of a field validation result
 */
export enum FieldStatus {
  Pass = 'pass',
  Fail = 'fail',
  NeedsReview = 'needs_review',
  Missing = 'missing',
  NotProvided = 'not_provided',
}

// ============================================================================
// Image Types
// ============================================================================

/**
 * Represents a single uploaded image in the verification workflow
 */
export interface ImageItem {
  /** Unique identifier for the image */
  id: string;
  /** The actual File object (transient, not persisted) */
  file: File;
  /** Display name of the file */
  name: string;
  /** Object URL for preview (must be revoked on cleanup) */
  previewUrl: string;
  /** File size in bytes */
  size: number;
}

/**
 * Status of image processing
 */
export type ImageProcessingStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'error';

/**
 * ImageItem with processing status for UI display
 */
export interface ImageItemWithStatus extends ImageItem {
  /** Current processing status */
  status: ImageProcessingStatus;
  /** Error message if status is 'error' */
  errorMessage?: string;
}

// ============================================================================
// Application Group Types
// ============================================================================

/**
 * A group of images representing a single application/label
 * (e.g., front and back of the same bottle)
 */
export interface ApplicationGroup {
  /** Unique identifier for the group */
  id: string;
  /** Display name for the group (derived from filename or user-assigned) */
  name: string;
  /** Images belonging to this application */
  images: ImageItemWithStatus[];
}

// ============================================================================
// Application Values Types
// ============================================================================

/**
 * Values from the application form that the user optionally provides
 * for comparison against extracted label values.
 * All fields are optional - leaving blank means "label-only" validation.
 */
export interface ApplicationValues {
  /** Brand name from the application */
  brand?: string;
  /** Class/type of beverage (e.g., "Bourbon Whiskey") */
  classType?: string;
  /** Alcohol content - ABV percentage or proof */
  abvOrProof?: string;
  /** Net contents (e.g., "750ml", "1L") */
  netContents?: string;
  /** Producer/bottler name and address */
  producer?: string;
  /** Country of origin */
  country?: string;
}

/**
 * Values extracted from label images via OCR.
 * Extends ApplicationValues with the government warning field.
 */
export interface ExtractedValues extends ApplicationValues {
  /** The government health warning statement extracted from the label */
  governmentWarning?: string;
}

// ============================================================================
// Field Result Types
// ============================================================================

/**
 * Result of validating a single field
 */
export interface FieldResult {
  /** Name of the field being validated */
  fieldName: string;
  /** Value extracted from the label */
  extractedValue?: string;
  /** Value from the application (if provided) */
  expectedValue?: string;
  /** Validation status */
  status: FieldStatus;
  /** Short reason/explanation for the status */
  reason?: string;
  /** Source image index(es) that provided this value */
  sourceImageIndices?: number[];
  /** Alternative candidates if multiple values were found */
  candidates?: string[];
}

/**
 * Result of validating the government warning specifically
 */
export interface WarningResult {
  /** The extracted warning text */
  extractedWarning?: string;
  /** Whether the wording matches the canonical warning */
  wordingStatus: FieldStatus;
  /** Whether "GOVERNMENT WARNING:" is uppercase */
  uppercaseStatus: FieldStatus;
  /** Bold formatting cannot be verified via OCR - always needs manual confirm */
  boldStatus: 'manual_confirm';
  /** Overall warning validation status */
  overallStatus: FieldStatus;
  /** Short reason/explanation */
  reason?: string;
}

// ============================================================================
// Application Result Types
// ============================================================================

/**
 * Overall status of an application verification
 */
export type OverallStatus = 'pass' | 'fail' | 'needs_review' | 'error';

/**
 * Complete result of verifying a single application
 */
export interface ApplicationResult {
  /** Unique identifier for this result */
  id: string;
  /** Reference to the application group */
  applicationId: string;
  /** Display name of the application */
  applicationName: string;
  /** Overall verification status */
  overallStatus: OverallStatus;
  /** Top 1-3 reasons for the status */
  topReasons: string[];
  /** Per-field validation results */
  fieldResults: FieldResult[];
  /** Government warning validation result */
  warningResult: WarningResult;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Number of images processed */
  imageCount: number;
  /** Error message if overallStatus is 'error' */
  errorMessage?: string;
}

// ============================================================================
// Report Types
// ============================================================================

/**
 * Verification mode
 */
export type VerificationMode = 'single' | 'batch';

/**
 * Summary counts for a report
 */
export interface ReportSummary {
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
}

/**
 * Application data stored in a report (without images)
 */
export interface ReportApplication {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Number of images that were processed */
  imageCount: number;
  /** Extracted values from OCR */
  extractedValues: ExtractedValues;
  /** Application values provided by user (if any) */
  applicationValues?: ApplicationValues;
  /** Validation result */
  result: ApplicationResult;
}

/**
 * A saved verification report
 */
export interface Report {
  /** Unique identifier (unguessable) */
  id: string;
  /** When the report was created */
  createdAt: string;
  /** Verification mode used */
  mode: VerificationMode;
  /** Applications in this report */
  applications: ReportApplication[];
  /** Summary counts */
  summary: ReportSummary;
  /** Total processing duration in milliseconds */
  totalDurationMs: number;
}

// ============================================================================
// Extraction Response Types (for OpenAI)
// ============================================================================

/**
 * Raw extraction response from OpenAI for a single image
 */
export interface ExtractionResponse {
  /** Brand name extracted from label */
  brandName: string | null;
  /** Class/type of beverage */
  classType: string | null;
  /** Alcohol content (ABV or proof) */
  alcoholContent: string | null;
  /** Net contents */
  netContents: string | null;
  /** Producer/bottler information */
  bottlerProducer: string | null;
  /** Country of origin */
  countryOfOrigin: string | null;
  /** Government warning statement */
  governmentWarning: string | null;
  /** Confidence level (0-1) if available */
  confidence?: number;
  /** Any notes or observations from extraction */
  notes?: string;
}
