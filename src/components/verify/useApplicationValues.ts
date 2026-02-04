'use client';

import { useState, useCallback } from 'react';
import type { ApplicationValues, ExtractedValues } from '@/lib/types';

/**
 * Options for useApplicationValues hook
 */
export interface UseApplicationValuesOptions {
  /** Initial values for the form */
  initialValues?: ApplicationValues;
}

/**
 * Return type for useApplicationValues hook
 */
export interface UseApplicationValuesReturn {
  /** Current form values */
  values: ApplicationValues;
  /** Update form values */
  setValues: (values: ApplicationValues) => void;
  /** Update a single field */
  updateField: (field: keyof ApplicationValues, value: string) => void;
  /** Reset all values to empty */
  reset: () => void;
  /** Apply a suggestion to a field */
  applySuggestion: (field: keyof ApplicationValues, suggestions: ExtractedValues) => void;
  /** Check if any values are filled */
  hasValues: boolean;
}

/**
 * Default empty application values
 */
const EMPTY_VALUES: ApplicationValues = {
  brand: '',
  classType: '',
  abvOrProof: '',
  netContents: '',
  producer: '',
  country: '',
};

/**
 * Hook to manage application values form state
 * 
 * Provides state management for the ApplicationValuesForm component,
 * including support for applying suggestions from OCR extraction.
 */
export function useApplicationValues(
  options: UseApplicationValuesOptions = {}
): UseApplicationValuesReturn {
  const { initialValues = EMPTY_VALUES } = options;
  
  const [values, setValues] = useState<ApplicationValues>({
    ...EMPTY_VALUES,
    ...initialValues,
  });

  /**
   * Update a single field value
   */
  const updateField = useCallback(
    (field: keyof ApplicationValues, value: string) => {
      setValues((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  /**
   * Reset all values to empty
   */
  const reset = useCallback(() => {
    setValues({ ...EMPTY_VALUES });
  }, []);

  /**
   * Apply a suggestion value to a field
   */
  const applySuggestion = useCallback(
    (field: keyof ApplicationValues, suggestions: ExtractedValues) => {
      if (suggestions[field]) {
        setValues((prev) => ({
          ...prev,
          [field]: suggestions[field],
        }));
      }
    },
    []
  );

  /**
   * Check if any values are filled (non-empty)
   */
  const hasValues = Object.values(values).some(
    (v) => v && v.trim().length > 0
  );

  return {
    values,
    setValues,
    updateField,
    reset,
    applySuggestion,
    hasValues,
  };
}
