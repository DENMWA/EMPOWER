const modernPdfVersion = "v2.0.550";

export async function extractPdfText(buffer: Buffer) {
  const pdfParse = (await import("pdf-parse")).default;
  const parsePdf = pdfParse as unknown as (data: Buffer, options: Record<string, unknown>) => Promise<{ text?: string }>;
  try {
    const parsed = await parsePdf(buffer, { version: modernPdfVersion });
    return parsed.text || "";
  } catch (firstError) {
    try {
      // A second pass without metadata parsing recovers some PDFs with damaged cross-reference metadata.
      const parsed = await parsePdf(buffer, {
        version: modernPdfVersion,
        max: 250,
        pagerender: async (page: { getTextContent: (options: Record<string, boolean>) => Promise<{ items: Array<{ str?: string }> }> }) => {
          const content = await page.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
          return content.items.map((item) => item.str || "").join(" ");
        }
      });
      return parsed.text || "";
    } catch {
      throw readablePdfError(firstError);
    }
  }
}

function readablePdfError(error: unknown) {
  const detail = error instanceof Error ? error.message : "";
  if (/xref|cross-reference|invalid pdf|format error/i.test(detail)) {
    return new Error("This PDF has a damaged internal index. The agreement remains saved; export it as a new PDF and retry automatic rate extraction.");
  }
  if (/password|encrypted/i.test(detail)) {
    return new Error("This PDF is password-protected. Upload an unlocked copy for automatic rate extraction.");
  }
  return new Error("Text could not be read from this PDF. The agreement remains saved; retry with a searchable PDF or DOCX copy.");
}
