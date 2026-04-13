import React from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export default function MetricCard({ title, value, description, trend, trendValue }: MetricCardProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col gap-2 transition-all hover:bg-white/10">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h3>
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-white tracking-tight">{value}</span>
        {trend && trendValue && (
          <span className={`text-sm font-medium px-2 py-1 rounded-full ${
            trend === 'up' ? 'bg-green-500/10 text-green-400' :
            trend === 'down' ? 'bg-red-500/10 text-red-400' :
            'bg-gray-500/10 text-gray-400'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '-'} {trendValue}
          </span>
        )}
      </div>
      {description && <p className="text-sm text-gray-500">{description}</p>}
    </div>
  );
}
