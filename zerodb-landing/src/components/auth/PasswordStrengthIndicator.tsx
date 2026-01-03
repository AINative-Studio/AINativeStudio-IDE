import React from 'react';
import { PasswordStrength } from '../../types/auth';

interface PasswordStrengthIndicatorProps {
  strength: PasswordStrength;
  feedback?: string[];
  className?: string;
}

/**
 * Visual password strength indicator
 * Shows strength level with color-coded bars and feedback
 */
export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  strength,
  feedback = [],
  className = ''
}) => {
  const strengthConfig = {
    [PasswordStrength.WEAK]: {
      label: 'Weak',
      color: 'bg-red-500',
      bars: 1,
      textColor: 'text-red-600',
    },
    [PasswordStrength.FAIR]: {
      label: 'Fair',
      color: 'bg-orange-500',
      bars: 2,
      textColor: 'text-orange-600',
    },
    [PasswordStrength.GOOD]: {
      label: 'Good',
      color: 'bg-yellow-500',
      bars: 3,
      textColor: 'text-yellow-600',
    },
    [PasswordStrength.STRONG]: {
      label: 'Strong',
      color: 'bg-green-500',
      bars: 4,
      textColor: 'text-green-600',
    },
  };

  const config = strengthConfig[strength];

  return (
    <div className={`mt-2 ${className}`} aria-live="polite">
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-medium ${config.textColor}`}>
          Password strength: {config.label}
        </span>
      </div>

      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              bar <= config.bars ? config.color : 'bg-gray-200'
            }`}
            aria-hidden="true"
          />
        ))}
      </div>

      {feedback.length > 0 && (
        <ul className="text-xs text-gray-600 space-y-0.5" role="list">
          {feedback.map((item, index) => (
            <li key={index} className="flex items-start">
              <span className="mr-1">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
