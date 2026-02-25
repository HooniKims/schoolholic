import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function Layout({ children, title, description }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {(title || description) && (
          <div className="mb-8 text-center">
            {title && (
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                {description}
              </p>
            )}
          </div>
        )}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
