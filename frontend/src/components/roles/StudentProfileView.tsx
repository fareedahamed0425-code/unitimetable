import React, { useState } from 'react';
import {
  GraduationCap,
  Calendar,
  Clock,
  Building,
  Download,
  BookOpen,
  Users,
  CheckCircle2,
  MapPin,
  Coffee,
  Compass,
  FileText,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { User, Timetable } from '../../../../shared/types';

interface StudentProfileViewProps {
  currentUser: User | null;
  activeTimetable: Timetable | null;
  onNavigate: (section: string) => void;
}

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({
  currentUser,
  activeTimetable,
  onNavigate
}) => {
  const studentName = currentUser?.name?.replace(/\s*\([^)]*\)/g, '').trim() || 'Alex Johnson';

  const todayClasses = [
    { time: '09:00 - 10:00 AM', course: 'CS301: Data Structures & Algorithms', instructor: 'Dr. Grace Hopper', room: 'Room 302', floor: '3rd Floor, CS Block', type: 'LECTURE', status: 'COMPLETED' },
    { time: '10:00 - 11:00 AM', course: 'CS302: Operating Systems', instructor: 'Dr. Barbara Liskov', room: 'Room 302', floor: '3rd Floor, CS Block', type: 'LECTURE', status: 'COMPLETED' },
    { time: '11:15 - 01:00 PM', course: 'CS301L: Data Structures Practical Lab', instructor: 'Dr. Grace Hopper', room: 'Comp Lab 1', floor: '2nd Floor, CS Block', type: 'LABORATORY', status: 'NEXT_UP' },
    { time: '01:00 - 02:00 PM', course: 'Recess / Lunch Hour', instructor: '-', room: 'Student Cafeteria & Courtyard', floor: 'Ground Floor', type: 'BREAK', status: 'SCHEDULED' },
    { time: '02:00 - 03:00 PM', course: 'CS304: Database Management Systems', instructor: 'Dr. Donald Knuth', room: 'Lecture Hall 101', floor: '1st Floor, Main Block', type: 'LECTURE', status: 'SCHEDULED' },
    { time: '03:00 - 04:00 PM', course: 'CS305: Computer Networks', instructor: 'Dr. Alan Turing', room: 'Lecture Hall 101', floor: '1st Floor, Main Block', type: 'LECTURE', status: 'SCHEDULED' }
  ];

  const semesterCourses = [
    { code: 'CS301', name: 'Data Structures & Algorithms', instructor: 'Dr. Grace Hopper', credits: 4, room: 'Room 302' },
    { code: 'CS302', name: 'Operating Systems Architecture', instructor: 'Dr. Barbara Liskov', credits: 4, room: 'Room 302' },
    { code: 'CS304', name: 'Database Management Systems', instructor: 'Dr. Donald Knuth', credits: 3, room: 'LH 101' },
    { code: 'CS305', name: 'Computer Networks & Protocols', instructor: 'Dr. Alan Turing', credits: 3, room: 'LH 101' },
    { code: 'CS301L', name: 'Data Structures Laboratory', instructor: 'Dr. Grace Hopper', credits: 2, room: 'Comp Lab 1' },
    { code: 'CS304L', name: 'Database Engineering Lab', instructor: 'Dr. Donald Knuth', credits: 2, room: 'Comp Lab 2' }
  ];

  const freeStudyRooms = [
    { room: 'Room 304 (Seminar Room)', building: 'CS Block, 3rd Floor', freeUntil: '02:00 PM', features: 'AC, Projector, Whiteboard' },
    { room: 'Central Library Study Wing A', building: 'Library, 2nd Floor', freeUntil: '06:00 PM', features: 'Quiet Zone, Power Outlets' },
    { room: 'Comp Lab 3 (Open Access)', building: 'CS Block, 1st Floor', freeUntil: '03:30 PM', features: 'Linux Workstations, Fast WiFi' }
  ];

  const handleDownloadRoutine = () => {
    const routineText = `THE APOLLO UNIVERSITY • SCHOOL OF TECHNOLOGY\nStudent Class Routine • Term: 2026-2027 (Odd Semester)\nStudent: ${studentName}\nProgram: B.Tech Computer Science & Engineering (Semester 3, Section A)\n\nTODAY'S SCHEDULE (Wednesday):\n09:00 - 10:00: CS301 Data Structures (Room 302)\n10:00 - 11:00: CS302 Operating Systems (Room 302)\n11:15 - 13:00: CS301L Algorithms Lab (Comp Lab 1)\n13:00 - 14:00: Lunch Break\n14:00 - 15:00: CS304 DBMS (LH 101)\n15:00 - 16:00: CS305 Computer Networks (LH 101)`;
    const blob = new Blob([routineText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Student_Routine_${studentName.replace(/\s+/g, '_')}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-full animate-fadeIn">
      {/* Student Hero Banner */}
      <div className="apollo-hero-banner p-6 md:p-8 relative">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-80 h-80 bg-[#FDB931]/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="apollo-hero-badge">
                Student Routine Portal
              </span>
              <span className="apollo-hero-sub">The Apollo University • School of Technology</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight apollo-hero-title">
              Hello, {studentName}
            </h1>
            <p className="text-xs md:text-sm apollo-hero-desc max-w-2xl leading-relaxed">
              Your daily lecture routine, classroom locations, lab batch sessions, and campus study spaces.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleDownloadRoutine}
              className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#FDB931] text-[#002E4E] hover:bg-[#e5a624] transition-all flex items-center gap-2 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Routine (PDF/Text)</span>
            </button>

            <button
              onClick={() => onNavigate('timetable')}
              className="px-3.5 py-2.5 rounded-lg text-xs font-semibold bg-[#2582A1]/40 hover:bg-[#2582A1]/70 text-white border border-teal-300/30 transition-all flex items-center gap-2"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Full Section Timetable</span>
            </button>
          </div>
        </div>
      </div>

      {/* Next Class Alert Banner */}
      <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-600 text-white flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Next Upcoming Session</div>
            <div className="text-sm font-bold text-purple-950">CS301L: Data Structures Practical Lab (11:15 AM - 01:00 PM)</div>
            <div className="text-xs text-purple-800">Venue: Computer Lab 1 • 2nd Floor, CS Block • Dr. Grace Hopper</div>
          </div>
        </div>
        <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-200/80 text-purple-900 border border-purple-300 self-start sm:self-auto">
          Starts in 15 Minutes
        </span>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="lux-card p-5 bg-white border-[#E8E7E3]">
          <div className="text-[11px] font-bold text-[#8B8E99] uppercase tracking-wider">Today's Total Classes</div>
          <div className="text-2xl font-bold text-[#121316] mt-2">5 Classes</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">2 Done • 3 Remaining</div>
        </div>

        <div className="lux-card p-5 bg-white border-[#E8E7E3]">
          <div className="text-[11px] font-bold text-[#8B8E99] uppercase tracking-wider">Lunch Break Slot</div>
          <div className="text-2xl font-bold text-[#121316] mt-2">1:00 - 2:00 PM</div>
          <div className="text-[11px] text-[#8B8E99] mt-1">Campus Cafeteria & Courtyard</div>
        </div>

        <div className="lux-card p-5 bg-white border-[#E8E7E3]">
          <div className="text-[11px] font-bold text-[#8B8E99] uppercase tracking-wider">Total Semester Credits</div>
          <div className="text-2xl font-bold text-[#121316] mt-2">18 Credits</div>
          <div className="text-[11px] text-[#8B8E99] mt-1">6 Courses (Theory + Labs)</div>
        </div>

        <div className="lux-card p-5 bg-white border-[#E8E7E3]">
          <div className="text-[11px] font-bold text-[#8B8E99] uppercase tracking-wider">Class Attendance Target</div>
          <div className="text-2xl font-bold text-[#121316] mt-2">92%</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">Well Above 75% Min</div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule Timeline */}
        <div className="lg:col-span-2 lux-card p-6 bg-white border-[#E8E7E3] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#121316]">Today's Routine Timeline (Wednesday)</h3>
              <p className="text-xs text-[#8B8E99]">B.Tech Computer Science & Engineering • Section A</p>
            </div>
            <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-1 rounded border border-sky-200">
              Odd Semester 2026-27
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {todayClasses.map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  item.type === 'BREAK'
                    ? 'bg-amber-50/40 border-amber-200'
                    : item.status === 'NEXT_UP'
                    ? 'bg-purple-50/60 border-purple-300 ring-2 ring-purple-400/20'
                    : item.status === 'COMPLETED'
                    ? 'bg-[#F9F9F8] border-[#E8E7E3] opacity-75'
                    : 'bg-white border-[#E8E7E3]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#121316]">{item.time}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      item.type === 'BREAK'
                        ? 'bg-amber-100 text-amber-800'
                        : item.type === 'LABORATORY'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-sky-100 text-sky-700'
                    }`}>
                      {item.type}
                    </span>
                    {item.status === 'NEXT_UP' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-600 text-white animate-pulse">
                        NEXT
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-[#121316]">{item.course}</div>
                  <div className="text-xs text-[#575A65] flex items-center gap-2">
                    <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5 text-[#8B8E99]" /> {item.room} ({item.floor})</span>
                    {item.instructor !== '-' && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-[#8B8E99]" /> {item.instructor}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="self-start sm:self-auto">
                  {item.status === 'COMPLETED' ? (
                    <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Done
                    </span>
                  ) : item.status === 'NEXT_UP' ? (
                    <span className="text-xs font-bold text-purple-700">Starts at 11:15 AM</span>
                  ) : item.type === 'BREAK' ? (
                    <span className="text-xs font-semibold text-amber-800 flex items-center gap-1">
                      <Coffee className="w-3.5 h-3.5" /> Recess
                    </span>
                  ) : (
                    <span className="text-xs text-[#8B8E99]">Upcoming</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Free Study Rooms & Quiet Study Lounges */}
        <div className="lux-card p-6 bg-white border-[#E8E7E3] space-y-4">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-600" />
            <div>
              <h3 className="text-sm font-bold text-[#121316]">Free Campus Study Venues</h3>
              <p className="text-xs text-[#8B8E99]">Available rooms right now for study and group work</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {freeStudyRooms.map((room, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-[#F9F9F8] border border-[#E8E7E3] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#121316]">{room.room}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Free till {room.freeUntil}
                  </span>
                </div>
                <div className="text-[11px] text-[#575A65]">{room.building}</div>
                <div className="text-[10px] text-[#8B8E99] font-medium">{room.features}</div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#E8E7E3]">
            <button
              onClick={() => onNavigate('infrastructure')}
              className="text-xs font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1"
            >
              <span>Explore All Campus Venues</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Course Directory & Instructors */}
      <div className="lux-card p-6 bg-white border-[#E8E7E3] space-y-4">
        <h3 className="text-sm font-bold text-[#121316]">Enrolled Courses & Course Faculty</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {semesterCourses.map((course, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#F9F9F8] border border-[#E8E7E3] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#121316]">{course.code}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                  {course.credits} Credits
                </span>
              </div>
              <div className="text-xs font-semibold text-[#121316]">{course.name}</div>
              <div className="text-[11px] text-[#575A65]">Instructor: <strong>{course.instructor}</strong></div>
              <div className="text-[11px] text-[#8B8E99]">Primary Venue: {course.room}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentProfileView;
