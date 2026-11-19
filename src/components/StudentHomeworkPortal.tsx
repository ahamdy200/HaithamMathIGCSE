import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  RotateCcw,
  RotateCw,
  BookOpen,
  Loader2,
  FileCheck,
  X,
  FileUp,
  UserCheck,
  Table as TableIcon,
  List as ListIcon,
  PenTool,
  Send,
  Inbox,
  Clock,
  Trash2,
  Eye,
  Edit3,
  Bell,
} from 'lucide-react';
import {
  HomeworkGradingReport,
  QuestionGrading,
  GradingSystem,
  HomeworkAssignmentRecord,
  PortalNotification,
} from '../types';
import { COURSES } from '../educato/courses';
import { HandwrittenEquationCanvas } from './HandwrittenEquationCanvas';
import { apiUrl, getApiBaseUrl } from '../utils/apiBase';
import {
  renderPdfPagesToImages,
  loadImageForGrading,
  rotateImageDataUrl,
  RenderedPageImage,
} from '../utils/pdfPageRenderer';
import {
  PEARSON_EDEXCEL_EXAM_1_KEY,
  MODEL_KEY_TEMPLATES,
  ModelAnswerKeyData,
} from '../data/modelAnswerKey';

interface StudentHomeworkPortalProps {
  courseId?: string;
  courseTitle?: string;
  courseCode?: string;
  defaultStudentName?: string;
  userRole?: 'student' | 'teacher' | 'parent';
  studentId?: number;
  studentUsername?: string;
  viewerUserId?: number;
  focusSubmissionId?: string | null;
  onClearFocusSubmission?: () => void;
  onNotificationsUpdated?: () => void;
  onSwitchToModelKey?: () => void;
}

interface StoredSubmission {
  id: string;
  studentId: number;
  studentUsername: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  assignment: string;
  submissionText: string;
  fileName?: string | null;
  fileMimeType?: string | null;
  pageCount: number;
  status: 'pending' | 'graded';
  submittedAt: string;
  publishedAt?: string;
  reviewedBy?: string;
  teacherNote?: string;
  pageImages?: RenderedPageImage[];
  draftStatus?: 'queued' | 'generating' | 'ready' | 'failed';
  draftError?: string | null;
  draftReport?: HomeworkGradingReport | null;
  publishedReport?: HomeworkGradingReport | null;
  emailDelivery?: {
    status: 'sent' | 'logged_locally' | 'failed';
    to: string;
    provider: string;
    resendId?: string;
    note?: string;
  } | null;
}

function computeGradeLabel(
  percentage: number,
  earnedMarks = 0,
  totalMarks = 1,
  gradingSystem: GradingSystem = 'edexcel'
): string {
  if (gradingSystem === 'ib') {
    if (percentage >= 88) return 'Band 7 (Excellent)';
    if (percentage >= 75) return 'Band 6 (Very Good)';
    if (percentage >= 62) return 'Band 5 (Good)';
    if (percentage >= 50) return 'Band 4 (Satisfactory)';
    if (percentage >= 38) return 'Band 3 (Mediocre)';
    if (percentage >= 22) return 'Band 2 (Limited)';
    return 'Band 1 (Minimal)';
  }
  if (gradingSystem === 'marks') {
    return `${earnedMarks} / ${totalMarks} Marks (${percentage}%)`;
  }
  if (percentage >= 90) return 'A* (Level 9 — Outstanding)';
  if (percentage >= 80) return 'A (Level 8 — Excellent)';
  if (percentage >= 70) return 'B (Level 7 — Good)';
  if (percentage >= 60) return 'C (Level 5-6 — Satisfactory)';
  if (percentage >= 50) return 'D (Level 4 — Needs Improvement)';
  return 'U (Ungraded — Requires Retest)';
}

function recalculateReportTotals(
  report: HomeworkGradingReport,
  overrideSystem?: GradingSystem
): HomeworkGradingReport {
  const sys: GradingSystem = overrideSystem || report.gradingSystem || 'edexcel';
  const updatedQuestions = report.questions.map((q) => {
    const earned = Math.max(0, Math.min(q.maxMarks, Number(q.earnedMarks) || 0));
    const status: 'correct' | 'incorrect' = earned === q.maxMarks ? 'correct' : 'incorrect';
    const statusLabel: any =
      earned === q.maxMarks ? 'CORRECT' : earned > 0 ? `PARTIAL (${earned}/${q.maxMarks})` : 'INCORRECT';
    return { ...q, earnedMarks: earned, status, statusLabel };
  });
  const totalMarks = updatedQuestions.reduce((s, q) => s + q.maxMarks, 0) || report.totalMarks || 1;
  const earnedMarks = updatedQuestions.reduce((s, q) => s + q.earnedMarks, 0);
  const percentage = Math.round((earnedMarks / totalMarks) * 100);
  return {
    ...report,
    gradingSystem: sys,
    totalMarks,
    earnedMarks,
    percentage,
    grade: computeGradeLabel(percentage, earnedMarks, totalMarks, sys),
    questions: updatedQuestions,
  };
}

function downloadReportCsv(report: HomeworkGradingReport) {
  const headers = [
    'Question',
    'Earned Marks',
    'Max Marks',
    'Status',
    'What Was Written (Phase 1)',
    'Exact Mistake & Why Wrong (Phase 2)',
    'Correct Working & Solution (Phase 3)',
  ];

  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = report.questions.map((q) =>
    [
      q.displayLabel || `Q${q.questionNumber}`,
      q.earnedMarks,
      q.maxMarks,
      q.statusLabel,
      q.phase1Extraction || q.studentWorkingFound,
      q.phase2ErrorAnalysis || q.errorAnalysis || q.teacherFeedback,
      q.phase3Solution || q.modelSolution,
    ]
      .map(esc)
      .join(',')
  );

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(report.studentName || 'Student').replace(/\s+/g, '_')}_Homework_Report.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtmlText(val: any): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildStandaloneParentReportHtml(
  report: HomeworkGradingReport,
  teacherNote?: string,
  resolvedCourseTitle?: string
): string {
  const sysCode = (report.gradingSystem || 'edexcel').toUpperCase();
  const sysLabel =
    sysCode === 'IB'
      ? 'IB (Band 1–7)'
      : sysCode === 'MARKS'
      ? 'Raw Marks (%)'
      : 'Pearson Edexcel (9–1 / A*–U)';

  const correctCount = report.questions.filter((q) => Number(q.earnedMarks) === Number(q.maxMarks)).length;
  const partialCount = report.questions.filter(
    (q) => Number(q.earnedMarks) > 0 && Number(q.earnedMarks) < Number(q.maxMarks)
  ).length;
  const missedCount = report.questions.length - correctCount - partialCount;
  const cleanDate = report.submissionDate
    ? new Date(report.submissionDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const cleanBodyNote = (teacherNote || '').trim();
  const criterionHtml =
    Array.isArray(report.criterionBreakdown) && report.criterionBreakdown.length > 0
      ? `<div class="criteria-grid">
          ${report.criterionBreakdown
            .map(
              (c) => `<div class="crit-item"><div class="crit-label">${escapeHtmlText(c.label)}</div><div class="crit-val">${escapeHtmlText(c.score)}</div></div>`
            )
            .join('')}
        </div>`
      : '';

  const questionBlocks = report.questions
    .map((q) => {
      const earned = Number(q.earnedMarks) || 0;
      const maxM = Number(q.maxMarks) || 1;
      const isFull = earned === maxM;
      const isPartial = !isFull && earned > 0;
      const badgeClass = isFull ? 'badge-ok' : isPartial ? 'badge-part' : 'badge-miss';
      const badgeLabel = isFull ? 'Full Marks' : isPartial ? 'Partial Credit' : 'Needs Review';

      const written = escapeHtmlText(q.phase1Extraction || q.studentWorkingFound || 'Not attempted').replace(/\n/g, '<br/>');
      const mistake = escapeHtmlText(
        q.phase2ErrorAnalysis || q.errorAnalysis || q.teacherFeedback || (isFull ? 'Confirmed accurate method and final answer.' : 'Needs review.')
      ).replace(/\n/g, '<br/>');
      const solution = escapeHtmlText(q.phase3Solution || q.modelSolution || '—').replace(/\n/g, '<br/>');

      return `
      <section class="q-card">
        <div class="q-head">
          <div class="q-title">
            <span class="q-num">${escapeHtmlText(q.displayLabel || `Q${q.questionNumber}`)}</span>
            <span class="badge ${badgeClass}">${badgeLabel}</span>
          </div>
          <div class="q-score">${earned} / ${maxM} marks</div>
        </div>
        <div class="q-body">
          <div class="q-sec">
            <div class="sec-label lbl-written">1. Student Written Work</div>
            <div class="sec-box math-box">${written}</div>
          </div>
          <div class="q-sec">
            <div class="sec-label lbl-mistake">2. Mistake Analysis &amp; Teacher Feedback</div>
            <div class="sec-box mistake-box">${mistake}${
              q.teacherFeedback && q.teacherFeedback !== (q.phase2ErrorAnalysis || q.errorAnalysis)
                ? `<div class="feedback-sub">${escapeHtmlText(q.teacherFeedback)}</div>`
                : ''
            }</div>
          </div>
          <div class="q-sec">
            <div class="sec-label lbl-sol">3. Complete Worked Solution</div>
            <div class="sec-box sol-box">${solution}</div>
          </div>
        </div>
      </section>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtmlText(report.studentName)} — Progress Report</title>
<style>
  @page { size: A4; margin: 14mm 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Arial, sans-serif;
    color: #1e293b;
    background: #ffffff;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .report-shell { max-width: 780px; margin: 0 auto; }
  .letterhead {
    background: #800020;
    color: #ffffff;
    border-radius: 12px;
    padding: 20px 24px;
    margin-bottom: 16px;
  }
  .lh-eyebrow {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    opacity: 0.85;
    font-weight: 700;
  }
  .lh-title {
    margin: 6px 0 4px;
    font-size: 22px;
    font-weight: 700;
    font-family: Georgia, "Times New Roman", serif;
  }
  .lh-sub { font-size: 12px; opacity: 0.9; margin: 0; }
  .meta-strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 16px;
    margin-bottom: 14px;
  }
  .meta-k { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; font-weight: 700; }
  .meta-v { font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 2px; }
  .kpi-row {
    display: grid;
    grid-template-columns: 1fr 1.25fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }
  .kpi-card {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 16px;
    background: #ffffff;
  }
  .kpi-card.mark { background: #fdf2f4; border-color: #fecdd3; }
  .kpi-lbl { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.07em; font-weight: 700; color: #64748b; }
  .kpi-card.mark .kpi-lbl { color: #9f1239; }
  .kpi-big { font-size: 24px; font-weight: 800; color: #800020; margin-top: 3px; }
  .kpi-big span { font-size: 13px; font-weight: 600; color: #64748b; }
  .kpi-grade { font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 6px; }
  .kpi-breakdown { font-size: 11px; color: #334155; line-height: 1.55; margin-top: 4px; }
  .criteria-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
  .crit-item { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 8px 10px; }
  .crit-label { font-size: 9px; font-weight: 700; color: #3730a3; text-transform: uppercase; }
  .crit-val { font-size: 13px; font-weight: 800; color: #1e1b4b; margin-top: 2px; }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
  .sum-box {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 14px;
    font-size: 11.5px;
    line-height: 1.55;
    background: #fffdfa;
  }
  .sum-box.note { background: #fffbeb; border-color: #fde68a; color: #78350f; }
  .sum-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: #800020; margin-bottom: 5px; }
  .section-hdr {
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #800020;
    border-bottom: 1.5px solid #f1d4db;
    padding-bottom: 5px;
    margin: 0 0 12px;
  }
  .q-card {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    margin-bottom: 12px;
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .q-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 8px 14px;
  }
  .q-title { display: flex; align-items: center; gap: 8px; }
  .q-num { font-weight: 800; font-size: 12.5px; color: #0f172a; }
  .badge { font-size: 9.5px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
  .badge-ok { background: #dcfce7; color: #166534; }
  .badge-part { background: #fef3c7; color: #92400e; }
  .badge-miss { background: #ffe4e6; color: #9f1239; }
  .q-score { font-weight: 800; font-size: 12px; color: #0f172a; }
  .q-body { padding: 10px 14px; display: flex; flex-direction: column; gap: 8px; }
  .sec-label { font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px; }
  .lbl-written { color: #475569; }
  .lbl-mistake { color: #9f1239; }
  .lbl-sol { color: #065f46; }
  .sec-box { font-size: 11.5px; line-height: 1.5; border-radius: 7px; padding: 8px 10px; }
  .math-box { background: #f8fafc; border: 1px solid #e2e8f0; font-family: "JetBrains Mono", Consolas, monospace; color: #0f172a; }
  .mistake-box { background: #fff1f2; border: 1px solid #fecdd3; color: #881337; }
  .feedback-sub { margin-top: 4px; font-style: italic; color: #4c0519; }
  .sol-box { background: #ecfdf5; border: 1px solid #a7f3d0; font-family: "JetBrains Mono", Consolas, monospace; color: #064e3b; }
  .doc-foot {
    margin-top: 16px;
    padding-top: 10px;
    border-top: 1px solid #e2e8f0;
    font-size: 10px;
    color: #64748b;
    text-align: center;
  }
</style>
</head>
<body>
  <div class="report-shell">
    <header class="letterhead">
      <div class="lh-eyebrow">Official Student Assessment Report</div>
      <h1 class="lh-title">${escapeHtmlText(report.assignmentTitle || report.topic || 'Mathematics Homework Report')}</h1>
      <p class="lh-sub">Reviewed &amp; Approved by Mr. Haitham Hussien</p>
    </header>

    <div class="meta-strip">
      <div><div class="meta-k">Student</div><div class="meta-v">${escapeHtmlText(report.studentName)}</div></div>
      <div><div class="meta-k">Subject / Group</div><div class="meta-v">${escapeHtmlText(resolvedCourseTitle || report.subject || 'IGCSE Mathematics')}</div></div>
      <div><div class="meta-k">Date</div><div class="meta-v">${escapeHtmlText(cleanDate)}</div></div>
      <div><div class="meta-k">Educator</div><div class="meta-v">Mr. Haitham Hussien</div></div>
    </div>

    <div class="kpi-row">
      <div class="kpi-card mark">
        <div class="kpi-lbl">Mark Awarded</div>
        <div class="kpi-big">${report.earnedMarks} <span>/ ${report.totalMarks} (${report.percentage}%)</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Grading System &middot; ${escapeHtmlText(sysLabel)}</div>
        <div class="kpi-grade">${escapeHtmlText(report.grade)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Question Summary (${report.questions.length} Qs)</div>
        <div class="kpi-breakdown">
          <strong>${correctCount}</strong> Full Marks &middot; <strong>${partialCount}</strong> Partial<br/>
          <strong>${missedCount}</strong> Needs Review
        </div>
      </div>
    </div>

    ${criterionHtml}

    <div class="summary-grid">
      <div class="sum-box">
        <div class="sum-title">Overall Performance Overview</div>
        <div>${escapeHtmlText(report.generalFeedback || 'Detailed question-by-question evaluation follows below.')}</div>
      </div>
      <div class="sum-box note">
        <div class="sum-title">Mr. Haitham&apos;s Note for Student &amp; Parent</div>
        <div>${escapeHtmlText(
          cleanBodyNote ||
            report.diagnosticReview ||
            `Well done submitting your work, ${report.studentName}. Please review any missed or partial steps together using the complete solutions below.`
        )}</div>
      </div>
    </div>

    <h2 class="section-hdr">Detailed Question-by-Question Review (${report.questions.length} Questions)</h2>
    ${questionBlocks}

    <div class="doc-foot">
      Official Report &middot; Mr. Haitham Hussien Mathematics &middot; Parent &amp; Student Copy
    </div>
  </div>
</body>
</html>`;
}

function printStandaloneParentReport(
  report: HomeworkGradingReport,
  teacherNote?: string,
  resolvedCourseTitle?: string
) {
  const html = buildStandaloneParentReportHtml(report, teacherNote, resolvedCourseTitle);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
      }, 1500);
    }
  }, 250);
}

