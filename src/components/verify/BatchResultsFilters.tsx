'use client';

import { CheckCircle, XCircle, AlertTriangle, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui';
import type { OverallStatus } from '@/lib/types';

// ============================================================================
// Types
// ============================================================================

export type BatchFilterStatus = OverallStatus | 'all';

export interface BatchResultsFiltersProps {
  /** Currently active filter */
  activeFilter: BatchFilterStatus;
  /** Callback when filter changes */
  onFilterChange: (filter: BatchFilterStatus) => void;
  /** Counts for each status (for showing in filter chips) */
  counts: {
    total: number;
    pass: number;
    fail: number;
    needsReview: number;
    error: number;
  };
  /** Whether filtering is disabled (e.g., during processing) */
  disabled?: boolean;
}

// ============================================================================
// Filter Button Component
// ============================================================================

interface FilterButtonProps {
  status: BatchFilterStatus;
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}

function FilterButton({
  status,
  label,
  count,
  isActive,
  onClick,
  disabled,
  icon,
}: FilterButtonProps) {
  const getButtonClasses = () => {
    const base = 'flex items-center gap-1.5 transition-colors';
    
    if (isActive) {
      switch (status) {
        case 'pass':
          return `${base} bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700`;
        case 'fail':
          return `${base} bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700`;
        case 'needs_review':
          return `${base} bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700`;
        case 'error':
          return `${base} bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700`;
        default:
          return `${base} bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700`;
      }
    }
    
    return base;
  };

  return (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={getButtonClasses()}
    >
      {icon}
      <span>{label}</span>
      <span className="ml-1 text-xs font-medium opacity-75">
        ({count})
      </span>
    </Button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * BatchResultsFilters provides filter chips to filter batch results
 * by status: All, Pass, Fail, Needs Review, Error
 */
export function BatchResultsFilters({
  activeFilter,
  onFilterChange,
  counts,
  disabled = false,
}: BatchResultsFiltersProps) {
  const filters: Array<{
    status: BatchFilterStatus;
    label: string;
    count: number;
    icon?: React.ReactNode;
  }> = [
    {
      status: 'all',
      label: 'All',
      count: counts.total,
    },
    {
      status: 'pass',
      label: 'Pass',
      count: counts.pass,
      icon: <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />,
    },
    {
      status: 'fail',
      label: 'Fail',
      count: counts.fail,
      icon: <XCircle className="h-3.5 w-3.5" aria-hidden="true" />,
    },
    {
      status: 'needs_review',
      label: 'Needs Review',
      count: counts.needsReview,
      icon: <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />,
    },
    {
      status: 'error',
      label: 'Error',
      count: counts.error,
      icon: <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-zinc-500 dark:text-zinc-400 mr-1">
        Filter:
      </span>
      {filters.map((filter) => (
        <FilterButton
          key={filter.status}
          status={filter.status}
          label={filter.label}
          count={filter.count}
          isActive={activeFilter === filter.status}
          onClick={() => onFilterChange(filter.status)}
          disabled={disabled}
          icon={filter.icon}
        />
      ))}
    </div>
  );
}
