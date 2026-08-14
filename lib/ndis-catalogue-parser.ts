import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";

const maxWorksheetXmlBytes = 30 * 1024 * 1024;
const maxWorksheets = 12;
const maxRows = 20_000;
const maxColumns = 160;

export async function parseNdisCatalogueRows(source: Buffer, filename: string) {
  if (/\.csv$/i.test(filename)) return selectCatalogueTable(parseCsv(source.toString("utf8")));
  if (!/\.xlsx$/i.test(filename)) throw new Error("The NDIS catalogue must be a CSV or XLSX file.");

  const workbook = await JSZip.loadAsync(source, { checkCRC32: true });
  const sharedStrings = await readSharedStrings(workbook);
  const worksheetNames = Object.keys(workbook.files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
    .sort(naturalWorksheetOrder)
    .slice(0, maxWorksheets);
  if (!worksheetNames.length) throw new Error("The XLSX file contains no readable worksheets.");

  let bestRows: string[][] = [];
  let bestScore = -1;
  for (const worksheetName of worksheetNames) {
    const file = workbook.file(worksheetName);
    if (!file) continue;
    const xml = await file.async("string");
    if (Buffer.byteLength(xml, "utf8") > maxWorksheetXmlBytes) throw new Error("An XLSX worksheet is too large to process safely.");
    const rows = parseWorksheet(xml, sharedStrings);
    const candidate = locateCatalogueHeader(rows);
    if (candidate.score > bestScore) {
      bestRows = rows.slice(candidate.index);
      bestScore = candidate.score;
    }
  }
  if (bestScore < 4 || bestRows.length < 2) throw new Error("The XLSX file does not contain a recognisable NDIS support catalogue table.");
  return bestRows;
}

async function readSharedStrings(workbook: JSZip) {
  const file = workbook.file("xl/sharedStrings.xml");
  if (!file) return [];
  const xml = await file.async("string");
  if (Buffer.byteLength(xml, "utf8") > maxWorksheetXmlBytes) throw new Error("The XLSX shared-string table is too large to process safely.");
  const document = parseXml(xml);
  return Array.from(document.getElementsByTagName("si")).map((item) =>
    Array.from(item.getElementsByTagName("t")).map((text) => text.textContent || "").join("")
  );
}

function parseWorksheet(xml: string, sharedStrings: string[]) {
  const document = parseXml(xml);
  return Array.from(document.getElementsByTagName("row")).slice(0, maxRows).map((row) => {
    const values: string[] = [];
    Array.from(row.getElementsByTagName("c")).slice(0, maxColumns).forEach((cell) => {
      const reference = cell.getAttribute("r") || "";
      const column = columnIndex(reference);
      if (column < 0 || column >= maxColumns) return;
      const type = cell.getAttribute("t") || "";
      const raw = cell.getElementsByTagName("v")[0]?.textContent || "";
      const inline = Array.from(cell.getElementsByTagName("t")).map((text) => text.textContent || "").join("");
      values[column] = type === "s" ? sharedStrings[Number(raw)] || "" : type === "inlineStr" ? inline : raw;
    });
    return values.map((value) => String(value || "").trim());
  }).filter((row) => row.some(Boolean));
}

function parseXml(xml: string) {
  const errors: string[] = [];
  const document = new DOMParser({ errorHandler: { warning: () => undefined, error: (message) => errors.push(message), fatalError: (message) => errors.push(message) } }).parseFromString(xml, "application/xml");
  if (errors.length || document.getElementsByTagName("parsererror").length) throw new Error("The XLSX workbook contains invalid XML.");
  return document;
}

function locateCatalogueHeader(rows: string[][]) {
  let result = { index: 0, score: -1 };
  rows.slice(0, 40).forEach((row, index) => {
    const headers = row.map(normaliseHeader);
    const joined = headers.join(" | ");
    const score = Number(/support item (number|code|ref)|item number/.test(joined))
      + Number(/support item (name|description)|item name/.test(joined))
      + Number(/unit type|unit of measure|\bunit\b/.test(joined))
      + Number(/price|maximum/.test(joined))
      + Number(/support category/.test(joined))
      + Number(/registration group/.test(joined));
    if (score > result.score) result = { index, score };
  });
  return result;
}

function selectCatalogueTable(rows: string[][]) {
  const header = locateCatalogueHeader(rows);
  return header.score >= 4 ? rows.slice(header.index) : rows;
}

function columnIndex(reference: string) {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase();
  if (!letters) return -1;
  return [...letters].reduce((total, character) => total * 26 + character.charCodeAt(0) - 64, 0) - 1;
}

function naturalWorksheetOrder(left: string, right: string) {
  return Number(left.match(/\d+/)?.[0] || 0) - Number(right.match(/\d+/)?.[0] || 0);
}

function parseCsv(value: string) {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]; const next = value[index + 1];
    if (character === '"' && quoted && next === '"') { cell += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) { if (character === "\r" && next === "\n") index += 1; row.push(cell); if (row.some((entry) => entry.trim())) rows.push(row); row = []; cell = ""; }
    else cell += character;
  }
  row.push(cell); if (row.some((entry) => entry.trim())) rows.push(row); return rows;
}

function normaliseHeader(value: string) {
  return value.replace(/^\uFEFF/, "").toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}