export const StudentHomeworkPortal: React.FC<StudentHomeworkPortalProps> = ({
  courseId = 'ol-cambridge',
  courseTitle,
  courseCode,
  defaultStudentName = '',
  userRole = 'student',
  studentId = 1,
  studentUsername = 'student01',
  viewerUserId,
  focusSubmissionId = null,
  onClearFocusSubmission,
  onNotificationsUpdated,
  onSwitchToModelKey,
}) => {
  const isTeacher = userRole === 'teacher';
  const isParent = userRole === 'parent';
  const effectiveViewerUserId = viewerUserId ?? (isTeacher ? 999 : studentId);

  // Common notifications
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [portalNotifications, setPortalNotifications] = useState<PortalNotification[]>([]);
  const [showAllNotifications, setShowAllNotifications] = useState(false);

  // Educator-only tabs & Model Key state
  const [teacherMode, setTeacherMode] = useState<'inbox' | 'assign' | 'direct'>('inbox');
  const [activeModelKey, setActiveModelKey] = useState<ModelAnswerKeyData>(PEARSON_EDEXCEL_EXAM_1_KEY);

  // Per-Group Assigned Homework state (Teacher Assigns -> Student Dropdown + Email + In-Site Notification)
  const [groupAssignments, setGroupAssignments] = useState<HomeworkAssignmentRecord[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [assignGroupId, setAssignGroupId] = useState<string>(courseId || COURSES[0]?.id || 'year-9');
  const [assignTitle, setAssignTitle] = useState<string>('');
  const [assignDueDate, setAssignDueDate] = useState<string>('');
  const [assignInstructions, setAssignInstructions] = useState<string>('');
  const [assignGradingSystem, setAssignGradingSystem] = useState<GradingSystem>('edexcel');
  const [assignNotifyEmails, setAssignNotifyEmails] = useState<string>('');
  const [assignSendNotifications, setAssignSendNotifications] = useState<boolean>(true);
  const [isSavingAssignment, setIsSavingAssignment] = useState<boolean>(false);
  const [inboxCourseFilter, setInboxCourseFilter] = useState<string>('all');
  const [isModelKeyModalOpen, setIsModelKeyModalOpen] = useState(false);
  const [editingKeyTitle, setEditingKeyTitle] = useState(PEARSON_EDEXCEL_EXAM_1_KEY.title);
  const [editingKeyText, setEditingKeyText] = useState(PEARSON_EDEXCEL_EXAM_1_KEY.text);
  const [modelKeyFileBase64, setModelKeyFileBase64] = useState<string | null>(null);
  const [isUploadingKeyPdf, setIsUploadingKeyPdf] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('edexcel_exam1');
  const keyFileInputRef = useRef<HTMLInputElement>(null);

  // Shared upload / scratchpad state (Student homework upload OR Teacher direct check upload)
  const [assignment, setAssignment] = useState(
    courseTitle ? `${courseTitle} — Homework Assignment` : 'IGCSE Mathematics Homework'
  );
  const [studentName, setStudentName] = useState(defaultStudentName);
  const [inputMode, setInputMode] = useState<'upload' | 'type' | 'canvas'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string | null>(null);
  const [pageImages, setPageImages] = useState<RenderedPageImage[]>([]);
  const [isRenderingPages, setIsRenderingPages] = useState(false);
  const [pdfPageInfo, setPdfPageInfo] = useState<{ total: number; rendered: number; a3Spreads?: number } | null>(null);
  const [contrastBoost, setContrastBoost] = useState(false);
  const [a3SplitMode, setA3SplitMode] = useState<'auto' | 'off'>('auto');
  const [customTextWorking, setCustomTextWorking] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submissions & Reports state
  const [submissions, setSubmissions] = useState<StoredSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [selectedSubmissionDetail, setSelectedSubmissionDetail] = useState<StoredSubmission | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isSubmittingHomework, setIsSubmittingHomework] = useState(false);

  // Student preview toggle for pending submissions
  const [showStudentUploadedPages, setShowStudentUploadedPages] = useState(false);

  // Educator Inbox editing / marking state
  const [inboxFilter, setInboxFilter] = useState<'all' | 'pending' | 'graded'>('all');
  const [precisionMode, setPrecisionMode] = useState<'deep' | 'max'>('deep');
  const [gradingSystem, setGradingSystem] = useState<GradingSystem>('edexcel');
  const [publishParentEmail, setPublishParentEmail] = useState('');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isPublishingReport, setIsPublishingReport] = useState(false);
  const [editableReport, setEditableReport] = useState<HomeworkGradingReport | null>(null);
  const [teacherNoteInput, setTeacherNoteInput] = useState('');

  // Educator Direct Quick Check state
  const [directReport, setDirectReport] = useState<HomeworkGradingReport | null>(null);
  const [isDirectGrading, setIsDirectGrading] = useState(false);

  // Report display helpers
  const [viewStyle, setViewStyle] = useState<'table' | 'cards'>(isParent ? 'cards' : 'table');
  const [showParentPreview, setShowParentPreview] = useState(false);
  const [questionFilter, setQuestionFilter] = useState<'all' | 'incorrect' | 'correct'>('all');
  const [collapsedQuestions, setCollapsedQuestions] = useState<Record<number, boolean>>({});
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', text: string, duration = 5000) => {
    setNotice({ type, text });
    if (duration > 0) {
      setTimeout(() => setNotice(null), duration);
    }
  };

  // Load Educator-only active model key ONLY when signed in as teacher
  useEffect(() => {
    if (!isTeacher) return;
    fetch(apiUrl('/api/model-key/active'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data.modelKey) {
          setActiveModelKey(data.modelKey);
          setEditingKeyTitle(data.modelKey.title);
          setEditingKeyText(data.modelKey.text);
        }
      })
      .catch(() => {});
  }, [isTeacher]);

  const loadAssignments = useCallback(async () => {
    try {
      const url = isTeacher
        ? apiUrl('/api/assignments')
        : apiUrl(`/api/assignments?courseId=${encodeURIComponent(courseId)}`);
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const list: HomeworkAssignmentRecord[] = Array.isArray(data?.assignments) ? data.assignments : [];
        setGroupAssignments((prev) => {
          const prevSig = prev.map((a) => `${a.id}:${a.title}:${a.dueDate}`).join('|');
          const nextSig = list.map((a) => `${a.id}:${a.title}:${a.dueDate}`).join('|');
          return prevSig === nextSig ? prev : list;
        });
        if (!isTeacher && list.length > 0 && !selectedAssignmentId) {
          setSelectedAssignmentId(list[0].id);
          setAssignment(list[0].title);
        }
      }
    } catch {
      // ignore transient errors
    }
  }, [isTeacher, courseId, selectedAssignmentId]);

  const loadPortalNotifications = useCallback(async () => {
    try {
      const roleParam = encodeURIComponent(userRole || 'student');
      const courseParam = !isTeacher && courseId ? `&courseId=${encodeURIComponent(courseId)}` : '';
      const studentParam = !isTeacher && studentId ? `&studentId=${studentId}` : '';
      const res = await fetch(apiUrl(`/api/notifications?role=${roleParam}${courseParam}${studentParam}`));
      if (res.ok) {
        const data = await res.json();
        const items: PortalNotification[] = Array.isArray(data?.notifications) ? data.notifications : [];
        setPortalNotifications((prev) => {
          const prevSig = prev.map((n) => `${n.id}:${n.readByUserIds.join(',')}`).join('|');
          const nextSig = items.map((n) => `${n.id}:${n.readByUserIds.join(',')}`).join('|');
          return prevSig === nextSig ? prev : items;
        });
      }
    } catch {
      // ignore transient errors
    }
  }, [isTeacher, userRole, courseId, studentId]);

  useEffect(() => {
    loadAssignments();
    loadPortalNotifications();
  }, [loadAssignments, loadPortalNotifications]);

  const handleMarkPortalNotificationRead = async (notifId: string) => {
    setPortalNotifications((prev) =>
      prev.map((n) =>
        n.id === notifId && !n.readByUserIds.includes(effectiveViewerUserId)
          ? { ...n, readByUserIds: [...n.readByUserIds, effectiveViewerUserId] }
          : n
      )
    );
    await fetch(apiUrl(`/api/notifications/${notifId}/read`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: effectiveViewerUserId }),
    }).catch(() => {});
    onNotificationsUpdated?.();
  };

  const handleMarkAllPortalNotificationsRead = async () => {
    const unread = portalNotifications.filter((n) => !n.readByUserIds.includes(effectiveViewerUserId));
    if (unread.length === 0) return;
    setPortalNotifications((prev) =>
      prev.map((n) =>
        !n.readByUserIds.includes(effectiveViewerUserId)
          ? { ...n, readByUserIds: [...n.readByUserIds, effectiveViewerUserId] }
          : n
      )
    );
    await Promise.all(
      unread.map((n) =>
        fetch(apiUrl(`/api/notifications/${n.id}/read`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: effectiveViewerUserId }),
        }).catch(() => {})
      )
    );
    onNotificationsUpdated?.();
  };

  const handleSelectHomeworkFromNotification = async (notif: PortalNotification) => {
    const strippedTitle = notif.title.replace(/^New Homework:\s*/i, '').trim().toLowerCase();
    const matched =
      groupAssignments.find((a) => a.title.trim().toLowerCase() === strippedTitle) ||
      groupAssignments.find((a) => notif.dueDate && a.dueDate === notif.dueDate) ||
      groupAssignments[0];
    if (matched) {
      setSelectedAssignmentId(matched.id);
      setAssignment(matched.title);
      showToast('info', `Selected homework "${matched.title}" for submission.`);
    }
    await handleMarkPortalNotificationRead(notif.id);
  };

  const handleCreateGroupAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTitle.trim() || !assignGroupId) return;
    const courseObj = COURSES.find((c) => c.id === assignGroupId);
    setIsSavingAssignment(true);
    try {
      const res = await fetch(apiUrl('/api/assignments'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: assignGroupId,
          courseTitle: courseObj?.name || assignGroupId,
          title: assignTitle.trim(),
          instructions: assignInstructions.trim(),
          dueDate: assignDueDate,
          gradingSystem: assignGradingSystem,
          sendNotification: assignSendNotifications,
          notifyEmails: assignNotifyEmails.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Could not assign homework.');
      }
      const sentLive = (data?.emailDeliveries || []).filter((d: any) => d.status === 'sent').length;
      const loggedCount = (data?.emailDeliveries || []).length;
      showToast(
        'success',
        `Homework "${data.assignment.title}" assigned to ${data.assignment.courseTitle}!${
          assignSendNotifications
            ? ` Website alert posted + ${sentLive > 0 ? `${sentLive} email(s) sent via Resend` : `${loggedCount} notification(s) logged in Outbox`}.`
            : ''
        }`
      );
      setAssignTitle('');
      setAssignDueDate('');
      setAssignInstructions('');
      setAssignNotifyEmails('');
      await loadAssignments();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to save assignment.');
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleDeleteGroupAssignment = async (id: string) => {
    const res = await fetch(apiUrl(`/api/assignments/${id}`), { method: 'DELETE' });
    if (res.ok) {
      await loadAssignments();
      showToast('info', 'Assigned homework removed.');
    }
  };

  // Load submissions list (teacher sees full inbox; student sees only their own submissions)
  const loadSubmissions = useCallback(
    async (selectIdAfter?: string, silent = false) => {
      if (!silent) setLoadingSubmissions(true);
      try {
        const url = isTeacher
          ? apiUrl('/api/submissions?role=teacher')
          : isParent
          ? apiUrl(`/api/submissions?role=parent&studentId=${studentId}`)
          : apiUrl(`/api/submissions?role=student&studentId=${studentId}&courseId=${encodeURIComponent(courseId)}`);
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const list: StoredSubmission[] = Array.isArray(data?.submissions) ? data.submissions : [];
          setSubmissions((prev) => {
            if (
              silent &&
              prev.length === list.length &&
              prev.every(
                (p, i) =>
                  p.id === list[i].id &&
                  p.status === list[i].status &&
                  p.draftStatus === list[i].draftStatus &&
                  Boolean(p.draftReport) === Boolean(list[i].draftReport)
              )
            ) {
              return prev;
            }
            return list;
          });
          if (selectIdAfter) {
            setSelectedSubmissionId(selectIdAfter);
          } else if (list.length > 0 && !selectedSubmissionId) {
            setSelectedSubmissionId(list[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load submissions:', err);
      } finally {
        if (!silent) setLoadingSubmissions(false);
      }
    },
    [isTeacher, isParent, studentId, courseId, selectedSubmissionId]
  );

  useEffect(() => {
    loadSubmissions();
  }, [isTeacher, isParent, studentId, courseId]);

  useEffect(() => {
    if (!isTeacher || !focusSubmissionId) return;
    setTeacherMode('inbox');
    setSelectedSubmissionId(focusSubmissionId);
    loadSubmissions(focusSubmissionId, true);
    onClearFocusSubmission?.();
  }, [isTeacher, focusSubmissionId, loadSubmissions, onClearFocusSubmission]);

  // Silent background refresh for notifications, assignments, and teacher inbox submissions
  useEffect(() => {
    const timer = setInterval(() => {
      loadPortalNotifications();
      if (isTeacher) {
        loadSubmissions(undefined, true);
      } else {
        loadAssignments();
      }
    }, 6000);
    return () => clearInterval(timer);
  }, [isTeacher, loadAssignments, loadPortalNotifications, loadSubmissions]);

  const handleOpenSubmissionFromNotification = async (notif: PortalNotification) => {
    if (notif.submissionId) {
      setTeacherMode('inbox');
      setInboxCourseFilter('all');
      setInboxFilter('all');
      await loadSubmissions(notif.submissionId, true);
      setSelectedSubmissionId(notif.submissionId);
    }
    await handleMarkPortalNotificationRead(notif.id);
  };

  // Load full details (including pageImages) when a submission is selected
  const loadSubmissionDetail = useCallback(
    async (subId: string | null, silent = false) => {
      if (!subId) {
        setSelectedSubmissionDetail(null);
        setEditableReport(null);
        setTeacherNoteInput('');
        return;
      }
      if (!silent) {
        setLoadingDetail(true);
        setShowStudentUploadedPages(false);
      }
      try {
        const roleParam = isTeacher ? 'teacher' : isParent ? 'parent' : 'student';
        const res = await fetch(apiUrl(`/api/submissions/${subId}?role=${roleParam}`));
        if (res.ok) {
          const data = await res.json();
          const sub: StoredSubmission | null = data?.submission || null;
          setSelectedSubmissionDetail((prev) => {
            if (
              silent &&
              prev &&
              sub &&
              prev.id === sub.id &&
              prev.status === sub.status &&
              prev.draftStatus === sub.draftStatus &&
              prev.draftError === sub.draftError &&
              Boolean(prev.draftReport) === Boolean(sub.draftReport) &&
              Boolean(prev.publishedReport) === Boolean(sub.publishedReport)
            ) {
              return prev;
            }
            return sub;
          });
          if (isTeacher && sub) {
            const seedReport = sub.publishedReport || sub.draftReport || null;
            if (!silent || seedReport) {
              setEditableReport((prev) =>
                silent && prev && prev.questions?.length ? prev : seedReport ? recalculateReportTotals(seedReport) : null
              );
            }
            if (!silent) {
              setTeacherNoteInput(sub.teacherNote || '');
              setGradingSystem((seedReport?.gradingSystem as GradingSystem) || (sub as any)?.gradingSystem || 'edexcel');
            }
          }
        }
      } catch (err) {
        console.error('Failed to load submission detail:', err);
      } finally {
        if (!silent) setLoadingDetail(false);
      }
    },
    [isTeacher, isParent]
  );

  useEffect(() => {
    loadSubmissionDetail(selectedSubmissionId, false);
  }, [selectedSubmissionId, loadSubmissionDetail]);

  // Silent background poll while auto-correction draft is running (never unmounts UI or flashes thumbnails)
  const hasGeneratingDraft =
    isTeacher &&
    (selectedSubmissionDetail?.draftStatus === 'queued' ||
      selectedSubmissionDetail?.draftStatus === 'generating' ||
      submissions.some((s) => s.status === 'pending' && (s.draftStatus === 'queued' || s.draftStatus === 'generating')));

  useEffect(() => {
    if (!hasGeneratingDraft) return;
    const timer = setInterval(() => {
      loadSubmissions(undefined, true);
      if (selectedSubmissionId) {
        loadSubmissionDetail(selectedSubmissionId, true);
      }
    }, 3500);
    return () => clearInterval(timer);
  }, [hasGeneratingDraft, selectedSubmissionId, loadSubmissionDetail, loadSubmissions]);

  // Process uploaded PDF/Image into clean JPEG pages
  const processUploadedFile = async (file: File, enhanceContrast: boolean) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');

    setIsRenderingPages(true);
    setPageImages([]);
    setPdfPageInfo(null);

    try {
      if (isPdf) {
        const rendered = await renderPdfPagesToImages(file, {
          maxPages: 12,
          quality: 0.9,
          contrastBoost: enhanceContrast,
          a3SplitMode,
        });
        setPageImages(rendered.pageImages);
        setPdfPageInfo({
          total: rendered.totalPages,
          rendered: rendered.pageImages.length,
          a3Spreads: rendered.a3SpreadCount || 0,
        });
        setFileBase64(null);
      } else if (isImage) {
        const page = await loadImageForGrading(file, {
          maxDimension: 1850,
          contrastBoost: enhanceContrast,
          quality: 0.9,
        });
        setPageImages([page]);
        setPdfPageInfo({ total: 1, rendered: 1 });
        setFileBase64(null);
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => setFileBase64((ev.target?.result as string) || null);
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.error('File processing failed:', err);
      showToast('error', `Could not read pages from "${file.name}". Try a clearer PDF or image.`);
    } finally {
      setIsRenderingPages(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setFileMimeType(file.type || 'application/pdf');
    await processUploadedFile(file, contrastBoost);
  };

  const handleToggleContrastBoost = async () => {
    const next = !contrastBoost;
    setContrastBoost(next);
    if (selectedFile) {
      await processUploadedFile(selectedFile, next);
    }
  };

  const handleRotatePage = async (pageIndex: number) => {
    const target = pageImages[pageIndex];
    if (!target) return;
    try {
      const rotated = await rotateImageDataUrl(target.dataUrl, 90);
      setPageImages((prev) =>
        prev.map((p, idx) =>
          idx === pageIndex ? { ...p, dataUrl: rotated.dataUrl, width: rotated.width, height: rotated.height } : p
        )
      );
    } catch (err) {
      console.error('Failed to rotate page:', err);
    }
  };

  const handleClearUpload = () => {
    setSelectedFile(null);
    setFileBase64(null);
    setFileMimeType(null);
    setPageImages([]);
    setPdfPageInfo(null);
    setContrastBoost(false);
    setCustomTextWorking('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Student submits homework -> stored cleanly as 'pending' (no automated grading shown to student)
  const handleStudentSubmitHomework = async () => {
    if (pageImages.length === 0 && !fileBase64 && !customTextWorking.trim()) {
      showToast('error', 'Please upload a PDF/photo or write your working before submitting.');
      return;
    }

    setIsSubmittingHomework(true);
    try {
      const selectedHw = groupAssignments.find((a) => a.id === selectedAssignmentId) || null;
      const res = await fetch(apiUrl('/api/submissions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          studentUsername,
          studentName: studentName.trim() || defaultStudentName || 'Student',
          courseId,
          courseTitle: courseTitle || 'IGCSE Mathematics',
          assignmentId: selectedHw?.id || null,
          dueDate: selectedHw?.dueDate || null,
          gradingSystem: selectedHw?.gradingSystem || 'edexcel',
          assignment: assignment.trim() || selectedHw?.title || 'Homework Submission',
          submissionText: customTextWorking.trim(),
          fileName: selectedFile?.name || (customTextWorking.trim() ? 'Typed_Working.txt' : null),
          fileBase64: pageImages.length > 0 ? null : fileBase64,
          fileMimeType: fileMimeType || null,
          a3SpreadCount: pdfPageInfo?.a3Spreads || 0,
          pageImages: pageImages.map((p) => ({
            pageNumber: p.pageNumber,
            sourcePageNumber: p.sourcePageNumber,
            tilePosition: p.tilePosition,
            pageFormat: p.pageFormat,
            dataUrl: p.dataUrl,
            mimeType: p.mimeType,
          })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success || !data.submission) {
        throw new Error(data?.error || `Server error (${res.status})`);
      }

      handleClearUpload();
      showToast(
        'success',
        'Your homework has been sent to Mr. Haitham Hussien! Check back under Reports once it is corrected.'
      );
      await loadSubmissions(data.submission.id);
    } catch (err: any) {
      showToast('error', err?.message || 'Could not submit homework. Please try again.');
    } finally {
      setIsSubmittingHomework(false);
    }
  };

  // Educator Model Key handlers
  const handleSaveModelKey = async (title: string, text: string) => {
    if (!text.trim()) return;
    try {
      const res = await fetch(apiUrl('/api/model-key/active'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, text }),
      });
      const data = await res.json();
      if (data.success && data.modelKey) {
        setActiveModelKey(data.modelKey);
        setIsModelKeyModalOpen(false);
        showToast('success', `Active Answer Key set to "${data.modelKey.title}".`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetModelKey = async () => {
    try {
      const res = await fetch(apiUrl('/api/model-key/reset'), { method: 'POST' });
      const data = await res.json();
      if (data.success && data.modelKey) {
        setActiveModelKey(data.modelKey);
        setEditingKeyTitle(data.modelKey.title);
        setEditingKeyText(data.modelKey.text);
        setSelectedTemplate('edexcel_exam1');
        setIsModelKeyModalOpen(false);
        showToast('info', 'Reset to default Model Answer Key.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadKeyFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const cleanTitle = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      setIsUploadingKeyPdf(true);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        setModelKeyFileBase64(base64);
        try {
          const res = await fetch(apiUrl('/api/model-key/upload-pdf'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileBase64: base64, fileName: file.name, title: cleanTitle }),
          });
          const data = await res.json();
          if (data.success && data.modelKey) {
            setActiveModelKey(data.modelKey);
            setModelKeyFileBase64(null);
            setEditingKeyTitle(data.modelKey.title);
            setEditingKeyText(data.modelKey.text);
            setIsModelKeyModalOpen(false);
            showToast(
              'success',
              `Model Answer Key "${data.modelKey.title}" loaded (${data.modelKey.questionCount} questions, ${data.modelKey.totalMarks} marks).`
            );
          } else {
            showToast('error', data.error || 'Could not parse Answer Key PDF.');
          }
        } catch {
          showToast('error', 'Failed to upload Answer Key PDF.');
        } finally {
          setIsUploadingKeyPdf(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        if (content) {
          setEditingKeyTitle(cleanTitle || 'Imported Model Key');
          setEditingKeyText(content);
          setSelectedTemplate('custom');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleCreateManualDraft = async () => {
    if (!selectedSubmissionDetail) return;
    setIsGeneratingDraft(true);
    try {
      const res = await fetch(apiUrl(`/api/submissions/${selectedSubmissionDetail.id}/manual-draft`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradingSystem }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success || !data.report) {
        throw new Error(data?.error || 'Could not create manual correction sheet.');
      }
      setEditableReport(recalculateReportTotals(data.report, gradingSystem));
      showToast('info', 'Manual correction sheet ready! Fill in marks & notes and click Approve & Send.');
      await loadSubmissions(selectedSubmissionDetail.id);
      await loadSubmissionDetail(selectedSubmissionDetail.id);
    } catch (err: any) {
      showToast('error', err?.message || 'Could not create manual sheet.');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  // Educator Inbox: Generate Marking Draft behind the scenes
  const handleGenerateSubmissionDraft = async () => {
    if (!selectedSubmissionDetail) return;
    setIsGeneratingDraft(true);
    try {
      const res = await fetch(apiUrl(`/api/submissions/${selectedSubmissionDetail.id}/draft-grade`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelAnswerKey: activeModelKey.text,
          modelAnswerTitle: activeModelKey.title,
          modelKeyFileBase64: activeModelKey.text?.trim() ? null : modelKeyFileBase64,
          precisionMode,
          gradingSystem,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success || !data.report) {
        throw new Error(data?.error || `Server returned ${res.status}`);
      }
      setEditableReport(recalculateReportTotals(data.report, gradingSystem));
      showToast('success', 'Correction draft prepared! Review or adjust marks below before sending to the student.');
      await loadSubmissions(selectedSubmissionDetail.id, true);
      await loadSubmissionDetail(selectedSubmissionDetail.id, true);
    } catch (err: any) {
      showToast('error', err?.message || 'Could not generate correction draft.');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleUpdateEditableQuestion = (index: number, patch: Partial<QuestionGrading>) => {
    setEditableReport((prev) => {
      if (!prev) return prev;
      const updated = prev.questions.map((q, idx) => (idx === index ? { ...q, ...patch } : q));
      return recalculateReportTotals({ ...prev, questions: updated }, gradingSystem);
    });
  };

  const handleAddEditableQuestion = () => {
    setEditableReport((prev) => {
      if (!prev) return prev;
      const nextNum = prev.questions.length + 1;
      const added: QuestionGrading = {
        questionNumber: nextNum,
        displayLabel: `Q${nextNum}`,
        paperRef: prev.assignmentTitle || 'Homework',
        prompt: `Question ${nextNum}`,
        maxMarks: 2,
        earnedMarks: 0,
        markSchemeRef: '',
        studentWorkingFound: '',
        phase1Extraction: '',
        errorAnalysis: '',
        phase2ErrorAnalysis: '',
        modelSolution: '',
        phase3Solution: '',
        status: 'incorrect',
        statusLabel: 'INCORRECT',
        teacherFeedback: '',
      };
      return recalculateReportTotals({ ...prev, questions: [...prev.questions, added] }, gradingSystem);
    });
  };

  const handleRemoveEditableQuestion = (index: number) => {
    setEditableReport((prev) => {
      if (!prev || prev.questions.length <= 1) return prev;
      const filtered = prev.questions
        .filter((_, idx) => idx !== index)
        .map((q, idx) => ({ ...q, questionNumber: idx + 1 }));
      return recalculateReportTotals({ ...prev, questions: filtered }, gradingSystem);
    });
  };

  // Educator Inbox: Publish finalized report to student
  const handlePublishToStudent = async () => {
    if (!selectedSubmissionDetail || !editableReport) return;
    setIsPublishingReport(true);
    try {
      const finalized = recalculateReportTotals(editableReport, gradingSystem);
      const res = await fetch(apiUrl(`/api/submissions/${selectedSubmissionDetail.id}/publish`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report: finalized,
          teacherNote: teacherNoteInput.trim(),
          gradingSystem,
          parentEmail: publishParentEmail.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Could not publish report.');
      }
      const mailNote =
        data?.emailDelivery?.status === 'sent'
          ? `Parent email delivered via Resend to ${data.emailDelivery.to}.`
          : data?.emailDelivery?.to
          ? `Report published & parent email logged for ${data.emailDelivery.to}.`
          : '';
      showToast('success', `Report approved for ${selectedSubmissionDetail.studentName}! ${mailNote}`);
      setPublishParentEmail('');
      await loadSubmissions(selectedSubmissionDetail.id);
      await loadSubmissionDetail(selectedSubmissionDetail.id);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to publish report.');
    } finally {
      setIsPublishingReport(false);
    }
  };

  const handleDeleteSubmission = async (id: string) => {
    try {
      const res = await fetch(apiUrl(`/api/submissions/${id}`), { method: 'DELETE' });
      if (res.ok) {
        if (selectedSubmissionId === id) {
          setSelectedSubmissionId(null);
          setSelectedSubmissionDetail(null);
          setEditableReport(null);
        }
        await loadSubmissions();
        showToast('info', 'Submission removed.');
      }
    } catch {
      showToast('error', 'Failed to delete submission.');
    }
  };

  // Educator Direct Quick Check
  const handleDirectCheck = async () => {
    if (pageImages.length === 0 && !fileBase64 && !customTextWorking.trim()) {
      showToast('error', 'Upload a worksheet or enter working to evaluate.');
      return;
    }
    setIsDirectGrading(true);
    try {
      const res = await fetch(apiUrl('/api/homework/grade'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: studentName.trim() || 'Student Sheet',
          assignment: activeModelKey.title,
          submissionText: customTextWorking.trim(),
          modelAnswerKey: activeModelKey.text,
          modelAnswerTitle: activeModelKey.title,
          modelKeyFileBase64: activeModelKey.text?.trim() ? null : modelKeyFileBase64,
          fileName: selectedFile?.name || 'direct_sheet.pdf',
          fileBase64: pageImages.length > 0 ? null : fileBase64,
          fileMimeType: fileMimeType || null,
          pageImages: pageImages.map((p) => ({
            pageNumber: p.pageNumber,
            dataUrl: p.dataUrl,
            mimeType: p.mimeType,
          })),
          precisionMode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.report) {
        let reason = data?.error || `server returned ${res.status}`;
        if ((res.status === 404 || res.status === 405) && !getApiBaseUrl()) {
          reason = 'no grading backend URL is configured.';
        }
        throw new Error(reason);
      }
      setDirectReport(recalculateReportTotals(data.report));
    } catch (err: any) {
      showToast('error', err?.message || 'Could not evaluate worksheet.');
    } finally {
      setIsDirectGrading(false);
    }
  };

  // Reusable Report View (strictly hides Model Answer / Mark Scheme Ref when !isTeacher)
  const renderReportCard = (report: HomeworkGradingReport, teacherNote?: string) => {
    const filteredQuestions = report.questions.filter((q) => {
      if (questionFilter === 'incorrect') return q.status !== 'correct';
      if (questionFilter === 'correct') return q.status === 'correct';
      return true;
    });

    return (
      <div className="bg-white border border-[#f0d0d6] rounded-2xl shadow-sm overflow-hidden space-y-5 pb-4">
        {/* Report Header */}
        <div className="bg-gradient-to-r from-[#6b1226] via-[#800020] to-[#590e1f] text-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/15 border border-white/25 font-semibold">
                  Corrected by Mr. Haitham Hussien ✓
                </span>
                <span className="text-[11px] text-rose-100">{report.submissionDate}</span>
              </div>
              <h2 className="text-xl font-bold mt-2 font-serif">
                {report.assignmentTitle || report.topic || 'Homework Evaluation Report'}
              </h2>
              <p className="text-xs text-rose-100 mt-0.5">
                Student: <strong>{report.studentName}</strong> &middot; {courseTitle || report.subject || 'IGCSE Mathematics'}
              </p>
            </div>

            <div className="bg-white text-slate-900 rounded-xl px-4 py-2.5 shadow-md min-w-[200px] grid grid-cols-2 gap-3 divide-x divide-slate-200">
              <div className="text-center pr-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mark</div>
                <div className="text-2xl font-black text-[#800020] leading-tight">
                  {report.earnedMarks}{' '}
                  <span className="text-xs font-semibold text-slate-400">/ {report.totalMarks}</span>
                </div>
                <div className="text-[11px] font-bold text-slate-600">{report.percentage}%</div>
              </div>
              <div className="text-center pl-3 flex flex-col justify-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Grading System · {(report.gradingSystem || 'edexcel').toUpperCase()}
                </div>
                <div className="text-sm font-black text-slate-900 mt-0.5 leading-snug">{report.grade}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-white/20">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setViewStyle('cards')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  viewStyle === 'cards' ? 'bg-white text-[#800020]' : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                <ListIcon className="w-3.5 h-3.5" /> Report Cards
              </button>
              <button
                type="button"
                onClick={() => setViewStyle('table')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  viewStyle === 'table' ? 'bg-white text-[#800020]' : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" /> Table
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadReportCsv(report)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button
                type="button"
                onClick={() => printStandaloneParentReport(report, teacherNote, courseTitle)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition"
              >
                <Printer className="w-3.5 h-3.5" /> Clean PDF Report
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-600 font-medium">
            Showing {filteredQuestions.length} of {report.questions.length} question(s)
          </p>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            {(['all', 'incorrect', 'correct'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setQuestionFilter(f)}
                className={`px-2.5 py-1 rounded-md font-semibold capitalize transition ${
                  questionFilter === f ? 'bg-white text-[#800020] shadow-2xs' : 'text-slate-600'
                }`}
              >
                {f === 'all' ? 'All' : f === 'incorrect' ? 'Needs Review' : 'Full Marks'}
              </button>
            ))}
          </div>
        </div>

        {/* IB Criterion Breakdown when gradingSystem === 'ib' */}
        {Array.isArray(report.criterionBreakdown) && report.criterionBreakdown.length > 0 && (
          <div className="px-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {report.criterionBreakdown.map((c) => (
              <div key={c.label} className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-2.5 text-xs">
                <p className="text-[10px] font-bold text-indigo-800 uppercase">{c.label}</p>
                <p className="text-sm font-black text-indigo-950 mt-0.5">{c.score}</p>
              </div>
            ))}
          </div>
        )}

        {/* Question Table / Cards (3-Phase Pipeline: Phase 1 Extracted, Phase 2 Error, Phase 3 Correct Solution) */}
        <div className="px-5">
          {viewStyle === 'table' ? (
            <div className="overflow-x-auto border border-[#f5e1e5] rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#fdf2f4] text-[#701a2d] uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">Q</th>
                    <th className="p-3">Phase 1 · What Was Written</th>
                    <th className="p-3">Phase 2 · Error &amp; Feedback</th>
                    <th className="p-3">Phase 3 · Correct Solution</th>
                    <th className="p-3 text-right">Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5e1e5]">
                  {filteredQuestions.map((q) => {
                    const p1 = q.phase1Extraction || q.studentWorkingFound || '—';
                    const p2 = q.phase2ErrorAnalysis || q.teacherFeedback || q.errorAnalysis || '—';
                    const p3 = q.phase3Solution || q.modelSolution || '—';
                    return (
                      <tr key={q.questionNumber} className="hover:bg-[#fffafb] align-top">
                        <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                          {q.displayLabel || `Q${q.questionNumber}`}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-700 max-w-[180px] whitespace-pre-wrap">
                          {p1}
                        </td>
                        <td className="p-3 text-slate-700 leading-relaxed max-w-[220px] whitespace-pre-wrap">
                          {p2}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-emerald-900 bg-emerald-50/30 max-w-[200px] whitespace-pre-wrap">
                          {p3}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              q.status === 'correct'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : q.earnedMarks > 0
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {q.earnedMarks}/{q.maxMarks}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((q) => {
                const isOpen = !collapsedQuestions[q.questionNumber];
                const p1 = q.phase1Extraction || q.studentWorkingFound || '—';
                const p2 = q.phase2ErrorAnalysis || q.errorAnalysis || q.teacherFeedback || '—';
                const p3 = q.phase3Solution || q.modelSolution || '—';
                return (
                  <div key={q.questionNumber} className="border border-[#f5e1e5] rounded-xl overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedQuestions((prev) => ({
                          ...prev,
                          [q.questionNumber]: !prev[q.questionNumber],
                        }))
                      }
                      className="w-full flex items-center justify-between p-3.5 bg-[#fffcfd] hover:bg-[#fff5f7] text-left transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-xs text-slate-900">
                          {q.displayLabel || `Q${q.questionNumber}`}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            q.status === 'correct'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : q.earnedMarks > 0
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {q.earnedMarks}/{q.maxMarks} marks &middot; {q.statusLabel || q.status.toUpperCase()}
                        </span>
                      </div>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    {isOpen && (
                      <div className="p-3.5 border-t border-[#f5e1e5] space-y-2.5 text-xs bg-white">
                        <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-lg">
                          <span className="text-[10px] font-bold uppercase text-slate-600 block">
                            1. What Was Written:
                          </span>
                          <p className="font-mono text-slate-800 mt-1 whitespace-pre-wrap">{p1}</p>
                        </div>
                        <div className="bg-[#fff1f2] border border-[#fecdd3] p-2.5 rounded-lg text-[#701a2d]">
                          <span className="text-[10px] font-bold uppercase block">
                            2. Exact Mistake Identified &amp; Why It Is Wrong:
                          </span>
                          <p className="mt-1 whitespace-pre-wrap">{p2}</p>
                          {q.teacherFeedback && q.teacherFeedback !== p2 && (
                            <p className="mt-1 italic">{q.teacherFeedback}</p>
                          )}
                        </div>
                        <div className="bg-emerald-50/70 border border-emerald-200 p-2.5 rounded-lg text-emerald-950">
                          <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                            3. Correct Working &amp; Solution:
                          </span>
                          <p className="font-mono mt-1 whitespace-pre-wrap">{p3}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary & Feedback */}
        <div className="px-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#fffcfd] border border-[#f5e1e5] rounded-xl p-4 space-y-1.5">
            <h3 className="font-bold text-[#701a2d] text-xs uppercase tracking-wider">Overall Feedback</h3>
            <p className="text-xs text-slate-700 leading-relaxed">{report.generalFeedback}</p>
          </div>
          <div className="bg-[#fffcfd] border border-[#f5e1e5] rounded-xl p-4 space-y-1.5">
            <h3 className="font-bold text-[#701a2d] text-xs uppercase tracking-wider">Detailed Review</h3>
            <p className="text-xs text-slate-700 leading-relaxed">{report.diagnosticReview}</p>
          </div>
        </div>

        {/* Mr. Haitham Personal Note */}
        <div className="px-5">
          <div className="bg-gradient-to-br from-[#fffdfa] via-[#fffbf2] to-[#fffdfa] border border-[#eedac5] rounded-xl p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#701a2d]">
              <span>✍️ Mr. Haitham&apos;s Note to {report.studentName}</span>
              <span className="text-[10px] text-[#800020] font-normal">IGCSE Mathematics</span>
            </div>
            <p className="text-sm text-[#701a2d] italic leading-relaxed">
              &ldquo;
              {teacherNote?.trim()
                ? teacherNote
                : `Well done submitting your work, ${report.studentName}. Review any partial or missed questions above carefully — showing clear intermediate steps helps secure every method mark.`}
              &rdquo;
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Filtered teacher inbox list (status + separate group filter)
  const filteredInboxSubmissions = submissions.filter((s) => {
    const statusOk = inboxFilter === 'all' ? true : s.status === inboxFilter;
    const courseOk = inboxCourseFilter === 'all' ? true : s.courseId === inboxCourseFilter;
    return statusOk && courseOk;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 text-slate-800">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#6b1226] via-[#800020] to-[#590e1f] text-white rounded-2xl p-6 shadow-xl relative overflow-hidden border border-[#9f1239]">
        <div className="absolute right-4 top-2 text-white/10 text-6xl md:text-8xl font-serif select-none pointer-events-none font-bold tracking-widest">
          ∑ ∫ π √x ±
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white/10 text-white border border-white/25 flex items-center justify-center shadow-lg backdrop-blur-sm">
              <span className="font-serif text-2xl font-bold">∫x</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/15 text-rose-100 font-semibold uppercase tracking-wider border border-white/20">
                  {courseTitle ? `${courseTitle}${courseCode ? ` (${courseCode})` : ''}` : 'IGCSE Mathematics'}
                </span>
                <span className="text-xs text-amber-200 font-medium">
                  &bull; Instructor: Mr. Haitham Hussien
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 math-serif tracking-tight">
                {isTeacher
                  ? 'Educator Homework Review & Marking Studio'
                  : `${courseTitle ? `${courseTitle} — ` : ''}Homework & Teacher Reports`}
              </h1>
              <p className="text-xs text-rose-100 mt-1 max-w-2xl">
                {isTeacher
                  ? 'Review student homework submissions, verify steps against your Model Answer Key, and send corrected reports.'
                  : 'Upload your completed homework for Mr. Haitham Hussien to mark, then open your corrected reports below.'}
              </p>
            </div>
          </div>

          {isTeacher && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setEditingKeyTitle(activeModelKey.title);
                  setEditingKeyText(activeModelKey.text);
                  setIsModelKeyModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-[#800020] hover:bg-rose-50 text-xs font-bold transition shadow-sm"
              >
                <FileCheck className="w-4 h-4" />
                <span>Model Answer Key ({activeModelKey.isCustom ? 'Custom' : 'Active'})</span>
              </button>

              {onSwitchToModelKey && (
                <button
                  type="button"
                  onClick={onSwitchToModelKey}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/30 transition"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                  <span>All Answer Keys</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {notice && (
        <div
          className={`px-4 py-3 rounded-xl text-xs flex items-center justify-between shadow-xs border ${
            notice.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : notice.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span className="font-medium">{notice.text}</span>
          </div>
          <button type="button" onClick={() => setNotice(null)} className="opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* STUDENT & PARENT PORTAL VIEW (Zero AI indicators, Approved Results)  */}
      {/* =================================================================== */}
      {!isTeacher && (
        <div className="space-y-5">
          {/* Student / Parent Inline Homework & Report Notifications */}
          {(() => {
            const unreadNotifications = portalNotifications.filter(
              (n) => !n.readByUserIds.includes(effectiveViewerUserId)
            );
            const displayedNotifications =
              showAllNotifications || unreadNotifications.length === 0
                ? portalNotifications.slice(0, 6)
                : unreadNotifications;

            if (portalNotifications.length === 0) return null;

            return (
              <div
                className={`rounded-2xl border p-4 shadow-xs transition ${
                  unreadNotifications.length > 0
                    ? 'bg-gradient-to-r from-[#fff5f7] via-white to-amber-50/50 border-[#e9b3be]'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                        unreadNotifications.length > 0
                          ? 'bg-[#800020] text-white border-[#800020]'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-bold text-[#701a2d]">
                          Homework &amp; Teacher Notifications
                        </h3>
                        {unreadNotifications.length > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#800020] text-white text-[10px] font-bold">
                            {unreadNotifications.length} New
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                            All read ({portalNotifications.length})
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {unreadNotifications.length > 0
                          ? 'Mr. Haitham posted new updates for your group.'
                          : 'All assigned homework alerts and report notifications are up to date.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {unreadNotifications.length > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllPortalNotificationsRead}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-[#e5c1c9] hover:bg-[#fff1f2] text-[11px] font-semibold text-[#800020] transition"
                      >
                        Mark All Read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowAllNotifications((v) => !v)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-600 transition"
                    >
                      {showAllNotifications || (unreadNotifications.length === 0 && showAllNotifications)
                        ? 'Hide'
                        : unreadNotifications.length === 0
                        ? `Show Recent (${portalNotifications.length})`
                        : `Show All (${portalNotifications.length})`}
                    </button>
                  </div>
                </div>

                {(unreadNotifications.length > 0 || showAllNotifications) && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {displayedNotifications.map((notif) => {
                      const isUnread = !notif.readByUserIds.includes(effectiveViewerUserId);
                      return (
                        <div
                          key={notif.id}
                          className={`rounded-xl border p-3 text-xs space-y-1.5 transition ${
                            isUnread
                              ? 'bg-white border-[#800020]/35 shadow-2xs'
                              : 'bg-slate-50/70 border-slate-200 opacity-85'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isUnread && (
                                <span className="px-1.5 py-0.5 rounded bg-[#800020] text-white text-[9px] font-extrabold uppercase tracking-wider">
                                  New
                                </span>
                              )}
                              <span className="font-bold text-slate-900">{notif.title}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(notif.createdAt).toLocaleString('en-GB')}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {notif.message}
                          </p>
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            {notif.dueDate ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                                Due: {new Date(notif.dueDate).toLocaleString('en-GB')}
                              </span>
                            ) : (
                              <span />
                            )}
                            <div className="flex items-center gap-2">
                              {notif.type === 'assignment' && !isParent && (
                                <button
                                  type="button"
                                  onClick={() => handleSelectHomeworkFromNotification(notif)}
                                  className="px-2.5 py-1 rounded-lg bg-[#800020] hover:bg-[#66001a] text-white text-[11px] font-bold transition"
                                >
                                  Select Homework &rarr;
                                </button>
                              )}
                              {isUnread && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkPortalNotificationRead(notif.id)}
                                  className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold text-slate-600 transition"
                                >
                                  Mark Read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Submit Homework (Students only; Parents see Approved Reports full width) */}
          {!isParent && (
            <div className="lg:col-span-5 bg-white border border-[#f0d0d6] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#f5e1e5] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#fff1f2] text-[#800020] flex items-center justify-center border border-[#fecdd3]">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#701a2d]">Submit Homework to Mr. Haitham</h2>
                  <p className="text-[11px] text-slate-500">Upload photos or PDF pages of your working</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearUpload}
                className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Clear
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Student Name</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#e5d0d4] text-xs outline-none focus:border-[#800020]"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Assigned Homework ({courseTitle || 'Your Group'})
                  </label>
                  <select
                    value={selectedAssignmentId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedAssignmentId(val);
                      const picked = groupAssignments.find((a) => a.id === val);
                      if (picked) {
                        setAssignment(picked.title);
                      } else if (val === '__custom__') {
                        setAssignment(courseTitle ? `${courseTitle} — Homework Assignment` : 'IGCSE Mathematics Homework');
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#e5d0d4] bg-white text-xs font-semibold outline-none focus:border-[#800020]"
                  >
                    {groupAssignments.length === 0 ? (
                      <option value="">General Homework Submission</option>
                    ) : (
                      <>
                        {groupAssignments.map((hw) => (
                          <option key={hw.id} value={hw.id}>
                            {hw.title}{hw.dueDate ? ` (Due ${new Date(hw.dueDate).toLocaleDateString('en-GB')})` : ''}
                          </option>
                        ))}
                        <option value="__custom__">Other / Custom Homework Title...</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {(() => {
                const activeHw = groupAssignments.find((a) => a.id === selectedAssignmentId);
                if (activeHw) {
                  return (
                    <div className="rounded-xl border border-rose-200 bg-[#fff5f7] p-3 text-xs space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-[#800020]">{activeHw.title}</span>
                        {activeHw.dueDate && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                            Due Date: {new Date(activeHw.dueDate).toLocaleString('en-GB')}
                          </span>
                        )}
                      </div>
                      {activeHw.instructions && (
                        <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                          <strong>Instructions:</strong> {activeHw.instructions}
                        </p>
                      )}
                    </div>
                  );
                }
                return (
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Homework / Sheet Title</label>
                    <input
                      type="text"
                      value={assignment}
                      onChange={(e) => setAssignment(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#e5d0d4] text-xs outline-none focus:border-[#800020]"
                      placeholder="e.g. Week 3 Algebra Sheet"
                    />
                  </div>
                );
              })()}
            </div>

            {/* Input Tabs */}
            <div className="grid grid-cols-3 bg-[#fdf5f7] p-1 rounded-xl border border-[#f5e1e5] gap-1">
              <button
                type="button"
                onClick={() => setInputMode('upload')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition ${
                  inputMode === 'upload' ? 'bg-[#800020] text-white shadow-xs' : 'text-slate-600 hover:bg-white'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" /> PDF / Photo
              </button>
              <button
                type="button"
                onClick={() => setInputMode('type')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition ${
                  inputMode === 'type' ? 'bg-[#800020] text-white shadow-xs' : 'text-slate-600 hover:bg-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" /> Type Answers
              </button>
              <button
                type="button"
                onClick={() => setInputMode('canvas')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition ${
                  inputMode === 'canvas' ? 'bg-[#800020] text-white shadow-xs' : 'text-slate-600 hover:bg-white'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" /> Scratchpad
              </button>
            </div>

            {inputMode === 'upload' && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="student-hw-file"
                />
                <label
                  htmlFor="student-hw-file"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-[#e5c1c9] hover:border-[#800020] rounded-xl p-5 cursor-pointer bg-[#fffcfd] hover:bg-[#fff5f7] transition text-center"
                >
                  {isRenderingPages ? (
                    <>
                      <Loader2 className="w-7 h-7 animate-spin text-[#800020] mb-2" />
                      <p className="text-xs font-semibold text-[#800020]">Preparing your pages...</p>
                    </>
                  ) : selectedFile ? (
                    <>
                      <FileText className="w-7 h-7 text-[#800020] mb-2" />
                      <p className="text-xs font-bold text-slate-900">{selectedFile.name}</p>
                      <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                        {pdfPageInfo
                          ? `${pdfPageInfo.rendered} page(s) attached and ready for Mr. Haitham`
                          : 'File attached and ready'}
                      </p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-7 h-7 text-[#800020] mb-2" />
                      <p className="text-xs font-bold text-slate-800">Click to select your Homework PDF or Photo</p>
                      <p className="text-[11px] text-slate-500 mt-1">PDF, JPG, or PNG accepted</p>
                    </>
                  )}
                </label>

                {pageImages.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className="font-semibold text-slate-600">
                        Preview ({pageImages.length} page(s){pdfPageInfo?.a3Spreads ? ` · ${pdfPageInfo.a3Spreads} A3 Spread Split` : ''}):
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={async () => {
                            const nextMode = a3SplitMode === 'auto' ? 'off' : 'auto';
                            setA3SplitMode(nextMode);
                            if (selectedFile && (selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf'))) {
                              const rendered = await renderPdfPagesToImages(selectedFile, {
                                maxPages: 12,
                                quality: 0.9,
                                contrastBoost,
                                a3SplitMode: nextMode,
                              });
                              setPageImages(rendered.pageImages);
                              setPdfPageInfo({
                                total: rendered.totalPages,
                                rendered: rendered.pageImages.length,
                                a3Spreads: rendered.a3SpreadCount || 0,
                              });
                            }
                          }}
                          className={`px-2 py-0.5 rounded border text-[10px] font-semibold transition ${
                            a3SplitMode === 'auto'
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-600 border-slate-300'
                          }`}
                        >
                          {a3SplitMode === 'auto' ? '✓ A3 Auto-Split' : 'A3 Split Off'}
                        </button>
                        <button
                          type="button"
                          onClick={handleToggleContrastBoost}
                          className={`px-2 py-0.5 rounded border text-[10px] font-semibold transition ${
                            contrastBoost
                              ? 'bg-[#800020] text-white border-[#800020]'
                              : 'bg-white text-slate-600 border-slate-300'
                          }`}
                        >
                          {contrastBoost ? '✓ Clear Contrast On' : 'Enhance Pencil'}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {pageImages.map((pg, idx) => (
                        <div key={pg.pageNumber} className="relative rounded-lg border border-slate-200 bg-slate-50 p-1 group">
                          <img
                            src={pg.dataUrl}
                            alt={`Page ${pg.pageNumber}`}
                            onClick={() => setLightboxImage(pg.dataUrl)}
                            className="w-full h-24 object-cover rounded cursor-zoom-in"
                          />
                          <div className="flex items-center justify-between mt-1 px-1">
                            <span className="text-[10px] font-bold text-slate-600">
                              P{pg.pageNumber}
                              {pg.tilePosition && pg.tilePosition !== 'full' ? ` (${pg.tilePosition === 'left' ? 'A3-L' : 'A3-R'})` : ''}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRotatePage(idx)}
                              title="Rotate 90°"
                              className="p-0.5 text-slate-500 hover:text-[#800020]"
                            >
                              <RotateCw className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {inputMode === 'type' && (
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Write your answers or notes for Mr. Haitham
                </label>
                <textarea
                  value={customTextWorking}
                  onChange={(e) => setCustomTextWorking(e.target.value)}
                  rows={6}
                  className="w-full p-3 rounded-xl border border-[#e5d0d4] text-xs font-mono outline-none focus:border-[#800020]"
                  placeholder={'Q1: 8 + 12 / 4 = 8 + 3 = 11\nQ2: 5 * (16 + 2 - 12) = 30'}
                />
              </div>
            )}

            {inputMode === 'canvas' && (
              <HandwrittenEquationCanvas
                onInsertAnswer={(expr: string) => {
                  setCustomTextWorking((prev) => (prev ? `${prev}\n${expr}` : expr));
                  showToast('info', 'Added scratchpad working to your submission notes.');
                }}
              />
            )}

            <button
              type="button"
              onClick={handleStudentSubmitHomework}
              disabled={isSubmittingHomework || isRenderingPages}
              className="w-full py-3.5 bg-gradient-to-r from-[#800020] via-[#9f1239] to-[#800020] hover:from-[#66001a] hover:to-[#800020] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isSubmittingHomework ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Homework to Mr. Haitham...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Homework to Mr. Haitham</span>
                </>
              )}
            </button>
            </div>
          )}

          {/* Right Column: Student / Parent Submissions & Corrected Reports */}
          <div className={`${isParent ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-4`}>
            <div className="bg-white border border-[#f0d0d6] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#f5e1e5] pb-3">
                <div>
                  <h2 className="text-sm font-bold text-[#701a2d]">
                    {isParent
                      ? `Approved 3-Phase Reports for ${defaultStudentName || 'Student'}`
                      : 'My Submissions & Corrected Reports'}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {isParent
                      ? 'Parent Portal — Only reports finalized and released by Mr. Haitham Hussien appear here'
                      : 'Track submitted work and view 3-Phase reports once Mr. Haitham approves marking'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadSubmissions(selectedSubmissionId || undefined)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600"
                >
                  Refresh
                </button>
              </div>

              {loadingSubmissions ? (
                <div className="py-8 text-center text-xs text-slate-500">Loading your submissions...</div>
              ) : submissions.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#fff1f2] text-[#800020] flex items-center justify-center">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">No homework submitted yet</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Upload your homework sheet on the left. Once submitted, Mr. Haitham Hussien will correct it and return your marked report here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {submissions.map((sub) => {
                    const active = selectedSubmissionId === sub.id;
                    return (
                      <button
                        type="button"
                        key={sub.id}
                        onClick={() => setSelectedSubmissionId(sub.id)}
                        className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                          active
                            ? 'bg-[#fdf2f4] border-[#800020] shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-[#fecdd3]'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{sub.assignment}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Submitted {new Date(sub.submittedAt).toLocaleString('en-GB')}
                            {sub.pageCount > 0 ? ` · ${sub.pageCount} page(s)` : ''}
                          </p>
                        </div>
                        {sub.status === 'graded' ? (
                          <span className="shrink-0 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                            Corrected ({sub.publishedReport?.earnedMarks}/{sub.publishedReport?.totalMarks})
                          </span>
                        ) : (
                          <span className="shrink-0 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Pending Review
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {loadingDetail && (
              <div className="bg-white border border-[#f0d0d6] rounded-2xl p-8 text-center text-xs text-slate-500">
                Loading submission details...
              </div>
            )}

            {!loadingDetail && selectedSubmissionDetail && selectedSubmissionDetail.status === 'pending' && (
              <div className="bg-white border border-amber-200 rounded-2xl p-6 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{selectedSubmissionDetail.assignment}</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Waiting for <strong>Mr. Haitham Hussien&apos;s</strong> correction. Your marks and feedback report will appear here as soon as Mr. Haitham finishes reviewing your paper.
                </p>

                {((selectedSubmissionDetail.pageImages?.length || 0) > 0 || selectedSubmissionDetail.submissionText) && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowStudentUploadedPages((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {showStudentUploadedPages ? 'Hide My Submitted Work' : 'View My Submitted Work'}
                    </button>

                    {showStudentUploadedPages && (
                      <div className="mt-4 text-left space-y-3 border-t border-slate-100 pt-3">
                        {selectedSubmissionDetail.submissionText && (
                          <pre className="p-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-700 whitespace-pre-wrap">
                            {selectedSubmissionDetail.submissionText}
                          </pre>
                        )}
                        {selectedSubmissionDetail.pageImages && selectedSubmissionDetail.pageImages.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {selectedSubmissionDetail.pageImages.map((pg) => (
                              <img
                                key={pg.pageNumber}
                                src={pg.dataUrl}
                                alt={`Submitted page ${pg.pageNumber}`}
                                onClick={() => setLightboxImage(pg.dataUrl)}
                                className="w-full h-28 object-cover rounded-lg border border-slate-200 cursor-zoom-in"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!loadingDetail &&
              selectedSubmissionDetail &&
              selectedSubmissionDetail.status === 'graded' &&
              selectedSubmissionDetail.publishedReport &&
              renderReportCard(selectedSubmissionDetail.publishedReport, selectedSubmissionDetail.teacherNote)}
          </div>
        </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* EDUCATOR PORTAL VIEW (Mr. Haitham Only)                             */}
      {/* =================================================================== */}
      {isTeacher && (
        <div className="space-y-5">
          {/* Active Answer Key Bar */}
          <div className="bg-white border-2 border-[#800020]/25 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#fff1f2] text-[#800020] border border-[#fecdd3] flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#800020]">
                    Educator-Only Active Model Answer Key
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {activeModelKey.questionCount || 20} Questions &bull; {activeModelKey.totalMarks || 75} Marks
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">{activeModelKey.title}</h3>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <input
                ref={keyFileInputRef}
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleUploadKeyFile}
                className="hidden"
                id="educator-key-pdf"
              />
              <label
                htmlFor="educator-key-pdf"
                className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#800020] hover:bg-[#66001a] text-white text-xs font-bold transition shadow-xs"
              >
                {isUploadingKeyPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
                <span>Upload Key PDF</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setEditingKeyTitle(activeModelKey.title);
                  setEditingKeyText(activeModelKey.text);
                  setIsModelKeyModalOpen(true);
                }}
                className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                Edit / Switch Template
              </button>
            </div>
          </div>

          {/* Educator Student Homework Submission Notifications */}
          {(() => {
            const unreadTeacherNotifs = portalNotifications.filter(
              (n) => !n.readByUserIds.includes(effectiveViewerUserId)
            );
            const visibleNotifs =
              showAllNotifications || unreadTeacherNotifs.length === 0
                ? portalNotifications.slice(0, 6)
                : unreadTeacherNotifs;

            if (portalNotifications.length === 0) return null;

            return (
              <div
                className={`rounded-2xl border p-4 shadow-xs transition ${
                  unreadTeacherNotifs.length > 0
                    ? 'bg-gradient-to-r from-[#fff5f7] via-white to-amber-50/50 border-[#e9b3be]'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                        unreadTeacherNotifs.length > 0
                          ? 'bg-[#800020] text-white border-[#800020]'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-bold text-[#701a2d]">
                          Student Submission Notifications
                        </h3>
                        {unreadTeacherNotifs.length > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#800020] text-white text-[10px] font-bold">
                            {unreadTeacherNotifs.length} New
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                            All reviewed ({portalNotifications.length})
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {unreadTeacherNotifs.length > 0
                          ? 'New student homework submissions arrived in your inbox.'
                          : 'All incoming student homework submission alerts are read.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {unreadTeacherNotifs.length > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllPortalNotificationsRead}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-[#e5c1c9] hover:bg-[#fff1f2] text-[11px] font-semibold text-[#800020] transition"
                      >
                        Mark All Read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowAllNotifications((v) => !v)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-600 transition"
                    >
                      {showAllNotifications
                        ? 'Hide'
                        : unreadTeacherNotifs.length === 0
                        ? `Show Recent (${portalNotifications.length})`
                        : `Show All (${portalNotifications.length})`}
                    </button>
                  </div>
                </div>

                {(unreadTeacherNotifs.length > 0 || showAllNotifications) && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {visibleNotifs.map((notif) => {
                      const isUnread = !notif.readByUserIds.includes(effectiveViewerUserId);
                      return (
                        <div
                          key={notif.id}
                          className={`rounded-xl border p-3 text-xs space-y-1.5 transition ${
                            isUnread
                              ? 'bg-white border-[#800020]/35 shadow-2xs'
                              : 'bg-slate-50/70 border-slate-200 opacity-85'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isUnread && (
                                <span className="px-1.5 py-0.5 rounded bg-[#800020] text-white text-[9px] font-extrabold uppercase tracking-wider">
                                  New
                                </span>
                              )}
                              <span className="font-bold text-slate-900">{notif.title}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(notif.createdAt).toLocaleString('en-GB')}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-700 leading-relaxed">{notif.message}</p>
                          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                            {notif.submissionId && (
                              <button
                                type="button"
                                onClick={() => handleOpenSubmissionFromNotification(notif)}
                                className="px-2.5 py-1 rounded-lg bg-[#800020] hover:bg-[#66001a] text-white text-[11px] font-bold transition"
                              >
                                Review Submission &rarr;
                              </button>
                            )}
                            {isUnread && (
                              <button
                                type="button"
                                onClick={() => handleMarkPortalNotificationRead(notif.id)}
                                className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold text-slate-600 transition"
                              >
                                Mark Read
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Educator Mode Switcher */}
          <div className="flex flex-wrap gap-2 bg-white border border-slate-200 p-1.5 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setTeacherMode('inbox')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                teacherMode === 'inbox' ? 'bg-[#800020] text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Student Submissions Inbox ({submissions.filter((s) => s.status === 'pending').length} pending)</span>
            </button>
            <button
              type="button"
              onClick={() => setTeacherMode('assign')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                teacherMode === 'assign' ? 'bg-[#800020] text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Assign Homework to Groups ({groupAssignments.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setTeacherMode('direct')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                teacherMode === 'direct' ? 'bg-[#800020] text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Direct Sheet Check</span>
            </button>
          </div>

          {/* EDUCATOR TAB 0: ASSIGN SEPARATE HOMEWORK TO EACH GROUP + NOTIFICATIONS */}
          {teacherMode === 'assign' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleCreateGroupAssignment}
                className="lg:col-span-5 bg-white border border-[#f0d0d6] rounded-2xl p-5 space-y-4 shadow-xs"
              >
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-[#701a2d]">Assign Homework to a Specific Group</h2>
                  <p className="text-[11px] text-slate-500">
                    Students see only assignments created for their approved group, with website alerts &amp; Resend email notifications.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Target Group / Course</label>
                  <select
                    value={assignGroupId}
                    onChange={(e) => setAssignGroupId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
                    required
                  >
                    {COURSES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Homework Title</label>
                  <input
                    type="text"
                    value={assignTitle}
                    onChange={(e) => setAssignTitle(e.target.value)}
                    placeholder="e.g. Straight Line Equations — Sheet 2"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Due Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      value={assignDueDate}
                      onChange={(e) => setAssignDueDate(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Grading Scale</label>
                    <select
                      value={assignGradingSystem}
                      onChange={(e) => setAssignGradingSystem(e.target.value as GradingSystem)}
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
                    >
                      <option value="edexcel">Edexcel (A*–U)</option>
                      <option value="ib">IB (Band 1–7)</option>
                      <option value="marks">Raw Marks (%)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Homework Instructions</label>
                  <textarea
                    rows={3}
                    value={assignInstructions}
                    onChange={(e) => setAssignInstructions(e.target.value)}
                    placeholder="Write clear steps, page numbers, calculator rules, or submission notes..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                    required
                  />
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignSendNotifications}
                      onChange={(e) => setAssignSendNotifications(e.target.checked)}
                    />
                    <span>Send Website Notification + Resend Email Alert</span>
                  </label>
                  {assignSendNotifications && (
                    <input
                      type="text"
                      value={assignNotifyEmails}
                      onChange={(e) => setAssignNotifyEmails(e.target.value)}
                      placeholder="Optional extra / Resend test email(s), comma-separated"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSavingAssignment}
                  className="w-full py-2.5 rounded-xl bg-[#800020] hover:bg-[#66001a] text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  {isSavingAssignment ? 'Assigning & Sending Notifications...' : 'Assign Homework & Notify Group'}
                </button>
              </form>

              <div className="lg:col-span-7 bg-white border border-[#f0d0d6] rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#701a2d]">Active Homework by Group</h3>
                    <p className="text-[11px] text-slate-500">
                      Each group receives its own homework dropdown menu, due dates, and instructions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadAssignments}
                    className="text-xs font-semibold text-[#800020] hover:underline"
                  >
                    Refresh
                  </button>
                </div>

                {groupAssignments.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    No group homework assigned yet. Use the form on the left to assign homework to any group.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {groupAssignments.map((hw) => (
                      <div key={hw.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#fff1f2] text-[#800020] border border-[#fecdd3] mr-2">
                              {hw.courseTitle}
                            </span>
                            <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                              {hw.gradingSystem}
                            </span>
                            <h4 className="font-bold text-sm text-slate-900 mt-1">{hw.title}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            {hw.dueDate && (
                              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                                Due: {new Date(hw.dueDate).toLocaleString('en-GB')}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteGroupAssignment(hw.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white"
                              title="Delete assignment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {hw.instructions}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* EDUCATOR TAB 1: STUDENT SUBMISSIONS INBOX */}
          {teacherMode === 'inbox' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Inbox List */}
              <div className="lg:col-span-4 bg-white border border-[#f0d0d6] rounded-2xl p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#701a2d]">Inbox Queue</h2>
                  <button
                    type="button"
                    onClick={() => {
                      loadSubmissions(selectedSubmissionId || undefined);
                      if (selectedSubmissionId) loadSubmissionDetail(selectedSubmissionId);
                    }}
                    className="text-xs text-[#800020] hover:underline font-semibold"
                  >
                    Refresh
                  </button>
                </div>

                <select
                  value={inboxCourseFilter}
                  onChange={(e) => setInboxCourseFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700"
                >
                  <option value="all">All Groups / Courses ({submissions.length})</option>
                  {COURSES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({submissions.filter((s) => s.courseId === c.id).length})
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg text-[11px]">
                  {(['all', 'pending', 'graded'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setInboxFilter(f)}
                      className={`py-1 rounded font-semibold capitalize transition ${
                        inboxFilter === f ? 'bg-white text-[#800020] shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {loadingSubmissions ? (
                  <div className="py-8 text-center text-xs text-slate-500">Loading inbox...</div>
                ) : filteredInboxSubmissions.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-500">No submissions in this filter.</p>
                ) : (
                  <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
                    {filteredInboxSubmissions.map((sub) => {
                      const active = selectedSubmissionId === sub.id;
                      return (
                        <div
                          key={sub.id}
                          className={`p-3 rounded-xl border transition cursor-pointer ${
                            active
                              ? 'bg-[#fdf2f4] border-[#800020]'
                              : 'bg-white border-slate-200 hover:border-[#fecdd3]'
                          }`}
                          onClick={() => setSelectedSubmissionId(sub.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{sub.studentName}</p>
                              <p className="text-[11px] text-slate-600 truncate">{sub.assignment}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {sub.courseTitle} &middot; {new Date(sub.submittedAt).toLocaleDateString('en-GB')}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSubmission(sub.id);
                              }}
                              title="Delete submission"
                              className="p-1 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                sub.status === 'graded'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : sub.draftReport
                                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                  : sub.draftStatus === 'queued' || sub.draftStatus === 'generating'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {sub.status === 'graded'
                                ? `Published (${sub.publishedReport?.earnedMarks}/${sub.publishedReport?.totalMarks})`
                                : sub.draftReport
                                ? `Draft Ready (${sub.draftReport.earnedMarks}/${sub.draftReport.totalMarks}) · Approve`
                                : sub.draftStatus === 'queued' || sub.draftStatus === 'generating'
                                ? 'Auto-Correcting...'
                                : 'Pending Marking'}
                            </span>
                            {sub.pageCount > 0 && (
                              <span className="text-[10px] text-slate-500">{sub.pageCount} page(s)</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Inbox Detail + Correction Workbench */}
              <div className="lg:col-span-8 space-y-4">
                {!selectedSubmissionDetail ? (
                  <div className="bg-white border border-[#f0d0d6] rounded-2xl p-10 text-center text-xs text-slate-500">
                    Select a student submission on the left to inspect uploaded pages and prepare a report.
                  </div>
                ) : loadingDetail ? (
                  <div className="bg-white border border-[#f0d0d6] rounded-2xl p-10 text-center text-xs text-slate-500">
                    Loading student pages...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Student Pages Preview + Draft Button */}
                    <div className="bg-white border border-[#f0d0d6] rounded-2xl p-5 space-y-4 shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">
                            {selectedSubmissionDetail.studentName} &mdash; {selectedSubmissionDetail.assignment}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {selectedSubmissionDetail.courseTitle} &middot; Submitted{' '}
                            {new Date(selectedSubmissionDetail.submittedAt).toLocaleString('en-GB')}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={gradingSystem}
                            onChange={(e) => {
                              const nextSys = e.target.value as GradingSystem;
                              setGradingSystem(nextSys);
                              setEditableReport((prev) => (prev ? recalculateReportTotals(prev, nextSys) : prev));
                            }}
                            className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                          >
                            <option value="edexcel">Scale: Edexcel (A*–U)</option>
                            <option value="ib">Scale: IB (Band 1–7)</option>
                            <option value="marks">Scale: Raw Marks (%)</option>
                          </select>
                          <select
                            value={precisionMode}
                            onChange={(e) => setPrecisionMode(e.target.value as 'deep' | 'max')}
                            className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
                          >
                            <option value="deep">Standard Marking Pass</option>
                            <option value="max">Detailed Handwriting Pass</option>
                          </select>
                          <button
                            type="button"
                            onClick={handleGenerateSubmissionDraft}
                            disabled={isGeneratingDraft}
                            className="px-4 py-2 rounded-lg bg-[#800020] hover:bg-[#66001a] text-white text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                          >
                            {isGeneratingDraft ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Preparing Correction Draft...</span>
                              </>
                            ) : (
                              <>
                                <FileCheck className="w-3.5 h-3.5" />
                                <span>{editableReport ? 'Re-Run Correction Draft' : 'Prepare Correction Draft'}</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={handleCreateManualDraft}
                            disabled={isGeneratingDraft}
                            className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition disabled:opacity-50"
                          >
                            Manual Sheet
                          </button>
                        </div>
                      </div>

                      {(selectedSubmissionDetail.draftStatus === 'queued' ||
                        selectedSubmissionDetail.draftStatus === 'generating') &&
                        !editableReport && (
                          <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-2.5 rounded-xl text-xs font-medium">
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            <span>
                              Automatic 3-Phase correction draft is preparing in the background — this panel updates automatically once ready.
                            </span>
                          </div>
                        )}

                      {selectedSubmissionDetail.draftStatus === 'failed' && !editableReport && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-3 rounded-xl text-xs break-words space-y-2.5">
                          <div>
                            <strong>Auto-correction paused:</strong>{' '}
                            {selectedSubmissionDetail.draftError || 'Please verify your Model Answer Key and click Prepare Correction Draft.'}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={handleCreateManualDraft}
                              disabled={isGeneratingDraft}
                              className="px-3.5 py-1.5 rounded-lg bg-[#800020] hover:bg-[#6b1226] text-white text-xs font-bold transition"
                            >
                              Open Manual Correction Sheet (No Quota Needed)
                            </button>
                          </div>
                        </div>
                      )}

                      {selectedSubmissionDetail.submissionText && (
                        <div>
                          <span className="text-[11px] font-bold text-slate-600 block mb-1">Student Typed Notes:</span>
                          <pre className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono whitespace-pre-wrap text-slate-800">
                            {selectedSubmissionDetail.submissionText}
                          </pre>
                        </div>
                      )}

                      {selectedSubmissionDetail.pageImages && selectedSubmissionDetail.pageImages.length > 0 && (
                        <div>
                          <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                            Uploaded Pages (click to enlarge):
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {selectedSubmissionDetail.pageImages.map((pg) => (
                              <div key={pg.pageNumber} className="border border-slate-200 rounded-xl p-1.5 bg-slate-50">
                                <img
                                  src={pg.dataUrl}
                                  alt={`Student page ${pg.pageNumber}`}
                                  onClick={() => setLightboxImage(pg.dataUrl)}
                                  className="w-full h-32 object-cover rounded-lg cursor-zoom-in"
                                />
                                <p className="text-[10px] font-semibold text-center text-slate-600 mt-1">
                                  Page {pg.pageNumber}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Step 1: Spacious Teacher Review & Edit Box -> Linked Live to Step 2 Parent Report */}
                    {editableReport && (
                      <div className="bg-white border border-[#f0d0d6] rounded-2xl p-5 space-y-5 shadow-xs">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f5e1e5] pb-3">
                          <div>
                            <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#fff1f2] text-[#800020] mb-1">
                              Step 1 · Teacher Verification &amp; Answer Editor
                            </span>
                            <h4 className="text-sm font-bold text-[#701a2d]">
                              Review, Edit or Add Questions &amp; Worked Solutions
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              Every change below updates the linked Parent Report, Student Report, Clean PDF, and Resend Email automatically.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="px-3.5 py-2 rounded-xl bg-[#fff1f2] border border-[#fecdd3] text-right">
                              <span className="text-base font-black text-[#800020]">
                                {editableReport.earnedMarks} / {editableReport.totalMarks}
                              </span>
                              <span className="text-xs font-bold text-slate-700 ml-2">
                                ({editableReport.percentage}% &middot; {editableReport.grade})
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {editableReport.questions.map((q, idx) => (
                            <div
                              key={`${q.questionNumber}-${idx}`}
                              className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/40 space-y-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={q.displayLabel || `Q${q.questionNumber}`}
                                    onChange={(e) =>
                                      handleUpdateEditableQuestion(idx, { displayLabel: e.target.value })
                                    }
                                    className="w-24 px-2 py-1 rounded border border-slate-300 bg-white text-xs font-bold text-slate-900"
                                  />
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                      q.earnedMarks === q.maxMarks
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : q.earnedMarks > 0
                                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                    }`}
                                  >
                                    {q.earnedMarks === q.maxMarks
                                      ? 'Full Marks'
                                      : q.earnedMarks > 0
                                      ? 'Partial Credit'
                                      : 'Needs Review'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-xs">
                                  <label className="text-[11px] font-semibold text-slate-600">Mark:</label>
                                  <input
                                    type="number"
                                    min={0}
                                    max={q.maxMarks}
                                    value={q.earnedMarks}
                                    onChange={(e) =>
                                      handleUpdateEditableQuestion(idx, {
                                        earnedMarks: Math.max(0, Math.min(q.maxMarks, Number(e.target.value) || 0)),
                                      })
                                    }
                                    className="w-14 px-2 py-1 border border-slate-300 rounded bg-white text-center font-bold text-xs"
                                  />
                                  <span className="text-slate-400">/</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={q.maxMarks}
                                    onChange={(e) =>
                                      handleUpdateEditableQuestion(idx, {
                                        maxMarks: Math.max(1, Number(e.target.value) || 1),
                                      })
                                    }
                                    title="Max marks for question"
                                    className="w-14 px-2 py-1 border border-slate-300 rounded bg-white text-center font-semibold text-xs text-slate-700"
                                  />
                                  {editableReport.questions.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveEditableQuestion(idx)}
                                      className="p-1 text-slate-400 hover:text-rose-600"
                                      title="Remove question"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                                <div>
                                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                                    1. What Was Written
                                  </label>
                                  <textarea
                                    rows={3}
                                    value={q.phase1Extraction || q.studentWorkingFound}
                                    onChange={(e) =>
                                      handleUpdateEditableQuestion(idx, {
                                        studentWorkingFound: e.target.value,
                                        phase1Extraction: e.target.value,
                                      })
                                    }
                                    className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold uppercase text-[#800020] block mb-1">
                                    2. Exact Mistake &amp; Teacher Feedback
                                  </label>
                                  <textarea
                                    rows={3}
                                    value={q.phase2ErrorAnalysis || q.teacherFeedback || q.errorAnalysis}
                                    onChange={(e) =>
                                      handleUpdateEditableQuestion(idx, {
                                        teacherFeedback: e.target.value,
                                        errorAnalysis: e.target.value,
                                        phase2ErrorAnalysis: e.target.value,
                                      })
                                    }
                                    className="w-full p-2 border border-rose-200 rounded-lg bg-white text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold uppercase text-emerald-800 block mb-1">
                                    3. Complete Worked Solution
                                  </label>
                                  <textarea
                                    rows={3}
                                    value={q.phase3Solution || q.modelSolution}
                                    onChange={(e) =>
                                      handleUpdateEditableQuestion(idx, {
                                        modelSolution: e.target.value,
                                        phase3Solution: e.target.value,
                                      })
                                    }
                                    className="w-full p-2 border border-emerald-200 rounded-lg bg-emerald-50/40 text-xs font-mono text-emerald-950"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={handleAddEditableQuestion}
                            className="w-full py-2 rounded-xl border border-dashed border-[#800020]/40 text-[#800020] hover:bg-[#fff5f7] text-xs font-bold transition"
                          >
                            + Add Question to Report
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">Overall Summary (Shown at top of Parent Report)</label>
                            <textarea
                              rows={2}
                              value={editableReport.generalFeedback}
                              onChange={(e) =>
                                setEditableReport((prev) => (prev ? { ...prev, generalFeedback: e.target.value } : prev))
                              }
                              className="w-full p-2.5 border border-slate-200 rounded-xl text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">
                              Mr. Haitham&apos;s Note for Student &amp; Parent
                            </label>
                            <textarea
                              rows={2}
                              value={teacherNoteInput}
                              onChange={(e) => setTeacherNoteInput(e.target.value)}
                              placeholder="Optional personal advice, praise, or next focus area for parents..."
                              className="w-full p-2.5 border border-slate-200 rounded-xl text-xs"
                            />
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex-1 min-w-[220px]">
                            <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                              Parent Notification Email (Resend Gateway)
                            </label>
                            <input
                              type="email"
                              value={publishParentEmail}
                              onChange={(e) => setPublishParentEmail(e.target.value)}
                              placeholder="Leave blank to use student's saved parent email"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                            />
                          </div>
                          {selectedSubmissionDetail.emailDelivery && (
                            <span
                              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                                selectedSubmissionDetail.emailDelivery.status === 'sent'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              Last email: {selectedSubmissionDetail.emailDelivery.status === 'sent' ? 'Sent via Resend' : 'Logged locally'} ({selectedSubmissionDetail.emailDelivery.to})
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => downloadReportCsv(editableReport)}
                              className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                            >
                              <Download className="w-3.5 h-3.5" /> Export CSV
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowParentPreview(true)}
                              className="px-3.5 py-2 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-xs font-semibold text-indigo-800 flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Preview Clean Parent Report
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                printStandaloneParentReport(
                                  recalculateReportTotals(editableReport, gradingSystem),
                                  teacherNoteInput,
                                  selectedSubmissionDetail.courseTitle || courseTitle
                                )
                              }
                              className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center gap-1.5"
                            >
                              <Printer className="w-3.5 h-3.5" /> Download / Print PDF
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={handlePublishToStudent}
                            disabled={isPublishingReport}
                            style={{ backgroundColor: '#059669', color: '#ffffff' }}
                            className="px-6 py-3 rounded-xl hover:opacity-95 text-xs sm:text-sm font-bold shadow-sm flex items-center gap-2 transition disabled:opacity-50"
                          >
                            {isPublishingReport ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Approving &amp; Sending...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>
                                  {selectedSubmissionDetail.status === 'graded'
                                    ? 'Update & Re-Send Report to Student & Parent'
                                    : 'Approve & Send Report to Student & Parent'}
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* EDUCATOR TAB 2: DIRECT SHEET CHECK */}
          {teacherMode === 'direct' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5 bg-white border border-[#f0d0d6] rounded-2xl p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-bold text-[#701a2d]">Direct Sheet Evaluation</h2>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e5d0d4] text-xs"
                  placeholder="Student / Paper label"
                />

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="educator-direct-file"
                />
                <label
                  htmlFor="educator-direct-file"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-[#e5c1c9] hover:border-[#800020] rounded-xl p-5 cursor-pointer bg-[#fffcfd] text-center"
                >
                  {isRenderingPages ? (
                    <Loader2 className="w-6 h-6 animate-spin text-[#800020]" />
                  ) : selectedFile ? (
                    <p className="text-xs font-bold text-slate-900">
                      {selectedFile.name} ({pageImages.length || 1} page(s))
                    </p>
                  ) : (
                    <p className="text-xs font-bold text-slate-700">Click to upload PDF / Photo</p>
                  )}
                </label>

                <textarea
                  value={customTextWorking}
                  onChange={(e) => setCustomTextWorking(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-xl border border-[#e5d0d4] text-xs font-mono"
                  placeholder="Or paste typed answers..."
                />

                <button
                  type="button"
                  onClick={handleDirectCheck}
                  disabled={isDirectGrading || isRenderingPages}
                  className="w-full py-3 bg-[#800020] hover:bg-[#66001a] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {isDirectGrading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Evaluating Worksheet...</span>
                    </>
                  ) : (
                    <span>Evaluate Against Active Answer Key</span>
                  )}
                </button>
              </div>

              <div className="lg:col-span-7">
                {directReport ? (
                  renderReportCard(directReport)
                ) : (
                  <div className="bg-white border border-[#f0d0d6] rounded-2xl p-10 text-center text-xs text-slate-500">
                    Upload a sheet on the left to evaluate it directly against &ldquo;{activeModelKey.title}&rdquo;.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-slate-900 shadow-lg flex items-center justify-center font-bold"
            >
              ✕
            </button>
            <img src={lightboxImage} alt="Submitted Page Full View" className="max-h-[86vh] rounded-xl shadow-2xl" />
          </div>
        </div>
      )}

      {/* Educator-Only Model Answer Key Manager Modal */}
      {isTeacher && isModelKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-[#e6ccd2] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-800">
            <div className="flex items-center justify-between p-4 border-b border-[#f0d8dd] bg-[#fffdfa]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#fff1f2] text-[#800020] flex items-center justify-center border border-[#fecdd3]">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#701a2d]">Educator Model Answer Key Manager</h3>
                  <p className="text-[11px] text-slate-500">
                    Private to Mr. Haitham Hussien &mdash; never visible to students.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModelKeyModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#fdf2f4] text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              <div className="flex flex-wrap gap-2">
                {Object.entries(MODEL_KEY_TEMPLATES).map(([id, tmpl]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setSelectedTemplate(id);
                      setEditingKeyTitle(tmpl.title);
                      setEditingKeyText(tmpl.text);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      selectedTemplate === id
                        ? 'bg-[#800020] text-white border-[#800020]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tmpl.title}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Answer Key Title</label>
                <input
                  type="text"
                  value={editingKeyTitle}
                  onChange={(e) => setEditingKeyTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Questions &amp; Mark Scheme</label>
                <textarea
                  rows={12}
                  value={editingKeyText}
                  onChange={(e) => setEditingKeyText(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#f0d8dd] bg-[#fffdfa] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetModelKey}
                className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Reset to Default
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModelKeyModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveModelKey(editingKeyTitle, editingKeyText)}
                  className="px-5 py-2 rounded-lg bg-[#800020] hover:bg-[#66001a] text-white text-xs font-bold"
                >
                  Save Active Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Standalone Clean Formal Parent Report Preview Modal (Live-linked to Step 1 Teacher Edits) */}
      {showParentPreview && editableReport && selectedSubmissionDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-slate-100 w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-300">
            <div className="bg-white px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Formal Parent Progress Report Preview
                </h3>
                <p className="text-[11px] text-slate-500">
                  Live-synced with your edited marks &amp; solutions from Step 1 (no website menus or sidebar included).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    printStandaloneParentReport(
                      recalculateReportTotals(editableReport, gradingSystem),
                      teacherNoteInput,
                      selectedSubmissionDetail.courseTitle || courseTitle
                    )
                  }
                  className="px-3.5 py-2 rounded-lg bg-[#800020] hover:bg-[#66001a] text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Download / Print Clean PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowParentPreview(false)}
                  className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                <iframe
                  title="Formal Parent Progress Report"
                  className="w-full h-[72vh] border-0"
                  srcDoc={buildStandaloneParentReportHtml(
                    recalculateReportTotals(editableReport, gradingSystem),
                    teacherNoteInput,
                    selectedSubmissionDetail.courseTitle || courseTitle
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
