import * as xlsx from 'xlsx';
import { RawTimetableSheet } from './types';
import { cleanText } from './normalizer';

/**
 * Reads an Excel binary buffer or base64 string and extracts all worksheets with merged cell resolution.
 */
export function readWorkbookWithMerges(input: Buffer | string): { workbook: xlsx.WorkBook; sheets: RawTimetableSheet[] } {
  let buffer: Buffer;
  if (typeof input === 'string') {
    // If it's a file path or base64
    if (input.startsWith('data:') || input.includes(';base64,')) {
      const base64Data = input.split(';base64,').pop() || '';
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = Buffer.from(input, 'base64');
    }
  } else {
    buffer = input;
  }

  const workbook = xlsx.read(buffer, {
    type: 'buffer',
    cellStyles: true,
    cellFormula: false,
    raw: false
  });

  const extractedSheets: RawTimetableSheet[] = [];

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    if (!ws || !ws['!ref']) continue;

    const range = xlsx.utils.decode_range(ws['!ref']);
    const merges = (ws['!merges'] || []) as Array<{ s: { r: number; c: number }; e: { r: number; c: number } }>;

    // 1. Build initial 2D matrix
    const matrix: string[][] = [];
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const row: string[] = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = xlsx.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellAddress];
        row.push(cell && cell.v !== undefined && cell.v !== null ? cleanText(cell.w || cell.v) : '');
      }
      matrix.push(row);
    }

    // 2. Replicate merged cell values across the entire bounding box
    // Note: range.s.r is row 0 in sheet coordinates, matrix index is R - range.s.r
    for (const merge of merges) {
      const startR = merge.s.r - range.s.r;
      const startC = merge.s.c - range.s.c;
      const endR = merge.e.r - range.s.r;
      const endC = merge.e.c - range.s.c;

      if (startR >= 0 && startR < matrix.length && startC >= 0 && startC < (matrix[startR]?.length || 0)) {
        const masterVal = matrix[startR][startC];
        if (masterVal) {
          for (let r = startR; r <= endR && r < matrix.length; r++) {
            for (let c = startC; c <= endC && c < (matrix[r]?.length || 0); c++) {
              matrix[r][c] = masterVal;
            }
          }
        }
      }
    }

    const rawRows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];

    extractedSheets.push({
      sheetName,
      matrix,
      rawRows,
      merges
    });
  }

  return { workbook, sheets: extractedSheets };
}
