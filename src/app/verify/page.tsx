'use client';

import { BatchVerifyView } from '@/components/verify/BatchVerifyView';

/**
 * Unified Verify page for label verification.
 * 
 * Supports uploading images for one or more applications with:
 * - Automatic grouping by filename (e.g., "ProductName_front.jpg" and "ProductName_back.jpg")
 * - Manual grouping via selection and "Group Selected" button
 * - Single-image applications work seamlessly without requiring grouping
 */
export default function VerifyPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Verify Labels
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Upload label images to verify compliance. Images are automatically grouped by product name when possible.
          </p>
        </div>
      </div>

      {/* Unified verification flow */}
      <BatchVerifyView />
    </div>
  );
}
