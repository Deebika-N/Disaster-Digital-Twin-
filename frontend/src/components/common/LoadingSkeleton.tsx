import React from 'react';

interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ rows = 4, className = '' }) => {
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      <div className="h-4 bg-midnight-750 rounded w-1/3"></div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="h-8 bg-midnight-800 rounded border border-midnight-700/50"></div>
        ))}
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-midnight-850 border border-midnight-700/60 rounded-xl p-5 space-y-3 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 bg-midnight-700 rounded w-24"></div>
            <div className="h-8 w-8 bg-midnight-750 rounded-lg"></div>
          </div>
          <div className="h-7 bg-midnight-700 rounded w-32"></div>
          <div className="h-3 bg-midnight-800 rounded w-40"></div>
        </div>
      ))}
    </div>
  );
};
