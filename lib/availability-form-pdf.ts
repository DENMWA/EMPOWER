const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;

export function createAvailabilityFormPdf(workerName: string, organisationName: string) {
  const commands: string[] = [];
  const text = (value: string, x: number, y: number, size = 10, bold = false, colour = "0.10 0.16 0.20") => {
    commands.push(`q ${colour} rg BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${escapePdf(value)}) Tj ET Q`);
  };
  const line = (x1: number, y1: number, x2: number, y2: number, colour = "0.62 0.68 0.72") => {
    commands.push(`q ${colour} RG 0.7 w ${x1} ${y1} m ${x2} ${y2} l S Q`);
  };
  commands.push(`q 0.12 0.55 0.53 rg ${MARGIN} ${PAGE_HEIGHT - 50} ${PAGE_WIDTH - MARGIN * 2} 8 re f Q`);
  text(organisationName || "EmpowerNotes", MARGIN, 760, 17, true, "0.07 0.29 0.34");
  text("Employee availability form", MARGIN, 730, 22, true, "0.12 0.55 0.53");
  text(`Employee: ${workerName}`, MARGIN, 699, 11, true);
  text("Availability period from: ____________________  to: ____________________", MARGIN, 676, 10);
  text("Record when you can work. This form does not guarantee rostered hours.", MARGIN, 651, 9, false, "0.35 0.43 0.47");

  const columns = [MARGIN, 128, 220, 312, 405, PAGE_WIDTH - MARGIN];
  const headers = ["Day", "Available from", "Available to", "Preference", "Unavailable / notes"];
  let y = 615;
  commands.push(`q 0.94 0.98 0.98 rg ${MARGIN} ${y} ${PAGE_WIDTH - MARGIN * 2} 28 re f Q`);
  headers.forEach((header, index) => text(header, columns[index] + 5, y + 10, index === 4 ? 7 : 8, true));
  line(MARGIN, y + 28, PAGE_WIDTH - MARGIN, y + 28);
  line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  columns.forEach((x) => line(x, y - 294, x, y + 28));
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  days.forEach((day) => {
    y -= 42;
    text(day, MARGIN + 5, y + 16, 9, true);
    line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  });
  text("Preferences or limits", MARGIN, 282, 11, true);
  line(MARGIN, 255, PAGE_WIDTH - MARGIN, 255);
  line(MARGIN, 229, PAGE_WIDTH - MARGIN, 229);
  text("I confirm this availability is accurate and may be used to prepare a proposed roster.", MARGIN, 195, 9);
  text("Employee signature: ____________________________", MARGIN, 155, 9, true);
  text("Date: ____________________", 380, 155, 9, true);
  text("Manager received: ______________________________", MARGIN, 118, 9);
  text("Date: ____________________", 380, 118, 9);
  text("Private workforce record - upload only to the authorised EmpowerNotes workspace.", MARGIN, 55, 8, false, "0.35 0.43 0.47");
  return assemblePdf(commands);
}

function assemblePdf(commands: string[]) {
  const objects: string[] = [];
  const add = (content: string) => { objects.push(content); return objects.length; };
  const catalog = add("");
  const pages = add("");
  const regular = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const bold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const stream = commands.join("\n");
  const content = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  const page = add(`<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${regular} 0 R /F2 ${bold} 0 R >> >> /Contents ${content} 0 R >>`);
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pages} 0 R >>`;
  objects[pages - 1] = `<< /Type /Pages /Kids [${page} 0 R] /Count 1 >>`;
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function escapePdf(value: string) {
  return value.normalize("NFKD").replace(/[^\x20-\x7E]/g, " ").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
