import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:
    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  success:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  error:
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  warning:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  info:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
