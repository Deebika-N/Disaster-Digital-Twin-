import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  title = 'Failed to load data',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`bg-midnight-850/90 border border-emergency-red/40 rounded-xl p-4 text-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-emergency-red/20 rounded-lg text-emergency-red shrink-0 mt-0.5 sm:mt-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-semibold text-slate-100 text-sm">{title}</h4>
          <p className="text-xs text-slate-300 mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-midnight-750 hover:bg-midnight-700 text-teal-300 text-xs font-medium rounded-lg border border-teal-500/30 transition-all shadow-sm shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Request
        </button>
      )}
    </div>
  );
};
