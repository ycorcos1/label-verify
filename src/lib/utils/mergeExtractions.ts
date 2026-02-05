/**
 * Merge Extractions Utility
 *
 * When an application has multiple images, this utility merges
 * individual extraction results into one application-level extracted record.
 *
 * Logic:
 * - Pick first confident non-empty value per field
 * - If conflicting candidates exist, mark field NeedsReview with top 2 candidates
 * - Track source image index for each chosen field
 */

import { ExtractionResponse, ExtractedValues, FieldStatus, GovernmentWarningFontSize, GovernmentWarningVisibility } from '@/lib/types';
import { normalizeForComparison } from './index';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of merging a single field across multiple extractions
 */
export interface MergedFieldResult {
  /** The chosen value for this field (may be undefined if not found in any image) */
  value: string | undefined;
  /** Source image index that provided this value (-1 if not found) */
  sourceIndex: number;
  /** All unique candidates found across images (for transparency) */
  candidates: string[];
  /** Source indices for each candidate */
  candidateSourceIndices: number[];
  /** Whether this field needs review due to conflicting values */
  needsReview: boolean;
  /** Reason for needing review (if applicable) */
  reviewReason?: string;
}

/**
 * Provenance information for a field - tracks where the value came from
 */
export interface FieldProvenance {
  /** Source image index that provided this value */
  sourceIndex: number;
  /** Whether this field has conflicts and needs review */
  needsReview: boolean;
  /** Conflicting candidates if any (top 2) */
  conflictingCandidates?: string[];
  /** Source indices for conflicting candidates */
  conflictingSourceIndices?: number[];
  /** Reason for needing review */
  reviewReason?: string;
}

/**
 * Aggregated formatting observations for government warning
 */
export interface FormattingObservationsResult {
  /** Whether the warning prefix appears in ALL CAPS (false if any image shows lowercase) */
  isUppercase?: boolean | null;
  /** Whether the warning prefix appears bold (true if any image observed bold) */
  isBold?: boolean | null;
  /** Most conservative font size observation (smallest = worst case) */
  fontSize?: GovernmentWarningFontSize | null;
  /** Most conservative visibility observation (least visible = worst case) */
  visibility?: GovernmentWarningVisibility | null;
  /** Source image indices that provided formatting observations */
  sourceImageIndices: number[];
}

/**
 * Complete result of merging extractions from multiple images
 */
export interface MergedExtractionResult {
  /** The merged extracted values */
  extractedValues: ExtractedValues;
  /** Per-field provenance information */
  provenance: Record<keyof ExtractedValues, FieldProvenance>;
  /** Overall status hint - whether any field needs review */
  hasConflicts: boolean;
  /** Number of fields that need review */
  conflictCount: number;
  /** All images contributed to the extraction */
  contributingImageIndices: number[];
  /** Aggregated formatting observations for government warning */
  formattingObservations?: FormattingObservationsResult;
}

/**
 * Input extraction with its source image index
 */
export interface IndexedExtraction {
  /** The extraction response from OpenAI */
  extraction: ExtractionResponse;
  /** The source image index (0-based) */
  imageIndex: number;
}

// ============================================================================
// Field Mapping
// ============================================================================

/**
 * Maps ExtractionResponse fields to ExtractedValues fields
 */
const FIELD_MAPPING: Record<string, keyof ExtractedValues> = {
  brandName: 'brand',
  classType: 'classType',
  alcoholContent: 'abvOrProof',
  netContents: 'netContents',
  bottlerProducer: 'producer',
  countryOfOrigin: 'country',
  governmentWarning: 'governmentWarning',
};

/**
 * All extraction fields to process
 */
const EXTRACTION_FIELDS = [
  'brandName',
  'classType',
  'alcoholContent',
  'netContents',
  'bottlerProducer',
  'countryOfOrigin',
  'governmentWarning',
] as const;

type ExtractionFieldKey = (typeof EXTRACTION_FIELDS)[number];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if a value is non-empty and meaningful
 */
