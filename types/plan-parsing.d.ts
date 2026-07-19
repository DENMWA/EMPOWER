declare module "pdf-parse" {
  export default function pdfParse(buffer: Buffer): Promise<{ text: string; numpages?: number }>;
}

declare module "mammoth" {
  export function extractRawText(input: { buffer: Buffer }): Promise<{ value: string; messages: unknown[] }>;
}
