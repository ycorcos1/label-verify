/**
 * Validation Engine for LabelVerify
 *
 * Implements validation rules and per-field status comparisons:
 * - Government Warning strict validation (canonical wording, uppercase check)
 * - Text field comparison (brand/producer with normalization)
 * - Numeric field comparison (ABV/proof/net contents)
 * - Overall application result computation
 */

import {
  FieldStatus,
  FieldResult,
  WarningResult,
  ApplicationResult,
  ExtractedValues,
  ApplicationValues,
  OverallStatus,
  BoldStatus,
  GovernmentWarningFontSize,
  GovernmentWarningVisibility,
} from '@/lib/types';
import { generateUUID, normalizeWhitespace, normalizeForComparison, removePunctuation, removeAccents } from '@/lib/utils';
import { FieldProvenance, MergedExtractionResult } from '@/lib/utils/mergeExtractions';

// ============================================================================
// Government Warning Validation
// ============================================================================

/**
 * The canonical required government warning statement.
 * This is the exact wording required on all alcohol labels.
 */
const CANONICAL_WARNING_TEXT = 
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

/**
 * Normalized version of the canonical warning for comparison
 */
const NORMALIZED_CANONICAL_WARNING = normalizeWhitespace(CANONICAL_WARNING_TEXT).toLowerCase();

/**
 * The required prefix that must be uppercase
 */
const WARNING_PREFIX = "GOVERNMENT WARNING:";

/**
 * Options for formatting observations from GPT-4 Vision
 */
export interface FormattingObservations {
  /** Whether the warning prefix appears in ALL CAPS */
  isUppercase?: boolean | null;
  /** Whether the warning prefix appears bold */
  isBold?: boolean | null;
  /** Observed font size relative to other label text */
  fontSize?: GovernmentWarningFontSize | null;
  /** Observed overall visibility/prominence */
  visibility?: GovernmentWarningVisibility | null;
}

/**
 * Validates the government warning statement against strict requirements:
 * - Word-for-word match with canonical wording (whitespace normalized)
 * - "GOVERNMENT WARNING:" prefix must be uppercase
 * - Bold formatting - can now be detected via GPT-4 Vision observations
 * - Font size and visibility observations for enhanced compliance checking
 *
 * @param extractedWarning - The warning text extracted from the label
 * @param formattingObservations - Optional formatting observations from GPT-4 Vision
 * @returns WarningResult with detailed validation status
 */
