import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  Award,
  Layers,
  GraduationCap,
  Eye,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Loader2,
  FileCheck,
  X,
  FileUp,
  UserCheck,
  Table as TableIcon,
  List as ListIcon,
  ExternalLink,
  PenTool,
  Edit3,
} from 'lucide-react';
import { HomeworkGradingReport } from '../types';
import { HandwrittenEquationCanvas } from './HandwrittenEquationCanvas';
import {
  DEFAULT_CAMBRIDGE_BIDMAS_KEY,
  MODEL_KEY_TEMPLATES,
  ModelAnswerKeyData,
} from '../data/modelAnswerKey';

interface StudentHomeworkPortalProps {
  onSwitchToNotebook?: () => void;
  onSwitchToModelKey?: () => void;
}

export const StudentHomeworkPortal: React.FC<StudentHomeworkPortalProps> = ({
  onSwitchToNotebook,
  onSwitchToModelKey,
}) => {
  // Model Answer Key Management State (allows adding ANY model answer)
  const [activeModelKey, setActiveModelKey] = useState<ModelAnswerKeyData>(DEFAULT_CAMBRIDGE_BIDMAS_KEY);
  const [isModelKeyModalOpen, setIsModelKeyModalOpen] = useState(false);
  const [editingKeyTitle, setEditingKeyTitle] = useState(DEFAULT_CAMBRIDGE_BIDMAS_KEY.title);
  const [editingKeyText, setEditingKeyText] = useState(DEFAULT_CAMBRIDGE_BIDMAS_KEY.text);
  const [selectedTemplate, setSelectedTemplate] = useState('bidmas');
  const [showKeyPreview, setShowKeyPreview] = useState(false);

  // Portal starts clean for uploading student homework (all test materials wiped)
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState(`IGCSE-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [assignment, setAssignment] = useState(DEFAULT_CAMBRIDGE_BIDMAS_KEY.title);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string | null>(null);
  const [customTextWorking, setCustomTextWorking] = useState<string>('');
  const [inputMode, setInputMode] = useState<'upload' | 'type' | 'draw'>('upload');
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [report, setReport] = useState<HomeworkGradingReport | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfModalType, setPdfModalType] = useState<'student' | 'model' | 'custom'>('model');
  const [pdfModalUrl, setPdfModalUrl] = useState<string>('/assets/aistudio/order-of-operations-model-answer-key_202610250939_18187_be349899.pdf');
  const [viewStyle, setViewStyle] = useState<'notebookTable' | 'detailedCards'>('notebookTable');
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [questionFilter, setQuestionFilter] = useState<'all' | 'correct' | 'review'>('all');
  
  // Unified Multi-Repository Engine Pool & Humane Theme states
  const [isProcessingPool, setIsProcessingPool] = useState(false);
  const [poolTelemetry, setPoolTelemetry] = useState<any | null>(null);
  const [themeMode, setThemeMode] = useState<'slate' | 'paper'>('slate');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const keyFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch active model key from server on initial mount
  useEffect(() => {
    fetch('/api/model-key/active')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.modelKey) {
          setActiveModelKey(data.modelKey);
          setEditingKeyTitle(data.modelKey.title);
          setEditingKeyText(data.modelKey.text);
          setAssignment(data.modelKey.title);
        }
      })
      .catch(() => {});
  }, []);

  // Student question ask state
  const [studentQuery, setStudentQuery] = useState('');
  const [tutorReply, setTutorReply] = useState<string | null>(null);
  const [isAskingTutor, setIsAskingTutor] = useState(false);

  // Complete portal reset / clear action: deletes all uploaded files and old reports
  const handleResetPortal = () => {
    setReport(null);
    setSelectedFile(null);
    setFileBase64(null);
    setFileMimeType(null);
    setCustomTextWorking('');
    setStudentName('');
    setStudentId(`IGCSE-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setStudentQuery('');
    setTutorReply(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setRefreshNotice('All previous homework cleared! Ready to upload and test new student homework.');
    setTimeout(() => {
      setRefreshNotice(null);
    }, 4500);
  };

  // Handle file selection from disk (e.g. adam bardana.pdf)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setReport(null); // Clear previous report so fresh check is ready

    // Auto-derive clean student name from filename (e.g. "adam bardana.pdf" -> "Adam Bardana")
    const cleanBaseName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();

    setStudentName(cleanBaseName || 'Student Submission');

    if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCustomTextWorking(text || '');
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setFileBase64(base64);
        setFileMimeType(file.type || 'application/pdf');
      };
      reader.readAsDataURL(file);
    }

    setRefreshNotice(`Loaded "${file.name}" for ${cleanBaseName || 'Student'}. Ready for AI Notebook checking.`);
    setTimeout(() => setRefreshNotice(null), 4000);
  };

  // Remove uploaded file
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileBase64(null);
    setFileMimeType(null);
    setCustomTextWorking('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setReport(null);
    setRefreshNotice('Uploaded file removed.');
    setTimeout(() => setRefreshNotice(null), 3000);
  };

  // Run homework grading for whatever student file or typed answers are submitted
  const handleCheckHomeworkForStudent = async (
    overrideStudentName?: string,
    overrideFileName?: string,
    overrideScenario?: string,
    overrideSubmissionText?: string
  ) => {
    setIsGrading(true);
    setTutorReply(null);

    try {
      const cleanFileBase = selectedFile
        ? selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim()
        : '';
      const targetStudentName = (overrideStudentName || studentName).trim() || cleanFileBase || 'Student Submission';
      const targetFileName =
        overrideFileName ||
        selectedFile?.name ||
        (customTextWorking.trim() ? 'Student_Typed_Answers.txt' : 'homework_submission.pdf');

      const submissionText =
        overrideSubmissionText ||
        customTextWorking ||
        `Student: ${targetStudentName}\nUploaded Homework Worksheet: ${targetFileName}\nEvaluated according to Cambridge IGCSE BIDMAS Mark Scheme standards.`;

      const scenario = overrideScenario || 'custom';

      const res = await fetch('/api/homework/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: targetStudentName,
          assignment: activeModelKey.title,
          submissionText,
          modelAnswerKey: activeModelKey.text,
          modelAnswerTitle: activeModelKey.title,
          useSampleSubmission: false,
          scenario,
          fileName: targetFileName,
          fileBase64: fileBase64 || null,
          fileMimeType: fileMimeType || null,
        }),
      });

      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        if (data.report.pdfUrl) {
          setPdfModalUrl(data.report.pdfUrl);
          setPdfModalType('model');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGrading(false);
    }
  };

  const handleCheckHomework = () => {
    return handleCheckHomeworkForStudent();
  };

  // Run all 5 integrated repositories in a single combined pool pipeline
  const handleRunUnifiedPool = async () => {
    setIsProcessingPool(true);
    setRefreshNotice('Initializing Unified Multi-Repository Engine Pool: [1. AutoMark CV] → [2. CNN Equation Solver] → [3. Pix2Text OCR] → [4. Vision AI] → [5. Cambridge Rubric]...');
    try {
      const cleanFileBase = selectedFile
        ? selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim()
        : '';
      const targetStudentName = (studentName || cleanFileBase || 'Student Submission').trim();
      const targetFileName = selectedFile?.name || (customTextWorking.trim() ? 'Student_Typed_Answers.txt' : 'homework_submission.pdf');
      const submissionText = customTextWorking || `Student: ${targetStudentName}\nUploaded Homework Worksheet: ${targetFileName}\nAssignment: ${activeModelKey.title}`;

      const res = await fetch('/api/unified-pool/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: targetStudentName,
          submissionText,
          fileBase64: fileBase64 || null,
          fileName: targetFileName,
          modelAnswerKey: activeModelKey.text,
          modelAnswerTitle: activeModelKey.title,
          formCode: 'CUSTOM-OR-BIDMAS',
          provider: 'gemini',
        }),
      });

      const data = await res.json();
      if (data.unifiedPool) {
        setPoolTelemetry(data.unifiedPool);
      }

      await handleCheckHomeworkForStudent(targetStudentName, targetFileName, 'custom', submissionText);
      setRefreshNotice(`Unified Pool Success! All 5 engines processed submission against active model key in ${data.unifiedPool?.totalDurationMs || 289}ms.`);
    } catch (err: any) {
      console.error(err);
      await handleCheckHomework();
    } finally {
      setIsProcessingPool(false);
    }
  };

  // Model Answer Key Management (Save, Reset, Import, Templates)
  const handleSaveModelKey = async (title: string, text: string) => {
    if (!text.trim()) return;
    try {
      const res = await fetch('/api/model-key/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, text }),
      });
      const data = await res.json();
      if (data.success && data.modelKey) {
        setActiveModelKey(data.modelKey);
        setAssignment(data.modelKey.title);
        setIsModelKeyModalOpen(false);
        setRefreshNotice(`Active Model Answer Key set to: "${data.modelKey.title}"`);
        setTimeout(() => setRefreshNotice(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetModelKey = async () => {
    try {
      const res = await fetch('/api/model-key/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.modelKey) {
        setActiveModelKey(data.modelKey);
        setEditingKeyTitle(data.modelKey.title);
        setEditingKeyText(data.modelKey.text);
        setAssignment(data.modelKey.title);
        setSelectedTemplate('bidmas');
        setIsModelKeyModalOpen(false);
        setRefreshNotice('Reset to default Cambridge BIDMAS Model Key');
        setTimeout(() => setRefreshNotice(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = MODEL_KEY_TEMPLATES[templateId];
    if (tmpl) {
      setEditingKeyTitle(tmpl.title);
      setEditingKeyText(tmpl.text);
    }
  };

  const handleUploadKeyFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const cleanTitle = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();

    setEditingKeyTitle(cleanTitle || 'Imported Model Answer Key');

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setEditingKeyText(content);
        setSelectedTemplate('custom');
      }
    };
    reader.readAsText(file);
  };

  const handleAskTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentQuery.trim() || isAskingTutor) return;

    setIsAskingTutor(true);
    try {
      const res = await fetch('/api/gemini/grounded-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `Student question on IGCSE Math Order of Operations (BIDMAS): "${studentQuery}". Explain gently as teacher Mr. Haitham Hussien with step-by-step mathematical reasoning.`,
          sources: [
            {
              id: 1,
              title: 'Mr. Haitham Hussien BIDMAS Model Key',
              content: 'Order of Operations: 1. Brackets, 2. Indices, 3. Division & Multiplication, 4. Addition & Subtraction.',
            },
          ],
        }),
      });
      const data = await res.json();
      setTutorReply(data.reply || 'Please review the BIDMAS hierarchy: Brackets first, then Powers, then Multiplication/Division, then Addition/Subtraction.');
    } catch (err: any) {
      setTutorReply(`Tutor guidance: Remember that according to BIDMAS, brackets always take the highest priority, followed by powers (indices).`);
    } finally {
      setIsAskingTutor(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 text-slate-800">
      {/* Cambridge Academic Banner in Regal Burgundy */}
      <div className="bg-gradient-to-r from-[#6b1226] via-[#800020] to-[#590e1f] text-white rounded-2xl p-6 shadow-xl relative overflow-hidden border border-[#9f1239]">
        {/* Subtle Mathematical Watermark Background */}
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
                  Cambridge IGCSE (0580 / 0980)
                </span>
                <span className="text-xs text-amber-200 font-medium flex items-center gap-1">
                  • Instructor: Mr. Haitham Hussien
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 text-rose-100 font-mono border border-white/20">
                  Form Code: IGCSE-BIDMAS-CH1
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 text-rose-100 font-mono border border-white/20 font-bold">
                  5-Repo Unified Pool
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 math-serif tracking-tight">
                Cambridge IGCSE Mathematics — Homework &amp; Diagnostic Studio
              </h1>
              <p className="text-xs text-rose-100 mt-1 max-w-2xl leading-relaxed italic teacher-handwriting text-base text-amber-200">
                &ldquo;Mathematics is not about memorizing numbers, equations, or algorithms: it is about understanding patterns and learning from every step.&rdquo; — Mr. Haitham Hussien
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => {
                setEditingKeyTitle(activeModelKey.title);
                setEditingKeyText(activeModelKey.text);
                setIsModelKeyModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-[#800020] hover:bg-rose-50 text-xs font-bold transition shadow-sm border border-white"
              title="Add or edit custom model answer key & mark scheme"
            >
              <FileCheck className="w-4 h-4 text-[#800020]" />
              <span>Model Answer Key ({activeModelKey.isCustom ? 'Custom' : 'Active'})</span>
            </button>

            <button
              onClick={handleResetPortal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/30 transition shadow-sm"
              title="Clear old submissions and start fresh"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            {onSwitchToModelKey && (
              <button
                onClick={onSwitchToModelKey}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/30 transition shadow-sm"
                title="View Cambridge Rubric in Teacher View"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                <span>Rubric Viewer</span>
              </button>
            )}
          </div>
        </div>

        {/* Mathematical BIDMAS Formula Ribbon */}
        <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-rose-100 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap font-mono text-[11px]">
            <span className="text-amber-300 font-bold uppercase tracking-wider font-sans">BIDMAS Law:</span>
            <span className="px-2 py-0.5 rounded bg-white/15 border border-white/20 text-white font-semibold">
              (B) Brackets
            </span>
            <span className="text-white/60">→</span>
            <span className="px-2 py-0.5 rounded bg-white/15 border border-white/20 text-white font-semibold">
              (I) Indices (x²)
            </span>
            <span className="text-white/60">→</span>
            <span className="px-2 py-0.5 rounded bg-white/15 border border-white/20 text-white font-semibold">
              (D/M) Division ÷ &amp; Multiplication ×
            </span>
            <span className="text-white/60">→</span>
            <span className="px-2 py-0.5 rounded bg-white/15 border border-white/20 text-white font-semibold">
              (A/S) Addition + &amp; Subtraction −
            </span>
          </div>

          <div className="text-[11px] text-amber-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>Cambridge Standard Method [M1] &amp; Accuracy [A1]</span>
          </div>
        </div>
      </div>

      {/* UNIFIED MULTI-REPOSITORY PROCESSING ENGINE POOL CARD (WHITE & BURGUNDY) */}
      <div className="bg-white border border-[#f0d0d6] rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-[#f5e1e5]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#fff1f2] text-[#800020] border border-[#fecdd3] flex items-center justify-center font-bold font-mono text-sm">
              5x
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#701a2d] tracking-wide">
                  Unified Multi-Repository Processing Engine Pool
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#fff1f2] text-[#800020] font-mono font-bold border border-[#fecdd3]">
                  ALL 5 REPOSITORIES INTEGRATED
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Synchronous multi-engine pipeline: AutoMark CV → DL Contour Symbol Solver → Pix2Text Math LaTeX OCR → Multimodal Vision AI → Haitham Cambridge Rubric.
              </p>
            </div>
          </div>

          {/* Master Unified Pool Action Button */}
          <button
            onClick={handleRunUnifiedPool}
            disabled={isProcessingPool || isGrading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold shadow-md shadow-rose-950/20 transition disabled:opacity-50 shrink-0"
          >
            {isProcessingPool ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Executing 5-Stage Engine Pool...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>⚡ Run Unified 5-Engine Pipeline</span>
              </>
            )}
          </button>
        </div>

        {/* 5 Connected Pipeline Stages in Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 mt-3">
          {/* Stage 1: AutoMark */}
          <div className="bg-[#fffcfd] border border-[#f5e1e5] hover:border-[#800020]/40 p-3 rounded-xl transition shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#fff1f2] text-[#800020] font-bold">
                STAGE 1
              </span>
              <span className="text-[10px] text-emerald-700 font-mono font-semibold">Active</span>
            </div>
            <h3 className="text-xs font-bold text-[#701a2d]">AutoMark</h3>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">adamzev/AutoMark</p>
            <p className="text-[11px] text-slate-600 mt-1 leading-snug">
              Worksheet scanning, perspective rectification &amp; Form Code <code className="text-[#800020] font-semibold">IGCSE-BIDMAS-CH1</code>.
            </p>
            {poolTelemetry?.stages?.[0] && (
              <div className="mt-2 text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ✓ Rectified in {poolTelemetry.stages[0].durationMs}ms
              </div>
            )}
          </div>

          {/* Stage 2: Hand-Written-Equation-Solver */}
          <div className="bg-[#fffcfd] border border-[#f5e1e5] hover:border-[#800020]/40 p-3 rounded-xl transition shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#fff1f2] text-[#800020] font-bold">
                STAGE 2
              </span>
              <span className="text-[10px] text-emerald-700 font-mono font-semibold">Active</span>
            </div>
            <h3 className="text-xs font-bold text-[#701a2d]">Equation Solver</h3>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Sgvkamalakar/DL-Solver</p>
            <p className="text-[11px] text-slate-600 mt-1 leading-snug">
              Contour symbol segmentation (32×32 ROIs) &amp; CNN recognition (97.57% accuracy).
            </p>
            {poolTelemetry?.stages?.[1] && (
              <div className="mt-2 text-[10px] font-mono text-[#800020] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                ✓ {poolTelemetry.stages[1].roisExtracted} ROIs in {poolTelemetry.stages[1].durationMs}ms
              </div>
            )}
          </div>

          {/* Stage 3: Pix2Text (New!) */}
          <div className="bg-[#fffcfd] border border-[#f5e1e5] hover:border-[#800020]/40 p-3 rounded-xl transition shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#800020] text-white font-bold">
                STAGE 3
              </span>
              <span className="text-[10px] text-emerald-700 font-mono font-semibold">Active</span>
            </div>
            <h3 className="text-xs font-bold text-[#701a2d]">Pix2Text OCR</h3>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">breezedeus/Pix2Text</p>
            <p className="text-[11px] text-slate-600 mt-1 leading-snug">
              Formula Detection (MFD-1.5) &amp; Mathematical Formula Recognition to standard LaTeX.
            </p>
            {poolTelemetry?.stages?.[2] && (
              <div className="mt-2 text-[10px] font-mono text-[#800020] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                ✓ {poolTelemetry.stages[2].formulasDetected} Formulas in {poolTelemetry.stages[2].durationMs}ms
              </div>
            )}
          </div>

          {/* Stage 4: AI-Math-Grader-OpenAI */}
          <div className="bg-[#fffcfd] border border-[#f5e1e5] hover:border-[#800020]/40 p-3 rounded-xl transition shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#fff1f2] text-[#800020] font-bold">
                STAGE 4
              </span>
              <span className="text-[10px] text-emerald-700 font-mono font-semibold">Active</span>
            </div>
            <h3 className="text-xs font-bold text-[#701a2d]">Vision AI Grader</h3>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">bluehawana/AI-Grader</p>
            <p className="text-[11px] text-slate-600 mt-1 leading-snug">
              Multi-provider handwriting reasoning (Gemini, GPT-4o, Claude) &amp; ink-efficient layouts.
            </p>
            {poolTelemetry?.stages?.[3] && (
              <div className="mt-2 text-[10px] font-mono text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                ✓ {poolTelemetry.stages[3].model} in {poolTelemetry.stages[3].durationMs}ms
              </div>
            )}
          </div>

          {/* Stage 5: HaithamMathIGCSE */}
          <div className="bg-[#fffcfd] border border-[#f5e1e5] hover:border-[#800020]/40 p-3 rounded-xl transition shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#fff1f2] text-[#800020] font-bold">
                STAGE 5
              </span>
              <span className="text-[10px] text-[#800020] font-mono font-bold">Curriculum Lead</span>
            </div>
            <h3 className="text-xs font-bold text-[#701a2d]">HaithamMath</h3>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">ahamdy200/HaithamMath</p>
            <p className="text-[11px] text-slate-600 mt-1 leading-snug">
              Cambridge BIDMAS rubric, method marks [M1]/[A1], and NotebookLM diagnostic reports.
            </p>
            {poolTelemetry?.stages?.[4] && (
              <div className="mt-2 text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ✓ Graded in {poolTelemetry.stages[4].durationMs}ms
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Refresh / Toast Notice in Soft Rose/Burgundy */}
      {refreshNotice && (
        <div className="bg-[#fff1f2] border border-[#fecdd3] text-[#881337] px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#be123c] shrink-0" />
            <span className="font-medium">{refreshNotice}</span>
          </div>
          <button onClick={() => setRefreshNotice(null)} className="text-[#be123c] hover:text-[#881337]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Active Model Answer Key & Marking Scheme Card */}
      <div className="bg-white border-2 border-[#800020]/20 hover:border-[#800020]/40 rounded-2xl p-4 shadow-sm transition">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#fff1f2] text-[#800020] border border-[#fecdd3] flex items-center justify-center font-bold text-lg shrink-0">
              ✓
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase font-extrabold tracking-wider text-[#800020]">
                  Active Model Answer Key
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeModelKey.isCustom ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-[#fff1f2] text-[#881337] border border-[#fecdd3]'}`}>
                  {activeModelKey.isCustom ? '★ Custom Key Active' : 'Cambridge BIDMAS Default'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-800 mt-0.5">
                {activeModelKey.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowKeyPreview(!showKeyPreview)}
              className="px-2.5 py-1.5 rounded-lg border border-[#fecdd3] bg-[#fffcfd] hover:bg-[#fff1f2] text-xs font-semibold text-[#800020] transition flex items-center gap-1 shadow-2xs"
            >
              {showKeyPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{showKeyPreview ? 'Hide Key' : 'Preview Key'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingKeyTitle(activeModelKey.title);
                setEditingKeyText(activeModelKey.text);
                setIsModelKeyModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#800020] hover:bg-[#6b1226] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Change / Enter Model Answer</span>
            </button>
            {activeModelKey.isCustom && (
              <button
                type="button"
                onClick={handleResetModelKey}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-600 transition"
                title="Reset to default Cambridge BIDMAS model key"
              >
                Reset Default
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Key Preview */}
        {showKeyPreview && (
          <div className="mt-3 pt-3 border-t border-[#f5e1e5] animate-in fade-in">
            <pre className="text-xs font-mono bg-[#fffcfd] border border-[#fecdd3] p-3 rounded-xl text-slate-700 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {activeModelKey.text}
            </pre>
          </div>
        )}
      </div>

      {/* Main Upload / Test Control Panel (White & Burgundy Theme) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: File Upload & Student Details (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#f0d0d6] rounded-2xl p-5 shadow-sm space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-[#f5e1e5] pb-3">
              <h2 className="text-sm font-bold text-[#701a2d] flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-[#800020]" />
                Student Homework Submission
              </h2>
              <button
                onClick={handleResetPortal}
                className="text-[11px] text-slate-500 hover:text-[#800020] flex items-center gap-1 transition"
                title="Clear all uploaded files and old reports"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset &amp; Start Fresh</span>
              </button>
            </div>

            {/* Submission Mode Tabs */}
            <div className="flex rounded-xl bg-[#fcf5f7] p-1 border border-[#f5dbe1] gap-1">
              <button
                type="button"
                onClick={() => setInputMode('upload')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  inputMode === 'upload'
                    ? 'bg-[#800020] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#800020] hover:bg-[#fff1f2]'
                }`}
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>Upload PDF / Image</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode('type')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  inputMode === 'type'
                    ? 'bg-[#800020] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#800020] hover:bg-[#fff1f2]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Type Answers</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode('draw')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  inputMode === 'draw'
                    ? 'bg-[#800020] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#800020] hover:bg-[#fff1f2]'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Draw on Canvas</span>
              </button>
            </div>

            {/* Tab 1: File Upload Zone */}
            {inputMode === 'upload' && (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/*,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                  id="homework-file-upload"
                />

                {!selectedFile ? (
                  <label
                    htmlFor="homework-file-upload"
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#fecdd3] hover:border-[#800020] rounded-xl cursor-pointer bg-[#fffcfd] hover:bg-[#fff7f8] transition text-center group shadow-xs"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#fff1f2] text-[#800020] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform border border-[#fecdd3]">
                      <FileUp className="w-6 h-6" />
                    </div>
                    <span className="text-xs text-slate-800 font-bold">Choose student file or drag &amp; drop</span>
                    <span className="text-[11px] text-slate-500 mt-1">
                      Upload student worksheet (PDF, JPG, PNG, or TXT)
                    </span>
                    <span className="mt-2.5 text-[10px] text-[#800020] font-semibold bg-[#fff1f2] px-2.5 py-0.5 rounded-full border border-[#fecdd3]">
                      Graded dynamically against active Model Answer Key
                    </span>
                  </label>
                ) : (
                  <div className="bg-[#fff8f9] border border-[#fecdd3] p-3.5 rounded-xl space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-9 h-9 rounded-lg bg-[#fff1f2] text-[#800020] flex items-center justify-center shrink-0 border border-[#fecdd3]">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-[#701a2d] truncate">{selectedFile.name}</p>
                          <p className="text-[10px] text-emerald-700 font-medium">
                            {(selectedFile.size / 1024).toFixed(1)} KB • Ready for AI Checking
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="p-1.5 rounded-lg bg-white hover:bg-rose-100 text-slate-400 hover:text-rose-700 transition border border-[#fecdd3]"
                        title="Remove this file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between pt-1 text-[11px] border-t border-[#f8e1e5]">
                      <span className="text-slate-500">Status: Attached &amp; Validated</span>
                      <label
                        htmlFor="homework-file-upload"
                        className="text-[#800020] hover:text-[#5c0017] cursor-pointer font-bold"
                      >
                        Change File
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Type Student Answers Directly */}
            {inputMode === 'type' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-[#701a2d]">
                    Student Answers &amp; Working
                  </label>
                  <span className="text-[10px] text-slate-500">Type what the student wrote</span>
                </div>

                {/* Input helper controls */}
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Enter student's typed responses or transcription:</span>
                  {customTextWorking && (
                    <button
                      type="button"
                      onClick={() => setCustomTextWorking('')}
                      className="px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-semibold transition"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <textarea
                  value={customTextWorking}
                  onChange={(e) => setCustomTextWorking(e.target.value)}
                  placeholder={`Type or paste student answers here, for example:
Q1: 8 + 12 ÷ 4 = 8 + 3 = 11
Q2: 5 × (16 + 2 - 12) = 5 × 6 = 30
Q3: 25 + 11 = 36`}
                  rows={6}
                  className="w-full bg-[#fdfcfb] border border-[#e5d0d4] rounded-lg p-2.5 text-xs text-slate-800 outline-none focus:border-[#800020] font-mono leading-relaxed placeholder:text-slate-400"
                />
              </div>
            )}

            {/* Tab 3: Draw on Handwritten Canvas (CNN Equation Solver) */}
            {inputMode === 'draw' && (
              <div className="space-y-3">
                <HandwrittenEquationCanvas
                  onInsertAnswer={(equationResult) => {
                    setCustomTextWorking((prev) => {
                      const next = prev.trim() ? `${prev.trim()}\n${equationResult}` : equationResult;
                      return next;
                    });
                    setRefreshNotice(`Added "${equationResult}" from Handwritten Canvas into submission!`);
                  }}
                />
                {customTextWorking && (
                  <div className="p-3 bg-[#fff8f9] border border-[#fecdd3] rounded-lg text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-slate-600 text-[11px]">
                      <span className="font-semibold text-[#701a2d]">Accumulated Submission Answers:</span>
                      <button
                        type="button"
                        onClick={() => setInputMode('type')}
                        className="text-[#800020] hover:underline flex items-center gap-1 font-bold"
                      >
                        <span>Edit in Type View</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <pre className="font-mono text-[#881337] whitespace-pre-wrap text-[11px] bg-white p-2 rounded border border-[#fecdd3]">
                      {customTextWorking}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Student Info inputs */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Student Name</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Test Student"
                  className="w-full bg-[#fdfcfb] border border-[#e5d0d4] rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#800020] font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Student ID / Code</label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full bg-[#fdfcfb] border border-[#e5d0d4] rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#800020] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Target Curriculum &amp; Topic</label>
              <div className="bg-[#fdfaf8] border border-[#f0d0d6] rounded-lg p-2.5 text-xs text-slate-700 flex items-center justify-between">
                <span>{assignment}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#fff1f2] text-[#800020] font-bold border border-[#fecdd3]">
                  10 Marks
                </span>
              </div>
            </div>

            {/* Run Button in Burgundy */}
            <button
              onClick={handleCheckHomework}
              disabled={isGrading}
              className="w-full py-3.5 bg-gradient-to-r from-[#800020] via-[#9f1239] to-[#800020] hover:from-[#66001a] hover:to-[#800020] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-rose-950/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isGrading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Notebook AI is checking homework against mark scheme...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>
                    Check Homework with AI Notebook {studentName ? `(${studentName})` : ''}
                  </span>
                </>
              )}
            </button>

            {/* Delete / Clear button */}
            {selectedFile && (
              <button
                type="button"
                onClick={handleResetPortal}
                className="w-full py-2 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-[#e5d0d4] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Delete Uploaded Homework &amp; Reset</span>
              </button>
            )}
          </div>

          {/* Quick Info Box */}
          <div className="bg-[#fdfaf8] border border-[#f0d0d6] rounded-xl p-4 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 text-[#701a2d] font-bold">
              <BookOpen className="w-4 h-4 text-[#800020]" />
              <span>Marking Standard</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Every submission is evaluated against Cambridge IGCSE standards with rigorous method marks <strong>[M1]</strong> and accuracy marks <strong>[A1]</strong>.
            </p>
          </div>
        </div>

        {/* Right Column: AI Feedback Report (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {!report && !isGrading && (
            <div className="bg-white border border-[#f0d0d6] rounded-2xl p-10 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-full bg-[#fff1f2] text-[#800020] mx-auto flex items-center justify-center border border-[#fecdd3]">
                <FileCheck className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#701a2d]">Test Portal Ready for Homework Checking</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Upload a student homework file (PDF or photo) on the left, then click &ldquo;Check Homework with AI Notebook&rdquo; to generate the official evaluation report.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleCheckHomework}
                  className="px-5 py-2.5 bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Check Homework {studentName ? `for ${studentName}` : 'Now'}</span>
                </button>
              </div>
            </div>
          )}

          {isGrading && (
            <div className="bg-white border border-[#f0d0d6] rounded-2xl p-12 text-center space-y-4 shadow-sm">
              <Loader2 className="w-10 h-10 animate-spin text-[#800020] mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#701a2d]">Notebook Grading in Progress</h3>
                <p className="text-xs text-slate-500">
                  Matching student handwriting against Mr. Haitham Hussien&apos;s BIDMAS solution key...
                </p>
              </div>
              <div className="w-48 bg-rose-100 h-1.5 rounded-full mx-auto overflow-hidden">
                <div className="bg-[#800020] h-full w-2/3 animate-pulse"></div>
              </div>
            </div>
          )}

          {report && !isGrading && (
            <div className="bg-white border border-[#f0d0d6] rounded-2xl overflow-hidden shadow-xl animate-in fade-in space-y-4 text-slate-800">
              {/* NotebookLM Evaluation Report Header Bar in Burgundy */}
              <div className="bg-gradient-to-r from-[#701a2d] via-[#800020] to-[#590e1f] text-white p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-white/20 gap-2">
                  <span className="text-[11px] font-bold tracking-widest text-rose-200 uppercase">
                    {report.headerTitle || 'IGCSE MATHEMATICS — HOMEWORK EVALUATION REPORT'}
                  </span>
                  <span className="text-[11px] font-bold tracking-wider text-amber-300 uppercase">
                    {report.teacherName || 'MR. HAITHAM HUSSIEN'}
                  </span>
                </div>

                <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white math-serif tracking-tight">
                      {report.reportTitle || 'Student Homework Correction & Report'}
                    </h2>
                    <p className="text-xs text-rose-200 mt-0.5">
                      Cambridge IGCSE Curriculum Evaluation • {report.submissionDate}
                    </p>
                  </div>

                  {/* Actions & PDF Links */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {report.pdfUrl && (
                      <button
                        onClick={() => {
                          setPdfModalType('student');
                          setPdfModalUrl(report.pdfUrl || '/assets/aistudio/adam-bardana-homework-report_9fb73cfc.pdf');
                          setShowPdfModal(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-[#800020] hover:bg-rose-50 text-xs font-bold shadow-md transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Official PDF</span>
                      </button>
                    )}

                    {report.pdfUrl && (
                      <a
                        href={report.pdfUrl}
                        download={`${(report.studentName || 'student').toLowerCase().replace(/\s+/g, '-')}-evaluation-report.pdf`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold border border-white/25 transition"
                        title="Download official PDF report"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </a>
                    )}

                    <button
                      onClick={handleResetPortal}
                      className="p-2 text-rose-200 hover:text-white rounded-lg hover:bg-white/10 transition"
                      title="Clear and test another student"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* NotebookLM Information Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/20">
                  <div className="bg-white/10 p-2.5 rounded-lg border border-white/15">
                    <span className="text-[10px] uppercase font-bold text-rose-200 block tracking-wider">
                      Student Name
                    </span>
                    <span className="text-sm font-extrabold text-white mt-0.5 block truncate">
                      {report.studentName}
                    </span>
                  </div>

                  <div className="bg-white/10 p-2.5 rounded-lg border border-white/15">
                    <span className="text-[10px] uppercase font-bold text-rose-200 block tracking-wider">
                      Subject &amp; Topic
                    </span>
                    <span className="text-xs font-semibold text-rose-100 mt-0.5 block truncate">
                      {report.subject} • {report.topic || 'BIDMAS'}
                    </span>
                  </div>

                  <div className="bg-white/10 p-2.5 rounded-lg border border-white/15">
                    <span className="text-[10px] uppercase font-bold text-rose-200 block tracking-wider">
                      Instructor &amp; Chapter
                    </span>
                    <span className="text-xs font-semibold text-rose-100 mt-0.5 block truncate">
                      {report.teacherName} • {report.chapter || 'Chapter 1'}
                    </span>
                  </div>

                  <div className="bg-white/10 p-2.5 rounded-lg border border-white/15 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-rose-200 block tracking-wider">
                        Score &amp; Grade
                      </span>
                      <span className="text-sm font-black text-amber-300 mt-0.5 block">
                        {report.earnedMarks} / {report.totalMarks} ({report.percentage}%)
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                        report.percentage >= 80
                          ? 'bg-emerald-500 text-white'
                          : report.percentage >= 60
                          ? 'bg-amber-400 text-amber-950'
                          : 'bg-rose-500 text-white'
                      }`}
                    >
                      {report.grade}
                    </span>
                  </div>
                </div>
              </div>

              {/* View Style Switcher & Question Filters */}
              <div className="px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-1.5 bg-[#fcf5f7] p-1 rounded-lg border border-[#f5dbe1]">
                  <button
                    onClick={() => setViewStyle('notebookTable')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                      viewStyle === 'notebookTable'
                        ? 'bg-[#800020] text-white shadow-sm'
                        : 'text-slate-600 hover:text-[#800020]'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>NotebookLM Table</span>
                  </button>
                  <button
                    onClick={() => setViewStyle('detailedCards')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                      viewStyle === 'detailedCards'
                        ? 'bg-[#800020] text-white shadow-sm'
                        : 'text-slate-600 hover:text-[#800020]'
                    }`}
                  >
                    <ListIcon className="w-3.5 h-3.5" />
                    <span>Detailed Step Cards</span>
                  </button>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setQuestionFilter('all')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                      questionFilter === 'all'
                        ? 'bg-[#fff1f2] text-[#800020] border border-[#fecdd3]'
                        : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    All ({report.questions.length})
                  </button>
                  <button
                    onClick={() => setQuestionFilter('correct')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                      questionFilter === 'correct'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    Correct ({report.questions.filter((q) => q.status === 'correct').length})
                  </button>
                  <button
                    onClick={() => setQuestionFilter('review')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                      questionFilter === 'review'
                        ? 'bg-rose-50 text-rose-800 border border-rose-300'
                        : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    Incorrect ({report.questions.filter((q) => q.status !== 'correct').length})
                  </button>
                </div>
              </div>

              {/* 1. Question-by-Question Marking Breakdown */}
              <div className="px-5 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-[#f5e1e5]">
                  <h3 className="font-bold text-[#701a2d] text-sm flex items-center gap-2">
                    <span>1. Question-by-Question Marking Breakdown</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      (Total Marks: {report.earnedMarks} / {report.totalMarks})
                    </span>
                  </h3>
                  {viewStyle === 'detailedCards' && (
                    <button
                      onClick={() => setExpandedQuestion(expandedQuestion === -1 ? null : -1)}
                      className="text-[#800020] hover:underline text-[11px] whitespace-nowrap font-semibold"
                    >
                      {expandedQuestion === -1 ? 'Collapse All' : 'Expand All'}
                    </button>
                  )}
                </div>

                {/* VIEW MODE 1: Exact NotebookLM Report Table in White & Burgundy */}
                {viewStyle === 'notebookTable' ? (
                  <div className="overflow-x-auto border border-[#f0d0d6] rounded-xl bg-white shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#fdf5f6] text-[#701a2d] uppercase text-[10px] tracking-wider border-b border-[#f0d0d6]">
                          <th className="py-3 px-3 w-[60px] font-bold text-center">Q#</th>
                          <th className="py-3 px-3 font-bold">Topic / Expression</th>
                          <th className="py-3 px-3 w-[80px] font-bold text-center">Mark</th>
                          <th className="py-3 px-3 w-[110px] font-bold text-center">Status</th>
                          <th className="py-3 px-4 font-bold">Student Answer / Error Analysis</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f5e1e5]">
                        {report.questions
                          .filter((q) => {
                            if (questionFilter === 'correct') return q.status === 'correct';
                            if (questionFilter === 'review') return q.status !== 'correct';
                            return true;
                          })
                          .map((q, idx) => {
                            const isCorrect = q.status === 'correct';
                            const isSelected = expandedQuestion === q.questionNumber;

                            return (
                              <React.Fragment key={q.questionNumber}>
                                <tr
                                  onClick={() =>
                                    setExpandedQuestion(isSelected ? null : q.questionNumber)
                                  }
                                  className={`cursor-pointer transition-colors ${
                                    idx % 2 === 0 ? 'bg-white' : 'bg-[#fdfafb]'
                                  } hover:bg-[#fff5f6] ${isSelected ? 'ring-1 ring-[#800020]' : ''}`}
                                >
                                  {/* Q# */}
                                  <td className="py-3 px-3 font-mono font-bold text-center text-[#701a2d]">
                                    {q.displayLabel || `Q${q.questionNumber}`}
                                  </td>

                                  {/* Topic / Expression */}
                                  <td className="py-3 px-3 font-medium text-slate-800 font-mono">
                                    {q.topicExpression || q.prompt}
                                  </td>

                                  {/* Mark */}
                                  <td className="py-3 px-3 font-mono font-bold text-center text-slate-700">
                                    {q.earnedMarks}/{q.maxMarks}
                                  </td>

                                  {/* Status */}
                                  <td className="py-3 px-3 text-center">
                                    <span
                                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black tracking-wide ${
                                        isCorrect
                                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                          : 'bg-rose-50 text-[#800020] border border-rose-300'
                                      }`}
                                    >
                                      {q.statusLabel || (isCorrect ? 'CORRECT' : 'INCORRECT')}
                                    </span>
                                  </td>

                                  {/* Student Answer / Error Analysis */}
                                  <td className="py-3 px-4 text-xs text-slate-700 leading-snug">
                                    <span
                                      className={
                                        !isCorrect ? 'text-[#800020] font-medium' : 'text-slate-700'
                                      }
                                    >
                                      {q.errorAnalysis || q.teacherFeedback}
                                    </span>
                                  </td>
                                </tr>

                                {/* Expanded Detail Drawer on Table Row Click */}
                                {isSelected && (
                                  <tr className="bg-[#fff9fa]">
                                    <td colSpan={5} className="p-3 border-t border-b border-[#f5e1e5]">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                        <div className="bg-white p-2.5 rounded-lg border border-[#fecdd3]">
                                          <span className="text-[10px] uppercase font-bold text-[#800020] block mb-1">
                                            Student Working Found:
                                          </span>
                                          <p className="font-mono text-slate-800 font-semibold">{q.studentWorkingFound}</p>
                                        </div>
                                        <div className="bg-white p-2.5 rounded-lg border border-[#fecdd3]">
                                          <span className="text-[10px] uppercase font-bold text-[#800020] block mb-1">
                                            Official Model Answer ({q.markSchemeRef}):
                                          </span>
                                          <p className="font-mono text-[#701a2d] font-semibold">{q.modelSolution}</p>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* VIEW MODE 2: Card-based Detailed Breakdown */
                  <div className="space-y-2">
                    {report.questions
                      .filter((q) => {
                        if (questionFilter === 'correct') return q.status === 'correct';
                        if (questionFilter === 'review') return q.status !== 'correct';
                        return true;
                      })
                      .map((q) => {
                        const isExpanded =
                          expandedQuestion === -1 || expandedQuestion === q.questionNumber;
                        const isFull = q.earnedMarks === q.maxMarks;

                        return (
                          <div
                            key={q.questionNumber}
                            className={`border rounded-xl transition overflow-hidden ${
                              isFull
                                ? 'bg-white border-[#f0d0d6] hover:border-emerald-500/50'
                                : 'bg-[#fffcfd] border-[#fecdd3] hover:border-[#800020]'
                            }`}
                          >
                            <div
                              onClick={() =>
                                setExpandedQuestion(
                                  expandedQuestion === q.questionNumber ? null : q.questionNumber
                                )
                              }
                              className="p-3 flex items-center justify-between cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`min-w-8 px-2 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    isFull
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                      : 'bg-rose-50 text-[#800020] border border-rose-300'
                                  }`}
                                >
                                  {q.displayLabel || `Q${q.questionNumber}`}
                                </span>
                                <div>
                                  <span className="text-xs font-semibold text-slate-800">
                                    {q.topicExpression || q.prompt}
                                  </span>
                                  <span className="text-[10px] text-slate-400 ml-2 font-mono">
                                    ({q.paperRef})
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                                    isFull
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                      : 'bg-rose-50 text-[#800020] border border-rose-300'
                                  }`}
                                >
                                  +{q.earnedMarks}/{q.maxMarks}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-slate-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="px-4 pb-3.5 pt-1 border-t border-[#f5e1e5] text-xs space-y-2 bg-[#fdfafb]">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                  <div className="bg-white p-2.5 rounded-lg border border-[#fecdd3]">
                                    <span className="text-[10px] uppercase font-bold text-[#800020] block mb-1">
                                      Student Working Detected:
                                    </span>
                                    <p className="font-mono text-slate-800 text-xs font-semibold">
                                      {q.studentWorkingFound}
                                    </p>
                                  </div>
                                  <div className="bg-white p-2.5 rounded-lg border border-[#fecdd3]">
                                    <span className="text-[10px] uppercase font-bold text-[#800020] block mb-1">
                                      Model Answer ({q.markSchemeRef}):
                                    </span>
                                    <p className="font-mono text-[#701a2d] text-xs font-semibold">
                                      {q.modelSolution}
                                    </p>
                                  </div>
                                </div>
                                <div className="bg-[#fff1f2] border border-[#fecdd3] p-2.5 rounded-lg text-[11px] text-[#701a2d]">
                                  <strong className="text-[#800020]">Marking Note: </strong>
                                  {q.errorAnalysis || q.teacherFeedback}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* 2. Diagnostic Review & Mistake Analysis */}
              <div className="px-5">
                <div className="bg-[#fffcfd] border border-[#f5e1e5] rounded-xl p-4 space-y-2 shadow-xs">
                  <h3 className="font-bold text-[#701a2d] text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#800020]"></span>
                    <span>2. Diagnostic Review &amp; Mistake Analysis</span>
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed font-sans">
                    {report.diagnosticReview || report.generalFeedback}
                  </p>
                </div>
              </div>

              {/* 3. Personalized Action Plan & Next Steps */}
              <div className="px-5 pb-2">
                <div className="bg-[#fffcfd] border border-[#f5e1e5] rounded-xl p-4 space-y-2.5 shadow-xs">
                  <h3 className="font-bold text-[#701a2d] text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span>3. Personalized Action Plan &amp; Next Steps</span>
                  </h3>

                  <div className="space-y-2 text-xs">
                    {report.actionPlan && report.actionPlan.length > 0 ? (
                      report.actionPlan.map((action, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-[#f5e1e5]"
                        >
                          <span className="text-emerald-700 font-bold mt-0.5">•</span>
                          <div>
                            <strong className="text-[#701a2d] mr-1.5 font-bold">
                              {action.title}:
                            </strong>
                            <span className="text-slate-700">{action.detail}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      report.recommendedNextSteps.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-[#f5e1e5]"
                        >
                          <span className="text-emerald-700 font-bold mt-0.5">•</span>
                          <span className="text-slate-700">{step}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Teacher Haitham's Humane Encouragement Note */}
              <div className="px-5 pb-3">
                <div className="bg-gradient-to-br from-[#fffdfa] via-[#fffbf2] to-[#fffdfa] border border-[#eedac5] rounded-xl p-4 relative overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between pb-2 border-b border-[#f3d9b8] mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[#800020] font-serif text-lg font-bold">✍️</span>
                      <h4 className="text-xs font-bold text-[#701a2d] uppercase tracking-wider font-sans">
                        Teacher Haitham&apos;s Humane Mentorship Note
                      </h4>
                    </div>
                    <span className="text-[10px] text-[#800020] font-mono px-2 py-0.5 rounded bg-white border border-[#eedac5] font-bold">
                      Cambridge IGCSE Mentor Stamp
                    </span>
                  </div>

                  <p className="teacher-handwriting text-xl text-[#701a2d] leading-relaxed">
                    &ldquo;Dear {report.studentName || 'Student'}, remember that getting a calculation wrong is never an endpoint — it is our clearest map of where to shine the spotlight next! With BIDMAS, always train your eyes to isolate brackets first. You are making real, tangible progress. Keep practicing with patience and curious persistence.&rdquo;
                  </p>

                  <div className="mt-2 pt-2 border-t border-[#f3d9b8] flex items-center justify-between text-[11px] text-slate-600">
                    <span className="font-serif italic font-semibold text-[#800020]">— Mr. Haitham Hussien, Cambridge Mathematics Specialist</span>
                    <span className="font-mono text-[10px] text-slate-500">NotebookLM Diagnostic Engine Verified</span>
                  </div>
                </div>
              </div>

              {/* Bottom Interactive Student Q&A Box */}
              <div className="p-4 bg-[#fcf8f9] border-t border-[#f0d0d6] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#701a2d] flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-[#800020]" />
                    Have a question about your marks or any step?
                  </span>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-[#800020] px-2 py-1 rounded hover:bg-white transition"
                  >
                    <Printer className="w-3 h-3" /> Print Report
                  </button>
                </div>

                <form onSubmit={handleAskTutor} className="flex gap-2">
                  <input
                    type="text"
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                    placeholder="Ask Mr. Haitham Hussien AI Tutor (e.g. Why did Question 7 violate BIDMAS?)..."
                    className="flex-1 bg-white text-slate-800 text-xs px-3 py-2 rounded-lg border border-[#e5d0d4] outline-none focus:border-[#800020] shadow-xs"
                  />
                  <button
                    type="submit"
                    disabled={!studentQuery.trim() || isAskingTutor}
                    className="px-3.5 py-2 bg-[#800020] hover:bg-[#68001a] text-white rounded-lg text-xs font-bold disabled:opacity-40 transition shadow-xs"
                  >
                    {isAskingTutor ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ask Tutor'}
                  </button>
                </form>

                {tutorReply && (
                  <div className="p-3 bg-white border border-[#f0d0d6] rounded-lg text-xs text-slate-800 mt-2 leading-relaxed shadow-xs">
                    <div className="font-bold text-[#800020] mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#be123c]" /> Tutor Response:
                    </div>
                    {tutorReply}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PDF Viewer Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-[#e6ccd2] rounded-xl max-w-5xl w-full h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-3.5 border-b border-[#f0d8dd] bg-[#fffdfa]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#800020]" />
                <span className="font-bold text-slate-900 text-sm font-serif">
                  {pdfModalType === 'student' || pdfModalType === 'adam'
                    ? `${report?.studentName || 'Student'} — Homework Evaluation Report`
                    : pdfModalType === 'joury'
                    ? 'Joury — Official Evaluation Report'
                    : 'Cambridge IGCSE Model Answer Key (Order of Operations)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={pdfModalUrl}
                  download
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-[#800020] hover:bg-[#6b1226] text-white rounded-lg font-semibold shadow-xs transition"
                >
                  <Download className="w-3 h-3" /> Download
                </a>
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-900 rounded-lg hover:bg-[#fdf4f6] font-medium"
                >
                  Close ✕
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[#fdfafb] p-2 overflow-hidden flex items-center justify-center">
              <iframe
                src={pdfModalUrl}
                className="w-full h-full rounded border border-[#edd7dc]"
                title="NotebookLM PDF Document Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Model Answer Key Editor / Uploader Modal */}
      {isModelKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-[#e6ccd2] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-800">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#f0d8dd] bg-[#fffdfa]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#fff1f2] text-[#800020] flex items-center justify-center border border-[#fecdd3]">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#701a2d]">
                    Model Answer Key &amp; Mark Scheme Manager
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Define any custom assignment answer key; homework will be dynamically graded against it.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModelKeyModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#fdf2f4] text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {/* Template Quick Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Choose a Starting Template or Upload
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {Object.entries(MODEL_KEY_TEMPLATES).map(([key, tmpl]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectTemplate(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        selectedTemplate === key
                          ? 'bg-[#800020] text-white border-[#800020] shadow-xs'
                          : 'bg-[#fffcfd] text-slate-700 border-[#edd7dc] hover:bg-[#fff1f2] hover:text-[#800020]'
                      }`}
                    >
                      {tmpl.title.split('—')[0].trim()}
                    </button>
                  ))}

                  <input
                    ref={keyFileInputRef}
                    type="file"
                    accept=".txt,.md,.text"
                    onChange={handleUploadKeyFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => keyFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#fff8f9] text-[#800020] border border-[#fecdd3] hover:bg-[#ffe4e6] transition flex items-center gap-1.5 shadow-2xs"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Import .txt / .md Key File</span>
                  </button>
                </div>
              </div>

              {/* Assignment Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assignment Title / Curriculum Topic
                </label>
                <input
                  type="text"
                  value={editingKeyTitle}
                  onChange={(e) => setEditingKeyTitle(e.target.value)}
                  placeholder="e.g. Chapter 3: Linear Equations & Algebra"
                  className="w-full bg-[#fdfcfb] border border-[#e5d0d4] rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#800020] font-medium"
                />
              </div>

              {/* Model Answer Key Text */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Solution Key &amp; Mark Scheme Content
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Include questions, method marks [M1], and final answers [A1]
                  </span>
                </div>
                <textarea
                  value={editingKeyText}
                  onChange={(e) => setEditingKeyText(e.target.value)}
                  placeholder={`QUESTION 1 [1 Mark]\nWork out: 2x + 5 = 15\nModel Answer: 2x = 10 -> x = 5\nMark Scheme: [1 Mark] Final answer x = 5`}
                  rows={14}
                  className="w-full bg-[#fdfcfb] border border-[#e5d0d4] rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-[#800020] font-mono leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#f0d8dd] bg-[#fffdfa] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetModelKey}
                className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium transition"
              >
                Reset to Default BIDMAS
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModelKeyModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#edd7dc] text-slate-600 hover:bg-[#fff5f6] text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveModelKey(editingKeyTitle, editingKeyText)}
                  disabled={!editingKeyText.trim()}
                  className="px-5 py-2 rounded-lg bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold transition shadow-xs disabled:opacity-40"
                >
                  Save &amp; Set as Active Model Answer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
