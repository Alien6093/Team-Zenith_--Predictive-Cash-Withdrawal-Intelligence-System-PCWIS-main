import { useState, useEffect } from 'react';
import type { 
  Complaint, 
  BankDirective, 
  AuditLog, 
  Hotspot, 
  KpiMetrics, 
  TrendPoint, 
  StateVolume, 
  GnnNetwork 
} from '../types';

import complaintsData from '../data/complaints.json';
import bankDirectivesData from '../data/bankDirectives.json';
import auditLogsData from '../data/auditLogs.json';
import hotspotsData from '../data/hotspots.json';
import kpiData from '../data/kpiMetrics.json';
import complaintTrendData from '../data/complaintTrend.json';
import stateVolumeData from '../data/stateVolume.json';
import gnnNetworksData from '../data/gnnNetworks.json';

// Simulated API latency
const SIMULATE_LATENCY = false;
const LATENCY_MS = 300;

export function useComplaintsData() {
  const [data, setData] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In the future, this can be swapped with a fetch() call
    if (SIMULATE_LATENCY) {
      setTimeout(() => {
        setData(complaintsData as Complaint[]);
        setLoading(false);
      }, LATENCY_MS);
    } else {
      setData(complaintsData as Complaint[]);
      setLoading(false);
    }
  }, []);

  return { data, loading };
}

export function useBankDirectivesData() {
  const [data, setData] = useState<BankDirective[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setData(bankDirectivesData as BankDirective[]);
    setLoading(false);
  }, []);

  return { data, loading };
}

export function useAuditLogsData() {
  const [data, setData] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setData(auditLogsData as AuditLog[]);
    setLoading(false);
  }, []);

  return { data, loading };
}

export function useHotspotsData() {
  const [data, setData] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setData(hotspotsData as Hotspot[]);
    setLoading(false);
  }, []);

  return { data, loading };
}

export function useKpiData() {
  const [data, setData] = useState<KpiMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setData(kpiData as KpiMetrics);
    setLoading(false);
  }, []);

  return { data, loading };
}

export function useComplaintTrendData() {
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setData(complaintTrendData as TrendPoint[]);
    setLoading(false);
  }, []);

  return { data, loading };
}

export function useStateVolumeData() {
  const [data, setData] = useState<StateVolume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setData(stateVolumeData as StateVolume[]);
    setLoading(false);
  }, []);

  return { data, loading };
}

export function useGnnNetworksData() {
  const [data, setData] = useState<GnnNetwork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setData(gnnNetworksData as GnnNetwork[]);
    setLoading(false);
  }, []);

  return { data, loading };
}
