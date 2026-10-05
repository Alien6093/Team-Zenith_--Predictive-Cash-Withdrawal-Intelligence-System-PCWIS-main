import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { AtmLocation, RiskZone } from '../types/pcwis';
import { MapPin, Shield, AlertTriangle, Crosshair } from 'lucide-react';

interface Props {
  atms: AtmLocation[];
  riskZones: RiskZone[];
  onOpenModal: (type: 'FREEZE' | 'DISPATCH' | 'CCTV', complaintRef?: string) => void;
}

const DISTRICT_OPTIONS = [
  { label: 'All India', center: [20.5937, 78.9629] as [number, number], zoom: 5 },
  { label: 'Noida (UP)', center: [28.5355, 77.3910] as [number, number], zoom: 12 },
  { label: 'New Delhi (DL)', center: [28.6139, 77.2090] as [number, number], zoom: 12 },
  { label: 'Greater Noida Hotspot', center: [28.5000, 77.5000] as [number, number], zoom: 13 },
  { label: 'Mumbai (MH)', center: [19.0760, 72.8777] as [number, number], zoom: 12 },
  { label: 'Bengaluru (KA)', center: [12.9716, 77.5946] as [number, number], zoom: 12 },
  { label: 'Hyderabad (TS)', center: [17.3850, 78.4867] as [number, number], zoom: 12 },
  { label: 'Chennai (TN)', center: [13.0827, 80.2707] as [number, number], zoom: 12 },
  { label: 'Kolkata (WB)', center: [22.5726, 88.3639] as [number, number], zoom: 12 },
  { label: 'Pune (MH)', center: [18.5204, 73.8567] as [number, number], zoom: 12 },
  { label: 'Jamtara (JH)', center: [23.9639, 86.8000] as [number, number], zoom: 11 },
];

