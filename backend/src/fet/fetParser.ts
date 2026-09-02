import { XMLParser } from 'fast-xml-parser';
import { FETCompatibilityReport } from '../../../shared/types';

export interface FETParsedData {
  institutionName: string;
  comments?: string;
  days: string[];
  hours: string[];
  teachers: { name: string }[];
  years: { name: string; groups: { name: string; subgroups: { name: string }[] }[] }[];
  subjects: { name: string }[];
  activityTags: { name: string }[];
  activities: {
    id: number;
    teacherNames: string[];
    subjectName: string;
    activityTag?: string;
    studentYearNames: string[];
    duration: number;
    totalStudents: number;
  }[];
  buildings: { name: string }[];
  rooms: { name: string; buildingName?: string; capacity: number }[];
  timeConstraints: any[];
  spaceConstraints: any[];
}

export class FETParser {
  public static parse(xmlContent: string, fileName: string = 'timetable.fet'): { data: FETParsedData; report: FETCompatibilityReport } {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      allowBooleanAttributes: true
    });

    const parsed = parser.parse(xmlContent);
    const fetRoot = parsed.fet || parsed;

    const institutionName = fetRoot.Institution_Name || 'Imported University Timetable';
    const comments = fetRoot.Comments || '';

    // Days
    const daysRaw = fetRoot.Days_List?.Day || [];
    const days = Array.isArray(daysRaw) ? daysRaw.map(d => (typeof d === 'object' ? d.Name : d)) : [typeof daysRaw === 'object' ? daysRaw.Name : daysRaw];

    // Hours
    const hoursRaw = fetRoot.Hours_List?.Hour || [];
    const hours = Array.isArray(hoursRaw) ? hoursRaw.map(h => (typeof h === 'object' ? h.Name : h)) : [typeof hoursRaw === 'object' ? hoursRaw.Name : hoursRaw];

    // Teachers
    const teachersRaw = fetRoot.Teachers_List?.Teacher || [];
    const teachers = (Array.isArray(teachersRaw) ? teachersRaw : [teachersRaw]).filter(Boolean).map(t => ({
      name: typeof t === 'object' ? t.Name : String(t)
    }));

    // Students (Years -> Groups -> Subgroups)
    const yearsRaw = fetRoot.Students_List?.Year || [];
    const years = (Array.isArray(yearsRaw) ? yearsRaw : [yearsRaw]).filter(Boolean).map(y => {
      const groupsRaw = y.Group || [];
      const groups = (Array.isArray(groupsRaw) ? groupsRaw : [groupsRaw]).filter(Boolean).map(g => {
        const subgroupsRaw = g.Subgroup || [];
        const subgroups = (Array.isArray(subgroupsRaw) ? subgroupsRaw : [subgroupsRaw]).filter(Boolean).map(sg => ({
          name: typeof sg === 'object' ? sg.Name : String(sg)
        }));
        return {
          name: typeof g === 'object' ? g.Name : String(g),
          subgroups
        };
      });
      return {
        name: typeof y === 'object' ? y.Name : String(y),
        groups
      };
    });

    // Subjects
    const subjectsRaw = fetRoot.Subjects_List?.Subject || [];
    const subjects = (Array.isArray(subjectsRaw) ? subjectsRaw : [subjectsRaw]).filter(Boolean).map(s => ({
      name: typeof s === 'object' ? s.Name : String(s)
    }));

    // Activity Tags
    const tagsRaw = fetRoot.Activity_Tags_List?.Activity_Tag || [];
    const activityTags = (Array.isArray(tagsRaw) ? tagsRaw : [tagsRaw]).filter(Boolean).map(tag => ({
      name: typeof tag === 'object' ? tag.Name : String(tag)
    }));

    // Activities
    const activitiesRaw = fetRoot.Activities_List?.Activity || [];
    const activities = (Array.isArray(activitiesRaw) ? activitiesRaw : [activitiesRaw]).filter(Boolean).map(a => {
      const teachRaw = a.Teacher || [];
      const teacherNames = Array.isArray(teachRaw) ? teachRaw : [teachRaw].filter(Boolean);
      const studentRaw = a.Students || [];
      const studentYearNames = Array.isArray(studentRaw) ? studentRaw : [studentRaw].filter(Boolean);

      return {
        id: parseInt(a.Id || '0', 10),
        teacherNames: teacherNames.map(String),
        subjectName: String(a.Subject || 'General Subject'),
        activityTag: a.Activity_Tag ? String(a.Activity_Tag) : undefined,
        studentYearNames: studentYearNames.map(String),
        duration: parseInt(a.Duration || '1', 10),
        totalStudents: parseInt(a.Total_Students || '60', 10)
      };
    });

    // Buildings & Rooms
    const buildingsRaw = fetRoot.Buildings_List?.Building || [];
    const buildings = (Array.isArray(buildingsRaw) ? buildingsRaw : [buildingsRaw]).filter(Boolean).map(b => ({
      name: typeof b === 'object' ? b.Name : String(b)
    }));

    const roomsRaw = fetRoot.Rooms_List?.Room || [];
    const rooms = (Array.isArray(roomsRaw) ? roomsRaw : [roomsRaw]).filter(Boolean).map(r => ({
      name: typeof r === 'object' ? r.Name : String(r),
      buildingName: r.Building ? String(r.Building) : undefined,
      capacity: parseInt(r.Capacity || '60', 10)
    }));

    // Constraints
    const timeConstraints = fetRoot.Time_Constraints_List ? Object.keys(fetRoot.Time_Constraints_List) : [];
    const spaceConstraints = fetRoot.Space_Constraints_List ? Object.keys(fetRoot.Space_Constraints_List) : [];

    const supportedCount = teachers.length + subjects.length + activities.length + rooms.length + days.length + hours.length;
    const convertedCount = timeConstraints.length + spaceConstraints.length;

    const report: FETCompatibilityReport = {
      fileName,
      supportedEntitiesCount: supportedCount,
      convertedEntitiesCount: convertedCount,
      unsupportedEntitiesCount: 0,
      warnings: [],
      details: {
        institutionName,
        daysCount: days.length,
        hoursCount: hours.length,
        teachersCount: teachers.length,
        studentsYearsCount: years.length,
        subjectsCount: subjects.length,
        activityTagsCount: activityTags.length,
        activitiesCount: activities.length,
        buildingsCount: buildings.length,
        roomsCount: rooms.length,
        timeConstraintsCount: timeConstraints.length,
        spaceConstraintsCount: spaceConstraints.length
      }
    };

    return {
      data: {
        institutionName,
        comments,
        days,
        hours,
        teachers,
        years,
        subjects,
        activityTags,
        activities,
        buildings,
        rooms,
        timeConstraints,
        spaceConstraints
      },
      report
    };
  }
}
