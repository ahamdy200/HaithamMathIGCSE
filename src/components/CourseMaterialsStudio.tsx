import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Video,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Lock,
  Loader2,
  Link2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { COURSES, CourseMaterial, CourseVideo } from '../educato/courses';
import { apiUrl } from '../utils/apiBase';
import type { CourseMajorFolder } from '../types';

interface CourseMaterialsStudioProps {
  initialCourseId?: string | null;
  onOpenCourse?: (courseId: string) => void;
}

export const CourseMaterialsStudio: React.FC<CourseMaterialsStudioProps> = ({
  initialCourseId,
  onOpenCourse,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialCourseId && COURSES.some((c) => c.id === initialCourseId) ? initialCourseId : COURSES[0].id
  );
  const selectedCourse = COURSES.find((c) => c.id === selectedCourseId) || COURSES[0];

  // Loaded custom items for selected course
  const [customMaterials, setCustomMaterials] = useState<(CourseMaterial & { isCustom?: boolean })[]>([]);
  const [customVideos, setCustomVideos] = useState<CourseVideo[]>([]);
  const [loadingCourseData, setLoadingCourseData] = useState(false);

  // Material / PDF Upload Form state
  const [courseFolders, setCourseFolders] = useState<CourseMajorFolder[]>([]);
  const [matMajorFolderId, setMatMajorFolderId] = useState<string>('mf-1');
  const [matSubFolderId, setMatSubFolderId] = useState<string>('sf-1');
  const [matTitle, setMatTitle] = useState('');
  const [matCategory, setMatCategory] = useState<'explain' | 'homework' | 'resource'>('explain');
  const [matSourceMode, setMatSourceMode] = useState<'file' | 'link'>('file');
  const [matFile, setMatFile] = useState<File | null>(null);
  const [matFileBase64, setMatFileBase64] = useState<string | null>(null);
  const [matUrl, setMatUrl] = useState('');
  const [matIsA3, setMatIsA3] = useState(false);
  const [matTeacherOnly, setMatTeacherOnly] = useState(false);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video Link Form state
  const [vidTitle, setVidTitle] = useState('');
  const [vidUrl, setVidUrl] = useState('');
  const [vidDuration, setVidDuration] = useState('25:00');
  const [savingVideo, setSavingVideo] = useState(false);

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadCourseContent = useCallback(async () => {
    setLoadingCourseData(true);
    try {
      const [mRes, vRes, fRes] = await Promise.all([
        fetch(apiUrl(`/api/courses/${selectedCourseId}/materials?role=teacher`)),
        fetch(apiUrl(`/api/courses/${selectedCourseId}/videos`)),
        fetch(apiUrl(`/api/courses/${selectedCourseId}/folders`)),
      ]);
      if (mRes.ok) {
        const mData = await mRes.json();
        setCustomMaterials(Array.isArray(mData?.materials) ? mData.materials : []);
      }
      if (vRes.ok) {
        const vData = await vRes.json();
        setCustomVideos(Array.isArray(vData?.videos) ? vData.videos : []);
      }
      if (fRes.ok) {
        const fData = await fRes.json();
        setCourseFolders(Array.isArray(fData?.folders) ? fData.folders : []);
      }
    } catch {
      // ignore transient errors
    } finally {
      setLoadingCourseData(false);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    loadCourseContent();
  }, [loadCourseContent]);

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMatFile(file);
    if (!matTitle.trim()) {
      setMatTitle(file.name.replace(/\.[^.]+$/, ''));
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setMatFileBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matTitle.trim()) {
      setNotice({ type: 'error', text: 'Please enter a title for the material or PDF.' });
      return;
    }
    if (matSourceMode === 'file' && !matFileBase64) {
      setNotice({ type: 'error', text: 'Please select a PDF or document file to upload.' });
      return;
    }
    if (matSourceMode === 'link' && !matUrl.trim()) {
      setNotice({ type: 'error', text: 'Please enter a valid PDF or resource URL.' });
      return;
    }

    setUploadingMaterial(true);
    setNotice(null);
    try {
      const res = await fetch(apiUrl(`/api/courses/${selectedCourseId}/materials`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: matTitle.trim(),
          category: matCategory,
          majorFolderId: matMajorFolderId,
          subFolderId: matSubFolderId,
          type: matSourceMode === 'link' ? 'link' : 'pdf',
          fileBase64: matSourceMode === 'file' ? matFileBase64 : null,
          fileName: matSourceMode === 'file' ? matFile?.name : undefined,
          url: matSourceMode === 'link' ? matUrl.trim() : '',
          isA3: matIsA3,
          teacherOnly: matCategory === 'resource' ? true : matTeacherOnly,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Could not upload material.');
      }

      setNotice({
        type: 'success',
        text: `Uploaded "${data.material.title}" to ${selectedCourse.name} (${matCategory === 'explain' ? 'Explain Notes' : matCategory === 'homework' ? 'Homework PDFs' : 'Educator Keys'}).`,
      });
      setMatTitle('');
      setMatFile(null);
      setMatFileBase64(null);
      setMatUrl('');
      setMatIsA3(false);
      setMatTeacherOnly(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadCourseContent();
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Upload failed.' });
    } finally {
      setUploadingMaterial(false);
    }
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vidTitle.trim() || !vidUrl.trim()) return;
    setSavingVideo(true);
    setNotice(null);
    try {
      const res = await fetch(apiUrl(`/api/courses/${selectedCourseId}/videos`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: vidTitle.trim(),
          youtubeUrl: vidUrl.trim(),
          duration: vidDuration.trim() || '25:00',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Could not save video link.');
      }
      setNotice({
        type: 'success',
        text: `Added video "${data.video.title}" to ${selectedCourse.name}.`,
      });
      setVidTitle('');
      setVidUrl('');
      await loadCourseContent();
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Could not save video link.' });
    } finally {
      setSavingVideo(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    const res = await fetch(apiUrl(`/api/courses/${selectedCourseId}/materials/${materialId}`), {
      method: 'DELETE',
    });
    if (res.ok) {
      setNotice({ type: 'success', text: 'Uploaded material removed from section.' });
      await loadCourseContent();
    }
  };

  const handleToggleMaterialVisibility = async (materialId: string, nextHidden: boolean) => {
    const res = await fetch(apiUrl(`/api/courses/${selectedCourseId}/materials/${materialId}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hiddenForStudents: nextHidden }),
    });
    if (res.ok) {
      await loadCourseContent();
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    const res = await fetch(apiUrl(`/api/courses/${selectedCourseId}/videos/${videoId}`), {
      method: 'DELETE',
    });
    if (res.ok) {
      setNotice({ type: 'success', text: 'Custom video link removed from section.' });
      await loadCourseContent();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#214266] via-[#163252] to-[#0f243d] rounded-2xl p-6 text-white shadow-lg border border-[#2b517c]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center">
              <UploadCloud className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-sky-100">
                Educator Content Manager &bull; Mr.HaithamHusseinig
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold font-serif mt-0.5">
                Upload Materials, PDFs &amp; Video Links to Course Sections
              </h1>
              <p className="text-xs text-sky-100 mt-1">
                Publish Explain Notes, Homework PDFs (including A3 spreads), Educator Keys, and YouTube lessons directly to any group.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-white text-slate-900 text-xs font-bold shadow-sm outline-none"
            >
              {COURSES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
            {onOpenCourse && (
              <button
                type="button"
                onClick={() => onOpenCourse(selectedCourseId)}
                className="px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-bold transition"
              >
                Open Course View &rarr;
              </button>
            )}
          </div>
        </div>
      </div>

      {notice && (
        <div
          className={`px-4 py-3 rounded-xl text-xs flex items-center justify-between border ${
            notice.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {notice.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{notice.text}</span>
          </div>
          <button type="button" onClick={() => setNotice(null)} className="text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Tools Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form 1: Upload PDF / Document / Resource Link */}
        <form
          onSubmit={handleUploadMaterial}
          className="lg:col-span-7 bg-white border border-[#d3dfec] rounded-2xl p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#dce6f0] text-[#163252] flex items-center justify-center border border-[#c5d6e8]">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Upload PDF / Material to Section</h2>
                <p className="text-[11px] text-slate-500">Target Group: {selectedCourse.name}</p>
              </div>
            </div>

            <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px]">
              <button
                type="button"
                onClick={() => setMatSourceMode('file')}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  matSourceMode === 'file' ? 'bg-white text-[#163252] shadow-2xs' : 'text-slate-600'
                }`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setMatSourceMode('link')}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  matSourceMode === 'link' ? 'bg-white text-[#163252] shadow-2xs' : 'text-slate-600'
                }`}
              >
                External URL
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Major Folder (1–10)</label>
              <select
                value={matMajorFolderId}
                onChange={(e) => {
                  setMatMajorFolderId(e.target.value);
                  setMatSubFolderId('sf-1');
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
              >
                {courseFolders.map((mf, i) => (
                  <option key={mf.id} value={mf.id}>
                    {i + 1}. {mf.name}{mf.hiddenForStudents ? ' (Hidden from Students)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Sub-Folder (1–10)</label>
              <select
                value={matSubFolderId}
                onChange={(e) => setMatSubFolderId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
              >
                {(courseFolders.find((mf) => mf.id === matMajorFolderId)?.subFolders || []).map((sf, i) => (
                  <option key={sf.id} value={sf.id}>
                    Sub #{i + 1}: {sf.name}{sf.hiddenForStudents ? ' (Hidden)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Course Section</label>
              <select
                value={matCategory}
                onChange={(e) => {
                  const val = e.target.value as 'explain' | 'homework' | 'resource';
                  setMatCategory(val);
                  if (val === 'resource') setMatTeacherOnly(true);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
              >
                <option value="explain">Explain Notes &amp; Study Guides</option>
                <option value="homework">Homework (HW) &amp; Worksheets</option>
                <option value="resource">Official Answer Key (Educator Only)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Material Title</label>
              <input
                type="text"
                value={matTitle}
                onChange={(e) => setMatTitle(e.target.value)}
                placeholder="e.g. Ch.5 Straight Line Graphs Notes"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-[#163252]"
                required
              />
            </div>
          </div>

          {matSourceMode === 'file' ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg"
                onChange={handleSelectFile}
                className="hidden"
                id="course-material-file-input"
              />
              <label
                htmlFor="course-material-file-input"
                className="flex flex-col items-center justify-center border-2 border-dashed border-[#b8cde0] hover:border-[#163252] rounded-xl p-5 cursor-pointer bg-[#fffcfd] hover:bg-[#f4f8fc] transition text-center"
              >
                <UploadCloud className="w-7 h-7 text-[#163252] mb-1.5" />
                {matFile ? (
                  <>
                    <p className="text-xs font-bold text-slate-900">{matFile.name}</p>
                    <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                      {(matFile.size / (1024 * 1024) >= 1
                        ? `${(matFile.size / (1024 * 1024)).toFixed(1)} MB`
                        : `${Math.max(1, Math.round(matFile.size / 1024))} KB`)}{' '}
                      ready to publish
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-bold text-slate-800">Click to select PDF, Worksheet, or Study Guide</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">PDF, DOCX, PPTX, PNG, or JPG accepted</p>
                  </>
                )}
              </label>
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">PDF / Google Drive / Resource Link</label>
              <div className="relative">
                <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={matUrl}
                  onChange={(e) => setMatUrl(e.target.value)}
                  placeholder="https://drive.google.com/... or https://.../notes.pdf"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-[#163252]"
                  required={matSourceMode === 'link'}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-700">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={matIsA3}
                onChange={(e) => setMatIsA3(e.target.checked)}
                className="rounded border-slate-300 text-[#163252]"
              />
              <span>A3 Size Worksheet Spread (Auto-Split Ready)</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={matCategory === 'resource' ? true : matTeacherOnly}
                disabled={matCategory === 'resource'}
                onChange={(e) => setMatTeacherOnly(e.target.checked)}
                className="rounded border-slate-300 text-[#163252]"
              />
              <span className="inline-flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-600" /> Educator Only (Hide from Students)
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={uploadingMaterial}
            className="w-full py-2.5 rounded-xl bg-[#163252] hover:bg-[#0f243d] text-white text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {uploadingMaterial ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading to {selectedCourse.name}...
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" /> Publish Material to {selectedCourse.name}
              </>
            )}
          </button>
        </form>

        {/* Form 2: Add YouTube Video Link */}
        <form
          onSubmit={handleAddVideo}
          className="lg:col-span-5 bg-white border border-[#d3dfec] rounded-2xl p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-200">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Add YouTube Video Lesson</h2>
              <p className="text-[11px] text-slate-500">Embeds inside {selectedCourse.name} &rarr; YouTube Videos</p>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Lesson Title</label>
            <input
              type="text"
              value={vidTitle}
              onChange={(e) => setVidTitle(e.target.value)}
              placeholder="e.g. Ch.5 Gradients & Straight Lines Walkthrough"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-[#163252]"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">YouTube Video Link</label>
            <input
              type="url"
              value={vidUrl}
              onChange={(e) => setVidUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-[#163252]"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Video Duration</label>
            <input
              type="text"
              value={vidDuration}
              onChange={(e) => setVidDuration(e.target.value)}
              placeholder="25:00"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-[#163252]"
            />
          </div>

          <button
            type="submit"
            disabled={savingVideo}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {savingVideo ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving Video Link...
              </>
            ) : (
              <>
                <Video className="w-4 h-4" /> Add Video Link to {selectedCourse.name}
              </>
            )}
          </button>
        </form>
      </div>

      {/* Live Uploaded Content List for Selected Course */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#163252]" />
            <h2 className="text-sm font-bold text-slate-900">
              Uploaded Section Content — {selectedCourse.name}
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            {loadingCourseData
              ? 'Loading...'
              : `${customMaterials.length} custom file(s)/link(s) · ${customVideos.length} custom video(s)`}
          </span>
        </div>

        {customMaterials.length === 0 && customVideos.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
            No custom PDFs, materials, or videos uploaded to <strong>{selectedCourse.name}</strong> yet. Use the panels above to publish content into this course section.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Uploaded PDFs / Materials */}
            <div className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Uploaded PDFs &amp; Materials ({customMaterials.length})
              </h3>
              {customMaterials.length === 0 ? (
                <p className="text-xs text-slate-400">No uploaded PDFs yet.</p>
              ) : (
                customMaterials.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{m.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {m.category === 'explain' ? 'Explain Notes' : m.category === 'homework' ? 'Homework PDF' : 'Educator Key'} &middot; {m.size}
                        {m.teacherOnly ? ' · Educator Only' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleMaterialVisibility(m.id, !(m.hiddenForStudents || m.teacherOnly))
                        }
                        title={
                          m.hiddenForStudents || m.teacherOnly
                            ? 'Hidden from students — click to show'
                            : 'Visible to students — click to hide'
                        }
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition inline-flex items-center gap-1 ${
                          m.hiddenForStudents || m.teacherOnly
                            ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {m.hiddenForStudents || m.teacherOnly ? (
                          <>
                            <EyeOff className="w-3 h-3" /> Hidden
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" /> Visible
                          </>
                        )}
                      </button>
                      {m.url && m.url !== '#' && (
                        <a
                          href={m.url.startsWith('/api/') ? apiUrl(m.url) : m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                          title="Open PDF / Link"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteMaterial(m.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Remove material"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Uploaded YouTube Videos */}
            <div className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Uploaded YouTube Videos ({customVideos.length})
              </h3>
              {customVideos.length === 0 ? (
                <p className="text-xs text-slate-400">No custom video links added yet.</p>
              ) : (
                customVideos.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{v.title}</p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {v.duration} &middot; {v.youtubeUrl || v.url}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={v.youtubeUrl || v.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                        title="Open YouTube URL"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteVideo(v.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Remove video"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
