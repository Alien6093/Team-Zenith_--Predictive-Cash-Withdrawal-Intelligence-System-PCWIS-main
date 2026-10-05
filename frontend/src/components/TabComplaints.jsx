import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Search, Filter, Download, Eye, Shield, MapPin, MonitorSmartphone, Server } from 'lucide-react';
import SharedModal from './SharedModal';

export default function TabComplaints() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [selectedCase, setSelectedCase] = useState(null);
  const [modalConfig, setModalConfig] = useState({ isOpen: false });

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      const res = await api.getDemoCases();
      setCases(res.cases);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.case_ref.toLowerCase().includes(search.toLowerCase()) || 
                          c.state.toLowerCase().includes(search.toLowerCase()) ||
                          c.mule_account_ref.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    const headers = ["Case Reference", "Timestamp", "Category", "State", "District", "Amount", "Bank", "Account", "Risk", "Status"];
    const csvContent = [
      headers.join(","),
      ...filteredCases.map(c => [
        c.case_ref, c.timestamp, c.fraud_category, c.state, c.district, c.victim_amount, c.linked_mule_bank, c.mule_account_ref, c.risk_score, c.status
      ].join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `complaint_export_${new Date().getTime()}.csv`;
    a.click();
  };

  const openActionModal = (actionType, caseData) => {
    let actionFields = [];
    if (actionType === 'Bank Freeze Request') {
      actionFields = [{ id: 'note', label: 'Authorizing Officer Note', placeholder: 'Enter official order reference...' }];
    } else if (actionType === 'Field Patrol Dispatch') {
      actionFields = [
        { id: 'unit', label: 'Assigned Unit', isDropdown: true, options: ['Mobile Unit Alpha-1', 'Cyber Taskforce NCR'] },
        { id: 'instructions', label: 'Instructions', placeholder: 'Enter instructions...' }
      ];
    }

    setModalConfig({
      isOpen: true,
      title: `${actionType.toUpperCase()} AUTHORIZATION`,
      actionType,
      caseData,
      actionFields,
      buttonText: `Confirm ${actionType.split(' ')[0]}`
    });
  };

  if (loading) return <div className="p-10">Loading Complaints...</div>;

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in">
      
      {/* Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-wrap justify-between gap-4">
        <div className="flex gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search Case Ref, State, Bank..." 
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm w-64 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select 
              value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-indigo-500"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Under Investigation">Under Investigation</option>
              <option value="Freeze Ordered">Freeze Ordered</option>
              <option value="Funds Secured">Funds Secured</option>
              <option value="Closed/Resolved">Closed/Resolved</option>
            </select>
          </div>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-semibold">
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-100 text-slate-600 sticky top-0 shadow-sm">
            <tr>
              <th className="p-4 font-semibold">Case Ref</th>
              <th className="p-4 font-semibold">Date/Time</th>
              <th className="p-4 font-semibold">Category</th>
              <th className="p-4 font-semibold">Region</th>
              <th className="p-4 font-semibold">Mule Account</th>
              <th className="p-4 font-semibold">Amount (₹)</th>
              <th className="p-4 font-semibold">Risk Score</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCases.slice(0, 100).map(c => (
              <tr key={c.case_ref} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-mono font-medium text-indigo-700">{c.case_ref}</td>
                <td className="p-4 text-slate-500">{new Date(c.timestamp).toLocaleString()}</td>
                <td className="p-4 font-medium">{c.fraud_category}</td>
                <td className="p-4">{c.district}, {c.state}</td>
                <td className="p-4">
                  <div className="font-semibold">{c.linked_mule_bank}</div>
                  <div className="text-xs text-slate-500 font-mono">{c.mule_account_ref}</div>
                </td>
                <td className="p-4 font-bold text-slate-700">₹{c.victim_amount.toLocaleString('en-IN')}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{c.risk_score.toFixed(1)}%</span>
                    <div className="w-16 h-1.5 bg-slate-200 rounded-full">
                      <div className={`h-1.5 rounded-full ${c.risk_score > 80 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${c.risk_score}%` }}></div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                    c.status === 'Closed/Resolved' || c.status === 'Funds Secured' ? 'bg-emerald-100 text-emerald-700' :
                    c.status === 'Pending' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {c.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setSelectedCase(c)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="View Dossier">
                      <Eye size={18} />
                    </button>
                    <button onClick={() => openActionModal('Bank Freeze Request', c)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Freeze Account">
                      <Shield size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredCases.length > 100 && <div className="p-4 text-center text-slate-500 text-sm">Showing top 100 results...</div>}
      </div>

      {/* Case Dossier Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col">
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-white uppercase flex items-center gap-2"><Shield size={18}/> Case Intelligence Dossier</h3>
              <button onClick={() => setSelectedCase(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 border-b pb-1">Incident Summary</h4>
                  <div className="space-y-3 text-sm">
                    <div><span className="text-slate-500 block text-xs">Reference No</span><span className="font-mono font-bold">{selectedCase.case_ref}</span></div>
                    <div><span className="text-slate-500 block text-xs">Category</span><span className="font-semibold">{selectedCase.fraud_category}</span></div>
                    <div><span className="text-slate-500 block text-xs">Jurisdiction</span><span>{selectedCase.district}, {selectedCase.state}</span></div>
                    <div><span className="text-slate-500 block text-xs">Capital Loss</span><span className="font-bold text-red-600">₹{selectedCase.victim_amount.toLocaleString('en-IN')}</span></div>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 border-b pb-1">Target Intelligence</h4>
                  <div className="space-y-3 text-sm">
                    <div><span className="text-slate-500 block text-xs">Mule Account</span><span className="font-mono font-semibold">{selectedCase.mule_account_ref} ({selectedCase.linked_mule_bank})</span></div>
                    <div><span className="text-slate-500 block text-xs">Associated Device</span><span className="flex items-center gap-1 font-mono"><MonitorSmartphone size={14}/> IMEI-DEMO-{Math.floor(Math.random()*9000)+1000}</span></div>
                    <div><span className="text-slate-500 block text-xs">Originating IP</span><span className="flex items-center gap-1 font-mono"><Server size={14}/> 103.{Math.floor(Math.random()*255)}.{Math.floor(Math.random()*255)}.X <span className="bg-slate-100 text-slate-500 text-[10px] px-1 rounded ml-1">Demo-IP</span></span></div>
                    <div><span className="text-slate-500 block text-xs">Primary Syndicate</span><span className="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded text-xs inline-block">Cluster-{Math.floor(Math.random()*90)+10}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <SharedModal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ isOpen: false })}
        {...modalConfig}
      />
    </div>
  );
}
