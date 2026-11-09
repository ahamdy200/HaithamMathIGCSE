import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  CheckCircle,
  ExternalLink,
  BookOpen,
  Eye,
  Award,
  Layers,
  FileText,
  Copy,
  Check,
  RotateCcw,
} from 'lucide-react';
import { ModelAnswerKeyData } from '../data/modelAnswerKey';

export const TeacherModelKeyViewer: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [activeKey, setActiveKey] = useState<ModelAnswerKeyData | null>(null);

  useEffect(() => {
    fetch('/api/model-key/active')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.modelKey) {
          setActiveKey(data.modelKey);
        }
      })
      .catch(() => {});
  }, []);

  const handleResetToDefault = async () => {
    try {
      const res = await fetch('/api/model-key/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.modelKey) {
        setActiveKey(data.modelKey);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const currentKeyText = activeKey?.text || `CHAPTER 1: NUMBERS — LESSON 1: ORDER OF OPERATIONS (BIDMAS)
Teacher Resource: Mr. Haitham Hussien — Subject: IGCSE / Lower Secondary Mathematics

Fundamental Rule: BIDMAS / BODMAS Priority Order
1. Brackets / Parentheses ( ) first.
2. Indices / Powers / Roots (x^2, sqrt(x)).
3. Division & Multiplication: Perform left-to-right.
4. Addition & Subtraction: Perform left-to-right.

QUESTION 1 (April/2018/Paper 1/ Q.4) [1 Mark]
A teacher asks her class to work out the answer to: 8 + 12 ÷ 4
Mike says that the answer is 5. He is wrong. Explain why Mike is wrong.
Model Answer: "Mike added 8 + 12 before dividing by 4. According to BIDMAS, division must be done before addition (12 ÷ 4 = 3, so correct answer is 8 + 3 = 11)."
Mark Scheme [1 Mark]: Correct explanation explicitly stating that division takes priority over addition.

QUESTION 2 (Oct./2019/Paper 1/ Q.3) [1 Mark]
Work out: 5 × (4² + 2 − 12)
Model Answer: Inside brackets: 4² = 16 -> 16 + 2 - 12 = 6. Outside: 5 × 6 = 30.
Mark Scheme [1 Mark]: Final correct value of 30 (with working shown).

QUESTION 3 (April/2020/Paper 1/ Q.1) [1 Mark]
Work out the value of: 5² + √121
Model Answer: 5² = 25, √121 = 11. Sum: 25 + 11 = 36.
Mark Scheme [1 Mark]: Final correct answer 36.

QUESTION 4 (Oct./2022/Paper 1/ Q.26) [2 Marks]
Work out: (23 − 3 × 3)²
Model Answer:
Inside brackets: 3 × 3 = 9 -> 23 − 9 = 14 [M1].
Square: 14² = 196 [A1].
Mark Scheme:
[M1] Method mark for correctly evaluating inside bracket to get 14.
[A1] Accuracy mark for final value 196.

QUESTION 5 (April/2019/Paper 1/ Q.20) [1 Mark]
Calculate the value of: 2 + 8(40 − 5)
Model Answer: 40 - 5 = 35 -> 8 × 35 = 280 -> 2 + 280 = 282.
Mark Scheme [1 Mark]: Final correct answer 282.

QUESTION 6 (April/2016/Paper 1/ Q.19) [2 Marks]
Put one set of brackets in each calculation to make the answer correct:
(a) 4 + 9 × (6 − 4) = 22 [1 Mark]
(b) 24 ÷ (12 − 8 + 2) = 4 [1 Mark]

QUESTION 7 (Core) [2 Marks]
Put one pair of brackets in each statement to make it correct:
(a) (10 − 4) ÷ 2 + 18 = 21 [1 Mark]
(b) 7 × (3 + 1) + 2 = 30 [1 Mark]`;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentKeyText);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#e8d5d8]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#fdf2f4] text-[#800020] border border-[#f0d8dd] font-semibold uppercase tracking-wider">
              Teacher Resource
            </span>
            <span className="text-xs text-slate-500 font-medium">• Author: Mr. Haitham Hussien</span>
            {activeKey?.isCustom && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                ★ Custom Model Answer Key Active
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 font-serif">
            {activeKey?.title || 'Official Model Answer Key & Marking Guide'}
          </h1>
          <p className="text-xs text-slate-600">
            {activeKey?.topic || 'Chapter 1: Numbers — Lesson 1: Order of Operations (BIDMAS)'} • Cambridge IGCSE
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#fbf4f5] text-[#800020] text-xs font-semibold border border-[#e6ccd2] shadow-sm transition"
          >
            {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#800020]" />}
            <span>{copiedKey ? 'Copied Key!' : 'Copy Solution Key'}</span>
          </button>

          {activeKey?.isCustom && (
            <button
              onClick={handleResetToDefault}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition border border-slate-300"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Default</span>
            </button>
          )}

          <a
            href={activeKey?.pdfUrl || "/assets/model-keys/pearson-edexcel-igcse-monthly-exam-1-model-answers.pdf"}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#800020] hover:bg-[#6b1226] text-white text-xs font-semibold shadow transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open PDF File</span>
          </a>
        </div>
      </div>

      {/* Embedded PDF & Interactive Rule breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Question Breakdown (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* BIDMAS Core Rule Box */}
          <div className="bg-gradient-to-r from-[#fdf2f4] via-[#fbf8f8] to-[#fdf2f4] border border-[#e6ccd2] rounded-xl p-4 text-xs text-slate-700 shadow-sm">
            <h3 className="font-bold text-[#800020] text-sm mb-2 flex items-center gap-2 font-serif">
              <BookOpen className="w-4 h-4 text-[#800020]" />
              Fundamental Rule: BIDMAS / BODMAS Hierarchy
            </h3>
            <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs mt-2">
              <li className="bg-white p-2.5 rounded-lg border border-[#edd7dc] shadow-2xs">
                <strong className="block text-[#800020] text-sm font-serif">B</strong>
                <span className="text-[11px] text-slate-600">Brackets ( )</span>
              </li>
              <li className="bg-white p-2.5 rounded-lg border border-[#edd7dc] shadow-2xs">
                <strong className="block text-[#800020] text-sm font-serif">I / O</strong>
                <span className="text-[11px] text-slate-600">Indices / Orders</span>
              </li>
              <li className="bg-white p-2.5 rounded-lg border border-[#edd7dc] shadow-2xs">
                <strong className="block text-[#800020] text-sm font-serif">D &amp; M</strong>
                <span className="text-[11px] text-slate-600">Division &amp; Mult.</span>
              </li>
              <li className="bg-white p-2.5 rounded-lg border border-[#edd7dc] shadow-2xs">
                <strong className="block text-[#800020] text-sm font-serif">A &amp; S</strong>
                <span className="text-[11px] text-slate-600">Add &amp; Subtract</span>
              </li>
            </ol>
          </div>

          {/* Model Answer Breakdown Cards */}
          <div className="space-y-3">
            {/* Q1 */}
            <div className="bg-white border border-[#e6ccd2] rounded-xl p-4 text-xs space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 font-serif">Question 1 (April/2018/Paper 1/ Q.4)</span>
                <span className="px-2 py-0.5 rounded-full bg-[#fdf2f4] text-[#800020] font-mono text-[11px] font-semibold border border-[#f0d8dd]">
                  [1 Mark]
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">8 + (12 ÷ 4). Mike says answer is 5. Explain why he is wrong.</p>
              <div className="bg-[#fffdfa] p-2.5 rounded-lg border border-[#ebd8dc] font-mono text-[#800020] text-[11px]">
                Model Answer: Division takes priority over addition (12 ÷ 4 = 3, so correct answer is 8 + 3 = 11).
              </div>
            </div>

            {/* Q2 */}
            <div className="bg-white border border-[#e6ccd2] rounded-xl p-4 text-xs space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 font-serif">Question 2 (Oct./2019/Paper 1/ Q.3)</span>
                <span className="px-2 py-0.5 rounded-full bg-[#fdf2f4] text-[#800020] font-mono text-[11px] font-semibold border border-[#f0d8dd]">
                  [1 Mark]
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">Work out: 5 × (4² + 2 − 12)</p>
              <div className="bg-[#fffdfa] p-2.5 rounded-lg border border-[#ebd8dc] font-mono text-[#800020] text-[11px]">
                Model Answer: Inside brackets: 16 + 2 - 12 = 6. Outside: 5 × 6 = 30.
              </div>
            </div>

            {/* Q3 */}
            <div className="bg-white border border-[#e6ccd2] rounded-xl p-4 text-xs space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 font-serif">Question 3 (April/2020/Paper 1/ Q.1)</span>
                <span className="px-2 py-0.5 rounded-full bg-[#fdf2f4] text-[#800020] font-mono text-[11px] font-semibold border border-[#f0d8dd]">
                  [1 Mark]
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">Work out value of: 5² + √121</p>
              <div className="bg-[#fffdfa] p-2.5 rounded-lg border border-[#ebd8dc] font-mono text-[#800020] text-[11px]">
                Model Answer: 25 + 11 = 36.
              </div>
            </div>

            {/* Q4 */}
            <div className="bg-white border border-[#e6ccd2] rounded-xl p-4 text-xs space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 font-serif">Question 4 (Oct./2022/Paper 1/ Q.26)</span>
                <span className="px-2 py-0.5 rounded-full bg-[#fdf2f4] text-[#800020] font-mono text-[11px] font-semibold border border-[#f0d8dd]">
                  [M1] [A1] (2 Marks)
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">Work out: (23 − 3 × 3)²</p>
              <div className="bg-[#fffdfa] p-2.5 rounded-lg border border-[#ebd8dc] font-mono text-[#800020] text-[11px] space-y-1">
                <div>[M1] Method: 23 − 9 = 14</div>
                <div>[A1] Accuracy: 14² = 196</div>
              </div>
            </div>

            {/* Q5 */}
            <div className="bg-white border border-[#e6ccd2] rounded-xl p-4 text-xs space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 font-serif">Question 5 (April/2019/Paper 1/ Q.20 Core)</span>
                <span className="px-2 py-0.5 rounded-full bg-[#fdf2f4] text-[#800020] font-mono text-[11px] font-semibold border border-[#f0d8dd]">
                  [1 Mark]
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">Calculate value of: 2 + 8(40 − 5)</p>
              <div className="bg-[#fffdfa] p-2.5 rounded-lg border border-[#ebd8dc] font-mono text-[#800020] text-[11px]">
                Model Answer: 2 + 8(35) = 2 + 280 = 282.
              </div>
            </div>

            {/* Q6 & Q7 */}
            <div className="bg-white border border-[#e6ccd2] rounded-xl p-4 text-xs space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 font-serif">Questions 6 &amp; 7 (Bracket Placement)</span>
                <span className="px-2 py-0.5 rounded-full bg-[#fdf2f4] text-[#800020] font-mono text-[11px] font-semibold border border-[#f0d8dd]">
                  [4 Marks]
                </span>
              </div>
              <div className="bg-[#fffdfa] p-2.5 rounded-lg border border-[#ebd8dc] font-mono text-[#800020] text-[11px] space-y-1">
                <div>Q6(a): 4 + 9 × (6 − 4) = 22</div>
                <div>Q6(b): 24 ÷ (12 − 8 + 2) = 4</div>
                <div>Q7(a): (10 − 4) ÷ 2 + 18 = 21</div>
                <div>Q7(b): 7 × (3 + 1) + 2 = 30</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Embedded PDF Frame (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#e6ccd2] rounded-xl p-3 shadow-sm flex flex-col h-[700px]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#f0d8dd] text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5 font-serif">
              <Eye className="w-3.5 h-3.5 text-[#800020]" />
              Original PDF Document Preview
            </span>
            <span className="text-[10px] text-slate-500 font-mono">6 Pages</span>
          </div>

          <div className="flex-1 bg-[#fdfafb] rounded-lg overflow-hidden border border-[#edd7dc]">
            <iframe
              src={activeKey?.pdfUrl || "/assets/model-keys/pearson-edexcel-igcse-monthly-exam-1-model-answers.pdf"}
              className="w-full h-full"
              title="Official Model Answer Key PDF"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
