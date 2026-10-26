const { PDFParse } = require('pdf-parse');

/** Extract raw text from a PDF buffer (as delivered by multer's memoryStorage). */
async function extractTextFromPDF(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 5 || buffer.subarray(0, 5).toString() !== '%PDF-') {
    throw new Error('Invalid PDF file');
  }
  let data;
  const parser = new PDFParse({ data: buffer });
  try {
    data = await parser.getText();
  } catch (error) {
    throw new Error('Invalid or corrupted PDF file');
  } finally {
    await parser.destroy();
  }
  const text = data.text || '';
  if (!text.trim()) throw new Error('No extractable text found in this PDF');
  return text;
}

module.exports = { extractTextFromPDF };
