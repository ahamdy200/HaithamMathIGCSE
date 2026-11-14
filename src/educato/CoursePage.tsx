import React, { useState } from 'react';
import { Course } from './courses';
import { useAuth } from './AuthContext';
import { StudentHomeworkPortal } from '../components/StudentHomeworkPortal';

type CourseTab = 'videos' | 'materials' | 'homework';

interface CoursePageProps {
  course: Course;
  onOpenModelKey?: () => void;
  onOpenNotebookLM?: () => void;
  onOpenNotebook?: () => void;
}

export function CoursePage({
  course,
  onOpenModelKey,
  onOpenNotebookLM,
  onOpenNotebook,
}: CoursePageProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<CourseTab>('videos');

  const tabs: { key: CourseTab; label: string; icon: React.ReactNode }[] = [
    {
      key: 'videos',
      label: 'Videos',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      key: 'materials',
      label: 'Materials',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    },
    {
      key: 'homework',
      label: 'AI Homework Checker',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-serif font-extrabold shadow-sm border border-gray-100"
              style={{ backgroundColor: course.color + '15', color: course.color }}
            >
              {course.icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{course.name}</h1>
              <p className="text-sm text-gray-500">
                {course.board} &middot; {course.code} &middot; {course.teacher}
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('homework')}
            className="px-4 py-2 rounded-xl bg-[#800020] hover:bg-[#6b1226] text-white text-xs font-bold transition shadow-sm"
          >
            Check Homework with Gemini AI
          </button>
        </div>
        <p className="text-gray-600 text-sm mt-2">{course.description}</p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'videos' && (
        <div className="space-y-3">
          {course.videos.length === 0 ? (
            <EmptyState icon="🎬" text="No videos available yet" />
          ) : (
            course.videos.map((video, i) => (
              <div key={video.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition group">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition flex-shrink-0">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{video.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Lesson {i + 1} &middot; {video.duration}</p>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition">Watch</button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="space-y-3">
          {course.materials.length === 0 ? (
            <EmptyState icon="📄" text="No materials available yet" />
          ) : (
            course.materials.map((mat) => (
              <div key={mat.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition group">
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-red-500 font-bold text-xs uppercase">{mat.type}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{mat.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{mat.type.toUpperCase()} &middot; {mat.size}</p>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition">Download</button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'homework' && (
        <div className="-mx-4">
          <StudentHomeworkPortal
            key={course.id}
            courseTitle={course.name}
            courseCode={course.code}
            defaultStudentName={user?.role === 'student' ? user.fullName : undefined}
            onSwitchToModelKey={onOpenModelKey}
            onSwitchToNotebookLM={onOpenNotebookLM}
            onSwitchToNotebook={onOpenNotebook}
          />
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="text-center py-12">
      <span className="text-4xl">{icon}</span>
      <p className="text-gray-400 text-sm mt-3">{text}</p>
    </div>
  );
}
