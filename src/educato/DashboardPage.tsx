import React, { useEffect, useState, useCallback } from 'react';
import { Bell, CheckCircle2, ChevronDown, Users, X, ArrowUpRight, Search } from 'lucide-react';
import { useAuth } from './AuthContext';
import { COURSES, Course, CourseEnrollment } from './courses';
import { STUDENTS, RCIS_CAPACITY } from './students';
import { apiUrl } from '../utils/apiBase';
import type { DirectorySeatUser, HomeworkAssignmentRecord, PortalNotification } from '../types';
import { LessonSketchSvg } from '../components/LessonSketchSvg';

interface DashboardProps {
  enrollment: CourseEnrollment | null;
  enrollmentLoading: boolean;
  visibleCourses: Course[];
  notifications?: PortalNotification[];
  onMarkNotificationRead?: (notifId: string) => Promise<void>;
  onRefreshEnrollment: () => Promise<void>;
  onSelectCourse: (courseId: string) => void;
  onSelectView: (view: string) => void;
  onHoverTopicChange?: (topic: string) => void;
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
  onHoverTopicChange,
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

  // Blue Notebook Hero, Humanized Pickers & Roster Modal state
  const [hoveredCourseTopic, setHoveredCourseTopic] = useState<string>('');
  const [hoveredCourseId, setHoveredCourseId] = useState<string>('');
  const [courseBoardFilter, setCourseBoardFilter] = useState<'all' | 'edexcel' | 'cambridge' | 'foundation'>('all');
  const [courseSearch, setCourseSearch] = useState<string>('');
  const [showCsvImportModal, setShowCsvImportModal] = useState<boolean>(false);
  const [assignPickerOpen, setAssignPickerOpen] = useState<boolean>(false);
  const [parentPickerOpen, setParentPickerOpen] = useState<boolean>(false);
  const [studentPickerQuery, setStudentPickerQuery] = useState<string>('');

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
          role: role === 'assistant' || role === 'teacher' ? 'teacher' : role === 'parent' ? 'parent' : 'student',
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
        <div className="bg-gradient-to-r from-[#214266] via-[#163252] to-[#0f243d] rounded-2xl p-6 text-white shadow-lg border border-[#2b517c]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-bold uppercase tracking-wider mb-2">
                Parent Portal
              </span>
              <h1 className="text-2xl font-bold">
                {greeting()}, {user?.fullName}!
              </h1>
              <p className="text-sky-100 mt-1 text-sm">
                Linked Student: <strong>{user?.linkedStudentName}</strong> ({user?.grade} Section {user?.section})
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onSelectView('homework-studio')}
                className="px-4 py-2 rounded-xl bg-white text-[#163252] hover:bg-[#eef4fa] text-xs font-bold transition shadow-sm"
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
            <p className="text-3xl font-bold text-[#163252]">
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
              className="text-xs font-semibold text-[#163252] hover:underline"
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
                  className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-gray-100 bg-[#f7f9fc]/70 hover:bg-white hover:border-[#163252]/30 cursor-pointer transition"
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
                    <p className="text-base font-extrabold text-[#163252]">
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
          <div className="bg-gradient-to-r from-[#214266] via-[#163252] to-[#0f243d] rounded-2xl p-6 text-white shadow-lg">
            <h1 className="text-2xl font-bold">
              {greeting()}, {user?.fullName?.split(' ')[0]}!
            </h1>
            <p className="text-sky-100 mt-1 text-sm">
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
                className="px-5 py-2.5 rounded-xl bg-[#163252] hover:bg-[#214266] text-white text-xs font-bold transition shadow-xs"
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
          <div className="bg-gradient-to-r from-[#214266] via-[#163252] to-[#0f243d] rounded-2xl p-6 text-white shadow-lg">
            <h1 className="text-2xl font-bold">
              {greeting()}, {user?.fullName?.split(' ')[0]}!
            </h1>
            <p className="text-sky-100 mt-1 text-sm">
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
                        ? 'bg-[#eef4fa] border-[#163252] ring-2 ring-[#163252]/30 shadow-md'
                        : 'bg-white border-gray-200 hover:border-[#163252]/40 hover:shadow-sm'
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
                        isSelected ? 'bg-[#163252] text-white' : 'bg-gray-100 text-gray-600'
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
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-[#f7f9fc]"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={!selectedCourseId || submittingRequest}
                className="px-6 py-3 rounded-xl bg-[#163252] hover:bg-[#214266] disabled:opacity-50 text-white text-sm font-bold transition shadow-sm"
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
  const featuredContinueCourse = studentCourse || visibleCourses[2] || visibleCourses[0] || COURSES[0];
  const studentMaterialCount = studentCourse
    ? studentCourse.materials.filter((m) => !m.teacherOnly).length
    : 0;

  const filteredDashboardCourses = visibleCourses.filter((c) => {
    const q = courseSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.board.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (courseBoardFilter === 'all') return true;
    const boardLow = c.board.toLowerCase();
    if (courseBoardFilter === 'edexcel') return boardLow.includes('edexcel');
    if (courseBoardFilter === 'cambridge') return boardLow.includes('cambridge');
    return boardLow.includes('foundation') || boardLow.includes('lower') || boardLow.includes('pre-igcse');
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Blue Notebook Hero Banner */}
      <div className="relative navy-notebook-banner rounded-2xl p-6 sm:p-8 shadow-lg border border-[#2a4d77] overflow-hidden">
        <div className="pointer-events-none absolute -right-12 -top-8 w-[420px] h-[270px]">
          <LessonSketchSvg
            topicText={hoveredCourseTopic || featuredContinueCourse?.name || 'Pythagoras Algebra'}
            courseId={hoveredCourseId || featuredContinueCourse?.id}
            variant="watermark"
            watermarkTone="dark"
          />
        </div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-sky-200/80">
                01 / A FRESH PAGE
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-sky-100 font-semibold">
                Math Made Easy &bull; The Blue Notebook
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold math-serif leading-tight tracking-tight text-white">
              {isTeacher ? (
                <>
                  {greeting()}, Mr. Haitham.
                  <br />
                  <span className="text-sky-200/90 font-normal">Educator Studio &amp; Marking Hub</span>
                </>
              ) : (
                <>
                  Math makes sense.
                  <br />
                  Just not all at once.
                </>
              )}
            </h1>

            <p className="text-xs sm:text-sm text-sky-100/85 max-w-lg leading-relaxed">
              {isTeacher
                ? 'Review student homework, upload Explain PDFs and YouTube lessons across course folders, and send parent reports cleanly.'
                : `${greeting()}, ${user?.fullName?.split(' ')[0]}! Some topics take a second explanation. Watch a lesson, try it yourself, and take your time.`}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => onSelectView('homework-studio')}
                className="px-4 py-2.5 rounded-xl bg-white text-[#163252] hover:bg-sky-50 text-xs font-bold transition shadow-sm"
              >
                {isTeacher ? 'Homework Review Inbox' : 'Submit Homework & Reports'}
              </button>
              {isTeacher ? (
                <>
                  <button
                    onClick={() => onSelectView('upload-studio')}
                    className="px-4 py-2.5 rounded-xl bg-[#dce6f0] hover:bg-white text-[#163252] text-xs font-bold transition shadow-sm"
                  >
                    + Upload PDFs &amp; Videos
                  </button>
                  <button
                    onClick={() => onSelectView('modelkey')}
                    className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold transition"
                  >
                    Official Model Keys
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    if (studentCourse) {
                      onSelectCourse(studentCourse.id);
                      onSelectView('course');
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/25 text-xs font-semibold transition"
                >
                  Open {studentCourse?.name || 'Course'} &darr;
                </button>
              )}
              <span className="teacher-handwriting text-base text-sky-200/80 ml-1">
                We&apos;ll get there together.
              </span>
            </div>
          </div>

          {/* Smart Topic-Aware Blueprint Chalkboard Sketch */}
          <div className="lg:col-span-5">
            <LessonSketchSvg
              topicText={hoveredCourseTopic || featuredContinueCourse?.name || 'Pythagoras Algebra'}
              courseId={hoveredCourseId || featuredContinueCourse?.id}
              variant="hero"
            />
          </div>
        </div>

        {/* Continue Learning Bottom Notebook Strip */}
        {featuredContinueCourse && (
          <div className="mt-6 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <span className="text-[9px] uppercase tracking-[0.16em] text-sky-200/70 block">
                Back to your notebook
              </span>
              <span className="font-semibold text-white text-sm">{featuredContinueCourse.name}</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-white font-medium block">{featuredContinueCourse.videos[0]?.title || 'Core Algebra'}</span>
              <span className="text-[11px] text-sky-200/75">
                {featuredContinueCourse.videos.length} video lessons available
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-28 h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full w-1/3 bg-[#dce6f0] rounded-full" />
              </div>
              <button
                type="button"
                onClick={() => {
                  onSelectCourse(featuredContinueCourse.id);
                  onSelectView('course');
                }}
                className="text-xs font-bold text-white hover:text-sky-200 transition"
              >
                {isTeacher ? 'Resume teaching →' : 'Continue learning →'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {isTeacher ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-2xs">
              <p className="text-3xl font-bold text-[#13294B] math-serif">{COURSES.length}</p>
              <p className="text-xs text-slate-500 mt-1">Math Classes &amp; Groups</p>
            </div>
            <div
              onClick={() => onSelectView('homework-studio')}
              className="bg-white rounded-xl border border-[#E5E7EB] p-4 cursor-pointer hover:border-[#1B365D]/40 hover:shadow-sm transition"
            >
              {pendingSubmissionsCount === 0 ? (
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span className="text-lg font-bold">All caught up</span>
                </div>
              ) : (
                <p className="text-3xl font-bold text-[#1B365D] math-serif">{pendingSubmissionsCount}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">Homework Pending Review &rarr;</p>
            </div>
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-2xs">
              {pendingEnrollments.length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span className="text-lg font-bold">All clear</span>
                </div>
              ) : (
                <p className="text-3xl font-bold text-amber-600 math-serif">{pendingEnrollments.length}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">Course Approvals Waiting</p>
            </div>
            <div
              onClick={() => onSelectView('modelkey')}
              className="bg-white rounded-xl border border-[#E5E7EB] p-4 cursor-pointer hover:border-[#1B365D]/40 hover:shadow-sm transition"
            >
              <p className="text-lg font-bold text-[#13294B]">Answer Keys</p>
              <p className="text-xs text-slate-500 mt-1">Educator Reference Library &rarr;</p>
            </div>
          </div>

          {(() => {
            const unreadTeacherNotifs = user
              ? notifications.filter((n) => !n.readByUserIds.includes(user.id))
              : [];
            if (unreadTeacherNotifs.length === 0) return null;
            return (
              <div className="bg-gradient-to-r from-[#eef4fa] via-white to-[#F7F6F2] rounded-2xl border border-[#c5d6e8] p-5 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-[#1B365D] text-white flex items-center justify-center shadow-2xs">
                      <Bell className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-[#13294B]">New Student Homework Submissions</h2>
                        <span className="px-2 py-0.5 rounded-full bg-[#1B365D] text-white text-[10px] font-bold">
                          {unreadTeacherNotifs.length} Unread
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Students recently submitted homework for your review in the Inbox.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectView('homework-studio')}
                    className="px-3.5 py-2 rounded-xl bg-[#1B365D] hover:bg-[#13294B] text-white text-xs font-bold transition"
                  >
                    Open Submissions Inbox &rarr;
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {unreadTeacherNotifs.slice(0, 4).map((notif) => (
                    <div
                      key={notif.id}
                      className="rounded-xl border border-[#c5d6e8] bg-white p-3 text-xs space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-gray-900">{notif.title}</span>
                        {onMarkNotificationRead && (
                          <button
                            type="button"
                            onClick={() => onMarkNotificationRead(notif.id)}
                            className="text-[10px] font-semibold text-[#163252] hover:underline shrink-0"
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
                          className="text-[#163252] font-semibold hover:underline"
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
            className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:border-[#163252]/40 hover:shadow-sm transition"
          >
            <p className="text-lg font-bold text-gray-900">{studentCourse?.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {studentCourse?.videos.length || 0} video lessons &middot; {studentMaterialCount} files &rarr;
            </p>
          </div>
          <div
            onClick={() => onSelectView('homework-studio')}
            className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:border-[#163252]/40 hover:shadow-sm transition"
          >
            <p className="text-lg font-bold text-[#163252]">Homework Portal</p>
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

      {/* Teacher-Only Course Enrollment & Class Roster Card */}
      {isTeacher && (() => {
        const allRosterStudents = [...STUDENTS, ...directorySeats.filter((u) => u.role === 'student')];
        const filteredPickerStudents = allRosterStudents.filter((s) => {
          const q = studentPickerQuery.trim().toLowerCase();
          return (
            !q ||
            s.fullName.toLowerCase().includes(q) ||
            `${s.grade || ''} ${s.section || ''}`.toLowerCase().includes(q)
          );
        });
        const selectedAssignStudent =
          allRosterStudents.find((s) => s.id === assignStudentId) || allRosterStudents[0];
        const selectedParentStudent =
          allRosterStudents.find((s) => s.id === editParentStudentId) || allRosterStudents[0];
        const getInitials = (name: string) =>
          name
            .split(' ')
            .filter(Boolean)
            .map((p) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

        return (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-[#13294B] math-serif">Student Course Approvals</h2>
              <p className="text-xs text-slate-500">
                Students see only the class you place them in. Approve new requests below or place a student directly.
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-[#F7F6F2] text-[#13294B] border border-[#E5E7EB] font-semibold">
              {pendingEnrollments.length === 0
                ? `All clear · ${approvedEnrollments.length} placed`
                : `${pendingEnrollments.length} pending · ${approvedEnrollments.length} placed`}
            </span>
          </div>

          {pendingEnrollments.length > 0 ? (
            <div className="space-y-2.5">
              {pendingEnrollments.map((reqItem) => (
                <div
                  key={reqItem.studentId}
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#1B365D] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {getInitials(reqItem.studentName)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {reqItem.studentName}{' '}
                        <span className="ml-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-amber-200 text-slate-600">
                          {reqItem.grade || 'IGCSE'} {reqItem.section || ''}
                        </span>
                      </p>
                      <p className="text-xs text-amber-900 mt-0.5">
                        Requested: <strong>{reqItem.courseTitle}</strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={actionBusyId === reqItem.studentId}
                      onClick={() => handleTeacherApprove(reqItem.studentId)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#1B365D] hover:bg-[#13294B] text-white text-xs font-bold transition"
                    >
                      Approve
                    </button>
                    <button
                      disabled={actionBusyId === reqItem.studentId}
                      onClick={() => handleTeacherReject(reqItem.studentId)}
                      className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-[#E5E7EB] text-xs font-semibold transition"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-[#F7F6F2] rounded-xl px-4 py-3 border border-[#E5E7EB]">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Everyone is placed &mdash; no pending requests.</span>
            </div>
          )}

          {/* Direct Student Course Placement (Humanized Picker) */}
          <div className="pt-2 border-t border-gray-100 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px] relative">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Place Student</label>
              <button
                type="button"
                onClick={() => {
                  setAssignPickerOpen((v) => !v);
                  setParentPickerOpen(false);
                  setStudentPickerQuery('');
                }}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-xl text-xs bg-white flex items-center justify-between gap-2 hover:border-[#1B365D]/40 transition"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-[#eef4fa] text-[#13294B] text-[10px] font-bold flex items-center justify-center shrink-0">
                    {getInitials(selectedAssignStudent?.fullName || 'ST')}
                  </span>
                  <span className="font-semibold text-slate-800 truncate">
                    {selectedAssignStudent?.fullName}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F7F6F2] text-slate-600 border border-[#E5E7EB] shrink-0">
                    {selectedAssignStudent?.grade || 'IGCSE'} {selectedAssignStudent?.section || ''}
                  </span>
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
              {assignPickerOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-xl shadow-lg z-30 overflow-hidden">
                  <div className="p-2 border-b border-gray-100 flex items-center gap-1.5 bg-[#F7F6F2]">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={studentPickerQuery}
                      onChange={(e) => setStudentPickerQuery(e.target.value)}
                      placeholder="Find student by name..."
                      className="w-full text-xs bg-transparent outline-none text-slate-800"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                    {filteredPickerStudents.map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => {
                          setAssignStudentId(s.id);
                          setAssignPickerOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-[#eef4fa] flex items-center justify-between gap-2"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-[#eef4fa] text-[#13294B] text-[10px] font-bold flex items-center justify-center shrink-0">
                            {getInitials(s.fullName)}
                          </span>
                          <span className="font-medium text-slate-800 truncate">{s.fullName}</span>
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F7F6F2] text-slate-600 border border-[#E5E7EB] shrink-0">
                          {s.grade || 'IGCSE'} {s.section || ''}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Course Group</label>
              <select
                value={assignCourseId}
                onChange={(e) => setAssignCourseId(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-xl text-xs text-slate-800 bg-white font-medium"
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
              className="px-4 py-2.5 rounded-xl bg-[#1B365D] hover:bg-[#13294B] text-white text-xs font-bold transition shadow-2xs"
            >
              Approve &amp; Place Student
            </button>
          </div>

          {/* Class Roster & Parent Contact Email */}
          <div className="mt-5 pt-5 border-t border-gray-100 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-[#eef4fa] text-[#13294B] border border-[#dce6f0] flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#13294B] math-serif">
                    Class Roster ({activeSeatsCount} people)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Manage student placements and parent contact emails
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCsvImportModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB] hover:border-[#1B365D]/40 hover:bg-[#F7F6F2] text-[#13294B] text-xs font-semibold transition"
                >
                  Manage Roster &amp; CSV Import
                </button>
                <button
                  onClick={() => onSelectView('progress')}
                  className="px-3.5 py-2 rounded-xl bg-[#1B365D] hover:bg-[#13294B] text-white text-xs font-semibold transition"
                >
                  Parent Emails ({outboxCount}) &amp; Stats &rarr;
                </button>
              </div>
            </div>

            {directoryNotice && (
              <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-lg">
                {directoryNotice}
              </div>
            )}

            <form onSubmit={handleSaveParentEmail} className="bg-[#F7F6F2] rounded-xl p-4 border border-[#E5E7EB] space-y-2.5">
              <p className="text-xs font-bold text-[#13294B]">Parent Contact Email</p>
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex-1 min-w-[210px] relative">
                  <button
                    type="button"
                    onClick={() => {
                      setParentPickerOpen((v) => !v);
                      setAssignPickerOpen(false);
                      setStudentPickerQuery('');
                    }}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-xl text-xs bg-white flex items-center justify-between gap-2 hover:border-[#1B365D]/40 transition"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-[#eef4fa] text-[#13294B] text-[10px] font-bold flex items-center justify-center shrink-0">
                        {getInitials(selectedParentStudent?.fullName || 'ST')}
                      </span>
                      <span className="font-semibold text-slate-800 truncate">
                        {selectedParentStudent?.fullName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F7F6F2] text-slate-600 border border-[#E5E7EB] shrink-0">
                        {selectedParentStudent?.grade || 'IGCSE'} {selectedParentStudent?.section || ''}
                      </span>
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>
                  {parentPickerOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-xl shadow-lg z-30 overflow-hidden">
                      <div className="p-2 border-b border-gray-100 flex items-center gap-1.5 bg-[#F7F6F2]">
                        <Search className="w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={studentPickerQuery}
                          onChange={(e) => setStudentPickerQuery(e.target.value)}
                          placeholder="Find student by name..."
                          className="w-full text-xs bg-transparent outline-none text-slate-800"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                        {filteredPickerStudents.map((s) => (
                          <button
                            type="button"
                            key={s.id}
                            onClick={() => {
                              setEditParentStudentId(s.id);
                              setParentPickerOpen(false);
                            }}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-[#eef4fa] flex items-center justify-between gap-2"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 rounded-full bg-[#eef4fa] text-[#13294B] text-[10px] font-bold flex items-center justify-center shrink-0">
                                {getInitials(s.fullName)}
                              </span>
                              <span className="font-medium text-slate-800 truncate">{s.fullName}</span>
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F7F6F2] text-slate-600 border border-[#E5E7EB] shrink-0">
                              {s.grade || 'IGCSE'} {s.section || ''}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <input
                  type="email"
                  value={editParentEmailVal}
                  onChange={(e) => setEditParentEmailVal(e.target.value)}
                  placeholder={parentEmailsMap[String(editParentStudentId)] || 'parent@domain.com'}
                  className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs outline-none focus:border-[#1B365D]"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1B365D] text-white text-xs font-semibold hover:bg-[#13294B] transition"
                >
                  Save Email
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Saved email for <strong>{selectedParentStudent?.fullName}</strong>:{' '}
                <span className="bg-white px-2 py-0.5 rounded-md border border-[#E5E7EB] text-slate-700 font-medium">
                  {parentEmailsMap[String(editParentStudentId)] || `parent.student${String(editParentStudentId).padStart(2, '0')}@mrhaithamhusseinig.edu`}
                </span>
              </p>
            </form>
          </div>
        </div>
        );
      })()}

      {/* Clean Modal for Bulk Roster & CSV Import */}
      {showCsvImportModal && isTeacher && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowCsvImportModal(false)}
        >
          <div
            className="bg-white border border-[#E5E7EB] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#13294B] math-serif">
                  Manage Roster &amp; CSV Import
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Add individual students, parents, or assistants ({directorySeats.length} custom accounts saved).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCsvImportModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-[#F7F6F2]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                await handleImportCsvSeats(e);
              }}
              className="space-y-3"
            >
              <div className="text-[11px] text-slate-600 bg-[#F7F6F2] rounded-xl p-3 border border-[#E5E7EB] space-y-1">
                <p className="font-semibold text-[#13294B]">Paste one account per line:</p>
                <p className="font-mono text-[10px] text-slate-500">
                  username,password,Full Name,student|parent|assistant,Mr.HaithamHusseinig,parent@email.com
                </p>
              </div>
              <textarea
                rows={4}
                value={csvImportText}
                onChange={(e) => setCsvImportText(e.target.value)}
                placeholder="hala.ahmed,hala2024,Hala Ahmed,student,Mr.HaithamHusseinig,parent@email.com"
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-mono outline-none focus:border-[#1B365D]"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCsvImportModal(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F7F6F2] text-xs font-semibold text-slate-700"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1B365D] hover:bg-[#13294B] text-white text-xs font-bold transition"
                >
                  Add Accounts to Roster
                </button>
              </div>
            </form>
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
          <div className="bg-gradient-to-r from-[#f4f8fc] via-white to-amber-50/40 rounded-2xl border-2 border-[#9ec2ea] p-5 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-[#163252] text-white flex items-center justify-center text-sm shadow-2xs">
                  🔔
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-[#163252]">New Notifications</h2>
                    <span className="px-2 py-0.5 rounded-full bg-[#163252] text-white text-[10px] font-bold">
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
                className="px-3.5 py-2 rounded-xl bg-[#163252] hover:bg-[#214266] text-white text-xs font-bold transition"
              >
                Open Homework Portal &rarr;
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {unreadNotifs.slice(0, 4).map((notif) => (
                <div
                  key={notif.id}
                  className="rounded-xl border border-[#c5d6e8] bg-white p-3 text-xs space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-gray-900">{notif.title}</span>
                    {onMarkNotificationRead && (
                      <button
                        type="button"
                        onClick={() => onMarkNotificationRead(notif.id)}
                        className="text-[10px] font-semibold text-[#163252] hover:underline shrink-0"
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
                      className="text-[#163252] font-semibold hover:underline"
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
        <div className="bg-white rounded-2xl border border-[#d3dfec] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#163252]">
                Assigned Homework — {enrollment?.courseTitle}
              </h2>
              <p className="text-xs text-gray-500">
                Select an assignment under Homework &amp; Reports to read full instructions and submit before the due date.
              </p>
            </div>
            <button
              onClick={() => onSelectView('homework-studio')}
              className="px-3.5 py-2 rounded-xl bg-[#163252] hover:bg-[#214266] text-white text-xs font-bold transition"
            >
              Open &amp; Submit &rarr;
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {groupAssignments.map((hw) => (
              <div key={hw.id} className="rounded-xl border border-[#dce6f0] bg-[#eef4fa]/70 p-3.5 space-y-1.5">
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

      {/* Course Grid (Blue Notebook Classes & Syllabi) */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#4c698a] block">
              02 / YOUR CLASSES
            </span>
            <h2 className="text-2xl font-bold text-[#13294B] math-serif mt-0.5">
              {isTeacher ? 'Your Classes & Syllabi' : 'Your Approved Course'}
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {isTeacher ? `${COURSES.length} active groups this term.` : 'All lessons, materials & homework inside.'}
          </span>
        </div>

        {isTeacher && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'All courses' },
                  { id: 'edexcel', label: 'Edexcel' },
                  { id: 'cambridge', label: 'Cambridge' },
                  { id: 'foundation', label: 'Pre-IGCSE / Y8' },
                ] as const
              ).map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setCourseBoardFilter(pill.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    courseBoardFilter === pill.id
                      ? 'bg-[#1B365D] text-white border-[#1B365D]'
                      : 'bg-white text-[#355070] border-[#E5E7EB] hover:bg-[#eef4fa]'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                placeholder="Search courses or syllabus..."
                className="pl-8 pr-3.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-xs text-slate-800 w-64 outline-none focus:border-[#1B365D]"
              />
            </div>
          </div>
        )}

        <div className={`grid gap-4 ${isTeacher ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 max-w-2xl'}`}>
          {filteredDashboardCourses.map((course, idx) => {
            const visibleMatCount = isTeacher
              ? course.materials.length
              : course.materials.filter((m) => !m.teacherOnly).length;
            const numLabel = String(idx + 1).padStart(2, '0');
            const enrolledCount = approvedEnrollments.filter((e) => e.courseId === course.id).length;
            const displayStudents = enrolledCount > 0 ? enrolledCount : [14, 18, 22, 16, 11, 15, 13, 19][idx % 8];
            const updatedLabels = ['Updated today', 'Updated 1d ago', 'Updated 2d ago', 'Updated 2d ago', 'Updated 3d ago', 'Updated 4d ago', 'Updated 5d ago', 'Updated 1w ago'];
            return (
              <button
                key={course.id}
                onMouseEnter={() => {
                  const topic = `${course.name} ${course.description}`;
                  setHoveredCourseTopic(topic);
                  setHoveredCourseId(course.id);
                  onHoverTopicChange?.(topic);
                }}
                onMouseLeave={() => {
                  setHoveredCourseTopic('');
                  setHoveredCourseId('');
                  onHoverTopicChange?.('');
                }}
                onClick={() => {
                  onSelectCourse(course.id);
                  onSelectView('course');
                }}
                className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden text-left hover:border-[#1B365D] hover:shadow-md transition group flex flex-col justify-between shadow-2xs"
              >
                <div className="relative w-full">
                  <span className="absolute top-2 left-2.5 z-10 text-[10px] font-mono font-bold text-[#13294B]/70">
                    {numLabel}
                  </span>
                  <LessonSketchSvg
                    topicText=""
                    courseId={course.id}
                    variant="card"
                    labelOverride={course.code}
                  />
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between w-full space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#5b7797]">
                        {course.board}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {updatedLabels[idx % updatedLabels.length]}
                      </span>
                    </div>
                    <h3 className="font-bold text-[#13294B] math-serif text-base mt-1 group-hover:text-[#1B365D] transition leading-snug">
                      {course.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {displayStudents} students &middot; {course.videos.length} videos &middot; {visibleMatCount} files
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 w-full text-[11px] text-slate-500">
                    <span>{course.code}</span>
                    <span className="inline-flex items-center gap-1 text-[#1B365D] font-bold group-hover:translate-x-0.5 transition-transform">
                      <span>Open course</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
