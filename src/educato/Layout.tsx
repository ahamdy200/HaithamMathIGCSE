import React, { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { DashboardPage } from './DashboardPage';
import { CoursePage } from './CoursePage';
import { ProgressPage } from './ProgressPage';
import { COURSES, CourseEnrollment } from './courses';
import { useAuth } from './AuthContext';
import { StudentHomeworkPortal } from '../components/StudentHomeworkPortal';
import { TeacherModelKeyViewer } from '../components/TeacherModelKeyViewer';
import { CourseMaterialsStudio } from '../components/CourseMaterialsStudio';
import { LessonSketchSvg } from '../components/LessonSketchSvg';
import { AdminPinModal, hasEducatorSession, clearEducatorSession } from '../components/Auth/AdminPinModal';
import { StudentManagementView } from '../components/Admin/StudentManagementView';
import { verifyEducatorSessionServer } from '../utils/educatorApi';
import { apiUrl } from '../utils/apiBase';
import type { PortalNotification } from '../types';

export function Layout() {
  const { user } = useAuth();
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState<boolean>(
    user?.role === 'student' || user?.role === 'parent'
  );
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [focusSubmissionId, setFocusSubmissionId] = useState<string | null>(null);
  const [activeLessonTopic, setActiveLessonTopic] = useState<string>('');
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<number | undefined>(undefined);

  const isTeacher = user?.role === 'teacher';
  const isParent = user?.role === 'parent';
  const parentChildIds = isParent
    ? Array.from(
        new Set([
          ...(Array.isArray(user?.linkedStudentIds) ? user.linkedStudentIds : []),
          ...(user?.linkedStudentId ? [user.linkedStudentId] : []),
        ])
      )
    : [];
  const targetStudentId = isParent
    ? selectedChildId || parentChildIds[0] || user?.linkedStudentId
    : user?.role === 'student'
    ? user.id
    : null;
  const isApprovedStudent = user?.role === 'student' && enrollment?.status === 'approved';
  const isApprovedParent = isParent && enrollment?.status === 'approved';

  const refreshEnrollment = useCallback(async () => {
    if (!user || (user.role !== 'student' && user.role !== 'parent') || !targetStudentId) {
      setEnrollment(null);
      setEnrollmentLoading(false);
      return;
    }
    setEnrollmentLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/enrollments?studentId=${targetStudentId}`));
      if (res.ok) {
        const data = await res.json();
        const found: CourseEnrollment | null = data?.enrollment || null;
        setEnrollment(found);
        if (found?.status === 'approved' && found.courseId) {
          setActiveCourseId(found.courseId);
        }
      }
    } catch (err) {
      console.error('Failed to load course enrollment status:', err);
    } finally {
      setEnrollmentLoading(false);
    }
  }, [user, targetStudentId]);

  useEffect(() => {
    setActiveView('dashboard');
    setActiveCourseId(null);
    refreshEnrollment();
  }, [refreshEnrollment]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const courseParam = enrollment?.courseId ? `&courseId=${encodeURIComponent(enrollment.courseId)}` : '';
      const studentParam = targetStudentId ? `&studentId=${targetStudentId}` : '';
      const res = await fetch(
        apiUrl(`/api/notifications?role=${encodeURIComponent(user.role)}${courseParam}${studentParam}`)
      );
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
      }
    } catch {
      // ignore transient errors
    }
  }, [user, enrollment?.courseId, targetStudentId]);

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 6000);
    return () => clearInterval(timer);
  }, [loadNotifications]);

  const handleMarkNotificationRead = async (notifId: string) => {
    if (!user) return;
    await fetch(apiUrl(`/api/notifications/${notifId}/read`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    }).catch(() => {});
    await loadNotifications();
  };

  const unreadCount = user
    ? notifications.filter((n) => !n.readByUserIds.includes(user.id)).length
    : 0;

  const visibleCourses = isTeacher
    ? COURSES
    : isApprovedStudent || isApprovedParent
    ? COURSES.filter((c) => c.id === enrollment?.courseId)
    : [];

  const activeCourse = visibleCourses.find((c) => c.id === activeCourseId) || null;

  const handleSelectView = (view: string) => {
    if (!isTeacher) {
      if (view === 'modelkey' || view === 'upload-studio' || view === 'admin-console') return;
      if (!isApprovedStudent && !isParent && (view === 'homework-studio' || view === 'course')) {
        setActiveView('dashboard');
        return;
      }
    } else if (view === 'admin-console') {
      if (!hasEducatorSession()) {
        setIsAdminPinModalOpen(true);
        return;
      }
      void verifyEducatorSessionServer().then((ok) => {
        if (!ok) {
          setActiveView('dashboard');
          setIsAdminPinModalOpen(true);
        }
      });
    }
    if (view !== 'course') {
      setActiveLessonTopic('');
    }
    setActiveView(view);
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2]">
      <Sidebar
        activeCourseId={activeCourseId}
        activeView={activeView}
        visibleCourses={visibleCourses}
        isApprovedStudent={isApprovedStudent}
        unreadNotificationCount={unreadCount}
        onSelectCourse={setActiveCourseId}
        onSelectView={handleSelectView}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className={`relative min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'ml-[68px]' : 'ml-64'}`}>
        {/* Large 30% Transparent Dynamic Math Shape Watermark (updates per chosen course/lesson) */}
        <div className="fixed bottom-2 right-4 w-[480px] sm:w-[660px] h-[300px] sm:h-[400px] pointer-events-none z-0 overflow-hidden">
          <LessonSketchSvg
            topicText={
              activeLessonTopic ||
              (activeView === 'course' && activeCourse
                ? `${activeCourse.name} ${activeCourse.description}`
                : activeView === 'progress'
                ? 'statistics histogram probability'
                : activeView === 'homework-studio'
                ? 'linear equations algebra'
                : 'OL Edexcel Linear')
            }
            courseId={activeView === 'course' ? activeCourse?.id || '' : ''}
            variant="watermark"
            watermarkTone="light"
          />
        </div>

        {/* Top Child Switcher (Multi-child Parents) + Notification Header */}
        <div className="relative z-20 px-6 lg:px-8 pt-4 flex items-center justify-end gap-2">
          {isParent && parentChildIds.length > 1 && (
            <select
              value={targetStudentId || ''}
              onChange={(e) => setSelectedChildId(Number(e.target.value))}
              className="px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-semibold text-[#13294B]"
              title="Switch child profile"
            >
              {parentChildIds.map((cid, idx) => (
                <option key={cid} value={cid}>
                  Child #{idx + 1} (ID {cid})
                </option>
              ))}
            </select>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotificationsMenu((v) => !v)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB] hover:border-[#1B365D]/40 shadow-2xs text-xs font-semibold text-gray-700 transition"
            >
              <Bell className="w-3.5 h-3.5 text-[#1B365D]" />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#1B365D] text-white text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotificationsMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-xl z-40 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-[#f7f9fc]">
                  <span className="text-xs font-bold text-gray-900">Portal Notifications</span>
                  <button
                    type="button"
                    onClick={() => setShowNotificationsMenu(false)}
                    className="text-xs text-gray-400 hover:text-gray-700"
                  >
                    Close
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-400">No notifications yet.</div>
                  ) : (
                    notifications.slice(0, 12).map((n) => {
                      const isUnread = user ? !n.readByUserIds.includes(user.id) : false;
                      return (
                        <div
                          key={n.id}
                          className={`p-3.5 text-xs space-y-1 ${isUnread ? 'bg-[#eef4fa]/70' : 'bg-white'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-gray-900">{n.title}</span>
                            {isUnread && (
                              <button
                                type="button"
                                onClick={() => handleMarkNotificationRead(n.id)}
                                className="text-[10px] font-semibold text-[#163252] hover:underline shrink-0"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                          <p className="text-gray-600 leading-relaxed">{n.message}</p>
                          <div className="flex items-center justify-between pt-1 text-[10px] text-gray-400">
                            <span>{new Date(n.createdAt).toLocaleString('en-GB')}</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (isUnread) {
                                  void handleMarkNotificationRead(n.id);
                                }
                                if (n.submissionId) {
                                  setFocusSubmissionId(n.submissionId);
                                }
                                setShowNotificationsMenu(false);
                                if (isTeacher || isApprovedStudent || isParent) {
                                  handleSelectView('homework-studio');
                                }
                              }}
                              className="text-[#163252] font-semibold hover:underline"
                            >
                              {n.type === 'submission'
                                ? 'Review Paper →'
                                : n.type === 'assignment'
                                ? 'Open Homework →'
                                : 'View Report →'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="relative z-10 p-6 lg:p-8 pt-4">
          {activeView === 'dashboard' && (
            <DashboardPage
              enrollment={enrollment}
              enrollmentLoading={enrollmentLoading}
              visibleCourses={visibleCourses}
              notifications={notifications}
              onMarkNotificationRead={handleMarkNotificationRead}
              onRefreshEnrollment={refreshEnrollment}
              onSelectCourse={setActiveCourseId}
              onSelectView={handleSelectView}
              onHoverTopicChange={setActiveLessonTopic}
            />
          )}
          {activeView === 'course' && activeCourse && (
            <CoursePage
              course={activeCourse}
              onOpenModelKey={isTeacher ? () => handleSelectView('modelkey') : undefined}
              onOpenUploadStudio={isTeacher ? () => handleSelectView('upload-studio') : undefined}
              onActiveTopicChange={setActiveLessonTopic}
            />
          )}
          {activeView === 'progress' && (
            <ProgressPage
              visibleCourses={visibleCourses}
              enrollment={enrollment}
            />
          )}
          {activeView === 'homework-studio' && (isTeacher || isApprovedStudent || isParent) && (
            <StudentHomeworkPortal
              courseId={activeCourse?.id || enrollment?.courseId}
              courseTitle={activeCourse?.name || enrollment?.courseTitle}
              courseCode={activeCourse?.code}
              defaultStudentName={
                isParent
                  ? user?.linkedStudentName
                  : user?.role === 'student'
                  ? user.fullName
                  : undefined
              }
              userRole={user?.role}
              studentId={targetStudentId ?? user?.id}
              studentUsername={user?.username}
              viewerUserId={user?.id}
              focusSubmissionId={focusSubmissionId}
              onClearFocusSubmission={() => setFocusSubmissionId(null)}
              onNotificationsUpdated={loadNotifications}
              onSwitchToModelKey={isTeacher ? () => handleSelectView('modelkey') : undefined}
            />
          )}
          {activeView === 'upload-studio' && isTeacher && (
            <CourseMaterialsStudio
              initialCourseId={activeCourseId}
              onOpenCourse={(courseId) => {
                setActiveCourseId(courseId);
                handleSelectView('course');
              }}
            />
          )}
          {activeView === 'modelkey' && isTeacher && <TeacherModelKeyViewer />}
          {activeView === 'admin-console' && isTeacher && hasEducatorSession() && (
            <StudentManagementView
              onLockConsole={() => {
                clearEducatorSession();
                setActiveView('dashboard');
              }}
            />
          )}
        </div>

        <AdminPinModal
          isOpen={isAdminPinModalOpen}
          onClose={() => setIsAdminPinModalOpen(false)}
          onSuccess={() => {
            setIsAdminPinModalOpen(false);
            setActiveView('admin-console');
          }}
        />
      </main>
    </div>
  );
}
