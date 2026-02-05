/**
 * Report Store - Local persistence for verification reports using IndexedDB
 *
 * This module provides a client-side storage solution for saving, listing,
 * retrieving, and deleting verification reports. IndexedDB is preferred
 * over LocalStorage for safety with large reports.
 */

import type { Report, ReportApplication, ReportSummary, VerificationMode } from '@/lib/types';
import { generateUUID } from './index';

// ============================================================================
// Constants
// ============================================================================

const DB_NAME = 'labelverify-reports';
const DB_VERSION = 1;
const STORE_NAME = 'reports';

// ============================================================================
// Types
// ============================================================================

export interface ReportListItem {
  id: string;
  createdAt: string;
  mode: VerificationMode;
  summary: ReportSummary;
  totalDurationMs: number;
  /** Brand name for display (extracted or user-provided, with fallback to "Unknown Brand") */
  brandName: string;
}

export interface CreateReportParams {
  mode: VerificationMode;
  applications: ReportApplication[];
  totalDurationMs: number;
}

/**
 * Parameters for saving a single-application report (v2 format)
 * In v2, each application is saved as its own individual report
 */
export interface CreateSingleAppReportParams {
  application: ReportApplication;
  processingTimeMs: number;
}

export interface ReportStoreError {
  code: 'DB_ERROR' | 'NOT_FOUND' | 'QUOTA_EXCEEDED' | 'UNKNOWN';
  message: string;
}

export type ReportStoreResult<T> =
  | { success: true; data: T }
  | { success: false; error: ReportStoreError };

// ============================================================================
// IndexedDB Helpers
// ============================================================================

/**
 * Opens the IndexedDB database, creating object stores if needed
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create the reports object store with an id key
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // Create index for sorting by createdAt
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Wraps an IDBRequest in a Promise
 */
function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Maps an error to a ReportStoreError
 */
function mapError(error: unknown): ReportStoreError {
  if (error instanceof DOMException) {
    if (error.name === 'QuotaExceededError') {
      return {
        code: 'QUOTA_EXCEEDED',
        message: 'Storage quota exceeded. Please delete some reports or download them first.',
      };
    }
    return {
      code: 'DB_ERROR',
      message: error.message || 'Database operation failed',
    };
  }
  return {
    code: 'UNKNOWN',
    message: error instanceof Error ? error.message : 'Unknown error occurred',
  };
}

// ============================================================================
// Report Store Functions
// ============================================================================

/**
 * Saves a new report to IndexedDB
 * @param params - The report parameters
 * @returns The saved report or an error
 * @deprecated Use saveSingleAppReport for v2 (one report per application)
 */
