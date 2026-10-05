import React from 'react';
import { Database, Layers, AlertCircle, Landmark, ShieldCheck, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { KpiMetric } from '../types/pcwis';

interface Props {
  metrics: KpiMetric[];
}

const iconMap: Record<string, React.ReactNode> = {
  'm1': <Database size={18} />,
  'm2': <Layers size={18} />,
  'm3': <AlertCircle size={18} />,
  'm4': <Landmark size={18} />,
  'm5': <ShieldCheck size={18} />
};

export const KpiStrip: React.FC<Props> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
      {metrics.map((metric) => {
        const isUp = metric.trend === 'up';
        const isDown = metric.trend === 'down';
        // Red for up = bad, green for down = good
        const trendColor = isUp ? 'text-gov-red' : isDown ? 'text-gov-green' : 'text-gray-500';
        const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

        return (
          <div key={metric.id} className="gov-card border-t-2 border-t-gov-navy relative overflow-hidden flex flex-col justify-between h-28">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] uppercase font-bold text-gov-text-muted tracking-wider leading-tight w-2/3">
                {metric.label}
              </span>
              <div className={`p-1.5 rounded-sm bg-gov-bg border border-gov-border ${metric.statusColor ? `text-${metric.statusColor.split('-')[1]}-700` : 'text-gov-navy'}`}>
                {iconMap[metric.id]}
              </div>
            </div>
            
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-mono font-bold text-gov-navy tracking-tighter">
                {metric.value}
              </span>
              {metric.unit && <span className="text-xs font-bold text-gov-text-muted">{metric.unit}</span>}
            </div>

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
              <span className="text-[9px] text-gov-text-muted uppercase tracking-wide truncate max-w-[70%]">
                {metric.subtitle}
              </span>
              <div className={`flex items-center gap-0.5 text-[10px] font-bold ${trendColor}`}>
                <TrendIcon size={12} />
                <span>{metric.change}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
