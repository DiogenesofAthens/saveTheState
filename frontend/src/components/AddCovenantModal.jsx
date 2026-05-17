import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  ClipboardCheck,
  FileText,
  Hash,
  Loader2,
  Shield,
  Upload,
  X,
} from "lucide-react";
import { api } from "../api";

const COVENANT_TYPES = [
  "Housing Density Floor",
  "Transit Corridor Restriction",
  "Water Rights Covenant",
  "Infrastructure Easement",
  "Conservation Easement",
];

const STATUS_STYLES = {
  Submitted: "bg-blue-50 text-blue-800 border-blue-200",
  Approved: "bg-green-50 text-green-800 border-green-200",
  Recorded: "bg-slate-100 text-slate-800 border-slate-300",
  Rejected: "bg-red-50 text-red-800 border-red-200",
};

function formatDate(ts) {
  if (!ts) return null;
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function shortHash(hash) {
  if (!hash) return "Pending";
  return `${hash.slice(0, 12)}…${hash.slice(-8)}`;
}

function bytesToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

async function fileToDocument(file) {
  if (!file) return null;
  const buffer = await file.arrayBuffer();
  return {
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    contentBase64: bytesToBase64(buffer),
  };
}

export default function AddCovenantModal({ parcel, onClose, onSuccess }) {
  const [form, setForm] = useState({
    covenantType: "",
    legalText: "",
    legalReference: "",
    submitterName: "Marin County Planning",
    submitterType: "County Department",
  });
  const [documentFile, setDocumentFile] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [activeSubmission, setActiveSubmission] = useState(null);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [recordResult, setRecordResult] = useState(null);

  useEffect(() => {
    setLoadingQueue(true);
    api
      .getSubmissions(parcel.apn)
      .then((data) => {
        setSubmissions(data.submissions || []);
        setActiveSubmission((data.submissions || [])[0] || null);
      })
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setLoadingQueue(false));
  }, [parcel.apn]);

  const pendingCount = useMemo(
    () => submissions.filter((s) => s.status === "Submitted" || s.status === "Approved").length,
    [submissions]
  );

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function upsertSubmission(submission) {
    setSubmissions((prev) => {
      const exists = prev.some((s) => s.id === submission.id);
      if (exists) return prev.map((s) => (s.id === submission.id ? submission : s));
      return [submission, ...prev];
    });
    setActiveSubmission(submission);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.covenantType || !form.legalText.trim()) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const document = await fileToDocument(documentFile);
      const data = await api.createSubmission(parcel.apn, {
        covenantType: form.covenantType,
        legalText: form.legalText.trim(),
        legalReference: form.legalReference.trim() || undefined,
        submitterName: form.submitterName.trim() || undefined,
        submitterType: form.submitterType.trim() || undefined,
        document,
      });
      upsertSubmission(data.submission);
      setStatus("idle");
    } catch (err) {
      setErrorMsg(err.message || "Submission failed. Please try again.");
      setStatus("error");
    }
  }

  async function handleReview(action) {
    if (!activeSubmission) return;
    setStatus(action === "approve" ? "approving" : "rejecting");
    setErrorMsg("");

    try {
      const data = await api.reviewSubmission(parcel.apn, activeSubmission.id, {
        action,
        reviewerName: "County Clerk",
        rejectionReason: action === "reject" ? "Document requires corrected legal reference." : undefined,
      });
      upsertSubmission(data.submission);
      setStatus("idle");
    } catch (err) {
      setErrorMsg(err.message || "Review failed. Please try again.");
      setStatus("error");
    }
  }

  async function handleRecord() {
    if (!activeSubmission) return;
    setStatus("recording");
    setErrorMsg("");

    try {
      const data = await api.recordSubmission(parcel.apn, activeSubmission.id, {
        recorderName: "County Recorder",
      });
      setRecordResult(data);
      upsertSubmission(data.submission);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err.message || "Recording failed. Please try again.");
      setStatus("error");
    }
  }

  const isValid = form.covenantType && form.legalText.trim().length > 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl mx-4 overflow-hidden">
        <div className="bg-[#1B2A4A] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">Covenant Intake Review</h2>
            <p className="text-blue-200 text-xs mt-0.5">
              APN {parcel.apn} · {parcel.address}
            </p>
          </div>
          <button onClick={onClose} className="text-blue-300 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {status === "success" ? (
          <SuccessView result={recordResult} onClose={() => onSuccess(recordResult)} />
        ) : (
          <div className="grid md:grid-cols-[1.05fr_0.95fr] max-h-[78vh] overflow-hidden">
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto border-r border-gray-100">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <FileText size={16} className="text-[#4A6FA5]" />
                New Submission
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Submitter
                  </label>
                  <input
                    name="submitterName"
                    value={form.submitterName}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Submitter Type
                  </label>
                  <input
                    name="submitterType"
                    value={form.submitterType}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Covenant Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="covenantType"
                  value={form.covenantType}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4A6FA5] bg-white"
                >
                  <option value="">Select a covenant type…</option>
                  {COVENANT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Plain-English Summary <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="legalText"
                  value={form.legalText}
                  onChange={handleChange}
                  required
                  rows={5}
                  placeholder="Describe the covenant obligation in plain language."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4A6FA5] resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{form.legalText.length} characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Legal Reference <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  name="legalReference"
                  value={form.legalReference}
                  onChange={handleChange}
                  placeholder="e.g. CA Gov Code §65583, Marin County Code §22.52"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
                />
              </div>

              <label className="block border border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-[#4A6FA5] hover:bg-blue-50 transition-colors">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain"
                  onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                />
                <div className="flex items-start gap-3">
                  <Upload size={18} className="text-[#4A6FA5] mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-800">
                      {documentFile ? documentFile.name : "Attach covenant document"}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      The server stores document metadata and a SHA-256 fingerprint.
                    </div>
                  </div>
                </div>
              </label>

              {errorMsg && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{errorMsg}</p>
                </div>
              )}

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
                    <Loader2 size={15} className="animate-spin" />
                    Submitting for Review…
                  </>
                ) : (
                  <>
                    <ClipboardCheck size={15} />
                    Submit for Clerk Review
                  </>
                )}
              </button>
            </form>

            <div className="p-6 overflow-y-auto bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm font-semibold text-gray-800">Review Queue</div>
                  <div className="text-xs text-gray-500">{pendingCount} pending action</div>
                </div>
                {loadingQueue && <Loader2 size={16} className="animate-spin text-[#4A6FA5]" />}
              </div>

              {submissions.length === 0 && !loadingQueue ? (
                <div className="border border-gray-200 rounded-lg bg-white p-6 text-center text-sm text-gray-500">
                  No submissions for this parcel yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {submissions.map((submission) => (
                    <button
                      type="button"
                      key={submission.id}
                      onClick={() => setActiveSubmission(submission)}
                      className={`w-full text-left rounded-lg border p-3 bg-white transition-colors ${
                        activeSubmission?.id === submission.id
                          ? "border-[#4A6FA5] ring-1 ring-[#4A6FA5]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {submission.covenant_type}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Submitted {formatDate(submission.submitted_at)}
                          </div>
                        </div>
                        <span className={`text-xs font-medium border rounded-full px-2 py-0.5 ${STATUS_STYLES[submission.status] || STATUS_STYLES.Submitted}`}>
                          {submission.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {activeSubmission && (
                <SubmissionReview
                  submission={activeSubmission}
                  status={status}
                  onApprove={() => handleReview("approve")}
                  onReject={() => handleReview("reject")}
                  onRecord={handleRecord}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SubmissionReview({ submission, status, onApprove, onReject, onRecord }) {
  const isSubmitted = submission.status === "Submitted";
  const isApproved = submission.status === "Approved";
  const isRecorded = submission.status === "Recorded";

  return (
    <div className="mt-5 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield size={15} className="text-[#4A6FA5]" />
        <div className="text-sm font-semibold text-gray-800">Clerk Review</div>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Summary</div>
          <p className="text-gray-700 mt-1 leading-relaxed">{submission.legal_text}</p>
        </div>

        {submission.legal_reference && (
          <div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Legal Reference</div>
            <p className="text-[#4A6FA5] font-medium mt-1">{submission.legal_reference}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-xs">
          <Meta label="Submitter" value={submission.submitter_name} />
          <Meta label="Reviewer" value={submission.reviewer_name || "Unassigned"} />
          <Meta label="Document" value={submission.document_name || "No attachment"} />
          <Meta label="Size" value={submission.document_size ? `${submission.document_size.toLocaleString()} bytes` : "0 bytes"} />
        </div>

        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
            <Hash size={11} />
            Document Fingerprint
          </div>
          <div className="font-mono text-xs text-gray-800 break-all">{submission.document_hash}</div>
        </div>

        {submission.rejection_reason && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
            {submission.rejection_reason}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button
          type="button"
          disabled={!isSubmitted || status === "approving"}
          onClick={onApprove}
          className={`py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${
            isSubmitted ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {status === "approving" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
          Approve
        </button>
        <button
          type="button"
          disabled={!isSubmitted || status === "rejecting"}
          onClick={onReject}
          className={`py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${
            isSubmitted ? "bg-white border border-red-200 text-red-700 hover:bg-red-50" : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {status === "rejecting" ? <Loader2 size={14} className="animate-spin" /> : <AlertCircle size={14} />}
          Reject
        </button>
      </div>

      <button
        type="button"
        disabled={!isApproved || status === "recording"}
        onClick={onRecord}
        className={`w-full mt-2 py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${
          isApproved
            ? "bg-[#1B2A4A] hover:bg-[#253C6B] text-white"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        {status === "recording" ? <Loader2 size={15} className="animate-spin" /> : <Shield size={15} />}
        {isRecorded ? "Already Recorded" : "Record to Secure Registry"}
      </button>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <div className="text-gray-400 font-medium">{label}</div>
      <div className="text-gray-700 truncate">{value || "—"}</div>
    </div>
  );
}

function SuccessView({ result, onClose }) {
  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-3">
          <CheckCircle size={28} className="text-green-600" />
        </div>
        <h3 className="font-semibold text-gray-900 text-lg">Submission Recorded</h3>
        <p className="text-sm text-gray-500 mt-1">
          The approved covenant is now permanently secured and publicly verifiable.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3 mb-6 font-mono text-xs">
        {result?.txHash && (
          <div>
            <div className="text-gray-400 font-sans font-medium mb-0.5">Transaction Hash</div>
            <div className="text-gray-800 break-all">{result.txHash}</div>
          </div>
        )}
        {result?.blockNumber && (
          <div>
            <div className="text-gray-400 font-sans font-medium mb-0.5">Block Number</div>
            <div className="text-gray-800">#{result.blockNumber}</div>
          </div>
        )}
        <div>
          <div className="text-gray-400 font-sans font-medium mb-0.5">Document Hash</div>
          <div className="text-gray-800 break-all">{result?.documentHash || shortHash(result?.ipfsHash)}</div>
        </div>
        <div>
          <div className="text-gray-400 font-sans font-medium mb-0.5">Recorded At</div>
          <div className="text-gray-800 font-sans">{formatDate(result?.blockTimestamp)}</div>
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
