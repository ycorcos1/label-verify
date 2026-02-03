'use client';

import { Upload, FileText, Play, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';

/**
 * SingleVerifyView component for verifying a single application
 * comprised of one or more label images.
 */
export function SingleVerifyView() {
  return (
    <div className="space-y-6">
      {/* Upload section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" aria-hidden="true" />
            Upload Label Images
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 py-12 dark:border-zinc-700 dark:bg-zinc-800/50">
            <Upload className="h-10 w-10 text-zinc-400" aria-hidden="true" />
            <p className="mt-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Drop label images here
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              or click to browse files
            </p>
            <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
              Accepts JPG and PNG files
            </p>
          </div>
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Upload front, back, and any additional label panels for this application.
          </p>
        </CardContent>
      </Card>

      {/* Application Values section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" aria-hidden="true" />
            Application Values
            <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
              (Optional)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <FileText className="h-8 w-8 text-zinc-400" aria-hidden="true" />
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              Enter values from the application to compare against the label.
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
              Leave blank to run label-only validation.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Run Verification CTA */}
      <div className="flex justify-center">
        <Button size="lg" disabled>
          <Play className="h-4 w-4" aria-hidden="true" />
          Run Verification
        </Button>
      </div>

      {/* Results section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
            Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <ClipboardList className="h-8 w-8 text-zinc-400" aria-hidden="true" />
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              No results yet.
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
              Upload label images and run verification to see results.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
