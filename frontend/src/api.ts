const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('niu_token');
}

function setToken(token: string): void {
  localStorage.setItem('niu_token', token);
}

function clearToken(): void {
  localStorage.removeItem('niu_token');
}

function isLoggedIn(): boolean {
  return !!getToken();
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const resp = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
  if (resp.status === 401 && !endpoint.startsWith('/auth/')) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }
  return resp.json();
}

export async function login(
  account: string,
  password: string,
  countryCode: string = '1',
): Promise<void> {
  const resp = await apiRequest<{ success: boolean; data: { token: { access_token: string } } }>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ account, password, country_code: countryCode }),
    },
  );
  if (resp.success && resp.data?.token?.access_token) {
    setToken(resp.data.token.access_token);
  } else {
    throw new Error('Invalid login response');
  }
}

export async function getVehicles(): Promise<unknown[]> {
  const resp = await apiRequest<{ data: unknown[] }>('/vehicles');
  return resp.data || [];
}

export async function getVehicleDetail(sn: string): Promise<Record<string, unknown>> {
  const resp = await apiRequest<{ data: Record<string, unknown> }>('/vehicle/detail', {
    method: 'POST',
    body: JSON.stringify({ sn }),
  });
  return resp.data || {};
}

export async function getVehiclePosition(sn: string): Promise<Record<string, unknown>> {
  const resp = await apiRequest<{ data: Record<string, unknown> }>('/vehicle/position', {
    method: 'POST',
    body: JSON.stringify({ sn }),
  });
  return resp.data || {};
}

export async function getOverallTally(sn: string): Promise<Record<string, unknown>> {
  const resp = await apiRequest<{ data: Record<string, unknown> }>('/vehicle/tally', {
    method: 'POST',
    body: JSON.stringify({ sn }),
  });
  return resp.data || {};
}

export async function getBatteryInfo(sn: string): Promise<Record<string, unknown>> {
  const resp = await apiRequest<{ data: Record<string, unknown> }>('/vehicle/battery/info', {
    method: 'POST',
    body: JSON.stringify({ sn }),
  });
  return resp.data || {};
}

export async function getBatteryHealth(sn: string): Promise<Record<string, unknown>> {
  const resp = await apiRequest<{ data: Record<string, unknown> }>('/vehicle/battery/health', {
    method: 'POST',
    body: JSON.stringify({ sn }),
  });
  return resp.data || {};
}

export async function getBatteryChart(sn: string, page = 1, pageSize = 7): Promise<Record<string, unknown>> {
  const resp = await apiRequest<{ data: Record<string, unknown> }>('/vehicle/battery/chart', {
    method: 'POST',
    body: JSON.stringify({ sn, page, page_size: pageSize }),
  });
  return resp.data || {};
}

export async function getMotorInfo(sn: string): Promise<Record<string, unknown>> {
  const resp = await apiRequest<{ data: Record<string, unknown> }>('/vehicle/motor', {
    method: 'POST',
    body: JSON.stringify({ sn }),
  });
  return resp.data || {};
}

export async function getTracks(sn: string, page = 1, pageSize = 10): Promise<Record<string, unknown>> {
  const resp = await apiRequest<{ data: Record<string, unknown> }>('/vehicle/tracks', {
    method: 'POST',
    body: JSON.stringify({ sn, page, page_size: pageSize }),
  });
  return resp.data || {};
}

export async function getTrackDetail(sn: string, trackId: string, date = ''): Promise<Record<string, unknown>> {
  const resp = await apiRequest<{ data: Record<string, unknown> }>('/vehicle/track/detail', {
    method: 'POST',
    body: JSON.stringify({ sn, track_id: trackId, date }),
  });
  return resp.data || {};
}

export async function getFirmwareVersion(sn: string): Promise<Record<string, unknown>> {
  const resp = await apiRequest<{ data: Record<string, unknown> }>('/vehicle/firmware', {
    method: 'POST',
    body: JSON.stringify({ sn }),
  });
  return resp.data || {};
}

export async function getUpdateInfo(sn: string): Promise<Record<string, unknown>> {
  const resp = await apiRequest<{ data: Record<string, unknown> }>('/vehicle/update-info', {
    method: 'POST',
    body: JSON.stringify({ sn }),
  });
  return resp.data || {};
}

export { isLoggedIn, clearToken };
