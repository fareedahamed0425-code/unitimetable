const fs = require('fs');
const path = require('path');

const filesToClean = [
  '../frontend/src/components/wizard/SmartWizardView.tsx',
  '../frontend/src/components/cohorts/CohortHierarchyManagerView.tsx',
  '../frontend/src/components/faculty/FacultyPortalView.tsx',
  '../frontend/src/components/faculty/FacultyConstraintsModal.tsx'
];

for (const relPath of filesToClean) {
  const filePath = path.resolve(__dirname, relPath);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace dark: classes with clean light tokens
  // E.g. dark:bg-slate-900, dark:border-slate-800, dark:text-white, dark:text-slate-300, etc.
  content = content.replace(/\sdark:[a-zA-Z0-9_\-\/\[\]#]+/g, '');
  
  // Replace text-slate-900 with text-[#002E4E]
  content = content.replace(/text-slate-900/g, 'text-[#002E4E]');
  // Replace border-slate-200 / border-slate-300 with border-[#D8E6ED]
  content = content.replace(/border-slate-200/g, 'border-[#D8E6ED]');
  content = content.replace(/border-slate-300/g, 'border-[#D8E6ED]');
  // Replace bg-slate-50 with bg-[#F4F8FA]
  content = content.replace(/bg-slate-50/g, 'bg-[#F4F8FA]');
  // Replace text-indigo-600 with text-[#2582A1] where appropriate, or keep indigo as accent
  // Replace bg-indigo-600 with bg-[#2582A1]
  content = content.replace(/bg-indigo-600\s+hover:bg-indigo-700/g, 'bg-[#2582A1] hover:bg-[#1C6982]');

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Cleaned up: ${relPath}`);
}