function isNonEmptyValue(value: string | null | undefined): value is string {
  if (value === null || value === undefined) {
    return false;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.toLowerCase() !== 'null' && trimmed !== 'n/a';
}

/**
 * Checks if two values are semantically equivalent (for conflict detection)
 * Uses normalized comparison to allow for minor differences
 */
function areValuesEquivalent(value1: string, value2: string): boolean {
  const norm1 = normalizeForComparison(value1);
  const norm2 = normalizeForComparison(value2);
  
  // Exact match after normalization
  if (norm1 === norm2) {
    return true;
  }
  
  // Check if one contains the other (for partial matches)
  // This handles cases like "Jack Daniel's" vs "Jack Daniel's Tennessee Whiskey"
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    // Only consider equivalent if the shorter is at least 80% of the longer
    const shorter = norm1.length < norm2.length ? norm1 : norm2;
    const longer = norm1.length >= norm2.length ? norm1 : norm2;
    if (shorter.length / longer.length >= 0.8) {
      return true;
    }
  }
  
  return false;
}

/**
 * Gets the confidence-based priority of an extraction
 * Higher confidence = higher priority
 */
function getExtractionPriority(extraction: ExtractionResponse): number {
  return extraction.confidence ?? 0.5; // Default to 0.5 if no confidence
}

/**
 * Merges a single field across multiple extractions
 */
function mergeField(
  fieldKey: ExtractionFieldKey,
  indexedExtractions: IndexedExtraction[]
): MergedFieldResult {
  // Collect all non-empty values with their sources
  const valuesWithSources: Array<{
    value: string;
    sourceIndex: number;
    confidence: number;
  }> = [];
  
  for (const { extraction, imageIndex } of indexedExtractions) {
    const rawValue = extraction[fieldKey];
    if (isNonEmptyValue(rawValue)) {
      valuesWithSources.push({
        value: rawValue,
        sourceIndex: imageIndex,
        confidence: getExtractionPriority(extraction),
      });
    }
  }
  
  // No values found
  if (valuesWithSources.length === 0) {
    return {
      value: undefined,
      sourceIndex: -1,
      candidates: [],
      candidateSourceIndices: [],
      needsReview: false,
    };
  }
  
  // Single value found - use it directly
  if (valuesWithSources.length === 1) {
    return {
      value: valuesWithSources[0].value,
      sourceIndex: valuesWithSources[0].sourceIndex,
      candidates: [valuesWithSources[0].value],
      candidateSourceIndices: [valuesWithSources[0].sourceIndex],
      needsReview: false,
    };
  }
  
  // Multiple values found - check for conflicts
  // Sort by confidence (higher first), then by image index (earlier first)
  const sorted = [...valuesWithSources].sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    return a.sourceIndex - b.sourceIndex;
  });
  
  // Group equivalent values together
  const uniqueCandidates: Array<{
    value: string;
    sourceIndices: number[];
    bestConfidence: number;
  }> = [];
  
  for (const item of sorted) {
    const existingGroup = uniqueCandidates.find(group =>
      areValuesEquivalent(group.value, item.value)
    );
    
    if (existingGroup) {
      existingGroup.sourceIndices.push(item.sourceIndex);
    } else {
      uniqueCandidates.push({
        value: item.value,
        sourceIndices: [item.sourceIndex],
        bestConfidence: item.confidence,
      });
    }
  }
  
  // Sort unique candidates by confidence
  uniqueCandidates.sort((a, b) => b.bestConfidence - a.bestConfidence);
  
  // If all values are equivalent, no conflict
  if (uniqueCandidates.length === 1) {
    return {
      value: uniqueCandidates[0].value,
      sourceIndex: uniqueCandidates[0].sourceIndices[0],
      candidates: [uniqueCandidates[0].value],
      candidateSourceIndices: uniqueCandidates[0].sourceIndices,
      needsReview: false,
    };
  }
  
  // Conflict detected - use the highest confidence value but mark for review
  const topCandidates = uniqueCandidates.slice(0, 2); // Keep top 2
  
  return {
    value: topCandidates[0].value,
    sourceIndex: topCandidates[0].sourceIndices[0],
    candidates: topCandidates.map(c => c.value),
    candidateSourceIndices: topCandidates.flatMap(c => c.sourceIndices),
    needsReview: true,
    reviewReason: `Conflicting values found: "${topCandidates[0].value}" vs "${topCandidates[1].value}"`,
  };
}

// ============================================================================
// Formatting Observations Aggregation
// ============================================================================

/**
 * Font size severity ranking (lower = worse)
 */
const FONT_SIZE_SEVERITY: Record<GovernmentWarningFontSize, number> = {
  'very_small': 1,
  'small': 2,
  'normal': 3,
};

/**
 * Visibility severity ranking (lower = worse)
 */
