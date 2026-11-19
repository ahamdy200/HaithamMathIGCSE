import React, { useState, useEffect, useCallback } from 'react';
import { Folder, FolderOpen, Pencil, Eye, EyeOff } from 'lucide-react';
import { Course, CourseVideo, CourseMaterial, DEFAULT_COURSE_QUIZZES } from './courses';
import { useAuth } from './AuthContext';
import { StudentHomeworkPortal } from '../components/StudentHomeworkPortal';
import { LessonSketchSvg } from '../components/LessonSketchSvg';
import { apiUrl } from '../utils/apiBase';
import type { GradingSystem, QuizDefinition, CourseMajorFolder } from '../types';

type CourseTab = 'videos' | 'materials' | 'quizzes' | 'homework';

interface CoursePageProps {
  course: Course;
  onOpenModelKey?: () => void;
  onOpenUploadStudio?: () => void;
  onActiveTopicChange?: (topic: string) => void;
}

function toYouTubeEmbedUrl(url?: string): string | null {
  if (!url || url === '#') return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '').trim();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/embed/')) return url;
      const v = u.searchParams.get('v');
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function CoursePage({ course, onOpenModelKey, onOpenUploadStudio, onActiveTopicChange }: CoursePageProps) {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const isParent = user?.role === 'parent';
  const effectiveStudentId = isParent ? user?.linkedStudentId : user?.id;
  const [activeTab, setActiveTab] = useState<CourseTab>('videos');

  // Video & Materials Integration state
  const [customVideos, setCustomVideos] = useState<CourseVideo[]>([]);
  const [customMaterials, setCustomMaterials] = useState<(CourseMaterial & { isCustom?: boolean })[]>([]);
  const [playingVideo, setPlayingVideo] = useState<CourseVideo | null>(null);
  const [newVidTitle, setNewVidTitle] = useState('');
  const [newVidUrl, setNewVidUrl] = useState('');
  const [newVidDuration, setNewVidDuration] = useState('25:00');
  const [newMatTitle, setNewMatTitle] = useState('');
  const [newMatCategory, setNewMatCategory] = useState<'explain' | 'homework' | 'resource'>('explain');
  const [newMatUrl, setNewMatUrl] = useState('');
  const [newMatFile, setNewMatFile] = useState<File | null>(null);
  const [newMatFileBase64, setNewMatFileBase64] = useState<string | null>(null);
  const [newMatIsA3, setNewMatIsA3] = useState(false);
  const [uploadingMat, setUploadingMat] = useState(false);

  // 10 Major Folders x 10 Sub-Folders state (Renameable at any time)
  const [courseFolders, setCourseFolders] = useState<CourseMajorFolder[]>([]);
  const [selectedMajorFolderId, setSelectedMajorFolderId] = useState<string>('mf-1');
  const [selectedSubFolderId, setSelectedSubFolderId] = useState<string>('all');
  const [renamingFolderTarget, setRenamingFolderTarget] = useState<{
    majorFolderId: string;
    subFolderId?: string;
  } | null>(null);
  const [renameDraftText, setRenameDraftText] = useState('');
  const [savingRename, setSavingRename] = useState(false);

  // Smart Lesson-Aware Sketch state
  const [hoveredVideoTopic, setHoveredVideoTopic] = useState<string>('');

  // Quizzes & Essays Engine state
  const [customQuizzes, setCustomQuizzes] = useState<QuizDefinition[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizDefinition | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizNotice, setQuizNotice] = useState<string | null>(null);

  // Teacher Quiz/Essay Creator state
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizKind, setNewQuizKind] = useState<'quiz' | 'essay'>('quiz');
  const [newQuizSystem, setNewQuizSystem] = useState<GradingSystem>('edexcel');
  const [newQuizPrompt, setNewQuizPrompt] = useState('');
  const [newQuizExpected, setNewQuizExpected] = useState('');
  const [newQuizMarks, setNewQuizMarks] = useState(5);

  const loadCourseExtensions = useCallback(async () => {
    try {
      const roleParam = encodeURIComponent(user?.role || 'student');
      const [vRes, qRes, mRes, fRes] = await Promise.all([
        fetch(apiUrl(`/api/courses/${course.id}/videos`)),
        fetch(apiUrl(`/api/quizzes?courseId=${course.id}`)),
        fetch(apiUrl(`/api/courses/${course.id}/materials?role=${roleParam}`)),
        fetch(apiUrl(`/api/courses/${course.id}/folders?role=${roleParam}`)),
      ]);
      if (vRes.ok) {
        const vData = await vRes.json();
        setCustomVideos(Array.isArray(vData?.videos) ? vData.videos : []);
      }
      if (qRes.ok) {
        const qData = await qRes.json();
        setCustomQuizzes(Array.isArray(qData?.quizzes) ? qData.quizzes : []);
      }
      if (mRes.ok) {
        const mData = await mRes.json();
        setCustomMaterials(Array.isArray(mData?.materials) ? mData.materials : []);
      }
      if (fRes.ok) {
        const fData = await fRes.json();
        const loadedFolders: CourseMajorFolder[] = Array.isArray(fData?.folders) ? fData.folders : [];
        setCourseFolders(loadedFolders);
        if (loadedFolders.length > 0 && !loadedFolders.some((f) => f.id === selectedMajorFolderId)) {
          setSelectedMajorFolderId(loadedFolders[0].id);
          setSelectedSubFolderId('all');
        }
      }
    } catch {
      // ignore offline transient fetch error
    }
  }, [course.id, user?.role]);

  useEffect(() => {
    loadCourseExtensions();
    setPlayingVideo(null);
    setSelectedQuiz(null);
    setQuizNotice(null);
  }, [loadCourseExtensions]);

  const allVideos = [...customVideos, ...course.videos];
  const courseQuizzes: QuizDefinition[] = [
    ...customQuizzes,
    ...DEFAULT_COURSE_QUIZZES.filter((q) => q.courseId === course.id),
  ];
  const fallbackCourseQuiz: QuizDefinition = {
    id: `essay-default-${course.id}`,
    courseId: course.id,
    title: `${course.name} — Structured Method & Justification Essay`,
    kind: 'essay',
    gradingSystem: 'edexcel',
    instructions: 'Show complete algebraic/geometric reasoning. Mr. Haitham grades and approves your submission.',
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: 'eq1',
        type: 'short',
        prompt: `Write a full step-by-step solution and justification for a core problem from ${course.name}.`,
        correctAnswer: 'Full logical sequence with intermediate steps and units/conclusions.',
        marks: 6,
      },
    ],
  };
  const availableQuizzes = courseQuizzes.length > 0 ? courseQuizzes : [fallbackCourseQuiz];

  const handleAddYouTubeVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVidTitle.trim() || !newVidUrl.trim()) return;
    const res = await fetch(apiUrl(`/api/courses/${course.id}/videos`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newVidTitle.trim(),
        youtubeUrl: newVidUrl.trim(),
        duration: newVidDuration.trim() || '20:00',
      }),
    });
    if (res.ok) {
      setNewVidTitle('');
      setNewVidUrl('');
      await loadCourseExtensions();
    }
  };

  const handleCreateQuizOrEssay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuizTitle.trim() || !newQuizPrompt.trim()) return;
    const res = await fetch(apiUrl('/api/quizzes'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: course.id,
        title: newQuizTitle.trim(),
        kind: newQuizKind,
        gradingSystem: newQuizSystem,
        questions: [
          {
            id: `q_${Date.now()}`,
            type: 'short',
            prompt: newQuizPrompt.trim(),
            correctAnswer: newQuizExpected.trim() || undefined,
            marks: Number(newQuizMarks) || 5,
          },
        ],
      }),
    });
    if (res.ok) {
      setNewQuizTitle('');
      setNewQuizPrompt('');
      setNewQuizExpected('');
      await loadCourseExtensions();
    }
  };

  const handleSubmitAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedQuiz) return;
    setQuizSubmitting(true);
    setQuizNotice(null);
    try {
      const res = await fetch(apiUrl('/api/assessments/submit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.id,
          studentUsername: user.username,
          studentName: user.fullName,
          courseId: course.id,
          courseTitle: course.name,
          quizId: selectedQuiz.id,
          title: selectedQuiz.title,
          kind: selectedQuiz.kind,
          gradingSystem: selectedQuiz.gradingSystem,
          questions: selectedQuiz.questions,
          answers: quizAnswers,
        }),
      });
      if (res.ok) {
        setQuizNotice(
          `Your ${selectedQuiz.kind} "${selectedQuiz.title}" has been sent to Mr. Haitham Hussien for review. Your 3-Phase report will appear under Homework & Reports once approved.`
        );
        setQuizAnswers({});
        setSelectedQuiz(null);
      }
    } finally {
      setQuizSubmitting(false);
    }
  };

  const handleSelectCourseMaterialFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewMatFile(file);
    if (!newMatTitle.trim()) setNewMatTitle(file.name.replace(/\.[^.]+$/, ''));
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setNewMatFileBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadCourseMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatTitle.trim() || (!newMatFileBase64 && !newMatUrl.trim())) return;
    setUploadingMat(true);
    try {
      const targetSubId = selectedSubFolderId !== 'all' ? selectedSubFolderId : 'sf-1';
      const res = await fetch(apiUrl(`/api/courses/${course.id}/materials`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newMatTitle.trim(),
          category: newMatCategory,
          majorFolderId: selectedMajorFolderId,
          subFolderId: targetSubId,
          type: newMatFileBase64 ? 'pdf' : 'link',
          fileBase64: newMatFileBase64,
          fileName: newMatFile?.name,
          url: newMatUrl.trim(),
          isA3: newMatIsA3,
          teacherOnly: newMatCategory === 'resource',
        }),
      });
      if (res.ok) {
        setNewMatTitle('');
        setNewMatUrl('');
        setNewMatFile(null);
        setNewMatFileBase64(null);
        setNewMatIsA3(false);
        await loadCourseExtensions();
      }
    } finally {
      setUploadingMat(false);
    }
  };

  const handleSaveFolderRename = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!renamingFolderTarget || !renameDraftText.trim()) return;
    setSavingRename(true);
    try {
      const res = await fetch(apiUrl(`/api/courses/${course.id}/folders`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          majorFolderId: renamingFolderTarget.majorFolderId,
          subFolderId: renamingFolderTarget.subFolderId || null,
          name: renameDraftText.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.folders)) setCourseFolders(data.folders);
        setRenamingFolderTarget(null);
        setRenameDraftText('');
      }
    } finally {
      setSavingRename(false);
    }
  };

  const handleToggleFolderVisibility = async (
    majorFolderId: string,
    subFolderId: string | null,
    nextHidden: boolean
  ) => {
    try {
      const res = await fetch(apiUrl(`/api/courses/${course.id}/folders`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          majorFolderId,
          subFolderId,
          hiddenForStudents: nextHidden,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.folders)) setCourseFolders(data.folders);
      }
    } catch {
      // ignore transient error
    }
  };

  const resolveMaterialMajorId = (m: CourseMaterial): string => {
    if (m.majorFolderId) return m.majorFolderId;
    if (m.category === 'homework') return 'mf-2';
    if (m.teacherOnly || m.category === 'resource') return 'mf-10';
    return 'mf-1';
  };

  const resolveMaterialSubId = (m: CourseMaterial): string => m.subFolderId || 'sf-1';

  const handleDeleteCourseMaterial = async (matId: string) => {
    const res = await fetch(apiUrl(`/api/courses/${course.id}/materials/${matId}`), { method: 'DELETE' });
    if (res.ok) await loadCourseExtensions();
  };

  const handleDeleteCourseVideo = async (videoId: string) => {
    const res = await fetch(apiUrl(`/api/courses/${course.id}/videos/${videoId}`), { method: 'DELETE' });
    if (res.ok) await loadCourseExtensions();
  };

  const allCourseMaterials = [...customMaterials, ...course.materials];
  const visibleMaterials = isTeacher
    ? allCourseMaterials
    : allCourseMaterials.filter((m) => !m.teacherOnly);
  const explainMaterials = visibleMaterials.filter((m) => m.category === 'explain' || (!m.category && !m.teacherOnly));
  const homeworkMaterials = visibleMaterials.filter((m) => m.category === 'homework');
  const keyMaterials = visibleMaterials.filter((m) => m.teacherOnly);

  const tabs: { key: CourseTab; label: string; icon: React.ReactNode }[] = [
    {
      key: 'videos',
      label: 'YouTube Videos',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      key: 'materials',
      label: 'Explain & HW PDFs',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      key: 'quizzes',
      label: 'Quizzes & Essays',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      key: 'homework',
      label: isTeacher ? 'Approval & Marking' : isParent ? 'Approved Reports' : 'Homework & Reports',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
      ),
    },
  ];

  const selectedMajorObj = courseFolders.find((f) => f.id === selectedMajorFolderId);
  const selectedSubObj = selectedMajorObj?.subFolders?.find((s) => s.id === selectedSubFolderId);
  const smartLessonTopic =
    hoveredVideoTopic ||
    playingVideo?.title ||
    (activeTab === 'materials' && selectedMajorObj
      ? `${selectedMajorObj.name} ${selectedSubObj?.name || ''}`
      : activeTab === 'quizzes' && selectedQuiz
      ? selectedQuiz.title
      : `${course.name} ${course.description}`);
  const smartLessonLabel =
    hoveredVideoTopic ||
    playingVideo?.title ||
    (activeTab === 'materials' && selectedMajorObj
      ? `${selectedMajorObj.name}${selectedSubObj ? ` · ${selectedSubObj.name}` : ''}`
      : activeTab === 'quizzes' && selectedQuiz
      ? selectedQuiz.title
      : course.code);

  useEffect(() => {
    onActiveTopicChange?.(`${smartLessonTopic} ${course.id}`);
  }, [smartLessonTopic, course.id, onActiveTopicChange]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="relative navy-notebook-banner rounded-2xl p-6 mb-6 shadow-md border border-[#2a4d77] overflow-hidden">
        <div className="pointer-events-none absolute -left-8 -bottom-10 w-[440px] h-[270px]">
          <LessonSketchSvg
            topicText={smartLessonTopic}
            courseId={course.id}
            variant="watermark"
            watermarkTone="dark"
          />
        </div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-sky-100 font-bold">
                {course.board} &bull; {course.code}
              </span>
              <span className="text-xs text-sky-200/85">{course.teacher}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white math-serif tracking-tight">
              {course.name}
            </h1>
            <p className="text-sky-100/85 text-xs sm:text-sm leading-relaxed max-w-xl">
              {course.description}
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setActiveTab('homework')}
                className="px-4 py-2 rounded-xl bg-white text-[#163252] hover:bg-sky-50 text-xs font-bold transition shadow-sm"
              >
                {isTeacher ? 'Open Homework Inbox' : 'Submit Homework to Mr. Haitham'}
              </button>
              <span className="teacher-handwriting text-base text-sky-200/85">
                {playingVideo ? `Watching: ${playingVideo.title}` : 'Select a lesson or folder to adapt workspace'}
              </span>
            </div>
          </div>

          <div className="lg:col-span-5">
            <LessonSketchSvg
              topicText={smartLessonTopic}
              courseId={course.id}
              variant="hero"
              labelOverride={smartLessonLabel}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-[#e8eff7] p-1 rounded-xl mb-6 border border-[#d3dfec]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
              activeTab === tab.key ? 'bg-[#163252] text-white shadow-sm' : 'text-[#355070] hover:bg-white/70'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'videos' && (
        <div className="space-y-4">
          {playingVideo && (
            <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between px-4 py-3 text-white border-b border-slate-800">
                <div>
                  <p className="text-sm font-bold">{playingVideo.title}</p>
                  <p className="text-[11px] text-slate-400">YouTube Lesson Player · {playingVideo.duration}</p>
                </div>
                <button
                  onClick={() => setPlayingVideo(null)}
                  className="text-xs px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  Close Player
                </button>
              </div>
              {toYouTubeEmbedUrl(playingVideo.youtubeUrl || playingVideo.url) ? (
                <div className="aspect-video w-full bg-black">
                  <iframe
                    className="w-full h-full"
                    src={toYouTubeEmbedUrl(playingVideo.youtubeUrl || playingVideo.url) || ''}
                    title={playingVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="p-8 text-center text-slate-300 text-sm">
                  No YouTube URL attached to this lesson yet. {isTeacher ? 'Use the form below to attach a YouTube link.' : 'Mr. Haitham will upload the lesson link soon.'}
                </div>
              )}
            </div>
          )}

          {isTeacher && (
            <form onSubmit={handleAddYouTubeVideo} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-[#163252] mr-1">+ Add YouTube Video Link:</span>
              <input
                type="text"
                value={newVidTitle}
                onChange={(e) => setNewVidTitle(e.target.value)}
                placeholder="Lesson Title"
                className="flex-1 min-w-[160px] px-3 py-1.5 rounded-lg border border-gray-200 text-xs"
                required
              />
              <input
                type="url"
                value={newVidUrl}
                onChange={(e) => setNewVidUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-gray-200 text-xs"
                required
              />
              <input
                type="text"
                value={newVidDuration}
                onChange={(e) => setNewVidDuration(e.target.value)}
                placeholder="25:00"
                className="w-20 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs"
              />
              <button type="submit" className="px-3.5 py-1.5 rounded-lg bg-[#163252] text-white text-xs font-semibold hover:bg-[#214266]">
                Save Link
              </button>
            </form>
          )}

          {allVideos.length === 0 ? (
            <EmptyState icon="🎬" text="No videos available yet" />
          ) : (
            allVideos.map((video, i) => {
              const hasYt = Boolean(toYouTubeEmbedUrl(video.youtubeUrl || video.url));
              return (
                <div
                  key={video.id}
                  onMouseEnter={() => setHoveredVideoTopic(video.title)}
                  onMouseLeave={() => setHoveredVideoTopic('')}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl border border-[#d3dfec] hover:border-[#163252] hover:shadow-sm transition group"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition flex-shrink-0 ${hasYt ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{video.title}</p>
                      {hasYt && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-semibold">
                          YouTube Ready
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Lesson {i + 1} &middot; {video.duration}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPlayingVideo(video)}
                      className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      Watch
                    </button>
                    {isTeacher && video.id.startsWith('yt_') && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCourseVideo(video.id)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="space-y-6">
          {/* 10 Major Folders x 10 Sub-Folders Explorer with Rename Tool */}
          {(() => {
            const activeMajor =
              courseFolders.find((f) => f.id === selectedMajorFolderId) || courseFolders[0];
            const itemsInMajor = activeMajor
              ? visibleMaterials.filter((m) => resolveMaterialMajorId(m) === activeMajor.id)
              : visibleMaterials;
            const filteredFolderItems =
              selectedSubFolderId === 'all'
                ? itemsInMajor
                : itemsInMajor.filter((m) => resolveMaterialSubId(m) === selectedSubFolderId);

            return (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Course Folders (10 Major Folders &times; 10 Sub-Folders)
                    </h3>
                    <p className="text-xs text-gray-500">
                      {isTeacher
                        ? 'Click any major folder or sub-folder to browse PDFs, or click Rename to customize any folder name at any time.'
                        : 'Select a major folder and sub-folder below to open your notes and homework sheets.'}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#EEF3F9] text-[#1B365D] border border-[#DCE5F0]">
                    {courseFolders.length || 10} Major Folders
                  </span>
                </div>

                {/* 10 Major Folders Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {courseFolders.map((major, idx) => {
                    const isSelected = activeMajor?.id === major.id;
                    const count = visibleMaterials.filter((m) => resolveMaterialMajorId(m) === major.id).length;
                    const isEditingThis =
                      renamingFolderTarget?.majorFolderId === major.id &&
                      !renamingFolderTarget?.subFolderId;

                    return (
                      <div
                        key={major.id}
                        className={`rounded-xl border p-3 transition flex flex-col justify-between gap-2 ${
                          major.hiddenForStudents
                            ? 'bg-slate-100/80 border-dashed border-slate-300 opacity-75'
                            : isSelected
                            ? 'bg-[#eef4fa] border-[#163252] shadow-xs'
                            : 'bg-[#f7f9fc]/70 border-gray-200 hover:border-[#163252]/40 hover:bg-white'
                        }`}
                      >
                        {isEditingThis ? (
                          <form onSubmit={handleSaveFolderRename} className="space-y-1.5">
                            <input
                              type="text"
                              value={renameDraftText}
                              onChange={(e) => setRenameDraftText(e.target.value)}
                              className="w-full px-2 py-1 rounded border border-[#163252] text-xs bg-white outline-none"
                              autoFocus
                              required
                            />
                            <div className="flex gap-1">
                              <button
                                type="submit"
                                disabled={savingRename}
                                className="flex-1 py-1 rounded bg-[#163252] text-white text-[10px] font-bold"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setRenamingFolderTarget(null)}
                                className="px-2 py-1 rounded border border-gray-300 bg-white text-[10px] text-gray-600"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMajorFolderId(major.id);
                                setSelectedSubFolderId('all');
                              }}
                              className="text-left space-y-1 flex-1"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-extrabold uppercase text-[#163252]">
                                  Folder {idx + 1}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 font-bold">
                                  {count} file{count === 1 ? '' : 's'}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug flex items-start gap-1.5">
                                <Folder className="w-3.5 h-3.5 text-[#1B365D] shrink-0 mt-0.5" />
                                <span>{major.name}</span>
                              </p>
                            </button>
                            {isTeacher && (
                              <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-gray-200/70">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleFolderVisibility(major.id, null, !major.hiddenForStudents)
                                  }
                                  title={
                                    major.hiddenForStudents
                                      ? 'Hidden from students — click to show'
                                      : 'Visible to students — click to hide'
                                  }
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition inline-flex items-center gap-1 ${
                                    major.hiddenForStudents
                                      ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  }`}
                                >
                                  {major.hiddenForStudents ? (
                                    <>
                                      <EyeOff className="w-3 h-3" /> Hidden
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="w-3 h-3" /> Visible
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRenamingFolderTarget({ majorFolderId: major.id });
                                    setRenameDraftText(major.name);
                                  }}
                                  className="text-[10px] font-semibold text-[#1B365D] hover:underline inline-flex items-center gap-1"
                                >
                                  <Pencil className="w-2.5 h-2.5" /> Rename
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 10 Sub-Folders Inside Selected Major Folder */}
                {activeMajor && (
                  <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <FolderOpen className="w-4 h-4 text-[#1B365D] shrink-0" />
                          <span>{activeMajor.name} &rarr; 10 Sub-Folders</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Showing {filteredFolderItems.length} file(s)
                          {selectedSubFolderId === 'all'
                            ? ' across all sub-folders'
                            : ` inside ${activeMajor.subFolders.find((s) => s.id === selectedSubFolderId)?.name || 'sub-folder'}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedSubFolderId('all')}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${
                          selectedSubFolderId === 'all'
                            ? 'bg-[#163252] text-white border-[#163252]'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        All 10 Sub-Folders ({itemsInMajor.length})
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {activeMajor.subFolders.map((sub, sIdx) => {
                        const subActive = selectedSubFolderId === sub.id;
                        const subCount = itemsInMajor.filter((m) => resolveMaterialSubId(m) === sub.id).length;
                        const isEditingSub =
                          renamingFolderTarget?.majorFolderId === activeMajor.id &&
                          renamingFolderTarget?.subFolderId === sub.id;

                        return (
                          <div
                            key={sub.id}
                            className={`rounded-lg border p-2.5 transition ${
                              sub.hiddenForStudents
                                ? 'bg-slate-100/80 border-dashed border-slate-300 opacity-75'
                                : subActive
                                ? 'bg-white border-[#1B365D] ring-1 ring-[#1B365D]/30 shadow-2xs'
                                : 'bg-white border-slate-200 hover:border-[#1B365D]/40'
                            }`}
                          >
                            {isEditingSub ? (
                              <form onSubmit={handleSaveFolderRename} className="space-y-1">
                                <input
                                  type="text"
                                  value={renameDraftText}
                                  onChange={(e) => setRenameDraftText(e.target.value)}
                                  className="w-full px-1.5 py-1 rounded border border-[#163252] text-[11px] bg-white outline-none"
                                  autoFocus
                                  required
                                />
                                <div className="flex gap-1">
                                  <button
                                    type="submit"
                                    disabled={savingRename}
                                    className="flex-1 py-0.5 rounded bg-[#163252] text-white text-[10px] font-bold"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRenamingFolderTarget(null)}
                                    className="px-1.5 py-0.5 rounded border border-gray-300 text-[10px]"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <div className="space-y-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedSubFolderId(sub.id)}
                                  className="text-left min-w-0 w-full"
                                >
                                  <span className="text-[10px] font-bold text-slate-400 block">
                                    #{sIdx + 1} · {subCount} file{subCount === 1 ? '' : 's'}
                                  </span>
                                  <span className="text-[11px] font-semibold text-slate-800 block truncate">
                                    {sub.name}
                                  </span>
                                </button>
                                {isTeacher && (
                                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggleFolderVisibility(
                                          activeMajor.id,
                                          sub.id,
                                          !sub.hiddenForStudents
                                        )
                                      }
                                      title={
                                        sub.hiddenForStudents
                                          ? 'Hidden from students — click to show'
                                          : 'Visible to students — click to hide'
                                      }
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition inline-flex items-center gap-1 ${
                                        sub.hiddenForStudents
                                          ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      }`}
                                    >
                                      {sub.hiddenForStudents ? (
                                        <>
                                          <EyeOff className="w-2.5 h-2.5" /> Hidden
                                        </>
                                      ) : (
                                        <>
                                          <Eye className="w-2.5 h-2.5" /> Visible
                                        </>
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRenamingFolderTarget({
                                          majorFolderId: activeMajor.id,
                                          subFolderId: sub.id,
                                        });
                                        setRenameDraftText(sub.name);
                                      }}
                                      title="Rename Sub-Folder"
                                      className="text-[10px] text-[#1B365D] hover:text-[#13294B] shrink-0 p-0.5"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Files inside Selected Major Folder / Sub-Folder */}
                    {filteredFolderItems.length === 0 ? (
                      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-5 text-center text-xs text-slate-500">
                        No PDFs or links inside this folder yet.
                        {isTeacher && ' Use the Upload form below to add a PDF or link directly to this folder.'}
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1">
                        {filteredFolderItems.map((mat) => {
                          const subLabel =
                            activeMajor.subFolders.find((sf) => sf.id === resolveMaterialSubId(mat))?.name ||
                            'Sub-Folder 1';
                          return (
                            <div
                              key={mat.id}
                              className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-gray-200 hover:shadow-2xs transition"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                                  <span className="text-red-500 font-bold text-[11px] uppercase">{mat.type}</span>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">{mat.title}</p>
                                  <p className="text-[11px] text-gray-500 mt-0.5">
                                    {subLabel} &middot; {mat.category === 'homework' ? 'Homework (HW)' : mat.teacherOnly ? 'Educator Key' : 'Explain'} &middot; {mat.size}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {mat.url && mat.url !== '#' ? (
                                  <a
                                    href={mat.url.startsWith('/api/') ? apiUrl(mat.url) : mat.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                                  >
                                    Open PDF / Link
                                  </a>
                                ) : (
                                  <span className="px-2.5 py-1 text-[11px] font-medium text-gray-400 bg-[#f7f9fc] rounded-lg">
                                    Template Item
                                  </span>
                                )}
                                {mat.category === 'homework' && !isParent && (
                                  <button
                                    onClick={() => setActiveTab('homework')}
                                    className="px-3 py-1.5 text-xs font-semibold text-[#163252] bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                                  >
                                    Submit Solved PDF
                                  </button>
                                )}
                                {isTeacher && (mat as any).isCustom && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCourseMaterial(mat.id)}
                                    className="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {isTeacher && (
            <form onSubmit={handleUploadCourseMaterial} className="bg-white rounded-2xl border border-[#d3dfec] p-4 space-y-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#163252]">
                  + Upload PDF, Worksheet or Material Link to {course.name} &rarr;{' '}
                  {courseFolders.find((f) => f.id === selectedMajorFolderId)?.name || 'Folder 1'} /{' '}
                  {selectedSubFolderId === 'all'
                    ? 'Sub-Folder 1'
                    : courseFolders
                        .find((f) => f.id === selectedMajorFolderId)
                        ?.subFolders.find((s) => s.id === selectedSubFolderId)?.name || 'Sub-Folder 1'}
                </span>
                {onOpenUploadStudio && (
                  <button
                    type="button"
                    onClick={onOpenUploadStudio}
                    className="text-[11px] font-semibold text-indigo-700 hover:underline"
                  >
                    Open Multi-Course Upload Studio &rarr;
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                <select
                  value={selectedMajorFolderId}
                  onChange={(e) => {
                    setSelectedMajorFolderId(e.target.value);
                    setSelectedSubFolderId('sf-1');
                  }}
                  className="px-2.5 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold"
                >
                  {courseFolders.map((mf, i) => (
                    <option key={mf.id} value={mf.id}>
                      {i + 1}. {mf.name}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedSubFolderId === 'all' ? 'sf-1' : selectedSubFolderId}
                  onChange={(e) => setSelectedSubFolderId(e.target.value)}
                  className="px-2.5 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold"
                >
                  {(courseFolders.find((mf) => mf.id === selectedMajorFolderId)?.subFolders || []).map((sf, i) => (
                    <option key={sf.id} value={sf.id}>
                      Sub #{i + 1}: {sf.name}
                    </option>
                  ))}
                </select>
                <select
                  value={newMatCategory}
                  onChange={(e) => setNewMatCategory(e.target.value as 'explain' | 'homework' | 'resource')}
                  className="px-2.5 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold"
                >
                  <option value="explain">Explain Notes</option>
                  <option value="homework">Homework (HW) PDF</option>
                  <option value="resource">Educator Model Key</option>
                </select>
                <input
                  type="text"
                  value={newMatTitle}
                  onChange={(e) => setNewMatTitle(e.target.value)}
                  placeholder="PDF or Material Title"
                  className="px-3 py-2 rounded-lg border border-gray-200 text-xs"
                  required
                />
                <input
                  type="url"
                  value={newMatUrl}
                  onChange={(e) => setNewMatUrl(e.target.value)}
                  placeholder="Optional URL (or pick PDF)"
                  className="px-3 py-2 rounded-lg border border-gray-200 text-xs"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-[#c5d6e8] text-[#163252] text-xs font-semibold cursor-pointer">
                    {newMatFile ? `Selected: ${newMatFile.name}` : 'Choose PDF / File'}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg"
                      onChange={handleSelectCourseMaterialFile}
                      className="hidden"
                    />
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newMatIsA3}
                      onChange={(e) => setNewMatIsA3(e.target.checked)}
                    />
                    <span>A3 Spread Ready</span>
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={uploadingMat || (!newMatFileBase64 && !newMatUrl.trim())}
                  className="px-4 py-2 rounded-lg bg-[#163252] hover:bg-[#214266] disabled:opacity-50 text-white text-xs font-bold transition"
                >
                  {uploadingMat ? 'Uploading...' : 'Publish to Section'}
                </button>
              </div>
            </form>
          )}
          {[
            { title: 'Explain Notes & Study Guides', list: explainMaterials, badge: 'Explain' },
            { title: 'Homework (HW) & A3 Worksheet Spreads', list: homeworkMaterials, badge: 'Homework (HW)' },
            ...(isTeacher && keyMaterials.length > 0
              ? [{ title: 'Official Answer Keys (Educator Only)', list: keyMaterials, badge: 'Educator Key' }]
              : []),
          ].map((section) => (
            <div key={section.title} className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <span>{section.title}</span>
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px]">{section.list.length}</span>
              </h3>
              {section.list.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-4 text-xs text-gray-400">
                  No files in {section.badge} yet.
                </div>
              ) : (
                section.list.map((mat) => (
                  <div
                    key={mat.id}
                    className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition"
                  >
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-red-500 font-bold text-xs uppercase">{mat.type}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{mat.title}</p>
                        {mat.isA3 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                            A3 Size · Auto-Split Ready
                          </span>
                        )}
                        {isTeacher && mat.teacherOnly && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                            Educator Only
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {section.badge} &middot; {mat.type.toUpperCase()} &middot; {mat.size}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {mat.url && mat.url !== '#' ? (
                        <a
                          href={mat.url.startsWith('/api/') ? apiUrl(mat.url) : mat.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                        >
                          Open PDF / Link
                        </a>
                      ) : (
                        <span className="px-2.5 py-1 text-[11px] font-medium text-gray-400 bg-[#f7f9fc] rounded-lg">
                          Template Item
                        </span>
                      )}
                      {section.badge === 'Homework (HW)' && !isParent && (
                        <button
                          onClick={() => setActiveTab('homework')}
                          className="px-3.5 py-2 text-xs font-semibold text-[#163252] bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                        >
                          Submit Solved PDF
                        </button>
                      )}
                      {isTeacher && (mat as any).isCustom && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCourseMaterial(mat.id)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'quizzes' && (
        <div className="space-y-5">
          {quizNotice && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl text-sm">
              {quizNotice}
            </div>
          )}

          {isTeacher && (
            <form onSubmit={handleCreateQuizOrEssay} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Create New Quiz or Essay Assignment</h3>
                <span className="text-[11px] text-gray-500">Marked &amp; Reviewed by Mr. Haitham</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={newQuizTitle}
                  onChange={(e) => setNewQuizTitle(e.target.value)}
                  placeholder="Assessment Title"
                  className="px-3 py-2 rounded-lg border border-gray-200 text-xs"
                  required
                />
                <select
                  value={newQuizKind}
                  onChange={(e) => setNewQuizKind(e.target.value as 'quiz' | 'essay')}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white"
                >
                  <option value="quiz">Interactive Quiz</option>
                  <option value="essay">Structured Proof / Essay</option>
                </select>
                <select
                  value={newQuizSystem}
                  onChange={(e) => setNewQuizSystem(e.target.value as GradingSystem)}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white"
                >
                  <option value="edexcel">Grading: Edexcel</option>
                  <option value="ib">Grading: IB Criteria (1-7)</option>
                  <option value="marks">Grading: Raw Marks</option>
                </select>
              </div>
              <textarea
                rows={2}
                value={newQuizPrompt}
                onChange={(e) => setNewQuizPrompt(e.target.value)}
                placeholder="Question prompt or essay task..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs"
                required
              />
              <div className="flex flex-wrap gap-3 items-center">
                <input
                  type="text"
                  value={newQuizExpected}
                  onChange={(e) => setNewQuizExpected(e.target.value)}
                  placeholder="Educator-only expected answer / rubric (hidden from students beforehand)"
                  className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border border-gray-200 text-xs"
                />
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={newQuizMarks}
                  onChange={(e) => setNewQuizMarks(Number(e.target.value))}
                  className="w-20 px-3 py-2 rounded-lg border border-gray-200 text-xs"
                />
                <button type="submit" className="px-4 py-2 rounded-lg bg-[#163252] hover:bg-[#214266] text-white text-xs font-bold">
                  + Publish to Course
                </button>
              </div>
            </form>
          )}

          {selectedQuiz && !isParent ? (
            <form onSubmit={handleSubmitAssessment} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {selectedQuiz.kind} · {selectedQuiz.gradingSystem.toUpperCase()}
                  </span>
                  <h3 className="text-base font-bold text-gray-900 mt-1">{selectedQuiz.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedQuiz.instructions}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedQuiz(null)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-[#f7f9fc]"
                >
                  Back to List
                </button>
              </div>

              {selectedQuiz.questions.map((q, idx) => (
                <div key={q.id} className="p-4 rounded-xl bg-[#f7f9fc] border border-gray-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">
                      Q{idx + 1}. {q.prompt}
                    </p>
                    <span className="text-xs font-bold text-gray-500">{q.marks} Marks</span>
                  </div>
                  {q.type === 'mcq' && Array.isArray(q.options) ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt) => (
                        <label
                          key={opt}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                            quizAnswers[q.id] === opt
                              ? 'border-[#163252] bg-rose-50 text-[#163252] font-semibold'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`quiz_${q.id}`}
                            checked={quizAnswers[q.id] === opt}
                            onChange={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      rows={selectedQuiz.kind === 'essay' ? 5 : 3}
                      value={quizAnswers[q.id] || ''}
                      onChange={(e) => setQuizAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Write your full working and justification clearly..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                      required
                    />
                  )}
                </div>
              ))}

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={quizSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#163252] hover:bg-[#214266] text-white text-xs font-bold transition shadow-sm disabled:opacity-60"
                >
                  {quizSubmitting ? 'Submitting to Mr. Haitham...' : 'Submit for Mr. Haitham Approval'}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableQuizzes.map((quiz) => (
                <div key={quiz.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {quiz.kind}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {quiz.gradingSystem}
                      </span>
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm">{quiz.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">{quiz.instructions}</p>
                    <p className="text-[11px] text-gray-400 mt-2">
                      {quiz.questions.length} question(s) · {quiz.questions.reduce((s, q) => s + q.marks, 0)} marks
                    </p>
                  </div>
                  {!isParent && !isTeacher && (
                    <button
                      onClick={() => {
                        setSelectedQuiz(quiz);
                        setQuizAnswers({});
                        setQuizNotice(null);
                      }}
                      className="w-full py-2 rounded-xl bg-[#163252] hover:bg-[#214266] text-white text-xs font-bold transition"
                    >
                      Start {quiz.kind === 'essay' ? 'Essay' : 'Quiz'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'homework' && (
        <div className="-mx-4">
          <StudentHomeworkPortal
            key={course.id}
            courseId={course.id}
            courseTitle={course.name}
            courseCode={course.code}
            defaultStudentName={
              isParent ? user?.linkedStudentName : user?.role === 'student' ? user.fullName : undefined
            }
            userRole={user?.role}
            studentId={effectiveStudentId}
            studentUsername={user?.username}
            viewerUserId={user?.id}
            onSwitchToModelKey={isTeacher ? onOpenModelKey : undefined}
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
