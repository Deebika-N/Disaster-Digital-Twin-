import React from 'react';

interface BadgeProps {
  label: string;
  variant?: 'teal' | 'red' | 'amber' | 'blue' | 'gray' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'teal',
  size = 'sm',
  className = '',
}) => {
  const variantStyles = {
    teal: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    red: 'bg-emergency-red/15 text-red-300 border-emergency-red/30',
    amber: 'bg-emergency-amber/15 text-amber-300 border-emergency-amber/30',
    blue: 'bg-emergency-blue/15 text-blue-300 border-emergency-blue/30',
    purple: 'bg-emergency-purple/15 text-purple-300 border-emergency-purple/30',
    gray: 'bg-slate-700/30 text-slate-300 border-slate-600/30',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {label}
    </span>
  );
};

export function getDisasterTypeBadgeVariant(type?: string): 'teal' | 'red' | 'amber' | 'blue' | 'purple' | 'gray' {
  if (!type) return 'gray';
  const t = type.toLowerCase();
  if (t.includes('earthquake')) return 'red';
  if (t.includes('flood')) return 'blue';
  if (t.includes('storm') || t.includes('cyclone') || t.includes('typhoon')) return 'teal';
  if (t.includes('fire') || t.includes('wildfire')) return 'amber';
  if (t.includes('volcano') || t.includes('landslide')) return 'purple';
  if (t.includes('drought') || t.includes('extreme temperature')) return 'amber';
  return 'teal';
}
