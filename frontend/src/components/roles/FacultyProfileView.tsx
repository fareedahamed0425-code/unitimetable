import React, { useState } from 'react';
import {
  UserCheck,
  Calendar,
  Clock,
  Building,
  Download,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Send,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { User, Timetable, Teacher } from '../../../../shared/types';

interface FacultyProfileViewProps {
  currentUser: User | null;
  activeTimetable: Timetable | null;
  onNavigate: (section: string) => void;
}

export const FacultyProfileView: React.FC<FacultyProfileViewProps> = ({
  currentUser,
  activeTimetable,
  onNavigate
}) => {
  const [leaveSubmitted, setLeaveSubmitted] = useState(false);
  const [selectedDay, setSelectedDay] = useState('Wednesday');
  const [leaveReason, setLeaveReason] = useState('Conference / Research Committee');

  // Filter timetable entries for this faculty (or demo fallback)
  const teacherName = currentUser?.name?.replace(/\s*\([^)]*\)/g, '').trim() || 'Dr. Grace Hopper';
  
  const todayClasses = [
    { time: '09:00 - 10:00 AM', course: 'CS301: Data Structures', room: 'Room 302', floor: '3rd Floor, CS Block', cohort: 'B.Tech CSE 3-A', type: 'LECTURE', status: 'COMPLETED' },
    { time: '11:00 - 12:00 PM', course: 'CS305: Advanced Algorithms', room: 'Lecture Hall 101', floor: '1st Floor, Main Block', cohort: 'B.Tech CSE 5-A', type: 'LECTURE', status: 'NEXT_UP' },
    { time: '02:00 - 04:00 PM', course: 'CS301L: Algorithms Lab', room: 'Comp Lab 1', floor: '2nd Floor, CS Block', cohort: 'Group A1 (20 Students)', type: 'LABORATORY', status: 'SCHEDULED' }
  ];

  const assignedCourses = [
    { code: 'CS301', name: 'Data Structures & Algorithms', credits: 4, hoursPerWeek: 4, cohort: 'CSE 3rd Sem (Sec A)' },
    { code: 'CS305', name: 'Advanced Algorithm Design', credits: 3, hoursPerWeek: 3, cohort: 'CSE 5th Sem (Sec A)' },
    { code: 'CS301L', name: 'Algorithms Lab Practical', credits: 2, hoursPerWeek: 4, cohort: 'CSE 3rd Sem (Lab A1/A2)' }
  ];

  const handleExportIcs = () => {
    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//The Apollo University//Faculty Schedule//EN\nBEGIN:VEVENT\nSUMMARY:CS301 Data Structures\nLOCATION:Room 302, CS Block\nDESCRIPTION:The Apollo University\nDTSTART:20260909T090000Z\nDTEND:20260909T100000Z\nEND:VEVENT\nBEGIN:VEVENT\nSUMMARY:CS305 Advanced Algorithms\nLOCATION:Lecture Hall 101\nDTSTART:20260909T110000Z\nDTEND:20260909T120000Z\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Faculty_Schedule_${teacherName.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-full animate-fadeIn">
      {/* Faculty Profile Hero */}
      <div className="lux-card p-6 md:p-8 bg-gradient-to-r from-[#002E4E] via-[#0A3B5C] to-[#2582A1] text-white border-blue-900/40 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-80 h-80 bg-[#FDB931]/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-[#FDB931]/20 text-[#FDB931] border border-[#FDB931]/40">
                Academic Faculty Portal
              </span>
              <span className="text-xs text-teal-100">The Apollo University • School of Technology</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Welcome back, {teacherName}
            </h1>
            <p className="text-xs md:text-sm text-teal-100/90 max-w-2xl leading-relaxed">
              Your personalized teaching routine, room guides, assigned student cohorts, and preference adjustment desk.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportIcs}
              className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#FDB931] text-[#002E4E] hover:bg-[#e5a624] transition-all flex items-center gap-2 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export to Calendar (.ics)</span>
            </button>

            <button
              onClick={() => onNavigate('timetable')}
              className="px-3.5 py-2.5 rounded-lg text-xs font-semibold bg-[#2582A1]/40 hover:bg-[#2582A1]/70 text-white border border-teal-300/30 transition-all flex items-center gap-2"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>My Weekly Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Next Class Alert Banner */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Next Upcoming Lecture</div>
            <div className="text-sm font-bold text-amber-950">CS305: Advanced Algorithm Design (11:00 AM)</div>
            <div className="text-xs text-amber-800">Venue: Lecture Hall 101 • 1st Floor, Main Academic Wing</div>
          </div>
        </div>
        <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-200/60 text-amber-900 border border-amber-300 self-start sm:self-auto">
          Starts in 25 Minutes
        </span>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="lux-card p-5 bg-white border-[#E8E7E3]">
          <div className="text-[11px] font-bold text-[#8B8E99] uppercase tracking-wider">Weekly Teaching Load</div>
          <div className="text-2xl font-bold text-[#121316] mt-2">14 Hours</div>
          <div className="text-[11px] text-[#8B8E99] mt-1">Cap: 16 Hours / Week (Optimal)</div>
        </div>

        <div className="lux-card p-5 bg-white border-[#E8E7E3]">
          <div className="text-[11px] font-bold text-[#8B8E99] uppercase tracking-wider">Today's Lectures</div>
          <div className="text-2xl font-bold text-[#121316] mt-2">3 Classes</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">1 Done • 2 Remaining</div>
        </div>

        <div className="lux-card p-5 bg-white border-[#E8E7E3]">
          <div className="text-[11px] font-bold text-[#8B8E99] uppercase tracking-wider">Idle Gap Quality</div>
          <div className="text-2xl font-bold text-[#121316] mt-2">0 Split Gaps</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">Compact Schedule</div>
        </div>

        <div className="lux-card p-5 bg-white border-[#E8E7E3]">
          <div className="text-[11px] font-bold text-[#8B8E99] uppercase tracking-wider">Assigned Courses</div>
          <div className="text-2xl font-bold text-[#121316] mt-2">3 Subjects</div>
          <div className="text-[11px] text-[#8B8E99] mt-1">2 Theory • 1 Lab Batch</div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule Timeline */}
        <div className="lg:col-span-2 lux-card p-6 bg-white border-[#E8E7E3] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#121316]">Today's Teaching Schedule (Wednesday)</h3>
              <p className="text-xs text-[#8B8E99]">Real-time daily timeline with venue and cohort details</p>
            </div>
            <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
              3 Classes Total
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {todayClasses.map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  item.status === 'NEXT_UP'
                    ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-400/20'
                    : item.status === 'COMPLETED'
                    ? 'bg-[#F9F9F8] border-[#E8E7E3] opacity-75'
                    : 'bg-white border-[#E8E7E3]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#121316]">{item.time}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      item.type === 'LABORATORY' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.type}
                    </span>
                    {item.status === 'NEXT_UP' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white animate-pulse">
                        NEXT
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-[#121316]">{item.course}</div>
                  <div className="text-xs text-[#575A65] flex items-center gap-2">
                    <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5 text-[#8B8E99]" /> {item.room} ({item.floor})</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5 text-[#8B8E99]" /> {item.cohort}</span>
                  </div>
                </div>

                <div className="self-start sm:self-auto">
                  {item.status === 'COMPLETED' ? (
                    <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Concluded
                    </span>
                  ) : item.status === 'NEXT_UP' ? (
                    <span className="text-xs font-bold text-amber-700">Starts at 11:00 AM</span>
                  ) : (
                    <span className="text-xs text-[#8B8E99]">Scheduled</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Submit Availability / Leave Request */}
        <div className="lux-card p-6 bg-white border-[#E8E7E3] space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#121316]">Submit Teaching Preferences</h3>
            <p className="text-xs text-[#8B8E99]">Inform the timetable coordinator of unavailability or preferred slots</p>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <label className="text-[11px] font-bold text-[#575A65] uppercase">Target Day</label>
              <select
                value={selectedDay}
                onChange={e => setSelectedDay(e.target.value)}
                className="lux-input w-full text-xs mt-1 bg-[#F9F9F8] border-[#E8E7E3]"
              >
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#575A65] uppercase">Reason / Preference</label>
              <input
                type="text"
                value={leaveReason}
                onChange={e => setLeaveReason(e.target.value)}
                placeholder="e.g. Research seminar / Unavailability"
                className="lux-input w-full text-xs mt-1 bg-[#F9F9F8] border-[#E8E7E3]"
              />
            </div>

            <button
              onClick={() => {
                setLeaveSubmitted(true);
                setTimeout(() => setLeaveSubmitted(false), 4000);
              }}
              className="w-full py-2.5 rounded-lg text-xs font-semibold bg-[#121316] text-white hover:bg-black transition-all flex items-center justify-center gap-2 mt-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit to Coordinator</span>
            </button>

            {leaveSubmitted && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Preference logged! The AI solver will prioritize this in the next optimization run.</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#E8E7E3]">
            <button
              onClick={() => onNavigate('availability')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
            >
              <span>Open Full Availability Matrix</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Assigned Courses Directory */}
      <div className="lux-card p-6 bg-white border-[#E8E7E3] space-y-4">
        <h3 className="text-sm font-bold text-[#121316]">My Assigned Courses & Syllabi</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {assignedCourses.map((course, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#F9F9F8] border border-[#E8E7E3] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#121316]">{course.code}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                  {course.credits} Credits
                </span>
              </div>
              <div className="text-xs font-semibold text-[#121316]">{course.name}</div>
              <div className="text-[11px] text-[#575A65]">{course.cohort}</div>
              <div className="text-[11px] font-medium text-teal-700">{course.hoursPerWeek} Teaching Hours / Week</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FacultyProfileView;
