const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  getParcels: () => request("/parcels"),
  getParcel: (apn) => request(`/parcels/${encodeURIComponent(apn)}`),
  searchParcels: (q) => request(`/parcels/search?q=${encodeURIComponent(q)}`),
  addCovenant: (apn, body) =>
    request(`/parcels/${encodeURIComponent(apn)}/covenant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  getAuditTrail: (apn) => request(`/audit/${encodeURIComponent(apn)}`),
  getHealth: () => request("/health"),
};
