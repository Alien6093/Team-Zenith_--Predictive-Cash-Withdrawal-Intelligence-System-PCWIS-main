import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  AlertTriangle,
  MapPin, 
  Video, 
  Lock, 
  Send,
  Navigation
} from 'lucide-react';

const MOCK_DATA = {
  "systemMeta": {
    "officer": "Insp. R. K. Sharma",
    "badge": "LEA-ND-8942",
    "jurisdiction": "Delhi NCR - Cyber Cell",
    "version": "v4.2-PROD",
    "sessionEnc": "ENC-256"
  },
  "metrics": {
    "activeIncidents": 500,
    "avgMRR": "70.4%",
    "mrrDelta": "+2.4%",
    "resolved24h": 12,
    "highRiskClusters": 70
  },
  "advisory": {
    "refNo": "MHA/I4C/ADV/2026/0842-CW",
    "title": "IMMINENT ATM CASH-LAYERING ALERT — MEWAT-NWR CYBER BELT",
    "zone": "Nuh - Bharatpur - Alwar Tri-Junction (14 High-Velocity ATM Outlets)",
    "window": "15:30 IST – 18:00 IST (Today)",
    "capitalAtRisk": "₹1,84,00,000",
    "linkedMuleAccounts": 24,
    "syndicate": "Mewat Grid-04 (Digital Arrest)",
    "actionDirective": "IMMEDIATE LIEN & PATROL"
  },
  "modalPreset": {
    "caseRef": "NCRP/2026/DEL/094821",
    "amount": "₹48,50,000",
    "bank": "State Bank of India (SBI-7729-0192-3841)",
    "atmCluster": "NH-48 Corridor ATM, Gurgaon Sector 14",
    "window": "15:45 - 16:30 IST"
  },
  "incidents": [
    {
      "id": "#10066",
      "time": "04:26 PM",
      "title": "Cybercrime Activity Detected",
      "attackType": "Phishing / Digital Arrest",
      "affectedSystem": "SBI / HDFC Mule Layer",
      "impact": "Moderate",
      "location": "Bihar",
      "mrr": 4.08,
      "errKm": "1.1km",
      "status": "PENDING",
      "risk": "Critical",
      "coords": [25.5941, 85.1376]
    },
    {
      "id": "#10438",
      "time": "04:26 PM",
      "title": "Cybercrime Activity Detected",
      "attackType": "Phishing",
      "affectedSystem": "Data Center A",
      "impact": "Moderate",
      "location": "Kerala",
      "mrr": 2.31,
      "errKm": "1.2km",
      "status": "PENDING",
      "risk": "High",
      "coords": [10.8505, 76.2711]
    },
    {
      "id": "#10892",
      "time": "04:22 PM",
      "title": "Investment Fraud ATM Mule Hit",
      "attackType": "Card Skimming / Cash-out",
      "affectedSystem": "ATM Terminal 402",
      "impact": "Critical",
      "location": "Mumbai, Maharashtra",
      "mrr": 1.00,
      "errKm": "0.2km",
      "status": "PENDING",
      "risk": "Critical",
      "coords": [19.0760, 72.8777]
    },
    {
      "id": "#11204",
      "time": "04:15 PM",
      "title": "Digital Arrest Extortion Layering",
      "attackType": "Impersonation / Vishing",
      "affectedSystem": "Retail Mule Accounts",
      "impact": "High",
      "location": "Delhi NCR",
      "mrr": 1.00,
      "errKm": "0.0km",
      "status": "PENDING",
      "risk": "Critical",
      "coords": [28.6139, 77.2090]
    },
    {
      "id": "#11540",
      "time": "04:05 PM",
      "title": "Suspicious ATM Velocity Spike",
      "attackType": "Layered Cash Withdrawal",
      "affectedSystem": "Branch ATM Grid",
      "impact": "Moderate",
      "location": "Kolkata, West Bengal",
      "mrr": 1.85,
      "errKm": "0.8km",
      "status": "COMPLETED",
      "risk": "Medium",
      "coords": [22.5726, 88.3639]
    }
  ]
};