export async function saveReport(params: CreateReportParams): Promise<ReportStoreResult<Report>> {
  try {
    const db = await openDatabase();

    // Compute summary counts
    const summary: ReportSummary = {
      total: params.applications.length,
      pass: 0,
      fail: 0,
      needsReview: 0,
      error: 0,
    };

    for (const app of params.applications) {
      switch (app.result.overallStatus) {
        case 'pass':
          summary.pass++;
          break;
        case 'fail':
          summary.fail++;
          break;
        case 'needs_review':
          summary.needsReview++;
          break;
        case 'error':
          summary.error++;
          break;
      }
    }

    const report: Report = {
      id: generateUUID(),
      createdAt: new Date().toISOString(),
      mode: params.mode,
      applications: params.applications,
      summary,
      totalDurationMs: params.totalDurationMs,
    };

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    await promisifyRequest(store.add(report));
    db.close();

    return { success: true, data: report };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

/**
 * Saves a single application as its own report (v2 format)
 * Each application becomes its own standalone report with a single-item summary
 * 
 * @param params - The single application report parameters
 * @returns The saved report or an error
 */
export async function saveSingleAppReport(params: CreateSingleAppReportParams): Promise<ReportStoreResult<Report>> {
  try {
    const db = await openDatabase();

    const { application, processingTimeMs } = params;

    // Compute summary for this single application
    const summary: ReportSummary = {
      total: 1,
      pass: application.result.overallStatus === 'pass' ? 1 : 0,
      fail: application.result.overallStatus === 'fail' ? 1 : 0,
      needsReview: application.result.overallStatus === 'needs_review' ? 1 : 0,
      error: application.result.overallStatus === 'error' ? 1 : 0,
    };

    const report: Report = {
      id: generateUUID(),
      createdAt: new Date().toISOString(),
      mode: 'single', // Always 'single' for per-application reports
      applications: [application],
      summary,
      totalDurationMs: processingTimeMs,
    };

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    await promisifyRequest(store.add(report));
    db.close();

    return { success: true, data: report };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

/**
 * Saves multiple applications as separate individual reports (v2 batch save)
 * Each application in the array becomes its own standalone report
 * 
 * @param applications - Array of applications to save as individual reports
 * @param processingTimeMs - Optional processing time per application (defaults to 0)
 * @returns Array of saved reports or errors for each application
 */
export async function saveApplicationsAsReports(
  applications: ReportApplication[],
  processingTimeMs: number = 0
): Promise<ReportStoreResult<Report[]>> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    const savedReports: Report[] = [];
    const createdAt = new Date().toISOString();

    for (const application of applications) {
      // Compute summary for this single application
      const summary: ReportSummary = {
        total: 1,
        pass: application.result.overallStatus === 'pass' ? 1 : 0,
        fail: application.result.overallStatus === 'fail' ? 1 : 0,
        needsReview: application.result.overallStatus === 'needs_review' ? 1 : 0,
        error: application.result.overallStatus === 'error' ? 1 : 0,
      };

      const report: Report = {
        id: generateUUID(),
        createdAt,
        mode: 'single', // Each application is its own single-application report
        applications: [application],
        summary,
        totalDurationMs: application.result.processingTimeMs || processingTimeMs,
      };

      await promisifyRequest(store.add(report));
      savedReports.push(report);
    }

    db.close();
    return { success: true, data: savedReports };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

/**
 * Extracts the brand name from a report with fallback logic.
 * 
 * Fallback hierarchy:
 * 1. Extracted brand name from the first application's extractedValues
 * 2. User-provided brand name from the first application's applicationValues
 * 3. "Unknown Brand" as the final fallback
 * 
 * @param report - The report to extract brand name from
 * @returns The brand name string
 */
export function getBrandName(report: Report): string {
  const firstApp = report.applications[0];
  if (!firstApp) {
    return 'Unknown Brand';
  }

  // Priority 1: Extracted brand from OCR
  const extractedBrand = firstApp.extractedValues?.brand;
  if (extractedBrand && extractedBrand.trim() !== '') {
    return extractedBrand.trim();
  }

  // Priority 2: User-provided brand from application values
  const userBrand = firstApp.applicationValues?.brand;
  if (userBrand && userBrand.trim() !== '') {
    return userBrand.trim();
  }

  // Priority 3: Application name (which might be derived from filename)
  // Only use if it looks like a real brand name (not generic like "Application" or "ungrouped-xxx")
  const appName = firstApp.name;
  if (appName && 
      appName.trim() !== '' && 
      appName !== 'Application' && 
      !appName.startsWith('ungrouped-')) {
    return appName.trim();
  }

  // Final fallback
  return 'Unknown Brand';
}

/**
 * Lists all reports, sorted by createdAt descending (newest first)
 * @returns A list of report summaries or an error
 */
export async function listReports(): Promise<ReportStoreResult<ReportListItem[]>> {
  try {
    const db = await openDatabase();

    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('createdAt');

    // Get all reports using the index (ascending order)
    const reports = await promisifyRequest(index.getAll()) as Report[];
    db.close();

    // Map to list items and reverse for descending order (newest first)
    const items: ReportListItem[] = reports.map((report) => ({
      id: report.id,
      createdAt: report.createdAt,
      mode: report.mode,
      summary: report.summary,
      totalDurationMs: report.totalDurationMs,
      brandName: getBrandName(report),
    })).reverse();

    return { success: true, data: items };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

/**
 * Gets a report by ID
 * @param id - The report ID
 * @returns The report or an error
 */
export async function getReport(id: string): Promise<ReportStoreResult<Report>> {
  try {
    const db = await openDatabase();

    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    
    const report = await promisifyRequest(store.get(id)) as Report | undefined;
    db.close();

    if (!report) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: `Report with ID ${id} not found` },
      };
    }

    return { success: true, data: report };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

/**
 * Updates an existing report in IndexedDB
 * @param report - The updated report object
 * @returns The updated report or an error
 */
export async function updateReport(report: Report): Promise<ReportStoreResult<Report>> {
  try {
    const db = await openDatabase();

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // Check if report exists first
    const existing = await promisifyRequest(store.get(report.id));
    if (!existing) {
      db.close();
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: `Report with ID ${report.id} not found` },
      };
    }

    // Update the report
    await promisifyRequest(store.put(report));
    db.close();

    return { success: true, data: report };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

/**
 * Deletes a report by ID
 * @param id - The report ID
 * @returns Success or an error
 */
export async function deleteReport(id: string): Promise<ReportStoreResult<void>> {
  try {
    const db = await openDatabase();

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // Check if report exists first
    const existing = await promisifyRequest(store.get(id));
    if (!existing) {
      db.close();
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: `Report with ID ${id} not found` },
      };
    }

    await promisifyRequest(store.delete(id));
    db.close();

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

/**
 * Deletes all reports
 * @returns Success or an error
 */
export async function clearAllReports(): Promise<ReportStoreResult<void>> {
  try {
    const db = await openDatabase();

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    await promisifyRequest(store.clear());
    db.close();

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

/**
 * Exports a report as a JSON string for download
 * @param report - The report to export
 * @returns The JSON string
 */
export function exportReportAsJson(report: Report): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Triggers a download of a report as a JSON file
 * @param report - The report to download
 */
export function downloadReportJson(report: Report): void {
  const json = exportReportAsJson(report);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `labelverify-report-${report.id.slice(0, 8)}-${new Date(report.createdAt).toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
}

/**
 * Checks if IndexedDB is available
 * @returns true if IndexedDB is supported
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}
