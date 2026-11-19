import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Edit3,
  Trash2,
  Download,
  Upload,
  Mail,
  CheckSquare,
  Square,
  Lock,
  LayoutList,
  Rows3,
  LayoutGrid,
  X,
  ShieldCheck,
  FileCheck2,
  Sparkles,
} from 'lucide-react';
import { COURSES, CourseEnrollment } from '../../educato/courses';
import { apiUrl } from '../../utils/apiBase';
import {
  loadEducatorData,
  upsertDirectoryUsers,
  updateDirectoryUser,
  deleteDirectoryUser,
  batchUpdateDirectoryUsers,
  batchDeleteDirectoryUsers,
} from '../../utils/accountsApi';
import type {
  DirectorySeatUser,
  DirectoryEnrollmentStatus,
  DirectoryAttendanceMode,
} from '../../types';
import { ParentManagementView } from './ParentManagementView';
import { StudentExamReportsDatabaseView } from './StudentExamReportsDatabaseView';

interface StudentManagementViewProps {
  onLockConsole: () => void;
  onDirectoryChanged?: () => void;
}

const IMPORT_FIELDS = [
  { key: 'fullName', label: 'Full Name' },
  { key: 'username', label: 'Username' },
  { key: 'password', label: 'Password' },
  { key: 'grade', label: 'Grade / Year' },
  { key: 'section', label: 'Section' },
  { key: 'status', label: 'Enrollment Status' },
  { key: 'attendanceMode', label: 'Attendance Mode' },
  { key: 'phone', label: 'Student Phone' },
  { key: 'email', label: 'Student Email' },
  { key: 'parentEmail', label: 'Parent Email' },
  { key: 'parentPhone', label: 'Parent Phone' },
  { key: 'paymentMethod', label: 'Payment Method' },
] as const;

type ImportFieldKey = (typeof IMPORT_FIELDS)[number]['key'];

function parseCsvMatrix(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  for (const line of lines) {
    const cells: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    rows.push(cells);
  }
  return rows;
}

