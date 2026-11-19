import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, Target, FileText, Mail } from 'lucide-react';
import { useAuth } from './AuthContext';
import { Course, CourseEnrollment } from './courses';
import { apiUrl } from '../utils/apiBase';
import type { OutboxEmailRecord } from '../types';

interface ProgressPageProps {
  visibleCourses: Course[];
  enrollment: CourseEnrollment | null;
}

export function ProgressPage({ visibleCourses, enrollment }: ProgressPageProps) {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const isParent = user?.role === 'parent';
  const targetStudentId = isParent ? user?.linkedStudentId : user?.id;

  const [stats, setStats] = useState<any | null>(null);
  const [outbox, setOutbox] = useState<OutboxEmailRecord[]>([]);
  const [resendConfigured, setResendConfigured] = useState(false);
  const [previewMail, setPreviewMail] = useState<OutboxEmailRecord | null>(null);
  const [resendTo, setResendTo] = useState('');
  const [resendBusyId, setResendBusyId] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const loadStatsAndOutbox = useCallback(async () => {
    if (!user) return;
    const statsUrl = isTeacher
      ? apiUrl('/api/stats?role=teacher')
      : apiUrl(`/api/stats?role=${user.role}&studentId=${targetStudentId}`);
    try {
      const sRes = await fetch(statsUrl);
      if (sRes.ok) {
        const sData = await sRes.json();
        setStats(sData?.stats || null);
      }
      if (isTeacher || isParent) {
        const oUrl = isTeacher
          ? apiUrl('/api/outbox')
          : apiUrl(`/api/outbox?studentId=${targetStudentId}`);
        const oRes = await fetch(oUrl);
        if (oRes.ok) {
          const oData = await oRes.json();
          setOutbox(Array.isArray(oData?.outbox) ? oData.outbox : []);
          setResendConfigured(Boolean(oData?.resendConfigured));
        }
      }
    } catch {
      // ignore transient errors
    }
  }, [user, isTeacher, isParent, targetStudentId]);

  useEffect(() => {
    loadStatsAndOutbox();
  }, [loadStatsAndOutbox]);

  const handleResendEmail = async (mailId: string) => {
    setResendBusyId(mailId);
    setResendMessage(null);
    try {
      const res = await fetch(apiUrl(`/api/outbox/${mailId}/send`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: resendTo.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok && data?.mailRecord) {
        setResendMessage(
          `${data.mailRecord.status === 'sent' ? 'Delivered via Resend' : 'Logged locally'}: ${data.mailRecord.note || data.mailRecord.to}`
        );
        await loadStatsAndOutbox();
      }
    } finally {
      setResendBusyId(null);
    }
  };

  if (!isTeacher && !isParent && (!enrollment || enrollment.status !== 'approved' || visibleCourses.length === 0)) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-xs">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl mb-4">
          ⏳
        </div>
        <h1 className="text-xl font-bold text-gray-900">Statistics Tracker Locked</h1>
        <p className="text-sm text-gray-600 mt-2">
          {enrollment?.status === 'pending'
            ? `Your request to join "${enrollment.courseTitle}" is currently awaiting Mr. Haitham Hussien's approval.`
            : 'Please select your IGCSE Mathematics course on the Dashboard and request Mr. Haitham’s approval first.'}
        </p>
      </div>
    );
  }

  const gradedCount = stats?.gradedCount ?? 0;
  const totalCount = stats?.totalSubmissions ?? 0;
  const avgPct = stats?.avgPercentage ?? 0;
  const bySystem = stats?.bySystem || {};
  const weakSpots = Array.isArray(stats?.weakSpots) ? stats.weakSpots : [];
  const recentReports = Array.isArray(stats?.recentReports) ? stats.recentReports : [];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="math-serif text-2xl sm:text-3xl font-bold text-[#13294B]">
            {isTeacher
              ? 'Class Progress & Parent Emails'
              : isParent
              ? `Child Progress — ${user?.linkedStudentName}`
              : 'My Course Progress'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isTeacher
              ? "Mr. Haitham's Class Overview · Summary of marked homework and parent correspondence"
              : 'Only Mr. Haitham-approved final reports are counted here.'}
          </p>
        </div>
        {isTeacher && (
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              resendConfigured
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {resendConfigured ? 'Parent Email Delivery Ready' : 'Outbox Preview Mode'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Approved Reports"
          value={String(gradedCount)}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-700" />}
          color="green"
        />
        <StatCard
          label="Approved Average"
          value={gradedCount > 0 ? `${avgPct}%` : '—'}
          icon={<Target className="w-5 h-5 text-[#1B365D]" />}
          color="blue"
        />
        <StatCard
          label={isTeacher ? 'Total Submissions' : isParent ? 'Approved Courses' : 'Total Submissions'}
          value={String(isParent ? visibleCourses.length : totalCount)}
          icon={<FileText className="w-5 h-5 text-[#1B365D]" />}
          color="navy"
        />
        <StatCard
          label={isTeacher ? 'Parent Emails Sent' : 'Parent Notifications'}
          value={String(outbox.length)}
          icon={<Mail className="w-5 h-5 text-amber-700" />}
          color="amber"
        />
      </div>

      {/* Grading System Breakdown & Question Weak Spots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Grading Systems Breakdown (Edexcel · IB · Marks)</h2>
          {Object.keys(bySystem).length === 0 ? (
            <p className="text-xs text-gray-400 py-4">No approved reports recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(bySystem).map(([sys, val]: [string, any]) => (
                <div key={sys} className="flex items-center justify-between p-3 rounded-xl bg-[#f7f9fc] border border-gray-100">
                  <div>
                    <span className="text-xs font-bold text-gray-900">{sys}</span>
                    <p className="text-[11px] text-gray-500">{val.count} approved assessment(s)</p>
                  </div>
                  <span className="text-sm font-extrabold text-[#163252]">{val.avgPercentage}% avg</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Per-Question Error &amp; Focus Areas</h2>
          {weakSpots.length === 0 ? (
            <p className="text-xs text-gray-400 py-4">No recurring question errors found in approved reports yet.</p>
          ) : (
            <div className="space-y-2">
              {weakSpots.map((w: any) => (
                <div key={w.label} className="flex items-center justify-between p-3 rounded-xl bg-rose-50/60 border border-[#dce6f0]">
                  <span className="text-xs font-bold text-gray-900">{w.label}</span>
                  <span className="text-xs font-semibold text-rose-700">
                    {w.misses} missed / {w.total} attempt(s)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Approved Report History */}
      {recentReports.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Approved Assessment History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="py-2 pr-3">Student</th>
                  <th className="py-2 pr-3">Assessment</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Scale</th>
                  <th className="py-2 pr-3">Score</th>
                  <th className="py-2">Grade</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.map((r: any) => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-2.5 pr-3 font-medium text-gray-900">{r.studentName}</td>
                    <td className="py-2.5 pr-3 text-gray-700">{r.assignment}</td>
                    <td className="py-2.5 pr-3 uppercase text-[10px] font-bold text-indigo-700">{r.kind}</td>
                    <td className="py-2.5 pr-3 uppercase text-[10px] font-bold text-gray-600">{r.gradingSystem}</td>
                    <td className="py-2.5 pr-3 font-bold text-[#163252]">{r.earnedMarks}/{r.totalMarks} ({r.percentage}%)</td>
                    <td className="py-2.5 text-gray-700">{r.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Parent Emails Sent Log */}
      {(isTeacher || isParent) && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="math-serif text-base font-bold text-[#13294B]">Parent Emails Sent</h2>
              <p className="text-xs text-slate-500">
                Sent automatically after Mr. Haitham approves &amp; releases each final report.
              </p>
            </div>
            {isTeacher && (
              <input
                type="email"
                value={resendTo}
                onChange={(e) => setResendTo(e.target.value)}
                placeholder="Optional test email address"
                className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs w-64"
              />
            )}
          </div>

          {resendMessage && (
            <div className="text-xs bg-blue-50 border border-blue-200 text-blue-900 px-3 py-2 rounded-lg">
              {resendMessage}
            </div>
          )}

          {outbox.length === 0 ? (
            <p className="text-xs text-gray-400 py-4">No parent notification emails dispatched yet.</p>
          ) : (
            <div className="space-y-2.5">
              {outbox.map((mail) => (
                <div key={mail.id} className="p-3.5 rounded-xl border border-gray-100 bg-[#f7f9fc]/70 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span
                        className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded mr-2 ${
                          mail.status === 'sent'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {mail.status === 'sent' ? 'Sent via Resend' : 'Local Preview'}
                      </span>
                      <span className="text-xs font-bold text-gray-900">{mail.subject}</span>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        To: <strong>{mail.to}</strong> · {new Date(mail.createdAt).toLocaleString('en-GB')}
                        {mail.note ? ` · ${mail.note}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewMail(previewMail?.id === mail.id ? null : mail)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium hover:bg-gray-100"
                      >
                        {previewMail?.id === mail.id ? 'Hide Email' : 'Preview HTML'}
                      </button>
                      {isTeacher && (
                        <button
                          disabled={resendBusyId === mail.id}
                          onClick={() => handleResendEmail(mail.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#163252] text-white text-xs font-semibold hover:bg-[#214266] disabled:opacity-60"
                        >
                          {resendBusyId === mail.id ? 'Sending...' : 'Re-send'}
                        </button>
                      )}
                    </div>
                  </div>
                  {previewMail?.id === mail.id && (
                    <div
                      className="mt-2 bg-white rounded-xl border border-gray-200 p-4 overflow-auto max-h-96"
                      dangerouslySetInnerHTML={{ __html: mail.html }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: 'bg-[#F3F6FA]',
    navy: 'bg-[#EEF3F9]',
    green: 'bg-emerald-50',
    amber: 'bg-amber-50',
  };
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-2xs">
      <div className={`w-10 h-10 ${colors[color] || 'bg-[#F3F6FA]'} rounded-xl flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="math-serif text-2xl font-bold text-[#13294B]">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function InfoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#f7f9fc] rounded-lg p-3 border border-gray-100">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}
