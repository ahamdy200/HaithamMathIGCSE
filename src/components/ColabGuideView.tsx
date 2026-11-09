import React, { useState } from 'react';
import {
  Key,
  ShieldCheck,
  Terminal,
  Copy,
  Check,
  HelpCircle,
} from 'lucide-react';

export const ColabGuideView: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 min-h-[calc(100vh-100px)]">
      {/* Hero Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fdf2f4] border border-[#f0d8dd] text-[#800020] text-xs font-semibold">
          <Key className="w-3.5 h-3.5 text-[#800020]" />
          Google Colab Secrets &amp; Security Best Practices
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-serif">
          How to Authenticate with the Gemini API in Colab
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto">
          Google Colab provides a native, encrypted Secrets manager that keeps your API keys secure. You never have to commit keys to code cells or GitHub.
        </p>
      </div>

      {/* Visual Step-by-Step Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1 */}
        <div className="bg-white border border-[#e6ccd2] rounded-xl p-5 space-y-3 relative overflow-hidden shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-[#800020] text-white flex items-center justify-center font-bold text-sm shadow-sm">
            1
          </div>
          <h3 className="font-bold text-slate-900 text-base font-serif">Open Secrets (🔑)</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            On the left sidebar of Google Colab, locate the vertical icon bar and click the <strong>Key icon</strong> labeled <em>Secrets</em>.
          </p>
          <div className="bg-[#fffdfa] border border-[#ebd8dc] p-2.5 rounded-lg flex items-center justify-center text-xs font-mono text-slate-700 shadow-2xs">
            <span className="text-[#800020] mr-2 font-bold">🔑</span> Colab Left Sidebar &gt; Secrets
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white border border-[#e6ccd2] rounded-xl p-5 space-y-3 relative overflow-hidden shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-[#800020] text-white flex items-center justify-center font-bold text-sm shadow-sm">
            2
          </div>
          <h3 className="font-bold text-slate-900 text-base font-serif">Add Secret &amp; Key</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Click <strong>&ldquo;Add new secret&rdquo;</strong>. Enter <code className="text-[#800020] font-mono font-semibold">GEMINI_API_KEY</code> as the Name, and paste your key into the Value field.
          </p>
          <div className="bg-[#fffdfa] border border-[#ebd8dc] p-2.5 rounded-lg flex items-center justify-between text-xs font-mono text-slate-700 shadow-2xs">
            <span className="text-slate-500">Name:</span>
            <span className="text-[#800020] font-bold">GEMINI_API_KEY</span>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white border border-[#e6ccd2] rounded-xl p-5 space-y-3 relative overflow-hidden shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-[#800020] text-white flex items-center justify-center font-bold text-sm shadow-sm">
            3
          </div>
          <h3 className="font-bold text-slate-900 text-base font-serif">Enable Notebook Access</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Turn ON the toggle switch labeled <strong>&ldquo;Notebook access&rdquo;</strong> for this secret. This permits Python in your Colab session to read it.
          </p>
          <div className="bg-[#fffdfa] border border-[#ebd8dc] p-2.5 rounded-lg flex items-center justify-between text-xs font-mono text-slate-700 shadow-2xs">
            <span className="text-slate-500">Access:</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Enabled (ON)
            </span>
          </div>
        </div>
      </div>

      {/* Code Snippet Box */}
      <div className="bg-white border border-[#e6ccd2] rounded-xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#800020]" />
            <h3 className="text-sm font-bold text-slate-900 font-serif">Recommended Python Code Pattern</h3>
          </div>
          <button
            onClick={() =>
              handleCopy(
                `import os\nfrom google.colab import userdata\n\n# Secure retrieval from Colab Secrets\nos.environ["GEMINI_API_KEY"] = userdata.get('GEMINI_API_KEY')\n\n# Initialize SDK\nfrom google import genai\nclient = genai.Client()\n\n# Test call\nresponse = client.models.generate_content(\n    model="gemini-3.8-flash",\n    contents="Hello Gemini! Verify setup."\n)\nprint(response.text)`,
                'code-full'
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#fdf2f4] hover:bg-[#fae3e7] text-xs font-semibold text-[#800020] border border-[#f0d8dd] transition"
          >
            {copiedKey === 'code-full' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#800020]" /> Copy Code
              </>
            )}
          </button>
        </div>

        <pre className="bg-[#fffdfa] border border-[#ebd8dc] p-4 rounded-lg text-xs font-mono text-slate-800 overflow-x-auto leading-relaxed shadow-2xs">
{`import os
from google.colab import userdata

# 1. Retrieve the secret key safely
try:
    api_key = userdata.get('GEMINI_API_KEY')
    os.environ["GEMINI_API_KEY"] = api_key
    print("✅ Successfully authenticated via Colab Secrets!")
except Exception as e:
    print("⚠️ Please configure 'GEMINI_API_KEY' in the Colab Secrets tab (Key icon on left).")

# 2. Import modern Google GenAI SDK
from google import genai
from google.genai import types

# 3. Initialize the Client
client = genai.Client()

# 4. Make a test call to gemini-3.8-flash
response = client.models.generate_content(
    model="gemini-3.8-flash",
    contents="Explain in one sentence why Google GenAI client is simple to use."
)

print("\\n=== Response ===")
print(response.text)`}
        </pre>
      </div>

      {/* Frequently Asked Questions */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-serif">
          <HelpCircle className="w-4 h-4 text-[#800020]" />
          Common Colab &amp; Gemini API Questions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-white border border-[#e6ccd2] p-4 rounded-lg space-y-1.5 shadow-sm">
            <h4 className="font-bold text-slate-900 text-sm font-serif">What model should I use for general tasks?</h4>
            <p className="text-slate-600 leading-relaxed">
              Google recommends <code className="text-[#800020] font-mono font-semibold">gemini-3.8-flash</code> as the default model. It features high throughput, sub-second latency, multimodal capabilities, and long context.
            </p>
          </div>

          <div className="bg-white border border-[#e6ccd2] p-4 rounded-lg space-y-1.5 shadow-sm">
            <h4 className="font-bold text-slate-900 text-sm font-serif">How do I run the notebook outside Google Colab?</h4>
            <p className="text-slate-600 leading-relaxed">
              In standard Jupyter or VS Code, <code className="text-[#800020] font-mono font-semibold">google.colab</code> is not available. Simply export your key in the terminal with <code className="text-emerald-700 font-mono font-semibold">export GEMINI_API_KEY=&quot;...&quot;</code> or use python-dotenv.
            </p>
          </div>

          <div className="bg-white border border-[#e6ccd2] p-4 rounded-lg space-y-1.5 shadow-sm">
            <h4 className="font-bold text-slate-900 text-sm font-serif">Can I use streaming responses in Colab?</h4>
            <p className="text-slate-600 leading-relaxed">
              Yes! Use <code className="text-[#800020] font-mono font-semibold">client.models.generate_content_stream(...)</code> and loop through chunks with <code className="text-[#800020] font-mono font-semibold">print(chunk.text, end=&quot;&quot;, flush=True)</code> for live character-by-character output.
            </p>
          </div>

          <div className="bg-white border border-[#e6ccd2] p-4 rounded-lg space-y-1.5 shadow-sm">
            <h4 className="font-bold text-slate-900 text-sm font-serif">How do I get structured JSON from Gemini?</h4>
            <p className="text-slate-600 leading-relaxed">
              Define a Pydantic model class and pass <code className="text-[#800020] font-mono font-semibold">types.GenerateContentConfig(response_mime_type=&quot;application/json&quot;, response_schema=MyModel)</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
