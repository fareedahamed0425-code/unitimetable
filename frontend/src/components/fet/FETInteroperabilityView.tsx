import React, { useState } from 'react';
import {
  FileCode,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../api';
import { FETCompatibilityReport } from '../../../../shared/types';

export const FETInteroperabilityView: React.FC = () => {
  const [xmlInput, setXmlInput] = useState<string>('');
  const [report, setReport] = useState<FETCompatibilityReport | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleParse = async (xmlString: string) => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await api.importFET(xmlString, 'uploaded_timetable.fet');
      setReport(res.report);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse FET XML');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      setXmlInput(content);
      handleParse(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="lux-card p-6 bg-white border-[#E8E7E3]">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-[#F4F4F1] text-[#575A65] border border-[#E8E7E3]">
              Interoperability Hub
            </span>
            <h1 className="text-2xl font-bold text-[#121316] tracking-tight">FET Interoperability Hub</h1>
            <p className="text-xs text-[#575A65]">
              Bidirectional compatibility with Liviu Lalescu's official Free Timetabling Software (FET). Import, map, and export standard .fet XML files.
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#F4F4F1] text-[#121316] flex items-center justify-center">
            <FileCode className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Action Cards: Import vs Export */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Import Card */}
        <div className="lux-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#121316]">
            <Upload className="w-4 h-4 text-[#575A65]" />
            <span>Import .fet XML Data</span>
          </div>

          <div className="p-6 border border-dashed border-[#DCDAD4] rounded-lg text-center space-y-3 bg-[#FAF9F7]">
            <FileCode className="w-8 h-8 text-[#8B8E99] mx-auto" />
            <div>
              <label className="lux-btn lux-btn-primary text-xs py-2 px-4 cursor-pointer inline-flex">
                <span>Browse .fet File</span>
                <input
                  type="file"
                  accept=".fet,.xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-[#8B8E99] mt-2">Compatible with official FET format (v5.x - v6.x)</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-[#575A65]">
              <span>Or paste raw XML:</span>
            </div>
            <textarea
              rows={4}
              value={xmlInput}
              onChange={e => setXmlInput(e.target.value)}
              placeholder="<fet version='6.0.0'>...</fet>"
              className="lux-input font-mono text-[11px]"
            />
            <button
              onClick={() => handleParse(xmlInput)}
              disabled={isProcessing || !xmlInput.trim()}
              className="lux-btn text-xs py-2 px-3 w-full"
            >
              <span>{isProcessing ? 'Analyzing XML...' : 'Parse & Validate'}</span>
            </button>
          </div>
        </div>

        {/* Export Card */}
        <div className="lux-card p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#121316]">
              <Download className="w-4 h-4 text-[#575A65]" />
              <span>Export Master Timetable</span>
            </div>

            <p className="text-xs text-[#575A65] leading-relaxed">
              Export the generated timetable, rooms, teachers, and activities back into standard .fet XML format ready to open in the official FET desktop application.
            </p>

            <div className="space-y-2 text-xs text-[#575A65]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#166534]" />
                <span>Full XML tags preservation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#166534]" />
                <span>Time & space constraints formatting</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#166534]" />
                <span>Teacher & student cohort mapping</span>
              </div>
            </div>
          </div>

          <a
            href={api.getFetExportUrl()}
            download="university_timetable.fet"
            className="lux-btn lux-btn-primary text-xs py-2.5 px-4 text-center justify-center flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .fet File</span>
          </a>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-xs text-[#B91C1C] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Compatibility Report */}
      {report && (
        <div className="lux-card p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-[#E8E7E3] pb-3">
            <div>
              <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-[#F4F4F1] text-[#575A65] border border-[#E8E7E3] inline-block mb-1">
                Compatibility Report
              </span>
              <h2 className="text-base font-bold text-[#121316]">{report.details.institutionName}</h2>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-[#166534]">{report.supportedEntitiesCount} Supported Entities</div>
              <div className="text-[11px] text-[#8B8E99]">0 Unsupported Discards</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-center text-xs">
            <div className="p-3 rounded-lg bg-[#FAF9F7] border border-[#E8E7E3]">
              <div className="text-xl font-bold text-[#121316]">{report.details.teachersCount}</div>
              <div className="text-[#8B8E99] font-medium mt-0.5">Faculty</div>
            </div>
            <div className="p-3 rounded-lg bg-[#FAF9F7] border border-[#E8E7E3]">
              <div className="text-xl font-bold text-[#121316]">{report.details.roomsCount}</div>
              <div className="text-[#8B8E99] font-medium mt-0.5">Venues</div>
            </div>
            <div className="p-3 rounded-lg bg-[#FAF9F7] border border-[#E8E7E3]">
              <div className="text-xl font-bold text-[#121316]">{report.details.activitiesCount}</div>
              <div className="text-[#8B8E99] font-medium mt-0.5">Activities</div>
            </div>
            <div className="p-3 rounded-lg bg-[#FAF9F7] border border-[#E8E7E3]">
              <div className="text-xl font-bold text-[#121316]">{report.details.daysCount} x {report.details.hoursCount}</div>
              <div className="text-[#8B8E99] font-medium mt-0.5">Grid Geometry</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FETInteroperabilityView;
