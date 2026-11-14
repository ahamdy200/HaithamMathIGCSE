import React, { useState, useRef } from 'react';
import { Course } from './courses';
import { useAuth } from './AuthContext';

type CourseTab = 'videos' | 'materials' | 'homework';

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  date: string;
  status: 'submitted' | 'graded';
  grade?: string;
}

export function CoursePage({ course }: { course: Course }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<CourseTab>('videos');
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    await new Promise((r) => setTimeout(r, 1200));

    const newUploads: UploadedFile[] = Array.from(files).map((f) => ({
      id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: f.name,
      size: f.size < 1024 * 1024
        ? `${(f.size / 1024).toFixed(1)} KB`
        : `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'submitted' as const,
    }));

    setUploads((prev) => [...newUploads, ...prev]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
      label: 'Homework',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm" style={{ backgroundColor: course.color + '15' }}>
            {course.icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{course.name}</h1>
            <p className="text-sm text-gray-500">Code: {course.code} &middot; {course.teacher}</p>
          </div>
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
        <div>
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-8 text-center mb-6 hover:border-blue-300 transition">
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleUpload} className="hidden" id="hw-upload" />
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">Upload your homework</p>
              <p className="text-xs text-gray-400 mb-4">PDF, JPG, PNG, DOC up to 20MB</p>
              <label htmlFor="hw-upload" className={`inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white font-medium text-sm rounded-xl hover:bg-blue-600 transition cursor-pointer shadow-sm ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Choose Files
                  </>
                )}
              </label>
            </div>
          </div>

          {uploads.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Your Submissions</h3>
              <div className="space-y-2">
                {uploads.map((upload) => (
                  <div key={upload.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{upload.name}</p>
                      <p className="text-xs text-gray-400">{upload.size} &middot; {upload.date}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${upload.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {upload.status === 'graded' ? `Graded: ${upload.grade}` : 'Submitted'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploads.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-4">No homework submitted yet for this course</p>
          )}
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
