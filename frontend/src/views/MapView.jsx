import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { Search, X, Loader2 } from "lucide-react";
import { api } from "../api";

// Marin County center coordinates
const MARIN_CENTER = [37.954, -122.552];
const MARIN_ZOOM = 11;

function markerColor(parcel) {
  if (parcel.flagged_count > 0) return "#F59E0B";
  if (parcel.active_covenant_count > 0) return "#4A6FA5";
  return "#9CA3AF";
}

function FlyToParcel({ parcel }) {
  const map = useMap();
  useEffect(() => {
    if (parcel) map.flyTo([parcel.lat, parcel.lng], 14, { duration: 1 });
  }, [parcel, map]);
  return null;
}

function SearchBar({ parcels, onSelect, demoMode, demoStep, onDemoStepChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.searchParcels(query);
        setResults(data.slice(0, 8));
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
  }, [query]);

  function handleSelect(parcel) {
    setQuery(`${parcel.apn} — ${parcel.address}`);
    setOpen(false);
    onSelect(parcel);
    if (demoMode && demoStep === 1) onDemoStepChange(2);
  }

  return (
    <div
      id="search-bar"
      className={`absolute top-4 left-4 z-40 w-80 ${
        demoMode && demoStep === 1 ? "demo-highlight ring-2 ring-amber-400 rounded-lg" : ""
      }`}
    >
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search APN or address…"
          className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg shadow-panel text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A6FA5] focus:border-transparent"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-panel overflow-hidden">
          {results.map((p) => (
            <button
              key={p.apn}
              onClick={() => handleSelect(p)}
              className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
            >
              <div className="text-sm font-medium text-gray-800">{p.apn}</div>
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <span>{p.address}, {p.city}</span>
                {p.active_covenant_count > 0 && (
                  <span className="text-[#4A6FA5]">
                    {p.active_covenant_count} covenant{p.active_covenant_count !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="absolute bottom-8 left-4 z-40 bg-white border border-gray-200 rounded-lg shadow-panel px-3 py-2.5">
      <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5">
        Covenant Status
      </div>
      {[
        { color: "#9CA3AF", label: "No covenants" },
        { color: "#4A6FA5", label: "Active covenants" },
        { color: "#F59E0B", label: "Flagged for review" },
      ].map(({ color, label }) => (
        <div key={label} className="flex items-center gap-2 text-xs text-gray-700 mb-1 last:mb-0">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          {label}
        </div>
      ))}
    </div>
  );
}

export default function MapView({
  parcels,
  setParcels,
  selectedParcel,
  onParcelSelect,
  demoMode,
  demoStep,
  onDemoStepChange,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .getParcels()
      .then((data) => {
        setParcels(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [setParcels]);

  const handleSearchSelect = useCallback(
    async (parcelSummary) => {
      try {
        const full = await api.getParcel(parcelSummary.apn);
        onParcelSelect(full);
      } catch {
        onParcelSelect(parcelSummary);
      }
    },
    [onParcelSelect]
  );

  const handleMarkerClick = useCallback(
    async (parcelSummary) => {
      try {
        const full = await api.getParcel(parcelSummary.apn);
        onParcelSelect(full);
        if (demoMode && demoStep === 2) onDemoStepChange(3);
      } catch {
        onParcelSelect(parcelSummary);
      }
    },
    [onParcelSelect, demoMode, demoStep, onDemoStepChange]
  );

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={MARIN_CENTER}
        zoom={MARIN_ZOOM}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {parcels.map((p) => {
          const color = markerColor(p);
          const isSelected = selectedParcel?.apn === p.apn;
          return (
            <CircleMarker
              key={p.apn}
              center={[p.lat, p.lng]}
              radius={isSelected ? 10 : 7}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.9,
                color: isSelected ? "#1B2A4A" : "white",
                weight: isSelected ? 2.5 : 1.5,
              }}
              eventHandlers={{ click: () => handleMarkerClick(p) }}
            >
              <Popup>
                <div className="min-w-[160px]">
                  <div className="font-semibold text-gray-900">{p.apn}</div>
                  <div className="text-gray-600 text-xs mt-0.5">{p.address}</div>
                  <div className="text-gray-500 text-xs">{p.city}, CA {p.zip}</div>
                  {p.active_covenant_count > 0 && (
                    <div className="mt-1.5 text-xs font-medium text-[#4A6FA5]">
                      {p.active_covenant_count} active covenant{p.active_covenant_count !== 1 ? "s" : ""}
                    </div>
                  )}
                  <button
                    className="mt-2 text-xs text-white bg-[#1B2A4A] hover:bg-[#253C6B] px-2.5 py-1 rounded transition-colors"
                    onClick={() => handleMarkerClick(p)}
                  >
                    View Record
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {selectedParcel && <FlyToParcel parcel={selectedParcel} />}
      </MapContainer>

      <SearchBar
        parcels={parcels}
        onSelect={handleSearchSelect}
        demoMode={demoMode}
        demoStep={demoStep}
        onDemoStepChange={onDemoStepChange}
      />

      <Legend />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-50">
          <div className="flex items-center gap-2 bg-white shadow-panel rounded-lg px-4 py-3">
            <Loader2 size={16} className="animate-spin text-[#4A6FA5]" />
            <span className="text-sm text-gray-600">Loading registry…</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700 shadow">
          Failed to load parcel data: {error}
        </div>
      )}
    </div>
  );
}
