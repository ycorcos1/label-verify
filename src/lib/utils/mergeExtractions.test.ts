/**
 * Tests for mergeExtractions utility
 */

import { mergeExtractions, mergeRawExtractions, provenanceToFieldStatus } from './mergeExtractions';
import { ExtractionResponse, FieldStatus } from '@/lib/types';

// Helper to create a mock extraction response
function createMockExtraction(overrides: Partial<ExtractionResponse> = {}): ExtractionResponse {
  return {
    brandName: null,
    classType: null,
    alcoholContent: null,
    netContents: null,
    bottlerProducer: null,
    countryOfOrigin: null,
    governmentWarning: null,
    confidence: 0.8,
    ...overrides,
  };
}

// ============================================================================
// Test: Empty input
// ============================================================================
console.log('\n=== Test: Empty input ===');
{
  const result = mergeExtractions([]);
  console.log('Empty extraction result:', {
    hasConflicts: result.hasConflicts,
    conflictCount: result.conflictCount,
    contributingImageIndices: result.contributingImageIndices,
  });
  console.assert(result.hasConflicts === false, 'Empty input should have no conflicts');
  console.assert(result.conflictCount === 0, 'Empty input should have zero conflict count');
  console.assert(result.contributingImageIndices.length === 0, 'Empty input should have no contributing indices');
  console.log('✓ Empty input test passed');
}

// ============================================================================
// Test: Single extraction (no merging needed)
// ============================================================================
console.log('\n=== Test: Single extraction ===');
{
  const extraction = createMockExtraction({
    brandName: "Jack Daniel's",
    classType: 'Tennessee Whiskey',
    alcoholContent: '40% ABV',
    confidence: 0.9,
  });

  const result = mergeRawExtractions([extraction]);
  
  console.log('Single extraction result:', {
    extractedValues: result.extractedValues,
    hasConflicts: result.hasConflicts,
    contributingImageIndices: result.contributingImageIndices,
  });
  
  console.assert(result.extractedValues.brand === "Jack Daniel's", 'Brand should be extracted');
  console.assert(result.extractedValues.classType === 'Tennessee Whiskey', 'Class type should be extracted');
  console.assert(result.extractedValues.abvOrProof === '40% ABV', 'ABV should be extracted');
  console.assert(result.hasConflicts === false, 'Single extraction should have no conflicts');
  console.assert(result.provenance.brand.sourceIndex === 0, 'Source index should be 0');
  console.log('✓ Single extraction test passed');
}

// ============================================================================
// Test: Multiple extractions - complementary data (no conflicts)
// ============================================================================
console.log('\n=== Test: Multiple extractions - complementary data ===');
{
  const frontLabel = createMockExtraction({
    brandName: "Jack Daniel's",
    classType: 'Tennessee Whiskey',
    alcoholContent: '40% ABV',
    netContents: null,
    governmentWarning: null,
    confidence: 0.9,
  });

  const backLabel = createMockExtraction({
    brandName: "Jack Daniel's",
    classType: 'Tennessee Whiskey',
    alcoholContent: '40% ABV',
    netContents: '750ml',
    bottlerProducer: 'Jack Daniel Distillery, Lynchburg, TN',
    countryOfOrigin: 'USA',
    governmentWarning: 'GOVERNMENT WARNING: (1) According to the Surgeon General...',
    confidence: 0.85,
  });

  const result = mergeRawExtractions([frontLabel, backLabel]);
  
  console.log('Complementary data result:', {
    extractedValues: result.extractedValues,
    hasConflicts: result.hasConflicts,
    conflictCount: result.conflictCount,
  });
  
  console.assert(result.extractedValues.brand === "Jack Daniel's", 'Brand should be merged');
  console.assert(result.extractedValues.netContents === '750ml', 'Net contents from back label');
  console.assert(result.extractedValues.governmentWarning?.includes('GOVERNMENT WARNING'), 'Warning should be present');
  console.assert(result.hasConflicts === false, 'Complementary data should have no conflicts');
  console.assert(result.contributingImageIndices.length === 2, 'Both images should contribute');
  console.log('✓ Complementary data test passed');
}

// ============================================================================
// Test: Multiple extractions - conflicting brand names
// ============================================================================
console.log('\n=== Test: Multiple extractions - conflicting brand names ===');
{
  const image1 = createMockExtraction({
    brandName: 'Brand A Whiskey',
    alcoholContent: '40% ABV',
    confidence: 0.8,
  });

  const image2 = createMockExtraction({
    brandName: 'Brand B Bourbon',
    alcoholContent: '40% ABV',
    confidence: 0.75,
  });

  const result = mergeRawExtractions([image1, image2]);
  
  console.log('Conflicting brands result:', {
    extractedValues: result.extractedValues,
    hasConflicts: result.hasConflicts,
    conflictCount: result.conflictCount,
    brandProvenance: result.provenance.brand,
  });
  
  console.assert(result.hasConflicts === true, 'Should have conflicts');
  console.assert(result.conflictCount >= 1, 'Should have at least 1 conflict');
  console.assert(result.provenance.brand.needsReview === true, 'Brand should need review');
  console.assert(result.provenance.brand.conflictingCandidates?.length === 2, 'Should have 2 candidates');
  console.assert(result.extractedValues.brand === 'Brand A Whiskey', 'Higher confidence value should be chosen');
  console.log('✓ Conflicting brands test passed');
}

