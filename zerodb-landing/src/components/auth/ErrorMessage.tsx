import React from 'react';

interface ErrorMessageProps {
  message?: string;
  className?: string;
  id?: string;
}

/**
 * Error message display component
 * Shows validation or API errors with consistent styling
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  className = '',
  id
}) => {
  if (!message) return null;

  return (
    <div
      id={id}
      className={`text-sm text-red-600 mt-1 flex items-start ${className}`}
      role="alert"
      aria-live="polite"
    >
      <svg
        className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
};
