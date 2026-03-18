import * as XLSX from "xlsx";

export interface ParsedCompany {
  company_name: string;
  industry: string;
  scores: Record<string, number>;
  pillarScores: {
    digital_score: number | null;
    service_score: number | null;
    brand_score: number | null;
    employee_score: number | null;
  };
  cx_star_rating: number | null;
  cx_star_mastery: string | null;
}

export interface QualitativeText {
  company_name: string;
  pillar: string;
  sub_pillar: string;
  content: string;
}

export interface ParsedWorkbook {
  companies: ParsedCompany[];
  qualitativeTexts: QualitativeText[];
  metadata: {
    companyCount: number;
    industryCount: number;
    criteriaCount: number;
    qualitativeCount: number;
  };
}

// Sheets that are NOT industry data sheets
const NON_INDUSTRY_SHEETS = new Set(["Evaluation", "Scale"]);

const PILLAR_NAMES = ["digital", "service", "brand", "employee"];

function getMasteryBand(rating: number): string {
  if (rating < 1.5) return "Emerging";
  if (rating < 3.0) return "Developing";
  if (rating < 4.0) return "Proficient";
  if (rating < 4.5) return "Advanced";
  return "Exceptional";
}

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function normalizePillarName(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("digital")) return "digital";
  if (lower.includes("service")) return "service";
  if (lower.includes("brand")) return "brand";
  if (lower.includes("employee")) return "employee";
  return normalizeKey(raw);
}

/**
 * Build a row→value fill-forward map for a given column,
 * expanding XLSX merge ranges to cover all rows they span.
 */
function buildFillForwardMap(
  sheet: XLSX.WorkSheet,
  col: number,
  startRow: number,
  endRow: number,
  merges: XLSX.Range[]
): Record<number, string> {
  const map: Record<number, string> = {};

  // Expand merges for this column
  for (const merge of merges) {
    if (merge.s.c === col && merge.s.r >= startRow) {
      const cell = sheet[XLSX.utils.encode_cell({ r: merge.s.r, c: col })];
      const val = cell?.v != null ? String(cell.v).trim() : "";
      if (val) {
        for (let r = merge.s.r; r <= Math.min(merge.e.r, endRow); r++) {
          map[r] = val;
        }
      }
    }
  }

  // Also read non-merged cells and fill forward
  let last = "";
  for (let r = startRow; r <= endRow; r++) {
    if (map[r]) {
      last = map[r];
    } else {
      const cell = sheet[XLSX.utils.encode_cell({ r, c: col })];
      if (cell?.v != null && String(cell.v).trim()) {
        last = String(cell.v).trim();
        map[r] = last;
      } else if (last) {
        map[r] = last;
      }
    }
  }

  return map;
}

/**
 * Parse a single industry sheet (transposed format):
 *   Row 0: "Company name - Batch X" / "Score" alternating headers
 *   Row 1: Company names in text columns, cx_star scores in score columns
 *   Row 2+: Criteria rows
 *     Col 0 (A): Pillar name (merged down)
 *     Col 1 (B): Sub-pillar name (merged down)
 *     Col N (text): Qualitative observation text for a company
 *     Col N+1 (score): Numeric criterion score
 */
function parseIndustrySheet(
  sheet: XLSX.WorkSheet,
  _sheetName: string
): QualitativeText[] {
  if (!sheet["!ref"]) return [];

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const merges: XLSX.Range[] = sheet["!merges"] || [];

  // --- Find company text columns: row 0 must contain "company name" ---
  const companyCols: number[] = [];
  for (let c = 0; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c })];
    if (
      cell?.v != null &&
      String(cell.v).toLowerCase().includes("company name")
    ) {
      companyCols.push(c);
    }
  }
  if (companyCols.length === 0) return [];

  // --- Read company names from row 1 ---
  const companyNameMap = new Map<number, string>(); // textCol -> company name
  for (const col of companyCols) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 1, c: col })];
    if (cell?.v == null) continue;
    const raw = String(cell.v).trim();
    // Skip cells that are actually numbers (a score leaked into name position)
    if (!raw || !isNaN(Number(raw))) continue;
    companyNameMap.set(col, raw);
  }
  if (companyNameMap.size === 0) return [];

  // --- Build pillar and sub-pillar fill-forward maps ---
  const pillarMap = buildFillForwardMap(sheet, 0, 2, range.e.r, merges);
  const subPillarMap = buildFillForwardMap(sheet, 1, 2, range.e.r, merges);

  // --- Parse data rows (r=2+) ---
  const qualTexts: QualitativeText[] = [];

  for (let r = 2; r <= range.e.r; r++) {
    const pillar = normalizePillarName(pillarMap[r] || "");
    const subPillar = subPillarMap[r] || "General";

    for (const [col, companyName] of Array.from(companyNameMap.entries())) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c: col })];
      if (!cell || cell.v == null) continue;
      // Skip numeric cells (criterion scores, not text)
      if (cell.t === "n" || typeof cell.v === "number") continue;
      const text = String(cell.v).trim();
      // Skip very short strings (likely stray values)
      if (text.length < 10) continue;

      qualTexts.push({
        company_name: companyName,
        pillar,
        sub_pillar: subPillar,
        content: text,
      });
    }
  }

  return qualTexts;
}

