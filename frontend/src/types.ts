// types.ts

export interface Complaint {
  id: string;
  ts: string;
  type: string;
  state: string;
  mule: string;
  risk: number;
  status: "CRITICAL" | "HIGH" | "MEDIUM";
  // We map candidates to this in App.jsx for map markers
  candidates?: { lat: number; lon: number; name: string; score: number; tier: string; action: string }[];
  mrr?: number;
  distance_error_km?: number;
  acknowledged?: boolean;
  ack_info?: { status: string };
}

export interface BankDirective {
  bank: string;
  ref: string;
  cases: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED";
  eta: string;
}

export interface AuditLog {
  officer: string;
  badge: string;
  ip: string;
  action: string;
  ts: string;
}

export interface Hotspot {
  name: string;
  x: number;
  y: number;
  level: "CRITICAL" | "HIGH" | "MEDIUM";
  n: number;
}

export interface KpiMetrics {
  totalComplaints24h: number;
  totalComplaintsDelta: string;
  activeFraudNetworks: number;
  activeFraudNetworksDelta: string;
  muleAccountsFlagged: number;
  muleAccountsFlaggedDelta: string;
  predictedCashEvents: number;
  predictedCashEventsDelta: string;
  atRiskCapitalCr: number;
  atRiskCapitalDelta: string;
}

export interface TrendPoint {
  t: string;
  v: number;
}

export interface StateVolume {
  state: string;
  v: number;
}

export interface GnnNetwork {
  networkId: string;
  victims: string[];
  mule: string;
  devices: string[];
  atms: string[];
  centrality: number;
  sharedDeviceConfidence: number;
  ringClassification: string;
}
