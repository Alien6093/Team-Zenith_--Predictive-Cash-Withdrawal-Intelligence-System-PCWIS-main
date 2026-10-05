import React, { useState, useEffect, useCallback } from 'react';
import {
  HeaderBar,
  KpiStrip,
  PredictionHeroAdvisory,
  TabNavigation,
  DashboardOverviewTab,
  ComplaintRegisterTab,
  EntityMapTab,
  GeographicRiskTab,
  InterBankTab,
  AuditRegisterTab,
  ActionModal,
  Footer,
  Login
} from './components';

import { TabType, ModalType, Complaint, PredictionAdvisory, KpiMetric, AuditLog, BankDirective, RiskZone, AtmLocation } from './types/pcwis';
import { fetchWithToken } from './api';

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<TabType>(1);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedComplaintRef, setSelectedComplaintRef] = useState<string | undefined>();

  // Global State (Fetched from API)
  const [kpiMetrics, setKpiMetrics] = useState<KpiMetric[]>([]);
  const [hourlyVelocity, setHourlyVelocity] = useState<any[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<any[]>([]);
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  
  const [advisory, setAdvisory] = useState<PredictionAdvisory | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [atms, setAtms] = useState<AtmLocation[]>([]);
  const [banks, setBanks] = useState<BankDirective[]>([]);

  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    try {
      // 1. Fetch Metrics & KPIs
      const metricsData = await fetchWithToken('/metrics', token);
      const metrics: KpiMetric[] = [
        { id: 'm1', label: 'Total Flagged Complaints', value: metricsData.kpis.total_complaints.toLocaleString(), change: 'LIVE', trend: 'neutral', subtitle: 'Processed via API', statusColor: 'gov-amber' },
        { id: 'm2', label: 'Active Fraud Syndicates', value: metricsData.kpis.active_networks, change: 'DETECTED', trend: 'up', subtitle: 'Operating across graph', statusColor: 'gov-red' },
        { id: 'm3', label: 'Mule Accounts Flagged', value: metricsData.kpis.mules_flagged.toLocaleString(), change: 'LIVE', trend: 'down', subtitle: 'Accounts extracted', statusColor: 'gov-green' },
        { id: 'm4', label: 'Predicted Cash-Withdrawals', value: metricsData.kpis.predicted_withdrawals, change: 'PREDICTED', trend: 'up', subtitle: 'Based on velocity', statusColor: 'gov-amber' },
        { id: 'm5', label: 'Capital Secured', value: metricsData.kpis.secured_capital_cr, unit: 'Cr', change: 'LIVE', trend: 'up', subtitle: 'Funds blocked under BNSS', statusColor: 'gov-green' }
      ];
      setKpiMetrics(metrics);
      setHourlyVelocity(metricsData.hourly_velocity);
      setCategoryDistribution(metricsData.category_distribution);

      // We'll synthesize "RiskZones" from priority incidents just for visual demo
      const zones = metricsData.priority_incidents.slice(0, 3).map((inc: any, idx: number) => {
        // Fallback coordinates since demo_complaints doesn't have lat/lng
        const lat = inc.lat !== undefined ? inc.lat : (28.0 + idx * 0.5);
        const lng = inc.lng !== undefined ? inc.lng : (77.0 + idx * 0.5);
        return {
          id: `RZ-${idx}`,
          zoneName: `${inc.district} Hotspot`,
          state: inc.state || inc.state_ut || 'Unknown',
          districts: [inc.district],
          riskLevel: inc.risk_score >= 90 ? 'CRITICAL' : 'HIGH',
          activeHotspots: Math.floor(inc.risk_score / 10),
          predictedWithdrawalCr: roundDec((inc.victim_amount || 0) / 10000000),
          primarySyndicate: inc.associated_syndicate || 'Unknown Syndicate',
          atmDensityScore: 80,
          coordinates: { x: 50, y: 50 },
          latLng: [lat, lng] as [number, number]
        };
      });
      setRiskZones(zones);

      // 2. Fetch Cases
      const casesData = await fetchWithToken('/cases', token);
      setComplaints(casesData.cases.map((c: any, idx: number) => {
        // Fallback coordinates
        const lat = c.lat !== undefined ? c.lat : (28.0 + (idx % 10) * 0.1);
        const lng = c.lng !== undefined ? c.lng : (77.0 + (idx % 10) * 0.1);
        return {
          caseRef: c.case_ref,
          timestamp: c.timestamp,
          fraudCategory: c.fraud_category,
          stateUT: c.state || c.state_ut,
          district: c.district,
          victimAmount: c.victim_amount,
          muleAccountRef: c.mule_account_ref,
          muleBank: c.mule_bank,
          muleBranchCity: c.mule_branch_city,
          atmTargetLocation: c.atm_target_location,
          predictedTimeWindow: c.predicted_time_window,
          riskScore: c.risk_score,
          status: c.status === 'Freeze Ordered' ? 'BANK_FREEZE_INITIATED' : c.status === 'Funds Secured' ? 'FUNDS_SECURED' : 'UNDER_INVESTIGATION',
          linkedIMEI: c.linked_imei,
          ipAddress: c.ip_address,
          associatedSyndicate: c.associated_syndicate,
          latLng: [lat, lng]
        };
      }));

      // 3. Fetch ATMs
      const atmsData = await fetchWithToken('/atms', token);
      setAtms(atmsData.atms.map((a: any) => {
        // Fallback or extract bank from name if tags aren't present
        const atmName = a.name || 'Unlabeled ATM';
        const bankName = atmName.includes(' Bank') ? atmName.split(' Bank')[0] + ' Bank' : (atmName !== 'Unlabeled ATM' ? atmName : 'Unknown Bank');
        return {
          id: a.atm_id || a.id || `ATM-${Math.random()}`,
          name: atmName,
          bank: bankName,
          district: a.city || 'OpenStreetMap Region',
          city: a.city || 'Local',
          stateUT: 'India',
          latLng: [a.lat, a.lon],
          riskScore: a.risk_score,
          historicalIncidents30D: a.incident_count_30d,
          appAnalysisInsight: `OSM Node ID: ${a.atm_id || a.id}. Tier: ${a.tier}`,
          status: a.tier === 'High' ? 'ACTIVE_INCIDENT' : 'CLEARED'
        };
      }));

      // 4. Fetch Banks
      const banksData = await fetchWithToken('/banks', token);
      setBanks(banksData.banks.map((b: any) => ({
        bankName: b.bank_name,
        rbiCode: b.rbi_code,
        referenceNo: b.reference_no,
        nodelOfficerContact: b.nodal_officer_contact,
        activeFreezeCount: b.active_lien_count,
        fundsSecuredTodayCr: b.funds_secured_today / 10000000,
        avgResponseTimeMin: b.avg_response_time_min,
        status: b.status,
        lastSyncTimestamp: new Date().toISOString()
      })));

      // 5. Fetch Audit Logs
      const auditData = await fetchWithToken('/audit', token);
      setAuditLogs(auditData.logs.map((l: any) => ({
        id: l.log_ref,
        timestamp: l.timestamp,
        officerId: l.officer_id,
        officerName: l.officer_id, // backend doesn't store name natively in demo DB, we map ID to name
        agency: l.agency,
        actionType: l.action_category,
        targetCaseRef: l.target_case_ref,
        ipAddress: l.client_ip,
        details: l.narrative
      })));

    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const roundDec = (val: number) => Math.round(val * 100) / 100;

  const handlePredictAdvisory = async (fraudCategory: string, victimLat: number, victimLng: number, amount: number) => {
    if (!token) return;
    try {
      const res = await fetchWithToken('/predict', token, {
        method: 'POST',
        body: JSON.stringify({ category: fraudCategory, lat: victimLat, lng: victimLng, amount })
      });
      setAdvisory({
        referenceNo: res.prediction_id,
        title: `HIGH PROBABILITY ${fraudCategory.toUpperCase()} CASH-OUT DETECTED (${res.cluster})`,
        riskLevel: res.risk_score >= 80 ? 'CRITICAL' : 'HIGH',
        targetZone: 'Lat/Lng Target Coordinates',
        confidenceScore: res.confidence,
        predictedTimeWindow: 'Within 4 Hours',
        estimatedCapitalAtRisk: amount,
        totalMuleAccountsFlagged: res.features.length * 3,
        explainableFactors: res.features.map((f: any) => ({
          factor: f.feature.replace(/_/g, ' '),
          weightPercentage: f.weight,
          description: f.desc
        }))
      });
    } catch (error) {
      console.error("Prediction API failed:", error);
    }
  };

  const handleOpenModal = (type: ModalType, complaintRef?: string) => {
    setActiveModal(type);
    setSelectedComplaintRef(complaintRef || complaints[0]?.caseRef);
  };

  const handleConfirmAction = async (type: NonNullable<ModalType>, complaintRef: string, note: string) => {
    if (!token) return;
    
    // Post real audit log
    const actionMap = {
      'FREEZE': 'BANK_FREEZE_ORDER',
      'DISPATCH': 'FIELD_DISPATCH',
      'CCTV': 'CCTV_REQUISITION',
      'DOSSIER': 'CASE_QUERY'
    };
    
    try {
      await fetchWithToken('/audit', token, {
        method: 'POST',
        body: JSON.stringify({
          action_category: actionMap[type],
          target_case_ref: complaintRef,
          narrative: note
        })
      });
      // Refresh audit logs
      fetchDashboardData();
      
      // Update local status for UX
      let newStatus = 'UNDER_INVESTIGATION';
      if (type === 'FREEZE') newStatus = 'BANK_FREEZE_INITIATED';
      if (type === 'DISPATCH') newStatus = 'FIELD_UNIT_DISPATCHED';
      if (type === 'CCTV') newStatus = 'CCTV_REQUESTED';
      setComplaints(prev => prev.map(c => 
        c.caseRef === complaintRef ? { ...c, status: newStatus as any } : c
      ));
    } catch(e) {
      console.error("Audit post failed", e);
    }
  };

  if (!token) {
    return <Login onLogin={setToken} />;
  }

  const isAdvisoryRef = advisory && advisory.referenceNo === selectedComplaintRef;
  const selectedComplaint = complaints.find(c => c.caseRef === selectedComplaintRef) || (isAdvisoryRef ? {
    caseRef: advisory.referenceNo,
    muleAccountRef: 'MULTIPLE (SEE ML DOSSIER)',
    muleBank: 'VARIOUS',
    muleBranchCity: 'PREDICTED HOTSPOT',
    atmTargetLocation: advisory.targetZone,
    district: 'PREDICTED HOTSPOT',
    victimAmount: advisory.estimatedCapitalAtRisk,
    associatedSyndicate: 'PREDICTED SCAM RING',
    status: 'UNDER_INVESTIGATION' as const,
    timestamp: new Date().toISOString(),
    fraudCategory: 'ML Prediction',
    stateUT: 'N/A',
    predictedTimeWindow: advisory.predictedTimeWindow,
    riskScore: 90,
    linkedIMEI: 'N/A',
    ipAddress: 'N/A',
    latLng: [0, 0] as [number, number]
  } : null);

  return (
    <div className="min-h-screen bg-gov-bg flex flex-col font-sans">
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-2 sm:px-4 py-2 sm:py-3 flex flex-col">
        <HeaderBar />
        
        <div className="mt-4">
          <KpiStrip metrics={kpiMetrics} />
        </div>

        <PredictionHeroAdvisory 
          advisory={advisory} 
          onPredict={handlePredictAdvisory} 
          onOpenModal={type => handleOpenModal(type, advisory?.referenceNo)} 
        />

        <TabNavigation 
          activeTab={activeTab} 
          onChangeTab={setActiveTab} 
          complaintCount={complaints.length} 
          auditCount={auditLogs.length} 
        />

        {/* Tab Content Area */}
        <div className="flex-1 min-h-0">
          {activeTab === 1 && <DashboardOverviewTab complaints={complaints} riskZones={riskZones} hourlyVelocity={hourlyVelocity} categoryDistribution={categoryDistribution} onSelectComplaint={() => setActiveTab(2)} />}
          {activeTab === 2 && <ComplaintRegisterTab complaints={complaints} onOpenModal={handleOpenModal} />}
          {activeTab === 3 && <EntityMapTab complaints={complaints} token={token} />}
          {activeTab === 4 && <GeographicRiskTab atms={atms} riskZones={riskZones} onOpenModal={handleOpenModal} />}
          {activeTab === 5 && <InterBankTab directives={banks} onOpenModal={handleOpenModal} />}
          {activeTab === 6 && <AuditRegisterTab logs={auditLogs} />}
        </div>

        {activeModal && (
          <ActionModal 
            type={activeModal} 
            complaint={selectedComplaint} 
            onClose={() => setActiveModal(null)} 
            onConfirm={handleConfirmAction} 
          />
        )}

        <Footer />
      </main>
    </div>
  );
};

export default App;
