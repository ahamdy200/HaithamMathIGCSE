import React, { useState } from 'react';
import {
  Code2,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';

export const NotebookIntegrationCode: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const colabPythonScript = `"""
================================================================================
IGCSE Math Homework Auto-Grader & Feedback Generator
Author / Teacher: Mr. Haitham Hussien
Powered by: Google GenAI SDK (gemini-3.8-flash) & Google Colab
================================================================================
"""

# Step 1: Install official google-genai SDK
# In Google Colab run: !pip install -q -U google-genai

import os
from google.colab import userdata
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

# Step 2: Authenticate securely via Colab Secrets (Key icon 🔑)
try:
    os.environ["GEMINI_API_KEY"] = userdata.get('GEMINI_API_KEY')
    print("✅ Authenticated via Colab Secrets!")
except Exception:
    os.environ["GEMINI_API_KEY"] = os.getenv("GEMINI_API_KEY", "")

# Step 3: Initialize the Gemini client
client = genai.Client()

# Step 4: Define Structured Marking Schema with Pydantic
class QuestionFeedback(BaseModel):
    question_number: int
    prompt: str
    earned_marks: int
    max_marks: int
    mark_scheme_ref: str
    student_working: str
    model_solution: str
    status: str
    feedback: str

class HomeworkFeedbackReport(BaseModel):
    student_name: str
    assignment: str
    total_marks: int
    earned_marks: int
    percentage: float
    grade: str
    performance_level: str
    general_feedback: str
    questions: list[QuestionFeedback]
    strengths: list[str]
    next_steps: list[str]

# Step 5: Model Answer Key (Teacher Resource: Mr. Haitham Hussien)
MODEL_ANSWER_KEY = """
CHAPTER 1: NUMBERS — LESSON 1: ORDER OF OPERATIONS (BIDMAS)
Rule: Brackets -> Indices -> Division/Multiplication -> Addition/Subtraction
Q1 [1 Mark]: Mike added 8 + 12 first. Division takes priority (12 / 4 = 3, so 8 + 3 = 11).
Q2 [1 Mark]: 5 * (4^2 + 2 - 12) = 5 * (16 + 2 - 12) = 5 * 6 = 30.
Q3 [1 Mark]: 5^2 + sqrt(121) = 25 + 11 = 36.
Q4 [2 Marks]: (23 - 3*3)^2 => [M1] 23 - 9 = 14, [A1] 14^2 = 196.
Q5 [1 Mark]: 2 + 8(40 - 5) => 2 + 8(35) = 2 + 280 = 282.
Q6 [2 Marks]: (a) 4 + 9 * (6 - 4) = 22  (b) 24 / (12 - 8 + 2) = 4.
Q7 [2 Marks]: (a) (10 - 4) / 2 + 18 = 21  (b) 7 * (3 + 1) + 2 = 30.
Total: 10 Marks
"""

# Step 6: Grade Student Submission
def grade_student_homework(student_name: str, submission_text: str):
    prompt = f"""
    You are Mr. Haitham Hussien's expert Cambridge IGCSE Math grading assistant.
    Grade the student's homework submission strictly against the official Model Answer Key.
    Award method marks [M1] and accuracy marks [A1] where earned.

    STUDENT NAME: {student_name}
    STUDENT SUBMISSION:
    {submission_text}

    OFFICIAL MODEL ANSWER KEY:
    {MODEL_ANSWER_KEY}
    """

    response = client.models.generate_content(
        model="gemini-3.8-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=HomeworkFeedbackReport
        )
    )

    print(response.text)
    return response.text

# Test with Ahmed Moghazy's submission
ahmed_submission = """
Q1: because he added first instead of dividing
Q2: 5 * (16 + 2 - 12) = 5 * 6 = 30
Q3: 25 + 11 = 36
Q4: 23 - 9 = 14^2 = 196
Q5: 2 + 8(35) = 2 + 280 = 282
Q6: (a) 4 + 9 * (6 - 4) = 22  (b) 24 / (12 - 8 + 2) = 4
Q7: (a) (10 - 4) / 2 + 18 = 21  (b) 7 * (3 + 1) + 2 = 30
"""

if __name__ == "__main__":
    report_json = grade_student_homework("Ahmed Moghazy", ahmed_submission)
`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header Banner in Cambridge Burgundy */}
      <div className="bg-gradient-to-r from-[#6b1226] via-[#800020] to-[#590d1e] text-white border border-[#9b1d35] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-white border border-white/20 flex items-center justify-center backdrop-blur-sm">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/15 text-rose-100 font-semibold uppercase tracking-wider border border-white/20">
                Teacher &amp; Team Integration Code
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-white mt-1 font-serif">
                Google Colab &amp; NotebookLM Python Integration
              </h1>
              <p className="text-xs text-rose-100/90 max-w-xl">
                Use this Python pipeline to run the exact homework checker inside your own Google Colab notebooks or Python backend.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(colabPythonScript, 'script')}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-rose-50 text-[#800020] rounded-lg text-xs font-bold shadow transition"
            >
              {copied === 'script' ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4 text-[#800020]" />
              )}
              <span>{copied === 'script' ? 'Copied Script!' : 'Copy Python Code'}</span>
            </button>

            <a
              href="https://colab.research.google.com/#create=true"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-black/20 hover:bg-black/30 text-white rounded-lg text-xs font-semibold border border-white/30 backdrop-blur-sm transition"
            >
              <ExternalLink className="w-4 h-4 text-amber-300" />
              <span>Launch in Colab</span>
            </a>
          </div>
        </div>
      </div>

      {/* Code Box */}
      <div className="bg-white border border-[#e6ccd2] rounded-xl overflow-hidden shadow-sm">
        <div className="p-3 bg-[#fdf2f4] border-b border-[#f0d8dd] flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#800020]" />
            <span className="font-bold text-slate-900 font-mono">igcse_math_homework_grader.py</span>
            <span className="text-[11px] text-slate-500 font-mono">(Python 3 • google-genai)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-mono font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Colab Secrets Supported
            </span>
          </div>
        </div>

        <pre className="p-4 bg-[#fffdfa] text-xs font-mono text-slate-800 overflow-x-auto leading-relaxed max-h-[580px]">
          {colabPythonScript}
        </pre>
      </div>

      {/* 3 Integration Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-white border border-[#e6ccd2] p-4 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-[#800020] font-bold font-serif">
            <Sparkles className="w-4 h-4 text-[#800020]" />
            <span>Pydantic Schema Validation</span>
          </div>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            Uses <code className="text-[#800020] font-mono font-semibold">types.GenerateContentConfig</code> with strict JSON responseSchema so the AI returns structured question marks.
          </p>
        </div>

        <div className="bg-white border border-[#e6ccd2] p-4 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-[#800020] font-bold font-serif">
            <ShieldCheck className="w-4 h-4 text-[#800020]" />
            <span>Encrypted Secrets Storage</span>
          </div>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            Reads <code className="text-[#800020] font-mono font-semibold">userdata.get(&apos;GEMINI_API_KEY&apos;)</code> to keep teacher keys encrypted and private.
          </p>
        </div>

        <div className="bg-white border border-[#e6ccd2] p-4 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-[#800020] font-bold font-serif">
            <BookOpen className="w-4 h-4 text-[#800020]" />
            <span>Official Cambridge Mark Scheme</span>
          </div>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            Grounds marking strictly in Mr. Haitham Hussien&apos;s BIDMAS solution key with [M1] and [A1] mark schemes.
          </p>
        </div>
      </div>
    </div>
  );
};
