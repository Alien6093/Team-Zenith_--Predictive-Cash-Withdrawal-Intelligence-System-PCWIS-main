import React, { useState } from 'react';
import { AlertTriangle, Shield, Crosshair, HelpCircle } from 'lucide-react';
import { PredictionAdvisory } from '../types/pcwis';

interface Props {
  advisory: PredictionAdvisory | null;
  onPredict: (category: string, lat: number, lng: number, amount: number) => Promise<void>;
  onOpenModal: (type: 'FREEZE' | 'DISPATCH' | 'CCTV') => void;
}

export const PredictionHeroAdvisory: React.FC<Props> = ({ advisory, onPredict, onOpenModal }) => {
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('Digital Arrest Scam');
  const [lat, setLat] = useState(28.6139);
  const [lng, setLng] = useState(77.2090);
  const [amount, setAmount] = useState(500000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onPredict(category, lat, lng, amount);
    setLoading(false);
  };

  return (
    <div className="mb-4">
      {/* Top Generator Strip (Hero Layout) */}
      <div className={`bg-blue-50/80 border-x border-t border-blue-200 text-gov-navy p-6 md:p-8 flex flex-col justify-between gap-6 relative overflow-hidden shadow-lg ${advisory ? 'rounded-t-xl' : 'rounded-xl mb-6'}`}>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div>
              <h3 className="text-xl md:text-2xl font-bold uppercase tracking-wide text-gov-navy drop-shadow-sm">
                ML Cash-Out Prediction Engine
              </h3>
              <p className="text-sm md:text-base text-slate-600 mt-1 max-w-xl font-medium">
                Synthesize actionable intelligence from real-time incident parameters to predict withdrawal hotspots.
              </p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="relative z-10 bg-white p-5 rounded-xl border border-blue-100 shadow-sm flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Incident Type</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-white border border-slate-300 text-gov-navy px-3 py-2.5 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium">
                <option>Digital Arrest Scam</option>
                <option>Investment Fraud</option>
                <option>ATM Cash Layering</option>
                <option>Part-Time Job Fraud</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Latitude</label>
              <input type="number" step="0.0001" value={lat} onChange={e => setLat(Number(e.target.value))} className="w-full bg-white border border-slate-300 text-gov-navy px-3 py-2.5 rounded-md font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Longitude</label>
              <input type="number" step="0.0001" value={lng} onChange={e => setLng(Number(e.target.value))} className="w-full bg-white border border-slate-300 text-gov-navy px-3 py-2.5 rounded-md font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount (₹)</label>
              <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full bg-white border border-slate-300 text-gov-navy px-3 py-2.5 rounded-md font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="w-full md:w-auto h-[42px] px-6 bg-gov-navy hover:bg-slate-800 text-white font-bold rounded-md transition-all shadow-md flex flex-row items-center justify-center gap-2 uppercase tracking-widest shrink-0 border border-slate-700">
            {loading ? (
              <span className="animate-pulse flex items-center gap-2">PROCESSING</span>
            ) : (
              <span className="text-sm">Generate</span>
            )}
          </button>
        </form>
      </div>

      {/* Hero Advisory Card */}
      {advisory && (
        <div className="bg-white border-2 border-gov-red relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gov-red"></div>
          
          <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="gov-badge gov-badge-critical flex items-center gap-1 px-2 py-1 text-[11px]">
                    <AlertTriangle size={12} />
                    {advisory.riskLevel} ALERT
                  </span>
                  <span className="text-xs font-mono font-bold text-gov-text-muted border border-gray-200 px-2 py-0.5 bg-gray-50">{advisory.referenceNo}</span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gov-navy tracking-tight">{advisory.title}</h2>
              </div>
              
              <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
                <button onClick={() => onOpenModal('DISPATCH')} className="gov-btn gov-btn-warning flex items-center gap-1.5 px-4 py-2">
                  <Shield size={14} /> DISPATCH FIELD UNIT
                </button>
                <button onClick={() => onOpenModal('FREEZE')} className="gov-btn gov-btn-danger flex items-center gap-1.5 px-4 py-2">
                  <AlertTriangle size={14} /> INITIATE BANK FREEZE
                </button>
                <button onClick={() => onOpenModal('CCTV')} className="gov-btn gov-btn-secondary flex items-center gap-1.5 px-4 py-2">
                  <Crosshair size={14} /> REQUEST CCTV
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Critical Stats */}
              <div className="grid grid-cols-2 gap-4 lg:col-span-1 border-r border-gray-200 pr-6">
                <div>
                  <div className="text-[10px] uppercase font-bold text-gov-text-muted mb-1">Confidence Score</div>
                  <div className="text-3xl font-mono font-bold text-gov-red">{advisory.confidenceScore}%</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-gov-text-muted mb-1">Est. Capital At Risk</div>
                  <div className="text-2xl font-mono font-bold text-gov-navy mt-1">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(advisory.estimatedCapitalAtRisk)}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] uppercase font-bold text-gov-text-muted mb-1">Predicted Time Window</div>
                  <div className="text-sm font-bold text-gov-navy bg-gov-bg border border-gov-border px-3 py-1.5 inline-block w-full">{advisory.predictedTimeWindow}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] uppercase font-bold text-gov-text-muted mb-1">Target Zone (High Probability)</div>
                  <div className="text-sm font-bold text-gov-navy bg-red-50 border border-red-200 px-3 py-1.5 inline-block w-full">{advisory.targetZone}</div>
                </div>
              </div>

              {/* Explainable AI */}
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2 mb-3 border-b border-gray-200 pb-2">
                  <HelpCircle size={14} className="text-gov-navy" />
                  <h4 className="text-xs font-bold uppercase text-gov-navy tracking-wider">Explainable AI (XAI) Matrix</h4>
                  <span className="ml-auto text-[10px] font-bold text-gov-text-muted uppercase">Mule Accounts Flagged: <span className="text-gov-red font-mono text-sm">{advisory.totalMuleAccountsFlagged}</span></span>
                </div>
                
                <div className="space-y-3">
                  {advisory.explainableFactors.map((factor, idx) => (
                    <div key={idx} className="flex gap-4 items-start">
                      <div className="w-12 shrink-0 bg-gov-bg border border-gov-border text-center py-1 font-mono font-bold text-xs text-gov-navy">
                        {factor.weightPercentage}%
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-gov-text uppercase">{factor.factor}</h5>
                        <p className="text-[11px] text-gov-text-muted mt-0.5 leading-snug">{factor.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
