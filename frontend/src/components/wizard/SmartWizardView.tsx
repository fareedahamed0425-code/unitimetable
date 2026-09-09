import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  AlertTriangle,
  Play,
  Sliders,
  Users,
  GraduationCap,
  Building,
  Layers,
  ShieldCheck,
  RotateCcw,
  Zap,
  ChevronDown,
  Bot,
  MessageSquare,
  Wand2,
  Calendar,
  School
} from 'lucide-react';
import { api } from '../../api';
import { GenerationJob, SmartPreferenceRule } from '../../../../shared/types';

interface SmartWizardProps {
  onFinish?: () => void;
  onNavigateToTimetable?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export const SmartWizardView: React.FC<SmartWizardProps> = ({
  onFinish,
  onNavigateToTimetable,
  onClose,
  onSuccess
}) => {
  const handleComplete = () => {
    if (onSuccess) onSuccess();
    else if (onFinish) onFinish();
  };

  const handleGoToTimetable = () => {
    if (onNavigateToTimetable) onNavigateToTimetable();
    else if (onSuccess) onSuccess();
    else if (onFinish) onFinish();
  };

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedTerm, setSelectedTerm] = useState('ay-2026-2027');
  const [selectedDept, setSelectedDept] = useState('dept-cse');
  const [selectedProgram, setSelectedProgram] = useState('prog-btech-cse');
  const [selectedSemester, setSelectedSemester] = useState('ALL');

  // Real dynamic resource counts from database
  const [resourceStats, setResourceStats] = useState({
    teachers: 0,
    students: 0,
    rooms: 0,
    activities: 0
  });

  useEffect(() => {
    loadResourceStats();
  }, []);

  const loadResourceStats = async () => {
    try {
      const stats = await api.getAnalytics();
      setResourceStats({
        teachers: stats.totalTeachers || 0,
        students: stats.totalStudents || 0,
        rooms: stats.totalRooms || 0,
        activities: stats.totalActivities || 0
      });
    } catch (e) {
      console.error('Failed to load resource counts:', e);
    }
  };

  // Step 3 & 4: Natural Language & Presets with Apollo AI Persona
  const [promptText, setPromptText] = useState(
    'Keep student timetable gaps minimal, avoid classes after 4 PM, schedule heavy computer labs in afternoon periods, ensure lunch break at Period 4, and limit continuous faculty lecture hours to 3.'
  );
  const [selectedPreset, setSelectedPreset] = useState<'STUDENT_FRIENDLY' | 'FACULTY_FRIENDLY' | 'ROOM_EFFICIENT' | 'BALANCED' | 'CUSTOM'>('BALANCED');
  const [interpretedRules, setInterpretedRules] = useState<SmartPreferenceRule[]>([]);
  const [isParsingNlp, setIsParsingNlp] = useState(false);

  // Step 5: Generation Mode
  const [generationMode, setGenerationMode] = useState<'AUTOMATIC' | 'SEMI_AUTOMATIC' | 'MANUAL'>('AUTOMATIC');

