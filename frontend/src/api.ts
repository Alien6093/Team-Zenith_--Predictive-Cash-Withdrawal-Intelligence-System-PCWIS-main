const API_BASE = `${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}/api/demo`;

export const fetchWithToken = async (endpoint: string, token: string, options: RequestInit = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...(options.headers || {})
  };
  
  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Unauthorized");
    throw new Error(`API error: ${res.statusText}`);
  }
  return res.json();
};
