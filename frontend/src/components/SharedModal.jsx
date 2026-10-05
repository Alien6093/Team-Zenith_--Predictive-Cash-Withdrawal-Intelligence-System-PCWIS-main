import React, { useState } from 'react';
import { X, CheckCircle, Shield } from 'lucide-react';
import { api } from '../services/api'; // I need to update services/api.js

export default function SharedModal({ 
  isOpen, 
  onClose, 
  title, 
  icon: Icon, 
  caseData, 
  actionType, 
  actionFields, // Array of { label, placeholder, isDropdown, options, id }
  buttonText,
  onSuccessCallback
}) {
  const [formData, setFormData] = useState({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleInputChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const isFormValid = () => {
    // Check if all action fields have a value
    return actionFields.every(field => formData[field.id] && formData[field.id].trim() !== '');
  };

  const handleConfirm = async () => {
    if (!isFormValid()) return;
    setLoading(true);
    
    // Construct narrative from form data
    const narrativeText = actionFields.map(f => `${f.label}: ${formData[f.id]}`).join(' | ');

    try {
      await api.postAuditLog({
        action_category: actionType,
        target_case_ref: caseData?.case_ref || 'N/A',
        narrative: narrativeText
      });
      setIsSuccess(true);
      if (onSuccessCallback) {
        onSuccessCallback();
      }
    } catch (err) {
      alert("Failed to record audit log: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="bg-[#0F172A] px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-amber-500/20 text-amber-500 rounded-lg">
              {Icon ? <Icon size={20} /> : <Shield size={20} />}
            </div>
            <h3 className="font-bold tracking-wide text-sm m-0 uppercase">{title}</h3>
          </div>
          {!isSuccess && (
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        {isSuccess ? (
          <div className="p-10 flex flex-col items-center justify-center gap-4">
            <CheckCircle size={64} className="text-emerald-500 mb-2" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Action Confirmed</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              The {actionType} directive has been simulated and successfully logged in the Audit Register.
            </p>
            <button 
              onClick={onClose}
              className="mt-4 px-6 py-2.5 bg-slate-800 dark:bg-amber-600 text-white rounded-md font-semibold hover:bg-slate-900 dark:hover:bg-amber-500 transition-colors"
            >
              Close Window
            </button>
          </div>
        ) : (
          <>
            {/* Body */}
            <div className="p-6 flex flex-col gap-6 overflow-y-auto max-h-[70vh]">
              {/* Mandatory Simulation Disclaimer */}
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-300 font-bold text-center">
                This is a simulated action for demonstration purposes. No real legal notice, bank directive, or field dispatch is transmitted.
              </div>

              {/* Case Summary Block */}
              {caseData && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Case Reference</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">{caseData.case_ref || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Victim Defrauded Capital</span>
                    <span className="text-sm font-bold text-red-700 dark:text-red-400">₹{caseData.victim_amount?.toLocaleString('en-IN') || '0'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Mule Bank</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{caseData.linked_mule_bank} ({caseData.mule_account_ref})</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Predicted ATM Cluster / Region</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{caseData.district || 'Unknown Region'}</span>
                  </div>
                </div>
              )}

              {/* Dynamic Form Fields */}
              <div className="flex flex-col gap-4">
                {actionFields.map(field => (
                  <div key={field.id} className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {field.label} <span className="text-red-500">*</span>
                    </label>
                    {field.isDropdown ? (
                      <select
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                      >
                        <option value="" disabled>Select option...</option>
                        {field.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <textarea
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 min-h-[80px] resize-y"
                        placeholder={field.placeholder}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 shrink-0">
              <button 
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-md text-sm font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirm}
                disabled={!isFormValid() || loading}
                className="px-4 py-2.5 rounded-md text-sm font-semibold text-white bg-[#0F172A] hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : buttonText}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