const getMarkerIcon = (risk) => {
  let ringColor = '#06b6d4'; // Cyan/Blue for Medium
  let innerColor = '#0891b2';
  if (risk === 'Critical') {
    ringColor = 'rgba(220, 38, 38, 0.4)'; // Red
    innerColor = '#dc2626';
  } else if (risk === 'High') {
    ringColor = 'rgba(245, 158, 11, 0.4)'; // Amber
    innerColor = '#f59e0b';
  }

  const svg = `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="16" fill="${ringColor}" class="animate-pulse"/>
    <circle cx="20" cy="20" r="8" fill="${innerColor}" stroke="white" stroke-width="2"/>
  </svg>`;

  return L.divIcon({
    html: svg,
    className: 'bg-transparent border-none',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
};

function MapUpdater({ center }) {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export default function TabDashboard() {
  const [activeIncident, setActiveIncident] = useState(null);
  const [isCCTVModalOpen, setCCTVModalOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState([22.5937, 78.9629]); // Center of India

  const handleIncidentClick = (inc) => {
    setActiveIncident(inc.id);
    setMapCenter(inc.coords);
  };

  return (
    <div className="flex flex-col gap-6 bg-[#F8FAFC] min-h-screen font-sans text-[#0A2540]">
      
      {/* 3. Top Metrics Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm border-t-4 border-t-blue-500">
          <div className="text-xs font-bold text-slate-500 uppercase">ACTIVE INCIDENTS</div>
          <div className="flex items-end gap-3 mt-1">
            <span className="text-3xl font-bold font-mono text-[#0A2540]">{MOCK_DATA.metrics.activeIncidents}</span>
            <span className="text-sm font-semibold text-amber-500 mb-1">+14 in last 15m</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm border-t-4 border-t-emerald-500">
          <div className="text-xs font-bold text-slate-500 uppercase flex justify-between">
            AVG PREDICTION MRR
            <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">{MOCK_DATA.metrics.mrrDelta}</span>
          </div>
          <div className="flex items-end gap-3 mt-1">
            <span className="text-3xl font-bold font-mono text-[#0A2540]">{MOCK_DATA.metrics.avgMRR}</span>
            <span className="text-xs text-slate-400 font-medium mb-1">Mean Reciprocal Rank</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm border-t-4 border-t-indigo-500">
          <div className="text-xs font-bold text-slate-500 uppercase">RESOLVED (24H)</div>
          <div className="flex items-end gap-3 mt-1">
            <span className="text-3xl font-bold font-mono text-[#0A2540]">{MOCK_DATA.metrics.resolved24h}</span>
            <span className="text-xs text-slate-400 font-medium mb-1">Interdicted / Accounts Frozen</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm border-t-4 border-t-amber-500">
          <div className="text-xs font-bold text-slate-500 uppercase">HIGH-RISK CLUSTERS</div>
          <div className="flex items-end gap-3 mt-1">
            <span className="text-3xl font-bold font-mono text-[#DC2626]">{MOCK_DATA.metrics.highRiskClusters}</span>
            <span className="text-xs text-slate-400 font-medium mb-1">Multi-Mule Hotspots Detected</span>
          </div>
        </div>
      </div>

      {/* 4. Main Dual-Pane Command Center */}
      <div className="flex flex-col lg:flex-row gap-6 h-[600px]">
        
        {/* Left Column: Live Alert Feed */}
        <div className="w-full lg:w-[40%] bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
          <div className="bg-[#0A2540] text-white px-4 py-3 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Feed
            </h3>
            <span className="text-xs font-mono opacity-80">{MOCK_DATA.metrics.activeIncidents} total</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#F8FAFC]">
            {MOCK_DATA.incidents.map((inc) => (
              <div 
                key={inc.id}
                onClick={() => handleIncidentClick(inc)}
                className={`bg-white border rounded-lg p-4 cursor-pointer transition-all shadow-sm
                  ${activeIncident === inc.id ? 'border-l-4 border-l-[#0A2540] border-y-slate-300 border-r-slate-300' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-sm font-bold text-[#0A2540]">{inc.id}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">{inc.time}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      inc.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {inc.status}
                    </span>
                  </div>
                </div>
                
                <h4 className="font-bold text-sm text-slate-800">{inc.title}</h4>
                <div className="text-xs text-slate-600 mt-1 line-clamp-1">
                  <span className="font-semibold text-slate-700">Type:</span> {inc.attackType} | <span className="font-semibold text-slate-700">Affected:</span> {inc.affectedSystem}
                </div>
                
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 mt-2 mb-3">
                  <MapPin size={12} className="text-[#0A2540]" /> {inc.location}
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-mono px-2 py-0.5 rounded">MRR: {inc.mrr.toFixed(2)}</span>
                  <span className="bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-mono px-2 py-0.5 rounded">Err: {inc.errKm}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    inc.risk === 'Critical' ? 'border-red-500 text-red-700 bg-red-50' : 
                    inc.risk === 'High' ? 'border-amber-500 text-amber-700 bg-amber-50' : 
                    'border-blue-500 text-blue-700 bg-blue-50'
                  }`}>
                    {inc.risk} Risk
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Geospatial Map Layer */}
        <div className="w-full lg:w-[60%] bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden relative">
          <MapContainer 
            center={mapCenter} 
            zoom={5} 
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <MapUpdater center={mapCenter} />
            <TileLayer
              url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"
              attribution='&copy; CARTO'
            />
            {MOCK_DATA.incidents.map((inc) => (
              <Marker 
                key={inc.id}
                position={inc.coords}
                icon={getMarkerIcon(inc.risk)}
              >
                <Popup className="glassmorphic-popup">
                  <div className="p-1 min-w-[200px]">
                    <h4 className="font-bold text-sm text-[#0A2540] border-b pb-2 mb-2">{inc.title} ({inc.location})</h4>
                    <div className="text-xs text-slate-600 mb-1"><span className="font-bold">Risk Score:</span> {(inc.mrr * 20).toFixed(1)}%</div>
                    <div className="text-xs text-slate-600 mb-3"><span className="font-bold">Tier:</span> <span className="uppercase">{inc.risk}</span></div>
                    <button className="w-full bg-[#0A2540] text-white py-1.5 rounded text-xs font-semibold hover:bg-slate-800 transition">
                      View Cluster Details
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          
          {/* Pinned Bottom-Right Legend */}
          <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur border border-slate-200 rounded-lg p-3 shadow-lg z-[1000]">
            <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider">Risk Legend</h5>
            <div className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#dc2626]"></span> Critical (Red)</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span> High (Yellow)</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#06b6d4]"></span> Medium (Blue)</div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Lower Section: Intelligence Advisory */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
        <div className="bg-[#DC2626] text-white px-5 py-3 flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2 font-bold text-sm tracking-wide">
            <AlertTriangle size={18} /> OFFICIAL I4C INTELLIGENCE ADVISORY • URGENT LEA ACTION REQUIRED
          </div>
          <div className="font-mono text-xs font-bold opacity-90">
            REF NO: {MOCK_DATA.advisory.refNo}
          </div>
        </div>
        
        <div className="p-6">
          <h2 className="text-xl font-black text-[#0A2540] mb-2">{MOCK_DATA.advisory.title}</h2>
          <p className="text-sm text-slate-600 mb-6 max-w-4xl">
            High-velocity multi-mule ATM withdrawal attempts detected by predictive neural models indicating coordinated cash-out operations across the designated regional grid. Immediate interdiction required to prevent capital flight.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 bg-[#F8FAFC] border border-slate-200 p-4 rounded-lg mb-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Target Operational Zone</span>
              <span className="text-xs font-semibold text-slate-800">{MOCK_DATA.advisory.zone}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Predicted Withdrawal Window</span>
              <span className="text-xs font-bold text-[#DC2626]">{MOCK_DATA.advisory.window}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Capital At Risk</span>
              <span className="text-sm font-bold font-mono text-[#DC2626]">{MOCK_DATA.advisory.capitalAtRisk}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Linked Mule Accounts</span>
              <span className="text-xs font-semibold text-slate-800">{MOCK_DATA.advisory.linkedMuleAccounts} Verified Accounts</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Primary Syndicate</span>
              <span className="text-xs font-semibold text-slate-800">{MOCK_DATA.advisory.syndicate}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Action Directive</span>
              <span className="text-xs font-bold text-[#DC2626]">{MOCK_DATA.advisory.actionDirective}</span>
            </div>
          </div>
          
          <div className="border-t border-slate-200 pt-5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">
              &gt; OFFICIAL LEA ACTION DIRECTIVES (AUTHORIZATION REQUIRED)
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded text-sm font-bold transition-colors">
                <Navigation size={16} /> Dispatch Field Unit (Mobile Patrol)
              </button>
              <button className="flex items-center gap-2 bg-[#991B1B] hover:bg-[#7F1D1D] text-white px-5 py-2.5 rounded text-sm font-bold transition-colors">
                <Lock size={16} /> Initiate Bank Freeze Protocol (Sec 102 BNSS)
              </button>
              <button 
                onClick={() => setCCTVModalOpen(true)}
                className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded text-sm font-bold transition-colors"
              >
                <Video size={16} /> Request Emergency CCTV Feed
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Emergency CCTV Requisition Modal */}
      {isCCTVModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-slate-300">
            <div className="bg-[#0F172A] px-6 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3 text-white">
                <Video size={20} className="text-amber-400" />
                <h3 className="font-bold tracking-wide text-sm m-0 uppercase">EMERGENCY CCTV REQUISITION NOTICE (SEC 91 CRPC)</h3>
              </div>
              <button onClick={() => setCCTVModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                ✕
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4 bg-[#F8FAFC] border border-slate-200 p-4 rounded-lg text-sm">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Case Reference:</span>
                  <span className="font-mono font-bold text-slate-800">{MOCK_DATA.modalPreset.caseRef}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Victim Defrauded Capital:</span>
                  <span className="font-mono font-bold text-[#DC2626]">{MOCK_DATA.modalPreset.amount}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Target Mule Bank:</span>
                  <span className="font-semibold text-slate-800">{MOCK_DATA.modalPreset.bank}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Predicted ATM Cluster:</span>
                  <span className="font-semibold text-slate-800">{MOCK_DATA.modalPreset.atmCluster}</span>
                </div>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 text-purple-800 p-3 rounded-lg text-xs font-semibold flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <p>Generates formal Section 91 CrPC notice to bank branch manager for immediate CCTV footage extraction during window {MOCK_DATA.modalPreset.window}.</p>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">REQUISITION NARRATIVE:</label>
                <textarea 
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm text-slate-800 focus:outline-none focus:border-[#0A2540] min-h-[80px]"
                  defaultValue="Urgent requisition for suspect ATM surveillance footage connected with instant cash-out pattern in NCRP case #094821."
                />
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button 
                onClick={() => setCCTVModalOpen(false)}
                className="px-5 py-2.5 rounded text-sm font-bold text-slate-600 border border-slate-300 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => setCCTVModalOpen(false)}
                className="px-5 py-2.5 rounded text-sm font-bold text-white bg-[#0A2540] hover:bg-slate-800 transition-colors"
              >
                Issue Section 91 Requisition
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
