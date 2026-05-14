import { ChevronRight, X, MapPin, FileText, Plus, Clock, Search } from "lucide-react";

const STEPS = [
  {
    id: 1,
    icon: Search,
    title: "Search for a parcel",
    description:
      "Use the search bar in the top-left of the map to find a parcel by APN (e.g., 154-210-01) or street address. Try searching '4th St' or 'Sausalito'.",
    position: "top-left",
  },
  {
    id: 2,
    icon: MapPin,
    title: "Select a parcel on the map",
    description:
      "Click any marker on the map to open the parcel detail panel. Blue markers have active covenants. Amber markers have items flagged for review.",
    position: "center",
  },
  {
    id: 3,
    icon: FileText,
    title: "Review existing covenants",
    description:
      "The detail panel shows all recorded covenants — with type, legal summary, date, and cryptographic verification hash. Each record is permanent.",
    position: "right",
  },
  {
    id: 4,
    icon: Plus,
    title: "Record a new covenant",
    description:
      "Click 'Add Covenant' in the parcel panel. Select a covenant type, enter a plain-English summary, and click 'Record to Secure Registry'.",
    position: "right",
  },
  {
    id: 5,
    icon: Clock,
    title: "View the audit trail",
    description:
      "Click 'Audit Trail' to see the complete, tamper-proof history of every change to this parcel — with block numbers, timestamps, and transaction hashes.",
    position: "right",
  },
];

export default function DemoOverlay({ step, onStepChange, selectedParcel, showAudit }) {
  const current = STEPS.find((s) => s.id === step) || STEPS[0];
  const Icon = current.icon;
  const isLast = step === 5;

  const positionClass = {
    "top-left": "bottom-6 left-6",
    center:     "bottom-6 left-1/2 -translate-x-1/2",
    right:      "bottom-6 right-[calc(24rem+1.5rem)]",
  }[current.position] || "bottom-6 left-6";

  return (
    <div
      className={`absolute ${positionClass} z-40 pointer-events-none`}
      style={{ maxWidth: "360px" }}
    >
      <div className="pointer-events-auto bg-[#1B2A4A] text-white rounded-xl shadow-2xl p-4 border border-blue-800">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0">
              <Icon size={14} className="text-[#1B2A4A]" />
            </div>
            <div>
              <div className="text-[10px] text-amber-300 font-semibold tracking-wider uppercase">
                Demo Step {step} of {STEPS.length}
              </div>
              <div className="font-semibold text-sm">{current.title}</div>
            </div>
          </div>
          <button
            onClick={() => onStepChange(step < STEPS.length ? step + 1 : step)}
            className="text-blue-300 hover:text-white transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <p className="text-blue-100 text-xs leading-relaxed mb-3">
          {current.description}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((s) => (
              <button
                key={s.id}
                onClick={() => onStepChange(s.id)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  s.id === step ? "bg-amber-400" : "bg-blue-700 hover:bg-blue-500"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 1 && (
              <button
                onClick={() => onStepChange(step - 1)}
                className="px-3 py-1 text-xs text-blue-200 hover:text-white transition-colors"
              >
                Back
              </button>
            )}
            {!isLast && (
              <button
                onClick={() => onStepChange(step + 1)}
                className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-[#1B2A4A] rounded-md text-xs font-semibold transition-colors flex items-center gap-1"
              >
                Next <ChevronRight size={12} />
              </button>
            )}
            {isLast && (
              <span className="px-3 py-1 bg-green-500 text-white rounded-md text-xs font-semibold">
                Tour Complete ✓
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
