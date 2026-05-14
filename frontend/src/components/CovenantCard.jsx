import { Shield, AlertTriangle, Clock, Hash } from "lucide-react";

const TYPE_STYLES = {
  "Housing Density Floor":       "bg-blue-50 text-blue-800 border-blue-200",
  "Transit Corridor Restriction":"bg-purple-50 text-purple-800 border-purple-200",
  "Water Rights Covenant":       "bg-teal-50 text-teal-800 border-teal-200",
  "Infrastructure Easement":     "bg-green-50 text-green-800 border-green-200",
  "Conservation Easement":       "bg-emerald-50 text-emerald-800 border-emerald-200",
};

function formatDate(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return ts;
  }
}

function shortHash(h) {
  if (!h) return "—";
  return h.length > 12 ? `${h.slice(0, 8)}…${h.slice(-4)}` : h;
}

export default function CovenantCard({ covenant }) {
  const badgeClass =
    TYPE_STYLES[covenant.covenant_type] ||
    "bg-gray-50 text-gray-700 border-gray-200";

  const isInactive = !covenant.active;
  const isFlagged = covenant.flagged && covenant.active;

  return (
    <div
      className={`rounded-lg border p-4 transition-all ${
        isInactive
          ? "bg-gray-50 border-gray-200 opacity-60"
          : isFlagged
          ? "bg-amber-50 border-amber-300"
          : "bg-white border-gray-200 hover:border-[#4A6FA5] hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}
        >
          <Shield size={10} />
          {covenant.covenant_type}
        </span>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isFlagged && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium border border-amber-300">
              <AlertTriangle size={10} />
              Under Review
            </span>
          )}
          {isInactive && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium border border-gray-200">
              Deactivated
            </span>
          )}
        </div>
      </div>

      <p className={`text-sm leading-relaxed mb-3 ${isInactive ? "text-gray-400" : "text-gray-700"}`}>
        {covenant.legal_text}
      </p>

      {covenant.legal_reference && (
        <p className="text-xs text-[#4A6FA5] font-medium mb-2">
          {covenant.legal_reference}
        </p>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-400 border-t border-gray-100 pt-2 mt-2">
        <span className="flex items-center gap-1">
          <Clock size={10} />
          {formatDate(covenant.block_timestamp || covenant.created_at)}
        </span>
        <span className="flex items-center gap-1 font-mono">
          <Hash size={10} />
          {shortHash(covenant.ipfs_hash)}
        </span>
        {covenant.tx_hash && (
          <span className="flex items-center gap-1 text-green-600">
            <Shield size={9} />
            Secured
          </span>
        )}
      </div>
    </div>
  );
}
