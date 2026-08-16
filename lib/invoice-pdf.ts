type PdfInvoice = {
  invoiceNumber: string; invoiceDate: string; dueDate: string; participantName: string; participantNdisNumber: string;
  recipientName: string; recipientEmail: string; billingPeriodStart: string; billingPeriodEnd: string; totalAmount: number; paymentStatus: string;
};
type PdfLine = { serviceDate: string; supportItemNumber: string; quantity: number; unitType: string; rate: number; amount: number; gstCode: string };
type PdfOrganisation = { organisationName: string; abn: string; providerNumber: string; email: string; phone: string; address: string; paymentTerms: string; paymentInstructions: string; logoDataUrl?: string };
type PdfImage = { width: number; height: number; data: Uint8Array; filter: "DCTDecode" | "FlateDecode" };

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export function createInvoicePdf(invoice: PdfInvoice, lines: PdfLine[], organisation: PdfOrganisation) {
  const logo = parseInvoiceLogo(organisation.logoDataUrl || "");
  const pages: string[][] = [[]];
  let y = PAGE_HEIGHT - MARGIN;
  const command = (value: string) => pages[pages.length - 1].push(value);
  const fill = (x: number, bottom: number, width: number, height: number, colour: string) => command(`q ${colour} rg ${x} ${bottom.toFixed(2)} ${width} ${height.toFixed(2)} re f Q`);
  const textAt = (text: string, x: number, top: number, size = 9, bold = false, colour = "0.10 0.16 0.20") => command(`q ${colour} rg BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${top.toFixed(2)} Td (${escapePdf(text)}) Tj ET Q`);
  const ensureSpace = (height: number) => { if (y < MARGIN + height) { pages.push([]); y = PAGE_HEIGHT - MARGIN; } };
  const add = (text: string, size = 9, bold = false, gap = 14, indent = 0, colour = "0.10 0.16 0.20") => {
    for (const line of wrapPdfText(text, Math.max(18, Math.floor((CONTENT_WIDTH - indent) / (size * 0.53))))) {
      if (y < MARGIN + 42) { pages.push([]); y = PAGE_HEIGHT - MARGIN; }
      command(`q ${colour} rg BT /${bold ? "F2" : "F1"} ${size} Tf ${MARGIN + indent} ${y.toFixed(2)} Td (${escapePdf(line)}) Tj ET Q`);
      y -= gap;
    }
  };
  const rule = () => { command(`q 0.12 0.55 0.53 RG 0.8 w ${MARGIN} ${y.toFixed(2)} m ${PAGE_WIDTH - MARGIN} ${y.toFixed(2)} l S Q`); y -= 14; };

  fill(MARGIN, y - 8, CONTENT_WIDTH, 8, "0.12 0.55 0.53");
  y -= 25;
  fill(MARGIN, y - 21, 34, 34, "0.07 0.29 0.34");
  if (logo) {
    const scale = Math.min(30 / logo.width, 30 / logo.height);
    const width = logo.width * scale;
    const height = logo.height * scale;
    command(`q ${width.toFixed(2)} 0 0 ${height.toFixed(2)} ${(MARGIN + (34 - width) / 2).toFixed(2)} ${(y - 19 + (34 - height) / 2).toFixed(2)} cm /Logo Do Q`);
  } else {
    textAt((organisation.organisationName || "EmpowerNotes").trim().charAt(0).toUpperCase() || "E", MARGIN + 11, y - 10, 15, true, "1 1 1");
  }
  add(organisation.organisationName || "EmpowerNotes", 16, true, 20, 46, "0.07 0.29 0.34");
  add([organisation.address, organisation.abn && `ABN ${organisation.abn}`, organisation.providerNumber && `NDIS provider ${organisation.providerNumber}`].filter(Boolean).join(" | "), 8, false, 12);
  add([organisation.email, organisation.phone].filter(Boolean).join(" | "), 8, false, 16);
  add("TAX INVOICE", 18, true, 24, 0, "0.12 0.55 0.53");
  add(`${invoice.invoiceNumber} | Invoice date ${invoice.invoiceDate} | Due ${invoice.dueDate || "Not set"}`, 9, true, 16);
  rule();
  fill(MARGIN, y - 62, CONTENT_WIDTH, 72, "0.94 0.98 0.98");
  y -= 8;
  add(`Participant: ${invoice.participantName}`, 10, true);
  add(`NDIS number: ${invoice.participantNdisNumber || "Not recorded"}`);
  add(`Recipient: ${invoice.recipientName}${invoice.recipientEmail ? ` | ${invoice.recipientEmail}` : ""}`);
  add(`Billing period: ${invoice.billingPeriodStart} to ${invoice.billingPeriodEnd}`, 9, false, 18);
  y -= 4;
  rule();

  lines.forEach((line, index) => {
    ensureSpace(52);
    if (index % 2 === 0) fill(MARGIN, y - 24, CONTENT_WIDTH, 34, "0.97 0.98 0.98");
    y -= 3;
    add(`${index + 1}. ${line.serviceDate} | ${line.supportItemNumber || "Support"}`, 9, true);
    add(`${line.quantity} ${line.unitType} x $${line.rate.toFixed(2)} = $${line.amount.toFixed(2)} | GST: ${line.gstCode || "Not specified"}`, 8, false, 15, 12);
  });

  rule();
  const gst = lines.reduce((sum, line) => sum + (isGstFree(line.gstCode) ? 0 : line.amount / 11), 0);
  ensureSpace(150);
  fill(MARGIN, y - 70, CONTENT_WIDTH, 82, "0.07 0.29 0.34");
  y -= 8;
  add(`TOTAL DUE  $${invoice.totalAmount.toFixed(2)}`, 15, true, 22, 12, "1 1 1");
  add(`Subtotal: $${invoice.totalAmount.toFixed(2)}   |   GST component: $${gst.toFixed(2)}`, 9, false, 16, 12, "0.88 0.96 0.95");
  add(`Payment status: ${invoice.paymentStatus}`, 9, true, 22, 12, "1 1 1");
  y -= 8;
  add(`Payment terms: ${organisation.paymentTerms || "Payment due within 14 days."}`);
  add(`Payment instructions: ${organisation.paymentInstructions || "Contact the provider for payment instructions."}`);

  pages.forEach((commands, index) => {
    commands.unshift(`q 0.12 0.55 0.53 rg ${MARGIN} ${PAGE_HEIGHT - 26} ${CONTENT_WIDTH} 4 re f Q`);
    commands.push(`q 0.35 0.43 0.47 rg BT /F1 7 Tf ${MARGIN} 24 Td (Generated securely by EmpowerNotes) Tj ET Q`);
    commands.push(`q 0.35 0.43 0.47 rg BT /F1 8 Tf ${PAGE_WIDTH - 92} 24 Td (Page ${index + 1} of ${pages.length}) Tj ET Q`);
  });
  return assemblePdf(pages, invoice.invoiceDate, logo);
}

