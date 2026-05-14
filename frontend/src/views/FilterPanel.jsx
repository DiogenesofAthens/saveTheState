import { useState, useEffect, useRef } from "react";
import { X, Search, Loader2, AlertTriangle } from "lucide-react";
import { api } from "../api";

const COVENANT_TYPES = [
  "Conservation Easement",
  "Water Rights Covenant",
  "Transit Corridor Restriction",
  "Housing Density Floor",
  "Infrastructure Easement",
];

const OWNER_TYPES = [
  { value: "residential", label: "Residential" },
  { value: "commercial",  label: "Commercial"  },
  { value: "industrial",  label: "Industrial"  },
];

function markerColor(p) {
  if (p.flagged_count > 0)         return "#F59E0B";
  if (p.active_covenant_count > 0) return "#4A6FA5";
  return "#9CA3AF";
}

function Chip({ label, active, color = "navy", onClick }) {
  const activeClass =
    color === "amber"
      ? "bg-amber-500 text-white border-amber-500"
      : color === "slate"
      ? "bg-[#4A6FA5] text-white border-[#4A6FA5]"
      : "bg-[#1B2A4A] text-white border-[#1B2A4A]";
  return (
    <button
      onClick={onClick}
      className={`text-[11px] px-2 py-1 rounded-full border transition-colors whitespace-nowrap ${
        active
          ? activeClass
          : "bg-white text-gray-600 border-gray-200 hover:border-[#4A6FA5]"
      }`}
    >
      {label}
    </button>
  );
}

export default function FilterPanel({ parcels, onParcelSelect, onClose }) {
  const [query, setQuery]                   = useState("");
  const [covenantType, setCovenantType]     = useState("");
  const [ownerType, setOwnerType]           = useState("");
  const [onlyFlagged, setOnlyFlagged]       = useState(false);
  const [onlyWithCovenants, setWithCovs]    = useState(false);
  const [results, setResults]               = useState(parcels);
  const [loading, setLoading]               = useState(false);
  const timeoutRef                          = useRef(null);

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    const needsApi = !!(query.trim() || covenantType);

    function applyClientFilters(list) {
      let out = list;
      if (ownerType)         out = out.filter((p) => p.owner_type === ownerType);
      if (onlyFlagged)       out = out.filter((p) => p.flagged_count > 0);
      if (onlyWithCovenants) out = out.filter((p) => p.active_covenant_count > 0);
      return out;
    }

    if (!needsApi) {
      setResults(applyClientFilters(parcels));
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.searchParcels({ q: query, covenantType });
        setResults(applyClientFilters(data));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timeoutRef.current);
  }, [query, covenantType, ownerType, onlyFlagged, onlyWithCovenants, parcels]);

  async function handleSelect(parcel) {
    try {
      const full = await api.getParcel(parcel.apn);
      onParcelSelect(full);
    } catch {
      onParcelSelect(parcel);
    }
    onClose();
  }

  function clearAll() {
    setQuery("");
    setCovenantType("");
    setOwnerType("");
    setOnlyFlagged(false);
    setWithCovs(false);
  }

  const hasFilters = query || covenantType || ownerType || onlyFlagged || onlyWithCovenants;

  return (
    <div
      className="absolute left-0 top-0 bottom-0 w-80 bg-white shadow-panel border-r border-gray-200 flex flex-col z-30 overflow-hidden"
      style={{ animation: "slideInLeft 0.25s ease-out" }}
    >
      <style>{`@keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>

      {/* Header */}
      <div className="bg-[#1B2A4A] px-5 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-blue-200 text-[11px] font-medium tracking-widest uppercase mb-0.5">
              Registry
            </div>
            <div className="text-white text-lg font-semibold">Browse Parcels</div>
          </div>
          <button onClick={onClose} className="text-blue-300 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Search input */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search APN, address, or covenant…"
            className="w-full pl-8 pr-7 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A6FA5] focus:border-transparent"
          />
          {(query || loading) && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 pb-3 space-y-3 flex-shrink-0 border-b border-gray-100">
        <div>
          <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5">
            Covenant Type
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COVENANT_TYPES.map((t) => (
              <Chip
                key={t}
                label={t}
                active={covenantType === t}
                color="navy"
                onClick={() => setCovenantType(covenantType === t ? "" : t)}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5">
            Owner Type &amp; Status
          </div>
          <div className="flex flex-wrap gap-1.5">
            {OWNER_TYPES.map(({ value, label }) => (
              <Chip
                key={value}
                label={label}
                active={ownerType === value}
                color="slate"
                onClick={() => setOwnerType(ownerType === value ? "" : value)}
              />
            ))}
            <Chip
              label="Flagged"
              active={onlyFlagged}
              color="amber"
              onClick={() => setOnlyFlagged((v) => !v)}
            />
            <Chip
              label="Has Covenants"
              active={onlyWithCovenants}
              color="slate"
              onClick={() => setWithCovs((v) => !v)}
            />
          </div>
        </div>

        {hasFilters && (
          <button onClick={clearAll} className="text-xs text-[#4A6FA5] hover:underline">
            Clear all filters
          </button>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 text-[11px] text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-50 sticky top-0 bg-white">
          {loading ? "Searching…" : `${results.length} parcel${results.length !== 1 ? "s" : ""}`}
        </div>

        {!loading && results.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-2xl mb-2">🔍</div>
            <div className="text-sm">No parcels match these filters.</div>
          </div>
        )}

        {results.map((p) => (
          <button
            key={p.apn}
            onClick={() => handleSelect(p)}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors group"
          >
            <div className="flex items-start gap-2.5">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-[3px]"
                style={{ backgroundColor: markerColor(p) }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800 group-hover:text-[#1B2A4A]">
                  {p.apn}
                </div>
                <div className="text-xs text-gray-500 truncate">{p.address}</div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {p.active_covenant_count > 0 && (
                    <span className="text-[11px] text-[#4A6FA5] font-medium">
                      {p.active_covenant_count} covenant{p.active_covenant_count !== 1 ? "s" : ""}
                    </span>
                  )}
                  {p.flagged_count > 0 && (
                    <span className="text-[11px] text-amber-600 font-medium flex items-center gap-0.5">
                      <AlertTriangle size={10} />
                      {p.flagged_count} flagged
                    </span>
                  )}
                  {p.owner_type && (
                    <span className="text-[11px] text-gray-400 capitalize">{p.owner_type}</span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
