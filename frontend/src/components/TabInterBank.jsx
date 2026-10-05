import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Building2, ShieldAlert, Activity, Mail } from 'lucide-react';
import SharedModal from './SharedModal';

export default function TabInterBank() {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [modalConfig, setModalConfig] = useState({ isOpen: false });

  useEffect(() => {
    api.getDemoBanks().then(res => {
      setBanks(res.banks);
      setLoading(false);
    });
  }, []);

  const openActionModal = (bank) => {
    setModalConfig({
      isOpen: true,
      title: 'BANK LIEN DIRECTIVE NOTIFICATION',
      actionType: 'Inter-Bank Lien Directive',
      caseData: { case_ref: 'N/A', linked_mule_bank: bank.bank_name },
      actionFields: [
        { id: 'directive_ref', label: 'Directive Ref No', placeholder: 'Enter official directive ID...' },
        { id: 'rationale', label: 'Lien Rationale', placeholder: 'State reasons for broad lien request across nodal accounts...' }
      ],
      buttonText: 'Transmit Directive'
    });
  };

  if (loading) return <div className="p-10">Loading Bank Gateway Data...</div>;

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in">
      
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-center shrink-0">
        <div>
          <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Building2 className="text-indigo-600"/> RBI Nodal Bank Directory</h2>
          <p className="text-sm text-slate-500 mt-1">Real-time gateway status and lien coordination matrix.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-center shadow-sm">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Total Nodes</div>
            <div className="text-xl font-light text-slate-800">{banks.length}</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-center shadow-sm">
            <div className="text-[10px] font-bold text-emerald-600 uppercase">Avg Latency</div>
            <div className="text-xl font-light text-emerald-800">
              {Math.round(banks.reduce((acc, curr) => acc + curr.latency_ms, 0) / banks.length)}ms
            </div>
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banks.map(bank => (
            <div key={bank.rbi_code} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold">
                    {bank.bank_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{bank.bank_name}</h3>
                    <div className="text-xs text-slate-500 font-mono">RBI: {bank.rbi_code}</div>
                  </div>
                </div>
                <div className={`px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 ${bank.gateway_status === 'Optimal' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  <Activity size={12} /> {bank.gateway_status}
                </div>
              </div>
              
              <div className="space-y-3 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs">Nodal Contact</span>
                  <span className="font-medium text-indigo-600 flex items-center gap-1"><Mail size={12}/> {bank.nodal_contact}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs">Gateway Latency</span>
                  <span className={`font-mono text-xs font-semibold ${bank.latency_ms > 400 ? 'text-amber-600' : 'text-emerald-600'}`}>{bank.latency_ms}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs">Active Liens</span>
                  <span className="font-bold text-slate-800">{bank.active_lien_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs">Funds Secured Today</span>
                  <span className="font-bold text-emerald-600">₹{bank.funds_secured_today.toLocaleString('en-IN')}</span>
                </div>
              </div>
              
              <button 
                onClick={() => openActionModal(bank)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2.5 text-sm font-semibold flex justify-center items-center gap-2 transition-colors"
              >
                <ShieldAlert size={16} /> Issue Lien Request
              </button>
            </div>
          ))}
        </div>
      </div>

      <SharedModal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ isOpen: false })}
        {...modalConfig}
      />
    </div>
  );
}