export function validateGovernmentWarning(
  extractedWarning: string | undefined,
  formattingObservations?: FormattingObservations
): WarningResult {
  // Handle missing warning
  if (!extractedWarning || extractedWarning.trim().length === 0) {
    return {
      extractedWarning: undefined,
      wordingStatus: FieldStatus.Missing,
      uppercaseStatus: FieldStatus.Missing,
      boldStatus: 'manual_confirm',
      overallStatus: FieldStatus.Missing,
      reason: 'Government warning statement not found on label',
    };
  }

  const trimmedWarning = extractedWarning.trim();
  const normalizedExtracted = normalizeWhitespace(trimmedWarning).toLowerCase();

  // Check uppercase prefix using GPT-4 Vision observation (preferred) or text analysis (fallback)
  let uppercaseStatus: FieldStatus = FieldStatus.Fail;
  let uppercaseReason = '';

  // First, check if we have a visual observation from GPT-4 Vision
  if (formattingObservations?.isUppercase === true) {
    // GPT-4 Vision confirmed the header is in ALL CAPS
    uppercaseStatus = FieldStatus.Pass;
  } else if (formattingObservations?.isUppercase === false) {
    // GPT-4 Vision confirmed the header is NOT in all caps
    uppercaseStatus = FieldStatus.Fail;
    uppercaseReason = '"GOVERNMENT WARNING:" is not in uppercase on the label';
  } else {
    // No visual observation available - fall back to text analysis
    // Note: This is less reliable because text extraction may normalize case
    if (trimmedWarning.includes(WARNING_PREFIX)) {
      uppercaseStatus = FieldStatus.Pass;
    } else if (trimmedWarning.toUpperCase().includes(WARNING_PREFIX)) {
      // The text contains the warning but not in uppercase
      // However, without visual confirmation, mark as needs review
      uppercaseStatus = FieldStatus.NeedsReview;
      uppercaseReason = 'Unable to confirm if "GOVERNMENT WARNING:" is uppercase - manual verification required';
    } else {
      uppercaseStatus = FieldStatus.Fail;
      uppercaseReason = 'Missing "GOVERNMENT WARNING:" prefix';
    }
  }

  // Check wording match
  let wordingStatus: FieldStatus = FieldStatus.Fail;
  let wordingReason = '';

  // Exact match after whitespace normalization (case-insensitive for wording check)
  if (normalizedExtracted === NORMALIZED_CANONICAL_WARNING) {
    wordingStatus = FieldStatus.Pass;
  } else {
    // Check if it's a partial match or close match
    const extractedWords = normalizedExtracted.split(/\s+/);
    const canonicalWords = NORMALIZED_CANONICAL_WARNING.split(/\s+/);
    
    // Calculate word overlap
    const matchingWords = extractedWords.filter(word => canonicalWords.includes(word));
    const overlapRatio = matchingWords.length / canonicalWords.length;

    if (overlapRatio >= 0.9) {
      // Very close but not exact - needs review
      wordingStatus = FieldStatus.NeedsReview;
      wordingReason = 'Warning wording is close but not an exact match';
    } else if (overlapRatio >= 0.7) {
      // Partial match - likely the right warning but with issues
      wordingStatus = FieldStatus.Fail;
      wordingReason = 'Warning wording has significant deviations from required text';
    } else if (overlapRatio >= 0.3) {
      // Some overlap - may be a warning but very different
      wordingStatus = FieldStatus.Fail;
      wordingReason = 'Warning wording does not match required government warning';
    } else {
      // Very little overlap - probably not a valid warning
      wordingStatus = FieldStatus.Fail;
      wordingReason = 'Extracted text does not appear to be a valid government warning';
    }
  }

  // Determine bold status based on formatting observations
  let boldStatus: BoldStatus = 'manual_confirm';
  let formattingReason: string | undefined;
  const formattingIssues: string[] = [];

  if (formattingObservations) {
    // Bold detection
    if (formattingObservations.isBold === true) {
      boldStatus = 'detected';
    } else if (formattingObservations.isBold === false) {
      boldStatus = 'not_detected';
      formattingIssues.push('"GOVERNMENT WARNING:" does not appear to be bold');
    }
    // If null, keep as 'manual_confirm'

    // Font size check
    if (formattingObservations.fontSize === 'very_small') {
      formattingIssues.push('Warning text appears very small');
    } else if (formattingObservations.fontSize === 'small') {
      formattingIssues.push('Warning text appears smaller than recommended');
    }

    // Visibility check
    if (formattingObservations.visibility === 'subtle') {
      formattingIssues.push('Warning has low visibility/prominence');
    }

    if (formattingIssues.length > 0) {
      formattingReason = formattingIssues.join('; ');
    }
  }

  // Compute overall status
  let overallStatus: FieldStatus;
  let overallReason: string;

  // Determine if there are formatting concerns that should affect status
  // boldStatus: 'detected' = pass, 'not_detected' = needs review, 'manual_confirm' = needs review
  // Since AI bold detection is unreliable, both uncertain and "not detected" trigger review (not fail)
  const needsBoldReview = boldStatus === 'not_detected' || boldStatus === 'manual_confirm';
  const hasFormattingConcerns = formattingObservations && (
    formattingObservations.fontSize === 'very_small' ||
    formattingObservations.visibility === 'subtle'
  );

  if (wordingStatus === FieldStatus.Pass && uppercaseStatus === FieldStatus.Pass) {
    if (needsBoldReview) {
      // Wording and uppercase pass, but bold needs manual verification
      overallStatus = FieldStatus.NeedsReview;
      overallReason = boldStatus === 'not_detected'
        ? 'AI did not detect bold formatting - manual verification required'
        : 'Unable to confirm if "GOVERNMENT WARNING:" is bold - manual verification required';
    } else if (hasFormattingConcerns) {
      // Wording and uppercase pass, bold detected, but there are visibility concerns
      overallStatus = FieldStatus.NeedsReview;
      overallReason = formattingReason || 'Warning has formatting concerns';
    } else if (boldStatus === 'detected') {
      // Everything passes including bold detection
      overallStatus = FieldStatus.Pass;
      overallReason = 'Government warning matches all requirements';
    } else {
      // Fallback - shouldn't reach here but handle gracefully
      overallStatus = FieldStatus.Pass;
      overallReason = 'Government warning matches required text';
    }
  } else if (wordingStatus === FieldStatus.Fail || uppercaseStatus === FieldStatus.Fail) {
    overallStatus = FieldStatus.Fail;
    // Combine reasons
    const reasons: string[] = [];
    if (wordingReason) reasons.push(wordingReason);
    if (uppercaseReason) reasons.push(uppercaseReason);
    if (formattingReason) reasons.push(formattingReason);
    overallReason = reasons.join('; ') || 'Government warning validation failed';
  } else {
    overallStatus = FieldStatus.NeedsReview;
    const reasons: string[] = [];
    if (wordingReason) reasons.push(wordingReason);
    if (formattingReason) reasons.push(formattingReason);
    overallReason = reasons.join('; ') || 'Government warning requires manual review';
  }

  return {
    extractedWarning: trimmedWarning,
    wordingStatus,
    uppercaseStatus,
    boldStatus,
    overallStatus,
    reason: overallReason,
    // Include formatting observations in the result
    observedIsUppercase: formattingObservations?.isUppercase,
    observedIsBold: formattingObservations?.isBold,
    observedFontSize: formattingObservations?.fontSize,
    observedVisibility: formattingObservations?.visibility,
    formattingReason,
  };
}