export function wrapPdfText(value: string, maxCharacters: number) {
  const words = sanitisePdfText(value).split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const chunks = word.match(new RegExp(`.{1,${maxCharacters}}`, "g")) || [word];
    for (const chunk of chunks) {
      if (!current) current = chunk;
      else if (`${current} ${chunk}`.length <= maxCharacters) current += ` ${chunk}`;
      else { lines.push(current); current = chunk; }
    }
  }
  if (current) lines.push(current);
  return lines;
}

function assemblePdf(pages: string[][], invoiceDate: string, logo: PdfImage | null) {
  const objects: string[] = [];
  const addObject = (content: string) => { objects.push(content); return objects.length; };
  const catalogId = addObject("");
  const pagesId = addObject("");
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const logoId = logo ? addObject(`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /${logo.filter}] /Length ${logo.data.length * 2 + 1} >>\nstream\n${bytesToHex(logo.data)}>\nendstream`) : 0;
  const pageIds: number[] = [];
  for (const commands of pages) {
    const stream = commands.join("\n");
    const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    pageIds.push(addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >>${logoId ? ` /XObject << /Logo ${logoId} 0 R >>` : ""} >> /Contents ${contentId} 0 R >>`));
  }
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(invoiceDate) ? invoiceDate.replace(/-/g, "") : "20000101";
  const infoId = addObject(`<< /Producer (EmpowerNotes) /CreationDate (D:${safeDate}000000Z) /ModDate (D:${safeDate}000000Z) >>`);
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function parseInvoiceLogo(dataUrl: string): PdfImage | null {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg));base64,([a-z0-9+/=]+)$/i);
  if (!match) return null;
  const bytes = Uint8Array.from(Buffer.from(match[2], "base64"));
  return /jpe?g/i.test(match[1]) ? parseJpeg(bytes) : parsePng(bytes);
}

function parseJpeg(data: Uint8Array): PdfImage | null {
  for (let offset = 2; offset + 8 < data.length;) {
    if (data[offset] !== 0xff) { offset += 1; continue; }
    const marker = data[offset + 1];
    const length = (data[offset + 2] << 8) | data[offset + 3];
    if (marker >= 0xc0 && marker <= 0xc3 && length >= 7) {
      return { width: (data[offset + 7] << 8) | data[offset + 8], height: (data[offset + 5] << 8) | data[offset + 6], data, filter: "DCTDecode" };
    }
    offset += Math.max(2, length + 2);
  }
  return null;
}

function parsePng(data: Uint8Array): PdfImage | null {
  if (data.length < 33 || String.fromCharCode(...data.slice(1, 4)) !== "PNG") return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  const bitDepth = data[24];
  const colourType = data[25];
  if (!width || !height || bitDepth !== 8 || ![2, 6].includes(colourType)) return null;
  const chunks: Uint8Array[] = [];
  for (let offset = 8; offset + 12 <= data.length;) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...data.slice(offset + 4, offset + 8));
    if (type === "IDAT") chunks.push(data.slice(offset + 8, offset + 8 + length));
    offset += 12 + length;
    if (type === "IEND") break;
  }
  if (!chunks.length) return null;
  const inflated = inflateSync(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
  const channels = colourType === 6 ? 4 : 3;
  const stride = width * channels;
  const rgb = new Uint8Array(width * height * 3);
  let input = 0;
  let output = 0;
  let previous = new Uint8Array(stride);
  for (let row = 0; row < height; row += 1) {
    const filter = inflated[input++];
    const current = new Uint8Array(stride);
    for (let index = 0; index < stride; index += 1) {
      const raw = inflated[input++];
      const left = index >= channels ? current[index - channels] : 0;
      const up = previous[index] || 0;
      const upperLeft = index >= channels ? previous[index - channels] || 0 : 0;
      current[index] = (raw + (filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : filter === 4 ? paeth(left, up, upperLeft) : 0)) & 255;
    }
    for (let pixel = 0; pixel < width; pixel += 1) {
      const source = pixel * channels;
      const alpha = channels === 4 ? current[source + 3] / 255 : 1;
      rgb[output++] = Math.round(current[source] * alpha + 255 * (1 - alpha));
      rgb[output++] = Math.round(current[source + 1] * alpha + 255 * (1 - alpha));
      rgb[output++] = Math.round(current[source + 2] * alpha + 255 * (1 - alpha));
    }
    previous = current;
  }
  return { width, height, data: Uint8Array.from(deflateSync(rgb)), filter: "FlateDecode" };
}

function paeth(left: number, up: number, upperLeft: number) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left), upDistance = Math.abs(estimate - up), upperLeftDistance = Math.abs(estimate - upperLeft);
  return leftDistance <= upDistance && leftDistance <= upperLeftDistance ? left : upDistance <= upperLeftDistance ? up : upperLeft;
}

function bytesToHex(data: Uint8Array) { return Array.from(data, (byte) => byte.toString(16).padStart(2, "0")).join(""); }

function isGstFree(code: string) { return !code || /free|gst-free|g-free|n-t/i.test(code); }
function sanitisePdfText(value: string) { return value.normalize("NFKD").replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim(); }
function escapePdf(value: string) { return sanitisePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"); }
import { deflateSync, inflateSync } from "node:zlib";
