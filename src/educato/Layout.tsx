import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { DashboardPage } from './DashboardPage';
import { CoursePage } from './CoursePage';
import { ProgressPage } from './ProgressPage';
import { ColabStudioPage } from './ColabStudioPage';
import { COURSES } from './courses';
import { useAuth } from './AuthContext';
import { StudentHomeworkPortal } from '../components/StudentHomeworkPortal';
import { NotebookLMView } from '../components/NotebookLMView';
import { TeacherModelKeyViewer } from '../components/TeacherModelKeyViewer';
import { AudioOverviewView } from '../components/AudioOverviewView';
import { INITIAL_SOURCES } from '../data/defaultNotebook';
import { SourceDocument } from '../types';

export function Layout() {
  const { user } = useAuth();
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sources, setSources] = useState<SourceDocument[]>(INITIAL_SOURCES);

  const activeCourse = COURSES.find((c) => c.id === activeCourseId) || null;

  const handleAddSource = (source: Omit<SourceDocument, 'id'>) => {
    setSources((prev) => [...prev, { ...source, id: `source-${Date.now()}` }]);
  };

  const handleDeleteSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

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
          {activeView === 'course' && activeCourse && (
            <CoursePage
              course={activeCourse}
              onOpenModelKey={() => setActiveView('modelkey')}
              onOpenNotebookLM={() => setActiveView('notebooklm')}
              onOpenNotebook={() => setActiveView('notebook')}
            />
          )}
          {activeView === 'progress' && <ProgressPage />}
          {activeView === 'homework-studio' && (
            <StudentHomeworkPortal
              defaultStudentName={user?.role === 'student' ? user.fullName : undefined}
              onSwitchToModelKey={() => setActiveView('modelkey')}
              onSwitchToNotebookLM={() => setActiveView('notebooklm')}
              onSwitchToNotebook={() => setActiveView('notebook')}
            />
          )}
          {activeView === 'notebooklm' && (
            <NotebookLMView
              sources={sources}
              onAddSource={handleAddSource}
              onDeleteSource={handleDeleteSource}
            />
          )}
          {activeView === 'modelkey' && <TeacherModelKeyViewer />}
          {activeView === 'audio' && <AudioOverviewView sources={sources} />}
          {activeView === 'notebook' && <ColabStudioPage />}
        </div>
      </main>
    </div>
  );
}
