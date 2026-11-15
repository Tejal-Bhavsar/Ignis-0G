const API_BASE = import.meta.env.VITE_API_BASE || '';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  health: () => request('/api/health'),
  studies: () => request('/api/studies'),
  hardware: () => request('/api/hardware'),
  rank: (payload) => request('/api/rank', { method: 'POST', body: JSON.stringify(payload) }),
  simulate: (payload) => request('/api/simulate', { method: 'POST', body: JSON.stringify(payload) }),
  compare: (studyIds) => request('/api/compare', { method: 'POST', body: JSON.stringify({ study_ids: studyIds }) }),
  ask: (payload) => request('/api/ask', { method: 'POST', body: JSON.stringify(payload) }),
  detectionSuppression: () => request('/api/detection-suppression'),
  spinoffs: () => request('/api/spinoffs'),
  briefingContext: () => request('/api/briefing-context'),
};

