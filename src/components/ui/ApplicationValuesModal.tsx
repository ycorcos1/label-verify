'use client';

import { useState, useCallback } from 'react';
import { X, Layers, FileText, Check, Play } from 'lucide-react';
import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { ApplicationValuesForm } from '@/components/verify/ApplicationValuesForm';
import type { ApplicationValues, ImageItemWithStatus } from '@/lib/types';

export interface ApplicationInfo {
  id: string;
  name: string;
  imageCount: number;
  images: ImageItemWithStatus[];
}

export interface ApplicationValuesModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal is closed */
  onClose: () => void;
  /** The application to configure */
  application: ApplicationInfo | null;
  /** Current application values */
  values: ApplicationValues;
  /** Callback to update values */
  onUpdateValues: (values: ApplicationValues) => void;
}

/**
 * Modal for entering application values for a single application.
 */
export function ApplicationValuesModal({
  isOpen,
  onClose,
  application,
  values,
  onUpdateValues,
}: ApplicationValuesModalProps) {
  if (!isOpen || !application) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Application Values
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {application.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {/* Current application info */}
          <div className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {application.imageCount} image{application.imageCount !== 1 ? 's' : ''}
            </p>
            {/* Image thumbnails */}
            <div className="mt-3 flex flex-wrap gap-2">
              {application.images.slice(0, 5).map((img) => (
                <div
                  key={img.id}
                  className="h-12 w-12 overflow-hidden rounded border border-zinc-200 dark:border-zinc-600"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.previewUrl}
                    alt={img.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
              {application.images.length > 5 && (
                <div className="flex h-12 w-12 items-center justify-center rounded border border-zinc-200 bg-zinc-100 text-xs text-zinc-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                  +{application.images.length - 5}
                </div>
              )}
            </div>
          </div>

          {/* Form */}
          <div>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Enter expected values from the application form to compare against extracted label data.
              These fields are optional.
            </p>
            <ApplicationValuesForm
              values={values}
              onChange={onUpdateValues}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-zinc-200 px-6 py-4 dark:border-zinc-700">
          <Button
            variant="primary"
            size="sm"
            onClick={onClose}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

export interface ApplicationRowProps {
  /** The application info */
  application: ApplicationInfo;
  /** Whether values have been filled */
  hasValues: boolean;
  /** Callback when fill form is clicked */
  onFillForm: () => void;
  /** Whether processing is in progress */
  isProcessing?: boolean;
}

/**
 * A single row in the applications list showing app info and fill form button
 */
function ApplicationRow({ application, hasValues, onFillForm, isProcessing }: ApplicationRowProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
      {/* Header with name and button */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {application.name}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {application.imageCount} image{application.imageCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant={hasValues ? 'secondary' : 'ghost'}
          size="sm"
          onClick={onFillForm}
          disabled={isProcessing}
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          {hasValues ? 'Edit Values' : 'Fill Form'}
        </Button>
      </div>
      
      {/* Thumbnails below */}
      <div className="flex flex-wrap gap-2">
        {application.images.slice(0, 5).map((img) => (
          <div
            key={img.id}
            className="h-12 w-12 overflow-hidden rounded border border-zinc-200 dark:border-zinc-600"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.previewUrl}
              alt={img.name}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
        {application.images.length > 5 && (
          <div className="flex h-12 w-12 items-center justify-center rounded border border-zinc-200 bg-zinc-100 text-xs text-zinc-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
            +{application.images.length - 5}
          </div>
        )}
      </div>
    </div>
  );
}

export interface ApplicationListCardProps {
  /** List of applications */
  applications: ApplicationInfo[];
  /** Current application values map */
  applicationValuesMap: Map<string, ApplicationValues>;
  /** Callback to update values for an application */
  onUpdateValues: (appId: string, values: ApplicationValues) => void;
  /** Callback when user wants to run verification */
  onRunVerification: () => void;
  /** Whether verification is currently running */
  isProcessing?: boolean;
  /** Whether verification can be run */
  canRunVerification?: boolean;
}

/**
 * Card showing a list of applications with buttons to fill forms
 */
export function ApplicationListCard({
  applications,
  applicationValuesMap,
  onUpdateValues,
  onRunVerification,
  isProcessing,
  canRunVerification = true,
}: ApplicationListCardProps) {
  const [selectedApp, setSelectedApp] = useState<ApplicationInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = useCallback((app: ApplicationInfo) => {
    setSelectedApp(app);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedApp(null);
  }, []);

  const handleUpdateValues = useCallback((values: ApplicationValues) => {
    if (selectedApp) {
      onUpdateValues(selectedApp.id, values);
    }
  }, [selectedApp, onUpdateValues]);

  const selectedValues = selectedApp ? applicationValuesMap.get(selectedApp.id) || {} : {};

  // Check if an application has values filled
  const hasValuesFilled = (appId: string): boolean => {
    const values = applicationValuesMap.get(appId);
    if (!values) return false;
    return Object.values(values).some(v => v && v.trim().length > 0);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" aria-hidden="true" />
            Applications ({applications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Optionally fill in expected values for each application before running verification.
          </p>

          {/* Applications list */}
          <div className="space-y-2 mb-6">
            {applications.map((app) => (
              <ApplicationRow
                key={app.id}
                application={app}
                hasValues={hasValuesFilled(app.id)}
                onFillForm={() => handleOpenModal(app)}
                isProcessing={isProcessing}
              />
            ))}
          </div>

          {/* Run Verification button */}
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={onRunVerification}
              disabled={isProcessing || !canRunVerification}
            >
              {isProcessing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Run Verification
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal for individual application */}
      <ApplicationValuesModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        application={selectedApp}
        values={selectedValues}
        onUpdateValues={handleUpdateValues}
      />
    </>
  );
}
