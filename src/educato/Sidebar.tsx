import React from 'react';
import { ClipboardCheck, UploadCloud, BookOpen, FileCheck2, ShieldCheck } from 'lucide-react';
import { useAuth } from './AuthContext';
import { Course } from './courses';
import { clearEducatorSession } from '../components/Auth/AdminPinModal';

interface SidebarProps {
  activeCourseId: string | null;
  activeView: string;
  visibleCourses: Course[];
  isApprovedStudent: boolean;
  unreadNotificationCount?: number;
  onSelectCourse: (courseId: string) => void;
  onSelectView: (view: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({
  activeCourseId,
  activeView,
  visibleCourses,
  isApprovedStudent,
  unreadNotificationCount = 0,
  onSelectCourse,
  onSelectView,
  collapsed,
  onToggle,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const isParent = user?.role === 'parent';

  const navItems = isTeacher
    ? [
        { id: 'admin-console', label: 'Admin Console', badge: 'Roster', Icon: ShieldCheck },
        { id: 'homework-studio', label: 'Approval & Review Inbox', badge: 'Teacher', Icon: ClipboardCheck },
        { id: 'upload-studio', label: 'Upload PDFs & Videos', badge: 'Content', Icon: UploadCloud },
        { id: 'modelkey', label: 'Official Model Keys', badge: 'Educator', Icon: BookOpen },
      ]
    : isParent
    ? [{ id: 'homework-studio', label: 'Approved Child Reports', badge: 'Parent', Icon: FileCheck2 }]
    : isApprovedStudent
    ? [{ id: 'homework-studio', label: 'Homework & Reports', badge: 'Submit', Icon: ClipboardCheck }]
    : [];

  return (
    <aside
      className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-[68px]' : 'w-64'
      } h-screen fixed left-0 top-0 z-30`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 bg-[#163252] rounded-lg flex items-center justify-center text-white font-serif font-extrabold text-lg shrink-0 shadow-xs">
              H
            </div>
            <div className="min-w-0">
              <span className="font-bold text-[#163252] text-sm block truncate math-serif">Math made easy</span>
              <span className="text-[10px] text-[#5b7797] block truncate teacher-handwriting">The Blue Notebook</span>
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          title="Toggle Sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <button
          onClick={() => onSelectView('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition text-sm font-medium ${
            activeView === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          {!collapsed && 'Dashboard'}
        </button>

        <button
          onClick={() => onSelectView('progress')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition text-sm font-medium ${
            activeView === 'progress' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          {!collapsed && (isTeacher ? 'Stats & Outbox' : isParent ? 'Child Statistics' : 'My Statistics')}
        </button>

        {navItems.length > 0 && !collapsed && (
          <div className="px-3 pt-4 pb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#163252]">
              {isTeacher ? 'Educator Workspace' : isParent ? 'Parent Portal' : 'Homework & Feedback'}
            </p>
          </div>
        )}

        {navItems.map((item) => {
          const NavIcon = item.Icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl mb-0.5 transition text-left ${
                activeView === item.id
                  ? 'bg-[#eef4fa] text-[#1B365D] font-semibold border border-[#c5d6e8]'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title={item.label}
            >
              <NavIcon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="text-xs flex-1 truncate">{item.label}</span>
                  {item.id === 'homework-studio' && unreadNotificationCount > 0 ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1B365D] text-white font-bold">
                      {unreadNotificationCount} new
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}

        {!collapsed && (
          <div className="px-3 pt-4 pb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              {isTeacher
                ? `Math Courses (${visibleCourses.length})`
                : isParent
                ? 'Child Approved Course'
                : isApprovedStudent
                ? 'My Approved Course'
                : 'Course Enrollment'}
            </p>
          </div>
        )}

        {visibleCourses.length === 0 && !isTeacher && !collapsed && (
          <div className="px-3 py-2 mx-1 rounded-xl bg-amber-50 border border-amber-200/70 text-[11px] text-amber-800">
            {isParent
              ? 'Your child will appear here once Mr. Haitham approves their course selection.'
              : 'Select your course on the Dashboard to unlock lessons & homework.'}
          </div>
        )}

        {visibleCourses.map((course) => (
          <button
            key={course.id}
            onClick={() => {
              onSelectCourse(course.id);
              onSelectView('course');
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl mb-0.5 transition text-left ${
              activeCourseId === course.id && activeView === 'course'
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            title={course.name}
          >
            <span
              className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-serif font-extrabold flex-shrink-0"
              style={{ backgroundColor: `${course.color}18`, color: course.color }}
            >
              {course.icon}
            </span>
            {!collapsed && <span className="text-xs truncate">{course.name}</span>}
          </button>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-gray-100">
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-2 py-1.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-[#163252] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.fullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{user.fullName}</p>
              <p className="text-[11px] text-gray-400 truncate">
                {user.role === 'teacher'
                  ? `${user.isAssistant ? 'Assistant' : 'Educator'} · ${user.domain || 'Mr.HaithamHusseinig'}`
                  : user.role === 'parent'
                  ? `Parent · ${user.linkedStudentName || 'Student'}`
                  : `${user.domain || 'Mr.HaithamHusseinig'} · ${user.grade} - ${user.section}`}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={() => {
            clearEducatorSession();
            logout();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl transition text-xs font-medium"
          title="Sign Out"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </aside>
  );
}