// ============================================================================
// Text Field Comparison
// ============================================================================

/**
 * Result of a text field comparison
 */
interface TextComparisonResult {
  status: FieldStatus;
  reason?: string;
}

/**
 * Compares text fields (brand, producer, class/type, country) with normalization.
 * Allows for case/punctuation differences that may yield "Needs Review" instead of "Fail".
 *
 * @param extracted - The extracted value from the label
 * @param expected - The expected value from the application (may be undefined)
 * @returns Comparison result with status and reason
 */
export function compareTextField(
  extracted: string | undefined,
  expected: string | undefined
): TextComparisonResult {
  // No expected value provided - label-only mode
  if (expected === undefined || expected.trim() === '') {
    if (extracted === undefined || extracted.trim() === '') {
      return { status: FieldStatus.Missing, reason: 'Value not found on label' };
    }
    return { status: FieldStatus.NotProvided, reason: 'Application value not provided' };
  }

  // No extracted value
  if (extracted === undefined || extracted.trim() === '') {
    return { status: FieldStatus.Missing, reason: 'Value not found on label' };
  }

  const trimmedExtracted = extracted.trim();
  const trimmedExpected = expected.trim();

  // Exact match
  if (trimmedExtracted === trimmedExpected) {
    return { status: FieldStatus.Pass };
  }

  // Normalized comparison (case + whitespace)
  const normalizedExtracted = normalizeForComparison(trimmedExtracted);
  const normalizedExpected = normalizeForComparison(trimmedExpected);

  if (normalizedExtracted === normalizedExpected) {
    return { status: FieldStatus.Pass };
  }

  // Comparison without punctuation
  const noPunctExtracted = removePunctuation(normalizedExtracted);
  const noPunctExpected = removePunctuation(normalizedExpected);

  if (noPunctExtracted === noPunctExpected) {
    // Same content, just punctuation differences - pass with note
    return { status: FieldStatus.Pass };
  }

  // Comparison with accent/diacritic normalization
  // This handles cases like "Bärenjäger" vs "Barenjager", "Café" vs "Cafe"
  const noAccentExtracted = removeAccents(noPunctExtracted);
  const noAccentExpected = removeAccents(noPunctExpected);

  if (noAccentExtracted === noAccentExpected) {
    // Same content after accent normalization - pass
    return { status: FieldStatus.Pass };
  }

  // Check for containment (one contains the other)
  // Use accent-normalized versions for more robust matching
  if (noAccentExtracted.includes(noAccentExpected) || 
      noAccentExpected.includes(noAccentExtracted)) {
    // One is a substring of the other
    const shorter = noAccentExtracted.length < noAccentExpected.length 
      ? noAccentExtracted 
      : noAccentExpected;
    const longer = noAccentExtracted.length >= noAccentExpected.length 
      ? noAccentExtracted 
      : noAccentExpected;
    
    const ratio = shorter.length / longer.length;
    
    if (ratio >= 0.8) {
      // Very close - likely minor variation
      return { 
        status: FieldStatus.NeedsReview, 
        reason: 'Values are similar but not exact match' 
      };
    } else if (ratio >= 0.5) {
      // Partial match - needs review
      return { 
        status: FieldStatus.NeedsReview, 
        reason: 'Extracted value differs significantly from expected' 
      };
    }
  }

  // Calculate word-level similarity for longer strings
  // Use accent-normalized versions for more robust matching
  const extractedWords = noAccentExtracted.split(/\s+/);
  const expectedWords = noAccentExpected.split(/\s+/);
  
  if (extractedWords.length >= 2 && expectedWords.length >= 2) {
    const commonWords = extractedWords.filter(w => 
      expectedWords.some(ew => ew === w || ew.includes(w) || w.includes(ew))
    );
    const similarity = commonWords.length / Math.max(extractedWords.length, expectedWords.length);
    
    if (similarity >= 0.7) {
      return { 
        status: FieldStatus.NeedsReview, 
        reason: 'Partial match - please verify' 
      };
    }
  }

  // No match
  return { 
    status: FieldStatus.Fail, 
    reason: `Expected "${trimmedExpected}" but found "${trimmedExtracted}"` 
  };
}