const VISIBILITY_SEVERITY: Record<GovernmentWarningVisibility, number> = {
  'subtle': 1,
  'moderate': 2,
  'prominent': 3,
};

/**
 * Aggregates formatting observations from multiple extractions.
 * Uses conservative aggregation:
 * - isUppercase: false if ANY image shows lowercase (conservative - fail if any shows lowercase)
 * - isBold: true if ANY image shows bold (benefit of the doubt)
 * - fontSize: smallest/worst size observed (conservative)
 * - visibility: least visible observed (conservative)
 */
function aggregateFormattingObservations(
  extractions: IndexedExtraction[]
): FormattingObservationsResult | undefined {
  const sourceImageIndices: number[] = [];
  let aggregatedIsUppercase: boolean | null = null;
  let aggregatedIsBold: boolean | null = null;
  let aggregatedFontSize: GovernmentWarningFontSize | null = null;
  let aggregatedVisibility: GovernmentWarningVisibility | null = null;
  
  let hasAnyObservation = false;
  
  for (const { extraction, imageIndex } of extractions) {
    const { governmentWarningIsUppercase, governmentWarningIsBold, governmentWarningFontSize, governmentWarningVisibility } = extraction;
    
    // Track if this image contributed any observation
    const hasObservation = 
      governmentWarningIsUppercase !== undefined && governmentWarningIsUppercase !== null ||
      governmentWarningIsBold !== undefined && governmentWarningIsBold !== null ||
      governmentWarningFontSize !== undefined && governmentWarningFontSize !== null ||
      governmentWarningVisibility !== undefined && governmentWarningVisibility !== null;
    
    if (hasObservation) {
      sourceImageIndices.push(imageIndex);
      hasAnyObservation = true;
    }
    
    // Aggregate uppercase: false if ANY image shows lowercase (conservative approach)
    // We want to catch non-uppercase labels, so if any image shows it's not uppercase, that's the result
    if (governmentWarningIsUppercase === false) {
      aggregatedIsUppercase = false;
    } else if (governmentWarningIsUppercase === true && aggregatedIsUppercase !== false) {
      aggregatedIsUppercase = true;
    }
    
    // Aggregate bold: true if ANY image shows bold
    if (governmentWarningIsBold === true) {
      aggregatedIsBold = true;
    } else if (governmentWarningIsBold === false && aggregatedIsBold !== true) {
      aggregatedIsBold = false;
    }
    
    // Aggregate font size: keep the smallest (worst case)
    if (governmentWarningFontSize !== undefined && governmentWarningFontSize !== null) {
      if (aggregatedFontSize === null) {
        aggregatedFontSize = governmentWarningFontSize;
      } else {
        const currentSeverity = FONT_SIZE_SEVERITY[aggregatedFontSize];
        const newSeverity = FONT_SIZE_SEVERITY[governmentWarningFontSize];
        if (newSeverity < currentSeverity) {
          aggregatedFontSize = governmentWarningFontSize;
        }
      }
    }
    
    // Aggregate visibility: keep the least visible (worst case)
    if (governmentWarningVisibility !== undefined && governmentWarningVisibility !== null) {
      if (aggregatedVisibility === null) {
        aggregatedVisibility = governmentWarningVisibility;
      } else {
        const currentSeverity = VISIBILITY_SEVERITY[aggregatedVisibility];
        const newSeverity = VISIBILITY_SEVERITY[governmentWarningVisibility];
        if (newSeverity < currentSeverity) {
          aggregatedVisibility = governmentWarningVisibility;
        }
      }
    }
  }
  
  // Only return if there's at least one observation
  if (!hasAnyObservation) {
    return undefined;
  }
  
  return {
    isUppercase: aggregatedIsUppercase,
    isBold: aggregatedIsBold,
    fontSize: aggregatedFontSize,
    visibility: aggregatedVisibility,
    sourceImageIndices,
  };
}

// ============================================================================
// Main Merge Function
// ============================================================================

/**
 * Merges extraction results from multiple images into a single application-level record.
 *
 * @param extractions - Array of extraction responses with their source image indices
 * @returns Merged extraction result with provenance information
 */
