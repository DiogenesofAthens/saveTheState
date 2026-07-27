import { useEffect, useState } from "react";
import {
  ArrowLeft,
  X,
  Shield,
  Plus,
  MinusCircle,
  Anchor,
  ExternalLink,
  Loader2,
  AlertCircle,
  Download,
  FileText,
} from "lucide-react";
import { api } from "../api";

const EVENT_CONFIG = {
  ParcelMinted: {
    icon: Anchor,
    label: "Parcel Registered",
    color: "text-[#4A6FA5]",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "#4A6FA5",
  },
  CovenantAdded: {
    icon: Plus,
    label: "Covenant Added",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
    dot: "#10B981",
  },
  CovenantSubmitted: {
    icon: FileText,
    label: "Submission Received",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "#3B82F6",
  },
  CovenantApproved: {
    icon: Shield,
    label: "Submission Approved",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
    dot: "#10B981",
  },
  CovenantRejected: {
    icon: AlertCircle,
    label: "Submission Rejected",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "#EF4444",
  },
  CovenantDeactivated: {
    icon: MinusCircle,
    label: "Covenant Deactivated",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "#EF4444",
  },
};

function formatTs(ts) {
  if (!ts) return "Unknown date";
  try {
    return new Date(ts).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return ts;
  }
}

function shortAddr(addr) {
  if (!addr || addr.length < 10) return addr;
  if (!addr.startsWith("0x")) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function shortTx(hash) {
  if (!hash) return null;
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

function parseDetails(detailsStr) {
  try {
    return JSON.parse(detailsStr || "{}");
  } catch {
    return {};
  }
}

function EventRow({ event, isLast }) {
  const config = EVENT_CONFIG[event.event_type] || {
    icon: Shield,
    label: event.event_type,
    color: "text-gray-700",
    bg: "bg-gray-50",
    border: "border-gray-200",
    dot: "#9CA3AF",
  };
  const Icon = config.icon;
  const details = parseDetails(event.details);

  const explorerUrl = event.tx_hash
    ? `https://sepolia.basescan.org/tx/${event.tx_hash}`
    : null;

  return (
    <div className="flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${config.bg} ${config.border}`}
        >
          <Icon size={14} className={config.color} />
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-gray-200 mt-1" style={{ minHeight: "24px" }} />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 mb-6 pb-1`}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
          {event.block_number && (
            <span className="text-xs text-gray-400 font-mono flex-shrink-0">
              Block #{event.block_number.toLocaleString()}
            </span>
          )}
        </div>

        {details.covenantType && (
          <p className="text-xs text-gray-600 mb-1">
            Type: <span className="font-medium">{details.covenantType}</span>
          </p>
        )}
        {details.covenantIndex !== undefined && (
          <p className="text-xs text-gray-600 mb-1">
            Covenant index: <span className="font-mono">{details.covenantIndex}</span>
          </p>
        )}
        {details.documentHash && (
          <p className="text-xs text-gray-600 mb-1">
            Document hash: <span className="font-mono">{shortTx(details.documentHash)}</span>
          </p>
        )}
        {details.status && (
          <p className="text-xs text-gray-600 mb-1">
            Status: <span className="font-medium">{details.status}</span>
          </p>
        )}
        {details.intakeAssistance?.assisted && (
          <p className="text-xs text-gray-600 mb-1">
            Intake: <span className="font-medium">Copilot-assisted</span>
            {Number.isFinite(details.intakeAssistance.overallConfidence)
              ? ` · ${Math.round(details.intakeAssistance.overallConfidence * 100)}% draft confidence`
              : ""}
            {details.intakeAssistance.draftApplied ? " · reviewed draft applied" : ""}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 mt-2">
          <span>{formatTs(event.block_timestamp)}</span>

          {event.actor && (
            <span className="font-mono">
              By: {shortAddr(event.actor)}
            </span>
          )}

          {event.tx_hash && (
            <span className="font-mono flex items-center gap-1">
              TX: {shortTx(event.tx_hash)}
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4A6FA5] hover:text-[#253C6B] transition-colors"
                  title="View on block explorer"
                >
                  <ExternalLink size={10} />
                </a>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuditTrail({ parcel, onBack, onClose }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .getAuditTrail(parcel.apn)
      .then((data) => {
        setEvents(data.events || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [parcel.apn]);

  return (
    <div
      className="absolute right-0 top-0 bottom-0 w-96 bg-white shadow-panel border-l border-gray-200 flex flex-col z-30"
      style={{ animation: "slideInRight 0.25s ease-out" }}
    >
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

      {/* Header */}
      <div className="bg-[#1B2A4A] px-5 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="text-blue-300 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="text-blue-200 text-[10px] font-medium tracking-widest uppercase">
                Immutable Audit Trail
              </div>
              <div className="text-white font-semibold">{parcel.apn}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={api.exportPdf(parcel.apn)}
              download
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-[#253C6B] hover:bg-[#4A6FA5] text-blue-200 hover:text-white transition-colors"
              title="Download PDF record"
            >
              <Download size={12} />
              Export PDF
            </a>
            <button onClick={onClose} className="text-blue-300 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Trust badge */}
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-start gap-2 flex-shrink-0">
        <Shield size={13} className="text-[#4A6FA5] mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-600 leading-relaxed">
          Every entry below is sourced directly from the cryptographic record and cannot
          be modified or removed. This is the authoritative history for{" "}
          <span className="font-medium">{parcel.address}</span>.
        </p>
      </div>

      {/* Event count */}
      {!loading && !error && (
        <div className="px-5 py-2 border-b border-gray-100 flex-shrink-0">
          <span className="text-xs text-gray-500">
            {events.length} event{events.length !== 1 ? "s" : ""} recorded
          </span>
        </div>
      )}

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-5 pt-5">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-[#4A6FA5]" />
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-2xl mb-2">📭</div>
            <div className="text-sm">No events recorded yet.</div>
          </div>
        )}

        {!loading && !error && events.map((event, i) => (
          <EventRow
            key={event.id || i}
            event={event}
            isLast={i === events.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
