/**
 * API Route: /api/extract
 *
 * Accepts a single image and returns extracted structured fields via OpenAI vision.
 * Uses strict JSON schema validation with Zod.
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  ExtractionResponseSchema,
  formatZodError,
  type ExtractionResponseSchemaType,
} from '@/lib/validation';

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB max
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

// OpenAI model - use gpt-4o-mini for faster/cheaper, gpt-4o for better accuracy
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// ============================================================================
// Error Types
// ============================================================================

type ErrorCode =
  | 'missing_api_key'
  | 'invalid_request'
  | 'file_too_large'
  | 'invalid_file_type'
  | 'missing_image'
  | 'openai_error'
  | 'rate_limited'
  | 'timeout'
  | 'schema_invalid'
  | 'internal_error';

interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: string;
  };
}

/**
 * Production logging for extraction errors
 * Logs structured error information for debugging and monitoring
 */
function logExtractionError(
  code: ErrorCode,
  message: string,
  details?: string,
  context?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: 'error',
    service: 'labelverify',
    endpoint: '/api/extract',
    error: {
      code,
      message,
      details,
    },
    ...context,
  };
  
  // In production, this logs as structured JSON for log aggregation tools
  if (process.env.NODE_ENV === 'production') {
    console.error(JSON.stringify(logEntry));
  } else {
    // In development, use human-readable format
    console.error(`[${timestamp}] [/api/extract] Error: ${code} - ${message}`, details ? `Details: ${details}` : '');
  }
}

function createErrorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  details?: string,
  context?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  logExtractionError(code, message, details, context);
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  );
}

// ============================================================================
// OpenAI Prompt
// ============================================================================

const EXTRACTION_PROMPT = `You are an expert alcohol label analyzer. Analyze this label image and extract the following information.

IMPORTANT: Return ONLY a valid JSON object with these exact fields. Do not include any other text, markdown formatting, or explanation.

Required JSON schema:
{
  "brandName": string | null,
  "classType": string | null,
  "alcoholContent": string | null,
  "netContents": string | null,
  "bottlerProducer": string | null,
  "countryOfOrigin": string | null,
  "governmentWarning": string | null,
  "governmentWarningIsBold": boolean | null,
  "governmentWarningFontSize": "normal" | "small" | "very_small" | null,
  "governmentWarningVisibility": "prominent" | "moderate" | "subtle" | null,
  "confidence": number,
  "notes": string
}

Field definitions:
- brandName: The brand name of the alcoholic beverage (e.g., "Jack Daniel's", "Absolut")
- classType: The class/type of beverage (e.g., "Tennessee Whiskey", "Vodka", "Cabernet Sauvignon")
- alcoholContent: The alcohol content as shown (e.g., "40% ABV", "80 Proof", "12.5% Alc./Vol.")
- netContents: The volume/size (e.g., "750ml", "1L", "1.75L")
- bottlerProducer: Producer/bottler name and address if visible
- countryOfOrigin: Country of origin if stated (e.g., "Product of USA", "Made in Scotland")
- governmentWarning: The FULL government health warning statement if present. Copy it EXACTLY as written, preserving all wording.
- governmentWarningIsBold: Observe whether "GOVERNMENT WARNING:" is in BOLD typeface (heavier weight/thicker strokes than surrounding text).
  IMPORTANT: Bold means THICKER LETTER STROKES, not just uppercase or a different font style.
  - Compare the stroke thickness of "GOVERNMENT WARNING:" to the text that follows it
  - If ALL the warning text has the same stroke weight, it is NOT bold (return false)
  - Only return true if "GOVERNMENT WARNING:" has visibly thicker/heavier strokes than the rest of the warning text
  - Uppercase text is NOT the same as bold - uppercase just means capital letters
  - true = clearly bold (thicker strokes), false = not bold (same weight as surrounding text), null = uncertain
- governmentWarningFontSize: Observe the relative font size of the warning compared to other label text:
  - "normal" = similar size to other important label text
  - "small" = noticeably smaller than main label text
  - "very_small" = very small, hard to read, appears to minimize visibility
  - null = cannot determine
- governmentWarningVisibility: Overall visibility/prominence of the warning on the label:
  - "prominent" = easily visible, stands out, good contrast
  - "moderate" = visible but not emphasized
  - "subtle" = hard to notice, low contrast, hidden in background
  - null = cannot determine
- confidence: Your confidence level from 0 to 1 (e.g., 0.9 for clear image, 0.5 for blurry)
- notes: Any relevant observations about image quality, partial visibility, or extraction uncertainty

CRITICAL for governmentWarning - READ CAREFULLY:
- Look for text that says "GOVERNMENT WARNING:" followed by "(1) According to the Surgeon General..."
- Your response MUST begin with "GOVERNMENT WARNING:" - this is MANDATORY
- DO NOT start with "(1)" - you MUST include "GOVERNMENT WARNING:" before it
- The correct format is: "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems."
- Copy the ENTIRE warning exactly as it appears, preserving all capitalization
- If the label shows "GOVERNMENT WARNING:" in bold or different styling, still include it in the text
- If warning spans multiple lines, combine into single string with spaces
- Return null only if no warning text is visible at all
- DOUBLE CHECK: Does your governmentWarning value start with "GOVERNMENT WARNING:"? If not, add it!

IMPORTANT for formatting observations (governmentWarningIsBold, governmentWarningFontSize, governmentWarningVisibility):
- These help verify regulatory compliance for warning visibility
- Look carefully at the visual appearance, not just the text content
- Bold text has thicker strokes than regular text
- Compare the warning size to other text on the label
- Consider contrast, placement, and overall prominence

Return null for any field that is not visible or readable in the image.`;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Converts a File/Blob to base64 data URL
 */
