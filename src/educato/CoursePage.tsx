import React, { useState, useEffect, useCallback } from 'react';
import { Folder, FolderOpen, Pencil, Eye, EyeOff, ChevronDown, ChevronRight, FileText, Video, Upload } from 'lucide-react';
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
  const [newMatHidden, setNewMatHidden] = useState(false);
  const [uploadingMat, setUploadingMat] = useState(false);

  // Inline Sub-Folder Upload Tool state
  const [inlineUploadTarget, setInlineUploadTarget] = useState<{
    majorFolderId: string;
    subFolderId: string;
  } | null>(null);
  const [inlineMatTitle, setInlineMatTitle] = useState('');
  const [inlineMatCategory, setInlineMatCategory] = useState<'explain' | 'homework' | 'resource'>('explain');
  const [inlineMatUrl, setInlineMatUrl] = useState('');
  const [inlineMatFile, setInlineMatFile] = useState<File | null>(null);
  const [inlineMatFileBase64, setInlineMatFileBase64] = useState<string | null>(null);
  const [inlineMatIsA3, setInlineMatIsA3] = useState(false);
  const [inlineMatHidden, setInlineMatHidden] = useState(false);
  const [uploadingInline, setUploadingInline] = useState(false);

  // 10 Major Folders x 10 Sub-Folders state (Renameable at any time)
  const [courseFolders, setCourseFolders] = useState<CourseMajorFolder[]>([]);
  const [selectedMajorFolderId, setSelectedMajorFolderId] = useState<string>('mf-1');
  const [selectedSubFolderId, setSelectedSubFolderId] = useState<string>('all');
  const [expandedMajorIds, setExpandedMajorIds] = useState<Record<string, boolean>>({ 'mf-1': true });
  const [expandedSubIds, setExpandedSubIds] = useState<Record<string, boolean>>({});
  const [studentPreviewMode, setStudentPreviewMode] = useState<boolean>(false);
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
      const hiddenFlag = newMatCategory === 'resource' ? true : newMatHidden;
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
          teacherOnly: hiddenFlag,
          hiddenForStudents: hiddenFlag,
        }),
      });
      if (res.ok) {
        setNewMatTitle('');
        setNewMatUrl('');
        setNewMatFile(null);
        setNewMatFileBase64(null);
        setNewMatIsA3(false);
        setNewMatHidden(false);
        await loadCourseExtensions();
      }
    } finally {
      setUploadingMat(false);
    }
  };

  const handleSelectInlineMaterialFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setInlineMatFile(file);
    if (!inlineMatTitle.trim()) setInlineMatTitle(file.name.replace(/\.[^.]+$/, ''));
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setInlineMatFileBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleInlineSubUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineUploadTarget || !inlineMatTitle.trim() || (!inlineMatFileBase64 && !inlineMatUrl.trim())) return;
    setUploadingInline(true);
    try {
      const hiddenFlag = inlineMatCategory === 'resource' ? true : inlineMatHidden;
      const res = await fetch(apiUrl(`/api/courses/${course.id}/materials`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: inlineMatTitle.trim(),
          category: inlineMatCategory,
          majorFolderId: inlineUploadTarget.majorFolderId,
          subFolderId: inlineUploadTarget.subFolderId,
          type: inlineMatFileBase64 ? 'pdf' : 'link',
          fileBase64: inlineMatFileBase64,
          fileName: inlineMatFile?.name,
          url: inlineMatUrl.trim(),
          isA3: inlineMatIsA3,
          teacherOnly: hiddenFlag,
          hiddenForStudents: hiddenFlag,
        }),
      });
      if (res.ok) {
        setInlineMatTitle('');
        setInlineMatUrl('');
        setInlineMatFile(null);
        setInlineMatFileBase64(null);
        setInlineMatIsA3(false);
        setInlineMatHidden(false);
        setInlineUploadTarget(null);
        await loadCourseExtensions();
      }
    } finally {
      setUploadingInline(false);
    }
  };

  const handleToggleMaterialVisibility = async (matId: string, nextHidden: boolean) => {
    try {
      const res = await fetch(apiUrl(`/api/courses/${course.id}/materials/${matId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hiddenForStudents: nextHidden }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.materials)) setCustomMaterials(data.materials);
        else await loadCourseExtensions();
      }
    } catch {
      // ignore transient error
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
  const visibleMaterials =
    isTeacher && !studentPreviewMode
      ? allCourseMaterials
      : allCourseMaterials.filter((m) => !m.teacherOnly && !m.hiddenForStudents);
  const explainMaterials = visibleMaterials.filter((m) => m.category === 'explain' || (!m.category && !m.teacherOnly));
  const homeworkMaterials = visibleMaterials.filter((m) => m.category === 'homework');
  const keyMaterials = visibleMaterials.filter((m) => m.teacherOnly || m.hiddenForStudents);

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
            <div className="bg-white rounded-2xl border border-dashed border-[#E5E7EB] py-12 px-4 text-center">
              <Video className="w-8 h-8 text-[#1B365D]/40 mx-auto" />
              <p className="text-slate-600 font-medium text-sm mt-3">No lesson videos added yet.</p>
              {isTeacher && (
                <p className="text-slate-400 text-xs mt-1">
                  Paste a YouTube link above to publish a recorded lesson for this class.
                </p>
              )}
            </div>
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
          {/* Lined Expandable Folder & Sub-Folder Tree */}
          {(() => {
            const simulatingStudent = isTeacher && studentPreviewMode;
            const displayedMajors = simulatingStudent
              ? courseFolders.filter((f) => !f.hiddenForStudents)
              : courseFolders;

            return (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="math-serif text-base font-bold text-[#13294B]">
                      Course Content &amp; Folders ({displayedMajors.length} Units)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isTeacher && !simulatingStudent
                        ? 'Expand any unit or subfolder inline to browse files, toggle visibility, or rename.'
                        : 'Expand a unit and subfolder below to open your notes and homework sheets.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const anyOpen = Object.values(expandedMajorIds).some(Boolean);
                        if (anyOpen) {
                          setExpandedMajorIds({});
                          setExpandedSubIds({});
                        } else {
                          const allOpen: Record<string, boolean> = {};
                          for (const f of displayedMajors) allOpen[f.id] = true;
                          setExpandedMajorIds(allOpen);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-[#FAF9F5] hover:bg-[#EEF3F9] text-[11px] font-semibold text-[#1B365D] transition"
                    >
                      {Object.values(expandedMajorIds).some(Boolean) ? 'Collapse All' : 'Expand All Units'}
                    </button>
                    {isTeacher && (
                      <div className="inline-flex rounded-lg border border-[#E5E7EB] overflow-hidden text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => setStudentPreviewMode(false)}
                          className={`px-2.5 py-1.5 transition ${
                            !studentPreviewMode
                              ? 'bg-[#1B365D] text-white'
                              : 'bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Teacher View
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentPreviewMode(true)}
                          className={`px-2.5 py-1.5 transition ${
                            studentPreviewMode
                              ? 'bg-[#1B365D] text-white'
                              : 'bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Student Preview
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {simulatingStudent && (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <span>
                      <strong>Student Preview active:</strong> Hidden folders and sub-folders are concealed exactly as students see them.
                    </span>
                    <button
                      type="button"
                      onClick={() => setStudentPreviewMode(false)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 shrink-0"
                    >
                      Exit Preview
                    </button>
                  </div>
                )}

                {displayedMajors.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                    No visible folders in this course yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayedMajors.map((major, idx) => {
                      const isMajorOpen = Boolean(expandedMajorIds[major.id]);
                      const itemsInMajor = visibleMaterials.filter(
                        (m) => resolveMaterialMajorId(m) === major.id
                      );
                      const visibleSubs = simulatingStudent
                        ? major.subFolders.filter((sf) => !sf.hiddenForStudents)
                        : major.subFolders;
                      const isEditingThis =
                        renamingFolderTarget?.majorFolderId === major.id &&
                        !renamingFolderTarget?.subFolderId;

                      return (
                        <div
                          key={major.id}
                          className={`rounded-xl border transition ${
                            major.hiddenForStudents && !simulatingStudent
                              ? 'bg-slate-50 border-dashed border-slate-300 opacity-80'
                              : selectedMajorFolderId === major.id
                              ? 'bg-white border-[#1B365D]/40 shadow-2xs'
                              : 'bg-white border-[#E5E7EB]'
                          }`}
                        >
                          {/* Major Folder Row */}
                          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
                            {isEditingThis ? (
                              <form onSubmit={handleSaveFolderRename} className="flex flex-1 items-center gap-2">
                                <input
                                  type="text"
                                  value={renameDraftText}
                                  onChange={(e) => setRenameDraftText(e.target.value)}
                                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#1B365D] text-xs bg-white outline-none"
                                  autoFocus
                                  required
                                />
                                <button
                                  type="submit"
                                  disabled={savingRename}
                                  className="px-3 py-1.5 rounded-lg bg-[#1B365D] text-white text-[11px] font-bold"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRenamingFolderTarget(null)}
                                  className="px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-[11px] text-gray-600"
                                >
                                  Cancel
                                </button>
                              </form>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedMajorIds((prev) => ({
                                      ...prev,
                                      [major.id]: !prev[major.id],
                                    }));
                                    setSelectedMajorFolderId(major.id);
                                    setSelectedSubFolderId('all');
                                  }}
                                  className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                                >
                                  {isMajorOpen ? (
                                    <ChevronDown className="w-4 h-4 text-[#1B365D] shrink-0" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                                  )}
                                  {isMajorOpen ? (
                                    <FolderOpen className="w-4 h-4 text-[#1B365D] shrink-0" />
                                  ) : (
                                    <Folder className="w-4 h-4 text-[#1B365D] shrink-0" />
                                  )}
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#EEF3F9] text-[#1B365D] shrink-0">
                                    {String(idx + 1).padStart(2, '0')}
                                  </span>
                                  <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                    {major.name}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-medium shrink-0">
                                    {visibleSubs.length} subfolders &middot; {itemsInMajor.length} file{itemsInMajor.length === 1 ? '' : 's'}
                                  </span>
                                </button>

                                {isTeacher && !simulatingStudent && (
                                  <div className="flex items-center gap-1.5 shrink-0">
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
                                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition inline-flex items-center gap-1 ${
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
                                      className="px-2 py-1 rounded-lg border border-[#E5E7EB] bg-[#FAF9F5] hover:bg-[#EEF3F9] text-[10px] font-semibold text-[#1B365D] inline-flex items-center gap-1 transition"
                                    >
                                      <Pencil className="w-2.5 h-2.5" /> Rename
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Nested Sub-Folders with Left Hierarchy Connector Line */}
                          {isMajorOpen && (
                            <div className="ml-5 pl-3.5 border-l-2 border-[#DCE5F0] pb-3 pr-3 space-y-1.5">
                              {visibleSubs.map((sub, sIdx) => {
                                const subKey = `${major.id}::${sub.id}`;
                                const subItems = itemsInMajor.filter((m) => resolveMaterialSubId(m) === sub.id);
                                const isSubOpen = Boolean(expandedSubIds[subKey]);
                                const isEditingSub =
                                  renamingFolderTarget?.majorFolderId === major.id &&
                                  renamingFolderTarget?.subFolderId === sub.id;

                                return (
                                  <div
                                    key={sub.id}
                                    className={`rounded-lg border transition ${
                                      sub.hiddenForStudents && !simulatingStudent
                                        ? 'bg-slate-100/80 border-dashed border-slate-300 opacity-75'
                                        : selectedMajorFolderId === major.id && selectedSubFolderId === sub.id
                                        ? 'bg-[#F8FAFD] border-[#1B365D]/40'
                                        : 'bg-[#FAF9F5] border-[#E5E7EB]'
                                    }`}
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                                      {isEditingSub ? (
                                        <form onSubmit={handleSaveFolderRename} className="flex flex-1 items-center gap-1.5">
                                          <input
                                            type="text"
                                            value={renameDraftText}
                                            onChange={(e) => setRenameDraftText(e.target.value)}
                                            className="flex-1 px-2 py-1 rounded border border-[#1B365D] text-xs bg-white outline-none"
                                            autoFocus
                                            required
                                          />
                                          <button
                                            type="submit"
                                            disabled={savingRename}
                                            className="px-2.5 py-1 rounded bg-[#1B365D] text-white text-[10px] font-bold"
                                          >
                                            Save
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setRenamingFolderTarget(null)}
                                            className="px-2 py-1 rounded border border-gray-300 bg-white text-[10px]"
                                          >
                                            Cancel
                                          </button>
                                        </form>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedMajorFolderId(major.id);
                                              setSelectedSubFolderId(sub.id);
                                              setExpandedSubIds((prev) => ({
                                                ...prev,
                                                [subKey]: !prev[subKey],
                                              }));
                                            }}
                                            className="flex items-center gap-2 text-left flex-1 min-w-0"
                                          >
                                            {isSubOpen ? (
                                              <ChevronDown className="w-3.5 h-3.5 text-[#1B365D] shrink-0" />
                                            ) : (
                                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            )}
                                            <span className="text-[10px] font-bold text-slate-400 shrink-0">
                                              #{sIdx + 1}
                                            </span>
                                            <span className="text-xs font-semibold text-slate-800 truncate">
                                              {sub.name}
                                            </span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 font-semibold shrink-0">
                                              {subItems.length} file{subItems.length === 1 ? '' : 's'}
                                            </span>
                                          </button>

                                          {isTeacher && !simulatingStudent && (
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const isSame =
                                                    inlineUploadTarget?.majorFolderId === major.id &&
                                                    inlineUploadTarget?.subFolderId === sub.id;
                                                  setSelectedMajorFolderId(major.id);
                                                  setSelectedSubFolderId(sub.id);
                                                  if (isSame) {
                                                    setInlineUploadTarget(null);
                                                  } else {
                                                    setExpandedMajorIds((prev) => ({ ...prev, [major.id]: true }));
                                                    setExpandedSubIds((prev) => ({ ...prev, [subKey]: true }));
                                                    setInlineUploadTarget({
                                                      majorFolderId: major.id,
                                                      subFolderId: sub.id,
                                                    });
                                                    setInlineMatTitle('');
                                                    setInlineMatUrl('');
                                                    setInlineMatFile(null);
                                                    setInlineMatFileBase64(null);
                                                    setInlineMatCategory('explain');
                                                    setInlineMatIsA3(false);
                                                    setInlineMatHidden(Boolean(sub.hiddenForStudents || major.hiddenForStudents));
                                                  }
                                                }}
                                                title="Upload PDF or Link directly into this sub-folder"
                                                className={`px-1.5 py-0.5 rounded border text-[10px] font-bold transition inline-flex items-center gap-1 ${
                                                  inlineUploadTarget?.majorFolderId === major.id &&
                                                  inlineUploadTarget?.subFolderId === sub.id
                                                    ? 'bg-[#1B365D] text-white border-[#1B365D]'
                                                    : 'bg-white text-[#1B365D] border-[#DCE5F0] hover:bg-[#EEF3F9]'
                                                }`}
                                              >
                                                <Upload className="w-2.5 h-2.5" /> Upload
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleToggleFolderVisibility(
                                                    major.id,
                                                    sub.id,
                                                    !sub.hiddenForStudents
                                                  )
                                                }
                                                title={
                                                  sub.hiddenForStudents
                                                    ? 'Hidden from students — click to show'
                                                    : 'Visible to students — click to hide'
                                                }
                                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition inline-flex items-center gap-1 ${
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
                                                    majorFolderId: major.id,
                                                    subFolderId: sub.id,
                                                  });
                                                  setRenameDraftText(sub.name);
                                                }}
                                                title="Rename Sub-Folder"
                                                className="px-1.5 py-0.5 rounded border border-[#E5E7EB] bg-white hover:bg-[#EEF3F9] text-[10px] font-semibold text-[#1B365D] inline-flex items-center gap-1"
                                              >
                                                <Pencil className="w-2.5 h-2.5" /> Rename
                                              </button>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>

                                    {/* Nested Upload Tool & Files Inside Sub-Folder with Connector Line */}
                                    {(isSubOpen ||
                                      (isTeacher &&
                                        !simulatingStudent &&
                                        inlineUploadTarget?.majorFolderId === major.id &&
                                        inlineUploadTarget?.subFolderId === sub.id)) && (
                                      <div className="ml-4 pl-3 border-l-2 border-[#E5E7EB] pb-2.5 pr-2.5 space-y-2">
                                        {isTeacher &&
                                          !simulatingStudent &&
                                          inlineUploadTarget?.majorFolderId === major.id &&
                                          inlineUploadTarget?.subFolderId === sub.id && (
                                            <form
                                              onSubmit={handleInlineSubUpload}
                                              className="bg-white rounded-xl border border-[#1B365D]/30 p-3 space-y-2.5 shadow-2xs"
                                            >
                                              <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span className="text-[11px] font-bold text-[#13294B]">
                                                  Upload Material into Sub #{sIdx + 1}: {sub.name}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    if (inlineMatCategory !== 'resource') {
                                                      setInlineMatHidden((prev) => !prev);
                                                    }
                                                  }}
                                                  disabled={inlineMatCategory === 'resource'}
                                                  title="Toggle whether students can see this uploaded material"
                                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition inline-flex items-center gap-1 ${
                                                    inlineMatCategory === 'resource' || inlineMatHidden
                                                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                  }`}
                                                >
                                                  {inlineMatCategory === 'resource' || inlineMatHidden ? (
                                                    <>
                                                      <EyeOff className="w-3 h-3" /> Hidden from Students
                                                    </>
                                                  ) : (
                                                    <>
                                                      <Eye className="w-3 h-3" /> Visible to Students
                                                    </>
                                                  )}
                                                </button>
                                              </div>
                                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <select
                                                  value={inlineMatCategory}
                                                  onChange={(e) => {
                                                    const val = e.target.value as 'explain' | 'homework' | 'resource';
                                                    setInlineMatCategory(val);
                                                    if (val === 'resource') setInlineMatHidden(true);
                                                  }}
                                                  className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-[11px] font-semibold"
                                                >
                                                  <option value="explain">Explain Notes</option>
                                                  <option value="homework">Homework (HW) PDF</option>
                                                  <option value="resource">Educator Model Key</option>
                                                </select>
                                                <input
                                                  type="text"
                                                  value={inlineMatTitle}
                                                  onChange={(e) => setInlineMatTitle(e.target.value)}
                                                  placeholder="Material / PDF Title"
                                                  className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px]"
                                                  required
                                                />
                                                <input
                                                  type="url"
                                                  value={inlineMatUrl}
                                                  onChange={(e) => setInlineMatUrl(e.target.value)}
                                                  placeholder="Optional URL (or choose PDF)"
                                                  className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px]"
                                                />
                                              </div>
                                              <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex flex-wrap items-center gap-2.5">
                                                  <label className="px-2.5 py-1 rounded-lg bg-[#EEF3F9] hover:bg-[#DCE5F0] border border-[#C5D6E8] text-[#1B365D] text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1">
                                                    <Upload className="w-3 h-3" />
                                                    <span>{inlineMatFile ? inlineMatFile.name : 'Choose PDF / File'}</span>
                                                    <input
                                                      type="file"
                                                      accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg"
                                                      onChange={handleSelectInlineMaterialFile}
                                                      className="hidden"
                                                    />
                                                  </label>
                                                  <label className="inline-flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                                                    <input
                                                      type="checkbox"
                                                      checked={inlineMatIsA3}
                                                      onChange={(e) => setInlineMatIsA3(e.target.checked)}
                                                    />
                                                    <span>A3 Spread</span>
                                                  </label>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                  <button
                                                    type="button"
                                                    onClick={() => setInlineUploadTarget(null)}
                                                    className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-[11px] text-slate-600 hover:bg-slate-50"
                                                  >
                                                    Cancel
                                                  </button>
                                                  <button
                                                    type="submit"
                                                    disabled={uploadingInline || (!inlineMatFileBase64 && !inlineMatUrl.trim())}
                                                    className="px-3 py-1 rounded-lg bg-[#1B365D] hover:bg-[#13294B] disabled:opacity-50 text-white text-[11px] font-bold transition"
                                                  >
                                                    {uploadingInline ? 'Uploading...' : 'Publish to Sub-Folder'}
                                                  </button>
                                                </div>
                                              </div>
                                            </form>
                                          )}

                                        {subItems.length === 0 ? (
                                          <div className="px-3 py-2 rounded-lg bg-white border border-dashed border-slate-200 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
                                            <span>No files inside this subfolder yet.</span>
                                            {isTeacher && !simulatingStudent && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setSelectedMajorFolderId(major.id);
                                                  setSelectedSubFolderId(sub.id);
                                                  setInlineUploadTarget({
                                                    majorFolderId: major.id,
                                                    subFolderId: sub.id,
                                                  });
                                                  setInlineMatHidden(Boolean(sub.hiddenForStudents || major.hiddenForStudents));
                                                }}
                                                className="text-[#1B365D] font-semibold hover:underline inline-flex items-center gap-1"
                                              >
                                                <Upload className="w-3 h-3" /> Upload file here
                                              </button>
                                            )}
                                          </div>
                                        ) : (
                                          subItems.map((mat) => {
                                            const matHidden = Boolean(mat.hiddenForStudents || mat.teacherOnly);
                                            return (
                                            <div
                                              key={mat.id}
                                              className={`flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 bg-white rounded-lg border transition ${
                                                matHidden && !simulatingStudent
                                                  ? 'border-dashed border-slate-300 opacity-80'
                                                  : 'border-[#E5E7EB] hover:border-[#1B365D]/30'
                                              }`}
                                            >
                                              <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 bg-[#EEF3F9] rounded-lg flex items-center justify-center shrink-0">
                                                  <FileText className="w-4 h-4 text-[#1B365D]" />
                                                </div>
                                                <div className="min-w-0">
                                                  <p className="text-xs font-bold text-slate-900 truncate">
                                                    {mat.title}
                                                  </p>
                                                  <p className="text-[11px] text-slate-500">
                                                    {mat.type.toUpperCase()} &middot;{' '}
                                                    {mat.category === 'homework'
                                                      ? 'Homework (HW)'
                                                      : mat.teacherOnly
                                                      ? 'Educator Key'
                                                      : 'Explain'}{' '}
                                                    &middot; {mat.size}
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-1.5 shrink-0">
                                                {isTeacher && !simulatingStudent && (mat as any).isCustom && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleToggleMaterialVisibility(mat.id, !matHidden)}
                                                    title={
                                                      matHidden
                                                        ? 'Hidden from students — click to show'
                                                        : 'Visible to students — click to hide'
                                                    }
                                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition inline-flex items-center gap-1 ${
                                                      matHidden
                                                        ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                    }`}
                                                  >
                                                    {matHidden ? (
                                                      <>
                                                        <EyeOff className="w-2.5 h-2.5" /> Hidden
                                                      </>
                                                    ) : (
                                                      <>
                                                        <Eye className="w-2.5 h-2.5" /> Visible
                                                      </>
                                                    )}
                                                  </button>
                                                )}
                                                {mat.url && mat.url !== '#' ? (
                                                  <a
                                                    href={mat.url.startsWith('/api/') ? apiUrl(mat.url) : mat.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-2.5 py-1 text-[11px] font-semibold text-[#1B365D] bg-[#EEF3F9] hover:bg-[#DCE5F0] rounded-lg transition"
                                                  >
                                                    Open PDF / Link
                                                  </a>
                                                ) : (
                                                  <span className="px-2 py-1 text-[10px] font-medium text-gray-400 bg-[#f7f9fc] rounded-lg">
                                                    Template Item
                                                  </span>
                                                )}
                                                {mat.category === 'homework' && !isParent && (
                                                  <button
                                                    type="button"
                                                    onClick={() => setActiveTab('homework')}
                                                    className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[#1B365D] hover:bg-[#13294B] rounded-lg transition"
                                                  >
                                                    Submit Solved PDF
                                                  </button>
                                                )}
                                                {isTeacher && !simulatingStudent && (mat as any).isCustom && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDeleteCourseMaterial(mat.id)}
                                                    className="px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 rounded-lg transition"
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
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                  onChange={(e) => {
                    const val = e.target.value as 'explain' | 'homework' | 'resource';
                    setNewMatCategory(val);
                    if (val === 'resource') setNewMatHidden(true);
                  }}
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
                  <label className="px-3 py-1.5 rounded-lg bg-[#EEF3F9] hover:bg-[#DCE5F0] border border-[#c5d6e8] text-[#163252] text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{newMatFile ? `Selected: ${newMatFile.name}` : 'Choose PDF / File'}</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg"
                      onChange={handleSelectCourseMaterialFile}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (newMatCategory !== 'resource') setNewMatHidden((v) => !v);
                    }}
                    disabled={newMatCategory === 'resource'}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition inline-flex items-center gap-1.5 ${
                      newMatCategory === 'resource' || newMatHidden
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {newMatCategory === 'resource' || newMatHidden ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" /> Hidden from Students
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" /> Visible to Students
                      </>
                    )}
                  </button>
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
                      {isTeacher && !studentPreviewMode && (mat as any).isCustom && (
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleMaterialVisibility(
                              mat.id,
                              !(mat.hiddenForStudents || mat.teacherOnly)
                            )
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition inline-flex items-center gap-1 ${
                            mat.hiddenForStudents || mat.teacherOnly
                              ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {mat.hiddenForStudents || mat.teacherOnly ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" /> Hidden
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" /> Visible
                            </>
                          )}
                        </button>
                      )}
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
