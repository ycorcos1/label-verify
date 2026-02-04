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

function createErrorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  details?: string
): NextResponse<ErrorResponse> {
  console.error(`[/api/extract] Error: ${code} - ${message}`, details ? `Details: ${details}` : '');
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
- confidence: Your confidence level from 0 to 1 (e.g., 0.9 for clear image, 0.5 for blurry)
- notes: Any relevant observations about image quality, partial visibility, or extraction uncertainty

CRITICAL for governmentWarning:
- Extract the COMPLETE warning statement word-for-word
- Include "GOVERNMENT WARNING:" prefix if present
- Preserve exact capitalization and punctuation
- If warning spans multiple lines, combine into single string with spaces
- Return null only if no warning is visible

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

  return result.data;
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

    // Generic error
    console.error('[/api/extract] Unexpected error:', error);
    return createErrorResponse(
      'internal_error',
      'An unexpected error occurred',
      500,
      error instanceof Error ? error.message : 'Unknown error'
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
