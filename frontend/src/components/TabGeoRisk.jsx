import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Shield, Zap } from 'lucide-react';
import SharedModal from './SharedModal';

const getPinIcon = (tier) => {
  let color = '#22c55e'; // Green
  if (tier === 'High') color = '#ef4444'; // Red
  if (tier === 'Medium') color = '#eab308'; // Yellow
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 3px 3px rgba(0,0,0,0.4));">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3" fill="white" stroke="none"></circle>
  </svg>`;
  
  return L.divIcon({
    html: svg,
    className: 'bg-transparent border-none',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
};

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export default function TabGeoRisk() {
  const [atms, setAtms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filterTier, setFilterTier] = useState('All');
  const [selectedAtm, setSelectedAtm] = useState(null);
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]); // Default Delhi
  
  const [modalConfig, setModalConfig] = useState({ isOpen: false });

  useEffect(() => {
    api.getDemoAtms().then(res => {
      setAtms(res.atms);
      setLoading(false);
    });
  }, []);

  const filteredAtms = atms.filter(atm => filterTier === 'All' || atm.tier === filterTier);
  
  const counts = {
    High: atms.filter(a => a.tier === 'High').length,
    Medium: atms.filter(a => a.tier === 'Medium').length,
    Low: atms.filter(a => a.tier === 'Low').length,
    Total: atms.length
  };

  const openActionModal = (actionType) => {
    let actionFields = [];
    if (actionType === 'Field Patrol Dispatch') {
      actionFields = [
        { id: 'unit', label: 'Assigned Unit', isDropdown: true, options: ['Mobile Unit Alpha-1', 'Cyber Taskforce NCR'] },
        { id: 'instructions', label: 'Instructions', placeholder: 'Enter instructions...' }
      ];
    }
    setModalConfig({
      isOpen: true,
      title: `${actionType.toUpperCase()} AUTHORIZATION`,
      actionType,
      caseData: { case_ref: 'N/A', linked_mule_bank: selectedAtm?.name, district: selectedAtm?.city },
      actionFields,
      buttonText: `Confirm ${actionType.split(' ')[0]}`
    });
  };

  if (loading) return <div className="p-10">Loading Spatial Intelligence...</div>;

  return (
    <div className="flex h-full gap-4 animate-in fade-in">
      
      {/* Sidebar: List & Stats */}
      <div className="w-80 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col shrink-0">
        <div className="bg-slate-50 p-4 border-b border-slate-200">
          <h3 className="font-bold text-sm text-slate-800 mb-3 uppercase tracking-wide">ATM Risk Dashboard</h3>
          <div className="grid grid-cols-2 gap-2 mb-4 text-center">
            <div className="bg-white border border-slate-200 p-2 rounded">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Total Monitored</div>
              <div className="text-xl font-light text-slate-800">{counts.Total}</div>
            </div>
            <div className="bg-red-50 border border-red-200 p-2 rounded">
              <div className="text-[10px] text-red-500 font-bold uppercase">High Risk</div>
              <div className="text-xl font-light text-red-700">{counts.High}</div>
            </div>
          </div>
          <div className="flex bg-slate-200 rounded-lg p-1 text-[10px] font-bold">
            {['All', 'High', 'Medium', 'Low'].map(tier => (
              <button 
                key={tier}
                onClick={() => setFilterTier(tier)}
                className={`flex-1 py-1.5 rounded-md transition-colors ${filterTier === tier ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredAtms.sort((a,b) => b.risk_score - a.risk_score).map(atm => (
            <div 
              key={atm.atm_id} 
              onClick={() => { setSelectedAtm(atm); setMapCenter([atm.lat, atm.lon]); }}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedAtm?.atm_id === atm.atm_id ? 'border-indigo-500 bg-indigo-50' : 'border-transparent hover:bg-slate-50'}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-sm truncate">{atm.name}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${atm.tier === 'High' ? 'bg-red-100 text-red-700' : atm.tier === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {atm.risk_score.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-slate-500 font-mono">{atm.atm_id} • {atm.city}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Map */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm relative">
        <MapContainer 
          center={mapCenter} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
        >
          <MapUpdater center={mapCenter} />
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {filteredAtms.map(atm => (
            <Marker 
              key={atm.atm_id} 
              position={[atm.lat, atm.lon]} 
              icon={getPinIcon(atm.tier)}
              eventHandlers={{ click: () => setSelectedAtm(atm) }}
            >
              <Popup>
                <div className="font-bold text-sm">{atm.name}</div>
                <div className="text-xs text-slate-600">Score: {atm.risk_score.toFixed(1)}%</div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Floating Dossier Panel */}
        {selectedAtm && (
          <div className="absolute top-4 right-4 w-72 bg-white/95 backdrop-blur shadow-2xl rounded-xl border border-slate-200 z-[1000] overflow-hidden animate-in slide-in-from-right-4">
            <div className={`p-4 text-white flex justify-between items-center ${selectedAtm.tier === 'High' ? 'bg-red-600' : selectedAtm.tier === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'}`}>
              <h3 className="font-bold text-sm uppercase flex items-center gap-2"><MapPin size={16}/> ATM Dossier</h3>
              <span className="font-mono text-xs opacity-80">{selectedAtm.atm_id}</span>
            </div>
            <div className="p-4 space-y-4">
              {selectedAtm.tier === 'High' && (
                <div className="bg-red-50 text-red-800 text-xs p-2 rounded border border-red-200 font-semibold leading-relaxed">
                  CRITICAL: This terminal shows highly anomalous withdrawal velocity indicative of organized cash-layering.
                </div>
              )}
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b pb-1"><span className="text-slate-500 text-xs">Risk Score</span><span className="font-bold">{selectedAtm.risk_score.toFixed(1)}%</span></div>
                <div className="flex justify-between border-b pb-1"><span className="text-slate-500 text-xs">Location</span><span className="font-semibold text-right">{selectedAtm.name}<br/>{selectedAtm.city}</span></div>
                <div className="flex justify-between border-b pb-1"><span className="text-slate-500 text-xs">GPS Coordinates</span><span className="font-mono text-xs">{selectedAtm.lat.toFixed(4)}, {selectedAtm.lon.toFixed(4)}</span></div>
                <div className="flex justify-between border-b pb-1"><span className="text-slate-500 text-xs">30-Day Incidents</span><span className="font-bold">{selectedAtm.incident_count_30d}</span></div>
              </div>
              
              <div className="pt-2">
                <button onClick={() => openActionModal('Field Patrol Dispatch')} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded text-xs font-bold flex justify-center items-center gap-2 transition-colors">
                  <Zap size={14} /> Dispatch Patrol to ATM
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <SharedModal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ isOpen: false })}
        {...modalConfig}
      />
    </div>
  );
}
