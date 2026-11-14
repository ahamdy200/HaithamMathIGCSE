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
    <div className="max-w-5xl mx-auto">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 mb-8 text-white">
        <h1 className="text-2xl font-bold">{greeting()}, {user?.fullName?.split(' ')[0]}!</h1>
        <p className="text-blue-100 mt-1 text-sm">
          {user?.role === 'teacher'
            ? 'Welcome back to your teaching dashboard'
            : `${user?.grade} Section ${user?.section} — Keep up the great work!`}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-3xl font-bold text-gray-900">{COURSES.length}</p>
          <p className="text-xs text-gray-400 mt-1">Active Courses</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-3xl font-bold text-gray-900">{COURSES.reduce((s, c) => s + c.videos.length, 0)}</p>
          <p className="text-xs text-gray-400 mt-1">Video Lessons</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-3xl font-bold text-gray-900">{COURSES.reduce((s, c) => s + c.materials.length, 0)}</p>
          <p className="text-xs text-gray-400 mt-1">Study Materials</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:border-blue-200 transition" onClick={() => onSelectView('progress')}>
          <p className="text-3xl font-bold text-blue-600">View</p>
          <p className="text-xs text-gray-400 mt-1">My Progress</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Courses</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {COURSES.map((course) => (
          <button
            key={course.id}
            onClick={() => { onSelectCourse(course.id); onSelectView('course'); }}
            className="bg-white rounded-xl border border-gray-100 p-5 text-left hover:border-gray-200 hover:shadow-md transition group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: course.color + '15' }}>
                {course.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition">{course.name}</h3>
                <p className="text-xs text-gray-400">{course.code}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 line-clamp-2">{course.description}</p>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
              <span className="text-xs text-gray-400">{course.videos.length} videos</span>
              <span className="text-xs text-gray-400">{course.materials.length} materials</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
