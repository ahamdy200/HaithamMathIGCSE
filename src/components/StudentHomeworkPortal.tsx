import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { HomeworkGradingReport } from '../types';
import { HandwrittenEquationCanvas } from './HandwrittenEquationCanvas';

interface StudentHomeworkPortalProps {
  onSwitchToNotebook?: () => void;
  onSwitchToModelKey?: () => void;
}

export const StudentHomeworkPortal: React.FC<StudentHomeworkPortalProps> = ({
  onSwitchToNotebook,
  onSwitchToModelKey,
}) => {
  // Portal starts clean for uploading student homework
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState(`IGCSE-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [assignment, setAssignment] = useState('Chapter 1: Numbers — Lesson 1: Order of Operations (BIDMAS)');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string | null>(null);
  const [customTextWorking, setCustomTextWorking] = useState<string>('');
  const [inputMode, setInputMode] = useState<'upload' | 'type' | 'draw'>('upload');
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [report, setReport] = useState<HomeworkGradingReport | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfModalType, setPdfModalType] = useState<'student' | 'model' | 'joury' | 'adam' | 'custom'>('adam');
  const [pdfModalUrl, setPdfModalUrl] = useState<string>('/assets/aistudio/adam-bardana-homework-report_9fb73cfc.pdf');
  const [viewStyle, setViewStyle] = useState<'notebookTable' | 'detailedCards'>('notebookTable');
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [questionFilter, setQuestionFilter] = useState<'all' | 'correct' | 'review'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

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
          assignment,
          submissionText,
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
          setPdfModalType('adam');
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

  // Test Case: Q1 & Q2 Correct, Q3 & Q4 Mistakes (2/10 Marks, 20% Grade U)
  const handleLoadQ1Q2CorrectQ3Q4Mistakes = () => {
    const textWorking = `1. because he added first instead of dividing\n2. 30\n3. 25\n4. 23 - 3 = 20 * 3 = 60\n(Questions 5, 6, 7 left unattempted)`;
    const testName = 'Test Student (Q1-Q2 Correct, Q3-Q4 Wrong)';
    setStudentName(testName);
    setSelectedFile(null);
    setFileBase64(null);
    setFileMimeType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setCustomTextWorking(textWorking);
    setInputMode('type');
    setRefreshNotice('Loaded Test: Q1 & Q2 Correct, Q3 & Q4 Mistakes (Expected: 2 / 10 Marks, 20% Grade U). Grading now...');
    handleCheckHomeworkForStudent(testName, 'Student_Typed_Answers.txt', 'custom', textWorking);
  };

  // Test Case: Q1 & Q2 Correct, Q3 & Q4 Mistakes, Q5-Q7 Correct (7/10 Marks, 70% Grade B)
  const handleLoadQ1Q2CorrectMistakesRestCorrect = () => {
    const textWorking = `1. because he added first instead of dividing\n2. 30\n3. 25\n4. 23 - 3 = 20 * 3 = 60\n5a. 4 + 9 * (6 - 4) = 22\n5b. 24 / (12 - 8 + 2) = 4\n6a. (10 - 4) / 2 + 18 = 21\n6b. 7 * (3 + 1) + 2 = 30\n7. 2 + 8(35) = 282`;
    const testName = 'Test Student (Q1-Q2 Correct, Q3-Q4 Wrong, Rest Correct)';
    setStudentName(testName);
    setSelectedFile(null);
    setFileBase64(null);
    setFileMimeType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setCustomTextWorking(textWorking);
    setInputMode('type');
    setRefreshNotice('Loaded Test: Q1 & Q2 Correct, Q3 & Q4 Mistakes, Rest Correct (Expected: 7 / 10 Marks, 70% Grade B). Grading now...');
    handleCheckHomeworkForStudent(testName, 'Student_Typed_Answers.txt', 'custom', textWorking);
  };

  const handleLoadAdamBardana = () => {
    setStudentName('Adam Bardana');
    const mockFile = new File(['Adam Bardana Homework Submission'], 'adam bardana.pdf', {
      type: 'application/pdf',
    });
    setSelectedFile(mockFile);
    setCustomTextWorking('');
    setPdfModalUrl('/assets/aistudio/adam-bardana-homework-report_9fb73cfc.pdf');
    setPdfModalType('adam');
    setRefreshNotice('Loaded "adam bardana.pdf" (NotebookLM 5/10 Reference Report). Checking homework now...');
    handleCheckHomeworkForStudent('Adam Bardana', 'adam bardana.pdf', 'adam_sample');
  };

  const handleLoadTwoWrongAnswersTest = () => {
    const wrongAnswersText = `1. Mike is right because 8 + 12 = 20, 20 / 4 = 5\n2. 50\n(Questions 3 to 7 left blank / unattempted)`;
    const testName = 'Test Student (2 Wrong Answers)';
    setStudentName(testName);
    setSelectedFile(null);
    setFileBase64(null);
    setFileMimeType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setCustomTextWorking(wrongAnswersText);
    setInputMode('type');
    setRefreshNotice('Loaded 2 wrong answers test (Expected: 0 / 10 Marks, 0% Grade U). Grading now...');
    handleCheckHomeworkForStudent(testName, 'Student_Typed_Answers.txt', 'custom', wrongAnswersText);
  };

  const handleLoadAllCorrectTest = () => {
    const allCorrectText = `1. because he added first instead of dividing\n2. 30\n3. 36\n4. 196\n5a. 4 + 9 * (6 - 4) = 22\n5b. 24 / (12 - 8 + 2) = 4\n6a. (10 - 4) / 2 + 18 = 21\n6b. 7 * (3 + 1) + 2 = 30\n7. 2 + 8(35) = 282`;
    const testName = 'Model Student (10/10 Correct)';
    setStudentName(testName);
    setSelectedFile(null);
    setFileBase64(null);
    setFileMimeType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setCustomTextWorking(allCorrectText);
    setInputMode('type');
    setRefreshNotice('Loaded 10/10 all correct test answers (Expected: 10 / 10 Marks, 100% Grade A*). Grading now...');
    handleCheckHomeworkForStudent(testName, 'Student_Typed_Answers.txt', 'custom', allCorrectText);
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
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1c2333] via-[#1f273b] to-[#1c2333] border border-[#333d52] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-inner">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold uppercase tracking-wider">
                  Cambridge IGCSE Mathematics
                </span>
                <span className="text-xs text-gray-400">• Teacher: Mr. Haitham Hussien</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
                Student Homework AI Checking &amp; Feedback Portal
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Upload student homework worksheets to receive instant, step-by-step marking against the official Cambridge mark scheme.
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={handleLoadQ1Q2CorrectQ3Q4Mistakes}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 text-xs font-semibold border border-amber-500/50 transition shadow-sm"
              title="Test: Q1 & Q2 Correct, Q3 & Q4 Mistakes, rest unattempted (Scores 2/10, 20% Grade U)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Test: Q1 &amp; Q2 Correct, Q3 &amp; Q4 Mistakes (2/10)</span>
            </button>

            <button
              onClick={handleLoadAdamBardana}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-semibold border border-indigo-500/50 transition shadow-sm"
              title="Test with Adam Bardana (NotebookLM Evaluation Report 5/10)"
            >
              <FileCheck className="w-3.5 h-3.5 text-indigo-300" />
              <span>NotebookLM (5/10 Reference)</span>
            </button>

            <button
              onClick={handleResetPortal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600/25 hover:bg-blue-600/40 text-blue-300 text-xs font-semibold border border-blue-500/50 transition shadow-sm"
              title="Clear old reports and refresh test portal for a new student submission"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh Test Portal</span>
            </button>

            <button
              onClick={() => {
                setPdfModalType('model');
                setPdfModalUrl('/assets/aistudio/order-of-operations-model-answer-key_202610250939_18187_be349899.pdf');
                setShowPdfModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#252c3d] hover:bg-[#2f384d] text-emerald-400 text-xs font-medium border border-[#374259] transition shadow-sm"
            >
              <FileCheck className="w-4 h-4" />
              <span>Model Answer Key (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Refresh / Toast Notice */}
      {refreshNotice && (
        <div className="bg-blue-500/10 border border-blue-500/30 text-blue-200 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{refreshNotice}</span>
          </div>
          <button onClick={() => setRefreshNotice(null)} className="text-gray-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Upload / Test Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: File Upload & Student Details (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#1e222a] border border-[#333842] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#2b303a] pb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-blue-400" />
                Student Homework Submission
              </h2>
              <button
                onClick={handleResetPortal}
                className="text-[11px] text-gray-400 hover:text-rose-400 flex items-center gap-1 transition"
                title="Clear all uploaded files and old reports"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset &amp; Start Fresh</span>
              </button>
            </div>

            {/* Submission Mode Tabs */}
            <div className="flex rounded-lg bg-[#14161d] p-1 border border-[#2b3345] gap-1">
              <button
                type="button"
                onClick={() => setInputMode('upload')}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  inputMode === 'upload'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>Upload PDF / Image</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode('type')}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  inputMode === 'type'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Type Answers</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode('draw')}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  inputMode === 'draw'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <PenTool className="w-3.5 h-3.5 text-purple-300" />
                <span>Draw on Canvas (CNN)</span>
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
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#3e4759] hover:border-blue-400 rounded-xl cursor-pointer bg-[#13161c] hover:bg-[#161a22] transition text-center group"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <FileUp className="w-6 h-6" />
                    </div>
                    <span className="text-xs text-white font-semibold">Choose file or drag &amp; drop</span>
                    <span className="text-[11px] text-gray-400 mt-1">
                      Upload student homework PDF (e.g. <code>adam bardana.pdf</code>) or photos
                    </span>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleLoadAdamBardana();
                        }}
                        className="px-2.5 py-1 rounded bg-[#1e2535] hover:bg-blue-600/30 text-blue-300 text-[11px] font-medium border border-[#333d52] transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        <span>Quick Test with <strong>adam bardana.pdf</strong></span>
                      </button>
                    </div>
                  </label>
                ) : (
                  <div className="bg-[#151c28] border border-blue-500/50 p-3.5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-white truncate">{selectedFile.name}</p>
                          <p className="text-[10px] text-emerald-400 font-medium">
                            {(selectedFile.size / 1024).toFixed(1)} KB • Ready for AI Checking
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="p-1.5 rounded-lg bg-[#242b3b] hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition"
                        title="Remove this file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between pt-1 text-[11px] border-t border-[#263147]">
                      <span className="text-gray-400">Status: Attached &amp; Validated</span>
                      <label
                        htmlFor="homework-file-upload"
                        className="text-blue-400 hover:text-blue-300 cursor-pointer font-medium"
                      >
                        Change File
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Type Student Answers Directly (Open & Visible) */}
            {inputMode === 'type' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-gray-300">
                    Student Answers &amp; Working
                  </label>
                  <span className="text-[10px] text-gray-400">Type what the student wrote</span>
                </div>

                {/* Quick Presets for instant testing */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleLoadQ1Q2CorrectQ3Q4Mistakes}
                    className="px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/50 text-amber-200 text-[11px] font-semibold transition flex items-center gap-1 shadow-sm"
                    title="Load Q1 & Q2 correct with Q3 & Q4 mistakes, rest unattempted (Scores 2/10, 20% Grade U)"
                  >
                    <span>🟡 Test: Q1 &amp; Q2 Correct, Q3 &amp; Q4 Mistakes (2/10)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadQ1Q2CorrectMistakesRestCorrect}
                    className="px-2.5 py-1 rounded-md bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-500/50 text-indigo-200 text-[11px] font-semibold transition flex items-center gap-1 shadow-sm"
                    title="Load Q1 & Q2 correct, Q3 & Q4 mistakes, and Q5-Q7 correct (Scores 7/10, 70% Grade B)"
                  >
                    <span>🟡 Test: Q1-Q2 Correct, Q3-Q4 Mistakes, Rest Correct (7/10)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadTwoWrongAnswersTest}
                    className="px-2.5 py-1 rounded-md bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-[11px] font-semibold transition flex items-center gap-1"
                    title="Load 2 wrong answers with questions 3-7 unattempted (Should score 0/10)"
                  >
                    <span>🔴 Test: 2 Wrong (0/10)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadAllCorrectTest}
                    className="px-2.5 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold transition flex items-center gap-1"
                    title="Load all 9 questions correct (10/10)"
                  >
                    <span>🟢 Test: All 10/10 Correct</span>
                  </button>
                  {customTextWorking && (
                    <button
                      type="button"
                      onClick={() => setCustomTextWorking('')}
                      className="px-2 py-1 rounded-md bg-[#252a35] hover:bg-[#2e3442] text-gray-400 text-[10px] transition"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <textarea
                  value={customTextWorking}
                  onChange={(e) => setCustomTextWorking(e.target.value)}
                  placeholder={`Type student answers here for testing, for example:
Q1: Mike is right because 8+12=20, 20/4=5
Q2: 50
(All other questions left unattempted)`}
                  rows={5}
                  className="w-full bg-[#121419] border border-[#2d3340] rounded-lg p-2.5 text-xs text-white outline-none focus:border-blue-500 font-mono leading-relaxed placeholder:text-gray-500"
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
                  <div className="p-3 bg-[#11141c] border border-[#2b3243] rounded-lg text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-gray-400 text-[11px]">
                      <span className="font-semibold text-gray-300">Accumulated Submission Answers:</span>
                      <button
                        type="button"
                        onClick={() => setInputMode('type')}
                        className="text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1 font-medium"
                      >
                        <span>Edit in Type View</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <pre className="font-mono text-purple-200 whitespace-pre-wrap text-[11px] bg-[#0d1017] p-2 rounded border border-[#222838]">
                      {customTextWorking}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Student Info inputs */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Student Name</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Test Student"
                  className="w-full bg-[#14161a] border border-[#333842] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Student ID / Code</label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full bg-[#14161a] border border-[#333842] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">Target Curriculum &amp; Topic</label>
              <div className="bg-[#14161a] border border-[#333842] rounded-lg p-2.5 text-xs text-gray-200 flex items-center justify-between">
                <span>{assignment}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                  10 Marks
                </span>
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={handleCheckHomework}
              disabled={isGrading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
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
                className="w-full py-2 bg-[#171a21] hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 border border-[#2b303d] hover:border-rose-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Delete Uploaded Homework &amp; Reset</span>
              </button>
            )}
          </div>

          {/* Quick Info Box */}
          <div className="bg-[#14161a] border border-[#2b303a] rounded-xl p-4 text-xs text-gray-400 space-y-2">
            <div className="flex items-center gap-2 text-gray-200 font-semibold">
              <BookOpen className="w-4 h-4 text-emerald-400" />
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
            <div className="bg-[#1e222a] border border-[#333842] rounded-xl p-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-blue-500/10 text-blue-400 mx-auto flex items-center justify-center border border-blue-500/20">
                <FileCheck className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">Test Portal Ready for Homework Checking</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Upload a student homework file (PDF or photo) on the left, then click &ldquo;Check Homework with AI Notebook&rdquo; to generate the official evaluation report.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleCheckHomework}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Check Homework {studentName ? `for ${studentName}` : 'Now'}</span>
                </button>
              </div>
            </div>
          )}

          {isGrading && (
            <div className="bg-[#1e222a] border border-[#333842] rounded-xl p-12 text-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-blue-400 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">Notebook Grading in Progress</h3>
                <p className="text-xs text-gray-400">
                  Matching student handwriting against Mr. Haitham Hussien&apos;s BIDMAS solution key...
                </p>
              </div>
              <div className="w-48 bg-[#14161a] h-1.5 rounded-full mx-auto overflow-hidden">
                <div className="bg-blue-500 h-full w-2/3 animate-pulse"></div>
              </div>
            </div>
          )}

          {report && !isGrading && (
            <div className="bg-[#1e222a] border border-[#333842] rounded-xl overflow-hidden shadow-2xl animate-in fade-in space-y-4">
              {/* NotebookLM Evaluation Report Header Bar */}
              <div className="bg-[#141824] border-b border-[#2d374d] p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-[#262f43] gap-2">
                  <span className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">
                    {report.headerTitle || 'IGCSE MATHEMATICS — HOMEWORK EVALUATION REPORT'}
                  </span>
                  <span className="text-[11px] font-bold tracking-wider text-blue-400 uppercase">
                    {report.teacherName || 'MR. HAITHAM HUSSIEN'}
                  </span>
                </div>

                <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {report.reportTitle || 'Student Homework Correction & Report'}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Cambridge IGCSE Curriculum Evaluation • {report.submissionDate}
                    </p>
                  </div>

                  {/* Actions & PDF Links */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {report.pdfUrl && (
                      <button
                        onClick={() => {
                          setPdfModalType('adam');
                          setPdfModalUrl(report.pdfUrl || '/assets/aistudio/adam-bardana-homework-report_9fb73cfc.pdf');
                          setShowPdfModal(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View NotebookLM PDF</span>
                      </button>
                    )}

                    {report.pdfUrl && (
                      <a
                        href={report.pdfUrl}
                        download="adam-bardana-homework-report.pdf"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#252c3d] hover:bg-[#2f384d] text-blue-300 text-xs font-semibold border border-[#374259] transition"
                        title="Download official PDF report"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </a>
                    )}

                    <button
                      onClick={handleResetPortal}
                      className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#202738] border border-transparent hover:border-[#374259] transition"
                      title="Clear and test another student"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* NotebookLM Information Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#262f43]">
                  <div className="bg-[#121620] p-2.5 rounded-lg border border-[#232b3d]">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                      Student Name
                    </span>
                    <span className="text-sm font-extrabold text-white mt-0.5 block truncate">
                      {report.studentName}
                    </span>
                  </div>

                  <div className="bg-[#121620] p-2.5 rounded-lg border border-[#232b3d]">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                      Subject &amp; Topic
                    </span>
                    <span className="text-xs font-semibold text-gray-200 mt-0.5 block truncate">
                      {report.subject} • {report.topic || 'BIDMAS'}
                    </span>
                  </div>

                  <div className="bg-[#121620] p-2.5 rounded-lg border border-[#232b3d]">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                      Instructor &amp; Chapter
                    </span>
                    <span className="text-xs font-semibold text-gray-200 mt-0.5 block truncate">
                      {report.teacherName} • {report.chapter || 'Chapter 1'}
                    </span>
                  </div>

                  <div className="bg-[#121620] p-2.5 rounded-lg border border-[#232b3d] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                        Score &amp; Grade
                      </span>
                      <span className="text-sm font-black text-amber-400 mt-0.5 block">
                        {report.earnedMarks} / {report.totalMarks} ({report.percentage}%)
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                        report.percentage >= 80
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : report.percentage >= 60
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {report.grade}
                    </span>
                  </div>
                </div>
              </div>

              {/* View Style Switcher & Question Filters */}
              <div className="px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-1.5 bg-[#141720] p-1 rounded-lg border border-[#2d3545]">
                  <button
                    onClick={() => setViewStyle('notebookTable')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                      viewStyle === 'notebookTable'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>NotebookLM Table (Exact 1:1)</span>
                  </button>
                  <button
                    onClick={() => setViewStyle('detailedCards')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                      viewStyle === 'detailedCards'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-white'
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
                        ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                        : 'bg-[#181d26] text-gray-400 hover:text-white border border-[#2d3340]'
                    }`}
                  >
                    All ({report.questions.length})
                  </button>
                  <button
                    onClick={() => setQuestionFilter('correct')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                      questionFilter === 'correct'
                        ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
                        : 'bg-[#181d26] text-gray-400 hover:text-white border border-[#2d3340]'
                    }`}
                  >
                    Correct ({report.questions.filter((q) => q.status === 'correct').length})
                  </button>
                  <button
                    onClick={() => setQuestionFilter('review')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                      questionFilter === 'review'
                        ? 'bg-rose-600/30 text-rose-300 border border-rose-500/50'
                        : 'bg-[#181d26] text-gray-400 hover:text-white border border-[#2d3340]'
                    }`}
                  >
                    Incorrect ({report.questions.filter((q) => q.status !== 'correct').length})
                  </button>
                </div>
              </div>

              {/* 1. Question-by-Question Marking Breakdown */}
              <div className="px-5 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-[#2b3342]">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <span>1. Question-by-Question Marking Breakdown</span>
                    <span className="text-[10px] text-gray-400 font-normal">
                      (Total Marks: {report.earnedMarks} / {report.totalMarks})
                    </span>
                  </h3>
                  {viewStyle === 'detailedCards' && (
                    <button
                      onClick={() => setExpandedQuestion(expandedQuestion === -1 ? null : -1)}
                      className="text-blue-400 hover:text-blue-300 text-[11px] whitespace-nowrap"
                    >
                      {expandedQuestion === -1 ? 'Collapse All' : 'Expand All'}
                    </button>
                  )}
                </div>

                {/* VIEW MODE 1: Exact NotebookLM Report Table */}
                {viewStyle === 'notebookTable' ? (
                  <div className="overflow-x-auto border border-[#333d52] rounded-xl bg-[#141822]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#1a2130] text-gray-300 uppercase text-[10px] tracking-wider border-b border-[#333d52]">
                          <th className="py-3 px-3 w-[60px] font-bold text-center">Q#</th>
                          <th className="py-3 px-3 font-bold">Topic / Expression</th>
                          <th className="py-3 px-3 w-[80px] font-bold text-center">Mark</th>
                          <th className="py-3 px-3 w-[110px] font-bold text-center">Status</th>
                          <th className="py-3 px-4 font-bold">Student Answer / Error Analysis</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#262f43]">
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
                                    idx % 2 === 0 ? 'bg-[#151924]' : 'bg-[#121620]'
                                  } hover:bg-[#1f2638] ${isSelected ? 'ring-1 ring-blue-500' : ''}`}
                                >
                                  {/* Q# */}
                                  <td className="py-3 px-3 font-mono font-bold text-center text-gray-200">
                                    {q.displayLabel || `Q${q.questionNumber}`}
                                  </td>

                                  {/* Topic / Expression */}
                                  <td className="py-3 px-3 font-medium text-gray-100 font-mono">
                                    {q.topicExpression || q.prompt}
                                  </td>

                                  {/* Mark */}
                                  <td className="py-3 px-3 font-mono font-bold text-center text-gray-300">
                                    {q.earnedMarks}/{q.maxMarks}
                                  </td>

                                  {/* Status */}
                                  <td className="py-3 px-3 text-center">
                                    <span
                                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black tracking-wide ${
                                        isCorrect
                                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                      }`}
                                    >
                                      {q.statusLabel || (isCorrect ? 'CORRECT' : 'INCORRECT')}
                                    </span>
                                  </td>

                                  {/* Student Answer / Error Analysis */}
                                  <td className="py-3 px-4 text-xs text-gray-300 leading-snug">
                                    <span
                                      className={
                                        !isCorrect ? 'text-rose-300 font-medium' : 'text-gray-300'
                                      }
                                    >
                                      {q.errorAnalysis || q.teacherFeedback}
                                    </span>
                                  </td>
                                </tr>

                                {/* Expanded Detail Drawer on Table Row Click */}
                                {isSelected && (
                                  <tr className="bg-[#10131a]">
                                    <td colSpan={5} className="p-3 border-t border-b border-[#2b354a]">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                        <div className="bg-[#161a24] p-2.5 rounded-lg border border-[#2b3347]">
                                          <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                                            Student Working Found:
                                          </span>
                                          <p className="font-mono text-emerald-300">{q.studentWorkingFound}</p>
                                        </div>
                                        <div className="bg-[#161a24] p-2.5 rounded-lg border border-[#2b3347]">
                                          <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                                            Official Model Answer ({q.markSchemeRef}):
                                          </span>
                                          <p className="font-mono text-blue-300">{q.modelSolution}</p>
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
                                ? 'bg-[#181d26] border-[#2b3342] hover:border-emerald-500/50'
                                : 'bg-[#221c27] border-[#422e3e] hover:border-rose-500/50'
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
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-rose-500/20 text-rose-400'
                                  }`}
                                >
                                  {q.displayLabel || `Q${q.questionNumber}`}
                                </span>
                                <div>
                                  <span className="text-xs font-semibold text-gray-200">
                                    {q.topicExpression || q.prompt}
                                  </span>
                                  <span className="text-[10px] text-gray-500 ml-2 font-mono">
                                    ({q.paperRef})
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                                    isFull
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-rose-500/20 text-rose-400'
                                  }`}
                                >
                                  +{q.earnedMarks}/{q.maxMarks}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="px-4 pb-3.5 pt-1 border-t border-[#262c38] text-xs space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                  <div className="bg-[#12151c] p-2.5 rounded-lg border border-[#222834]">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                                      Student Working Detected:
                                    </span>
                                    <p className="font-mono text-emerald-300 text-xs">
                                      {q.studentWorkingFound}
                                    </p>
                                  </div>
                                  <div className="bg-[#12151c] p-2.5 rounded-lg border border-[#222834]">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                                      Model Answer ({q.markSchemeRef}):
                                    </span>
                                    <p className="font-mono text-blue-300 text-xs">
                                      {q.modelSolution}
                                    </p>
                                  </div>
                                </div>
                                <div className="bg-blue-950/20 border border-blue-500/30 p-2.5 rounded-lg text-[11px] text-gray-300">
                                  <strong className="text-blue-300">Marking Note: </strong>
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
                <div className="bg-[#151a24] border border-[#2d374a] rounded-xl p-4 space-y-2">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    <span>2. Diagnostic Review &amp; Mistake Analysis</span>
                  </h3>
                  <p className="text-xs text-gray-300 leading-relaxed font-sans">
                    {report.diagnosticReview || report.generalFeedback}
                  </p>
                </div>
              </div>

              {/* 3. Personalized Action Plan & Next Steps */}
              <div className="px-5 pb-2">
                <div className="bg-[#151a24] border border-[#2d374a] rounded-xl p-4 space-y-2.5">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>3. Personalized Action Plan &amp; Next Steps</span>
                  </h3>

                  <div className="space-y-2 text-xs">
                    {report.actionPlan && report.actionPlan.length > 0 ? (
                      report.actionPlan.map((action, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 bg-[#10141d] p-2.5 rounded-lg border border-[#222a3a]"
                        >
                          <span className="text-emerald-400 font-bold mt-0.5">•</span>
                          <div>
                            <strong className="text-white mr-1.5 font-bold">
                              {action.title}:
                            </strong>
                            <span className="text-gray-300">{action.detail}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      report.recommendedNextSteps.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 bg-[#10141d] p-2.5 rounded-lg border border-[#222a3a]"
                        >
                          <span className="text-emerald-400 font-bold mt-0.5">•</span>
                          <span className="text-gray-300">{step}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Interactive Student Q&A Box */}
              <div className="p-4 bg-[#14161a] border-t border-[#2d323b] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                    Have a question about your marks or any step?
                  </span>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-[#282c34]"
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
                    className="flex-1 bg-[#202530] text-white text-xs px-3 py-2 rounded-lg border border-[#333c4d] outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={!studentQuery.trim() || isAskingTutor}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold disabled:opacity-40 transition"
                  >
                    {isAskingTutor ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ask Tutor'}
                  </button>
                </form>

                {tutorReply && (
                  <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-lg text-xs text-gray-200 mt-2 leading-relaxed">
                    <div className="font-semibold text-purple-300 mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-400" /> Tutor Response:
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1e222a] border border-[#333842] rounded-xl max-w-5xl w-full h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-3.5 border-b border-[#2d323b] bg-[#181a1f]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white text-sm">
                  {pdfModalType === 'adam'
                    ? 'Adam Bardana — Homework Evaluation Report (adam-bardana-homework-report.pdf)'
                    : pdfModalType === 'joury'
                    ? 'Joury — Official Evaluation Report (joury-homework-report.pdf)'
                    : 'Cambridge IGCSE Model Answer Key (Order of Operations)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={pdfModalUrl}
                  download
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white rounded transition"
                >
                  <Download className="w-3 h-3" /> Download
                </a>
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="px-2.5 py-1 text-xs text-gray-400 hover:text-white rounded hover:bg-[#282c34]"
                >
                  Close ✕
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[#121418] p-2 overflow-hidden flex items-center justify-center">
              <iframe
                src={pdfModalUrl}
                className="w-full h-full rounded border border-[#2b303a]"
                title="NotebookLM PDF Document Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