// ─── Main parser ─────────────────────────────────────────────────────────────

export function parseXlsx(buffer: Buffer): ParsedWorkbook {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  // --- Parse Evaluation sheet for numeric company data ---
  const evalSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!evalSheet) throw new Error("No worksheet found in workbook");

  const evalRange = XLSX.utils.decode_range(evalSheet["!ref"] || "A1");
  const maxCol = evalRange.e.c;
  const maxRow = evalRange.e.r;
  const evalMerges: XLSX.Range[] = evalSheet["!merges"] || [];

  // Build header lookup from rows 1 and 2 (0-indexed)
  const headerToCol: Record<string, number> = {};
  for (let c = 0; c <= maxCol; c++) {
    for (const r of [1, 2]) {
      const cell = evalSheet[XLSX.utils.encode_cell({ r, c })];
      if (cell?.v != null) {
        const key = String(cell.v).trim().toLowerCase();
        if (key && !(key in headerToCol)) headerToCol[key] = c;
      }
    }
  }

  const companyCol = headerToCol["company"] ?? 1;
  const verticalCol = headerToCol["vertical"] ?? 2;

  // Prefer the most recent year's *adjusted* score over plain "cx star rating".
  // Strategy: find all header keys matching each pattern, then pick the one
  // whose key contains the highest year number (e.g. "2025 adjusted cx star rating"
  // wins over "2024 adjusted cx star rating" wins over "cx star rating").
  // For the overall CX Star Rating, prefer adjusted columns ordered by recency
  const cxStarRatingCol = (() => {
    // Collect all header keys that mention "adjusted" and "cx star rating"
    const candidates = Object.entries(headerToCol)
      .filter(([k]) => k.includes("adjusted") && k.includes("cx star"))
      .sort(([a], [b]) => {
        // Extract year number if present (e.g. 2025 > 2024)
        const yearA = parseInt(a.match(/\d{4}/)?.[0] ?? "0");
        const yearB = parseInt(b.match(/\d{4}/)?.[0] ?? "0");
        return yearB - yearA; // descending — highest year first
      });
    if (candidates.length > 0) return candidates[0][1];
    return headerToCol["cx star rating"] ?? 6;
  })();

  const cxStarMasteryCol = headerToCol["cx star mastery"] ?? 7;

  // For each pillar score, prefer "adjusted" columns with highest year
  function findAdjustedPillarCol(pillarKeyword: string): number {
    const candidates = Object.entries(headerToCol)
      .filter(([k]) => k.includes("adjusted") && k.includes(pillarKeyword))
      .sort(([a], [b]) => {
        const yearA = parseInt(a.match(/\d{4}/)?.[0] ?? "0");
        const yearB = parseInt(b.match(/\d{4}/)?.[0] ?? "0");
        return yearB - yearA;
      });
    if (candidates.length > 0) return candidates[0][1];
    // Fallback: "overall X experience score"
    const fallback = Object.keys(headerToCol).find(
      (k) => k.includes("overall") && k.includes(pillarKeyword) && k.includes("score")
    );
    return fallback ? headerToCol[fallback] : -1;
  }

  const digitalScoreCol = findAdjustedPillarCol("digital");
  const serviceScoreCol = findAdjustedPillarCol("service");
  const brandScoreCol = findAdjustedPillarCol("brand");
  const employeeScoreCol = findAdjustedPillarCol("employee");

  const aggregateCols = new Set([
    cxStarRatingCol,
    cxStarMasteryCol,
    digitalScoreCol,
    serviceScoreCol,
    brandScoreCol,
    employeeScoreCol,
  ]);

  // Detect pillar ranges from row 0 merged cells
  interface PillarRange {
    pillar: string;
    startCol: number;
    endCol: number;
  }
  const pillarRanges: PillarRange[] = [];

  for (const merge of evalMerges) {
    if (merge.s.r !== 0) continue;
    const sc = merge.s.c;
    if (sc < 8) continue;

    const cellVal = String(
      evalSheet[XLSX.utils.encode_cell({ r: 0, c: sc })]?.v ?? ""
    )
      .trim()
      .toLowerCase();

    let pillarName: string | null = null;
    if (PILLAR_NAMES.includes(cellVal)) {
      pillarName = cellVal;
    } else {
      for (let c = sc; c <= merge.e.c && !pillarName; c++) {
        const h = String(
          evalSheet[XLSX.utils.encode_cell({ r: 1, c })]?.v ?? ""
        ).toLowerCase();
        for (const pn of PILLAR_NAMES) {
          if (h.includes(pn)) {
            pillarName = pn;
            break;
          }
        }
      }
    }

    if (pillarName) {
      pillarRanges.push({
        pillar: pillarName,
        startCol: sc,
        endCol: merge.e.c + 1,
      });
    }
  }
  pillarRanges.sort((a, b) => a.startCol - b.startCol);

  const subPillarRow: Record<number, string> = {};
  for (let c = 0; c <= maxCol; c++) {
    const cell = evalSheet[XLSX.utils.encode_cell({ r: 1, c })];
    if (cell?.v != null) subPillarRow[c] = String(cell.v).trim();
  }
  for (const m of evalMerges.filter((m) => m.s.r === 1)) {
    const val = subPillarRow[m.s.c];
    if (val) {
      for (let c = m.s.c; c <= m.e.c; c++) subPillarRow[c] = val;
    }
  }

  const getPillarForCol = (
    col: number
  ): { pillar: string; subPillar: string } | null => {
    for (const pr of pillarRanges) {
      if (col >= pr.startCol && col < pr.endCol) {
        return { pillar: pr.pillar, subPillar: subPillarRow[col] || "General" };
      }
    }
    return null;
  };

  let criteriaCount = 0;
  for (let c = 0; c <= maxCol; c++) {
    if (getPillarForCol(c) && !aggregateCols.has(c)) criteriaCount++;
  }

  // Parse Evaluation data rows
  const companies: ParsedCompany[] = [];
  const industries = new Set<string>();

  const headerByCol: Record<number, string> = {};
  for (let c = 0; c <= maxCol; c++) {
    const cell = evalSheet[XLSX.utils.encode_cell({ r: 2, c })];
    if (cell?.v != null) headerByCol[c] = String(cell.v).trim();
  }

  for (let r = 3; r <= maxRow; r++) {
    const nameCell = evalSheet[XLSX.utils.encode_cell({ r, c: companyCol })];
    if (!nameCell || nameCell.v == null || String(nameCell.v).trim() === "")
      continue;

    const companyName = String(nameCell.v).trim();
    const industryCell = evalSheet[XLSX.utils.encode_cell({ r, c: verticalCol })];
    const industry = industryCell ? String(industryCell.v || "").trim() : "";
    if (industry) industries.add(industry);

    let cxStarRating: number | null = null;
    if (cxStarRatingCol >= 0) {
      const cell = evalSheet[XLSX.utils.encode_cell({ r, c: cxStarRatingCol })];
      if (cell && typeof cell.v === "number")
        cxStarRating = Math.round(cell.v * 10000) / 10000;
    }

    let cxStarMastery: string | null = null;
    if (cxStarMasteryCol >= 0) {
      const cell = evalSheet[XLSX.utils.encode_cell({ r, c: cxStarMasteryCol })];
      if (cell?.v != null) cxStarMastery = String(cell.v).trim();
    }
    if (!cxStarMastery && cxStarRating !== null) {
      cxStarMastery = getMasteryBand(cxStarRating);
    }

    const readScore = (col: number): number | null => {
      if (col < 0) return null;
      const cell = evalSheet[XLSX.utils.encode_cell({ r, c: col })];
      if (cell && typeof cell.v === "number")
        return Math.round(cell.v * 10000) / 10000;
      return null;
    };

    const pillarScores = {
      digital_score: readScore(digitalScoreCol),
      service_score: readScore(serviceScoreCol),
      brand_score: readScore(brandScoreCol),
      employee_score: readScore(employeeScoreCol),
    };

    if (cxStarRating === null) {
      const vals = Object.values(pillarScores).filter(
        (s): s is number => s !== null
      );
      if (vals.length > 0) {
        cxStarRating =
          Math.round(
            (vals.reduce((a, b) => a + b, 0) / vals.length) * 10000
          ) / 10000;
      }
    }

    const scores: Record<string, number> = {};
    for (let c = 0; c <= maxCol; c++) {
      if (aggregateCols.has(c)) continue;
      const pillarInfo = getPillarForCol(c);
      if (!pillarInfo) continue;
      const cell = evalSheet[XLSX.utils.encode_cell({ r, c })];
      if (!cell || cell.v == null) continue;
      if (typeof cell.v === "number") {
        const key = normalizeKey(
          `${pillarInfo.pillar}_${pillarInfo.subPillar}_${headerByCol[c] || `col_${c}`}`
        );
        scores[key] = cell.v;
      }
    }

    companies.push({
      company_name: companyName,
      industry,
      scores,
      pillarScores,
      cx_star_rating: cxStarRating,
      cx_star_mastery: cxStarMastery,
    });
  }

  // --- Parse all industry sheets for qualitative text ---
  const qualitativeTexts: QualitativeText[] = [];

  for (const sheetName of workbook.SheetNames) {
    if (NON_INDUSTRY_SHEETS.has(sheetName)) continue;
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const texts = parseIndustrySheet(sheet, sheetName);
    qualitativeTexts.push(...texts);
  }

  return {
    companies,
    qualitativeTexts,
    metadata: {
      companyCount: companies.length,
      industryCount: industries.size,
      criteriaCount,
      qualitativeCount: qualitativeTexts.length,
    },
  };
}
