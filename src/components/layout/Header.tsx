'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileCheck, FileText, HelpCircle, Shield } from 'lucide-react';

const navItems = [
  { href: '/verify', label: 'Verify', icon: FileCheck },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/help', label: 'Help', icon: HelpCircle },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-zinc-800 dark:bg-zinc-950/95 dark:supports-[backdrop-filter]:bg-zinc-950/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/verify" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-50">
            <Shield className="h-5 w-5 text-white dark:text-zinc-900" aria-hidden="true" />
          </div>
          <span className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            LabelVerify
          </span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/verify' && pathname.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
