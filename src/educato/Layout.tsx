import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { DashboardPage } from './DashboardPage';
import { CoursePage } from './CoursePage';
import { ProgressPage } from './ProgressPage';
import { COURSES } from './courses';

export function Layout() {
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const activeCourse = COURSES.find((c) => c.id === activeCourseId) || null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        activeCourseId={activeCourseId}
        activeView={activeView}
        onSelectCourse={setActiveCourseId}
        onSelectView={setActiveView}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-[68px]' : 'ml-64'}`}>
        <div className="p-6 lg:p-8">
          {activeView === 'dashboard' && (
            <DashboardPage onSelectCourse={setActiveCourseId} onSelectView={setActiveView} />
          )}
          {activeView === 'course' && activeCourse && <CoursePage course={activeCourse} />}
          {activeView === 'progress' && <ProgressPage />}
        </div>
      </main>
    </div>
  );
}
