'use client';

import { useCallback, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Upload, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

/**
 * Accepted file types for label images
 */
const ACCEPTED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

/**
 * Maximum file size in bytes (10 MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Human-readable max file size
 */
const MAX_FILE_SIZE_DISPLAY = '10 MB';

export interface UploadDropzoneProps {
  /**
   * Callback when valid files are dropped/selected
   */
  onFilesAccepted: (files: File[]) => void;
  /**
   * Whether the dropzone is disabled
   */
  disabled?: boolean;
  /**
   * Optional helper text to display below the dropzone
   */
  helperText?: string;
  /**
   * Whether multiple files can be selected (default: true)
   */
  multiple?: boolean;
}

interface FileError {
  filename: string;
  message: string;
}

/**
 * UploadDropzone component using react-dropzone.
 * Supports drag-and-drop and file picker for JPG/PNG images.
 * Validates file types and size limits.
 */
export function UploadDropzone({
  onFilesAccepted,
  disabled = false,
  helperText = 'Upload front, back, and any additional label panels.',
  multiple = true,
}: UploadDropzoneProps) {
  const [fileErrors, setFileErrors] = useState<FileError[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      // Clear previous errors
      setFileErrors([]);

      // Process rejected files
      if (rejectedFiles.length > 0) {
        const errors: FileError[] = rejectedFiles.map((rejection) => {
          const errorMessages = rejection.errors.map((error) => {
            if (error.code === 'file-invalid-type') {
              return 'Invalid file type. Only JPG and PNG files are accepted.';
            }
            if (error.code === 'file-too-large') {
              return `File is too large. Maximum size is ${MAX_FILE_SIZE_DISPLAY}.`;
            }
            return error.message;
          });
          return {
            filename: rejection.file.name,
            message: errorMessages.join(' '),
          };
        });
        setFileErrors(errors);
      }

      // Process accepted files
      if (acceptedFiles.length > 0) {
        onFilesAccepted(acceptedFiles);
      }
    },
    [onFilesAccepted]
  );

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    disabled,
    multiple,
  });

  // Determine border color based on drag state
  const getBorderClass = () => {
    if (disabled) {
      return 'border-zinc-200 dark:border-zinc-700 opacity-50 cursor-not-allowed';
    }
    if (isDragReject) {
      return 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-950/20';
    }
    if (isDragAccept) {
      return 'border-emerald-400 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/20';
    }
    if (isDragActive) {
      return 'border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/20';
    }
    // Default state with hover matching the drag-active style
    return 'border-zinc-300 dark:border-zinc-700 cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-blue-950/20';
  };

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`
          flex flex-col items-center justify-center rounded-lg border-2 border-dashed
          bg-zinc-50 py-12 transition-colors duration-150
          dark:bg-zinc-800/50
          ${getBorderClass()}
        `}
      >
        <input {...getInputProps()} />
        <Upload
          className={`h-10 w-10 ${
            isDragActive ? 'text-blue-500' : 'text-zinc-400'
          }`}
          aria-hidden="true"
        />
        <p className="mt-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {isDragActive
            ? isDragReject
              ? 'Some files are not accepted'
              : 'Drop label images here'
            : 'Drop label images here'}
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          or click to browse files
        </p>
        <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
          Accepts JPG and PNG files (max {MAX_FILE_SIZE_DISPLAY})
        </p>
      </div>

      {/* File errors */}
      {fileErrors.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <CardContent className="py-3">
            <div className="flex items-start gap-2">
              <AlertCircle
                className="h-5 w-5 flex-shrink-0 text-red-500"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  {fileErrors.length === 1
                    ? 'File could not be uploaded'
                    : `${fileErrors.length} files could not be uploaded`}
                </p>
                <ul className="space-y-0.5">
                  {fileErrors.map((error, index) => (
                    <li
                      key={index}
                      className="text-xs text-red-600 dark:text-red-400"
                    >
                      <span className="font-medium">{error.filename}:</span>{' '}
                      {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Helper text */}
      {helperText && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{helperText}</p>
      )}
    </div>
  );
}
