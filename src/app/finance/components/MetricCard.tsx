import React from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  onClick?: () => void;
}

export default function MetricCard({ title, value, description, trend, trendValue, onClick }: MetricCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col gap-2 transition-all 
      ${onClick ? 'cursor-pointer hover:bg-white/10 hover:border-white/20 hover:scale-[1.02]' : 'hover:bg-white/10'}`}
    >
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider flex justify-between items-center">
        {title}
        {onClick && (
          <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full lowercase tracking-normal">Click to View</span>
        )}
      </h3>
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
