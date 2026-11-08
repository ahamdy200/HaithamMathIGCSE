import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Download,
  Play,
  Key,
  BookOpen,
  Headphones,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  Plus,
  Cpu,
  Layers,
  CheckCircle2,
  FileCode,
  GitBranch,
  RefreshCw,
  X,
} from 'lucide-react';

export type NavTabType = 'homework' | 'modelkey' | 'notebook' | 'integration' | 'audio' | 'guide';

interface GitHubStatus {
  connected: boolean;
  repoName: string;
  remoteUrl: string;
  branch: string;
  lastCommit: string;
  remoteCommit: string;
  trackedFilesCount: number;
  workingTreeClean: boolean;
}

interface NavbarProps {
  notebookTitle: string;
  onTitleChange: (newTitle: string) => void;
  activeTab: NavTabType;
  onTabChange: (tab: NavTabType) => void;
  onRunAll: () => void;
  onClearOutputs: () => void;
  onAddCodeCell: () => void;
  onAddTextCell: () => void;
  onDownloadIpynb: () => void;
  onOpenColabModal: () => void;
  isRunningAll: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  notebookTitle,
  onTitleChange,
  activeTab,
  onTabChange,
  onRunAll,
  onClearOutputs,
  onAddCodeCell,
  onAddTextCell,
  onDownloadIpynb,
  onOpenColabModal,
  isRunningAll,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(notebookTitle);
  const [showGitModal, setShowGitModal] = useState(false);
  const [gitStatus, setGitStatus] = useState<GitHubStatus>({
    connected: true,
    repoName: 'ahamdy200/HaithamMathIGCSE',
    remoteUrl: 'https://github.com/ahamdy200/HaithamMathIGCSE.git',
    branch: 'main',
    lastCommit: 'Feat: Complete HaithamMathIGCSE AI Homework Checking Portal',
    remoteCommit: '3cbca8d',
    trackedFilesCount: 33,
    workingTreeClean: true,
  });
  const [isSyncingGit, setIsSyncingGit] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const fetchGitStatus = async () => {
    try {
      const res = await fetch('/api/github/status');
      const data = await res.json();
      if (data && data.remoteUrl) {
        setGitStatus(data);
      }
    } catch {
      // Keep default status if offline
    }
  };

  useEffect(() => {
    fetchGitStatus();
  }, []);

