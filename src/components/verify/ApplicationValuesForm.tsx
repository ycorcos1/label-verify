'use client';

import { useCallback } from 'react';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { Input, Button } from '@/components/ui';
import type { ApplicationValues, ExtractedValues } from '@/lib/types';

/**
 * Field configuration for the application values form
 */
interface FieldConfig {
  key: keyof ApplicationValues;
  label: string;
  placeholder: string;
  helperText?: string;
}

/**
 * Field configurations matching the domain model
 */
const FIELD_CONFIGS: FieldConfig[] = [
  {
    key: 'brand',
    label: 'Brand Name',
    placeholder: 'e.g., Jack Daniels',
  },
  {
    key: 'classType',
    label: 'Class / Type',
    placeholder: 'e.g., Bourbon Whiskey',
  },
  {
    key: 'abvOrProof',
    label: 'ABV or Proof',
    placeholder: 'e.g., 40% ABV or 80 Proof',
  },
  {
    key: 'netContents',
    label: 'Net Contents',
    placeholder: 'e.g., 750ml',
  },
  {
    key: 'producer',
    label: 'Producer / Bottler',
    placeholder: 'e.g., Brown-Forman, Louisville, KY',
  },
  {
    key: 'country',
    label: 'Country of Origin',
    placeholder: 'e.g., USA',
  },
];

/**
 * Props for ApplicationValuesForm
 */
export interface ApplicationValuesFormProps {
  /** Current form values */
  values: ApplicationValues;
  /** Callback when values change */
  onChange: (values: ApplicationValues) => void;
  /** Optional suggestions from OCR extraction */
  suggestions?: ExtractedValues;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Whether to show a compact layout */
  compact?: boolean;
}

/**
 * Props for a single field with suggestion
 */
interface FieldWithSuggestionProps {
  config: FieldConfig;
  value: string;
  suggestion?: string;
  onChange: (value: string) => void;
  onUseSuggestion: () => void;
  disabled?: boolean;
}

/**
 * Single field component with optional suggestion row
 */
function FieldWithSuggestion({
  config,
  value,
  suggestion,
  onChange,
  onUseSuggestion,
  disabled,
}: FieldWithSuggestionProps) {
  const hasSuggestion = suggestion && suggestion.trim().length > 0;
  
  return (
    <div className="space-y-1.5">
      <Input
        label={config.label}
        placeholder={config.placeholder}
        helperText={config.helperText}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      
      {/* Suggestion row - only shown when suggestion exists */}
      {hasSuggestion && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
          <Lightbulb className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <span className="flex-1 truncate text-sm text-amber-800 dark:text-amber-200">
            <span className="font-medium">Suggested: </span>
            <span className="text-amber-700 dark:text-amber-300">{suggestion}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onUseSuggestion}
            disabled={disabled}
            className="flex-shrink-0 text-amber-700 hover:bg-amber-100 hover:text-amber-900 dark:text-amber-300 dark:hover:bg-amber-900/30 dark:hover:text-amber-100"
          >
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
            Use
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * ApplicationValuesForm component
 * 
 * Allows users to optionally enter values from the application for comparison
 * against extracted label values. All fields are empty by default.
 * 
 * Features:
 * - Six input fields matching the ApplicationValues interface
 * - Optional suggestion rows (shown after OCR extraction)
 * - "Use" button to explicitly copy a suggestion into the input
 * - Helper text explaining the purpose of the form
 */
export function ApplicationValuesForm({
  values,
  onChange,
  suggestions,
  disabled = false,
  compact = false,
}: ApplicationValuesFormProps) {
  /**
   * Handle field value change
   */
  const handleFieldChange = useCallback(
    (fieldKey: keyof ApplicationValues, fieldValue: string) => {
      onChange({
        ...values,
        [fieldKey]: fieldValue,
      });
    },
    [values, onChange]
  );

  /**
   * Handle using a suggestion - copies value to input
   */
  const handleUseSuggestion = useCallback(
    (fieldKey: keyof ApplicationValues) => {
      if (suggestions && suggestions[fieldKey]) {
        onChange({
          ...values,
          [fieldKey]: suggestions[fieldKey],
        });
      }
    },
    [values, suggestions, onChange]
  );

  /**
   * Get suggestion value for a field, mapping extraction field names
   */
  const getSuggestion = (fieldKey: keyof ApplicationValues): string | undefined => {
    if (!suggestions) return undefined;
    return suggestions[fieldKey];
  };

  return (
    <div className="space-y-4">
      {/* Helper text */}
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Enter values from the application to compare against the label. 
        Leave blank to run label-only validation.
      </p>

      {/* Form fields in responsive grid */}
      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {FIELD_CONFIGS.map((config) => (
          <FieldWithSuggestion
            key={config.key}
            config={config}
            value={values[config.key] || ''}
            suggestion={getSuggestion(config.key)}
            onChange={(newValue) => handleFieldChange(config.key, newValue)}
            onUseSuggestion={() => handleUseSuggestion(config.key)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
