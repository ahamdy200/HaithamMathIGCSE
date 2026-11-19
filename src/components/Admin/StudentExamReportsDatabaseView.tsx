import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Download,
  Upload,
  Mail,
  MessageCircle,
  RefreshCw,
  FileCheck2,
  X,
} from 'lucide-react';
import { apiUrl } from '../../utils/apiBase';
import { restoreSubmissionsBackup } from '../../utils/accountsApi';
import type { HomeworkSubmissionRecord, OutboxEmailRecord, DirectorySeatUser } from '../../types';

interface StudentExamReportsDatabaseViewProps {
  students: DirectorySeatUser[];
  onNotice: (msg: string) => void;
}

export const StudentExamReportsDatabaseView: React.FC<StudentExamReportsDatabaseViewProps> = ({
  students,
  onNotice,
}) => {
  const [submissions, setSubmissions] = useState<HomeworkSubmissionRecord[]>([]);
  const [outbox, setOutbox] = useState<OutboxEmailRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [studentFilter, setStudentFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'homework' | 'quiz' | 'essay'>('all');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'high' | 'mid' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest' | 'name'>('newest');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<HomeworkSubmissionRecord | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subRes, outRes] = await Promise.all([
        fetch(apiUrl('/api/submissions?role=teacher')),
        fetch(apiUrl('/api/outbox')),
      ]);
      if (subRes.ok) {
        const sd = await subRes.json();
        setSubmissions(Array.isArray(sd?.submissions) ? sd.submissions : []);
      }
      if (outRes.ok) {
        const od = await outRes.json();
        setOutbox(Array.isArray(od?.outbox) ? od.outbox : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const uniqueStudentNames = useMemo(() => {
    const names = new Set<string>();
    for (const s of submissions) names.add(s.studentName);
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = submissions.filter((s) => {
      if (studentFilter !== 'all' && s.studentName !== studentFilter) return false;
      const kind = s.assignmentKind || 'homework';
      if (categoryFilter !== 'all' && kind !== categoryFilter) return false;
      const pct = s.publishedReport?.percentage ?? s.draftReport?.percentage ?? null;
      if (scoreFilter === 'high' && (pct === null || pct < 80)) return false;
      if (scoreFilter === 'mid' && (pct === null || pct < 50 || pct >= 80)) return false;
      if (scoreFilter === 'low' && (pct === null || pct >= 50)) return false;
      if (
        q &&
        !s.studentName.toLowerCase().includes(q) &&
        !s.assignment.toLowerCase().includes(q) &&
        !s.courseTitle.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'name') return a.studentName.localeCompare(b.studentName);
      const pctA = a.publishedReport?.percentage ?? a.draftReport?.percentage ?? -1;
      const pctB = b.publishedReport?.percentage ?? b.draftReport?.percentage ?? -1;
      if (sortBy === 'highest') return pctB - pctA;
      if (sortBy === 'lowest') return pctA - pctB;
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });
    return list;
  }, [submissions, search, studentFilter, categoryFilter, scoreFilter, sortBy]);

  const gradedSubs = submissions.filter((s) => s.status === 'graded' && s.publishedReport);
  const avgScore =
    gradedSubs.length > 0
      ? Math.round(
          gradedSubs.reduce((sum, s) => sum + (Number(s.publishedReport?.percentage) || 0), 0) / gradedSubs.length
        )
      : 0;

  const handleResendEmail = async (sub: HomeworkSubmissionRecord) => {
    const mail = outbox.find((m) => m.submissionId === sub.id);
    if (!mail) {
      onNotice('No prior parent email logged for this report yet. Approve & send it from the Homework Inbox first.');
      return;
    }
    setSendingId(sub.id);
    try {
      const res = await fetch(apiUrl(`/api/outbox/${mail.id}/send`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        onNotice(`Re-sent parent email report for ${sub.studentName} (${sub.assignment}).`);
        await loadData();
      }
    } finally {
      setSendingId(null);
    }
  };

  const buildWhatsAppSummaryUrl = (sub: HomeworkSubmissionRecord) => {
    const rep = sub.publishedReport || sub.draftReport;
    const studentMatch = students.find(
      (st) => st.id === sub.studentId || st.fullName.toLowerCase() === sub.studentName.toLowerCase()
    );
    const digits = String(studentMatch?.parentPhone || studentMatch?.phone || '').replace(/[^\d]/g, '');
    const waPhone = digits.startsWith('0') && digits.length === 11 ? `20${digits.slice(1)}` : digits;
    const msg =
      `Mr. Haitham Hussien — IGCSE Mathematics Report\n` +
      `Student: ${sub.studentName}\n` +
      `Course: ${sub.courseTitle}\n` +
      `Assignment: ${sub.assignment}\n` +
      (rep
        ? `Score: ${rep.earnedMarks}/${rep.totalMarks} (${rep.percentage}% · Grade ${rep.grade})\n` +
          `Feedback: ${rep.generalFeedback}`
        : `Status: Submitted on ${new Date(sub.submittedAt).toLocaleDateString('en-GB')} (pending marking)`);
    return waPhone
      ? `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  const handleDownloadBackup = () => {
    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        portal: 'Mr.HaithamHusseinig',
        submissions,
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MrHaitham_Reports_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotice(`Downloaded backup snapshot containing ${submissions.length} submission record(s).`);
  };

  const handleRestoreBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.submissions) ? parsed.submissions : [];
        if (list.length === 0) {
          onNotice('Selected JSON file contained no submission records.');
          return;
        }
        const res = await restoreSubmissionsBackup(list);
        if (res.success) {
          onNotice(`Restored ${res.restoredCount || 0} missing report record(s) safely without overwriting existing data.`);
          await loadData();
        } else {
          onNotice(res.error || 'Backup restore failed.');
        }
      } catch {
        onNotice('Invalid JSON backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <p className="math-serif text-2xl font-bold text-[#13294B]">{gradedSubs.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Approved Reports</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <p className="math-serif text-2xl font-bold text-[#13294B]">
            {gradedSubs.length > 0 ? `${avgScore}%` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Average Score</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <p className="math-serif text-2xl font-bold text-[#13294B]">
            {submissions.filter((s) => s.status === 'pending').length}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Pending Review</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <p className="math-serif text-2xl font-bold text-[#13294B]">{outbox.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Parent Emails Logged</p>
        </div>
      </div>

      {/* Filters & Backup Controls */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, assignment, or course..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E7EB] bg-[#FAF9F5] focus:bg-white text-xs outline-none focus:border-[#1B365D]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F7F6F2] text-xs font-semibold text-[#13294B] inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F7F6F2] text-xs font-semibold text-[#13294B] inline-flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Backup JSON
            </button>
            <label className="px-3 py-2 rounded-xl bg-[#1B365D] hover:bg-[#13294B] text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> Restore Backup
              <input type="file" accept=".json" onChange={handleRestoreBackupFile} className="hidden" />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <select
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-[#E5E7EB] bg-[#FAF9F5]"
          >
            <option value="all">All Students</option>
            {uniqueStudentNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="px-2.5 py-2 rounded-xl border border-[#E5E7EB] bg-[#FAF9F5]"
          >
            <option value="all">All Categories</option>
            <option value="homework">Homework</option>
            <option value="quiz">Quiz</option>
            <option value="essay">Essay</option>
          </select>
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value as any)}
            className="px-2.5 py-2 rounded-xl border border-[#E5E7EB] bg-[#FAF9F5]"
          >
            <option value="all">All Score Tiers</option>
            <option value="high">High (80%+)</option>
            <option value="mid">Mid (50–79%)</option>
            <option value="low">Needs Support (&lt;50%)</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-2 rounded-xl border border-[#E5E7EB] bg-[#FAF9F5]"
          >
            <option value="newest">Sort: Newest</option>
            <option value="highest">Sort: Highest Score</option>
            <option value="lowest">Sort: Lowest Score</option>
            <option value="name">Sort: Student Name</option>
          </select>
        </div>
      </div>

      {/* Reports Table / Cards */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 text-center text-xs text-slate-500">
          Loading student report database...
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-[#E5E7EB] p-10 text-center space-y-2">
          <FileCheck2 className="w-8 h-8 text-[#1B365D]/40 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">No matching reports found</p>
          <p className="text-xs text-slate-500">
            Submissions and Mr. Haitham&apos;s approved reports will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredSubmissions.map((sub) => {
            const rep = sub.publishedReport || sub.draftReport;
            return (
              <div
                key={sub.id}
                className="bg-white rounded-2xl border border-[#E5E7EB] p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-[#13294B]">{sub.studentName}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#EEF3F9] text-[#1B365D]">
                      {sub.assignmentKind || 'homework'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        sub.status === 'graded'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {sub.status === 'graded' ? 'Published' : 'Pending Approval'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium">
                    {sub.assignment} &middot; <span className="text-slate-500">{sub.courseTitle}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Submitted {new Date(sub.submittedAt).toLocaleString('en-GB')}
                    {rep ? ` · Score: ${rep.earnedMarks}/${rep.totalMarks} (${rep.percentage}% · ${rep.grade})` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {rep && (
                    <button
                      type="button"
                      onClick={() => setSelectedReport(sub)}
                      className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-[#FAF9F5] hover:bg-[#EEF3F9] text-xs font-semibold text-[#1B365D]"
                    >
                      View Summary
                    </button>
                  )}
                  <a
                    href={buildWhatsAppSummaryUrl(sub)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                  {sub.status === 'graded' && (
                    <button
                      type="button"
                      disabled={sendingId === sub.id}
                      onClick={() => handleResendEmail(sub)}
                      className="px-3 py-1.5 rounded-lg bg-[#1B365D] hover:bg-[#13294B] text-white text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {sendingId === sub.id ? 'Sending...' : 'Re-send Email'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Read-Only Report Summary Modal (Non-Bluebook Clean View) */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="bg-white rounded-2xl border border-[#E5E7EB] max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="math-serif text-base font-bold text-[#13294B]">
                  {selectedReport.studentName} — {selectedReport.assignment}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedReport.courseTitle} &middot; Submitted {new Date(selectedReport.submittedAt).toLocaleString('en-GB')}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            {(() => {
              const rep = selectedReport.publishedReport || selectedReport.draftReport;
              if (!rep) return null;
              return (
                <div className="space-y-3 text-xs">
                  <div className="bg-[#EEF3F9] border border-[#DCE5F0] rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-[#13294B]">
                      Score: {rep.earnedMarks}/{rep.totalMarks} ({rep.percentage}%)
                    </span>
                    <span className="font-bold text-[#1B365D]">Grade: {rep.grade}</span>
                  </div>
                  <div className="bg-[#FAF9F5] border border-[#E5E7EB] rounded-xl p-3">
                    <p className="font-bold text-[#13294B] mb-1">Overall Feedback</p>
                    <p className="text-slate-700 leading-relaxed">{rep.generalFeedback}</p>
                  </div>
                  <div className="space-y-2">
                    {(rep.questions || []).map((q) => (
                      <div key={q.questionNumber} className="p-3 rounded-xl border border-[#E5E7EB] space-y-1">
                        <div className="flex justify-between font-bold text-[#13294B]">
                          <span>{q.displayLabel || `Q${q.questionNumber}`}</span>
                          <span>
                            {q.earnedMarks}/{q.maxMarks}
                          </span>
                        </div>
                        <p className="text-slate-600">{q.phase2ErrorAnalysis || q.teacherFeedback}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
