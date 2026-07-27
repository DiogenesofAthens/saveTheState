import {
  AlertTriangle,
  Check,
  ChevronDown,
  FileSearch,
  Quote,
  Sparkles,
} from "lucide-react";

function confidenceLabel(score) {
  if (score >= 0.8) return "High";
  if (score >= 0.6) return "Medium";
  return "Low";
}

function confidenceClasses(score) {
  if (score >= 0.8) return "bg-green-50 text-green-700 border-green-200";
  if (score >= 0.6) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function displayValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  return value || "Not found";
}

function ExtractedField({ label, field, multiline = false }) {
  if (!field) return null;
  const hasValue = Array.isArray(field.value) ? field.value.length > 0 : Boolean(field.value);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
          <div className={`mt-1 text-sm ${hasValue ? "text-slate-800" : "text-slate-400 italic"} ${multiline ? "leading-relaxed" : "font-medium"}`}>
            {displayValue(field.value)}
          </div>
        </div>
        <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${confidenceClasses(field.confidence)}`}>
          {confidenceLabel(field.confidence)} · {Math.round(field.confidence * 100)}%
        </span>
      </div>

      {field.evidence?.length > 0 && (
        <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
          {field.evidence.map((evidence, index) => (
            <div key={`${evidence.page}-${index}`} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
              <Quote size={11} className="mt-0.5 flex-shrink-0 text-[#4A6FA5]" />
              <span>
                “{evidence.quote}”{evidence.page ? <strong className="ml-1 font-semibold text-slate-600">p. {evidence.page}</strong> : null}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Fact({ label, field }) {
  const value = field?.value;
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-0.5 text-xs leading-relaxed text-slate-700">{displayValue(value)}</div>
    </div>
  );
}

export default function IntakeCopilotCard({ result, applied, onApply }) {
  if (!result?.analysis) return null;
  const { analysis } = result;
  const canApply = Boolean(analysis.covenantType?.value && analysis.summary?.value);
  const modeLabel = result.mode === "ai" ? "AI source analysis" : result.mode === "fallback" ? "Fallback draft" : "Demo extraction";

  return (
    <section className="overflow-hidden rounded-xl border border-blue-200 bg-blue-50/40">
      <div className="border-b border-blue-100 bg-gradient-to-r from-[#1B2A4A] to-[#2D4B78] p-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="rounded-lg bg-white/10 p-2">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Intake Copilot Draft</h3>
              <p className="mt-0.5 text-[11px] text-blue-100">Source-grounded suggestions for clerk review</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">Overall confidence</div>
            <div className="text-lg font-semibold">{Math.round(result.overallConfidence * 100)}%</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-blue-100">
          <FileSearch size={11} />
          {modeLabel} · {result.document.pageCount} {result.document.pageCount === 1 ? "page" : "pages"} · document not retained
        </div>
      </div>

      <div className="space-y-3 p-4">
        <ExtractedField label="Suggested covenant type" field={analysis.covenantType} />
        <ExtractedField label="Suggested plain-English summary" field={analysis.summary} multiline />
        <ExtractedField label="Suggested legal reference" field={analysis.legalReference} />

        <button
          type="button"
          onClick={onApply}
          disabled={!canApply || applied}
          className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
            applied
              ? "bg-green-100 text-green-700"
              : canApply
              ? "bg-[#4A6FA5] text-white hover:bg-[#3D5F91]"
              : "cursor-not-allowed bg-slate-100 text-slate-400"
          }`}
        >
          {applied ? <Check size={15} /> : <Sparkles size={15} />}
          {applied ? "Draft applied — review fields below" : "Apply suggestions to intake form"}
        </button>

        <details className="group rounded-lg border border-blue-100 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-xs font-semibold text-slate-700">
            Additional extracted facts
            <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 px-3 py-3">
            <Fact label="Affected APNs" field={analysis.affectedApns} />
            <Fact label="Parties" field={analysis.parties} />
            <Fact label="Effective" field={analysis.effectiveDate} />
            <Fact label="Expiration" field={analysis.expirationDate} />
            <div className="col-span-2">
              <Fact label="Restrictions" field={analysis.restrictions} />
            </div>
          </div>
        </details>

        {analysis.warnings?.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
              <AlertTriangle size={13} />
              Clerk verification required
            </div>
            <ul className="space-y-1 text-[11px] leading-relaxed text-amber-700">
              {analysis.warnings.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
