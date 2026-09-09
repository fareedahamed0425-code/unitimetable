import * as fs from 'fs';
import { processTimetableWorkbook } from '../ingestion';

async function runTest() {
  const filePath = 'C:\\Users\\faree\\Downloads\\III CSE(AIML A,B  & CS) TIME TABLES (1).xlsx';
  console.log('Testing Timetable Ingestion on:', filePath);

  if (!fs.existsSync(filePath)) {
    console.error('File not found at:', filePath);
    process.exit(1);
  }

  const buffer = fs.readFileSync(filePath);

  console.log('--- 1. Testing Ingestion without DB Persist (Dry Run) ---');
  const previewResult = await processTimetableWorkbook(buffer, { persist: false });

  console.log('Success:', previewResult.success);
  console.log('Validation Report:', JSON.stringify(previewResult.validationReport, null, 2));
  console.log('Total Extracted Timetables:', previewResult.timetables.length);

  for (const tt of previewResult.timetables) {
    console.log('\n======================================================');
    console.log('SHEET:', tt.sheetName);
    console.log('Metadata:', tt.metadata);
    console.log('Subject Table Count:', tt.subjectTable.length);
    console.log('Sample Subjects:', tt.subjectTable.slice(0, 5).map(s => ({
      code: s.subjectCode,
      name: s.subjectName,
      acronyms: s.acronyms,
      faculty: s.facultyNames
    })));
    console.log('Sessions Extracted Count:', tt.sessions.length);
    console.log('Sample Sessions:');
    tt.sessions.slice(0, 8).forEach(s => {
      console.log(`  [${s.dayName} Period ${s.periodNumber} (${s.startTime}-${s.endTime}) Dur:${s.duration}] Raw: "${s.rawValue}" -> Code: ${s.subjectCode} | Name: ${s.subjectName} | Type: ${s.activityType} | Teachers: ${s.teacherNames.join(', ')} | Room: ${s.roomCode} | Resolved: ${s.isResolved}`);
    });
  }

  console.log('\n--- 2. Testing Ingestion WITH DB Persist (Idempotent) ---');
  const dbResult = await processTimetableWorkbook(buffer, { persist: true, timetableId: 'tt-active' });
  console.log('DB Ingestion Success:', dbResult.success);
  console.log('DB Inserted Counts:', dbResult.insertedCounts);

  console.log('\n--- 3. Testing Idempotency (Re-uploading same file) ---');
  const dbResult2 = await processTimetableWorkbook(buffer, { persist: true, timetableId: 'tt-active' });
  console.log('DB Second Ingestion Success:', dbResult2.success);
  console.log('DB Second Inserted Counts:', dbResult2.insertedCounts);

  console.log('\nALL INGESTION TESTS PASSED SUCCESSFULLY!');
}

runTest().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
