const assert = require("node:assert/strict");
const test = require("node:test");
const PDFDocument = require("pdfkit");

const {
  IntakeDocumentError,
  analyzeCovenantDocument,
  sanitizeAnalysis,
} = require("../src/services/covenant-intake");

const PARCEL = { apn: "154-210-01", address: "1000 4th St" };

function encodedDocument(text, name = "covenant.txt", type = "text/plain") {
  return {
    name,
    type,
    contentBase64: Buffer.from(text).toString("base64"),
  };
}

function makePdf(pageTexts) {
  return new Promise((resolve) => {
    const chunks = [];
    const document = new PDFDocument({ margin: 48 });
    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    pageTexts.forEach((text, index) => {
      if (index > 0) document.addPage();
      document.text(text);
    });
    document.end();
  });
}

test("creates a reviewable deterministic draft when no AI model is configured", async () => {
  const previousModel = process.env.AI_MODEL;
  delete process.env.AI_MODEL;
  try {
    const result = await analyzeCovenantDocument(
      encodedDocument(`CONSERVATION EASEMENT AND LAND USE COVENANT
Assessor's Parcel Number: 154-210-01.
This agreement is between Redwood Ridge Holdings LLC and the County of Marin. It is effective on July 1, 2026.
The Owner shall preserve 2.4 acres as permanent open space and native habitat. No residential subdivision or commercial construction may occur within the easement area.
This covenant runs with the land in perpetuity. Recorded under Marin County Code §22.64.030.`),
      PARCEL
    );

    assert.equal(result.mode, "demo");
    assert.equal(result.analysis.covenantType.value, "Conservation Easement");
    assert.equal(result.analysis.affectedApns.value[0], PARCEL.apn);
    assert.equal(result.analysis.effectiveDate.value, "2026-07-01");
    assert.equal(result.analysis.expirationDate.value, "Perpetual");
    assert.match(result.analysis.summary.value, /shall preserve/i);
    assert.doesNotMatch(result.analysis.summary.value, /Assessor's Parcel Number/i);
    assert.ok(result.analysis.summary.evidence.length > 0);
    assert.ok(result.overallConfidence >= 0 && result.overallConfidence <= 1);
  } finally {
    if (previousModel === undefined) delete process.env.AI_MODEL;
    else process.env.AI_MODEL = previousModel;
  }
});

test("preserves PDF page numbers in source evidence", async () => {
  const previousModel = process.env.AI_MODEL;
  delete process.env.AI_MODEL;
  try {
    const pdf = await makePdf([
      "COUNTY RECORDER COVER SHEET. APN 154-210-01. See attached instrument.",
      "CONSERVATION EASEMENT. The Owner shall preserve the property as permanent open space. This covenant runs with the land in perpetuity. Marin County Code §22.64.030.",
    ]);
    const result = await analyzeCovenantDocument(
      {
        name: "two-page-covenant.pdf",
        type: "application/pdf",
        contentBase64: pdf.toString("base64"),
      },
      PARCEL
    );

    assert.equal(result.document.pageCount, 2);
    assert.equal(result.analysis.covenantType.evidence[0].page, 2);
    assert.equal(result.analysis.summary.evidence[0].page, 2);
  } finally {
    if (previousModel === undefined) delete process.env.AI_MODEL;
    else process.env.AI_MODEL = previousModel;
  }
});

test("rejects documents without enough readable text", async () => {
  await assert.rejects(
    () => analyzeCovenantDocument(encodedDocument("short"), PARCEL),
    (error) => error instanceof IntakeDocumentError && error.statusCode === 422
  );
});

test("drops unsupported evidence quotes and lowers confidence", () => {
  const baseField = { value: null, confidence: 0.2, evidence: [] };
  const analysis = {
    covenantType: {
      value: "Conservation Easement",
      confidence: 0.96,
      evidence: [{ page: 1, quote: "This quote is not in the document." }],
    },
    summary: { ...baseField },
    legalReference: { ...baseField },
    affectedApns: { value: [], confidence: 0.2, evidence: [] },
    parties: { value: [], confidence: 0.2, evidence: [] },
    effectiveDate: { ...baseField },
    expirationDate: { ...baseField },
    restrictions: { value: [], confidence: 0.2, evidence: [] },
    warnings: [],
  };

  const sanitized = sanitizeAnalysis(analysis, [{ page: 1, text: "Actual document content." }]);
  assert.deepEqual(sanitized.covenantType.evidence, []);
  assert.equal(sanitized.covenantType.confidence, 0.55);
});
