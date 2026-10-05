import React, { useEffect, useState } from 'react';
import { Shield, Lock } from 'lucide-react';

export const HeaderBar: React.FC = () => {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' }) + ' IST');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex flex-col w-full bg-white border-b-4 border-gov-saffron">
      {/* Top Classification Strip */}
      <div className="bg-gov-navy-dark text-white px-4 py-1 flex justify-between items-center text-[11px] tracking-wider uppercase font-bold">
        <div className="flex items-center gap-2">
          <Shield size={12} className="text-gov-saffron" />
          <span className="text-gov-saffron">MINISTRY OF HOME AFFAIRS (MHA) • GOVT. OF INDIA</span>
          <span className="hidden sm:inline text-gray-400">| INDIAN CYBERCRIME COORDINATION CENTRE (I4C)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-red-900/50 text-red-100 px-2 py-0.5 border border-red-800 rounded-sm font-mono">RESTRICTED ACCESS</span>
          <div className="flex items-center gap-1 text-gov-green">
            <Lock size={12} />
            <span>SECURE GOVNET</span>
          </div>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-center px-4 py-3 gap-4">
        <div className="flex items-center gap-4">
          {/* Emblem Placeholder */}
          <div className="w-12 h-14 border border-gov-border flex flex-col items-center justify-center bg-gray-50 shrink-0">
            <div className="w-6 h-6 rounded-full border-2 border-gov-navy relative overflow-hidden flex items-center justify-center">
              <div className="w-full h-1 bg-gov-green absolute bottom-1"></div>
              <div className="w-full h-1 bg-gov-saffron absolute top-1"></div>
              <div className="w-0.5 h-full bg-gov-navy absolute"></div>
            </div>
            <span className="text-[6px] mt-1 font-bold text-gov-navy">सत्यमेव जयते</span>
          </div>
          
          <div className="flex flex-col">
            <div className="text-[11px] text-gov-text-muted mb-0.5 uppercase tracking-wide">
              गृह मंत्रालय | Ministry of Home Affairs <br className="hidden sm:block"/> 
              भारतीय साइबर अपराध समन्वय केंद्र | Indian Cybercrime Coordination Centre (I4C)
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold text-gov-navy tracking-tight">Predictive Cash-Withdrawal Intelligence System (PCWIS)</h1>
              <span className="bg-gov-bg border border-gov-border text-gov-navy text-[10px] font-mono px-1.5 py-0.5 rounded-sm">v4.2-PROD</span>
            </div>
          </div>
        </div>

        {/* Officer Identity Block */}
        <div className="flex items-center border border-gov-border bg-gov-bg p-2 shrink-0">
          <div className="flex items-center gap-3 pr-3 border-r border-gov-border">
            <div className="w-8 h-8 bg-gov-navy text-white flex items-center justify-center text-sm font-bold rounded-sm">RK</div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gov-text">Insp. R. K. Sharma</span>
              <span className="text-[10px] font-mono text-gov-text-muted">LEA-ND-8942</span>
            </div>
          </div>
          <div className="px-3 border-r border-gov-border hidden lg:flex items-center">
            <span className="text-xs font-bold text-gov-text uppercase tracking-wide">Delhi NCR - Cyber Cell</span>
          </div>
          <div className="pl-3 flex flex-col items-end">
            <span className="text-[10px] uppercase text-gov-text-muted font-bold tracking-wider mb-0.5">System Time</span>
            <span className="text-xs font-mono text-gov-navy font-bold w-[160px] text-right">{timeStr}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
