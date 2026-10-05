import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-8 flex flex-col">
      {/* Status Strip */}
      <div className="bg-gov-bg border-y border-gov-border px-4 py-1.5 flex justify-between items-center text-[10px] font-mono font-bold text-gov-text-muted">
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gov-green animate-pulse"></span>
            DATABASE: CONNECTED
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gov-green animate-pulse"></span>
            API GATEWAY: ACTIVE (24ms)
          </div>
          <div className="hidden md:block border-l border-gov-border pl-4">
            LAST SYNC: {new Date().toISOString()}
          </div>
        </div>
        <div className="bg-gov-navy text-white px-2 py-0.5 rounded-sm tracking-widest">
          I4C ADVANCED PREDICTIVE CORE v4.2
        </div>
      </div>

      {/* Legal & Branding */}
      <div className="bg-white px-4 py-6 flex flex-col items-center text-center">
        <h5 className="text-sm font-bold text-gov-navy uppercase tracking-widest mb-2">
          MINISTRY OF HOME AFFAIRS • INDIAN CYBERCRIME COORDINATION CENTRE (I4C)
        </h5>
        <p className="text-[10px] text-gov-text-muted max-w-4xl mx-auto leading-relaxed">
          <strong>RESTRICTED / CLASSIFIED SYSTEM.</strong> Access to the Predictive Cash-Withdrawal Intelligence System (PCWIS) is strictly monitored and logged under the Information Technology Act, 2000 and Bharatiya Nyaya Sanhita (BNS). Unauthorized access, dissemination, or modification of the intelligence dossiers, bank directives, or geographic risk models contained herein constitutes a severe cyber-offense punishable by law. This interface operates on secure GovNet architecture.
        </p>
      </div>
    </footer>
  );
};
