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

export interface ConnectedRepoItem {
  id: string;
  name: string;
  fullName: string;
  description: string;
  remoteUrl: string;
  branch: string;
  localPath: string;
  isPrimary: boolean;
  category: string;
  status: string;
  files?: string[];
  features: string[];
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
  const [modalTab, setModalTab] = useState<'repos' | 'sync' | 'add'>('repos');
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newRepoNotice, setNewRepoNotice] = useState<string | null>(null);
  const [reposList, setReposList] = useState<ConnectedRepoItem[]>([
    {
      id: 'haitham-math',
      name: 'HaithamMathIGCSE',
      fullName: 'ahamdy200/HaithamMathIGCSE',
      description: 'Cambridge IGCSE Mathematics AI Homework Evaluation, Mark Scheme & Notebook Studio',
      remoteUrl: 'https://github.com/ahamdy200/HaithamMathIGCSE.git',
      branch: 'main',
      localPath: '.',
      isPrimary: true,
      category: 'Core Curriculum & Grading',
      status: 'Connected (origin/main)',
      features: [
        'Order of Operations (BIDMAS) Homework Checker',
        'NotebookLM-style Diagnostic Evaluation Reports',
        'Interactive Colab Notebook Studio',
      ],
    },
    {
      id: 'handwritten-equation-solver',
      name: 'Hand-Written-Equation-Solver',
      fullName: 'Sgvkamalakar/Hand-Written-Equation-Solver',
      description: 'Deep Learning (CNN + RNN) Handwritten Math Symbol Recognizer & Drawing Solver',
      remoteUrl: 'https://github.com/Sgvkamalakar/Hand-Written-Equation-Solver.git',
      branch: 'main',
      localPath: 'repos/Hand-Written-Equation-Solver',
      isPrimary: false,
      category: 'Deep Learning & OCR',
      status: 'Connected (repos/Hand-Written-Equation-Solver)',
      files: ['Notebook.ipynb', 'app.py', 'predict.py', 'README.md', 'requirements.txt', 'logo.png'],
      features: [
        '44-Cell Colab Training Pipeline (Notebook.ipynb)',
        'OpenCV Math Symbol Segmentation (32x32 ROIs)',
        'Interactive Drawing Canvas & Stroke Adjustment',
        'CNN Character Classification (97.57% Accuracy)',
      ],
    },
    {
      id: 'automark',
      name: 'AutoMark',
      fullName: 'adamzev/AutoMark',
      description: 'Computer Vision math worksheet scanner, perspective warper, QR code detector & cell grader',
      remoteUrl: 'https://github.com/adamzev/AutoMark.git',
      branch: 'master',
      localPath: 'repos/AutoMark',
      isPrimary: false,
      category: 'Worksheet Scanner & Auto-Grader',
      status: 'Connected (repos/AutoMark)',
      files: ['automark.py', 'cells.py', 'extractor.py', 'grader.py', 'helpers.py', 'ocr.py', 'pipeline.py', 'qr.py'],
      features: [
        'Automated Math Worksheet Scanning & Perspective Warper',
        'QR Code & Form Code Answer Key Mapping (e.g. IGCSE-BIDMAS-CH1)',
        'Cell Border Removal & Digit Segmentation Pipeline',
        'Color-Coded Visual Marking Overlay (Green/Red/Yellow)',
      ],
    },
    {
      id: 'ai-math-grader-openai',
      name: 'AI-Math-Grader-OpenAI',
      fullName: 'bluehawana/AI-Math-Grader-OpenAI',
      description: 'Multi-Provider Vision-AI Math Exam Grader (Gemini, GPT-4o, Claude)',
      remoteUrl: 'https://github.com/bluehawana/AI-Math-Grader-OpenAI.git',
      branch: 'main',
      localPath: 'repos/AI-Math-Grader-OpenAI',
      isPrimary: false,
      category: 'Multimodal AI Exam Grader',
      status: 'Connected (repos/AI-Math-Grader-OpenAI)',
      files: ['grade-image/route.ts', 'grade/route.ts', 'providers.ts', 'GradingResults.tsx', 'ARCHITECTURE.md'],
      features: [
        'Multimodal Vision-AI: Intelligent OCR & reasoning for student handwriting',
        'Multi-Provider Architecture: Google Gemini, OpenAI GPT-4o, Anthropic Claude',
        'Multi-Page Context (up to 10 pages) for long-form mathematics solutions',
        'Ink-Efficient Black & White Assessment Reports for printing',
      ],
    },
  ]);

  const fetchRepos = async () => {
    try {
      const res = await fetch('/api/repos');
      const data = await res.json();
      if (data && data.repositories && data.repositories.length > 0) {
        setReposList(data.repositories);
      }
    } catch {
      // Keep initial repos
    }
  };

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
    fetchRepos();
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
                <span className="font-bold text-sm text-gray-100 math-serif tracking-tight">
                  HaithamMath IGCSE <span className="text-amber-400 font-sans text-xs">∯</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  Gemini 3.8
                </span>
                <span className="hidden lg:inline text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono border border-emerald-500/30">
                  4-Repo Pool
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
            {/* Multi-Repository Connected Hub Badge */}
            <button
              onClick={() => {
                fetchGitStatus();
                fetchRepos();
                setShowGitModal(true);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-xs text-emerald-300 transition shadow-sm"
              title="View all connected repositories"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold font-mono">
                {reposList.length} Repos Connected
              </span>
              <span className="hidden sm:inline text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200 font-mono font-bold">
                MULTI-REPO
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

      {/* Multi-Repository Management Modal */}
      {showGitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b1f2a] border border-[#32394a] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#2b3140] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Connected Repositories Hub</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold font-mono">
                      {reposList.length} REPOSITORIES
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400">
                    Manage multi-repo connections, synchronized remotes, and integrated pipelines
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

            {/* Modal Sub-Tabs */}
            <div className="flex rounded-lg bg-[#12151e] p-1 border border-[#272e3d] gap-1">
              <button
                type="button"
                onClick={() => setModalTab('repos')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  modalTab === 'repos'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Active Repositories ({reposList.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('sync')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  modalTab === 'sync'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Git Remote &amp; Sync</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('add')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  modalTab === 'add'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Connect Another Repo</span>
              </button>
            </div>

            {/* Tab 1: Active Connected Repositories */}
            {modalTab === 'repos' && (
              <div className="space-y-3">
                {reposList.map((repo, idx) => (
                  <div
                    key={repo.id || idx}
                    className="bg-[#12151e] border border-[#272f40] rounded-xl p-4 space-y-3 text-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm font-mono">{repo.name}</span>
                          {repo.isPrimary ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                              PRIMARY REPO
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">
                              CONNECTED REPO
                            </span>
                          )}
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono">
                            {repo.status}
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs mt-1">{repo.description}</p>
                      </div>

                      <a
                        href={repo.remoteUrl.replace(/\.git$/, '')}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-[#1f2533] hover:bg-[#283144] text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1 shrink-0 transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>GitHub</span>
                      </a>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="bg-[#0e1017] p-2 rounded-lg border border-[#202633] space-y-1">
                        <span className="text-gray-400 block font-medium">Remote Repository:</span>
                        <code className="text-blue-400 truncate block font-mono">{repo.remoteUrl}</code>
                      </div>
                      <div className="bg-[#0e1017] p-2 rounded-lg border border-[#202633] space-y-1">
                        <span className="text-gray-400 block font-medium">Local Workspace Path:</span>
                        <code className="text-emerald-300 truncate block font-mono">{repo.localPath}</code>
                      </div>
                    </div>

                    {repo.features && repo.features.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[11px] font-semibold text-gray-400 block mb-1.5">
                          Capabilities &amp; Features in Project:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {repo.features.map((feat, fIdx) => (
                            <span
                              key={fIdx}
                              className="text-[10px] px-2 py-0.5 rounded bg-[#1e2433] text-gray-300 border border-[#2f394d]"
                            >
                              ✓ {feat}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: Git Remote & Synchronization */}
            {modalTab === 'sync' && (
              <div className="space-y-4">
                <div className="bg-[#12151e] border border-[#282f40] rounded-xl p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Primary Remote URL:</span>
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
                    <span className="text-gray-400">Secondary Remotes:</span>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded text-[11px]">
                        handwritten-equation-solver → Sgvkamalakar/Hand-Written-Equation-Solver
                      </span>
                      <span className="font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded text-[11px]">
                        automark → adamzev/AutoMark
                      </span>
                      <span className="font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded text-[11px]">
                        ai-math-grader → bluehawana/AI-Math-Grader-OpenAI
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Tracking Branch:</span>
                    <span className="font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {gitStatus.branch} → origin/{gitStatus.branch}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Latest Commit:</span>
                    <span className="font-mono text-gray-200 truncate max-w-[280px]" title={gitStatus.lastCommit}>
                      {gitStatus.lastCommit}
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
                    <span>Configured Remotes (git remote -v):</span>
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
# origin                     https://github.com/ahamdy200/HaithamMathIGCSE.git
# handwritten-equation-solver https://github.com/Sgvkamalakar/Hand-Written-Equation-Solver.git
# automark                   https://github.com/adamzev/AutoMark.git
# ai-math-grader             https://github.com/bluehawana/AI-Math-Grader-OpenAI.git
git branch -M main
git push -u origin main`}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 3: Connect Another Repo */}
            {modalTab === 'add' && (
              <div className="bg-[#12151e] border border-[#282f40] rounded-xl p-4 space-y-4 text-xs">
                <div>
                  <h4 className="text-sm font-bold text-white">Connect Additional Repository</h4>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Link other repositories (such as question banks, syllabus worksheets, or math tools) to this workspace.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">
                      Repository Git URL or GitHub Name:
                    </label>
                    <input
                      type="text"
                      value={newRepoUrl}
                      onChange={(e) => setNewRepoUrl(e.target.value)}
                      placeholder="e.g. https://github.com/ahamdy200/my-math-repo.git or owner/repo"
                      className="w-full bg-[#0b0d13] border border-[#2a3142] rounded-lg px-3 py-2 text-white font-mono outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!newRepoUrl.trim()) return;
                      setNewRepoNotice(`Ready! Send repository "${newRepoUrl.trim()}" in chat to integrate it into the project.`);
                    }}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Connect This Repository</span>
                  </button>

                  {newRepoNotice && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-blue-200 text-xs">
                      {newRepoNotice}
                    </div>
                  )}

                  <div className="bg-[#0b0d13] border border-[#222838] p-3 rounded-lg text-gray-400 space-y-1.5 text-[11px]">
                    <span className="text-gray-300 font-semibold block">Ways to connect more repos:</span>
                    <div>1. <strong>In Chat:</strong> Provide the GitHub repository URL or upload a project zip file.</div>
                    <div>2. <strong>Git Submodules:</strong> Automatically tracked under the <code>repos/</code> directory.</div>
                    <div>3. <strong>Git Remotes:</strong> Configured as secondary push/pull remotes.</div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 flex-wrap border-t border-[#262c3b]">
              <a
                href="/api/download/project-zip"
                download="HaithamMathIGCSE-source-code.zip"
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Project ZIP</span>
              </a>
              <button
                onClick={handleSyncGit}
                disabled={isSyncingGit}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGit ? 'animate-spin' : ''}`} />
                <span>{isSyncingGit ? 'Syncing...' : 'Fetch & Sync Origin'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

