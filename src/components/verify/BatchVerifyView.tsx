'use client';

import { Upload, Layers, Play, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';

/**
 * BatchVerifyView component for verifying multiple applications
 * with auto-grouping and manual grouping support.
 */
export function BatchVerifyView() {
  return (
    <div className="space-y-6">
      {/* Batch Upload section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" aria-hidden="true" />
            Batch Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 py-12 dark:border-zinc-700 dark:bg-zinc-800/50">
            <Upload className="h-10 w-10 text-zinc-400" aria-hidden="true" />
            <p className="mt-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Drop multiple label images here
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              or click to browse files
            </p>
            <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
              Accepts JPG and PNG files
            </p>
          </div>
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Upload images for multiple applications. Images will be auto-grouped by filename when possible.
          </p>
        </CardContent>
      </Card>

      {/* Application Groups section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" aria-hidden="true" />
            Application Groups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <Layers className="h-8 w-8 text-zinc-400" aria-hidden="true" />
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              No applications detected.
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
              Upload images to see detected application groups.
            </p>
          </div>
          {/* Grouping summary placeholder - shown when images are uploaded */}
          {/* Example: "Detected X applications from Y images; Ungrouped: Z" */}
        </CardContent>
      </Card>

      {/* Batch Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" disabled>
          <Play className="h-4 w-4" aria-hidden="true" />
          Run Batch Verification
        </Button>
        <Button variant="secondary" size="md" disabled>
          Group Selected
        </Button>
        <Button variant="secondary" size="md" disabled>
          Retry Failed
        </Button>
      </div>

      {/* Results section with two-pane layout placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
            Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Two-pane layout for desktop */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left pane: Application list */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Applications
              </h4>
              <div className="flex flex-col items-center justify-center py-6">
                <ClipboardList className="h-6 w-6 text-zinc-400" aria-hidden="true" />
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  No results yet.
                </p>
              </div>
            </div>

            {/* Right pane: Details panel */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Details
              </h4>
              <div className="flex flex-col items-center justify-center py-6">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Select an application to view details.
                </p>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            Run batch verification to see progressive results as each application is processed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
