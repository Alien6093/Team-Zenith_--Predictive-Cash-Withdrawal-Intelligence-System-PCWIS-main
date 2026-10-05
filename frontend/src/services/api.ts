// frontend/src/services/api.ts

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function getAuthToken(): string | null {
  return localStorage.getItem('jwt_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('jwt_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('jwt_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeAuthToken();
    window.location.reload();
    throw new Error('Unauthorized or session expired. Please log in again.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || `API request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  login: async (username: string, password: string) => {
    const data = await request<{ authenticated: boolean; user: string; token: string }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data.token) {
      setAuthToken(data.token);
    }
    return data;
  },

  // --- DEMO ENDPOINTS ---

  getDemoMetrics: async () => {
    return request<any>('/api/demo/metrics');
  },

  runDemoPredict: async (payload: { category: string, lat: number, lng: number, amount: number }) => {
    return request<any>('/api/demo/predict', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getDemoCases: async () => {
    return request<any>('/api/demo/cases');
  },

  getDemoGraph: async (caseId: string) => {
    return request<any>(`/api/demo/graph/${caseId}`);
  },

  getDemoAtms: async () => {
    return request<any>('/api/demo/atms');
  },

  getDemoBanks: async () => {
    return request<any>('/api/demo/banks');
  },

  getAuditLogs: async () => {
    return request<any>('/api/demo/audit');
  },

  postAuditLog: async (payload: { action_category: string, target_case_ref: string, narrative: string }) => {
    return request<any>('/api/demo/audit', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // --- Legacy Endpoints ---
  getAlerts: async () => {
    return request<{ alerts: any[] }>('/api/alerts');
  },

  updateAlertStatus: async (complaintId: string, owner: string, status: string) => {
    return request<{ status: string; ack_info: any }>(`/api/alerts/${complaintId}/status`, {
      method: 'POST',
      body: JSON.stringify({ owner, status }),
    });
  },

  getMetrics: async () => {
    return request<any>('/api/metrics');
  },

  getGraphRings: async () => {
    return request<any>('/api/graph/rings');
  },

  runPipeline: async () => {
    return request<{ status: string; message: string }>('/api/pipeline/run', {
      method: 'POST',
    });
  },
};
