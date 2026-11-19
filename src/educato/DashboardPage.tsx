import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { COURSES, Course, CourseEnrollment } from './courses';
import { STUDENTS, RCIS_CAPACITY } from './students';
import { apiUrl } from '../utils/apiBase';
import type { DirectorySeatUser, HomeworkAssignmentRecord, PortalNotification } from '../types';

interface DashboardProps {
  enrollment: CourseEnrollment | null;
  enrollmentLoading: boolean;
  visibleCourses: Course[];
  notifications?: PortalNotification[];
  onMarkNotificationRead?: (notifId: string) => Promise<void>;
  onRefreshEnrollment: () => Promise<void>;
  onSelectCourse: (courseId: string) => void;
  onSelectView: (view: string) => void;
}

export function DashboardPage({
  enrollment,
  enrollmentLoading,
  visibleCourses,
  notifications = [],
  onMarkNotificationRead,
  onRefreshEnrollment,
  onSelectCourse,
  onSelectView,
}: DashboardProps) {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const isParent = user?.role === 'parent';

  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [switchingPending, setSwitchingPending] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Parent & student assignments state
  const [parentStats, setParentStats] = useState<any | null>(null);
  const [parentLoading, setParentLoading] = useState(false);
  const [groupAssignments, setGroupAssignments] = useState<HomeworkAssignmentRecord[]>([]);

  // Teacher dashboard & RCIS Access Hub (3500 seats) state
  const [allEnrollments, setAllEnrollments] = useState<CourseEnrollment[]>([]);
  const [pendingSubmissionsCount, setPendingSubmissionsCount] = useState(0);
  const [assignStudentId, setAssignStudentId] = useState<number>(STUDENTS[0]?.id || 1);
  const [assignCourseId, setAssignCourseId] = useState<string>(COURSES[0]?.id || 'year-9');
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const [directorySeats, setDirectorySeats] = useState<DirectorySeatUser[]>([]);
  const [parentEmailsMap, setParentEmailsMap] = useState<Record<string, string>>({});
  const [activeSeatsCount, setActiveSeatsCount] = useState<number>(100);
  const [csvImportText, setCsvImportText] = useState<string>('');
  const [directoryNotice, setDirectoryNotice] = useState<string | null>(null);
  const [editParentStudentId, setEditParentStudentId] = useState<number>(STUDENTS[0]?.id || 1);
  const [editParentEmailVal, setEditParentEmailVal] = useState<string>('');
  const [outboxCount, setOutboxCount] = useState<number>(0);

  const loadTeacherData = useCallback(async () => {
    if (!isTeacher) return;
    try {
      const [enrRes, subRes, dirRes, outboxRes] = await Promise.all([
        fetch(apiUrl('/api/enrollments')),
        fetch(apiUrl('/api/submissions?role=teacher')),
        fetch(apiUrl('/api/directory/users')),
        fetch(apiUrl('/api/outbox')),
      ]);
      if (enrRes.ok) {
        const data = await enrRes.json();
        setAllEnrollments(Array.isArray(data?.enrollments) ? data.enrollments : []);
      }
      if (subRes.ok) {
        const subData = await subRes.json();
        const subs = Array.isArray(subData?.submissions) ? subData.submissions : [];
        setPendingSubmissionsCount(subs.filter((s: any) => s.status === 'pending').length);
      }
      if (dirRes.ok) {
        const dirData = await dirRes.json();
        const custom = Array.isArray(dirData?.customUsers) ? dirData.customUsers : [];
        setDirectorySeats(custom);
        setParentEmailsMap(dirData?.parentEmails || {});
        setActiveSeatsCount(100 + custom.length);
      }
      if (outboxRes.ok) {
        const outData = await outboxRes.json();
        setOutboxCount(Array.isArray(outData?.outbox) ? outData.outbox.length : 0);
      }
    } catch (err) {
      console.error('Failed to load educator dashboard data:', err);
    }
  }, [isTeacher]);

  const loadParentData = useCallback(async () => {
    if (!isParent || !user?.linkedStudentId) return;
    setParentLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/stats?role=parent&studentId=${user.linkedStudentId}`));
      if (res.ok) {
        const data = await res.json();
        setParentStats(data?.stats || null);
      }
    } catch (err) {
      console.error('Failed to load parent dashboard stats:', err);
    } finally {
      setParentLoading(false);
    }
  }, [isParent, user?.linkedStudentId]);

  useEffect(() => {
    loadTeacherData();
    loadParentData();
    if (!isTeacher) return;
    const timer = setInterval(loadTeacherData, 8000);
    return () => clearInterval(timer);
  }, [loadTeacherData, loadParentData, isTeacher]);

  useEffect(() => {
    if (isTeacher || enrollment?.status !== 'approved' || !enrollment.courseId) return;
    const fetchAssignments = () => {
      fetch(apiUrl(`/api/assignments?courseId=${encodeURIComponent(enrollment.courseId)}`))
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (Array.isArray(d?.assignments)) setGroupAssignments(d.assignments);
        })
        .catch(() => {});
    };
    fetchAssignments();
    const timer = setInterval(fetchAssignments, 8000);
    return () => clearInterval(timer);
  }, [isTeacher, enrollment?.status, enrollment?.courseId]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleRequestCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedCourseId) return;
    const course = COURSES.find((c) => c.id === selectedCourseId);
    if (!course) return;
    setSubmittingRequest(true);
    setRequestError(null);
    try {
      const res = await fetch(apiUrl('/api/enrollments/request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.id,
          studentUsername: user.username,
          studentName: user.fullName,
          grade: user.grade,
          section: user.section,
          courseId: course.id,
          courseTitle: course.name,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Could not submit course request.');
      }
      setSwitchingPending(false);
      await onRefreshEnrollment();
    } catch (err: any) {
      setRequestError(err?.message || 'Could not send request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleTeacherApprove = async (studentId: number, overrideCourseId?: string) => {
    setActionBusyId(studentId);
    try {
      const st =
        STUDENTS.find((s) => s.id === studentId) ||
        directorySeats.find((u) => u.id === studentId);
      const course = overrideCourseId ? COURSES.find((c) => c.id === overrideCourseId) : undefined;
      await fetch(apiUrl(`/api/enrollments/${studentId}/approve`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course?.id,
          courseTitle: course?.name,
          studentUsername: st?.username,
          studentName: st?.fullName,
        }),
      });
      await loadTeacherData();
    } finally {
      setActionBusyId(null);
    }
  };

  const handleTeacherReject = async (studentId: number) => {
    setActionBusyId(studentId);
    try {
      await fetch(apiUrl(`/api/enrollments/${studentId}/reject`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherNote: 'Please select your assigned class group and resubmit for approval.',
        }),
      });
      await loadTeacherData();
    } finally {
      setActionBusyId(null);
    }
  };

  const handleSaveParentEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editParentEmailVal.trim()) return;
    setDirectoryNotice(null);
    const res = await fetch(apiUrl('/api/directory/parent-email'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: editParentStudentId, parentEmail: editParentEmailVal.trim() }),
    });
    if (res.ok) {
      setDirectoryNotice(`Saved parent notification email for Student #${editParentStudentId}.`);
      setEditParentEmailVal('');
      await loadTeacherData();
    }
  };

  const handleImportCsvSeats = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = csvImportText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    const parsedUsers = lines
      .map((line) => {
        const [username, password, fullName, role, domain, parentEmail] = line.split(',').map((p) => (p || '').trim());
        if (!username || !password) return null;
        return {
          username,
          password,
          fullName: fullName || username,
          role: role === 'parent' ? 'parent' : 'student',
          domain: domain || 'Mr.HaithamHusseinig',
          parentEmail: parentEmail || undefined,
        };
      })
      .filter(Boolean);
    if (parsedUsers.length === 0) {
      setDirectoryNotice('No valid rows found. Format: username,password,Full Name,student|parent,Mr.HaithamHusseinig,parent@email');
      return;
    }
    const res = await fetch(apiUrl('/api/directory/users'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: parsedUsers }),
    });
    const data = await res.json();
    if (res.ok) {
      setDirectoryNotice(`Imported ${data.addedCount || parsedUsers.length} account(s) into Mr.HaithamHusseinig Directory.`);
      setCsvImportText('');
      await loadTeacherData();
    }
  };

  // PARENT PORTAL VIEW (Strictly Mr. Haitham-approved courses and published reports only)
  if (isParent) {
    const approvedReports = Array.isArray(parentStats?.recentReports) ? parentStats.recentReports : [];
    const childCourse = visibleCourses[0] || null;
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-[#6b1226] via-[#800020] to-[#3b1d5e] rounded-2xl p-6 text-white shadow-lg border border-[#9f1239]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-bold uppercase tracking-wider mb-2">
                Parent Portal
              </span>
              <h1 className="text-2xl font-bold">
                {greeting()}, {user?.fullName}!
              </h1>
              <p className="text-rose-100 mt-1 text-sm">
                Linked Student: <strong>{user?.linkedStudentName}</strong> ({user?.grade} Section {user?.section})
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onSelectView('homework-studio')}
                className="px-4 py-2 rounded-xl bg-white text-[#800020] hover:bg-rose-50 text-xs font-bold transition shadow-sm"
              >
                View Approved Reports
              </button>
              <button
                onClick={() => onSelectView('progress')}
                className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-semibold transition"
              >
                Child Statistics
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-3xl font-bold text-gray-900">
              {parentLoading ? '...' : parentStats?.gradedCount ?? 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Mr. Haitham Approved Reports</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-3xl font-bold text-[#800020]">
              {parentLoading ? '...' : `${parentStats?.avgPercentage ?? 0}%`}
            </p>
            <p className="text-xs text-gray-500 mt-1">Approved Overall Average</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-base font-bold text-emerald-700">
              {childCourse ? childCourse.name : 'Pending Course Approval'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {childCourse ? `${childCourse.code} · Active Enrollment` : 'Awaiting Mr. Haitham course confirmation'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Final Reports Released by Mr. Haitham</h2>
              <p className="text-xs text-gray-500">
                Only assignments, quizzes, and essays approved through the Approval Gateway appear here.
              </p>
            </div>
            <button
              onClick={() => onSelectView('homework-studio')}
              className="text-xs font-semibold text-[#800020] hover:underline"
            >
              Open Full Report Center &rarr;
            </button>
          </div>

          {approvedReports.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
              No finalized reports have been released yet for {user?.linkedStudentName}. You will receive an email once Mr. Haitham approves and sends the next submission.
            </div>
          ) : (
            <div className="space-y-3">
              {approvedReports.map((r: any) => (
                <div
                  key={r.id}
                  onClick={() => onSelectView('homework-studio')}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-white hover:border-[#800020]/30 cursor-pointer transition"
                >
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase mr-2">
                      Approved · {String(r.gradingSystem || 'edexcel').toUpperCase()}
                    </span>
                    <span className="font-semibold text-sm text-gray-900">{r.assignment}</span>
                    <p className="text-xs text-gray-500 mt-1">
                      {r.courseTitle} · Released {r.publishedAt ? new Date(r.publishedAt).toLocaleDateString('en-GB') : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-extrabold text-[#800020]">
                      {r.earnedMarks}/{r.totalMarks} ({r.percentage}%)
                    </p>
                    <p className="text-[11px] text-gray-500">{r.grade}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // STUDENT PRE-APPROVAL FLOW (Course Selection -> Waiting for Mr. Haitham's Approval)
  if (!isTeacher) {
    if (enrollmentLoading) {
      return (
        <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-200 p-10 text-center text-sm text-gray-500">
          Loading your course status...
        </div>
      );
    }

    if (enrollment?.status === 'pending' && !switchingPending) {
      return (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-gradient-to-r from-[#6b1226] via-[#800020] to-[#3b1d5e] rounded-2xl p-6 text-white shadow-lg">
            <h1 className="text-2xl font-bold">
              {greeting()}, {user?.fullName?.split(' ')[0]}!
            </h1>
            <p className="text-rose-100 mt-1 text-sm">
              {user?.grade} Section {user?.section} — Mr. Haitham Hussien Mathematics Portal
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-amber-200 p-8 shadow-sm text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-3xl">
              ⏳
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold mb-2">
                Pending Mr. Haitham&apos;s Approval
              </span>
              <h2 className="text-xl font-bold text-gray-900">{enrollment.courseTitle}</h2>
              <p className="text-sm text-gray-600 mt-2 max-w-lg mx-auto">
                Your course selection has been sent to <strong>Mr. Haitham Hussien</strong>. Once Mr. Haitham approves your enrollment, your lessons, study materials, and homework portal will unlock here automatically.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Requested on {new Date(enrollment.requestedAt).toLocaleString('en-GB')}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={onRefreshEnrollment}
                className="px-5 py-2.5 rounded-xl bg-[#800020] hover:bg-[#6b1226] text-white text-xs font-bold transition shadow-xs"
              >
                Refresh Approval Status
              </button>
              <button
                onClick={() => {
                  setSelectedCourseId(enrollment.courseId);
                  setSwitchingPending(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition"
              >
                Change Selected Course
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!enrollment || enrollment.status !== 'approved' || switchingPending) {
      return (
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-gradient-to-r from-[#6b1226] via-[#800020] to-[#3b1d5e] rounded-2xl p-6 text-white shadow-lg">
            <h1 className="text-2xl font-bold">
              {greeting()}, {user?.fullName?.split(' ')[0]}!
            </h1>
            <p className="text-rose-100 mt-1 text-sm">
              Step 1: Select your registered IGCSE Mathematics group below to request Mr. Haitham&apos;s approval.
            </p>
          </div>

          {enrollment?.status === 'rejected' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
              <strong>Note from Mr. Haitham:</strong>{' '}
              {enrollment.teacherNote || 'Your previous request could not be approved. Please select your assigned course below.'}
            </div>
          )}

          {requestError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{requestError}</div>
          )}

          <form onSubmit={handleRequestCourse} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {COURSES.map((course) => {
                const isSelected = selectedCourseId === course.id;
                return (
                  <button
                    type="button"
                    key={course.id}
                    onClick={() => setSelectedCourseId(course.id)}
                    className={`rounded-2xl border p-5 text-center transition flex flex-col items-center justify-between min-h-[190px] ${
                      isSelected
                        ? 'bg-[#fdf2f4] border-[#800020] ring-2 ring-[#800020]/30 shadow-md'
                        : 'bg-white border-gray-200 hover:border-[#800020]/40 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className="w-14 h-14 rounded-2xl border border-gray-100 bg-[#fbfbfa] flex items-center justify-center mb-3 shadow-2xs"
                        style={{ boxShadow: `inset 0 0 0 1px ${course.color}20` }}
                      >
                        <span className="font-serif text-2xl font-black text-slate-900">{course.icon}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm leading-snug">{course.name}</h3>
                      <p className="text-[11px] font-medium text-gray-400 mt-1">{course.code}</p>
                      <p className="text-[11px] text-gray-500 mt-1">{course.board}</p>
                    </div>
                    <span
                      className={`mt-3 text-[11px] font-semibold px-3 py-1 rounded-full ${
                        isSelected ? 'bg-[#800020] text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {isSelected ? 'Selected ✓' : 'Select Group'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3">
              {switchingPending && (
                <button
                  type="button"
                  onClick={() => setSwitchingPending(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={!selectedCourseId || submittingRequest}
                className="px-6 py-3 rounded-xl bg-[#800020] hover:bg-[#6b1226] disabled:opacity-50 text-white text-sm font-bold transition shadow-sm"
              >
                {submittingRequest ? 'Sending Request...' : 'Request Course Approval from Mr. Haitham'}
              </button>
            </div>
          </form>
        </div>
      );
    }
  }

  // EDUCATOR OR APPROVED STUDENT DASHBOARD
  const pendingEnrollments = allEnrollments.filter((e) => e.status === 'pending');
  const approvedEnrollments = allEnrollments.filter((e) => e.status === 'approved');
  const studentCourse = !isTeacher ? visibleCourses[0] : null;
  const studentMaterialCount = studentCourse
    ? studentCourse.materials.filter((m) => !m.teacherOnly).length
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#6b1226] via-[#800020] to-[#3b1d5e] rounded-2xl p-6 text-white shadow-lg border border-[#9f1239]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white text-slate-900 flex flex-col items-center justify-center shadow-md shrink-0">
              <span className="font-serif text-2xl font-extrabold leading-none">H</span>
              <span className="text-[7px] uppercase tracking-widest text-blue-700 font-bold mt-0.5">Math</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {greeting()}, {user?.fullName?.split(' ')[0]}!
              </h1>
              <p className="text-rose-100 mt-1 text-sm">
                {isTeacher
                  ? 'Mr. Haitham Hussien · IGCSE Mathematics Educator Dashboard'
                  : `${user?.grade} Section ${user?.section} — Enrolled in ${studentCourse?.name || enrollment?.courseTitle}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onSelectView('homework-studio')}
              className="px-4 py-2 rounded-xl bg-white text-[#800020] hover:bg-rose-50 text-xs font-bold transition shadow-sm"
            >
              {isTeacher ? 'Homework Review Inbox' : 'Submit Homework & Reports'}
            </button>
            {isTeacher && (
              <>
                <button
                  onClick={() => onSelectView('upload-studio')}
                  className="px-4 py-2 rounded-xl bg-amber-300 hover:bg-amber-200 text-slate-900 text-xs font-bold transition shadow-sm"
                >
                  + Upload PDFs &amp; Videos
                </button>
                <button
                  onClick={() => onSelectView('modelkey')}
                  className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-semibold transition"
                >
                  Official Model Keys
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {isTeacher ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-xs">
              <p className="text-3xl font-bold text-gray-900">{COURSES.length}</p>
              <p className="text-xs text-gray-400 mt-1">Math Classes &amp; Groups</p>
            </div>
            <div
              onClick={() => onSelectView('homework-studio')}
              className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:border-[#800020]/40 hover:shadow-sm transition"
            >
              <p className="text-3xl font-bold text-[#800020]">{pendingSubmissionsCount}</p>
              <p className="text-xs text-gray-500 mt-1">Homework Pending Review &rarr;</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-xs">
              <p className="text-3xl font-bold text-amber-600">{pendingEnrollments.length}</p>
              <p className="text-xs text-gray-500 mt-1">Course Approvals Waiting</p>
            </div>
            <div
              onClick={() => onSelectView('modelkey')}
              className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:border-blue-200 hover:shadow-sm transition"
            >
              <p className="text-lg font-bold text-blue-700">Answer Keys</p>
              <p className="text-xs text-gray-500 mt-1">Educator Only Reference &rarr;</p>
            </div>
          </div>

          {(() => {
            const unreadTeacherNotifs = user
              ? notifications.filter((n) => !n.readByUserIds.includes(user.id))
              : [];
            if (unreadTeacherNotifs.length === 0) return null;
            return (
              <div className="bg-gradient-to-r from-[#fff5f7] via-white to-amber-50/40 rounded-2xl border-2 border-[#e4a6b3] p-5 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-[#800020] text-white flex items-center justify-center text-sm shadow-2xs">
                      🔔
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-[#701a2d]">New Student Homework Submissions</h2>
                        <span className="px-2 py-0.5 rounded-full bg-[#800020] text-white text-[10px] font-bold">
                          {unreadTeacherNotifs.length} Unread
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Students recently submitted homework for your review in the Educator Inbox.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectView('homework-studio')}
                    className="px-3.5 py-2 rounded-xl bg-[#800020] hover:bg-[#6b1226] text-white text-xs font-bold transition"
                  >
                    Open Submissions Inbox &rarr;
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {unreadTeacherNotifs.slice(0, 4).map((notif) => (
                    <div
                      key={notif.id}
                      className="rounded-xl border border-rose-200 bg-white p-3 text-xs space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-gray-900">{notif.title}</span>
                        {onMarkNotificationRead && (
                          <button
                            type="button"
                            onClick={() => onMarkNotificationRead(notif.id)}
                            className="text-[10px] font-semibold text-[#800020] hover:underline shrink-0"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600 leading-relaxed">{notif.message}</p>
                      <div className="flex items-center justify-between pt-0.5 text-[10px] text-gray-400">
                        <span>{new Date(notif.createdAt).toLocaleString('en-GB')}</span>
                        <button
                          type="button"
                          onClick={() => {
                            onMarkNotificationRead?.(notif.id);
                            onSelectView('homework-studio');
                          }}
                          className="text-[#800020] font-semibold hover:underline"
                        >
                          Review Paper &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            onClick={() => {
              if (studentCourse) {
                onSelectCourse(studentCourse.id);
                onSelectView('course');
              }
            }}
            className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:border-[#800020]/40 hover:shadow-sm transition"
          >
            <p className="text-lg font-bold text-gray-900">{studentCourse?.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {studentCourse?.videos.length || 0} video lessons &middot; {studentMaterialCount} files &rarr;
            </p>
          </div>
          <div
            onClick={() => onSelectView('homework-studio')}
            className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:border-[#800020]/40 hover:shadow-sm transition"
          >
            <p className="text-lg font-bold text-[#800020]">Homework Portal</p>
            <p className="text-xs text-gray-500 mt-1">Upload work &amp; read Mr. Haitham&apos;s reports &rarr;</p>
          </div>
          <div
            onClick={() => onSelectView('progress')}
            className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:border-blue-200 hover:shadow-sm transition"
          >
            <p className="text-lg font-bold text-blue-600">My Progress</p>
            <p className="text-xs text-gray-500 mt-1">View graded homework marks &rarr;</p>
          </div>
        </div>
      )}

      {/* Teacher-Only Course Enrollment Management Panel */}
      {isTeacher && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Student Course Approvals</h2>
              <p className="text-xs text-gray-500">
                Students see only the course you approve for them. Approve requests below or assign a student directly.
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold">
              {pendingEnrollments.length} pending &middot; {approvedEnrollments.length} approved
            </span>
          </div>

          {pendingEnrollments.length > 0 ? (
            <div className="space-y-2.5">
              {pendingEnrollments.map((reqItem) => (
                <div
                  key={reqItem.studentId}
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {reqItem.studentName}{' '}
                      <span className="text-xs font-normal text-gray-500">
                        ({reqItem.studentUsername} · {reqItem.grade || 'IGCSE'} {reqItem.section || ''})
                      </span>
                    </p>
                    <p className="text-xs text-amber-900 mt-0.5">
                      Requested: <strong>{reqItem.courseTitle}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={actionBusyId === reqItem.studentId}
                      onClick={() => handleTeacherApprove(reqItem.studentId)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                    >
                      Approve
                    </button>
                    <button
                      disabled={actionBusyId === reqItem.studentId}
                      onClick={() => handleTeacherReject(reqItem.studentId)}
                      className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-semibold transition"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 border border-gray-100">
              No pending student course requests right now.
            </p>
          )}

          {/* Direct Student Course Assignment */}
          <div className="pt-2 border-t border-gray-100 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Assign / Approve Student</label>
              <select
                value={assignStudentId}
                onChange={(e) => setAssignStudentId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-800 bg-white"
              >
                {[...STUDENTS, ...directorySeats.filter((u) => u.role === 'student')].map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.username} — {s.grade || 'IGCSE'} {s.section || ''})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Course Group</label>
              <select
                value={assignCourseId}
                onChange={(e) => setAssignCourseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-800 bg-white"
              >
                {COURSES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={actionBusyId === assignStudentId}
              onClick={() => handleTeacherApprove(assignStudentId, assignCourseId)}
              className="px-4 py-2 rounded-lg bg-[#800020] hover:bg-[#6b1226] text-white text-xs font-bold transition"
            >
              Approve &amp; Assign Course
            </button>
          </div>

          {/* RCIS Domain & Access Hub (3,500 Seats) + Parent Notification Binding */}
          <div className="mt-5 pt-5 border-t border-gray-100 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
              <h3 className="text-sm font-bold text-gray-900">
                Student &amp; Parent Directory ({activeSeatsCount} Active Accounts)
              </h3>
              <p className="text-xs text-gray-500">
                50 built-in Students + 50 linked Parents + custom CSV/directory accounts &amp; Resend parent emails
              </p>
              </div>
              <button
                onClick={() => onSelectView('progress')}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
              >
                Email Outbox ({outboxCount}) &amp; Stats &rarr;
              </button>
            </div>

            {directoryNotice && (
              <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-lg">
                {directoryNotice}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <form onSubmit={handleSaveParentEmail} className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2.5">
                <p className="text-xs font-bold text-gray-800">Bind Parent Notification Email (Resend Delivery)</p>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={editParentStudentId}
                    onChange={(e) => setEditParentStudentId(Number(e.target.value))}
                    className="flex-1 min-w-[150px] px-2.5 py-2 rounded-lg border border-gray-200 bg-white text-xs"
                  >
                    {[...STUDENTS, ...directorySeats.filter((u) => u.role === 'student')].map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.username})
                      </option>
                    ))}
                  </select>
                  <input
                    type="email"
                    value={editParentEmailVal}
                    onChange={(e) => setEditParentEmailVal(e.target.value)}
                    placeholder={parentEmailsMap[String(editParentStudentId)] || 'parent@domain.com'}
                    className="flex-1 min-w-[180px] px-2.5 py-2 rounded-lg border border-gray-200 bg-white text-xs"
                    required
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-lg bg-[#800020] text-white text-xs font-semibold hover:bg-[#6b1226]"
                  >
                    Save Email
                  </button>
                </div>
                <p className="text-[11px] text-gray-500">
                  Current parent email: <code className="bg-white px-1 rounded border">{parentEmailsMap[String(editParentStudentId)] || `parent.student${String(editParentStudentId).padStart(2, '0')}@mrhaithamhusseinig.edu`}</code>
                </p>
              </form>

              <form onSubmit={handleImportCsvSeats} className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
                <p className="text-xs font-bold text-gray-800">
                  Bulk Add / Import Accounts ({directorySeats.length} custom added)
                </p>
                <textarea
                  rows={2}
                  value={csvImportText}
                  onChange={(e) => setCsvImportText(e.target.value)}
                  placeholder="username,password,Full Name,student|parent,Domain,parent@email.com"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-mono"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                  >
                    Import into Directory
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Student / Parent Unread Assignment & Report Notifications */}
      {!isTeacher && (() => {
        const unreadNotifs = user
          ? notifications.filter((n) => !n.readByUserIds.includes(user.id))
          : [];
        if (unreadNotifs.length === 0) return null;
        return (
          <div className="bg-gradient-to-r from-[#fff5f7] via-white to-amber-50/40 rounded-2xl border-2 border-[#e4a6b3] p-5 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-[#800020] text-white flex items-center justify-center text-sm shadow-2xs">
                  🔔
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-[#701a2d]">New Notifications</h2>
                    <span className="px-2 py-0.5 rounded-full bg-[#800020] text-white text-[10px] font-bold">
                      {unreadNotifs.length} Unread
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    New homework updates or marked reports sent by Mr. Haitham Hussien.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectView('homework-studio')}
                className="px-3.5 py-2 rounded-xl bg-[#800020] hover:bg-[#6b1226] text-white text-xs font-bold transition"
              >
                Open Homework Portal &rarr;
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {unreadNotifs.slice(0, 4).map((notif) => (
                <div
                  key={notif.id}
                  className="rounded-xl border border-rose-200 bg-white p-3 text-xs space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-gray-900">{notif.title}</span>
                    {onMarkNotificationRead && (
                      <button
                        type="button"
                        onClick={() => onMarkNotificationRead(notif.id)}
                        className="text-[10px] font-semibold text-[#800020] hover:underline shrink-0"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">{notif.message}</p>
                  <div className="flex items-center justify-between pt-0.5 text-[10px] text-gray-400">
                    <span>{new Date(notif.createdAt).toLocaleString('en-GB')}</span>
                    <button
                      type="button"
                      onClick={() => {
                        onMarkNotificationRead?.(notif.id);
                        onSelectView('homework-studio');
                      }}
                      className="text-[#800020] font-semibold hover:underline"
                    >
                      {notif.type === 'assignment' ? 'Submit Homework →' : 'View Report →'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Student Active Assigned Homework Banner */}
      {!isTeacher && groupAssignments.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#f0d0d6] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#701a2d]">
                Assigned Homework — {enrollment?.courseTitle}
              </h2>
              <p className="text-xs text-gray-500">
                Select an assignment under Homework &amp; Reports to read full instructions and submit before the due date.
              </p>
            </div>
            <button
              onClick={() => onSelectView('homework-studio')}
              className="px-3.5 py-2 rounded-xl bg-[#800020] hover:bg-[#6b1226] text-white text-xs font-bold transition"
            >
              Open &amp; Submit &rarr;
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {groupAssignments.map((hw) => (
              <div key={hw.id} className="rounded-xl border border-rose-100 bg-rose-50/40 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-gray-900">{hw.title}</span>
                  {hw.dueDate && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                      Due: {new Date(hw.dueDate).toLocaleString('en-GB')}
                    </span>
                  )}
                </div>
                {hw.instructions && (
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{hw.instructions}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Course Grid (All 8 for Mr. Haitham, ONLY 1 approved course for student) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {isTeacher ? 'All Mathematics Courses' : 'Your Approved Course'}
          </h2>
          <span className="text-xs text-gray-500">
            {isTeacher
              ? 'Open any course to manage lessons, materials, or review homework'
              : 'Click your course to watch lessons, download materials, or submit homework'}
          </span>
        </div>

        <div className={`grid gap-4 ${isTeacher ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 max-w-2xl'}`}>
          {visibleCourses.map((course) => {
            const visibleMatCount = isTeacher
              ? course.materials.length
              : course.materials.filter((m) => !m.teacherOnly).length;
            return (
              <button
                key={course.id}
                onClick={() => {
                  onSelectCourse(course.id);
                  onSelectView('course');
                }}
                className="bg-white rounded-2xl border border-gray-200/80 p-6 text-center hover:border-[#800020]/40 hover:shadow-md transition group flex flex-col items-center justify-between min-h-[210px]"
              >
                <div className="flex flex-col items-center">
                  <div
                    className="w-16 h-16 rounded-2xl border border-gray-100 bg-[#fbfbfa] flex items-center justify-center mb-4 shadow-2xs group-hover:scale-105 transition-transform"
                    style={{ boxShadow: `inset 0 0 0 1px ${course.color}20` }}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-[7px] leading-tight text-left font-bold uppercase tracking-tight text-blue-900">
                        Math
                        <br />
                        Made
                        <br />
                        Easy
                      </span>
                      <span className="font-serif text-3xl font-black text-slate-900 leading-none">
                        {course.icon}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-900 text-base group-hover:text-[#800020] transition leading-snug">
                    {course.name}
                  </h3>
                  <p className="text-[11px] font-medium text-gray-400 mt-1">{course.code}</p>
                </div>

                <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-gray-100 w-full text-[11px] text-gray-500">
                  <span>{course.videos.length} videos</span>
                  <span>&middot;</span>
                  <span>{visibleMatCount} files</span>
                  <span>&middot;</span>
                  <span className="text-[#800020] font-semibold">Open Course</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