  const handleSyncGit = async () => {
    setIsSyncingGit(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitMessage: 'Sync HaithamMathIGCSE AI Homework Portal updates',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncMessage(data.message);
        await fetchGitStatus();
      } else {
        setSyncMessage(data.error || 'Unable to sync repository');
      }
    } catch (e: any) {
      setSyncMessage(e.message || 'Network error while syncing');
    } finally {
      setIsSyncingGit(false);
    }
  };

  const handleCopyGitCommands = () => {
    const cmds = `git remote set-url origin https://github.com/ahamdy200/HaithamMathIGCSE.git\ngit branch -M main\ngit push -u origin main`;
    navigator.clipboard.writeText(cmds);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (tempTitle.trim()) {
      onTitleChange(tempTitle.trim());
    } else {
      setTempTitle(notebookTitle);
    }
  };

  return (
    <>
      <header className="border-b border-[#333842] bg-[#1e222a] text-[#e0e3e7] sticky top-0 z-40 select-none shadow-md">
        {/* Top Header Row */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#2b303a]">
          <div className="flex items-center gap-3">
            {/* Colab + Gemini Badge */}
            <div className="flex items-center gap-2 pr-3 border-r border-[#333842]">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#f9ab00] via-[#ea4335] to-[#4285f4] p-[1.5px] shadow-sm">
                <div className="w-full h-full bg-[#181a1f] rounded-[6.5px] flex items-center justify-center">
                  <span className="text-[#f9ab00] font-black text-sm tracking-tighter">CO</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-gray-200">HaithamMathIGCSE</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  Gemini API
                </span>
              </div>
            </div>

            {/* Editable File Title */}
            <div className="hidden md:flex items-center">
              {isEditingTitle ? (
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                  autoFocus
                  className="bg-[#282c34] text-white px-2 py-0.5 rounded border border-blue-500 text-sm font-medium outline-none"
                />
              ) : (
                <button
                  onClick={() => setIsEditingTitle(true)}
                  title="Click to rename notebook"
                  className="text-sm font-medium text-gray-200 hover:text-white px-2 py-0.5 rounded hover:bg-[#2b303a] transition-colors"
                >
                  {notebookTitle}
                </button>
              )}
            </div>
          </div>

          {/* Right side status & action buttons */}
          <div className="flex items-center gap-2.5">
            {/* GitHub Repository Connected Badge */}
            <button
              onClick={() => {
                fetchGitStatus();
                setShowGitModal(true);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-xs text-emerald-300 transition shadow-sm"
              title="Connected to GitHub: https://github.com/ahamdy200/HaithamMathIGCSE.git"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold font-mono">{gitStatus.repoName}</span>
              <span className="hidden lg:inline text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200 font-mono">
                {gitStatus.branch}
              </span>
            </button>

            {/* Runtime Status Pill */}
            <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#252932] border border-[#373c47] text-xs text-gray-300">
              <Cpu className="w-3 h-3 text-emerald-400" />
              <span className="text-gray-400 text-[11px]">Python 3 Runtime</span>
            </div>

            {/* Open in Colab */}
            <button
              onClick={onOpenColabModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2d323d] hover:bg-[#383e4c] text-white text-xs font-medium border border-[#3e4453] transition shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#f9ab00]" />
              <span className="hidden sm:inline">Open in Colab</span>
            </button>

            {/* Download Code (ZIP) */}
            <a
              href="/api/download/project-zip"
              download="HaithamMathIGCSE-source-code.zip"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
              title="Download full project codebase as a .zip file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Code (ZIP)</span>
            </a>

            {/* Download .ipynb */}
            <button
              onClick={onDownloadIpynb}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2d323d] hover:bg-[#383e4c] text-gray-200 text-xs font-semibold border border-[#3e4453] transition"
              title="Download Colab notebook (.ipynb)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">.ipynb</span>
            </button>
          </div>
        </div>

        {/* Secondary Bar: Navigation Tabs & Execution Toolbar */}
        <div className="flex items-center justify-between px-4 py-1.5 bg-[#181a1f] text-xs">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => onTabChange('homework')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition whitespace-nowrap ${
                activeTab === 'homework'
                  ? 'bg-[#282c34] text-white border-b-2 border-blue-400 font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#20232a]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Student Homework &amp; Feedback</span>
            </button>

            <button
              onClick={() => onTabChange('modelkey')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition whitespace-nowrap ${
                activeTab === 'modelkey'
                  ? 'bg-[#282c34] text-white border-b-2 border-emerald-400 font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#20232a]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Model Answer Key (PDF)</span>
            </button>

            <button
              onClick={() => onTabChange('notebook')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition whitespace-nowrap ${
                activeTab === 'notebook'
                  ? 'bg-[#282c34] text-white border-b-2 border-cyan-400 font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#20232a]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Colab Notebook Runner</span>
            </button>

            <button
              onClick={() => onTabChange('integration')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition whitespace-nowrap ${
                activeTab === 'integration'
                  ? 'bg-[#282c34] text-white border-b-2 border-indigo-400 font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#20232a]'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-indigo-400" />
              <span>Python Integration Code</span>
            </button>

            <button
              onClick={() => onTabChange('audio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition whitespace-nowrap ${
                activeTab === 'audio'
                  ? 'bg-[#282c34] text-white border-b-2 border-purple-400 font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#20232a]'
              }`}
            >
              <Headphones className="w-3.5 h-3.5 text-purple-400" />
              <span>Audio Overview (Podcast)</span>
            </button>

            <button
              onClick={() => onTabChange('guide')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition whitespace-nowrap ${
                activeTab === 'guide'
                  ? 'bg-[#282c34] text-white border-b-2 border-amber-400 font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#20232a]'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Colab Secrets Guide</span>
            </button>
          </div>

          {/* Notebook Operations Toolbar */}
          {activeTab === 'notebook' && (
            <div className="flex items-center gap-2">
              <button
                onClick={onAddCodeCell}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#252932] hover:bg-[#303542] text-gray-200 border border-[#383e4c] transition"
                title="Add a new Code cell"
              >
                <Plus className="w-3.5 h-3.5 text-blue-400" />
                <span>Code</span>
              </button>

              <button
                onClick={onAddTextCell}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#252932] hover:bg-[#303542] text-gray-200 border border-[#383e4c] transition"
                title="Add a new Markdown text cell"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Text</span>
              </button>

              <div className="w-[1px] h-4 bg-[#333842] mx-1" />

              <button
                onClick={onRunAll}
                disabled={isRunningAll}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600/90 hover:bg-blue-600 text-white font-medium disabled:opacity-50 transition"
                title="Run all notebook cells sequentially"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{isRunningAll ? 'Running...' : 'Run all'}</span>
              </button>

              <button
                onClick={onClearOutputs}
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#252932] text-gray-400 hover:text-gray-200 transition"
                title="Clear all cell execution outputs"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear outputs</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* GitHub Repository Connection Modal */}
      {showGitModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b1f2a] border border-[#32394a] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#2b3140] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>GitHub Repository Connected</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                      ACTIVE
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400">
                    Linked to remote origin <code className="text-emerald-300">{gitStatus.repoName}</code>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGitModal(false)}
                className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#252b3b] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#12151e] border border-[#282f40] rounded-xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Remote URL:</span>
                <a
                  href="https://github.com/ahamdy200/HaithamMathIGCSE"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:underline font-mono flex items-center gap-1"
                >
                  <span>https://github.com/ahamdy200/HaithamMathIGCSE.git</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Tracking Branch:</span>
                <span className="font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded">
                  {gitStatus.branch} → origin/{gitStatus.branch}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Base Remote Commit:</span>
                <span className="font-mono text-gray-200">{gitStatus.remoteCommit} (Initial commit)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Latest Local Commit:</span>
                <span className="font-mono text-gray-200 truncate max-w-[260px]" title={gitStatus.lastCommit}>
                  {gitStatus.lastCommit}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Tracked Files:</span>
                <span className="font-mono text-gray-200">
                  {gitStatus.trackedFilesCount} files ({gitStatus.workingTreeClean ? 'Clean working tree' : 'Modified'})
                </span>
              </div>
            </div>

            {syncMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{syncMessage}</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Push / Sync Commands:</span>
                <button
                  onClick={handleCopyGitCommands}
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                >
                  {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCmd ? 'Copied!' : 'Copy Commands'}</span>
                </button>
              </div>
              <pre className="bg-[#0e1017] border border-[#262c3a] rounded-lg p-3 text-[11px] font-mono text-gray-300 overflow-x-auto">
{`git remote -v
# origin  https://github.com/ahamdy200/HaithamMathIGCSE.git
git branch -M main
git push -u origin main`}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 flex-wrap">
              <a
                href="/api/download/project-zip"
                download="HaithamMathIGCSE-source-code.zip"
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download ZIP</span>
              </a>
              <a
                href="https://github.com/ahamdy200/HaithamMathIGCSE"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-[#252b3b] hover:bg-[#2f364a] text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View on GitHub</span>
              </a>
              <button
                onClick={handleSyncGit}
                disabled={isSyncingGit}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGit ? 'animate-spin' : ''}`} />
                <span>{isSyncingGit ? 'Syncing with origin/main...' : 'Fetch & Stage Commit'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