export function mergeExtractions(
  extractions: IndexedExtraction[]
): MergedExtractionResult {
  // Handle empty input
  if (extractions.length === 0) {
    const emptyProvenance = {} as Record<keyof ExtractedValues, FieldProvenance>;
    const fields: (keyof ExtractedValues)[] = [
      'brand',
      'classType',
      'abvOrProof',
      'netContents',
      'producer',
      'country',
      'governmentWarning',
    ];
    
    for (const field of fields) {
      emptyProvenance[field] = {
        sourceIndex: -1,
        needsReview: false,
      };
    }
    
    return {
      extractedValues: {},
      provenance: emptyProvenance,
      hasConflicts: false,
      conflictCount: 0,
      contributingImageIndices: [],
    };
  }
  
  // Handle single extraction (no merging needed)
  if (extractions.length === 1) {
    const { extraction, imageIndex } = extractions[0];
    const extractedValues: ExtractedValues = {};
    const provenance = {} as Record<keyof ExtractedValues, FieldProvenance>;
    
    for (const fieldKey of EXTRACTION_FIELDS) {
      const targetField = FIELD_MAPPING[fieldKey];
      const rawValue = extraction[fieldKey];
      
      if (isNonEmptyValue(rawValue)) {
        extractedValues[targetField] = rawValue;
        provenance[targetField] = {
          sourceIndex: imageIndex,
          needsReview: false,
        };
      } else {
        provenance[targetField] = {
          sourceIndex: -1,
          needsReview: false,
        };
      }
    }
    
    // Extract formatting observations from single image
    const formattingObservations = aggregateFormattingObservations(extractions);
    
    return {
      extractedValues,
      provenance,
      hasConflicts: false,
      conflictCount: 0,
      contributingImageIndices: [imageIndex],
      formattingObservations,
    };
  }
  
  // Merge multiple extractions
  const extractedValues: ExtractedValues = {};
  const provenance = {} as Record<keyof ExtractedValues, FieldProvenance>;
  let conflictCount = 0;
  const contributingIndices = new Set<number>();
  
  for (const fieldKey of EXTRACTION_FIELDS) {
    const targetField = FIELD_MAPPING[fieldKey];
    const mergedField = mergeField(fieldKey, extractions);
    
    if (mergedField.value !== undefined) {
      extractedValues[targetField] = mergedField.value;
      contributingIndices.add(mergedField.sourceIndex);
    }
    
    provenance[targetField] = {
      sourceIndex: mergedField.sourceIndex,
      needsReview: mergedField.needsReview,
    };
    
    if (mergedField.needsReview) {
      conflictCount++;
      provenance[targetField].conflictingCandidates = mergedField.candidates;
      provenance[targetField].conflictingSourceIndices = mergedField.candidateSourceIndices;
      provenance[targetField].reviewReason = mergedField.reviewReason;
    }
  }
  
  // Add all image indices that were processed
  for (const { imageIndex } of extractions) {
    contributingIndices.add(imageIndex);
  }
  
  // Aggregate formatting observations from all images
  const formattingObservations = aggregateFormattingObservations(extractions);
  
  return {
    extractedValues,
    provenance,
    hasConflicts: conflictCount > 0,
    conflictCount,
    contributingImageIndices: Array.from(contributingIndices).sort((a, b) => a - b),
    formattingObservations,
  };
}

/**
 * Convenience function to merge raw extraction responses
 * (automatically assigns sequential image indices)
 */
export function mergeRawExtractions(
  extractions: ExtractionResponse[]
): MergedExtractionResult {
  const indexedExtractions: IndexedExtraction[] = extractions.map(
    (extraction, index) => ({
      extraction,
      imageIndex: index,
    })
  );
  return mergeExtractions(indexedExtractions);
}

/**
 * Converts a provenance record to field results for use in ApplicationResult
 */
export function provenanceToFieldStatus(
  fieldName: string,
  value: string | undefined,
  provenance: FieldProvenance
): {
  status: FieldStatus;
  sourceImageIndices: number[];
  candidates?: string[];
  reason?: string;
} {
  if (value === undefined) {
    return {
      status: FieldStatus.Missing,
      sourceImageIndices: [],
    };
  }
  
  if (provenance.needsReview) {
    return {
      status: FieldStatus.NeedsReview,
      sourceImageIndices: provenance.conflictingSourceIndices ?? [provenance.sourceIndex],
      candidates: provenance.conflictingCandidates,
      reason: provenance.reviewReason,
    };
  }
  
  return {
    status: FieldStatus.Pass, // Will be updated by validation
    sourceImageIndices: [provenance.sourceIndex],
  };
}
