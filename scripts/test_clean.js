const http = require('http');

async function testClean(mode, timetableId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ mode, timetableId });
    const req = http.request('http://localhost:5000/api/admin/clean-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('Testing TIMETABLE_ENTRIES_ONLY:');
  console.log(await testClean('TIMETABLE_ENTRIES_ONLY', 'tt-active'));

  console.log('\nTesting ALL_TIMETABLES_AND_SESSIONS:');
  console.log(await testClean('ALL_TIMETABLES_AND_SESSIONS'));

  console.log('\nTesting CLEAR_CURRICULUM_AND_ACTIVITIES:');
  console.log(await testClean('CLEAR_CURRICULUM_AND_ACTIVITIES'));

  console.log('\nTesting FULL_FACTORY_RESET:');
  console.log(await testClean('FULL_FACTORY_RESET'));
}

run();
