export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type CaseStatus = 'UNDER_INVESTIGATION' | 'BANK_FREEZE_INITIATED' | 'FIELD_UNIT_DISPATCHED' | 'CCTV_REQUESTED' | 'FUNDS_SECURED' | 'CLOSED_RESOLVED';

export interface Complaint {
  caseRef: string;
  timestamp: string;
  fraudCategory: string;
  stateUT: string;
  district: string;
  victimAmount: number;
  muleAccountRef: string;
  muleBank: string;
  muleBranchCity: string;
  atmTargetLocation: string;
  predictedTimeWindow: string;
  riskScore: number;
  status: CaseStatus;
  linkedIMEI: string;
  ipAddress: string;
  associatedSyndicate: string;
  latLng?: [number, number];
}

export interface PredictionAdvisory {
  referenceNo: string;
  title: string;
  riskLevel: RiskLevel;
  targetZone: string;
  confidenceScore: number;
  predictedTimeWindow: string;
  estimatedCapitalAtRisk: number;
  totalMuleAccountsFlagged: number;
  explainableFactors: Array<{
    factor: string;
    weightPercentage: number;
    description: string;
  }>;
}

export interface KpiMetric {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  subtitle: string;
  statusColor?: string;
}

export interface BankDirective {
  bankName: string;
  rbiCode: string;
  referenceNo: string;
  nodelOfficerContact: string;
  activeFreezeCount: number;
  fundsSecuredTodayCr: number;
  avgResponseTimeMin: number;
  status: 'OPTIMAL' | 'MODERATE_DELAY' | 'ESCALATED';
  lastSyncTimestamp: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  officerId: string;
  officerName: string;
  agency: string;
  actionType: 'CASE_QUERY' | 'BANK_FREEZE_ORDER' | 'FIELD_DISPATCH' | 'CCTV_REQUISITION' | 'DATA_EXPORT';
  targetCaseRef: string;
  ipAddress: string;
  details: string;
}

export interface EntityNode {
  id: string;
  label: string;
  type: 'VICTIM' | 'MULE_ACCOUNT' | 'DEVICE_IMEI' | 'ATM_LOCATION' | 'SYNDICATE_HUB';
  detail: string;
  status?: string;
  amount?: string;
  location?: string;
}

export interface RiskZone {
  id: string;
  zoneName: string;
  state: string;
  districts: string[];
  riskLevel: RiskLevel;
  activeHotspots: number;
  predictedWithdrawalCr: number;
  primarySyndicate: string;
  atmDensityScore: number;
  coordinates: { x: number; y: number };
  latLng: [number, number];
}

export interface AtmLocation {
  id: string;
  name: string;
  bank: string;
  district: string;
  city: string;
  stateUT: string;
  latLng: [number, number];
  riskScore: number;
  historicalIncidents30D: number;
  appAnalysisInsight: string;
  predictedTimeWindow?: string;
  activeComplaintRef?: string;
  status?: 'ACTIVE_INCIDENT' | 'UNDER_SURVEILLANCE' | 'CLEARED';
}

export type TabType = 1 | 2 | 3 | 4 | 5 | 6;
export type ModalType = 'FREEZE' | 'DISPATCH' | 'CCTV' | 'DOSSIER' | null;