// ============================================================================
// Numeric Field Comparison
// ============================================================================

/**
 * Parses a numeric value from various formats:
 * - ABV: "40%", "40% ABV", "40 ABV"
 * - Proof: "80 proof", "80°"
 * - Net contents: "750ml", "750 ml", "1L", "1 liter"
 *
 * @param value - The string value to parse
 * @returns Parsed numeric value and unit, or null if unparseable
 */
interface ParsedNumericValue {
  value: number;
  unit: 'percent' | 'proof' | 'ml' | 'l' | 'oz' | 'unknown';
  original: string;
}

function parseNumericValue(value: string): ParsedNumericValue | null {
  const trimmed = value.trim().toLowerCase();
  
  // Try to extract number
  const numberMatch = trimmed.match(/(\d+(?:\.\d+)?)/);
  if (!numberMatch) {
    return null;
  }
  
  const numValue = parseFloat(numberMatch[1]);
  
  // Determine unit
  if (trimmed.includes('%') || trimmed.includes('abv') || trimmed.includes('alc')) {
    return { value: numValue, unit: 'percent', original: value };
  }
  
  if (trimmed.includes('proof')) {
    return { value: numValue, unit: 'proof', original: value };
  }
  
  if (trimmed.includes('ml') || trimmed.includes('milliliter')) {
    return { value: numValue, unit: 'ml', original: value };
  }
  
  if (trimmed.includes('l') && !trimmed.includes('ml')) {
    // Likely liters
    return { value: numValue, unit: 'l', original: value };
  }
  
  if (trimmed.includes('oz') || trimmed.includes('ounce')) {
    return { value: numValue, unit: 'oz', original: value };
  }
  
  // Just a number - might be ABV if context suggests
  return { value: numValue, unit: 'unknown', original: value };
}

/**
 * Converts proof to ABV percentage
 */
function proofToAbv(proof: number): number {
  return proof / 2;
}

/**
 * Converts volume to milliliters for comparison
 */
function toMilliliters(value: number, unit: 'ml' | 'l' | 'oz' | 'unknown'): number {
  switch (unit) {
    case 'ml': return value;
    case 'l': return value * 1000;
    case 'oz': return value * 29.5735; // fluid ounces to ml
    default: return value; // assume ml if unknown
  }
}

/**
 * Compares numeric fields (ABV/proof, net contents) with appropriate conversions.
 * Stricter than text comparison - mismatches generally fail.
 *
 * @param extracted - The extracted value from the label
 * @param expected - The expected value from the application
 * @param fieldType - The type of field for appropriate conversion logic
 * @returns Comparison result with status and reason
 */
