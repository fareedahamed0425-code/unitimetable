const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'src', 'components', 'timetable', 'TimetableExplorerView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Import OfficialTimetableModal
if (!content.includes('OfficialTimetableModal')) {
  content = content.replace(
    `import { api } from '../../api';`,
    `import { api } from '../../api';\nimport { OfficialTimetableModal } from './OfficialTimetableModal';\nimport { exportOfficialTimetableExcel } from './officialTimetableExporter';`
  );
}

// 2. Add state isOfficialModalOpen
if (!content.includes('isOfficialModalOpen')) {
  content = content.replace(
    `  const [cleanStatusMessage, setCleanStatusMessage] = useState<{ success: boolean; text: string } | null>(null);`,
    `  const [cleanStatusMessage, setCleanStatusMessage] = useState<{ success: boolean; text: string } | null>(null);\n  const [isOfficialModalOpen, setIsOfficialModalOpen] = useState(false);`
  );
}

// 3. Add Official Format button in toolbar (around line 1147)
const oldExportSuiteStr = `          {/* Export Suite */}
          <button
            onClick={handleExportCsv}`;

const newExportSuiteStr = `          {/* Official Format Template Download & Print */}
          <button
            onClick={() => setIsOfficialModalOpen(true)}
            title="Open, View, and Download in Official Institutional Template Format"
            className="lux-btn text-xs py-1.5 px-3 bg-[#E8F4F8] border border-[#2582A1]/40 hover:bg-[#D4EAF2] text-[#002E4E] flex items-center gap-1.5 rounded-lg font-bold transition-all shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-[#2582A1]" />
            <span>Official Template Form</span>
          </button>

          {/* Export Suite */}
          <button
            onClick={handleExportCsv}`;

if (content.includes(oldExportSuiteStr) && !content.includes('Official Template Form')) {
  content = content.replace(oldExportSuiteStr, newExportSuiteStr);
}

// 4. Render OfficialTimetableModal before closing div
const modalRender = `
      {/* Official Institutional Timetable Format Modal */}
      <OfficialTimetableModal
        isOpen={isOfficialModalOpen}
        onClose={() => setIsOfficialModalOpen(false)}
        timetable={timetable}
        section={activeSection}
        teachers={teachers}
        courses={courses}
        rooms={rooms}
        activities={activities}
      />
    </div>
  );
};

export default TimetableExplorerView;`;

if (!content.includes('<OfficialTimetableModal') && content.includes('export default TimetableExplorerView;')) {
  content = content.replace(
    `    </div>\n  );\n};\n\nexport default TimetableExplorerView;`,
    modalRender
  );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated TimetableExplorerView.tsx with OfficialTimetableModal!');
