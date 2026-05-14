import type { ReactNode } from 'react';

interface MetricTileProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  subtitle?: string;
}

export default function MetricTile({ icon, label, value, unit, color = 'text-niu-cyan', subtitle }: MetricTileProps) {
  return (
    <div className="bg-dark-800 rounded-2xl p-5 border border-dark-600 hover:border-dark-400 transition-all duration-300 hover:shadow-lg">
      <div className="flex items-center gap-3 mb-3">
        <div className={`${color} opacity-80`}>{icon}</div>
        <span className="text-text-secondary text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-bold ${color}`}>{value}</span>
        {unit && <span className="text-text-muted text-sm">{unit}</span>}
      </div>
      {subtitle && <p className="text-text-muted text-xs mt-2">{subtitle}</p>}
    </div>
  );
}
