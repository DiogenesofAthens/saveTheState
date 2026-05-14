import { useState } from "react";
import { Info, SlidersHorizontal } from "lucide-react";

function SealIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="13" stroke="#7B9DCB" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="9" stroke="#7B9DCB" strokeWidth="1" />
      <path
        d="M14 5L15.76 10.42H21.47L16.85 13.76L18.61 19.18L14 15.84L9.39 19.18L11.15 13.76L6.53 10.42H12.24L14 5Z"
        fill="#7B9DCB"
        opacity="0.7"
      />
    </svg>
  );
}

export default function Navbar({ demoMode, onToggleDemoMode, demoStep, filterPanelOpen, onToggleFilterPanel }) {
  const [showBlockchainInfo, setShowBlockchainInfo] = useState(false);

  return (
    <header className="bg-[#1B2A4A] text-white px-6 py-3 flex items-center justify-between z-50 shadow-md flex-shrink-0">
      <div className="flex items-center gap-3">
        <SealIcon />
        <div>
          <div className="font-semibold text-base tracking-wide leading-tight">
            Sovereign District
          </div>
          <div className="text-[11px] text-blue-200 tracking-widest uppercase leading-tight">
            Parcel Covenant Registry
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5 text-sm">
        <button
          onClick={onToggleFilterPanel}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
            filterPanelOpen
              ? "bg-[#4A6FA5] text-white"
              : "text-blue-200 hover:text-white hover:bg-[#253C6B]"
          }`}
        >
          <SlidersHorizontal size={13} />
          Browse All
        </button>
        <div className="flex items-center gap-1.5 text-blue-200">
          <span className="text-xs">Marin County, CA</span>
          <span className="text-blue-400">·</span>
          <span className="text-xs">Public Registry</span>

          <button
            onClick={() => setShowBlockchainInfo(!showBlockchainInfo)}
            className="ml-1 text-blue-300 hover:text-white transition-colors relative"
            title="About record security"
          >
            <Info size={13} />
            {showBlockchainInfo && (
              <div
                className="absolute right-0 top-6 bg-white text-gray-700 rounded-lg shadow-xl p-3 w-72 text-left text-xs leading-relaxed z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="font-semibold text-gray-900 mb-1">Cryptographically Secured Records</div>
                <p>
                  Each covenant recorded in this registry is anchored to a
                  public <span className="font-medium text-[#1B2A4A]">blockchain</span>,
                  making it cryptographically secured and tamper-proof. Once
                  recorded, no party — including the county — can alter or
                  delete a covenant record. The original entry is permanent.
                </p>
              </div>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 bg-[#253C6B] rounded-full px-3 py-1.5">
          <span className={`text-xs font-medium ${demoMode ? "text-amber-300" : "text-blue-200"}`}>
            Demo Mode
          </span>
          <button
            onClick={onToggleDemoMode}
            className={`relative w-9 h-5 rounded-full transition-colors focus:outline-none ${
              demoMode ? "bg-amber-400" : "bg-[#1B2A4A] border border-blue-600"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                demoMode ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
          {demoMode && (
            <span className="text-[10px] text-amber-300 font-medium ml-0.5">
              Step {demoStep}/5
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
