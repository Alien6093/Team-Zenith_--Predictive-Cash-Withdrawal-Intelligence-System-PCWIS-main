import React, { useState, useMemo } from 'react';
import { Search, Filter, Download, Crosshair, Shield, AlertTriangle, FileText } from 'lucide-react';
import { Complaint, CaseStatus } from '../types/pcwis';

interface Props {
  complaints: Complaint[];
  onOpenModal: (type: 'FREEZE' | 'DISPATCH' | 'CCTV' | 'DOSSIER', caseRef: string) => void;
}

const statusColorMap: Record<CaseStatus, string> = {
  'UNDER_INVESTIGATION': 'gov-badge-warning',
  'BANK_FREEZE_INITIATED': 'gov-badge-critical',
  'FIELD_UNIT_DISPATCHED': 'gov-badge-success',
  'CCTV_REQUESTED': 'gov-badge-neutral',
  'FUNDS_SECURED': 'gov-badge-success',
  'CLOSED_RESOLVED': 'gov-badge-neutral'
};

export const ComplaintRegisterTab: React.FC<Props> = ({ complaints, onOpenModal }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const filteredData = useMemo(() => {
    return complaints.filter(c => {
      const matchSearch = c.caseRef.toLowerCase().includes(search.toLowerCase()) || 
                          c.district.toLowerCase().includes(search.toLowerCase()) ||
                          c.muleBank.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter ? c.status === statusFilter : true;
      const matchCategory = categoryFilter ? c.fraudCategory === categoryFilter : true;
      return matchSearch && matchStatus && matchCategory;
    });
  }, [complaints, search, statusFilter, categoryFilter]);

  return (
    <div className="gov-card flex flex-col min-h-[500px]">
      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 border-b border-gov-border pb-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2 text-gov-text-muted" />
            <input 
              type="text" 
              placeholder="Search Case ID, Bank, District..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-gov-border rounded-sm text-xs w-64 focus:outline-none focus:border-gov-navy font-mono"
            />
          </div>
          <div className="relative">
            <Filter size={14} className="absolute left-2.5 top-2 text-gov-text-muted" />
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="pl-8 pr-8 py-1.5 border border-gov-border rounded-sm text-xs appearance-none bg-white focus:outline-none focus:border-gov-navy font-bold uppercase"
            >
              <option value="">ALL STATUSES</option>
              <option value="UNDER_INVESTIGATION">UNDER INVESTIGATION</option>
              <option value="BANK_FREEZE_INITIATED">FREEZE INITIATED</option>
              <option value="FUNDS_SECURED">FUNDS SECURED</option>
            </select>
          </div>
          <select 
            value={categoryFilter} 
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 border border-gov-border rounded-sm text-xs bg-white focus:outline-none focus:border-gov-navy font-bold uppercase"
          >
            <option value="">ALL TYPOLOGIES</option>
            <option value="Digital Arrest Scam">Digital Arrest Scam</option>
            <option value="Investment Fraud">Investment Fraud</option>
            <option value="Part-Time Job Fraud">Part-Time Job Fraud</option>
          </select>
        </div>
        
        <div className="flex gap-2">
          <button className="gov-btn gov-btn-secondary flex items-center gap-1.5">
            <Download size={14} /> EXPORT .CSV
          </button>
          <button className="gov-btn gov-btn-secondary flex items-center gap-1.5">
            <Download size={14} /> EXPORT .DOC
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="gov-table">
          <thead>
            <tr>
              <th>Reference No</th>
              <th>Date/Time (IST)</th>
              <th>Typology</th>
              <th>Jurisdiction</th>
              <th>Value (₹)</th>
              <th>Mule Entity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(c => (
              <tr key={c.caseRef}>
                <td className="font-mono font-bold text-xs">{c.caseRef}</td>
                <td className="font-mono text-xs">{new Date(c.timestamp).toLocaleString('en-IN')}</td>
                <td className="text-xs font-bold">{c.fraudCategory}</td>
                <td className="text-xs">{c.district}, {c.stateUT}</td>
                <td className="font-mono text-xs font-bold text-gov-red">
                  {new Intl.NumberFormat('en-IN').format(c.victimAmount)}
                </td>
                <td className="text-[10px]">
                  <div className="font-mono font-bold">{c.muleAccountRef}</div>
                  <div className="text-gov-text-muted uppercase">{c.muleBank}</div>
                </td>
                <td>
                  <span className={`gov-badge ${statusColorMap[c.status]}`}>
                    {c.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => onOpenModal('DOSSIER', c.caseRef)} className="p-1 text-gov-navy hover:bg-gray-200 rounded-sm" title="View Dossier">
                      <FileText size={14} />
                    </button>
                    <button onClick={() => onOpenModal('FREEZE', c.caseRef)} className="p-1 text-gov-red hover:bg-red-100 rounded-sm" title="Initiate Freeze">
                      <AlertTriangle size={14} />
                    </button>
                    <button onClick={() => onOpenModal('DISPATCH', c.caseRef)} className="p-1 text-gov-amber hover:bg-amber-100 rounded-sm" title="Dispatch Unit">
                      <Shield size={14} />
                    </button>
                    <button onClick={() => onOpenModal('CCTV', c.caseRef)} className="p-1 text-gov-navy hover:bg-gray-200 rounded-sm" title="Request CCTV">
                      <Crosshair size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gov-text-muted text-sm font-mono">
                  NO COMPLAINTS MATCH THE SELECTED FILTERS.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
