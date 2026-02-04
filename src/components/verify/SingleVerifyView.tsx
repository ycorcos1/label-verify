'use client';

import { Upload, FileText, Play, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { UploadDropzone } from './UploadDropzone';
import { ThumbnailList } from './ThumbnailList';
import { useImageUpload } from './useImageUpload';

/**
 * SingleVerifyView component for verifying a single application
 * comprised of one or more label images.
 */
export function SingleVerifyView() {
  const {
    images,
    addFiles,
    removeImage,
    hasImages,
    isProcessing,
  } = useImageUpload();

  // Determine if verification can be run
  const canRunVerification = hasImages && !isProcessing;

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
          <UploadDropzone
            onFilesAccepted={addFiles}
            disabled={isProcessing}
            helperText="Upload front, back, and any additional label panels for this application."
          />
          <ThumbnailList
            images={images}
            onRemove={removeImage}
            canRemove={!isProcessing}
          />
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
        <Button size="lg" disabled={!canRunVerification}>
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
