import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Key,
  Download,
  Terminal,
  ShieldCheck,
  Sparkles,
  FileCode,
} from 'lucide-react';
import { NotebookCell } from '../types';
import { buildIpynbJson, generatePythonScript, downloadIpynb } from '../utils/colabExport';

interface ColabGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  cells: NotebookCell[];
  notebookTitle: string;
}

export const ColabGuideModal: React.FC<ColabGuideModalProps> = ({
  isOpen,
  onClose,
  cells,
  notebookTitle,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const pythonScript = generatePythonScript(cells);
  const colabBadgeMarkdown = `[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/)`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-[#e6ccd2] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#f0d8dd] bg-[#fffdfa] sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#800020] text-white flex items-center justify-center font-bold text-xs shadow-sm font-serif">
              CO
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">Google Colab &amp; Gemini API Setup</h2>
              <p className="text-xs text-slate-500">Run this notebook in official Google Colab with Secrets authentication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-[#fbf4f5] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 text-sm text-slate-700">
          {/* Quick Action Banner */}
          <div className="bg-gradient-to-r from-[#fdf2f4] via-[#fbf8f8] to-[#fdf2f4] border border-[#e6ccd2] p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div>
              <h3 className="font-bold text-slate-900 flex items-center gap-2 font-serif">
                <Sparkles className="w-4 h-4 text-[#800020]" />
                Launch directly in Google Colab
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Download your .ipynb file and drag it into Colab, or copy the complete Python script.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => downloadIpynb(cells, `${notebookTitle}.ipynb`)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#800020] hover:bg-[#6b1226] text-white rounded-lg text-xs font-semibold shadow transition"
              >
                <Download className="w-3.5 h-3.5" />
                Download .ipynb
              </button>
              <a
                href="https://colab.research.google.com/#create=true"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#fbf4f5] text-[#800020] rounded-lg text-xs font-semibold border border-[#e6ccd2] shadow-sm transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#800020]" />
                Go to Colab
              </a>
            </div>
          </div>

          {/* 4-Step Colab Secrets Authentication Visual Guide */}
          <div>
            <h3 className="text-xs font-bold text-[#800020] uppercase tracking-wider mb-3 flex items-center gap-1.5 font-serif">
              <Key className="w-4 h-4 text-[#800020]" />
              Colab Secrets Authentication Guide (Recommended)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-[#fffdfa] border border-[#ebd8dc] p-3.5 rounded-lg space-y-1 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-slate-900 font-serif">
                  <span className="w-5 h-5 rounded-full bg-[#800020] text-white flex items-center justify-center text-[11px] font-sans">1</span>
                  Open Colab Secrets Tab
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  In your Google Colab notebook, look at the left-hand vertical toolbar and click the <strong>Key icon (🔑 Secrets)</strong>.
                </p>
              </div>

              <div className="bg-[#fffdfa] border border-[#ebd8dc] p-3.5 rounded-lg space-y-1 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-slate-900 font-serif">
                  <span className="w-5 h-5 rounded-full bg-[#800020] text-white flex items-center justify-center text-[11px] font-sans">2</span>
                  Add Secret Name: GEMINI_API_KEY
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Click <em>&ldquo;Add new secret&rdquo;</em>, set Name to <code className="text-[#800020] font-mono font-semibold">GEMINI_API_KEY</code>, and paste your Gemini API key into Value.
                </p>
              </div>

              <div className="bg-[#fffdfa] border border-[#ebd8dc] p-3.5 rounded-lg space-y-1 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-slate-900 font-serif">
                  <span className="w-5 h-5 rounded-full bg-[#800020] text-white flex items-center justify-center text-[11px] font-sans">3</span>
                  Toggle Notebook Access ON
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Switch the <strong>&ldquo;Notebook access&rdquo;</strong> toggle to ON so the Python runtime can read the secret securely.
                </p>
              </div>

              <div className="bg-[#fffdfa] border border-[#ebd8dc] p-3.5 rounded-lg space-y-1 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-slate-900 font-serif">
                  <span className="w-5 h-5 rounded-full bg-[#800020] text-white flex items-center justify-center text-[11px] font-sans">4</span>
                  Access via google.colab.userdata
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  In code: <code className="text-emerald-700 font-mono font-semibold">from google.colab import userdata; userdata.get(&apos;GEMINI_API_KEY&apos;)</code>
                </p>
              </div>
            </div>
          </div>

          {/* Code Snippets Section */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-serif">
                  <Terminal className="w-3.5 h-3.5 text-[#800020]" />
                  Quick Auth Snippet (Copy-Paste into Colab)
                </span>
                <button
                  onClick={() =>
                    handleCopy(
                      `import os\nfrom google.colab import userdata\n\nos.environ["GEMINI_API_KEY"] = userdata.get('GEMINI_API_KEY')\n\nfrom google import genai\nclient = genai.Client()\nprint("Connected to Gemini!")`,
                      'snippet'
                    )
                  }
                  className="text-xs text-[#800020] hover:text-[#6b1226] font-semibold flex items-center gap-1"
                >
                  {copiedType === 'snippet' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'snippet' ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="bg-[#fffdfa] border border-[#ebd8dc] p-3 rounded-lg text-xs font-mono text-slate-800 overflow-x-auto shadow-2xs">
{`import os
from google.colab import userdata

# 1. Load key from Colab Secrets
os.environ["GEMINI_API_KEY"] = userdata.get('GEMINI_API_KEY')

# 2. Initialize official Google GenAI Client
from google import genai
client = genai.Client()

# 3. Simple Test Call
response = client.models.generate_content(
    model="gemini-3.8-flash",
    contents="Hello Gemini! Confirm your setup."
)
print(response.text)`}
              </pre>
            </div>

            {/* Markdown Badge Code */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-serif">
                  <FileCode className="w-3.5 h-3.5 text-[#800020]" />
                  README / GitHub Colab Badge
                </span>
                <button
                  onClick={() => handleCopy(colabBadgeMarkdown, 'badge')}
                  className="text-xs text-[#800020] hover:text-[#6b1226] font-semibold flex items-center gap-1"
                >
                  {copiedType === 'badge' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'badge' ? 'Copied!' : 'Copy Markdown'}</span>
                </button>
              </div>
              <pre className="bg-[#fffdfa] border border-[#ebd8dc] p-2.5 rounded-lg text-xs font-mono text-slate-800 overflow-x-auto shadow-2xs">
                {colabBadgeMarkdown}
              </pre>
            </div>

            {/* Standalone Python Script */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-serif">
                  <FileCode className="w-3.5 h-3.5 text-[#800020]" />
                  Full Python Script (.py)
                </span>
                <button
                  onClick={() => handleCopy(pythonScript, 'python')}
                  className="text-xs text-[#800020] hover:text-[#6b1226] font-semibold flex items-center gap-1"
                >
                  {copiedType === 'python' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'python' ? 'Copied!' : 'Copy Full Script'}</span>
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto bg-[#fffdfa] border border-[#ebd8dc] p-3 rounded-lg text-xs font-mono text-slate-700 shadow-2xs">
                <pre>{pythonScript}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#f0d8dd] bg-[#fffdfa] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Official Google GenAI SDK (v2+) Compatible</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#800020] hover:bg-[#6b1226] text-white rounded-lg text-xs font-semibold shadow transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