function generateStudentEmail(
  fullName: string,
  username: string,
  domain: string,
  taken: Set<string>
): string {
  const baseSlug =
    fullName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '') ||
    username.toLowerCase().replace(/[^a-z0-9]+/g, '') ||
    'student';
  let candidate = `${baseSlug}@${domain}`;
  let idx = 1;
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${baseSlug}${idx}@${domain}`;
    idx += 1;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}

function downloadCsv(filename: string, headers: string[], rows: string[][]): void {
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '\uFEFF' + [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const StudentManagementView: React.FC<StudentManagementViewProps> = ({
  onLockConsole,
  onDirectoryChanged,
}) => {
  const [adminTab, setAdminTab] = useState<'roster' | 'parents' | 'reports'>('roster');
  const [allUsers, setAllUsers] = useState<DirectorySeatUser[]>([]);
  const [parentEmailsMap, setParentEmailsMap] = useState<Record<string, string>>({});
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  // Roster layout & filters
  const [layoutMode, setLayoutMode] = useState<'two-line' | 'one-line' | 'detailed'>('two-line');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DirectoryEnrollmentStatus>('all');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | DirectoryAttendanceMode>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');

  // Batch multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [bulkStatusVal, setBulkStatusVal] = useState<DirectoryEnrollmentStatus>('active');
  const [bulkModeVal, setBulkModeVal] = useState<DirectoryAttendanceMode>('on_campus');
  const [bulkGradeVal, setBulkGradeVal] = useState('');
  const [bulkCourseVal, setBulkCourseVal] = useState('');

  // Drawer + Add/Edit student modal
  const [drawerStudent, setDrawerStudent] = useState<DirectorySeatUser | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<DirectorySeatUser | null>(null);
  const [fName, setFName] = useState('');
  const [fUsername, setFUsername] = useState('');
  const [fPassword, setFPassword] = useState('');
  const [fGrade, setFGrade] = useState('Year 10');
  const [fSection, setFSection] = useState('A');
  const [fStatus, setFStatus] = useState<DirectoryEnrollmentStatus>('active');
  const [fMode, setFMode] = useState<DirectoryAttendanceMode>('on_campus');
  const [fPhone, setFPhone] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fParentEmail, setFParentEmail] = useState('');
  const [fParentPhone, setFParentPhone] = useState('');
  const [fPaymentMethod, setFPaymentMethod] = useState('');
  const [fCourseId, setFCourseId] = useState('');
  const [fNotes, setFNotes] = useState('');
  const [savingStudent, setSavingStudent] = useState(false);

  // Smart Column Mapping Import Modal
  const [importOpen, setImportOpen] = useState(false);
  const [importRawText, setImportRawText] = useState('');
  const [importHasHeader, setImportHasHeader] = useState(true);
  const [columnMap, setColumnMap] = useState<Record<number, ImportFieldKey | 'ignore'>>({});
  const [importPreviewFilter, setImportPreviewFilter] = useState<'all' | 'new' | 'updates' | 'emails'>('all');
  const [importing, setImporting] = useState(false);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const bundle = await loadEducatorData();
      setAllUsers(bundle.customUsers);
      setParentEmailsMap(bundle.parentEmails);
      setEnrollments(bundle.enrollments);
      onDirectoryChanged?.();
    } finally {
      setLoading(false);
    }
  }, [onDirectoryChanged]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const students = useMemo(() => allUsers.filter((u) => u.role === 'student'), [allUsers]);
  const parentsCount = useMemo(() => allUsers.filter((u) => u.role === 'parent').length, [allUsers]);

  const enrollmentByStudentId = useMemo(() => {
    const map = new Map<number, CourseEnrollment>();
    for (const enr of enrollments) {
      map.set(enr.studentId, enr);
    }
    return map;
  }, [enrollments]);

  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return students.filter((s) => {
      const status = s.status || 'active';
      const mode = s.attendanceMode || 'on_campus';
      const enr = enrollmentByStudentId.get(s.id);
      const effectiveCourseId = enr?.status === 'approved' ? enr.courseId : s.courseId || '';

      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (attendanceFilter !== 'all' && mode !== attendanceFilter) return false;
      if (courseFilter === '__unplaced__' && effectiveCourseId) return false;
      if (courseFilter !== 'all' && courseFilter !== '__unplaced__' && effectiveCourseId !== courseFilter) {
        return false;
      }

      if (q) {
        const hay = [
          s.fullName,
          s.username,
          s.phone,
          s.email,
          s.parentEmail,
          parentEmailsMap[String(s.id)],
          s.parentPhone,
          s.grade,
          s.section,
          enr?.courseTitle,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    students,
    searchTerm,
    statusFilter,
    attendanceFilter,
    courseFilter,
    enrollmentByStudentId,
    parentEmailsMap,
  ]);

  const openAddStudent = () => {
    setEditingStudent(null);
    setFName('');
    setFUsername('');
    setFPassword('');
    setFGrade('Year 10');
    setFSection('A');
    setFStatus('active');
    setFMode('on_campus');
    setFPhone('');
    setFEmail('');
    setFParentEmail('');
    setFParentPhone('');
    setFPaymentMethod('');
    setFCourseId('');
    setFNotes('');
    setEditModalOpen(true);
  };

  const openEditStudent = (s: DirectorySeatUser) => {
    const enr = enrollmentByStudentId.get(s.id);
    setEditingStudent(s);
    setFName(s.fullName);
    setFUsername(s.username);
    setFPassword(s.password);
    setFGrade(s.grade || 'Year 10');
    setFSection(s.section || 'A');
    setFStatus(s.status || 'active');
    setFMode(s.attendanceMode || 'on_campus');
    setFPhone(s.phone || '');
    setFEmail(s.email || '');
    setFParentEmail(parentEmailsMap[String(s.id)] || s.parentEmail || '');
    setFParentPhone(s.parentPhone || '');
    setFPaymentMethod(s.paymentMethod || '');
    setFCourseId(enr?.courseId || s.courseId || '');
    setFNotes(s.notes || '');
    setEditModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fName.trim() || !fUsername.trim() || !fPassword.trim()) return;
    setSavingStudent(true);
    try {
      const payload: Partial<DirectorySeatUser> = {
        role: 'student',
        domain: 'Mr.HaithamHusseinig',
        fullName: fName.trim(),
        username: fUsername.trim(),
        password: fPassword.trim(),
        grade: fGrade.trim(),
        section: fSection.trim(),
        status: fStatus,
        attendanceMode: fMode,
        phone: fPhone.trim() || undefined,
        email: fEmail.trim() || undefined,
        parentEmail: fParentEmail.trim() || undefined,
        parentPhone: fParentPhone.trim() || undefined,
        paymentMethod: fPaymentMethod.trim() || undefined,
        courseId: fCourseId || undefined,
        notes: fNotes.trim() || undefined,
      };
      const res = editingStudent
        ? await updateDirectoryUser(editingStudent.id, payload)
        : await upsertDirectoryUsers([payload]);

      if (!res.success) {
        setNotice(res.error || 'Could not save student.');
        return;
      }

      const targetId =
        editingStudent?.id ||
        res.customUsers?.find((u) => u.username.toLowerCase() === fUsername.trim().toLowerCase())?.id;
      if (targetId && fCourseId) {
        const courseObj = COURSES.find((c) => c.id === fCourseId);
        await fetch(apiUrl(`/api/enrollments/${targetId}/approve`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: fCourseId,
            courseTitle: courseObj?.name || fCourseId,
            studentUsername: fUsername.trim(),
            studentName: fName.trim(),
          }),
        }).catch(() => {});
      }

      setNotice(
        editingStudent
          ? `Updated student record for "${fName.trim()}".`
          : `Added student "${fName.trim()}" to the roster.`
      );
      setEditModalOpen(false);
      await refreshAll();
    } finally {
      setSavingStudent(false);
    }
  };

  const handleDeleteSingleStudent = async (s: DirectorySeatUser) => {
    if (
      !window.confirm(
        `Delete student "${s.fullName}" (${s.username}) from the active roster? Historical homework reports remain preserved.`
      )
    ) {
      return;
    }
    const res = await deleteDirectoryUser(s.id);
    if (res.success) {
      if (drawerStudent?.id === s.id) setDrawerStudent(null);
      setNotice(`Removed "${s.fullName}" from active roster.`);
      await refreshAll();
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    if (filteredStudents.every((s) => selectedIds.has(s.id)) && filteredStudents.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const handleBatchStatusUpdate = async (nextStatus: DirectoryEnrollmentStatus) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const res = await batchUpdateDirectoryUsers(ids, { status: nextStatus });
    if (res.success) {
      setNotice(`Updated status to "${nextStatus}" for ${res.updatedCount || ids.length} student(s).`);
      await refreshAll();
    }
  };

  const handleBatchAttendanceUpdate = async (nextMode: DirectoryAttendanceMode) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const res = await batchUpdateDirectoryUsers(ids, { attendanceMode: nextMode });
    if (res.success) {
      setNotice(
        `Updated attendance mode to "${nextMode === 'online' ? 'Online' : 'On-Campus'}" for ${
          res.updatedCount || ids.length
        } student(s).`
      );
      await refreshAll();
    }
  };

  const handleBatchGenerateEmails = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const existing = new Set(students.map((s) => (s.email || '').toLowerCase()).filter(Boolean));
    const emailsById: Record<string, string> = {};
    for (const s of students) {
      if (!selectedIds.has(s.id)) continue;
      emailsById[String(s.id)] = generateStudentEmail(
        s.fullName,
        s.username,
        'mrhaithamhusseinig.edu',
        existing
      );
    }
    const res = await batchUpdateDirectoryUsers(ids, { emailsById });
    if (res.success) {
      setNotice(`Generated student emails for ${ids.length} selected account(s).`);
      await refreshAll();
    }
  };

  const handleConfirmBulkEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await batchUpdateDirectoryUsers(ids, {
      status: bulkStatusVal,
      attendanceMode: bulkModeVal,
      ...(bulkGradeVal.trim() ? { grade: bulkGradeVal.trim() } : {}),
      ...(bulkCourseVal ? { courseId: bulkCourseVal } : {}),
    });
    if (bulkCourseVal) {
      const courseObj = COURSES.find((c) => c.id === bulkCourseVal);
      await Promise.all(
        students
          .filter((s) => selectedIds.has(s.id))
          .map((s) =>
            fetch(apiUrl(`/api/enrollments/${s.id}/approve`), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                courseId: bulkCourseVal,
                courseTitle: courseObj?.name || bulkCourseVal,
                studentUsername: s.username,
                studentName: s.fullName,
              }),
            }).catch(() => {})
          )
      );
    }
    setBulkEditOpen(false);
    setNotice(`Bulk-edited ${ids.length} selected student(s).`);
    await refreshAll();
  };

  const handleConfirmBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const res = await batchDeleteDirectoryUsers(ids);
    setBulkDeleteConfirmOpen(false);
    setSelectedIds(new Set());
    if (res.success) {
      setNotice(`Deleted ${res.deletedCount || ids.length} student(s) from the active roster.`);
      await refreshAll();
    }
  };

  const handleExportRosterExcel = () => {
    const headers = [
      'Full Name',
      'Username',
      'Password',
      'Grade',
      'Section',
      'Status',
      'Attendance Mode',
      'Course Group',
      'Student Phone',
      'Student Email',
      'Parent Email',
      'Parent Phone',
      'Payment Method',
    ];
    const rows = filteredStudents.map((s) => {
      const enr = enrollmentByStudentId.get(s.id);
      return [
        s.fullName,
        s.username,
        s.password,
        s.grade || '',
        s.section || '',
        s.status || 'active',
        s.attendanceMode || 'on_campus',
        enr?.courseTitle || '',
        s.phone || '',
        s.email || '',
        parentEmailsMap[String(s.id)] || s.parentEmail || '',
        s.parentPhone || '',
        s.paymentMethod || '',
      ];
    });
    downloadCsv('MrHaitham_Student_Roster.csv', headers, rows);
    setNotice(`Exported ${filteredStudents.length} student record(s) for Excel.`);
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'Full Name',
      'Username',
      'Password',
      'Grade',
      'Section',
      'Status',
      'Attendance Mode',
      'Student Phone',
      'Student Email',
      'Parent Email',
      'Parent Phone',
      'Payment Method',
    ];
    const sample = [
      [
        'Sara Ahmed',
        'sara_y10',
        'pass2025',
        'Year 10',
        'A',
        'active',
        'on_campus',
        '+201000000001',
        '',
        'parent.sara@example.com',
        '+201000000002',
        'Bank Transfer',
      ],
    ];
    downloadCsv('MrHaitham_Roster_Import_Template.csv', headers, sample);
  };

  // Smart column mapping computations
  const parsedMatrix = useMemo(() => parseCsvMatrix(importRawText), [importRawText]);
  const headerRow = parsedMatrix[0] || [];
  const dataRows = importHasHeader ? parsedMatrix.slice(1) : parsedMatrix;

  useEffect(() => {
    if (headerRow.length === 0) return;
    const autoMap: Record<number, ImportFieldKey | 'ignore'> = {};
    headerRow.forEach((cell, idx) => {
      const norm = cell.toLowerCase().replace(/[^a-z]/g, '');
      if (norm.includes('fullname') || norm === 'name' || norm === 'studentname') autoMap[idx] = 'fullName';
      else if (norm.includes('username') || norm === 'user') autoMap[idx] = 'username';
      else if (norm.includes('password') || norm === 'pass') autoMap[idx] = 'password';
      else if (norm.includes('grade') || norm.includes('year')) autoMap[idx] = 'grade';
      else if (norm.includes('section') || norm === 'group') autoMap[idx] = 'section';
      else if (norm.includes('status')) autoMap[idx] = 'status';
      else if (norm.includes('attendance') || norm.includes('mode')) autoMap[idx] = 'attendanceMode';
      else if (norm.includes('parentemail')) autoMap[idx] = 'parentEmail';
      else if (norm.includes('parentphone')) autoMap[idx] = 'parentPhone';
      else if (norm.includes('email')) autoMap[idx] = 'email';
      else if (norm.includes('phone') || norm.includes('mobile')) autoMap[idx] = 'phone';
      else if (norm.includes('payment')) autoMap[idx] = 'paymentMethod';
      else autoMap[idx] = IMPORT_FIELDS[idx]?.key || 'ignore';
    });
    setColumnMap(autoMap);
  }, [importRawText, importHasHeader]);

  const importPreviewRows = useMemo(() => {
    const existingEmails = new Set(students.map((s) => (s.email || '').toLowerCase()).filter(Boolean));
    const existingByUsername = new Map(students.map((s) => [s.username.toLowerCase(), s]));

    return dataRows
      .map((row) => {
        const record: Record<string, string> = {};
        row.forEach((val, idx) => {
          const field = columnMap[idx];
          if (field && field !== 'ignore') record[field] = val;
        });
        const rawUser = (record.username || '').trim();
        const rawName = (record.fullName || rawUser).trim();
        if (!rawUser && !rawName) return null;
        const finalUsername =
          rawUser ||
          rawName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
        const existingMatch = existingByUsername.get(finalUsername.toLowerCase());
        const autoGeneratedEmail = !record.email
          ? generateStudentEmail(rawName, finalUsername, 'mrhaithamhusseinig.edu', existingEmails)
          : '';
        return {
          username: finalUsername,
          password: record.password || existingMatch?.password || 'igcse2025',
          fullName: rawName,
          grade: record.grade || 'Year 10',
          section: record.section || 'A',
          status:
            record.status === 'pending' || record.status === 'paused' || record.status === 'graduated'
              ? (record.status as DirectoryEnrollmentStatus)
              : ('active' as DirectoryEnrollmentStatus),
          attendanceMode:
            record.attendanceMode?.toLowerCase() === 'online'
              ? ('online' as DirectoryAttendanceMode)
              : ('on_campus' as DirectoryAttendanceMode),
          phone: record.phone || '',
          email: record.email || autoGeneratedEmail,
          autoEmail: Boolean(autoGeneratedEmail),
          parentEmail: record.parentEmail || '',
          parentPhone: record.parentPhone || '',
          paymentMethod: record.paymentMethod || '',
          isUpdate: Boolean(existingMatch),
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [dataRows, columnMap, students]);

  const displayedImportPreview = useMemo(() => {
    if (importPreviewFilter === 'new') return importPreviewRows.filter((r) => !r.isUpdate);
    if (importPreviewFilter === 'updates') return importPreviewRows.filter((r) => r.isUpdate);
    if (importPreviewFilter === 'emails') return importPreviewRows.filter((r) => r.autoEmail);
    return importPreviewRows;
  }, [importPreviewRows, importPreviewFilter]);

  const handleConfirmImport = async () => {
    if (importPreviewRows.length === 0) return;
    setImporting(true);
    try {
      const payload = importPreviewRows.map((r) => ({
        role: 'student' as const,
        domain: 'Mr.HaithamHusseinig',
        username: r.username,
        password: r.password,
        fullName: r.fullName,
        grade: r.grade,
        section: r.section,
        status: r.status,
        attendanceMode: r.attendanceMode,
        phone: r.phone || undefined,
        email: r.email || undefined,
        parentEmail: r.parentEmail || undefined,
        parentPhone: r.parentPhone || undefined,
        paymentMethod: r.paymentMethod || undefined,
      }));
      const res = await upsertDirectoryUsers(payload);
      if (res.success) {
        setImportOpen(false);
        setImportRawText('');
        setNotice(`Imported / updated ${res.addedCount || payload.length} student record(s).`);
        await refreshAll();
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#EEF3F9] border border-[#DCE5F0] flex items-center justify-center text-[#1B365D]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="math-serif text-xl sm:text-2xl font-bold text-[#13294B]">
              Educator Admin Console
            </h1>
            <p className="text-xs text-slate-500">
              {students.length} enrolled student{students.length === 1 ? '' : 's'} &middot; {parentsCount} parent{' '}
              {parentsCount === 1 ? 'account' : 'accounts'} &middot; {enrollments.length} course placement
              {enrollments.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLockConsole}
          className="px-3.5 py-2 rounded-xl border border-[#E5E7EB] bg-[#FAF9F5] hover:bg-[#EEF3F9] text-xs font-semibold text-[#13294B] inline-flex items-center gap-1.5 transition"
        >
          <Lock className="w-3.5 h-3.5" /> Lock Admin Console
        </button>
      </div>

      {/* Preserved 3-Tab Admin Navigation */}
      <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-2xl border border-[#E5E7EB] w-fit shadow-2xs">
        <button
          type="button"
          onClick={() => setAdminTab('roster')}
          className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition ${
            adminTab === 'roster' ? 'bg-[#1B365D] text-white' : 'text-slate-600 hover:bg-[#FAF9F5]'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Enrolled Roster ({students.length})
        </button>
        <button
          type="button"
          onClick={() => setAdminTab('parents')}
          className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition ${
            adminTab === 'parents' ? 'bg-[#1B365D] text-white' : 'text-slate-600 hover:bg-[#FAF9F5]'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Parent Accounts ({parentsCount})
        </button>
        <button
          type="button"
          onClick={() => setAdminTab('reports')}
          className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition ${
            adminTab === 'reports' ? 'bg-[#1B365D] text-white' : 'text-slate-600 hover:bg-[#FAF9F5]'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" /> Reports Database
        </button>
      </div>

      {notice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between gap-2">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TAB 1: ENROLLED STUDENTS ROSTER */}
      {adminTab === 'roster' && (
        <div className="space-y-4">
          {/* Controls & Filters */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-3 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 min-w-[230px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search students by name, username, phone, email, or parent..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E7EB] bg-[#FAF9F5] focus:bg-white text-xs outline-none focus:border-[#1B365D]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <div className="inline-flex rounded-xl border border-[#E5E7EB] overflow-hidden bg-[#FAF9F5] p-0.5">
                  <button
                    type="button"
                    onClick={() => setLayoutMode('two-line')}
                    title="Two-line compact"
                    className={`p-1.5 rounded-lg ${
                      layoutMode === 'two-line' ? 'bg-white text-[#1B365D] shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    <Rows3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutMode('one-line')}
                    title="One-line dense"
                    className={`p-1.5 rounded-lg ${
                      layoutMode === 'one-line' ? 'bg-white text-[#1B365D] shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutMode('detailed')}
                    title="Detailed cards"
                    className={`p-1.5 rounded-lg ${
                      layoutMode === 'detailed' ? 'bg-white text-[#1B365D] shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-2.5 py-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#FAF9F5] text-xs font-semibold text-slate-700"
                >
                  Template
                </button>
                <button
                  type="button"
                  onClick={() => setImportOpen(true)}
                  className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#FAF9F5] text-xs font-semibold text-[#13294B] inline-flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" /> Import CSV/Excel
                </button>
                <button
                  type="button"
                  onClick={handleExportRosterExcel}
                  className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#FAF9F5] text-xs font-semibold text-[#13294B] inline-flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Export Excel
                </button>
                <button
                  type="button"
                  onClick={openAddStudent}
                  className="px-3.5 py-2 rounded-xl bg-[#1B365D] hover:bg-[#13294B] text-white text-xs font-bold inline-flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add Student
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-[#FAF9F5]"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="paused">Paused</option>
                <option value="graduated">Graduated</option>
              </select>
              <select
                value={attendanceFilter}
                onChange={(e) => setAttendanceFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-[#FAF9F5]"
              >
                <option value="all">All Attendance Modes</option>
                <option value="on_campus">On-Campus</option>
                <option value="online">Online</option>
              </select>
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-[#FAF9F5]"
              >
                <option value="all">All Course Groups</option>
                <option value="__unplaced__">Unplaced</option>
                {COURSES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Bulk Multi-Select Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={toggleSelectAllFiltered}
                className="inline-flex items-center gap-1.5 font-semibold text-[#13294B] hover:text-[#1B365D]"
              >
                {filteredStudents.length > 0 && filteredStudents.every((s) => selectedIds.has(s.id)) ? (
                  <CheckSquare className="w-4 h-4 text-[#1B365D]" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>
                  {selectedIds.size > 0
                    ? `${selectedIds.size} selected`
                    : `Select all (${filteredStudents.length})`}
                </span>
              </button>

              {selectedIds.size > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleBatchStatusUpdate('active')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold"
                  >
                    Mark Active
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBatchAttendanceUpdate('online')}
                    className="px-2.5 py-1 rounded-lg bg-[#EEF3F9] border border-[#DCE5F0] text-[#1B365D] text-[11px] font-semibold"
                  >
                    Set Online
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchGenerateEmails}
                    className="px-2.5 py-1 rounded-lg bg-[#FAF9F5] border border-[#E5E7EB] text-[#13294B] text-[11px] font-semibold inline-flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Auto Emails
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkEditOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#1B365D] text-white text-[11px] font-semibold"
                  >
                    Bulk Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkDeleteConfirmOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] font-semibold"
                  >
                    Delete Selected
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Roster Display */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 text-center text-xs text-slate-500">
              Loading roster...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-[#E5E7EB] p-10 text-center space-y-2">
              <Users className="w-8 h-8 text-[#1B365D]/40 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No students found</p>
              <p className="text-xs text-slate-500">
                Click <strong>Add Student</strong> or <strong>Import CSV/Excel</strong> above to populate your roster.
              </p>
            </div>
          ) : (
            <div
              className={
                layoutMode === 'detailed' ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-2'
              }
            >
              {filteredStudents.map((s) => {
                const isSelected = selectedIds.has(s.id);
                const enr = enrollmentByStudentId.get(s.id);
                const courseTitle = enr?.status === 'approved' ? enr.courseTitle : 'Unplaced';
                const pEmail = parentEmailsMap[String(s.id)] || s.parentEmail || '';

                if (layoutMode === 'one-line') {
                  return (
                    <div
                      key={s.id}
                      className="bg-white rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs hover:border-[#1B365D]/30 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(s.id)}
                        />
                        <button
                          type="button"
                          onClick={() => setDrawerStudent(s)}
                          className="font-bold text-[#13294B] hover:underline truncate text-left"
                        >
                          {s.fullName}
                        </button>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">{s.username}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EEF3F9] text-[#1B365D] font-semibold shrink-0">
                          {courseTitle}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditStudent(s)}
                          className="p-1 text-slate-500 hover:text-[#1B365D]"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSingleStudent(s)}
                          className="p-1 text-slate-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={s.id}
                    className="bg-white rounded-2xl border border-[#E5E7EB] p-4 flex flex-wrap items-center justify-between gap-3 hover:border-[#1B365D]/30 transition shadow-2xs"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(s.id)}
                        className="mt-1"
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDrawerStudent(s)}
                            className="text-sm font-bold text-[#13294B] hover:underline text-left"
                          >
                            {s.fullName}
                          </button>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FAF9F5] border border-[#E5E7EB] text-slate-600">
                            {s.grade || 'Year 10'} {s.section || ''}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EEF3F9] text-[#1B365D]">
                            {courseTitle}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                            {s.status || 'active'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          User: <span className="font-mono text-slate-700">{s.username}</span> &middot;{' '}
                          {s.attendanceMode === 'online' ? 'Online' : 'On-Campus'}
                          {s.email ? ` · ${s.email}` : ''}
                          {pEmail ? ` · Parent: ${pEmail}` : ''}
                        </p>
                        {layoutMode === 'detailed' && (
                          <p className="text-[11px] text-slate-500 pt-1">
                            Phone: {s.phone || '—'} &middot; Parent Phone: {s.parentPhone || '—'}
                            {s.paymentMethod ? ` · Payment Method: ${s.paymentMethod}` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setDrawerStudent(s)}
                        className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-[#FAF9F5] hover:bg-[#EEF3F9] text-[11px] font-semibold text-[#13294B]"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditStudent(s)}
                        className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#1B365D] hover:bg-[#EEF3F9]"
                        title="Edit student"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSingleStudent(s)}
                        className="p-1.5 rounded-lg border border-[#E5E7EB] text-red-600 hover:bg-red-50"
                        title="Delete student"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PARENT ACCOUNTS */}
      {adminTab === 'parents' && (
        <ParentManagementView
          users={allUsers}
          onRefresh={refreshAll}
          onNotice={(msg) => setNotice(msg)}
        />
      )}

      {/* TAB 3: REPORTS DATABASE */}
      {adminTab === 'reports' && (
        <StudentExamReportsDatabaseView
          students={students}
          onNotice={(msg) => setNotice(msg)}
        />
      )}

      {/* Student Details Drawer */}
      {drawerStudent && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end"
          onClick={() => setDrawerStudent(null)}
        >
          <div
            className="bg-white w-full max-w-md h-full p-6 overflow-y-auto shadow-2xl border-l border-[#E5E7EB] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="math-serif text-lg font-bold text-[#13294B]">{drawerStudent.fullName}</h3>
                <p className="text-xs text-slate-500">
                  {drawerStudent.grade || 'IGCSE'} {drawerStudent.section || ''} &middot;{' '}
                  {drawerStudent.attendanceMode === 'online' ? 'Online' : 'On-Campus'}
                </p>
              </div>
              <button type="button" onClick={() => setDrawerStudent(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs bg-[#FAF9F5] rounded-2xl p-4 border border-[#E5E7EB]">
              <p><strong>Username:</strong> <span className="font-mono">{drawerStudent.username}</span></p>
              <p><strong>Password:</strong> <span className="font-mono">{drawerStudent.password}</span></p>
              <p><strong>Status:</strong> {drawerStudent.status || 'active'}</p>
              <p><strong>Course:</strong> {enrollmentByStudentId.get(drawerStudent.id)?.courseTitle || 'Unplaced'}</p>
              <p><strong>Student Email:</strong> {drawerStudent.email || '—'}</p>
              <p><strong>Student Phone:</strong> {drawerStudent.phone || '—'}</p>
              <p><strong>Parent Email:</strong> {parentEmailsMap[String(drawerStudent.id)] || drawerStudent.parentEmail || '—'}</p>
              <p><strong>Parent Phone:</strong> {drawerStudent.parentPhone || '—'}</p>
              <p><strong>Payment Method:</strong> {drawerStudent.paymentMethod || '—'}</p>
              {drawerStudent.notes && <p><strong>Notes:</strong> {drawerStudent.notes}</p>}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const target = drawerStudent;
                  setDrawerStudent(null);
                  openEditStudent(target);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#1B365D] hover:bg-[#13294B] text-white text-xs font-bold"
              >
                Edit Student &amp; Credentials
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSingleStudent(drawerStudent)}
                className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {editModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setEditModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-[#E5E7EB] max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="math-serif text-base font-bold text-[#13294B]">
                {editingStudent ? `Edit Student: ${editingStudent.fullName}` : 'Add New Student'}
              </h3>
              <button type="button" onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveStudent} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                  <input type="text" value={fName} onChange={(e) => setFName(e.target.value)} required className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB]" />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Username *</label>
                  <input type="text" value={fUsername} onChange={(e) => setFUsername(e.target.value)} required className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB]" />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Password *</label>
                  <input type="text" value={fPassword} onChange={(e) => setFPassword(e.target.value)} required className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB]" />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Grade / Year</label>
                  <input type="text" value={fGrade} onChange={(e) => setFGrade(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB]" />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Section</label>
                  <input type="text" value={fSection} onChange={(e) => setFSection(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB]" />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Course Group</label>
                  <select value={fCourseId} onChange={(e) => setFCourseId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white">
                    <option value="">Unplaced</option>
                    {COURSES.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Enrollment Status</label>
                  <select value={fStatus} onChange={(e) => setFStatus(e.target.value as DirectoryEnrollmentStatus)} className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white">
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="paused">Paused</option>
                    <option value="graduated">Graduated</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Attendance Mode</label>
                  <select value={fMode} onChange={(e) => setFMode(e.target.value as DirectoryAttendanceMode)} className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white">
                    <option value="on_campus">On-Campus</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
                  <input type="text" value={fPaymentMethod} onChange={(e) => setFPaymentMethod(e.target.value)} placeholder="Cash / Instapay / Bank" className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB]" />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Student Email</label>
                  <input type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB]" />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Student Phone</label>
                  <input type="text" value={fPhone} onChange={(e) => setFPhone(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB]" />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Parent Email</label>
                  <input type="email" value={fParentEmail} onChange={(e) => setFParentEmail(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB]" />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Parent Phone</label>
                  <input type="text" value={fParentPhone} onChange={(e) => setFParentPhone(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB]" />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Admin Notes</label>
                  <input type="text" value={fNotes} onChange={(e) => setFNotes(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB]" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditModalOpen(false)} className="px-4 py-2 rounded-xl border border-[#E5E7EB] text-slate-700 font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={savingStudent} className="px-4 py-2 rounded-xl bg-[#1B365D] hover:bg-[#13294B] text-white font-bold disabled:opacity-50">
                  {savingStudent ? 'Saving...' : 'Save Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {bulkEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setBulkEditOpen(false)}>
          <div className="bg-white rounded-2xl border border-[#E5E7EB] max-w-md w-full p-6 space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="math-serif text-base font-bold text-[#13294B]">Bulk Edit {selectedIds.size} Student(s)</h3>
            <form onSubmit={handleConfirmBulkEdit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Enrollment Status</label>
                <select value={bulkStatusVal} onChange={(e) => setBulkStatusVal(e.target.value as DirectoryEnrollmentStatus)} className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white">
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="paused">Paused</option>
                  <option value="graduated">Graduated</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Attendance Mode</label>
                <select value={bulkModeVal} onChange={(e) => setBulkModeVal(e.target.value as DirectoryAttendanceMode)} className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white">
                  <option value="on_campus">On-Campus</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Grade (leave blank to keep existing)</label>
                <input type="text" value={bulkGradeVal} onChange={(e) => setBulkGradeVal(e.target.value)} placeholder="e.g. Year 10" className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB]" />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Place into Course Group (optional)</label>
                <select value={bulkCourseVal} onChange={(e) => setBulkCourseVal(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white">
                  <option value="">Keep current placements</option>
                  {COURSES.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setBulkEditOpen(false)} className="px-4 py-2 rounded-xl border border-[#E5E7EB] text-slate-700 font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#1B365D] hover:bg-[#13294B] text-white font-bold">Apply Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {bulkDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setBulkDeleteConfirmOpen(false)}>
          <div className="bg-white rounded-2xl border border-[#E5E7EB] max-w-md w-full p-6 space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="math-serif text-base font-bold text-[#13294B]">Delete {selectedIds.size} Selected Student(s)?</h3>
            <p className="text-xs text-slate-600">
              These student accounts will be removed from the active roster. Existing homework submissions and historical reports are preserved.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setBulkDeleteConfirmOpen(false)} className="px-4 py-2 rounded-xl border border-[#E5E7EB] text-xs font-semibold text-slate-700">
                Cancel
              </button>
              <button type="button" onClick={handleConfirmBulkDelete} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold">
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Column Mapping CSV/Excel Import Modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setImportOpen(false)}>
          <div className="bg-white rounded-2xl border border-[#E5E7EB] max-w-4xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="math-serif text-base font-bold text-[#13294B]">
                  Smart Roster Import (CSV / Excel Export)
                </h3>
                <p className="text-xs text-slate-500">
                  Upload a .csv file or paste spreadsheet rows, map columns, and preview before importing.
                </p>
              </div>
              <button type="button" onClick={() => setImportOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <label className="px-3 py-1.5 rounded-xl bg-[#EEF3F9] border border-[#DCE5F0] text-[#1B365D] font-semibold cursor-pointer inline-flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Choose .CSV File
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = () => setImportRawText(String(reader.result || ''));
                    reader.readAsText(f);
                  }}
                />
              </label>
              <label className="inline-flex items-center gap-1.5 text-slate-600 cursor-pointer">
                <input type="checkbox" checked={importHasHeader} onChange={(e) => setImportHasHeader(e.target.checked)} />
                <span>First row contains headers</span>
              </label>
            </div>

            <textarea
              rows={4}
              value={importRawText}
              onChange={(e) => setImportRawText(e.target.value)}
              placeholder="Full Name,Username,Password,Grade,Parent Email&#10;Sara Ahmed,sara_y10,pass2025,Year 10,parent.sara@example.com"
              className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] font-mono text-xs"
            />

            {headerRow.length > 0 && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-[#13294B] mb-2">Smart Column Mapping</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {headerRow.map((col, idx) => (
                      <div key={idx} className="bg-[#FAF9F5] border border-[#E5E7EB] rounded-xl p-2 text-[11px] space-y-1">
                        <span className="font-semibold text-slate-700 block truncate">
                          Col {idx + 1}: {col}
                        </span>
                        <select
                          value={columnMap[idx] || 'ignore'}
                          onChange={(e) => setColumnMap((prev) => ({ ...prev, [idx]: e.target.value as any }))}
                          className="w-full px-2 py-1 rounded-lg border border-[#E5E7EB] bg-white text-[11px]"
                        >
                          <option value="ignore">Ignore column</option>
                          {IMPORT_FIELDS.map((f) => (
                            <option key={f.key} value={f.key}>{f.label}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pre-import preview tabs */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {(
                    [
                      { id: 'all', label: `All (${importPreviewRows.length})` },
                      { id: 'new', label: `New Students (${importPreviewRows.filter((r) => !r.isUpdate).length})` },
                      { id: 'updates', label: `Updates (${importPreviewRows.filter((r) => r.isUpdate).length})` },
                      { id: 'emails', label: `Auto-generated Emails (${importPreviewRows.filter((r) => r.autoEmail).length})` },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setImportPreviewFilter(t.id)}
                      className={`px-3 py-1 rounded-lg font-semibold border ${
                        importPreviewFilter === t.id
                          ? 'bg-[#1B365D] text-white border-[#1B365D]'
                          : 'bg-white text-slate-600 border-[#E5E7EB]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="max-h-48 overflow-auto border border-[#E5E7EB] rounded-xl">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#FAF9F5] text-slate-600 border-b border-[#E5E7EB]">
                      <tr>
                        <th className="p-2">Name</th>
                        <th className="p-2">Username</th>
                        <th className="p-2">Grade</th>
                        <th className="p-2">Email</th>
                        <th className="p-2">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedImportPreview.slice(0, 50).map((r, i) => (
                        <tr key={i}>
                          <td className="p-2 font-semibold text-slate-900">{r.fullName}</td>
                          <td className="p-2 font-mono">{r.username}</td>
                          <td className="p-2">{r.grade}</td>
                          <td className="p-2 text-slate-600">
                            {r.email} {r.autoEmail && <span className="text-[10px] text-[#1B365D] font-semibold">(auto)</span>}
                          </td>
                          <td className="p-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.isUpdate ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
                              {r.isUpdate ? 'Update' : 'New'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setImportOpen(false)} className="px-4 py-2 rounded-xl border border-[#E5E7EB] text-xs font-semibold text-slate-700">
                Cancel
              </button>
              <button
                type="button"
                disabled={importing || importPreviewRows.length === 0}
                onClick={handleConfirmImport}
                className="px-4 py-2 rounded-xl bg-[#1B365D] hover:bg-[#13294B] text-white text-xs font-bold disabled:opacity-50"
              >
                {importing ? 'Importing...' : `Confirm Import (${importPreviewRows.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
