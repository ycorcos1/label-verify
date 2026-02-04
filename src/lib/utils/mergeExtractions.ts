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

import { ExtractionResponse, ExtractedValues, FieldStatus } from '@/lib/types';
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
    
    return {
      extractedValues,
      provenance,
      hasConflicts: false,
      conflictCount: 0,
      contributingImageIndices: [imageIndex],
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
  
  return {
    extractedValues,
    provenance,
    hasConflicts: conflictCount > 0,
    conflictCount,
    contributingImageIndices: Array.from(contributingIndices).sort((a, b) => a - b),
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