export function compareNumericField(
  extracted: string | undefined,
  expected: string | undefined,
  fieldType: 'abv' | 'netContents'
): TextComparisonResult {
  // No expected value provided - label-only mode
  if (expected === undefined || expected.trim() === '') {
    if (extracted === undefined || extracted.trim() === '') {
      return { status: FieldStatus.Missing, reason: 'Value not found on label' };
    }
    return { status: FieldStatus.NotProvided, reason: 'Application value not provided' };
  }

  // No extracted value
  if (extracted === undefined || extracted.trim() === '') {
    return { status: FieldStatus.Missing, reason: 'Value not found on label' };
  }

  const parsedExtracted = parseNumericValue(extracted);
  const parsedExpected = parseNumericValue(expected);

  // Can't parse either value - treat as text comparison
  if (!parsedExtracted || !parsedExpected) {
    // Fall back to normalized string comparison
    if (normalizeForComparison(extracted) === normalizeForComparison(expected)) {
      return { status: FieldStatus.Pass };
    }
    return { 
      status: FieldStatus.NeedsReview, 
      reason: 'Unable to parse numeric values - manual review required' 
    };
  }

  if (fieldType === 'abv') {
    // Handle ABV / Proof comparison
    let extractedAbv = parsedExtracted.value;
    let expectedAbv = parsedExpected.value;
    
    // Convert proof to ABV if needed
    if (parsedExtracted.unit === 'proof') {
      extractedAbv = proofToAbv(parsedExtracted.value);
    }
    if (parsedExpected.unit === 'proof') {
      expectedAbv = proofToAbv(parsedExpected.value);
    }

    // Check for proof vs ABV mismatch (should flag for review)
    const unitMismatch = 
      (parsedExtracted.unit === 'proof' && parsedExpected.unit === 'percent') ||
      (parsedExtracted.unit === 'percent' && parsedExpected.unit === 'proof');

    // Compare ABV values
    if (Math.abs(extractedAbv - expectedAbv) < 0.1) {
      if (unitMismatch) {
        return { 
          status: FieldStatus.Pass, 
          reason: 'ABV/proof match after conversion' 
        };
      }
      return { status: FieldStatus.Pass };
    }

    // Small difference - needs review
    if (Math.abs(extractedAbv - expectedAbv) < 1.0) {
      return { 
        status: FieldStatus.NeedsReview, 
        reason: `ABV differs slightly: ${extractedAbv.toFixed(1)}% vs ${expectedAbv.toFixed(1)}%` 
      };
    }

    // Significant difference - fail
    return { 
      status: FieldStatus.Fail, 
      reason: `ABV mismatch: expected ${expectedAbv.toFixed(1)}% but found ${extractedAbv.toFixed(1)}%` 
    };
  }

  if (fieldType === 'netContents') {
    // Handle volume comparison
    let extractedMl = parsedExtracted.value;
    let expectedMl = parsedExpected.value;
    
    // Convert to ml for comparison
    if (parsedExtracted.unit === 'ml' || parsedExtracted.unit === 'l' || parsedExtracted.unit === 'oz') {
      extractedMl = toMilliliters(parsedExtracted.value, parsedExtracted.unit);
    }
    if (parsedExpected.unit === 'ml' || parsedExpected.unit === 'l' || parsedExpected.unit === 'oz') {
      expectedMl = toMilliliters(parsedExpected.value, parsedExpected.unit);
    }

    // Exact match or very close (within 1ml)
    if (Math.abs(extractedMl - expectedMl) <= 1) {
      return { status: FieldStatus.Pass };
    }

    // Same order of magnitude - might be unit confusion
    const ratio = extractedMl / expectedMl;
    if (ratio >= 0.99 && ratio <= 1.01) {
      return { status: FieldStatus.Pass };
    }

    // Could be 1000x off (L vs ml confusion)
    if (Math.abs(ratio - 1000) < 10 || Math.abs(ratio - 0.001) < 0.0001) {
      return { 
        status: FieldStatus.NeedsReview, 
        reason: 'Possible unit confusion (L vs ml) - please verify' 
      };
    }

    // Small percentage difference - needs review
    if (ratio >= 0.95 && ratio <= 1.05) {
      return { 
        status: FieldStatus.NeedsReview, 
        reason: `Net contents differ slightly: ${extracted} vs ${expected}` 
      };
    }

    // Significant difference - fail
    return { 
      status: FieldStatus.Fail, 
      reason: `Net contents mismatch: expected ${expected} but found ${extracted}` 
    };
  }

  // Default comparison for unknown field types
  if (parsedExtracted.value === parsedExpected.value) {
    return { status: FieldStatus.Pass };
  }

  return { 
    status: FieldStatus.Fail, 
    reason: `Value mismatch: expected ${expected} but found ${extracted}` 
  };
}

