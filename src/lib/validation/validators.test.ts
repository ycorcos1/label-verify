/**
 * Tests for the Validation Engine
 * 
 * Run with: npx tsx src/lib/validation/validators.test.ts
 */

import {
  validateGovernmentWarning,
  compareTextField,
  compareNumericField,
  computeApplicationResult,
} from './validators';
import { FieldStatus, ExtractedValues, ApplicationValues } from '@/lib/types';

// ============================================================================
// Test Utilities
// ============================================================================

let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passCount++;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error instanceof Error ? error.message : error}`);
    failCount++;
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(
      `${message || 'Assertion failed'}: expected "${expected}", got "${actual}"`
    );
  }
}

function assertIncludes(str: string | undefined, substring: string, message?: string) {
  if (!str || !str.includes(substring)) {
    throw new Error(
      `${message || 'Assertion failed'}: expected "${str}" to include "${substring}"`
    );
  }
}

// ============================================================================
// Government Warning Tests
// ============================================================================

console.log('\n=== Government Warning Validation Tests ===\n');

const CANONICAL_WARNING = 
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

test('validateGovernmentWarning - exact canonical wording passes', () => {
  const result = validateGovernmentWarning(CANONICAL_WARNING);
  assertEqual(result.wordingStatus, FieldStatus.Pass, 'wording status');
  assertEqual(result.uppercaseStatus, FieldStatus.Pass, 'uppercase status');
  assertEqual(result.overallStatus, FieldStatus.Pass, 'overall status');
  assertEqual(result.boldStatus, 'manual_confirm', 'bold status');
});

test('validateGovernmentWarning - canonical with extra whitespace passes', () => {
  // Add extra spaces between words and after periods
  const warningWithSpaces = "GOVERNMENT WARNING:  (1) According to the Surgeon General,  women should not drink alcoholic beverages during pregnancy because of the risk of birth defects.  (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";
  const result = validateGovernmentWarning(warningWithSpaces);
  assertEqual(result.wordingStatus, FieldStatus.Pass, 'wording status');
  assertEqual(result.overallStatus, FieldStatus.Pass, 'overall status');
});

test('validateGovernmentWarning - missing warning fails', () => {
  const result = validateGovernmentWarning(undefined);
  assertEqual(result.wordingStatus, FieldStatus.Missing, 'wording status');
  assertEqual(result.overallStatus, FieldStatus.Missing, 'overall status');
  assertIncludes(result.reason, 'not found', 'reason');
});

test('validateGovernmentWarning - empty string fails', () => {
  const result = validateGovernmentWarning('');
  assertEqual(result.overallStatus, FieldStatus.Missing, 'overall status');
});

test('validateGovernmentWarning - lowercase prefix fails', () => {
  const lowercaseWarning = CANONICAL_WARNING.replace('GOVERNMENT WARNING:', 'government warning:');
  const result = validateGovernmentWarning(lowercaseWarning);
  assertEqual(result.uppercaseStatus, FieldStatus.Fail, 'uppercase status');
});

test('validateGovernmentWarning - wrong wording fails', () => {
  const wrongWarning = "GOVERNMENT WARNING: This product contains alcohol.";
  const result = validateGovernmentWarning(wrongWarning);
  assertEqual(result.wordingStatus, FieldStatus.Fail, 'wording status');
  assertEqual(result.overallStatus, FieldStatus.Fail, 'overall status');
});

test('validateGovernmentWarning - close wording needs review', () => {
  // Missing just a few words
  const closeWarning = CANONICAL_WARNING.replace('or operate machinery, ', '');
  const result = validateGovernmentWarning(closeWarning);
  // Should be NeedsReview or Fail depending on how close
  const isReviewOrFail = result.wordingStatus === FieldStatus.NeedsReview || 
                         result.wordingStatus === FieldStatus.Fail;
  assertEqual(isReviewOrFail, true, 'should be NeedsReview or Fail');
});

// ============================================================================
// Text Field Comparison Tests
// ============================================================================

console.log('\n=== Text Field Comparison Tests ===\n');

test('compareTextField - exact match passes', () => {
  const result = compareTextField("Jack Daniel's", "Jack Daniel's");
  assertEqual(result.status, FieldStatus.Pass, 'status');
});

test('compareTextField - case insensitive match passes', () => {
  const result = compareTextField("JACK DANIELS", "jack daniels");
  assertEqual(result.status, FieldStatus.Pass, 'status');
});

test('compareTextField - punctuation differences pass', () => {
  const result = compareTextField("Jack Daniel's", "Jack Daniels");
  assertEqual(result.status, FieldStatus.Pass, 'status');
});

test('compareTextField - completely different fails', () => {
  const result = compareTextField("Jack Daniel's", "Jim Beam");
  assertEqual(result.status, FieldStatus.Fail, 'status');
});

test('compareTextField - missing extracted value', () => {
  const result = compareTextField(undefined, "Expected Value");
  assertEqual(result.status, FieldStatus.Missing, 'status');
});

test('compareTextField - label-only mode (no expected) passes', () => {
  const result = compareTextField("Extracted Value", undefined);
  assertEqual(result.status, FieldStatus.Pass, 'status');
});

test('compareTextField - both missing passes (no expected)', () => {
  const result = compareTextField(undefined, undefined);
  assertEqual(result.status, FieldStatus.Pass, 'status');
});

test('compareTextField - partial match needs review', () => {
  const result = compareTextField("Tennessee Whiskey", "Jack Daniel's Tennessee Whiskey");
  // Should be NeedsReview due to partial containment
  const isReviewOrPass = result.status === FieldStatus.NeedsReview || 
                         result.status === FieldStatus.Pass;
  assertEqual(isReviewOrPass, true, 'should be NeedsReview or Pass');
});

// ============================================================================
// Numeric Field Comparison Tests
// ============================================================================

console.log('\n=== Numeric Field Comparison Tests ===\n');

test('compareNumericField - exact ABV match passes', () => {
  const result = compareNumericField("40%", "40%", 'abv');
  assertEqual(result.status, FieldStatus.Pass, 'status');
});

test('compareNumericField - ABV to proof conversion passes', () => {
  const result = compareNumericField("40%", "80 proof", 'abv');
  assertEqual(result.status, FieldStatus.Pass, 'status');
});

test('compareNumericField - proof to ABV conversion passes', () => {
  const result = compareNumericField("80 proof", "40% ABV", 'abv');
  assertEqual(result.status, FieldStatus.Pass, 'status');
});

test('compareNumericField - different ABV fails', () => {
  const result = compareNumericField("40%", "50%", 'abv');
  assertEqual(result.status, FieldStatus.Fail, 'status');
});

test('compareNumericField - close ABV needs review', () => {
  const result = compareNumericField("40%", "40.5%", 'abv');
  const isPassOrReview = result.status === FieldStatus.Pass || 
                         result.status === FieldStatus.NeedsReview;
  assertEqual(isPassOrReview, true, 'should be Pass or NeedsReview');
});

test('compareNumericField - exact net contents match passes', () => {
  const result = compareNumericField("750ml", "750ml", 'netContents');
  assertEqual(result.status, FieldStatus.Pass, 'status');
});

test('compareNumericField - net contents with space passes', () => {
  const result = compareNumericField("750 ml", "750ml", 'netContents');
  assertEqual(result.status, FieldStatus.Pass, 'status');
});

test('compareNumericField - liters to ml conversion passes', () => {
  const result = compareNumericField("1L", "1000ml", 'netContents');
  assertEqual(result.status, FieldStatus.Pass, 'status');
});

test('compareNumericField - different net contents fails', () => {
  const result = compareNumericField("750ml", "1L", 'netContents');
  assertEqual(result.status, FieldStatus.Fail, 'status');
});

test('compareNumericField - label-only mode passes', () => {
  const result = compareNumericField("40%", undefined, 'abv');
  assertEqual(result.status, FieldStatus.Pass, 'status');
});

// ============================================================================
// Application Result Tests
// ============================================================================

console.log('\n=== Application Result Computation Tests ===\n');

test('computeApplicationResult - all fields pass', () => {
  const extracted: ExtractedValues = {
    brand: "Jack Daniel's",
    classType: "Tennessee Whiskey",
    abvOrProof: "40%",
    netContents: "750ml",
    producer: "Jack Daniel Distillery",
    country: "USA",
    governmentWarning: CANONICAL_WARNING,
  };
  
  const expected: ApplicationValues = {
    brand: "Jack Daniel's",
    classType: "Tennessee Whiskey",
    abvOrProof: "40%",
    netContents: "750ml",
    producer: "Jack Daniel Distillery",
    country: "USA",
  };
  
  const result = computeApplicationResult(extracted, expected);
  assertEqual(result.overallStatus, 'pass', 'overall status');
});

test('computeApplicationResult - missing warning fails', () => {
  const extracted: ExtractedValues = {
    brand: "Jack Daniel's",
    classType: "Tennessee Whiskey",
    abvOrProof: "40%",
    netContents: "750ml",
  };
  
  const expected: ApplicationValues = {
    brand: "Jack Daniel's",
  };
  
  const result = computeApplicationResult(extracted, expected);
  assertEqual(result.overallStatus, 'fail', 'overall status');
  assertEqual(result.warningResult.overallStatus, FieldStatus.Missing, 'warning status');
});

test('computeApplicationResult - label-only mode works', () => {
  const extracted: ExtractedValues = {
    brand: "Jack Daniel's",
    governmentWarning: CANONICAL_WARNING,
  };
  
  // No expected values - label-only validation
  const result = computeApplicationResult(extracted, undefined);
  
  // Should pass since warning is valid (fields without expected are NotProvided)
  assertEqual(result.overallStatus, 'pass', 'overall status');
});

test('computeApplicationResult - field mismatch fails', () => {
  const extracted: ExtractedValues = {
    brand: "Jim Beam",
    governmentWarning: CANONICAL_WARNING,
  };
  
  const expected: ApplicationValues = {
    brand: "Jack Daniel's",
  };
  
  const result = computeApplicationResult(extracted, expected);
  assertEqual(result.overallStatus, 'fail', 'overall status');
});

test('computeApplicationResult - has top reasons', () => {
  const extracted: ExtractedValues = {
    brand: "Wrong Brand",
  };
  
  const expected: ApplicationValues = {
    brand: "Expected Brand",
  };
  
  const result = computeApplicationResult(extracted, expected);
  assertEqual(result.topReasons.length > 0, true, 'should have reasons');
});

// ============================================================================
// Summary
// ============================================================================

console.log('\n=== Test Summary ===\n');
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log(`Total: ${passCount + failCount}`);

if (failCount > 0) {
  process.exit(1);
}