async function fileToBase64(file: Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const mimeType = file.type || 'image/jpeg';
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Post-processes the government warning to ensure it includes the required prefix.
 * GPT-4 Vision sometimes omits "GOVERNMENT WARNING:" and starts with "(1)".
 */
function fixGovernmentWarningPrefix(warning: string | null | undefined): string | null {
  if (!warning || warning.trim().length === 0) {
    return null;
  }

  const trimmed = warning.trim();
  const upperTrimmed = trimmed.toUpperCase();

  // Check if it already starts with "GOVERNMENT WARNING:"
  if (upperTrimmed.startsWith('GOVERNMENT WARNING:')) {
    return trimmed;
  }

  // Check if it starts with "(1)" which indicates the prefix was missed
  if (trimmed.startsWith('(1)') || upperTrimmed.startsWith('(1)')) {
    // Prepend the required prefix
    return `GOVERNMENT WARNING: ${trimmed}`;
  }

  // Check for other common patterns that indicate a government warning
  if (upperTrimmed.includes('SURGEON GENERAL') || 
      upperTrimmed.includes('ALCOHOLIC BEVERAGES') ||
      upperTrimmed.includes('BIRTH DEFECTS')) {
    // This looks like a government warning but missing the prefix
    return `GOVERNMENT WARNING: ${trimmed}`;
  }

  // Return as-is if we can't determine
  return trimmed;
}

/**
 * Parses and validates the OpenAI response
 */
function parseOpenAIResponse(content: string): ExtractionResponseSchemaType {
  // Try to extract JSON from the response (handle potential markdown wrapping)
  let jsonStr = content.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`Invalid JSON in OpenAI response: ${content.slice(0, 200)}`);
  }

  // Validate with Zod schema
  const result = ExtractionResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Schema validation failed: ${formatZodError(result.error)}`);
  }

  // Post-process: Fix government warning prefix if needed
  const data = result.data;
  if (data.governmentWarning) {
    data.governmentWarning = fixGovernmentWarningPrefix(data.governmentWarning);
  }

  return data;
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return createErrorResponse(
      'missing_api_key',
      'OpenAI API key is not configured',
      500,
      'Server configuration error: OPENAI_API_KEY environment variable is not set'
    );
  }

  // Parse the request body
  let imageData: string;
  let contentType: string;

  try {
    const formContentType = request.headers.get('content-type') || '';

    if (formContentType.includes('multipart/form-data')) {
      // Handle multipart/form-data
      const formData = await request.formData();
      const file = formData.get('image') as File | null;

      if (!file) {
        return createErrorResponse(
          'missing_image',
          'No image file provided',
          400,
          'Include an image file in the "image" field'
        );
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return createErrorResponse(
          'invalid_file_type',
          `Invalid file type: ${file.type}`,
          400,
          `Allowed types: ${ALLOWED_TYPES.join(', ')}`
        );
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return createErrorResponse(
          'file_too_large',
          `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
          400,
          `Maximum file size: ${MAX_FILE_SIZE / 1024 / 1024}MB`
        );
      }

      imageData = await fileToBase64(file);
      contentType = file.type;
    } else if (formContentType.includes('application/json')) {
      // Handle JSON with base64 image
      const body = await request.json();

      if (!body.image) {
        return createErrorResponse(
          'missing_image',
          'No image data provided',
          400,
          'Include base64 image data in the "image" field'
        );
      }

      // Validate base64 data URL format
      if (!body.image.startsWith('data:image/')) {
        return createErrorResponse(
          'invalid_request',
          'Invalid image format',
          400,
          'Image must be a base64 data URL starting with "data:image/"'
        );
      }

      imageData = body.image;
      contentType = body.image.split(';')[0].replace('data:', '');

      // Estimate size from base64 (rough check)
      const base64Data = body.image.split(',')[1] || '';
      const estimatedSize = (base64Data.length * 3) / 4;
      if (estimatedSize > MAX_FILE_SIZE) {
        return createErrorResponse(
          'file_too_large',
          'Image data too large',
          400,
          `Maximum file size: ${MAX_FILE_SIZE / 1024 / 1024}MB`
        );
      }
    } else {
      return createErrorResponse(
        'invalid_request',
        'Invalid content type',
        400,
        'Use multipart/form-data or application/json'
      );
    }
  } catch (error) {
    return createErrorResponse(
      'invalid_request',
      'Failed to parse request',
      400,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey,
    timeout: REQUEST_TIMEOUT_MS,
  });

  // Call OpenAI Vision API
  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: 1500,
      temperature: 0, // Set to 0 for consistent, deterministic results
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: EXTRACTION_PROMPT,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageData,
                detail: 'high',
              },
            },
          ],
        },
      ],
    });

    // Extract the response content
    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent) {
      return createErrorResponse(
        'openai_error',
        'Empty response from OpenAI',
        502,
        'The model returned an empty response'
      );
    }

    // Parse and validate the response
    let extractedData: ExtractionResponseSchemaType;
    try {
      extractedData = parseOpenAIResponse(messageContent);
    } catch (error) {
      return createErrorResponse(
        'schema_invalid',
        'Failed to parse extraction response',
        502,
        error instanceof Error ? error.message : 'Unknown parsing error'
      );
    }

    // Log successful extraction in production for monitoring
    if (process.env.NODE_ENV === 'production') {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'info',
        service: 'labelverify',
        endpoint: '/api/extract',
        status: 'success',
        model: OPENAI_MODEL,
        usage: response.usage,
        confidence: extractedData.confidence,
        hasWarning: !!extractedData.governmentWarning,
      };
      console.log(JSON.stringify(logEntry));
    }

    // Return successful response
    return NextResponse.json({
      success: true,
      data: extractedData,
      model: OPENAI_MODEL,
      usage: response.usage,
    });
  } catch (error) {
    // Handle OpenAI-specific errors
    if (error instanceof OpenAI.APIError) {
      // Rate limiting
      if (error.status === 429) {
        return createErrorResponse(
          'rate_limited',
          'OpenAI rate limit exceeded',
          429,
          'Please wait a moment and try again'
        );
      }

      // Timeout
      if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        return createErrorResponse(
          'timeout',
          'Request timed out',
          504,
          'The image processing took too long. Try with a smaller image.'
        );
      }

      // Authentication error
      if (error.status === 401) {
        return createErrorResponse(
          'missing_api_key',
          'Invalid OpenAI API key',
          500,
          'Server configuration error: Invalid OPENAI_API_KEY'
        );
      }

      // Other API errors
      return createErrorResponse(
        'openai_error',
        `OpenAI API error: ${error.message}`,
        error.status || 502,
        error.code || undefined
      );
    }

    // Handle timeout errors from the timeout option
    if (error instanceof Error && error.name === 'AbortError') {
      return createErrorResponse(
        'timeout',
        'Request timed out',
        504,
        'The image processing took too long. Try with a smaller image.'
      );
    }

    // Generic error - log with full stack trace in production
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return createErrorResponse(
      'internal_error',
      'An unexpected error occurred',
      500,
      errorMessage,
      { stack: errorStack }
    );
  }
}

// ============================================================================
// Health Check (GET)
// ============================================================================

export async function GET(): Promise<NextResponse> {
  const hasApiKey = !!process.env.OPENAI_API_KEY;
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/extract',
    method: 'POST',
    configured: hasApiKey,
    model: OPENAI_MODEL,
    acceptedFormats: ALLOWED_TYPES,
    maxFileSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
  });
}
