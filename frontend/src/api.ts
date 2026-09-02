import {
  Activity,
  AuditLog,
  Building,
  Course,
  EntityAvailability,
  FETCompatibilityReport,
  FETParsedData,
  GenerationJob,
  PreferenceProfile,
  QualityScore,
  Room,
  SmartPreferenceRule,
  Teacher,
  TimeSlot,
  Timetable,
  TimetableConflict,
  User
} from '../../shared/types';

const API_BASE = '/api';

export const api = {
  // Auth
  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/auth/users`);
    const json = await res.json();
    return json.data;
  },

  // Academic Hierarchy
  async getHierarchy(): Promise<any> {
    const res = await fetch(`${API_BASE}/hierarchy`);
    const json = await res.json();
    return json.data;
  },

  // Teachers
  async getTeachers(): Promise<Teacher[]> {
    const res = await fetch(`${API_BASE}/teachers`);
    const json = await res.json();
    return json.data;
  },

  // Courses & Activities
  async getCourses(): Promise<Course[]> {
    const res = await fetch(`${API_BASE}/courses`);
    const json = await res.json();
    return json.data;
  },

  async getActivities(): Promise<Activity[]> {
    const res = await fetch(`${API_BASE}/activities`);
    const json = await res.json();
    return json.data;
  },

  // Infrastructure & Calendar
  async getInfrastructure(): Promise<{ buildings: Building[]; rooms: Room[] }> {
    const res = await fetch(`${API_BASE}/infrastructure`);
    const json = await res.json();
    return json.data;
  },

  async getCalendar(): Promise<TimeSlot[]> {
    const res = await fetch(`${API_BASE}/calendar`);
    const json = await res.json();
    return json.data;
  },

  // Availability
  async getAvailability(): Promise<EntityAvailability[]> {
    const res = await fetch(`${API_BASE}/availability`);
    const json = await res.json();
    return json.data;
  },

  async toggleAvailability(data: {
    entityType: string;
    entityId: string;
    dayOfWeek: number;
    periodIndex: number;
    state: string;
  }): Promise<void> {
    await fetch(`${API_BASE}/availability/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // Preferences & NLP
  async getPreferenceProfiles(): Promise<PreferenceProfile[]> {
    const res = await fetch(`${API_BASE}/preferences/profiles`);
    const json = await res.json();
    return json.data;
  },

  async parseNlPreferences(prompt: string): Promise<{
    originalPrompt: string;
    summary: string;
    interpretedRules: SmartPreferenceRule[];
  }> {
    const res = await fetch(`${API_BASE}/preferences/nlp-parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const json = await res.json();
    return json.data;
  },

  // Feasibility & Generation
  async checkFeasibility(profileId?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/generator/check-feasibility`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId })
    });
    const json = await res.json();
    return json.data;
  },

  async startGeneration(payload: {
    mode: 'AUTOMATIC' | 'SEMI_AUTOMATIC' | 'MANUAL';
    profileId?: string;
    customRules?: SmartPreferenceRule[];
  }): Promise<{ jobId: string; job: GenerationJob }> {
    const res = await fetch(`${API_BASE}/generator/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    return json.data;
  },

  async getJobStatus(jobId: string): Promise<GenerationJob> {
    const res = await fetch(`${API_BASE}/generator/jobs/${jobId}`);
    const json = await res.json();
    return json.data;
  },

  // Timetables
  async getActiveTimetable(): Promise<Timetable | null> {
    const res = await fetch(`${API_BASE}/timetables/active`);
    const json = await res.json();
    return json.data;
  },

  async moveEntry(data: {
    entryId: string;
    dayOfWeek: number;
    periodIndex: number;
    roomId?: string;
  }): Promise<{ conflicts: TimetableConflict[]; qualityScore: QualityScore }> {
    const res = await fetch(`${API_BASE}/timetables/move-entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    return json.data;
  },

  async toggleLock(entryId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/timetables/toggle-lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId })
    });
    const json = await res.json();
    return json.isLocked;
  },

  async setTimetableStatus(status: string): Promise<void> {
    await fetch(`${API_BASE}/timetables/set-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  },

  // FET Hub
  async importFET(xmlContent: string, fileName?: string): Promise<{ data: FETParsedData; report: FETCompatibilityReport }> {
    const res = await fetch(`${API_BASE}/fet/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xmlContent, fileName })
    });
    const json = await res.json();
    return json;
  },

  getFetExportUrl(): string {
    return `${API_BASE}/fet/export/xml`;
  },

  // Analytics & Audit
  async getAnalytics(): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics`);
    const json = await res.json();
    return json.data;
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await fetch(`${API_BASE}/audit-logs`);
    const json = await res.json();
    return json.data;
  }
};
