import React, { useState } from 'react';
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
} from 'lucide-react';

export const TeacherModelKeyViewer: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState(false);

  const modelKeyText = `CHAPTER 1: NUMBERS — LESSON 1: ORDER OF OPERATIONS (BIDMAS)
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
    navigator.clipboard.writeText(modelKeyText);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#333842]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold uppercase tracking-wider">
              Teacher Resource
            </span>
            <span className="text-xs text-gray-400">• Author: Mr. Haitham Hussien</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
            Official Model Answer Key &amp; Marking Guide
          </h1>
          <p className="text-xs text-gray-400">
            Chapter 1: Numbers — Lesson 1: Order of Operations (BIDMAS) • Cambridge IGCSE
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2b303a] hover:bg-[#383e4c] text-gray-200 text-xs font-medium border border-[#3e4453] transition"
          >
            {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey ? 'Copied' : 'Copy Solution Key'}</span>
          </button>

          <a
            href="/public/assets/aistudio/order-of-operations-model-answer-key_202610250939_18187_be349899.pdf"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
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
          <div className="bg-gradient-to-r from-[#172233] to-[#1e2a3f] border border-blue-500/30 rounded-xl p-4 text-xs text-gray-200">
            <h3 className="font-bold text-blue-300 text-sm mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              Fundamental Rule: BIDMAS / BODMAS Hierarchy
            </h3>
            <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs mt-2">
              <li className="bg-[#121622] p-2 rounded-lg border border-[#2b3447]">
                <strong className="block text-emerald-400 text-sm">B</strong>
                <span className="text-[11px] text-gray-400">Brackets ( )</span>
              </li>
              <li className="bg-[#121622] p-2 rounded-lg border border-[#2b3447]">
                <strong className="block text-cyan-400 text-sm">I / O</strong>
                <span className="text-[11px] text-gray-400">Indices / Orders</span>
              </li>
              <li className="bg-[#121622] p-2 rounded-lg border border-[#2b3447]">
                <strong className="block text-amber-400 text-sm">D &amp; M</strong>
                <span className="text-[11px] text-gray-400">Division &amp; Mult.</span>
              </li>
              <li className="bg-[#121622] p-2 rounded-lg border border-[#2b3447]">
                <strong className="block text-purple-400 text-sm">A &amp; S</strong>
                <span className="text-[11px] text-gray-400">Add &amp; Subtract</span>
              </li>
            </ol>
          </div>

          {/* Model Answer Breakdown Cards */}
          <div className="space-y-3">
            {/* Q1 */}
            <div className="bg-[#1e222a] border border-[#333842] rounded-xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Question 1 (April/2018/Paper 1/ Q.4)</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono text-[11px]">[1 Mark]</span>
              </div>
              <p className="text-gray-400 text-[11px]">8 + (12 ÷ 4). Mike says answer is 5. Explain why he is wrong.</p>
              <div className="bg-[#14161a] p-2.5 rounded-lg border border-[#2b303a] font-mono text-emerald-300 text-[11px]">
                Model Answer: Division takes priority over addition (12 ÷ 4 = 3, so correct answer is 8 + 3 = 11).
              </div>
            </div>

            {/* Q2 */}
            <div className="bg-[#1e222a] border border-[#333842] rounded-xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Question 2 (Oct./2019/Paper 1/ Q.3)</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono text-[11px]">[1 Mark]</span>
              </div>
              <p className="text-gray-400 text-[11px]">Work out: 5 × (4² + 2 − 12)</p>
              <div className="bg-[#14161a] p-2.5 rounded-lg border border-[#2b303a] font-mono text-emerald-300 text-[11px]">
                Model Answer: Inside brackets: 16 + 2 - 12 = 6. Outside: 5 × 6 = 30.
              </div>
            </div>

            {/* Q3 */}
            <div className="bg-[#1e222a] border border-[#333842] rounded-xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Question 3 (April/2020/Paper 1/ Q.1)</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono text-[11px]">[1 Mark]</span>
              </div>
              <p className="text-gray-400 text-[11px]">Work out value of: 5² + √121</p>
              <div className="bg-[#14161a] p-2.5 rounded-lg border border-[#2b303a] font-mono text-emerald-300 text-[11px]">
                Model Answer: 25 + 11 = 36.
              </div>
            </div>

            {/* Q4 */}
            <div className="bg-[#1e222a] border border-[#333842] rounded-xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Question 4 (Oct./2022/Paper 1/ Q.26)</span>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono text-[11px]">
                  [M1] [A1] (2 Marks)
                </span>
              </div>
              <p className="text-gray-400 text-[11px]">Work out: (23 − 3 × 3)²</p>
              <div className="bg-[#14161a] p-2.5 rounded-lg border border-[#2b303a] font-mono text-emerald-300 text-[11px] space-y-1">
                <div>[M1] Method: 23 − 9 = 14</div>
                <div>[A1] Accuracy: 14² = 196</div>
              </div>
            </div>

            {/* Q5 */}
            <div className="bg-[#1e222a] border border-[#333842] rounded-xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Question 5 (April/2019/Paper 1/ Q.20 Core)</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono text-[11px]">[1 Mark]</span>
              </div>
              <p className="text-gray-400 text-[11px]">Calculate value of: 2 + 8(40 − 5)</p>
              <div className="bg-[#14161a] p-2.5 rounded-lg border border-[#2b303a] font-mono text-emerald-300 text-[11px]">
                Model Answer: 2 + 8(35) = 2 + 280 = 282.
              </div>
            </div>

            {/* Q6 & Q7 */}
            <div className="bg-[#1e222a] border border-[#333842] rounded-xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Questions 6 &amp; 7 (Bracket Placement)</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono text-[11px]">[4 Marks]</span>
              </div>
              <div className="bg-[#14161a] p-2.5 rounded-lg border border-[#2b303a] font-mono text-emerald-300 text-[11px] space-y-1">
                <div>Q6(a): 4 + 9 × (6 − 4) = 22</div>
                <div>Q6(b): 24 ÷ (12 − 8 + 2) = 4</div>
                <div>Q7(a): (10 − 4) ÷ 2 + 18 = 21</div>
                <div>Q7(b): 7 × (3 + 1) + 2 = 30</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Embedded PDF Frame (5 cols) */}
        <div className="lg:col-span-5 bg-[#1e222a] border border-[#333842] rounded-xl p-3 shadow-sm flex flex-col h-[700px]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2b303a] text-xs">
            <span className="font-semibold text-gray-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              Original PDF Document Preview
            </span>
            <span className="text-[10px] text-gray-500 font-mono">6 Pages</span>
          </div>

          <div className="flex-1 bg-[#121418] rounded-lg overflow-hidden border border-[#2b303a]">
            <iframe
              src="/public/assets/aistudio/order-of-operations-model-answer-key_202610250939_18187_be349899.pdf"
              className="w-full h-full"
              title="Official Model Answer Key PDF"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