// Create custom icons using SVG strings rendered as data URIs
const createIcon = (color: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="#FFFFFF"/></svg>`;
  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

const icons = {
  critical: createIcon('#B91C1C'), // gov-red
  high: createIcon('#B45309'),     // gov-amber
  medium: createIcon('#FF9933'),   // gov-saffron
  low: createIcon('#1B7A43'),      // gov-green
};

export const GeographicRiskTab: React.FC<Props> = ({ atms, riskZones, onOpenModal }) => {
  const [districtIdx, setDistrictIdx] = useState(0);
  const [riskFilter, setRiskFilter] = useState('ALL');

  const selectedDistrict = DISTRICT_OPTIONS[districtIdx];

  const filteredAtms = useMemo(() => {
    return atms.filter(atm => {
      if (riskFilter === 'MOST_RISK') return atm.riskScore >= 80;
      if (riskFilter === 'LESS_RISK') return atm.riskScore >= 40 && atm.riskScore < 80;
      if (riskFilter === 'ALMOST_NO_RISK') return atm.riskScore < 40;
      return true;
    });
  }, [atms, riskFilter]);

  const getRiskIcon = (score: number) => {
    if (score >= 80) return icons.critical;
    if (score >= 60) return icons.high;
    if (score >= 40) return icons.medium;
    return icons.low;
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return '#B91C1C';
      case 'HIGH': return '#B45309';
      default: return '#FF9933';
    }
  };

  return (
    <div className="gov-card flex flex-col h-[650px] p-0 overflow-hidden">
      {/* Controls */}
      <div className="bg-white border-b border-gov-border p-3 flex flex-col sm:flex-row justify-between items-center gap-4 z-[400] relative shadow-sm">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex flex-col">
            <label className="text-[9px] font-bold uppercase text-gov-text-muted tracking-wider mb-0.5">Jurisdiction Filter</label>
            <select 
              value={districtIdx} 
              onChange={e => setDistrictIdx(Number(e.target.value))}
              className="border border-gov-border px-3 py-1.5 rounded-sm text-xs font-bold text-gov-navy focus:outline-none focus:border-gov-navy uppercase"
            >
              {DISTRICT_OPTIONS.map((opt, idx) => (
                <option key={opt.label} value={idx}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col border-l border-gov-border pl-4">
            <label className="text-[9px] font-bold uppercase text-gov-text-muted tracking-wider mb-0.5">Risk Threshold</label>
            <select 
              value={riskFilter} 
              onChange={e => setRiskFilter(e.target.value)}
              className="border border-gov-border px-3 py-1.5 rounded-sm text-xs font-bold text-gov-navy focus:outline-none focus:border-gov-navy uppercase"
            >
              <option value="ALL">ALL ATMS</option>
              <option value="MOST_RISK">CRITICAL RISK (≥80)</option>
              <option value="LESS_RISK">MODERATE RISK (40-79)</option>
              <option value="ALMOST_NO_RISK">LOW RISK (&lt;40)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider bg-gray-50 px-3 py-1.5 border border-gov-border rounded-sm text-gray-900">
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gov-red"></span> CRITICAL</div>
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gov-amber"></span> HIGH</div>
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gov-green"></span> LOW</div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 w-full bg-gray-100 relative">
        <MapContainer 
          key={`${selectedDistrict.center[0]}-${selectedDistrict.zoom}`} // Force re-render on center change
          center={selectedDistrict.center} 
          zoom={selectedDistrict.zoom} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Render Risk Zones (Circles) */}
          {riskZones.map(zone => (
            <Circle 
              key={zone.id}
              center={zone.latLng}
              pathOptions={{ fillColor: getRiskColor(zone.riskLevel), color: getRiskColor(zone.riskLevel), weight: 2, fillOpacity: 0.15 }}
              radius={3000} // Fixed roughly at 3km for demo
            >
              <Popup>
                <div className="p-1">
                  <div className="text-[10px] uppercase font-bold text-gov-red mb-1">{zone.riskLevel} HOTSPOT</div>
                  <div className="font-bold text-sm text-gov-navy">{zone.zoneName}</div>
                  <div className="text-xs mt-1">Syndicate: <span className="font-mono">{zone.primarySyndicate}</span></div>
                  <div className="text-xs mt-1">Active At-Risk Capital: ₹{zone.predictedWithdrawalCr}Cr</div>
                </div>
              </Popup>
            </Circle>
          ))}

          {/* Render ATMs */}
          {filteredAtms.map(atm => (
            <Marker 
              key={atm.id}
              position={atm.latLng}
              icon={getRiskIcon(atm.riskScore)}
            >
              <Popup className="gov-popup">
                <div className="flex flex-col min-w-[220px]">
                  <div className="border-b border-gray-200 pb-2 mb-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono text-gov-text-muted bg-gray-100 px-1 rounded-sm">{atm.id}</span>
                      {atm.riskScore >= 80 && <span className="gov-badge gov-badge-critical">CRITICAL</span>}
                    </div>
                    <h4 className="font-bold text-gov-navy mt-1 text-sm leading-tight">{atm.name}</h4>
                    <p className="text-[11px] text-gov-text-muted uppercase tracking-wide">{atm.bank} • {atm.district}</p>
                  </div>
                  
                  <div className="flex justify-between items-center bg-red-50 p-1.5 rounded-sm mb-3 border border-red-100">
                    <span className="text-[10px] uppercase font-bold text-gov-red">Risk Score</span>
                    <span className="font-mono font-bold text-gov-red">{atm.riskScore}/100</span>
                  </div>

                  <p className="text-[10px] text-gov-text leading-tight mb-3 border-l-2 border-gov-amber pl-2">
                    <strong>Insight:</strong> {atm.appAnalysisInsight}
                  </p>

                  <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100">
                    <button 
                      onClick={() => onOpenModal('DISPATCH', atm.activeComplaintRef)} 
                      className="gov-btn gov-btn-primary w-full flex items-center justify-center gap-1 py-1"
                    >
                      <Shield size={12} /> DISPATCH UNIT
                    </button>
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => onOpenModal('FREEZE', atm.activeComplaintRef)} 
                        className="gov-btn gov-btn-danger flex-1 flex items-center justify-center gap-1 py-1"
                      >
                        <AlertTriangle size={12} /> FREEZE
                      </button>
                      <button 
                        onClick={() => onOpenModal('CCTV', atm.activeComplaintRef)} 
                        className="gov-btn gov-btn-secondary flex-1 flex items-center justify-center gap-1 py-1"
                      >
                        <Crosshair size={12} /> CCTV
                      </button>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};