// ============================================================================
// Field Validation Helpers
// ============================================================================

/**
 * Field names for human-readable display
 */
const FIELD_DISPLAY_NAMES: Record<string, string> = {
  brand: 'Brand Name',
  classType: 'Class/Type',
  abvOrProof: 'ABV/Proof',
  netContents: 'Net Contents',
  producer: 'Producer/Bottler',
  country: 'Country of Origin',
  governmentWarning: 'Government Warning',
};

/**
 * Validates a single field and returns a FieldResult
 */
function validateField(
  fieldName: keyof ExtractedValues,
  extractedValue: string | undefined,
  expectedValue: string | undefined,
  provenance?: FieldProvenance
): FieldResult {
  const displayName = FIELD_DISPLAY_NAMES[fieldName] || fieldName;
  let comparisonResult: TextComparisonResult;

  // Use appropriate comparison method based on field type
  if (fieldName === 'abvOrProof') {
    comparisonResult = compareNumericField(extractedValue, expectedValue, 'abv');
  } else if (fieldName === 'netContents') {
    comparisonResult = compareNumericField(extractedValue, expectedValue, 'netContents');
  } else {
    comparisonResult = compareTextField(extractedValue, expectedValue);
  }

  // Build the field result
  const result: FieldResult = {
    fieldName: displayName,
    extractedValue,
    expectedValue,
    status: comparisonResult.status,
    reason: comparisonResult.reason,
  };

  // Add provenance info if available
  if (provenance) {
    if (provenance.sourceIndex >= 0) {
      result.sourceImageIndices = [provenance.sourceIndex];
    }
    
    // If provenance indicates conflict, upgrade to NeedsReview if not already failing
    if (provenance.needsReview) {
      if (result.status === FieldStatus.Pass) {
        result.status = FieldStatus.NeedsReview;
        result.reason = provenance.reviewReason || 'Conflicting values found in images';
      }
      if (provenance.conflictingCandidates) {
        result.candidates = provenance.conflictingCandidates;
      }
      if (provenance.conflictingSourceIndices) {
        result.sourceImageIndices = provenance.conflictingSourceIndices;
      }
    }
  }

  return result;
}

// ============================================================================
// Application Result Computation
// ============================================================================

/**
 * Computes the complete validation result for an application.
 *
 * @param extracted - The merged extracted values from OCR
 * @param expected - The expected application values (optional for label-only mode)
 * @param mergeResult - The merge result with provenance info (optional)
 * @param applicationId - The ID of the application being validated
 * @param applicationName - The display name of the application
 * @param processingTimeMs - Processing time in milliseconds
 * @param imageCount - Number of images processed
 * @returns Complete ApplicationResult with all validation details
 */
