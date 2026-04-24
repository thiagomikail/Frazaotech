import mammoth from 'mammoth';
import { extractFMEARowsFromText } from './llm';

export async function parseWordDocument(file: File): Promise<any[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Extract raw text using mammoth
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;
    
    if (!text || text.trim().length === 0) {
      throw new Error('The document is empty or could not be parsed.');
    }

    // Pass the extracted text to the LLM to intelligently extract FMEA data
    const parsedRows = await extractFMEARowsFromText(text);
    return parsedRows;

  } catch (error: any) {
    console.error('Word parsing error:', error);
    throw new Error(error.message || 'Failed to parse the Word document.');
  }
}
