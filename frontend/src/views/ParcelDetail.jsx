import { X, Plus, Clock, MapPin, Building2, AlertTriangle, ChevronRight } from "lucide-react";
import CovenantCard from "../components/CovenantCard";

const OWNER_TYPE_LABELS = {
  residential: "Residential",
  commercial: "Commercial",
  industrial: "Industrial / Mixed-Use",
};

const OWNER_TYPE_COLORS = {
  residential: "bg-green-100 text-green-800",
  commercial:  "bg-blue-100 text-blue-800",
  industrial:  "bg-orange-100 text-orange-800",
};

function StatBadge({ label, value, muted }) {
  return (
    <div className={`text-center ${muted ? "opacity-50" : ""}`}>
      <div className="text-xl font-bold text-[#1B2A4A]">{value}</div>
      <div className="text-[11px] text-gray-500 leading-tight">{label}</div>
    </div>
  );
}

export default function ParcelDetail({
  parcel,
  onClose,
  onAddCovenant,
  onShowAudit,
  demoMode,
  demoStep,
}) {
  const covenants = parcel.covenants || [];
  const active = covenants.filter((c) => c.active);
  const flagged = active.filter((c) => c.flagged);
  const hasFlagged = flagged.length > 0;

  return (
    <div
      className={`absolute right-0 top-0 bottom-0 w-96 bg-white shadow-panel border-l border-gray-200 flex flex-col z-30 overflow-hidden`}
      style={{ animation: "slideInRight 0.25s ease-out" }}
    >
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

      {/* Header */}
      <div className="bg-[#1B2A4A] px-5 py-4 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-blue-200 text-[11px] font-medium tracking-widest uppercase mb-1">
              Assessor Parcel Number
            </div>
            <div className="text-white text-xl font-bold tracking-wider">{parcel.apn}</div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-300 hover:text-white transition-colors mt-0.5"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 mt-2 text-blue-200 text-sm">
          <MapPin size={12} />
          <span>{parcel.address}</span>
        </div>
        <div className="text-blue-300 text-xs ml-5">{parcel.city}, CA {parcel.zip}</div>
      </div>

      {/* Meta bar */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-4 flex-shrink-0">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            OWNER_TYPE_COLORS[parcel.owner_type] || "bg-gray-100 text-gray-700"
          }`}
        >
          <Building2 size={11} />
          {OWNER_TYPE_LABELS[parcel.owner_type] || parcel.owner_type}
        </span>
        {parcel.zoning && (
          <span className="text-xs text-gray-500">Zone {parcel.zoning}</span>
        )}
        {parcel.acreage && (
          <span className="text-xs text-gray-500">{parcel.acreage} ac</span>
        )}
      </div>

      {/* Stats */}
      <div className="px-5 py-4 grid grid-cols-3 gap-4 border-b border-gray-100 flex-shrink-0">
        <StatBadge label="Total Covenants" value={covenants.length} />
        <StatBadge label="Active" value={active.length} />
        <StatBadge label="Flagged" value={flagged.length} muted={flagged.length === 0} />
      </div>

      {hasFlagged && (
        <div className="mx-5 mt-4 flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2.5 flex-shrink-0">
          <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">
            {flagged.length} covenant{flagged.length !== 1 ? "s" : ""} on this parcel{" "}
            {flagged.length !== 1 ? "are" : "is"} flagged for administrative review.
          </p>
        </div>
      )}

      {/* Covenants list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Covenant Records
          </h3>
          <button
            id="add-covenant-btn"
            onClick={onAddCovenant}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1B2A4A] hover:bg-[#253C6B] text-white text-xs font-medium rounded-lg transition-colors ${
              demoMode && demoStep === 4 ? "demo-highlight ring-2 ring-amber-400" : ""
            }`}
          >
            <Plus size={12} />
            Submit Covenant
          </button>
        </div>

        {covenants.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-3xl mb-2">📋</div>
            <div className="text-sm">No covenants recorded for this parcel.</div>
            <div className="text-xs mt-1">Submit one for clerk review.</div>
          </div>
        ) : (
          covenants.map((c, i) => <CovenantCard key={i} covenant={c} />)
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
        <button
          id="audit-trail-btn"
          onClick={onShowAudit}
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-200 hover:border-[#4A6FA5] hover:bg-blue-50 transition-all group text-sm ${
            demoMode && demoStep === 5 ? "demo-highlight ring-2 ring-amber-400 border-amber-400" : ""
          }`}
        >
          <div className="flex items-center gap-2 text-gray-600 group-hover:text-[#1B2A4A]">
            <Clock size={14} />
            <span className="font-medium">View Audit Trail</span>
          </div>
          <div className="flex items-center gap-1 text-gray-400 group-hover:text-[#4A6FA5] text-xs">
            Tamper-proof history
            <ChevronRight size={12} />
          </div>
        </button>
      </div>
    </div>
  );
}