export function computeApplicationResult(
  extracted: ExtractedValues,
  expected?: ApplicationValues,
  mergeResult?: MergedExtractionResult,
  applicationId: string = generateUUID(),
  applicationName: string = 'Application',
  processingTimeMs: number = 0,
  imageCount: number = 1
): ApplicationResult {
  const fieldResults: FieldResult[] = [];
  const failReasons: string[] = [];
  const reviewReasons: string[] = [];

  // Get provenance info if available
  const provenance = mergeResult?.provenance;

  // Validate each field (excluding governmentWarning which has special handling)
  const fieldsToValidate: (keyof ExtractedValues)[] = [
    'brand',
    'classType',
    'abvOrProof',
    'netContents',
    'producer',
    'country',
  ];

  for (const field of fieldsToValidate) {
    const extractedValue = extracted[field];
    const expectedValue = expected?.[field as keyof ApplicationValues];
    const fieldProvenance = provenance?.[field];

    const result = validateField(field, extractedValue, expectedValue, fieldProvenance);
    fieldResults.push(result);

    // Collect reasons for summary
    if (result.status === FieldStatus.Fail && result.reason) {
      failReasons.push(`${result.fieldName}: ${result.reason}`);
    } else if (result.status === FieldStatus.NeedsReview && result.reason) {
      reviewReasons.push(`${result.fieldName}: ${result.reason}`);
    } else if (result.status === FieldStatus.Missing) {
      // Only flag as a concern if expected value was provided
      if (expectedValue) {
        failReasons.push(`${result.fieldName}: not found on label`);
      }
    }
  }

  // Validate government warning (special handling)
  // Pass formatting observations if available from merged extraction result
  const formattingObs = mergeResult?.formattingObservations;
  const warningResult = validateGovernmentWarning(
    extracted.governmentWarning,
    formattingObs ? {
      isUppercase: formattingObs.isUppercase,
      isBold: formattingObs.isBold,
      fontSize: formattingObs.fontSize,
      visibility: formattingObs.visibility,
    } : undefined
  );

  // Add warning to fail/review reasons
  if (warningResult.overallStatus === FieldStatus.Fail && warningResult.reason) {
    failReasons.unshift(`Government Warning: ${warningResult.reason}`);
  } else if (warningResult.overallStatus === FieldStatus.NeedsReview && warningResult.reason) {
    reviewReasons.unshift(`Government Warning: ${warningResult.reason}`);
  } else if (warningResult.overallStatus === FieldStatus.Missing) {
    failReasons.unshift('Government Warning: not found on label');
  }

  // Compute overall status
  let overallStatus: OverallStatus;
  const hasFailures = failReasons.length > 0 || 
    fieldResults.some(r => r.status === FieldStatus.Fail) ||
    warningResult.overallStatus === FieldStatus.Fail ||
    warningResult.overallStatus === FieldStatus.Missing;
  
  const hasReviewNeeded = reviewReasons.length > 0 || 
    fieldResults.some(r => r.status === FieldStatus.NeedsReview) ||
    warningResult.overallStatus === FieldStatus.NeedsReview;

  if (hasFailures) {
    overallStatus = 'fail';
  } else if (hasReviewNeeded) {
    overallStatus = 'needs_review';
  } else {
    overallStatus = 'pass';
  }

  // Build top reasons (1-3)
  const topReasons: string[] = [];
  
  // Prioritize fail reasons, then review reasons
  for (const reason of failReasons.slice(0, 3)) {
    topReasons.push(reason);
  }
  
  if (topReasons.length < 3) {
    for (const reason of reviewReasons.slice(0, 3 - topReasons.length)) {
      topReasons.push(reason);
    }
  }

  // If pass and no reasons, add a success message
  if (topReasons.length === 0 && overallStatus === 'pass') {
    topReasons.push('All validated fields match');
  }

  return {
    id: generateUUID(),
    applicationId,
    applicationName,
    overallStatus,
    topReasons,
    fieldResults,
    warningResult,
    processingTimeMs,
    imageCount,
  };
}

/**
 * Computes an error result for an application that failed processing
 */
export function computeErrorResult(
  applicationId: string,
  applicationName: string,
  errorMessage: string,
  imageCount: number = 1
): ApplicationResult {
  // Create empty field results
  const fieldResults: FieldResult[] = [
    'Brand Name',
    'Class/Type',
    'ABV/Proof',
    'Net Contents',
    'Producer/Bottler',
    'Country of Origin',
  ].map(fieldName => ({
    fieldName,
    status: FieldStatus.Missing,
    reason: 'Processing error - unable to extract',
  }));

  // Create empty warning result
  const warningResult: WarningResult = {
    wordingStatus: FieldStatus.Missing,
    uppercaseStatus: FieldStatus.Missing,
    boldStatus: 'manual_confirm',
    overallStatus: FieldStatus.Missing,
    reason: 'Processing error - unable to validate',
  };

  return {
    id: generateUUID(),
    applicationId,
    applicationName,
    overallStatus: 'error',
    topReasons: [errorMessage],
    fieldResults,
    warningResult,
    processingTimeMs: 0,
    imageCount,
    errorMessage,
  };
}
