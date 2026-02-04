/**
 * Validation schemas and engines for LabelVerify
 *
 * Zod schemas for:
 * - OpenAI extraction response (strict JSON)
 * - Report serialization (for local persistence)
 *
 * Validation engine for:
 * - Government warning strict validation
 * - Field comparisons (text and numeric)
 * - Application result computation
 */

import { z } from 'zod';

// Re-export validation engine functions
export {
  validateGovernmentWarning,
  compareTextField,
  compareNumericField,
  computeApplicationResult,
  computeErrorResult,
} from './validators';

// ============================================================================
// OpenAI Extraction Response Schema
// ============================================================================

/**
 * Schema for the raw extraction response from OpenAI
 * This enforces strict JSON structure for the model output
 */
export const ExtractionResponseSchema = z.object({
  brandName: z.string().nullable(),
  classType: z.string().nullable(),
  alcoholContent: z.string().nullable(),
  netContents: z.string().nullable(),
  bottlerProducer: z.string().nullable(),
  countryOfOrigin: z.string().nullable(),
  governmentWarning: z.string().nullable(),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
});

export type ExtractionResponseSchemaType = z.infer<typeof ExtractionResponseSchema>;

// ============================================================================
// Field Status Schema
// ============================================================================

export const FieldStatusSchema = z.enum([
  'pass',
  'fail',
  'needs_review',
  'missing',
  'not_provided',
]);

// ============================================================================
// Field Result Schema
// ============================================================================

export const FieldResultSchema = z.object({
  fieldName: z.string(),
  extractedValue: z.string().optional(),
  expectedValue: z.string().optional(),
  status: FieldStatusSchema,
  reason: z.string().optional(),
  sourceImageIndices: z.array(z.number()).optional(),
  candidates: z.array(z.string()).optional(),
});

// ============================================================================
// Warning Result Schema
// ============================================================================

export const WarningResultSchema = z.object({
  extractedWarning: z.string().optional(),
  wordingStatus: FieldStatusSchema,
  uppercaseStatus: FieldStatusSchema,
  boldStatus: z.literal('manual_confirm'),
  overallStatus: FieldStatusSchema,
  reason: z.string().optional(),
});

// ============================================================================
// Application Result Schema
// ============================================================================

export const OverallStatusSchema = z.enum(['pass', 'fail', 'needs_review', 'error']);

export const ApplicationResultSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  applicationName: z.string(),
  overallStatus: OverallStatusSchema,
  topReasons: z.array(z.string()),
  fieldResults: z.array(FieldResultSchema),
  warningResult: WarningResultSchema,
  processingTimeMs: z.number(),
  imageCount: z.number(),
  errorMessage: z.string().optional(),
});

// ============================================================================
// Application Values Schema
// ============================================================================

export const ApplicationValuesSchema = z.object({
  brand: z.string().optional(),
  classType: z.string().optional(),
  abvOrProof: z.string().optional(),
  netContents: z.string().optional(),
  producer: z.string().optional(),
  country: z.string().optional(),
});

// ============================================================================
// Extracted Values Schema
// ============================================================================

export const ExtractedValuesSchema = ApplicationValuesSchema.extend({
  governmentWarning: z.string().optional(),
});

// ============================================================================
// Report Schemas
// ============================================================================

export const VerificationModeSchema = z.enum(['single', 'batch']);

export const ReportSummarySchema = z.object({
  total: z.number().int().min(0),
  pass: z.number().int().min(0),
  fail: z.number().int().min(0),
  needsReview: z.number().int().min(0),
  error: z.number().int().min(0),
});

export const ReportApplicationSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageCount: z.number().int().min(0),
  extractedValues: ExtractedValuesSchema,
  applicationValues: ApplicationValuesSchema.optional(),
  result: ApplicationResultSchema,
  imageThumbnails: z.array(z.string()).optional(),
  imageNames: z.array(z.string()).optional(),
});

/**
 * Schema for a complete saved report
 * Used for serialization/deserialization to/from local storage
 */
export const ReportSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  mode: VerificationModeSchema,
  applications: z.array(ReportApplicationSchema),
  summary: ReportSummarySchema,
  totalDurationMs: z.number().min(0),
});

export type ReportSchemaType = z.infer<typeof ReportSchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validates an extraction response from OpenAI
 * @param data - The raw data to validate
 * @returns The validated extraction response or throws a ZodError
 */
export function validateExtractionResponse(data: unknown): ExtractionResponseSchemaType {
  return ExtractionResponseSchema.parse(data);
}

/**
 * Safely validates an extraction response, returning null on failure
 * @param data - The raw data to validate
 * @returns The validated extraction response or null
 */
export function safeValidateExtractionResponse(data: unknown): ExtractionResponseSchemaType | null {
  const result = ExtractionResponseSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Validates a report for serialization
 * @param data - The raw data to validate
 * @returns The validated report or throws a ZodError
 */
export function validateReport(data: unknown): ReportSchemaType {
  return ReportSchema.parse(data);
}

/**
 * Safely validates a report, returning null on failure
 * @param data - The raw data to validate
 * @returns The validated report or null
 */
export function safeValidateReport(data: unknown): ReportSchemaType | null {
  const result = ReportSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Gets validation errors as a formatted string
 * @param error - The ZodError to format
 * @returns A human-readable error string
 */
export function formatZodError(error: z.ZodError): string {
  return error.errors
    .map((e) => `${e.path.join('.')}: ${e.message}`)
    .join('; ');
}
