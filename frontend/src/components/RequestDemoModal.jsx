import { useState } from "react";
import { AlertCircle, CheckCircle, Landmark, Loader2, X } from "lucide-react";
import { api } from "../api";

export default function RequestDemoModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [county, setCounty] = useState("");
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || status === "submitting") return;

    setStatus("submitting");
    setErrorMsg("");
    try {
      await api.submitLead({ email: email.trim(), county: county.trim() });
      setStatus("success");
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-[#1B2A4A] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark size={18} className="text-blue-200" />
            <h2 className="text-white font-semibold">Bring This to Your County</h2>
          </div>
          <button onClick={onClose} className="text-blue-300 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {status === "success" ? (
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <CheckCircle size={28} className="text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Request received</h3>
            <p className="text-sm text-gray-500 mt-1 mb-6">
              We&apos;ll reach out to schedule a walkthrough for your team.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 bg-[#1B2A4A] hover:bg-[#253C6B] text-white rounded-lg font-semibold text-sm transition-colors"
            >
              Back to the Registry
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              A tamper-proof, publicly verifiable registry for your county&apos;s land
              records — request a guided demo for your recorder or planning team.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Work Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="clerk@county.gov"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                County / Organization <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                placeholder="e.g. Marin County Recorder's Office"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
              />
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{errorMsg}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 bg-[#1B2A4A] hover:bg-[#253C6B] text-white disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {status === "submitting" ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Submitting…
                </>
              ) : (
                "Request a Demo"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
