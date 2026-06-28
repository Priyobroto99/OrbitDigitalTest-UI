import fs from 'fs';
// pdf-parse v2 exposes a PDFParse class (CJS).
const { PDFParse } = require('pdf-parse');

/** Extract all text from a PDF file so tests can assert on invoice contents. */
export async function extractPdfText(filePath: string): Promise<string> {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    return result.text as string;
  } finally {
    await parser.destroy?.();
  }
}
