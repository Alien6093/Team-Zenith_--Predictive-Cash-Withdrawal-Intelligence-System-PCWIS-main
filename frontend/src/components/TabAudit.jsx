import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ClipboardList, Download, RefreshCw } from 'lucide-react';

export default function TabAudit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs();
      setLogs(res.logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const exportCSV = () => {
    const headers = ["Log Ref", "Timestamp", "Officer", "Agency", "Action Category", "Target Case Ref", "Network IP", "Narrative"];
    const csvContent = [
      headers.join(","),
      ...logs.map(l => [
        l.log_ref, l.timestamp, l.officer, l.agency, l.action_category, l.target_case_ref, l.network_ip, `"${l.narrative.replace(/"/g, '""')}"`
      ].join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_register_${new Date().getTime()}.csv`;
    a.click();
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in">
      
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-center shrink-0">
        <div>
          <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2"><ClipboardList className="text-indigo-600"/> Immutable Audit & Access Register</h2>
          <p className="text-sm text-slate-500 mt-1">Logs all simulated directives and actions taken during this session.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchLogs} className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-md text-sm font-semibold transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors">
            <Download size={16} /> Export Register
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto bg-slate-50 p-4">
        {loading ? (
          <div className="text-center text-slate-500 p-10">Loading Audit Logs...</div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <ClipboardList size={48} className="mb-4 opacity-50" />
            <p className="font-semibold text-lg text-slate-600 mb-2">Audit Register is Empty</p>
            <p className="text-sm text-center max-w-md">No actions have been simulated in this session yet. Use the Action Directives in the Dashboard or Case Register to generate audit trails.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-semibold">Log Ref</th>
                  <th className="p-4 font-semibold">Timestamp (UTC)</th>
                  <th className="p-4 font-semibold">Officer / Agency</th>
                  <th className="p-4 font-semibold">Action Category</th>
                  <th className="p-4 font-semibold">Target Case / Entity</th>
                  <th className="p-4 font-semibold w-1/3">Authorization Narrative</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => (
                  <tr key={log.log_ref} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono font-medium text-slate-500 text-xs">{log.log_ref}</td>
                    <td className="p-4 text-slate-600 font-mono text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">{log.officer}</div>
                      <div className="text-xs text-slate-500">{log.agency} • IP: {log.network_ip}</div>
                    </td>
                    <td className="p-4">
                      <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded text-xs font-bold">
                        {log.action_category}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs font-bold text-slate-700">{log.target_case_ref}</td>
                    <td className="p-4 whitespace-normal text-xs text-slate-600 leading-relaxed border-l border-slate-100 bg-slate-50/50">
                      {log.narrative}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
