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

  const ipynbJson = JSON.stringify(buildIpynbJson(cells, notebookTitle), null, 2);
  const pythonScript = generatePythonScript(cells);

  const colabBadgeMarkdown = `[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/)`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#1e222a] border border-[#333842] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2d323b] bg-[#181a1f] sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#f9ab00] via-[#ea4335] to-[#4285f4] p-[1.5px]">
              <div className="w-full h-full bg-[#181a1f] rounded-[6px] flex items-center justify-center">
                <span className="text-[#f9ab00] font-black text-xs">CO</span>
              </div>
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Google Colab &amp; Gemini API Setup</h2>
              <p className="text-xs text-gray-400">Run this notebook in official Google Colab with Secrets authentication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-[#282c34] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 text-sm text-gray-300">
          {/* Quick Action Banner */}
          <div className="bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-purple-900/30 border border-blue-500/30 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                Launch directly in Google Colab
              </h3>
              <p className="text-xs text-gray-300 mt-1">
                Download your .ipynb file and drag it into Colab, or copy the complete Python script.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => downloadIpynb(cells, `${notebookTitle}.ipynb`)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition"
              >
                <Download className="w-3.5 h-3.5" />
                Download .ipynb
              </button>
              <a
                href="https://colab.research.google.com/#create=true"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2d323d] hover:bg-[#383e4c] text-white rounded-lg text-xs font-semibold border border-[#3e4453] transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#f9ab00]" />
                Go to Colab
              </a>
            </div>
          </div>

          {/* 4-Step Colab Secrets Authentication Visual Guide */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider text-xs mb-3 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-amber-400" />
              Colab Secrets Authentication Guide (Recommended)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-[#14161a] border border-[#2b303a] p-3.5 rounded-lg space-y-1">
                <div className="flex items-center gap-2 font-semibold text-gray-200">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[11px]">1</span>
                  Open Colab Secrets Tab
                </div>
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  In your Google Colab notebook, look at the left-hand vertical toolbar and click the <strong>Key icon (🔑 Secrets)</strong>.
                </p>
              </div>

              <div className="bg-[#14161a] border border-[#2b303a] p-3.5 rounded-lg space-y-1">
                <div className="flex items-center gap-2 font-semibold text-gray-200">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[11px]">2</span>
                  Add Secret Name: GEMINI_API_KEY
                </div>
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  Click <em>&ldquo;Add new secret&rdquo;</em>, set Name to <code className="text-blue-300 font-mono">GEMINI_API_KEY</code>, and paste your Gemini API key into Value.
                </p>
              </div>

              <div className="bg-[#14161a] border border-[#2b303a] p-3.5 rounded-lg space-y-1">
                <div className="flex items-center gap-2 font-semibold text-gray-200">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[11px]">3</span>
                  Toggle Notebook Access ON
                </div>
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  Switch the <strong>&ldquo;Notebook access&rdquo;</strong> toggle to ON so the Python runtime can read the secret securely.
                </p>
              </div>

              <div className="bg-[#14161a] border border-[#2b303a] p-3.5 rounded-lg space-y-1">
                <div className="flex items-center gap-2 font-semibold text-gray-200">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[11px]">4</span>
                  Access via google.colab.userdata
                </div>
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  In code: <code className="text-emerald-300 font-mono">from google.colab import userdata; userdata.get(&apos;GEMINI_API_KEY&apos;)</code>
                </p>
              </div>
            </div>
          </div>

          {/* Code Snippets Section */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  Quick Auth Snippet (Copy-Paste into Colab)
                </span>
                <button
                  onClick={() =>
                    handleCopy(
                      `import os\nfrom google.colab import userdata\n\nos.environ["GEMINI_API_KEY"] = userdata.get('GEMINI_API_KEY')\n\nfrom google import genai\nclient = genai.Client()\nprint("Connected to Gemini!")`,
                      'snippet'
                    )
                  }
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  {copiedType === 'snippet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'snippet' ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="bg-[#14161a] border border-[#2b303a] p-3 rounded-lg text-xs font-mono text-gray-300 overflow-x-auto">
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
                <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                  README / GitHub Colab Badge
                </span>
                <button
                  onClick={() => handleCopy(colabBadgeMarkdown, 'badge')}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  {copiedType === 'badge' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'badge' ? 'Copied!' : 'Copy Markdown'}</span>
                </button>
              </div>
              <pre className="bg-[#14161a] border border-[#2b303a] p-2.5 rounded-lg text-xs font-mono text-gray-300 overflow-x-auto">
                {colabBadgeMarkdown}
              </pre>
            </div>

            {/* Standalone Python Script */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-purple-400" />
                  Full Python Script (.py)
                </span>
                <button
                  onClick={() => handleCopy(pythonScript, 'python')}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  {copiedType === 'python' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'python' ? 'Copied!' : 'Copy Full Script'}</span>
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto bg-[#14161a] border border-[#2b303a] p-3 rounded-lg text-xs font-mono text-gray-400">
                <pre>{pythonScript}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#2d323b] bg-[#181a1f] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Official Google GenAI SDK (v2+) Compatible</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#2d323d] hover:bg-[#383e4c] text-white rounded-md text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
