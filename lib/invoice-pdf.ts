type PdfInvoice = {
  invoiceNumber: string; invoiceDate: string; dueDate: string; participantName: string; participantNdisNumber: string;
  recipientName: string; recipientEmail: string; billingPeriodStart: string; billingPeriodEnd: string; totalAmount: number; paymentStatus: string;
};
type PdfLine = { serviceDate: string; supportItemNumber: string; quantity: number; unitType: string; rate: number; amount: number; gstCode: string };
type PdfOrganisation = { organisationName: string; abn: string; providerNumber: string; email: string; phone: string; address: string; paymentTerms: string; paymentInstructions: string };

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export function createInvoicePdf(invoice: PdfInvoice, lines: PdfLine[], organisation: PdfOrganisation) {
  const pages: string[][] = [[]];
  let y = PAGE_HEIGHT - MARGIN;
  const add = (text: string, size = 9, bold = false, gap = 14, indent = 0) => {
    for (const line of wrapPdfText(text, Math.max(18, Math.floor((CONTENT_WIDTH - indent) / (size * 0.53))))) {
      if (y < MARGIN + 42) { pages.push([]); y = PAGE_HEIGHT - MARGIN; }
      pages[pages.length - 1].push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${MARGIN + indent} ${y.toFixed(2)} Td (${escapePdf(line)}) Tj ET`);
      y -= gap;
    }
  };
  const rule = () => { pages[pages.length - 1].push(`${MARGIN} ${y.toFixed(2)} m ${PAGE_WIDTH - MARGIN} ${y.toFixed(2)} l S`); y -= 14; };

  add(organisation.organisationName || "Service provider", 16, true, 20);
  add([organisation.address, organisation.abn && `ABN ${organisation.abn}`, organisation.providerNumber && `NDIS provider ${organisation.providerNumber}`].filter(Boolean).join(" | "), 8, false, 12);
  add([organisation.email, organisation.phone].filter(Boolean).join(" | "), 8, false, 16);
  add("TAX INVOICE", 18, true, 24);
  add(`${invoice.invoiceNumber} | Invoice date ${invoice.invoiceDate} | Due ${invoice.dueDate || "Not set"}`, 9, true, 16);
  rule();
  add(`Participant: ${invoice.participantName}`, 10, true);
  add(`NDIS number: ${invoice.participantNdisNumber || "Not recorded"}`);
  add(`Recipient: ${invoice.recipientName}${invoice.recipientEmail ? ` | ${invoice.recipientEmail}` : ""}`);
  add(`Billing period: ${invoice.billingPeriodStart} to ${invoice.billingPeriodEnd}`, 9, false, 18);
  rule();

  lines.forEach((line, index) => {
    add(`${index + 1}. ${line.serviceDate} | ${line.supportItemNumber || "Support"}`, 9, true);
    add(`${line.quantity} ${line.unitType} x $${line.rate.toFixed(2)} = $${line.amount.toFixed(2)} | GST: ${line.gstCode || "Not specified"}`, 8, false, 15, 12);
  });

  rule();
  const gst = lines.reduce((sum, line) => sum + (isGstFree(line.gstCode) ? 0 : line.amount / 11), 0);
  add(`Subtotal (GST inclusive where applicable): $${invoice.totalAmount.toFixed(2)}`, 10, true);
  add(`GST component: $${gst.toFixed(2)}`, 10, true);
  add(`TOTAL: $${invoice.totalAmount.toFixed(2)}`, 14, true, 22);
  add(`Payment status: ${invoice.paymentStatus}`);
  add(`Payment terms: ${organisation.paymentTerms || "Payment due within 14 days."}`);
  add(`Payment instructions: ${organisation.paymentInstructions || "Contact the provider for payment instructions."}`);

  pages.forEach((commands, index) => commands.push(`BT /F1 8 Tf ${PAGE_WIDTH - 92} 24 Td (Page ${index + 1} of ${pages.length}) Tj ET`));
  return assemblePdf(pages, invoice.invoiceDate);
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

function assemblePdf(pages: string[][], invoiceDate: string) {
  const objects: string[] = [];
  const addObject = (content: string) => { objects.push(content); return objects.length; };
  const catalogId = addObject("");
  const pagesId = addObject("");
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds: number[] = [];
  for (const commands of pages) {
    const stream = commands.join("\n");
    const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    pageIds.push(addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`));
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

function isGstFree(code: string) { return !code || /free|gst-free|g-free|n-t/i.test(code); }
function sanitisePdfText(value: string) { return value.normalize("NFKD").replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim(); }
function escapePdf(value: string) { return sanitisePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"); }
