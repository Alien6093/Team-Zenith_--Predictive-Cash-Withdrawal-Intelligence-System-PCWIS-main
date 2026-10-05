import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { User, Smartphone, Building2, ShieldAlert, CreditCard } from 'lucide-react';

export const CustomEntityNode = ({ data, isConnectable }: NodeProps) => {
  const nodeType = (data.type as string)?.toUpperCase() || 'UNKNOWN';
  const label = data.label as string;
  const detail = data.detail as string;

  let Icon = User;
  let bgClass = 'bg-gray-100 border-gray-400';
  let iconClass = 'text-gray-600';
  let glowClass = 'shadow-[0_0_15px_rgba(156,163,175,0.4)]';
  
  if (nodeType === 'VICTIM') {
    Icon = User;
    bgClass = 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-400';
    iconClass = 'text-blue-600';
    glowClass = 'shadow-[0_0_15px_rgba(59,130,246,0.4)]';
  } else if (nodeType === 'MULE_ACCOUNT' || nodeType === 'MULE') {
    Icon = ShieldAlert;
    bgClass = 'bg-gradient-to-br from-red-50 to-red-100 border-red-500';
    iconClass = 'text-red-600';
    glowClass = 'shadow-[0_0_20px_rgba(239,68,68,0.6)]';
  } else if (nodeType === 'DEVICE_IMEI' || nodeType === 'DEVICE') {
    Icon = Smartphone;
    bgClass = 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-400';
    iconClass = 'text-orange-600';
    glowClass = 'shadow-[0_0_15px_rgba(249,115,22,0.4)]';
  } else if (nodeType === 'ATM_LOCATION' || nodeType === 'ATM') {
    Icon = Building2;
    bgClass = 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-500';
    iconClass = 'text-emerald-600';
    glowClass = 'shadow-[0_0_15px_rgba(16,185,129,0.4)]';
  } else if (nodeType === 'ACCOUNT') {
    Icon = CreditCard;
    bgClass = 'bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-400';
    iconClass = 'text-indigo-600';
    glowClass = 'shadow-[0_0_15px_rgba(99,102,241,0.4)]';
  }

  return (
    <div className="relative flex flex-col items-center group cursor-pointer">
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="w-2 h-2 !bg-gray-400 border-none opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Node Circle */}
      <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-300 ease-out group-hover:scale-110 ${bgClass} ${glowClass}`}>
        <Icon size={24} className={iconClass} strokeWidth={2.5} />
      </div>
      
      {/* Label and Detail Below */}
      <div className="absolute top-[64px] flex flex-col items-center min-w-[120px] pointer-events-none transition-all duration-300 group-hover:translate-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800 drop-shadow-sm bg-white/80 px-1.5 py-0.5 rounded backdrop-blur-sm whitespace-nowrap">
          {label}
        </span>
        {detail && (
          <span className="text-[9px] font-mono text-slate-600 mt-0.5 bg-white/90 px-1 rounded shadow-sm border border-slate-100">
            {detail}
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="w-2 h-2 !bg-gray-400 border-none opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};
