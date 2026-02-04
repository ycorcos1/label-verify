'use client';

import { Loader, RefreshCw, Clock, FileSearch } from 'lucide-react';

/**
 * Loading state types
 */
export type LoadingType = 
  | 'processing' 
  | 'uploading' 
  | 'extracting' 
  | 'validating' 
  | 'saving'
  | 'loading';

/**
 * Configuration for each loading type
 */
interface LoadingConfig {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
  description: string;
}

const loadingConfigs: Record<LoadingType, LoadingConfig> = {
  processing: {
    icon: RefreshCw,
    message: 'Processing...',
    description: 'Analyzing images and extracting data.',
  },
  uploading: {
    icon: RefreshCw,
    message: 'Uploading...',
    description: 'Preparing images for processing.',
  },
  extracting: {
    icon: FileSearch,
    message: 'Extracting Data...',
    description: 'Using AI to read label information.',
  },
  validating: {
    icon: RefreshCw,
    message: 'Validating...',
    description: 'Comparing extracted values against requirements.',
  },
  saving: {
    icon: RefreshCw,
    message: 'Saving Report...',
    description: 'Storing results locally.',
  },
  loading: {
    icon: Loader,
    message: 'Loading...',
    description: 'Please wait.',
  },
};

/**
 * Props for the LoadingState component
 */
export interface LoadingStateProps {
  /** The type of loading operation */
  type?: LoadingType;
  /** Custom message (overrides default) */
  message?: string;
  /** Custom description (overrides default) */
  description?: string;
  /** Progress information (e.g., "2 of 5 complete") */
  progress?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

const sizeStyles = {
  sm: {
    icon: 'h-5 w-5',
    message: 'text-sm',
    description: 'text-xs',
    padding: 'py-4',
  },
  md: {
    icon: 'h-8 w-8',
    message: 'text-base',
    description: 'text-sm',
    padding: 'py-8',
  },
  lg: {
    icon: 'h-12 w-12',
    message: 'text-lg',
    description: 'text-base',
    padding: 'py-12',
  },
};

/**
 * LoadingState - A loading indicator that never spins silently.
 * 
 * Features:
 * - Always shows a message explaining what's happening
 * - Optional progress indicator
 * - Different sizes for various contexts
 * - Animated spinner with context
 */
export function LoadingState({
  type = 'loading',
  message,
  description,
  progress,
  size = 'md',
  className = '',
}: LoadingStateProps) {
  const config = loadingConfigs[type];
  const IconComponent = config.icon;
  const displayMessage = message || config.message;
  const displayDescription = description || config.description;
  const styles = sizeStyles[size];

  return (
    <div
      className={`
        flex flex-col items-center justify-center
        ${styles.padding}
        ${className}
      `}
      role="status"
      aria-live="polite"
    >
      {/* Spinning icon */}
      <IconComponent
        className={`
          ${styles.icon}
          text-blue-500 dark:text-blue-400
          animate-spin
        `}
        aria-hidden="true"
      />

      {/* Message */}
      <p className={`mt-3 font-medium text-zinc-900 dark:text-zinc-100 ${styles.message}`}>
        {displayMessage}
      </p>

      {/* Description */}
      <p className={`mt-1 text-zinc-500 dark:text-zinc-400 ${styles.description}`}>
        {displayDescription}
      </p>

      {/* Progress indicator */}
      {progress && (
        <div className="mt-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {progress}
          </span>
        </div>
      )}

      {/* Screen reader text */}
      <span className="sr-only">
        {displayMessage} {displayDescription} {progress || ''}
      </span>
    </div>
  );
}

/**
 * Inline loading indicator for smaller contexts
 */
export interface InlineLoadingProps {
  message?: string;
  className?: string;
}

export function InlineLoading({
  message = 'Loading...',
  className = '',
}: InlineLoadingProps) {
  return (
    <div
      className={`flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 ${className}`}
      role="status"
      aria-live="polite"
    >
      <Loader className="h-4 w-4 animate-spin text-blue-500 dark:text-blue-400" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

/**
 * Progress bar component for batch processing
 */
export interface ProcessingProgressProps {
  current: number;
  total: number;
  label?: string;
  className?: string;
}

export function ProcessingProgress({
  current,
  total,
  label = 'Processing applications',
  className = '',
}: ProcessingProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
        <span className="text-zinc-900 dark:text-zinc-100 font-medium">
          {current} of {total}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-500 dark:bg-blue-400 transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`${current} of ${total} ${label}`}
        />
      </div>
    </div>
  );
}
