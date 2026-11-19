import { apiUrl } from './apiBase';
import { educatorAuthHeaders } from './educatorApi';
import type {
  DirectorySeatUser,
  DirectoryEnrollmentStatus,
  DirectoryAttendanceMode,
  HomeworkSubmissionRecord,
} from '../types';
import type { CourseEnrollment } from '../educato/courses';

export interface EducatorDataBundle {
  customUsers: DirectorySeatUser[];
  parentEmails: Record<string, string>;
  enrollments: CourseEnrollment[];
}

export async function loadEducatorData(): Promise<EducatorDataBundle> {
  const [dirRes, enrRes] = await Promise.all([
    fetch(apiUrl('/api/directory/users')),
    fetch(apiUrl('/api/enrollments')),
  ]);
  const dirData = dirRes.ok ? await dirRes.json().catch(() => ({})) : {};
  const enrData = enrRes.ok ? await enrRes.json().catch(() => ({})) : {};
  return {
    customUsers: Array.isArray(dirData?.customUsers) ? dirData.customUsers : [],
    parentEmails: dirData?.parentEmails && typeof dirData.parentEmails === 'object' ? dirData.parentEmails : {},
    enrollments: Array.isArray(enrData?.enrollments) ? enrData.enrollments : [],
  };
}

export async function upsertDirectoryUsers(
  users: Partial<DirectorySeatUser>[]
): Promise<{ success: boolean; addedCount?: number; customUsers?: DirectorySeatUser[]; error?: string }> {
  const res = await fetch(apiUrl('/api/directory/users'), {
    method: 'POST',
    headers: educatorAuthHeaders(),
    body: JSON.stringify({ users }),
  });
  return res.json().catch(() => ({ success: false, error: 'Failed to save accounts.' }));
}

export async function updateDirectoryUser(
  id: number,
  patch: Partial<DirectorySeatUser>
): Promise<{ success: boolean; user?: DirectorySeatUser; customUsers?: DirectorySeatUser[]; error?: string }> {
  const res = await fetch(apiUrl(`/api/directory/users/${id}`), {
    method: 'PUT',
    headers: educatorAuthHeaders(),
    body: JSON.stringify(patch),
  });
  return res.json().catch(() => ({ success: false, error: 'Failed to update account.' }));
}

export async function deleteDirectoryUser(
  id: number
): Promise<{ success: boolean; customUsers?: DirectorySeatUser[]; error?: string }> {
  const res = await fetch(apiUrl(`/api/directory/users/${id}`), {
    method: 'DELETE',
    headers: educatorAuthHeaders(),
  });
  return res.json().catch(() => ({ success: false, error: 'Failed to delete account.' }));
}

export async function batchUpdateDirectoryUsers(
  ids: number[],
  patch: {
    status?: DirectoryEnrollmentStatus;
    attendanceMode?: DirectoryAttendanceMode;
    grade?: string;
    section?: string;
    courseId?: string;
    emailsById?: Record<string, string>;
  }
): Promise<{ success: boolean; updatedCount?: number; customUsers?: DirectorySeatUser[]; error?: string }> {
  const res = await fetch(apiUrl('/api/directory/users/batch'), {
    method: 'PATCH',
    headers: educatorAuthHeaders(),
    body: JSON.stringify({ ids, ...patch }),
  });
  return res.json().catch(() => ({ success: false, error: 'Failed to batch update accounts.' }));
}

export async function batchDeleteDirectoryUsers(
  ids: number[]
): Promise<{ success: boolean; deletedCount?: number; customUsers?: DirectorySeatUser[]; error?: string }> {
  const res = await fetch(apiUrl('/api/directory/users/batch-delete'), {
    method: 'POST',
    headers: educatorAuthHeaders(),
    body: JSON.stringify({ ids }),
  });
  return res.json().catch(() => ({ success: false, error: 'Failed to batch delete accounts.' }));
}

export async function restoreSubmissionsBackup(
  records: HomeworkSubmissionRecord[]
): Promise<{ success: boolean; restoredCount?: number; totalSubmissions?: number; error?: string }> {
  const res = await fetch(apiUrl('/api/submissions/restore-backup'), {
    method: 'POST',
    headers: educatorAuthHeaders(),
    body: JSON.stringify({ submissions: records }),
  });
  return res.json().catch(() => ({ success: false, error: 'Failed to restore report backup.' }));
}
