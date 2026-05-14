import { useState } from "react";
import { X, Shield, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { api } from "../api";

const COVENANT_TYPES = [
  "Housing Density Floor",
  "Transit Corridor Restriction",
  "Water Rights Covenant",
  "Infrastructure Easement",
  "Conservation Easement",
];

function shortTx(hash) {
  if (!hash) return null;
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

export default function AddCovenantModal({ parcel, onClose, onSuccess }) {
  const [form, setForm] = useState({
    covenantType: "",
    legalText: "",
    legalReference: "",
  });
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.covenantType || !form.legalText.trim()) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const data = await api.addCovenant(parcel.apn, {
        covenantType: form.covenantType,
        legalText: form.legalText.trim(),
        legalReference: form.legalReference.trim() || undefined,
      });
      setResult(data);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err.message || "Recording failed. Please try again.");
      setStatus("error");
    }
  }

  const isValid = form.covenantType && form.legalText.trim().length > 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-[#1B2A4A] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">Record New Covenant</h2>
            <p className="text-blue-200 text-xs mt-0.5">
              APN {parcel.apn} · {parcel.address}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-blue-300 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {status === "success" ? (
          <SuccessView result={result} parcel={parcel} onClose={() => onSuccess(result)} />
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Covenant Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Covenant Type <span className="text-red-500">*</span>
              </label>
              <select
                name="covenantType"
                value={form.covenantType}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4A6FA5] focus:border-transparent bg-white"
              >
                <option value="">Select a covenant type…</option>
                {COVENANT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Legal Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Plain-English Summary <span className="text-red-500">*</span>
              </label>
              <textarea
                name="legalText"
                value={form.legalText}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Describe the covenant obligation in plain language. This becomes the permanent, publicly-accessible record."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4A6FA5] focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                {form.legalText.length} characters
              </p>
            </div>

            {/* Legal Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Legal Reference{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                name="legalReference"
                value={form.legalReference}
                onChange={handleChange}
                placeholder="e.g. CA Gov Code §65583, Marin County Code §22.52"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4A6FA5] focus:border-transparent"
              />
            </div>

            {status === "error" && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{errorMsg}</p>
              </div>
            )}

            {/* Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <Shield size={14} className="text-[#4A6FA5] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#253C6B] leading-relaxed">
                This record will be cryptographically secured and permanently
                immutable. Once recorded, the covenant cannot be altered or
                deleted. Deactivation is possible but the original record
                remains in the audit trail.
              </p>
            </div>

            <button
              type="submit"
              disabled={!isValid || status === "submitting"}
              className={`w-full py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                !isValid || status === "submitting"
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-[#1B2A4A] hover:bg-[#253C6B] text-white shadow-sm hover:shadow"
              }`}
            >
              {status === "submitting" ? (
                <>
                  <Spinner />
                  Recording to Secure Registry…
                </>
              ) : (
                <>
                  <Shield size={15} />
                  Record to Secure Registry
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function SuccessView({ result, parcel, onClose }) {
  return (
    <div className="p-6">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-3">
          <CheckCircle size={28} className="text-green-600" />
        </div>
        <h3 className="font-semibold text-gray-900 text-lg">
          Covenant Recorded Successfully
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          The record is now permanently secured and publicly verifiable.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3 mb-6 font-mono text-xs">
        {result.txHash && (
          <div>
            <div className="text-gray-400 font-sans font-medium mb-0.5">Transaction Hash</div>
            <div className="text-gray-800 break-all">{result.txHash}</div>
          </div>
        )}
        {result.blockNumber && (
          <div>
            <div className="text-gray-400 font-sans font-medium mb-0.5">Block Number</div>
            <div className="text-gray-800">#{result.blockNumber}</div>
          </div>
        )}
        <div>
          <div className="text-gray-400 font-sans font-medium mb-0.5">Record Hash (SHA-256)</div>
          <div className="text-gray-800 break-all">{result.ipfsHash}</div>
        </div>
        <div>
          <div className="text-gray-400 font-sans font-medium mb-0.5">Recorded At</div>
          <div className="text-gray-800 font-sans">
            {new Date(result.blockTimestamp).toLocaleString()}
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full py-3 bg-[#1B2A4A] hover:bg-[#253C6B] text-white rounded-lg font-semibold text-sm transition-colors"
      >
        View Updated Record
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
