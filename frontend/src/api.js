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
  searchParcels: ({ q = "", covenantType = "" } = {}) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (covenantType) params.set("covenant_type", covenantType);
    return request(`/parcels/search?${params}`);
  },
  addCovenant: (apn, body) =>
    request(`/parcels/${encodeURIComponent(apn)}/covenant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  getSubmissions: (apn) => request(`/parcels/${encodeURIComponent(apn)}/submissions`),
  createSubmission: (apn, body) =>
    request(`/parcels/${encodeURIComponent(apn)}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  reviewSubmission: (apn, id, body) =>
    request(`/parcels/${encodeURIComponent(apn)}/submissions/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  recordSubmission: (apn, id, body = {}) =>
    request(`/parcels/${encodeURIComponent(apn)}/submissions/${id}/record`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  getAuditTrail: (apn) => request(`/audit/${encodeURIComponent(apn)}`),
  submitLead: (body) =>
    request("/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  exportPdf: (apn) => `/api/parcels/${encodeURIComponent(apn)}/export.pdf`,
  getHealth: () => request("/health"),
};