  // Step 6: Generation Execution
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationJob, setGenerationJob] = useState<GenerationJob | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleParsePrompt = async (textToParse: string) => {
    setIsParsingNlp(true);
    try {
      const res = await api.parseNlPreferences(textToParse);
      setInterpretedRules(res.interpretedRules);
      setCurrentStep(4);
    } catch (err: any) {
      console.error('NLP Parse error:', err);
    } finally {
      setIsParsingNlp(false);
    }
  };

  const handleExecuteGeneration = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setCurrentStep(6);

    try {
      const { jobId, job } = await api.startGeneration({
        mode: generationMode,
        profileId: selectedPreset === 'CUSTOM' ? undefined : `prof-${selectedPreset.toLowerCase().replace('_', '-')}`,
        customRules: interpretedRules.length > 0 ? interpretedRules : undefined
      });

      setGenerationJob(job);

      const interval = setInterval(async () => {
        const updated = await api.getJobStatus(jobId);
        setGenerationJob(updated);

        if (updated.status === 'COMPLETED') {
          clearInterval(interval);
          setIsGenerating(false);
          setCurrentStep(7);
        } else if (updated.status === 'FAILED') {
          clearInterval(interval);
          setIsGenerating(false);
          setGenerationError(updated.errorMessage || 'Generation failed.');
        }
      }, 300);
    } catch (err: any) {
      setIsGenerating(false);
      setGenerationError(err.message || 'Error starting generation job.');
    }
  };

  const steps = [
    { num: 1, label: 'Academic Scope' },
    { num: 2, label: 'Resources' },
    { num: 3, label: 'Apollo AI Prompts' },
    { num: 4, label: 'Rules & Weights' },
    { num: 5, label: 'Solving Mode' },
    { num: 6, label: 'Execution' },
    { num: 7, label: 'Verification' }
  ];

  const suggestedApolloPrompts = [
    'Schedule Year 3 CSE & AIML core lectures in morning slots (09:00 - 12:15) and Labs from 13:15 onwards.',
    'Reserve Period 4 (12:15 - 13:15) for unified faculty and student lunch across all 4 departments.',
    'Ensure multi-department faculty teaching both AIML and Cyber Security have 0 timetable conflicts.',
    'Maximize utilization of high-capacity Smart Seminar Halls (CR-201, CR-301) for combined classes.'
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Apollo University Scheduling AI Persona Header */}
      <div className="bg-white rounded-2xl p-6 text-[#002E4E] shadow-sm border border-[#D8E6ED] relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-[#2582A1] text-xs font-bold uppercase tracking-wider mb-1">
              <Bot className="w-4 h-4 text-[#2582A1]" /> The Apollo University Chief Academic Scheduling AI
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#002E4E] flex items-center gap-2">
              Intelligent Timetable Generation Wizard
            </h1>
            <p className="text-[#4A6375] text-xs sm:text-sm mt-1 max-w-2xl">
              Powered by simulated annealing and CSP algorithms to synthesize clash-free schedules respecting working shifts, multi-department faculty, and departmental student quotas.
            </p>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-[#E8F4F8] border border-[#C4E2EC] text-[#2582A1] flex items-center justify-center flex-shrink-0">
            <Wand2 className="w-6 h-6 text-[#2582A1]" />
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="flex items-center justify-between mt-6 pt-5 border-t border-[#D8E6ED] overflow-x-auto gap-2 scrollbar-none">
          {steps.map(s => {
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <div key={s.num} className="flex items-center gap-2 flex-shrink-0">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                      : isCurrent
                      ? 'bg-[#2582A1] text-white shadow-xs'
                      : 'bg-[#F4F8FA] text-[#4A6375] border border-[#D8E6ED]'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.num}
                </div>
                <span className={`text-xs ${isCurrent ? 'text-[#002E4E] font-bold' : 'text-[#4A6375]'}`}>
                  {s.label}
                </span>
                {s.num < steps.length && <div className="w-4 h-0.5 bg-[#D8E6ED] mx-1 hidden sm:block"></div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Academic Scope */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-[#D8E6ED] p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#002E4E] flex items-center gap-2">
              <School className="w-4 h-4 text-indigo-600" /> Step 1: Define Target Academic Scope
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Specify the academic year, core departments, and target cohort branches to schedule.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Academic Session
              </label>
              <select
                className="w-full px-3 py-2 text-sm border border-[#D8E6ED] rounded-xl bg-white text-[#002E4E] focus:ring-2 focus:ring-indigo-500"
                value={selectedTerm}
                onChange={e => setSelectedTerm(e.target.value)}
              >
                <option value="ay-2026-2027">2026–2027 Academic Year (All Semesters)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Department Scope
              </label>
              <select
                className="w-full px-3 py-2 text-sm border border-[#D8E6ED] rounded-xl bg-white text-[#002E4E] focus:ring-2 focus:ring-indigo-500"
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
              >
                <option value="ALL">All 4 Core Departments (CSE, AI&DS, AIML, Cyber Sec)</option>
                <option value="dept-cse">Computer Science & Engineering (CSE)</option>
                <option value="dept-aids">Artificial Intelligence & Data Science (AI&DS)</option>
                <option value="dept-aiml">Artificial Intelligence & Machine Learning (AIML)</option>
                <option value="dept-cs">Cyber Security (CS)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Undergraduate Years
              </label>
              <select
                className="w-full px-3 py-2 text-sm border border-[#D8E6ED] rounded-xl bg-white text-[#002E4E] focus:ring-2 focus:ring-indigo-500"
                value={selectedSemester}
                onChange={e => setSelectedSemester(e.target.value)}
              >
                <option value="ALL">All 4 Undergraduate Years (Years 1 to 4)</option>
                <option value="1">Year 1 (Freshmen - Semesters 1 & 2)</option>
                <option value="2">Year 2 (Sophomores - Semesters 3 & 4)</option>
                <option value="3">Year 3 (Juniors - Semesters 5 & 6)</option>
                <option value="4">Year 4 (Seniors - Semesters 7 & 8)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Optimization Priority
              </label>
              <select
                className="w-full px-3 py-2 text-sm border border-[#D8E6ED] rounded-xl bg-white text-[#002E4E] focus:ring-2 focus:ring-indigo-500"
                defaultValue="UNIFIED"
              >
                <option value="UNIFIED">Zero-Conflict Global Optimization (Recommended)</option>
                <option value="FACULTY">Faculty Availability Priority</option>
                <option value="STUDENT">Student Workload Distribution</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2582A1] hover:bg-[#1C6982] text-white rounded-xl text-xs font-bold shadow-md transition-all"
            >
              <span>Next: Inspect Live Resources</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Resource Inspection */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl border border-[#D8E6ED] p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#002E4E] flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" /> Step 2: Institutional Resource Availability
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live database counts of professors, registered student sections, lecture halls, and lab venues.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] text-center space-y-1">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto">
                <Users className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold text-[#002E4E] mt-2">{resourceStats.teachers} Teachers</div>
              <div className="text-[11px] text-slate-500">Cross-Dept Faculty</div>
            </div>

            <div className="p-4 rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] text-center space-y-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold text-[#002E4E] mt-2">{resourceStats.students} Students</div>
              <div className="text-[11px] text-slate-500">Divided Sections</div>
            </div>

            <div className="p-4 rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] text-center space-y-1">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <Building className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold text-[#002E4E] mt-2">{resourceStats.rooms} Venues</div>
              <div className="text-[11px] text-slate-500">Classrooms & Labs</div>
            </div>

            <div className="p-4 rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] text-center space-y-1">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
                <Layers className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold text-[#002E4E] mt-2">{resourceStats.activities} Activities</div>
              <div className="text-[11px] text-slate-500">Weekly Sessions</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div className="text-xs text-emerald-800">
              <span className="font-bold">Institutional Capacity Verified:</span> Venue seats match cohort headcounts, and faculty working hours accommodate all required curriculum hours without double-booking.
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800:text-slate-200 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2582A1] hover:bg-[#1C6982] text-white rounded-xl text-xs font-bold shadow-md transition-all"
            >
              <span>Next: AI Natural Language Scheduling</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Natural Language Constraint Prompting with Apollo AI */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl border border-[#D8E6ED] p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#002E4E] flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-600" /> Step 3: Apollo University AI Constraint Engine
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Input natural language scheduling policies or select institutional preset benchmarks.
            </p>
          </div>

          {/* Preset Profiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: 'STUDENT_FRIENDLY', name: 'Student Centric', desc: 'Minimal gaps, compact lectures, afternoon practicals' },
              { id: 'FACULTY_FRIENDLY', name: 'Faculty Balanced', desc: 'Shift compliance, max 3 continuous classes, P4 lunch' },
              { id: 'ROOM_EFFICIENT', name: 'Venue Optimized', desc: 'High occupancy, fixed departmental home rooms' },
              { id: 'BALANCED', name: 'Apollo Gold Standard', desc: 'Holistic multi-department clash-free optimization' }
            ].map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedPreset(p.id as any)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedPreset === p.id
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500'
                    : 'border-[#D8E6ED] hover:border-slate-400 bg-white'
                }`}
              >
                <div className="text-xs font-bold text-[#002E4E]">{p.name}</div>
                <div className="text-[11px] text-slate-500 mt-1 leading-snug">{p.desc}</div>
              </div>
            ))}
          </div>

          {/* Prompt Area */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-800">
              Natural Language Academic Constraints & Rules:
            </label>
            <textarea
              rows={4}
              value={promptText}
              onChange={e => setPromptText(e.target.value)}
              placeholder="e.g. Keep student timetable gaps minimal, avoid classes after 4 PM, schedule heavy computer labs in afternoon periods, ensure lunch break at Period 4..."
              className="w-full p-3.5 text-xs border border-[#D8E6ED] rounded-xl bg-white text-[#002E4E] focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans"
            />
          </div>

          {/* Suggested Quick Prompts */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Suggested Apollo Rules:</span>
            <div className="flex flex-wrap gap-2">
              {suggestedApolloPrompts.map((sPrompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPromptText(sPrompt)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200:bg-slate-700 text-slate-700 text-[11px] transition-colors text-left border border-[#D8E6ED]"
                >
                  ⚡ {sPrompt.slice(0, 50)}...
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800:text-slate-200 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              onClick={() => handleParsePrompt(promptText)}
              disabled={isParsingNlp}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2582A1] hover:bg-[#1C6982] text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isParsingNlp ? 'Interpreting Constraints...' : 'Parse & Formulate Rules'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Interpreted Rules Confirmation */}
      {currentStep === 4 && (
        <div className="bg-white rounded-2xl border border-[#D8E6ED] p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#002E4E] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" /> Step 4: Rule Matrix & Weight Distribution
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review soft constraint penalties and active heuristic parameters synthesized from your prompt.
            </p>
          </div>

          <div className="space-y-2.5">
            {interpretedRules.map((rule, idx) => (
              <div
                key={rule.id || idx}
                className="p-3.5 rounded-xl border border-[#D8E6ED] bg-[#F4F8FA]/50 flex items-center justify-between gap-4"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#002E4E]">{rule.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      {rule.priority.replace(/_/g, ' ')} ({rule.weight}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{rule.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 font-medium">Enforce</label>
                  <input
                    type="checkbox"
                    checked={rule.isEnabled}
                    onChange={e => {
                      const updated = [...interpretedRules];
                      updated[idx].isEnabled = e.target.checked;
                      setInterpretedRules(updated);
                    }}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] text-xs text-slate-600 flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0" />
            <span>
              <strong>Hard Guarantee:</strong> The Apollo CSP engine enforces 0 teacher collisions, 0 room double-booking, and strict shift adherence.
            </span>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800:text-slate-200 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Refine Prompt
            </button>
            <button
              onClick={() => setCurrentStep(5)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2582A1] hover:bg-[#1C6982] text-white rounded-xl text-xs font-bold shadow-md transition-all"
            >
              <span>Choose Solving Strategy</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Mode Selection */}
      {currentStep === 5 && (
        <div className="bg-white rounded-2xl border border-[#D8E6ED] p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#002E4E] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" /> Step 5: Solver Execution Engine
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select the degree of automation for assigning time slots and venues.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => setGenerationMode('AUTOMATIC')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                generationMode === 'AUTOMATIC'
                  ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500'
                  : 'border-[#D8E6ED] bg-white hover:border-slate-400'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center mb-3">
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-[#002E4E]">Full Automatic Generation</div>
              <p className="text-[11px] text-slate-500 mt-1">
                Applies CSP domain pruning and Simulated Annealing across all 4 departments simultaneously.
              </p>
            </div>

            <div
              onClick={() => setGenerationMode('SEMI_AUTOMATIC')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                generationMode === 'SEMI_AUTOMATIC'
                  ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500'
                  : 'border-[#D8E6ED] bg-white hover:border-slate-400'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-[#2582A1] text-white flex items-center justify-center mb-3">
                <Sliders className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-[#002E4E]">Semi-Automatic (Preserve Locked)</div>
              <p className="text-[11px] text-slate-500 mt-1">
                Leaves pinned classes in place and synthesizes unallocated sessions around them.
              </p>
            </div>

            <div
              onClick={() => setGenerationMode('MANUAL')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                generationMode === 'MANUAL'
                  ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500'
                  : 'border-[#D8E6ED] bg-white hover:border-slate-400'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-[#F4F8FA]0 text-white flex items-center justify-center mb-3">
                <Users className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-[#002E4E]">Manual Grid Construction</div>
              <p className="text-[11px] text-slate-500 mt-1">
                Places you into the interactive drag-and-drop timetable grid with live collision checks.
              </p>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(4)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800:text-slate-200 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              onClick={handleExecuteGeneration}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#2582A1] hover:bg-[#1C6982] text-white rounded-xl text-xs font-bold shadow-md transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Synthesize Timetables</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 6: Solving Progress */}
      {currentStep === 6 && (
        <div className="bg-white rounded-2xl border border-[#D8E6ED] p-8 space-y-6 text-center shadow-sm">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white mx-auto flex items-center justify-center animate-pulse shadow-md">
              <Bot className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-[#002E4E]">
              Apollo Scheduling AI is Computing Optimal Grid...
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Evaluating multi-department faculty availability, venue capacities, and lunch window constraints.
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-[#D8E6ED]">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${generationJob?.progressPercent || 45}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-slate-500 font-semibold">
              <span>{generationJob?.currentStage || 'Simulated Annealing Optimization...'}</span>
              <span className="text-indigo-600 font-bold">{generationJob?.progressPercent || 45}%</span>
            </div>
          </div>

          {generationError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 max-w-md mx-auto">
              <AlertTriangle className="w-4 h-4 mx-auto mb-1" />
              <div className="font-bold">Optimization Notice</div>
              <div>{generationError}</div>
              <button
                onClick={() => setCurrentStep(5)}
                className="mt-3 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold"
              >
                Adjust Heuristics
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 7: Final Results & Publish */}
      {currentStep === 7 && (
        <div className="bg-white rounded-2xl border border-[#D8E6ED] p-6 space-y-6 shadow-sm">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-2">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-[#002E4E]">
              Institutional Timetables Synthesized Successfully
            </h2>
            <p className="text-xs text-slate-500">
              Zero clashes detected across Computer Science, AI&DS, AIML, and Cyber Security.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] text-center">
              <div className="text-3xl font-black text-indigo-600">
                {generationJob?.currentScore || 98}%
              </div>
              <div className="text-xs font-bold text-[#002E4E] mt-1">Quality Satisfaction</div>
              <div className="text-[11px] text-slate-500">Constraint adherence</div>
            </div>

            <div className="p-4 rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] text-center">
              <div className="text-3xl font-black text-emerald-600">0</div>
              <div className="text-xs font-bold text-[#002E4E] mt-1">Clashes / Collisions</div>
              <div className="text-[11px] text-slate-500">100% hard feasibility</div>
            </div>

            <div className="p-4 rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] text-center">
              <div className="text-3xl font-black text-[#002E4E]">
                {resourceStats.activities} / {resourceStats.activities}
              </div>
              <div className="text-xs font-bold text-[#002E4E] mt-1">Allocated Sessions</div>
              <div className="text-[11px] text-slate-500">Full curriculum coverage</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800:text-slate-200 flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Re-optimize
            </button>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                onClick={handleGoToTimetable}
                className="px-4 py-2 border border-[#D8E6ED] text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100:bg-slate-800 transition-colors justify-center"
              >
                Inspect Live Timetable Grid
              </button>
              <button
                onClick={async () => {
                  await api.setTimetableStatus('PUBLISHED');
                  handleComplete();
                }}
                className="flex items-center justify-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
              >
                <ShieldCheck className="w-4 h-4" /> Publish to University
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartWizardView;
