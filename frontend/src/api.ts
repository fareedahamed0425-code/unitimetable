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

function getApiBase(): string {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (!envUrl) {
    return '/api';
  }
  // Remove trailing slashes
  let clean = envUrl.replace(/\/+$/, '');
  // If user provided host URL without /api, append /api
  if (!clean.endsWith('/api')) {
    clean = `${clean}/api`;
  }
  return clean;
}

const API_BASE = getApiBase();

function url(path: string): string {
  const cleanPath = path.replace(/^\/+/, '');
  return `${API_BASE}/${cleanPath}`;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const res = await fetch(url('auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Invalid email or password');
    }
    if (json.data?.token) {
      localStorage.setItem('apollo_auth_token', json.data.token);
      localStorage.setItem('apollo_auth_user', JSON.stringify(json.data.user));
    }
    return json.data;
  },

  async register(params: { name: string; email: string; password: string; confirmPassword?: string; role?: string }): Promise<{ user: User; token: string }> {
    const res = await fetch(url('auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Registration failed');
    }
    if (json.data?.token) {
      localStorage.setItem('apollo_auth_token', json.data.token);
      localStorage.setItem('apollo_auth_user', JSON.stringify(json.data.user));
    }
    return json.data;
  },

  async getMe(): Promise<User | null> {
    const token = localStorage.getItem('apollo_auth_token');
    if (!token) return null;
    try {
      const res = await fetch(url('auth/me'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && json.data) {
        localStorage.setItem('apollo_auth_user', JSON.stringify(json.data));
        return json.data;
      }
    } catch (e) {
      console.error('getMe error:', e);
    }
    return null;
  },

  logout(): void {
    localStorage.removeItem('apollo_auth_token');
    localStorage.removeItem('apollo_auth_user');
  },

  getStoredUser(): User | null {
    try {
      const u = localStorage.getItem('apollo_auth_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  async getUsers(): Promise<User[]> {
    try {
      const res = await fetch(url('users'));
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  async updateUserRole(userId: string, role: string): Promise<any> {
    const res = await fetch(url(`users/${userId}/role`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    const json = await res.json();
    return json;
  },

  async updateUser(userId: string, data: Partial<User>): Promise<any> {
    const res = await fetch(url(`users/${userId}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    return json;
  },

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: string;
    departmentId?: string;
    teacherId?: string;
  }): Promise<any> {
    const res = await fetch(url('users'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    return json;
  },

  async deleteUser(userId: string): Promise<any> {
    const res = await fetch(url(`users/${userId}`), {
      method: 'DELETE'
    });
    const json = await res.json();
    return json;
  },

  async resetUserPassword(userId: string, newPassword: string): Promise<any> {
    const res = await fetch(url(`users/${userId}/reset-password`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword })
    });
    const json = await res.json();
    return json;
  },

  // Academic Hierarchy
  async getHierarchy(): Promise<any> {
    const res = await fetch(url('hierarchy'));
    const json = await res.json();
    return json.data;
  },

  // Teachers
  async getTeachers(): Promise<Teacher[]> {
    const res = await fetch(url('teachers'));
    const json = await res.json();
    return json.data;
  },

  // Courses & Activities
  async getCourses(): Promise<Course[]> {
    const res = await fetch(url('courses'));
    const json = await res.json();
    return json.data;
  },

  async getActivities(): Promise<Activity[]> {
    const res = await fetch(url('activities'));
    const json = await res.json();
    return json.data;
  },

  // Infrastructure & Calendar
  async getInfrastructure(): Promise<{ buildings: Building[]; rooms: Room[] }> {
    const res = await fetch(url('infrastructure'));
    const json = await res.json();
    return json.data;
  },

  async getCalendar(): Promise<TimeSlot[]> {
    const res = await fetch(url('calendar'));
    const json = await res.json();
    return json.data;
  },

  // Availability
  async getAvailability(): Promise<EntityAvailability[]> {
    const res = await fetch(url('availability'));
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
    await fetch(url('availability/toggle'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // Preferences & NLP
  async getPreferenceProfiles(): Promise<PreferenceProfile[]> {
    const res = await fetch(url('preferences/profiles'));
    const json = await res.json();
    return json.data;
  },

  async parseNlPreferences(prompt: string): Promise<{
    originalPrompt: string;
    summary: string;
    interpretedRules: SmartPreferenceRule[];
  }> {
    const res = await fetch(url('preferences/nlp-parse'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const json = await res.json();
    return json.data;
  },

  // Feasibility & Generation
  async checkFeasibility(profileId?: string): Promise<any> {
    const res = await fetch(url('generator/check-feasibility'), {
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
    const res = await fetch(url('generator/generate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    return json.data;
  },

  async getJobStatus(jobId: string): Promise<GenerationJob> {
    const res = await fetch(url(`generator/jobs/${jobId}`));
    const json = await res.json();
    return json.data;
  },

  // Timetables
  async getActiveTimetable(): Promise<Timetable | null> {
    const res = await fetch(url('timetables/active'));
    const json = await res.json();
    return json.data;
  },

  async getAllTimetables(): Promise<any[]> {
    const res = await fetch(url('timetables'));
    const json = await res.json();
    return json.data;
  },

  async createTimetable(data: { name: string; generationMode?: string }): Promise<any> {
    const res = await fetch(url('timetables'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    return json.data;
  },

  async duplicateTimetable(id: string): Promise<any> {
    const res = await fetch(url(`timetables/${id}/duplicate`), {
      method: 'POST'
    });
    const json = await res.json();
    return json.data;
  },

  async deleteTimetable(id: string): Promise<void> {
    await fetch(url(`timetables/${id}`), {
      method: 'DELETE'
    });
  },

  async addTimetableEntry(data: {
    timetableId?: string;
    activityId: string;
    dayOfWeek: number;
    periodIndex: number;
    duration?: number;
    roomId: string;
    isLocked?: boolean;
    teacherIds?: string[];
    sectionIds?: string[];
    isCombined?: boolean;
  }): Promise<{ entryId: string }> {
    const res = await fetch(url('timetables/entries'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    return json.data;
  },

  async deleteTimetableEntry(id: string): Promise<void> {
    await fetch(url(`timetables/entries/${id}`), {
      method: 'DELETE'
    });
  },

  async moveEntry(data: {
    entryId: string;
    dayOfWeek: number;
    periodIndex: number;
    roomId?: string;
  }): Promise<{ conflicts: TimetableConflict[]; qualityScore: QualityScore }> {
    const res = await fetch(url('timetables/move-entry'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    return json.data;
  },

  async toggleLock(entryId: string): Promise<boolean> {
    const res = await fetch(url('timetables/toggle-lock'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId })
    });
    const json = await res.json();
    return json.isLocked;
  },

  async setTimetableStatus(status: string): Promise<void> {
    await fetch(url('timetables/set-status'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  },

  // FET Hub
  async importFET(xmlContent: string, fileName?: string): Promise<{ data: FETParsedData; report: FETCompatibilityReport }> {
    const res = await fetch(url('fet/import'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xmlContent, fileName })
    });
    const json = await res.json();
    return json;
  },

  getFetExportUrl(): string {
    return url('fet/export/xml');
  },

  // Timetable Upload & Intelligent Extraction
  async uploadTimetableExtract(params: {
    fileBase64?: string;
    fileName?: string;
    rawRows?: any[];
    clearExisting?: boolean;
    timetableId?: string;
  }): Promise<{
    success: boolean;
    data?: {
      extractedSessionsCount: number;
      insertedEntriesCount: number;
      conflictsCount: number;
      qualityScore: QualityScore;
      sessionsPreview: any[];
    };
    error?: string;
  }> {
    const res = await fetch(url('timetables/upload-extract'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return res.json();
  },

  // Admin Database Reset
  async resetDatabase(): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetch(url('admin/reset-database'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  // Analytics & Audit
  async getAnalytics(): Promise<any> {
    const res = await fetch(url('analytics'));
    const json = await res.json();
    return json.data;
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await fetch(url('audit-logs'));
    const json = await res.json();
    return json.data;
  }
};
