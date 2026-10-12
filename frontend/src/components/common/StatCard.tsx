import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  trendType?: 'neutral' | 'positive' | 'negative';
  accentColor?: 'teal' | 'red' | 'amber' | 'blue';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendType = 'neutral',
  accentColor = 'teal',
  className = '',
}) => {
  const accentStyles = {
    teal: 'border-teal-500/20 hover:border-teal-400/40 text-teal-300',
    red: 'border-emergency-red/20 hover:border-emergency-red/40 text-red-400',
    amber: 'border-emergency-amber/20 hover:border-emergency-amber/40 text-amber-300',
    blue: 'border-emergency-blue/20 hover:border-emergency-blue/40 text-blue-300',
  };

  const iconBgStyles = {
    teal: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
    red: 'bg-emergency-red/10 text-emergency-red border-emergency-red/30',
    amber: 'bg-emergency-amber/10 text-amber-300 border-emergency-amber/30',
    blue: 'bg-emergency-blue/10 text-blue-300 border-emergency-blue/30',
  };

  return (
    <div
      className={`bg-midnight-850/90 backdrop-blur-md rounded-xl p-5 border transition-all duration-200 hover:-translate-y-0.5 shadow-glass ${accentStyles[accentColor]} ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</span>
        <div className={`p-2 rounded-lg border text-sm ${iconBgStyles[accentColor]}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold font-mono tracking-tight text-slate-100">{value}</div>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-midnight-750 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Context</span>
          <span
            className={`font-medium ${
              trendType === 'positive'
                ? 'text-teal-400'
                : trendType === 'negative'
                ? 'text-emergency-red'
                : 'text-slate-300'
            }`}
          >
            {trend}
          </span>
        </div>
      )}
    </div>
  );
};
