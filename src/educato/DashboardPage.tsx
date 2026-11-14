import React from 'react';
import { useAuth } from './AuthContext';
import { COURSES } from './courses';

interface DashboardProps {
  onSelectCourse: (courseId: string) => void;
  onSelectView: (view: string) => void;
}

export function DashboardPage({ onSelectCourse, onSelectView }: DashboardProps) {
  const { user } = useAuth();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Unified Mr. Haitham + Educato Banner */}
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
                {user?.role === 'teacher'
                  ? 'Mr. Haitham Hussien · IGCSE Math AI Homework Checker & NotebookLM Studio'
                  : `${user?.grade} Section ${user?.section} — Mr. Haitham Hussien Mathematics Portal`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onSelectView('homework-studio')}
              className="px-4 py-2 rounded-xl bg-white text-[#800020] hover:bg-rose-50 text-xs font-bold transition shadow-sm"
            >
              AI Homework Checker
            </button>
            <button
              onClick={() => onSelectView('notebooklm')}
              className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-semibold transition"
            >
              NotebookLM Studio
            </button>
            <button
              onClick={() => onSelectView('modelkey')}
              className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-semibold transition"
            >
              Official Model Key
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-xs">
          <p className="text-3xl font-bold text-gray-900">{COURSES.length}</p>
          <p className="text-xs text-gray-400 mt-1">Math Classes &amp; Groups</p>
        </div>
        <div
          onClick={() => onSelectView('homework-studio')}
          className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:border-[#800020]/40 hover:shadow-sm transition"
        >
          <p className="text-lg font-bold text-[#800020]">Gemini 3.8</p>
          <p className="text-xs text-gray-500 mt-1">AI Homework Checker &rarr;</p>
        </div>
        <div
          onClick={() => onSelectView('notebooklm')}
          className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:border-indigo-200 hover:shadow-sm transition"
        >
          <p className="text-lg font-bold text-indigo-700">NotebookLM</p>
          <p className="text-xs text-gray-500 mt-1">Diagnostic Study Studio &rarr;</p>
        </div>
        <div
          onClick={() => onSelectView('progress')}
          className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:border-blue-200 hover:shadow-sm transition"
        >
          <p className="text-lg font-bold text-blue-600">Progress</p>
          <p className="text-xs text-gray-500 mt-1">View My Grades &rarr;</p>
        </div>
      </div>

      {/* Course Grid matching the 8 Math Groups screenshot */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Your Mathematics Courses</h2>
          <span className="text-xs text-gray-500">
            Click any group to watch lessons or submit homework to the AI Checker
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COURSES.map((course) => (
            <button
              key={course.id}
              onClick={() => {
                onSelectCourse(course.id);
                onSelectView('course');
              }}
              className="bg-white rounded-2xl border border-gray-200/80 p-6 text-center hover:border-[#800020]/40 hover:shadow-md transition group flex flex-col items-center justify-between min-h-[210px]"
            >
              <div className="flex flex-col items-center">
                {/* Mr. Haitham Monogram Badge matching the course grid image */}
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
                <span>{course.materials.length} files</span>
                <span>&middot;</span>
                <span className="text-[#800020] font-semibold">AI Grader</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
