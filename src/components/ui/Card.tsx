import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Optional left accent color for status indication */
  accentColor?: 'green' | 'red' | 'yellow' | 'blue' | 'gray';
}

const accentColorClasses = {
  green: 'border-l-emerald-500',
  red: 'border-l-red-500',
  yellow: 'border-l-amber-500',
  blue: 'border-l-blue-500',
  gray: 'border-l-zinc-400',
};

export function Card({ children, className = '', accentColor }: CardProps) {
  const accentClass = accentColor
    ? `border-l-4 ${accentColorClasses[accentColor]}`
    : '';

  return (
    <div
      className={`rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${accentClass} ${className}`}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div
      className={`border-b border-zinc-200 px-6 py-4 dark:border-zinc-800 ${className}`}
    >
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3
      className={`text-lg font-semibold text-zinc-900 dark:text-zinc-50 ${className}`}
    >
      {children}
    </h3>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div
      className={`border-t border-zinc-200 px-6 py-4 dark:border-zinc-800 ${className}`}
    >
      {children}
    </div>
  );
}
