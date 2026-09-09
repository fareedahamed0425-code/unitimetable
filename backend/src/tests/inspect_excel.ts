import * as xlsx from 'xlsx';

const filePath = 'C:\\Users\\faree\\Downloads\\III CSE(AIML A,B  & CS) TIME TABLES (1).xlsx';
const wb = xlsx.readFile(filePath);

console.log('Workbook Sheet Names:', wb.SheetNames);

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  console.log('\n======================================================');
  console.log('SHEET:', sheetName);
  console.log('Ref Range:', ws['!ref']);
  console.log('Merges count:', ws['!merges']?.length || 0);
  
  if (ws['!merges']) {
    console.log('Sample Merges:', ws['!merges'].slice(0, 10).map(m => xlsx.utils.encode_range(m)));
  }

  const rawRows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
  rawRows.forEach((row, idx) => {
    if (row && row.some(cell => String(cell).trim() !== '')) {
      console.log(`[R${idx + 1}]`, row.map(c => String(c).replace(/\r?\n/g, ' ')));
    }
  });
}
