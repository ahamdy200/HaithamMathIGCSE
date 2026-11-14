import React from 'react';
import { useAuth } from './AuthContext';
import { COURSES } from './courses';

interface SidebarProps {
  activeCourseId: string | null;
  activeView: string;
  onSelectCourse: (courseId: string) => void;
  onSelectView: (view: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ activeCourseId, activeView, onSelectCourse, onSelectView, collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();

  return (
    <aside className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 flex flex-col z-30 transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-64'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-100 flex-shrink-0">
        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-lg">🎓</span>
        </div>
        {!collapsed && <span className="font-bold text-gray-900 text-lg">Educato</span>}
        <button
          onClick={onToggle}
          className={`${collapsed ? 'mx-auto' : 'ml-auto'} p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition`}
        >
          <svg className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          {!collapsed && 'My Progress'}
        </button>

        {!collapsed && (
          <div className="px-3 pt-4 pb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Courses</p>
          </div>
        )}
        {collapsed && <div className="my-3 mx-3 border-t border-gray-100" />}

        {COURSES.map((course) => (
          <button
            key={course.id}
            onClick={() => { onSelectCourse(course.id); onSelectView('course'); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition text-sm ${
              activeCourseId === course.id && activeView === 'course'
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            title={collapsed ? course.name : undefined}
          >
            <span className="text-lg flex-shrink-0 w-5 text-center">{course.icon}</span>
            {!collapsed && <span className="truncate">{course.name}</span>}
          </button>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 p-3 flex-shrink-0">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {user?.fullName?.charAt(0) || '?'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}{user?.grade ? ` · ${user.grade}` : ''}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
