import React from 'react';
import { useAuth } from './AuthContext';
import { COURSES } from './courses';

interface CourseProgress {
  courseId: string;
  videosWatched: number;
  totalVideos: number;
  materialsDownloaded: number;
  totalMaterials: number;
  homeworkSubmitted: number;
  totalHomework: number;
  averageGrade: number | null;
}

function generateProgress(studentId: number): CourseProgress[] {
  const seed = studentId * 7;
  return COURSES.map((course, i) => {
    const s = (seed + i * 13) % 100;
    const totalVideos = course.videos.length;
    const totalMaterials = course.materials.length;
    const totalHomework = 3;
    return {
      courseId: course.id,
      videosWatched: Math.min(totalVideos, Math.floor((s % 60 + 40) / 100 * totalVideos + 0.5)),
      totalVideos,
      materialsDownloaded: Math.min(totalMaterials, Math.floor((s % 50 + 50) / 100 * totalMaterials + 0.5)),
      totalMaterials,
      homeworkSubmitted: Math.min(totalHomework, Math.floor(((s + 20) % 70 + 30) / 100 * totalHomework + 0.5)),
      totalHomework,
      averageGrade: s > 30 ? Math.min(100, 55 + (s % 45)) : null,
    };
  });
}

export function ProgressPage() {
  const { user } = useAuth();
  const progress = generateProgress(user?.id || 1);

  const overallStats = {
    totalCourses: COURSES.length,
    avgGrade: Math.round(
      progress.filter((p) => p.averageGrade !== null).reduce((sum, p) => sum + (p.averageGrade || 0), 0) /
      Math.max(1, progress.filter((p) => p.averageGrade !== null).length)
    ),
    totalHomework: progress.reduce((s, p) => s + p.homeworkSubmitted, 0),
    totalVideos: progress.reduce((s, p) => s + p.videosWatched, 0),
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Progress</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Enrolled Courses" value={overallStats.totalCourses.toString()} icon="📚" color="blue" />
        <StatCard label="Average Grade" value={`${overallStats.avgGrade}%`} icon="🎯" color="green" />
        <StatCard label="Homework Done" value={overallStats.totalHomework.toString()} icon="✅" color="purple" />
        <StatCard label="Videos Watched" value={overallStats.totalVideos.toString()} icon="🎬" color="orange" />
      </div>

      <h2 className="text-lg font-semibold text-gray-800 mb-4">Course Progress</h2>
      <div className="space-y-4">
        {COURSES.map((course, i) => {
          const p = progress[i];
          const videosPct = p.totalVideos > 0 ? Math.round((p.videosWatched / p.totalVideos) * 100) : 0;
          const hwPct = p.totalHomework > 0 ? Math.round((p.homeworkSubmitted / p.totalHomework) * 100) : 0;

          return (
            <div key={course.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xl">{course.icon}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm">{course.name}</h3>
                  <p className="text-xs text-gray-400">{course.code} &middot; {course.teacher}</p>
                </div>
                {p.averageGrade !== null && (
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    p.averageGrade >= 80 ? 'bg-green-100 text-green-700' :
                    p.averageGrade >= 60 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {p.averageGrade}%
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ProgressBar label="Videos" current={p.videosWatched} total={p.totalVideos} pct={videosPct} color="blue" />
                <ProgressBar label="Materials" current={p.materialsDownloaded} total={p.totalMaterials} pct={p.totalMaterials > 0 ? Math.round((p.materialsDownloaded / p.totalMaterials) * 100) : 0} color="purple" />
                <ProgressBar label="Homework" current={p.homeworkSubmitted} total={p.totalHomework} pct={hwPct} color="green" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  const colors: Record<string, string> = { blue: 'bg-blue-50', green: 'bg-green-50', purple: 'bg-purple-50', orange: 'bg-orange-50' };
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className={`w-10 h-10 ${colors[color] || 'bg-gray-50'} rounded-xl flex items-center justify-center mb-3`}>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function ProgressBar({ label, current, total, pct, color }: { label: string; current: number; total: number; pct: number; color: string }) {
  const barColors: Record<string, string> = { blue: 'bg-blue-500', green: 'bg-green-500', purple: 'bg-purple-500' };
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs font-medium text-gray-700">{current}/{total}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColors[color] || 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
