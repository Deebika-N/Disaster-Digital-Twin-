import React from 'react';
import { Database, AlertCircle, Info } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: 'database' | 'alert' | 'info';
  badgeText?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'There is currently no data matching your query criteria or filters.',
  icon = 'database',
  badgeText,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`bg-midnight-850/60 border border-midnight-700/60 rounded-xl p-8 text-center flex flex-col items-center justify-center max-w-lg mx-auto ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-midnight-750 flex items-center justify-center text-teal-400 mb-3 border border-teal-500/20 shadow-glow-subtle">
        {icon === 'database' && <Database className="w-6 h-6" />}
        {icon === 'alert' && <AlertCircle className="w-6 h-6 text-emergency-amber" />}
        {icon === 'info' && <Info className="w-6 h-6 text-teal-300" />}
      </div>
      {badgeText && (
        <span className="px-2.5 py-0.5 mb-2 text-[11px] font-mono font-medium rounded-full bg-midnight-750 text-teal-300 border border-teal-500/30">
          {badgeText}
        </span>
      )}
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-xs font-medium rounded-lg border border-teal-500/40 transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
