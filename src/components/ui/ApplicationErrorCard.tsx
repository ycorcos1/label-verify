'use client';

import { AlertTriangle, RefreshCw, Image, FileWarning, Wifi, Clock, Info } from 'lucide-react';
import { Card, CardContent } from './Card';
import { Button } from './Button';

/**
 * Error types for per-application errors
 */
export type ApplicationErrorType =
  | 'extraction_failed'
  | 'timeout'
  | 'rate_limited'
  | 'network_error'
  | 'image_quality'
  | 'missing_warning'
  | 'misgroup_detected'
  | 'partial_failure'
  | 'unknown';

/**
 * Configuration for each error type
 */
interface ErrorTypeConfig {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
}

const errorTypeConfigs: Record<ApplicationErrorType, ErrorTypeConfig> = {
  extraction_failed: {
    icon: FileWarning,
    title: 'Extraction Failed',
    hint: 'The system could not extract data from this image. Try uploading a clearer image.',
  },
  timeout: {
    icon: Clock,
    title: 'Request Timeout',
    hint: 'The request took too long. Please retry or try with fewer images.',
  },
  rate_limited: {
    icon: AlertTriangle,
    title: 'Rate Limited',
    hint: 'Too many requests. Please wait a moment and retry.',
  },
  network_error: {
    icon: Wifi,
    title: 'Network Error',
    hint: 'Could not connect to the server. Check your internet connection and retry.',
  },
  image_quality: {
    icon: Image,
    title: 'Image Quality Issue',
    hint: 'The image may be blurry, dark, or have glare. Try uploading a clearer photo.',
  },
  missing_warning: {
    icon: AlertTriangle,
    title: 'Government Warning Not Found',
    hint: 'The warning statement was not found. Try uploading the back label if you have not already.',
  },
  misgroup_detected: {
    icon: AlertTriangle,
    title: 'Possible Mis-grouping',
    hint: 'Images in this group may belong to different products. Consider splitting the group.',
  },
  partial_failure: {
    icon: FileWarning,
    title: 'Partial Processing Error',
    hint: 'Some images failed to process. Results may be incomplete.',
  },
  unknown: {
    icon: AlertTriangle,
    title: 'Processing Error',
    hint: 'An unexpected error occurred. Please retry.',
  },
};

/**
 * Props for the ApplicationErrorCard component
 */
export interface ApplicationErrorCardProps {
  /** The type of error */
  errorType: ApplicationErrorType;
  /** Optional custom error message (overrides default title) */
  errorMessage?: string;
  /** Optional custom hint (overrides default hint) */
  customHint?: string;
  /** Application name for context */
  applicationName?: string;
  /** Number of images that failed */
  failedImageCount?: number;
  /** Total number of images in the application */
  totalImageCount?: number;
  /** Optional retry callback */
  onRetry?: () => void;
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** Optional split group callback (for misgroup errors) */
  onSplitGroup?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Determines the error type from an error message
 */
export function detectErrorType(message: string): ApplicationErrorType {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return 'timeout';
  }
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('429')) {
    return 'rate_limited';
  }
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
    return 'network_error';
  }
  if (lowerMessage.includes('quality') || lowerMessage.includes('blur') || lowerMessage.includes('glare')) {
    return 'image_quality';
  }
  if (lowerMessage.includes('warning') && (lowerMessage.includes('not found') || lowerMessage.includes('missing'))) {
    return 'missing_warning';
  }
  if (lowerMessage.includes('misgroup') || lowerMessage.includes('different product')) {
    return 'misgroup_detected';
  }
  if (lowerMessage.includes('partial') || lowerMessage.includes('some images')) {
    return 'partial_failure';
  }
  if (lowerMessage.includes('extract') || lowerMessage.includes('failed')) {
    return 'extraction_failed';
  }
  
  return 'unknown';
}

/**
 * ApplicationErrorCard - Displays per-application errors with context and actions.
 * 
 * Features:
 * - Error type-specific icons and styling
 * - Clear error message and actionable hint
 * - Retry action for recoverable errors
 * - Split group action for mis-grouping errors
 */
export function ApplicationErrorCard({
  errorType,
  errorMessage,
  customHint,
  applicationName,
  failedImageCount,
  totalImageCount,
  onRetry,
  isRetrying = false,
  onSplitGroup,
  className = '',
}: ApplicationErrorCardProps) {
  const config = errorTypeConfigs[errorType];
  const IconComponent = config.icon;
  const displayTitle = errorMessage || config.title;
  const displayHint = customHint || config.hint;

  return (
    <Card className={`border-red-200 dark:border-red-800 ${className}`} accentColor="red">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          {/* Error icon */}
          <div className="flex-shrink-0 rounded-full bg-red-100 p-2 dark:bg-red-900/30">
            <IconComponent className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Application name context */}
            {applicationName && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                {applicationName}
              </p>
            )}

            {/* Error title */}
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              {displayTitle}
            </p>

            {/* Image count context */}
            {failedImageCount !== undefined && totalImageCount !== undefined && (
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {failedImageCount} of {totalImageCount} image{totalImageCount !== 1 ? 's' : ''} failed
              </p>
            )}

            {/* Hint with next step */}
            <div className="mt-2 flex items-start gap-2 rounded-md bg-zinc-100/80 dark:bg-zinc-800/50 p-2">
              <Info className="h-4 w-4 flex-shrink-0 text-zinc-500 dark:text-zinc-400 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {displayHint}
              </p>
            </div>

            {/* Actions */}
            {(onRetry || onSplitGroup) && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {onRetry && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onRetry}
                    disabled={isRetrying}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`}
                      aria-hidden="true"
                    />
                    {isRetrying ? 'Retrying...' : 'Retry'}
                  </Button>
                )}
                {onSplitGroup && errorType === 'misgroup_detected' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSplitGroup}
                  >
                    Split Group
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Inline error message for smaller contexts
 */
export interface InlineErrorProps {
  message: string;
  hint?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function InlineError({
  message,
  hint,
  onRetry,
  isRetrying = false,
  className = '',
}: InlineErrorProps) {
  return (
    <div className={`rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 ${className}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500 dark:text-red-400 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-red-700 dark:text-red-300">
            {message}
          </p>
          {hint && (
            <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80">
              {hint}
            </p>
          )}
          {onRetry && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={onRetry}
              disabled={isRetrying}
            >
              <RefreshCw
                className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {isRetrying ? 'Retrying...' : 'Retry'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
