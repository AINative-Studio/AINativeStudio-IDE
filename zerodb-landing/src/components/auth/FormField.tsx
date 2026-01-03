import React from 'react';
import { ErrorMessage } from './ErrorMessage';

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Reusable form field component with label and error display
 * Wraps input elements with consistent styling and accessibility
 */
export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      name,
      type = 'text',
      error,
      placeholder,
      required = false,
      disabled = false,
      autoComplete,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const inputId = `input-${name}`;
    const hasError = !!error;

    return (
      <div className={`mb-4 ${className}`}>
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>

        {children || (
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={type}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete={autoComplete}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : undefined}
            className={`
              w-full px-3 py-2 border rounded-lg shadow-sm
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${hasError ? 'border-red-500' : 'border-gray-300'}
              transition-colors duration-200
            `}
            {...props}
          />
        )}

        {hasError && (
          <ErrorMessage message={error} />
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';
