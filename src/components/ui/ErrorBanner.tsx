'use client';

import { useState, useCallback, useEffect } from 'react';
import { AlertTriangle, X, RefreshCw, Download, HardDrive } from 'lucide-react';
import { Button } from './Button';

/**
 * Error severity levels that affect styling
 */
export type ErrorSeverity = 'error' | 'warning' | 'info';

/**
 * Props for the ErrorBanner component
 */
export interface ErrorBannerProps {
  /** The error message to display */
  message: string;
  /** Optional detailed description */
  description?: string;
  /** Error severity level */
  severity?: ErrorSeverity;
  /** Whether the banner can be dismissed */
  dismissible?: boolean;
  /** Callback when the banner is dismissed */
  onDismiss?: () => void;
  /** Optional retry action */
  onRetry?: () => void;
  /** Optional retry button label */
  retryLabel?: string;
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** Optional download action (for quota exceeded scenarios) */
  onDownload?: () => void;
  /** Optional download button label */
  downloadLabel?: string;
  /** Whether this is a storage quota error */
  isQuotaError?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Severity-based styling configurations
 */
const severityStyles: Record<ErrorSeverity, {
  container: string;
  icon: string;
  accent: string;
}> = {
  error: {
    container: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30',
    icon: 'text-red-500 dark:text-red-400',
    accent: 'bg-red-500',
  },
  warning: {
    container: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
    icon: 'text-amber-500 dark:text-amber-400',
    accent: 'bg-amber-500',
  },
  info: {
    container: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30',
    icon: 'text-blue-500 dark:text-blue-400',
    accent: 'bg-blue-500',
  },
};

/**
 * GlobalErrorBanner - A prominent error display component for the app.
 * 
 * Features:
 * - Multiple severity levels (error, warning, info)
 * - Dismissible with close button
 * - Optional retry action
 * - Optional download action for quota exceeded scenarios
 * - Accessible with proper ARIA attributes
 */
export function ErrorBanner({
  message,
  description,
  severity = 'error',
  dismissible = true,
  onDismiss,
  onRetry,
  retryLabel = 'Retry',
  isRetrying = false,
  onDownload,
  downloadLabel = 'Download Now',
  isQuotaError = false,
  className = '',
}: ErrorBannerProps) {
  const styles = severityStyles[severity];

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        relative overflow-hidden rounded-lg border
        ${styles.container}
        ${className}
      `}
    >
      {/* Accent bar at top */}
      <div className={`absolute left-0 top-0 h-1 w-full ${styles.accent}`} />

      <div className="flex items-start gap-3 p-4 pt-5">
        {/* Icon */}
        <div className={`flex-shrink-0 ${styles.icon}`}>
          {isQuotaError ? (
            <HardDrive className="h-5 w-5" aria-hidden="true" />
          ) : (
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {message}
          </p>
          {description && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {description}
            </p>
          )}

          {/* Actions */}
          {(onRetry || onDownload) && (
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
                  {isRetrying ? 'Retrying...' : retryLabel}
                </Button>
              )}
              {onDownload && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onDownload}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {downloadLabel}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Dismiss button */}
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 rounded-md p-1 text-zinc-400 hover:bg-zinc-200/50 hover:text-zinc-600 dark:hover:bg-zinc-700/50 dark:hover:text-zinc-300 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Props for the GlobalErrorContext
 */
export interface GlobalError {
  id: string;
  message: string;
  description?: string;
  severity?: ErrorSeverity;
  onRetry?: () => void;
  onDownload?: () => void;
  isQuotaError?: boolean;
  autoDismissMs?: number;
}

/**
 * Hook to manage global error state
 */
export function useGlobalErrors() {
  const [errors, setErrors] = useState<GlobalError[]>([]);

  const addError = useCallback((error: Omit<GlobalError, 'id'>) => {
    const id = crypto.randomUUID();
    const newError: GlobalError = { ...error, id };
    setErrors((prev) => [...prev, newError]);

    // Auto-dismiss if specified
    if (error.autoDismissMs) {
      setTimeout(() => {
        removeError(id);
      }, error.autoDismissMs);
    }

    return id;
  }, []);

  const removeError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return {
    errors,
    addError,
    removeError,
    clearAllErrors,
  };
}

/**
 * Container component that displays multiple error banners
 */
export interface ErrorBannerContainerProps {
  errors: GlobalError[];
  onDismiss: (id: string) => void;
  className?: string;
}

export function ErrorBannerContainer({
  errors,
  onDismiss,
  className = '',
}: ErrorBannerContainerProps) {
  if (errors.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {errors.map((error) => (
        <ErrorBanner
          key={error.id}
          message={error.message}
          description={error.description}
          severity={error.severity}
          onDismiss={() => onDismiss(error.id)}
          onRetry={error.onRetry}
          onDownload={error.onDownload}
          isQuotaError={error.isQuotaError}
        />
      ))}
    </div>
  );
}
