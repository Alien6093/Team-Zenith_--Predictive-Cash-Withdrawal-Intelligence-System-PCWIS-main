import React, { useState, useMemo } from 'react';
import { Search, ShieldAlert } from 'lucide-react';
import { AuditLog } from '../types/pcwis';

interface Props {
  logs: AuditLog[];
}

export const AuditRegisterTab: React.FC<Props> = ({ logs }) => {
  const [search, setSearch] = useState('');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => 
      log.id.toLowerCase().includes(search.toLowerCase()) ||
      log.officerName.toLowerCase().includes(search.toLowerCase()) ||
      log.targetCaseRef.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase())
    );
  }, [logs, search]);

  const getActionColor = (type: string) => {
    switch (type) {
      case 'BANK_FREEZE_ORDER': return 'bg-red-50 text-gov-red border-red-200';
      case 'FIELD_DISPATCH': return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'CCTV_REQUISITION': return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'DATA_EXPORT': return 'bg-amber-50 text-gov-amber border-amber-200';
      default: return 'gov-badge-neutral';
    }
  };

  return (
    <div className="gov-card flex flex-col min-h-[500px]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gov-border pb-4 mb-4 gap-4">
        <div className="flex items-center gap-3">
          <ShieldAlert size={20} className="text-gov-navy" />
          <h3 className="text-sm font-bold uppercase text-gov-navy tracking-wider">
            SYSTEM ACCESS & FORENSIC AUDIT TRAIL REGISTER
          </h3>
        </div>
        
        <div className="relative w-full md:w-auto">
          <Search size={14} className="absolute left-2.5 top-2 text-gov-text-muted" />
          <input 
            type="text" 
            placeholder="Search logs by ID, Officer, Ref..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-gov-border rounded-sm text-xs w-full md:w-72 focus:outline-none focus:border-gov-navy font-mono"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="gov-table">
          <thead>
            <tr>
              <th>Log ID</th>
              <th>Timestamp (IST)</th>
              <th>Officer Identity</th>
              <th>Originating IP</th>
              <th>Action Classification</th>
              <th>Target Ref</th>
              <th>Cryptographic Audit Detail</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log.id}>
                <td className="font-mono text-[10px] font-bold text-gov-text-muted">{log.id}</td>
                <td className="font-mono text-[10px]">{new Date(log.timestamp).toLocaleString('en-IN')}</td>
                <td className="text-[10px]">
                  <div className="font-bold">{log.officerName}</div>
                  <div className="text-gov-text-muted font-mono">{log.officerId}</div>
                  <div className="text-gov-text-muted uppercase tracking-wide">{log.agency}</div>
                </td>
                <td className="font-mono text-[10px]">{log.ipAddress}</td>
                <td>
                  <span className={`gov-badge ${getActionColor(log.actionType)}`}>
                    {log.actionType.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="font-mono text-xs font-bold text-gov-navy">{log.targetCaseRef}</td>
                <td className="text-[11px] font-mono leading-relaxed max-w-md truncate" title={log.details}>
                  {log.details}
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gov-text-muted text-sm font-mono">
                  NO AUDIT LOGS MATCH THE SEARCH CRITERIA.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
