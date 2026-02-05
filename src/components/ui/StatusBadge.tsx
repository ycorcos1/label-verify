import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader,
  Clock,
  CircleAlert,
  Info,
} from 'lucide-react';
import { Badge } from './Badge';

/**
 * Status types that can be displayed with the StatusBadge component
 */
export type StatusType =
  | 'pass'
  | 'fail'
  | 'needs_review'
  | 'processing'
  | 'queued'
  | 'error'
  | 'not_provided'
  | 'missing';

interface StatusConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  variant: 'success' | 'error' | 'warning' | 'info' | 'default';
}

const statusConfigs: Record<StatusType, StatusConfig> = {
  pass: {
    icon: CheckCircle,
    label: 'Pass',
    variant: 'success',
  },
  fail: {
    icon: XCircle,
    label: 'Fail',
    variant: 'error',
  },
  needs_review: {
    icon: AlertTriangle,
    label: 'Needs Review',
    variant: 'warning',
  },
  processing: {
    icon: Loader,
    label: 'Processing',
    variant: 'info',
  },
  queued: {
    icon: Clock,
    label: 'Queued',
    variant: 'default',
  },
  error: {
    icon: CircleAlert,
    label: 'Error',
    variant: 'error',
  },
  not_provided: {
    icon: Info,
    label: 'Not provided',
    variant: 'default',
  },
  missing: {
    icon: XCircle,
    label: 'Missing',
    variant: 'error',
  },
};

export interface StatusBadgeProps {
  /** The status to display */
  status: StatusType;
  /** Optional custom label override */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show only the icon (for compact displays) */
  iconOnly?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
};

/**
 * StatusBadge component displays a status with an icon and label.
 * Uses lucide-react icons - no emojis.
 * 
 * Status types:
 * - Pass: CheckCircle + "Pass"
 * - Fail: XCircle + "Fail"
 * - Needs Review: AlertTriangle + "Needs Review"
 * - Processing: Loader (animated) + "Processing"
 * - Queued: Clock + "Queued"
 * - Error: CircleAlert + "Error"
 * - Not provided: Info + "Not provided"
 * - Missing: XCircle + "Missing"
 */
export function StatusBadge({
  status,
  label,
  className = '',
  iconOnly = false,
  size = 'md',
}: StatusBadgeProps) {
  const config = statusConfigs[status];
  const IconComponent = config.icon;
  const displayLabel = label || config.label;
  const iconSizeClass = sizeClasses[size];

  return (
    <Badge variant={config.variant} className={className} size={size}>
      <IconComponent
        className={`${iconSizeClass} ${status === 'processing' ? 'animate-spin' : ''}`}
        aria-hidden="true"
      />
      {!iconOnly && <span>{displayLabel}</span>}
      {iconOnly && <span className="sr-only">{displayLabel}</span>}
    </Badge>
  );
}
