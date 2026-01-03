import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

/**
 * Authentication layout component
 * Provides consistent styling for login/signup pages with centered content
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title = 'ZeroDB',
  subtitle = 'Your AI-Native Data Platform'
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo and branding */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center">
            {/* Placeholder for ZeroDB logo - replace with actual logo */}
            <div className="h-12 w-12 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-white">Z</span>
            </div>
            <div className="ml-3">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-600">{subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {children}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          &copy; {new Date().getFullYear()} ZeroDB. All rights reserved.
        </p>
        <div className="mt-2 flex justify-center gap-4 text-xs">
          <a
            href="#privacy"
            className="text-gray-600 hover:text-gray-900"
          >
            Privacy Policy
          </a>
          <span className="text-gray-400">•</span>
          <a
            href="#terms"
            className="text-gray-600 hover:text-gray-900"
          >
            Terms of Service
          </a>
          <span className="text-gray-400">•</span>
          <a
            href="#support"
            className="text-gray-600 hover:text-gray-900"
          >
            Support
          </a>
        </div>
      </div>
    </div>
  );
};
