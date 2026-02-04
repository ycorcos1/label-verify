import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'error' | 'warning' | 'info';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  size?: BadgeSize;
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

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'gap-1 px-2 py-0.5 text-[10px]',
  md: 'gap-1.5 px-2.5 py-0.5 text-xs',
};

export function Badge({ children, variant = 'default', className = '', size = 'md' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
