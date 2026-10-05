import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Complaint, RiskZone } from '../types/pcwis';

interface Props {
  complaints: Complaint[];
  riskZones: RiskZone[];
  hourlyVelocity: any[];
  categoryDistribution: any[];
  onSelectComplaint: (caseRef: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Digital Arrest Scam': '#B91C1C',
  'Investment Fraud': '#B45309',
  'ATM Cash Layering': '#003366',
  'Part-Time Job Fraud': '#E67E22',
  'UPI Phishing': '#1B7A43',
  'KYC Update Scam': '#4B5563'
};

export const DashboardOverviewTab: React.FC<Props> = ({ complaints, riskZones, hourlyVelocity, categoryDistribution, onSelectComplaint }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Area Chart - Hourly Velocity */}
      <div className="lg:col-span-7 gov-card flex flex-col h-[350px]">
        <h3 className="text-xs font-bold uppercase text-gov-navy border-b border-gov-border pb-2 mb-4 tracking-wider">
          Hourly Cash Layering & ATM Withdrawal Velocity (₹ Lakhs)
        </h3>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyVelocity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#4B5563', fontFamily: 'monospace' }} tickLine={false} axisLine={{ stroke: '#D1D5DB' }} />
              <YAxis tick={{ fontSize: 10, fill: '#4B5563', fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '2px', border: '1px solid #003366', fontSize: '12px', fontFamily: 'monospace' }}
                labelStyle={{ fontWeight: 'bold', color: '#003366', marginBottom: '4px' }}
              />
              <Area type="monotone" dataKey="actual" stroke="#003366" strokeWidth={2} fillOpacity={1} fill="url(#colorActual)" />
              <Area type="monotone" dataKey="predicted" stroke="#FF9933" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorPredicted)" />
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#003366" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#003366" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF9933" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#FF9933" stopOpacity={0}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar Chart - Fraud Categories */}
      <div className="lg:col-span-5 gov-card flex flex-col h-[350px]">
        <h3 className="text-xs font-bold uppercase text-gov-navy border-b border-gov-border pb-2 mb-4 tracking-wider">
          Capital Risk by Typology (₹ Lakhs)
        </h3>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryDistribution} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#4B5563', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#1F2937', fontWeight: 'bold' }} width={110} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '2px', border: '1px solid #D1D5DB', fontSize: '11px' }} />
              <Bar dataKey="loss_cr" radius={[0, 2, 2, 0]} barSize={20}>
                {categoryDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#003366'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Priority Risk Zones */}
      <div className="lg:col-span-5 gov-card">
        <h3 className="text-xs font-bold uppercase text-gov-navy border-b border-gov-border pb-2 mb-3 tracking-wider">
          Priority Risk Zones (Active)
        </h3>
        <div className="flex flex-col gap-2">
          {riskZones.map(zone => (
            <div key={zone.id} className="flex items-center justify-between p-2 bg-gov-bg border border-gov-border">
              <div>
                <div className="text-[11px] font-bold text-gov-navy uppercase">{zone.zoneName}</div>
                <div className="text-[9px] text-gov-text-muted uppercase tracking-wide">{zone.state}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-gov-red">₹{zone.predictedWithdrawalCr}Cr AT RISK</div>
                <div className="text-[9px] font-mono text-gov-text-muted">{zone.activeHotspots} HOTSPOTS</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent High-Risk Incidents */}
      <div className="lg:col-span-7 gov-card">
        <h3 className="text-xs font-bold uppercase text-gov-navy border-b border-gov-border pb-2 mb-3 tracking-wider">
          Recent High-Risk Incidents
        </h3>
        <div className="overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th>Reference ID</th>
                <th>Typology</th>
                <th>Target District</th>
                <th>Est. Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {complaints.slice(0, 4).map(c => (
                <tr key={c.caseRef}>
                  <td className="font-mono text-xs font-bold">{c.caseRef}</td>
                  <td className="text-xs">{c.fraudCategory}</td>
                  <td className="text-xs">{c.district}</td>
                  <td className="font-mono text-xs">₹{(c.victimAmount / 100000).toFixed(2)}L</td>
                  <td>
                    <button onClick={() => onSelectComplaint(c.caseRef)} className="text-[10px] uppercase font-bold text-gov-navy hover:underline">
                      View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
