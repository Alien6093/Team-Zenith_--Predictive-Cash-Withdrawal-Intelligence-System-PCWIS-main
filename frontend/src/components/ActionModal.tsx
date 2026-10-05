import React, { useState } from 'react';
import { AlertTriangle, Shield, Crosshair, FileText, CheckCircle, X } from 'lucide-react';
import { ModalType, Complaint } from '../types/pcwis';

interface Props {
  type: ModalType;
  complaint: Complaint | null;
  onClose: () => void;
  onConfirm: (type: NonNullable<ModalType>, complaintRef: string, note: string) => Promise<void>;
}

export const ActionModal: React.FC<Props> = ({ type, complaint, onClose, onConfirm }) => {
  const [note, setNote] = useState('');
  const [unitCode, setUnitCode] = useState('PATROL-UNIT-14 (NUH-HIGHWAY)');
  const [isExecuting, setIsExecuting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!type || !complaint) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExecuting(true);
    await onConfirm(type, complaint.caseRef, note);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setIsExecuting(false);
      onClose();
    }, 1500);
  };

  const getHeaderDetails = () => {
    switch (type) {
      case 'FREEZE': return { title: 'INITIATE BANK FREEZE REQUEST (SEC 102 BNSS)', icon: <AlertTriangle size={16} />, color: 'bg-gov-red text-white border-b-4 border-red-900' };
      case 'DISPATCH': return { title: 'FIELD PATROL UNIT DISPATCH AUTHORIZATION', icon: <Shield size={16} />, color: 'bg-gov-amber text-white border-b-4 border-amber-900' };
      case 'CCTV': return { title: 'EMERGENCY CCTV REQUISITION NOTICE (SEC 91 CrPC)', icon: <Crosshair size={16} />, color: 'bg-gov-navy text-white border-b-4 border-gov-navy-dark' };
      case 'DOSSIER': return { title: 'COMPLETE NCRP CASE INTELLIGENCE DOSSIER', icon: <FileText size={16} />, color: 'bg-gov-bg text-gov-navy border-b-4 border-gov-navy' };
    }
  };

  const header = getHeaderDetails();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white border-2 border-gov-navy w-full max-w-2xl flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className={`px-4 py-3 flex items-center justify-between ${header.color}`}>
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-sm">
            {header.icon}
            {header.title}
          </div>
          <button onClick={onClose} disabled={isExecuting} className="hover:opacity-75"><X size={18} /></button>
        </div>

        {/* Body */}
        {success ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <CheckCircle size={48} className="text-gov-green mb-4" />
            <h3 className="text-lg font-bold text-gov-navy uppercase tracking-widest">Action Executed Successfully</h3>
            <p className="text-xs text-gov-text-muted mt-2 font-mono">Reference updated in Audit Register.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
            
            {/* Context Box */}
            <div className="bg-gov-bg border border-gov-border p-3 flex flex-col gap-2">
              <div className="flex justify-between items-center border-b border-gov-border pb-2">
                <span className="text-[10px] font-bold uppercase text-gov-text-muted">Target Case Reference</span>
                <span className="font-mono text-sm font-bold text-gov-navy">{complaint.caseRef}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <span className="text-[10px] uppercase text-gov-text-muted block">Linked Mule Account</span>
                  <span className="font-mono text-xs font-bold text-gov-red">{complaint.muleAccountRef} ({complaint.muleBank})</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gov-text-muted block">Target Location</span>
                  <span className="font-mono text-xs font-bold text-gov-text">{complaint.atmTargetLocation} - {complaint.district}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gov-text-muted block">Capital Value</span>
                  <span className="font-mono text-xs font-bold text-gov-text">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(complaint.victimAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gov-text-muted block">Syndicate Profile</span>
                  <span className="text-xs font-bold text-gov-text">{complaint.associatedSyndicate}</span>
                </div>
              </div>
            </div>

            {/* Inputs */}
            {type === 'DISPATCH' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-gov-navy">Assign Unit Code</label>
                <input required type="text" value={unitCode} onChange={e => setUnitCode(e.target.value)} className="border border-gov-border p-2 text-xs font-mono focus:border-gov-navy focus:outline-none" />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-gov-navy">Official Narrative / Execution Note</label>
              <textarea 
                required 
                value={note} 
                onChange={e => setNote(e.target.value)} 
                rows={4} 
                className="border border-gov-border p-2 text-xs focus:border-gov-navy focus:outline-none font-mono"
                placeholder="Enter formal justification for audit logs..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-2 border-t border-gray-100 pt-4">
              <button type="button" onClick={onClose} disabled={isExecuting} className="gov-btn gov-btn-secondary px-6">CANCEL</button>
              <button type="submit" disabled={isExecuting} className="gov-btn gov-btn-primary px-8 flex items-center gap-2">
                {isExecuting ? 'AUTHORIZING...' : 'EXECUTE PROTOCOL'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