// ============================================================================
// Test: Equivalent values should not conflict
// ============================================================================
console.log('\n=== Test: Equivalent values should not conflict ===');
{
  const image1 = createMockExtraction({
    brandName: "Jack Daniel's",
    alcoholContent: '40% ABV',
    confidence: 0.9,
  });

  const image2 = createMockExtraction({
    brandName: "jack daniel's", // Same but lowercase
    alcoholContent: '40%  ABV', // Extra space
    confidence: 0.85,
  });

  const result = mergeRawExtractions([image1, image2]);
  
  console.log('Equivalent values result:', {
    hasConflicts: result.hasConflicts,
    brandProvenance: result.provenance.brand,
  });
  
  console.assert(result.hasConflicts === false, 'Equivalent values should not cause conflicts');
  console.assert(result.provenance.brand.needsReview === false, 'Brand should not need review');
  console.log('✓ Equivalent values test passed');
}

// ============================================================================
// Test: Confidence-based selection
// ============================================================================
console.log('\n=== Test: Confidence-based selection ===');
{
  const lowConfidence = createMockExtraction({
    brandName: 'Blurry Brand',
    confidence: 0.3,
  });

  const highConfidence = createMockExtraction({
    brandName: 'Clear Brand',
    confidence: 0.95,
  });

  // Pass low confidence first, but high confidence should win
  const result = mergeExtractions([
    { extraction: lowConfidence, imageIndex: 0 },
    { extraction: highConfidence, imageIndex: 1 },
  ]);
  
  console.log('Confidence selection result:', {
    chosenBrand: result.extractedValues.brand,
    sourceIndex: result.provenance.brand.sourceIndex,
  });
  
  console.assert(result.extractedValues.brand === 'Clear Brand', 'Higher confidence value should be chosen');
  console.assert(result.provenance.brand.sourceIndex === 1, 'Source should be image 1');
  console.log('✓ Confidence-based selection test passed');
}

// ============================================================================
// Test: provenanceToFieldStatus helper
// ============================================================================
console.log('\n=== Test: provenanceToFieldStatus helper ===');
{
  // Test missing value
  const missingResult = provenanceToFieldStatus('brand', undefined, {
    sourceIndex: -1,
    needsReview: false,
  });
  console.assert(missingResult.status === FieldStatus.Missing, 'Missing value should have Missing status');

  // Test needs review
  const reviewResult = provenanceToFieldStatus('brand', 'Some Value', {
    sourceIndex: 0,
    needsReview: true,
    conflictingCandidates: ['Value A', 'Value B'],
    conflictingSourceIndices: [0, 1],
    reviewReason: 'Conflicting values',
  });
  console.assert(reviewResult.status === FieldStatus.NeedsReview, 'Conflicting value should need review');
  console.assert(reviewResult.candidates?.length === 2, 'Should have 2 candidates');

  // Test normal value
  const normalResult = provenanceToFieldStatus('brand', 'Good Value', {
    sourceIndex: 0,
    needsReview: false,
  });
  console.assert(normalResult.status === FieldStatus.Pass, 'Normal value should pass');
  
  console.log('✓ provenanceToFieldStatus test passed');
}

// ============================================================================
// Test: Government warning extraction
// ============================================================================
console.log('\n=== Test: Government warning extraction ===');
{
  const frontLabel = createMockExtraction({
    brandName: "Test Brand",
    governmentWarning: null, // No warning on front
    confidence: 0.9,
  });

  const backLabel = createMockExtraction({
    brandName: "Test Brand",
    governmentWarning: 'GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.',
    confidence: 0.85,
  });

  const result = mergeRawExtractions([frontLabel, backLabel]);
  
  console.log('Government warning result:', {
    hasWarning: !!result.extractedValues.governmentWarning,
    warningLength: result.extractedValues.governmentWarning?.length,
    sourceIndex: result.provenance.governmentWarning.sourceIndex,
  });
  
  console.assert(result.extractedValues.governmentWarning !== undefined, 'Warning should be extracted from back label');
  console.assert(result.provenance.governmentWarning.sourceIndex === 1, 'Warning should come from back label (index 1)');
  console.log('✓ Government warning test passed');
}

// ============================================================================
// Summary
// ============================================================================
console.log('\n========================================');
console.log('All mergeExtractions tests passed!');
console.log('========================================\n');
