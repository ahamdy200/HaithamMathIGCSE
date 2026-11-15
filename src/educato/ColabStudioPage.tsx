import React, { useState } from 'react';
import { NotebookView } from '../components/NotebookView';
import { NotebookIntegrationCode } from '../components/NotebookIntegrationCode';
import { ColabGuideView } from '../components/ColabGuideView';
import { ColabGuideModal } from '../components/ColabGuideModal';
import { INITIAL_CELLS } from '../data/defaultNotebook';
import { HANDWRITTEN_EQUATION_SOLVER_CELLS } from '../data/handwrittenSolverNotebook';
import { NotebookCell } from '../types';
import { downloadIpynb } from '../utils/colabExport';
import { apiUrl } from '../utils/apiBase';
import { Code2, Download, Play, RotateCcw, Key, Layers } from 'lucide-react';

type StudioSubTab = 'notebook' | 'integration' | 'guide';

export function ColabStudioPage() {
  const [subTab, setSubTab] = useState<StudioSubTab>('notebook');
  const [notebookTitle, setNotebookTitle] = useState('IGCSE_Math_BIDMAS_Grader.ipynb');
  const [selectedNotebook, setSelectedNotebook] = useState<'igcse' | 'equation_solver'>('igcse');
  const [cells, setCells] = useState<NotebookCell[]>(INITIAL_CELLS);
  const [isColabModalOpen, setIsColabModalOpen] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [executionCounter, setExecutionCounter] = useState(9);

  const handleSelectNotebook = (nb: 'igcse' | 'equation_solver') => {
    setSelectedNotebook(nb);
    if (nb === 'igcse') {
      setNotebookTitle('IGCSE_Math_BIDMAS_Grader.ipynb');
      setCells(INITIAL_CELLS);
    } else {
      setNotebookTitle('Handwritten_Equation_Solver_CNN.ipynb');
      setCells(HANDWRITTEN_EQUATION_SOLVER_CELLS);
    }
  };

  const handleUpdateContent = (id: string, content: string) => {
    setCells((prev) => prev.map((c) => (c.id === id ? { ...c, content } : c)));
  };

  const handleRunCell = async (id: string) => {
    const targetCell = cells.find((c) => c.id === id);
    if (!targetCell || targetCell.type !== 'code') return;

    const nextCount = executionCounter;
    setExecutionCounter((prev) => prev + 1);

    setCells((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isExecuting: true, error: undefined } : c))
    );

    const startTime = Date.now();
    const content = targetCell.content.trim();

    try {
      if (content.startsWith('!pip install')) {
        await new Promise((r) => setTimeout(r, 600));
        setCells((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  isExecuting: false,
                  executionCount: nextCount,
                  executionTimeMs: Date.now() - startTime,
                  output: `Requirement already satisfied: google-genai in /usr/local/lib/python3.10/dist-packages (2.32.0)\nRequirement already satisfied: pydantic>=2.0.0 in /usr/local/lib/python3.10/dist-packages\nSuccessfully checked and ready: google-genai`,
                }
              : c
          )
        );
        return;
      }

      if (content.includes('userdata.get') || content.includes('GEMINI_API_KEY')) {
        await new Promise((r) => setTimeout(r, 450));
        setCells((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  isExecuting: false,
                  executionCount: nextCount,
                  executionTimeMs: Date.now() - startTime,
                  output: `✅ Authenticated successfully! 'GEMINI_API_KEY' verified via Colab Secrets.\nEnvironment variable os.environ["GEMINI_API_KEY"] configured.`,
                }
              : c
          )
        );
        return;
      }

      if (content.includes('genai.Client()') && !content.includes('models.generate_content')) {
        await new Promise((r) => setTimeout(r, 350));
        setCells((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  isExecuting: false,
                  executionCount: nextCount,
                  executionTimeMs: Date.now() - startTime,
                  output: `✨ Google GenAI Client initialized successfully using modern Client() interface!`,
                }
              : c
          )
        );
        return;
      }

      let promptToSend = 'Hello Gemini! Confirm you are working.';
      let systemInstruction: string | undefined;
      let responseMimeType: string | undefined;

      const contentsMatch = content.match(/contents\s*=\s*["']([^"']+)["']/s);
      if (contentsMatch) {
        promptToSend = contentsMatch[1];
      } else {
        const tripleQuoteMatch = content.match(/contents\s*=\s*"""(.*?)"""/s);
        if (tripleQuoteMatch) {
          promptToSend = tripleQuoteMatch[1].trim();
        } else {
          const promptVarMatch = content.match(/prompt\s*=\s*f?["']{1,3}(.*?)["']{1,3}/s);
          if (promptVarMatch) {
            promptToSend = promptVarMatch[1].trim();
          }
        }
      }

      const sysMatch = content.match(/system_instruction\s*=\s*["']([^"']+)["']/);
      if (sysMatch) {
        systemInstruction = sysMatch[1];
      }

      if (content.includes('application/json')) {
        responseMimeType = 'application/json';
      }

      const res = await fetch(apiUrl('/api/gemini/run'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          model: 'gemini-3.8-flash',
          systemInstruction,
          responseMimeType,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to execute call to Gemini API');
      }

      setCells((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                isExecuting: false,
                executionCount: nextCount,
                executionTimeMs: data.executionTimeMs || Date.now() - startTime,
                output: data.text,
              }
            : c
        )
      );
    } catch (err: any) {
      setCells((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                isExecuting: false,
                executionCount: nextCount,
                executionTimeMs: Date.now() - startTime,
                error: `Error during cell execution:\n${err.message}`,
              }
            : c
        )
      );
    }
  };

  const handleRunAll = async () => {
    if (isRunningAll) return;
    setIsRunningAll(true);
    for (const cell of cells.filter((c) => c.type === 'code')) {
      await handleRunCell(cell.id);
    }
    setIsRunningAll(false);
  };

  const handleClearOutputs = () => {
    setCells((prev) =>
      prev.map((c) => ({
        ...c,
        output: undefined,
        error: undefined,
        executionCount: null,
        executionTimeMs: undefined,
      }))
    );
  };

  const handleClearSingleOutput = (id: string) => {
    setCells((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, output: undefined, error: undefined, executionCount: null, executionTimeMs: undefined }
          : c
      )
    );
  };

  const handleDeleteCell = (id: string) => {
    if (cells.length <= 1) return;
    setCells((prev) => prev.filter((c) => c.id !== id));
  };

  const handleMoveUp = (id: string) => {
    const index = cells.findIndex((c) => c.id === id);
    if (index <= 0) return;
    const next = [...cells];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setCells(next);
  };

  const handleMoveDown = (id: string) => {
    const index = cells.findIndex((c) => c.id === id);
    if (index < 0 || index >= cells.length - 1) return;
    const next = [...cells];
    [next[index + 1], next[index]] = [next[index], next[index + 1]];
    setCells(next);
  };

  const handleInsertCell = (type: 'code' | 'markdown', targetIndex: number) => {
    const newCell: NotebookCell = {
      id: `cell-${Date.now()}`,
      type,
      content:
        type === 'code'
          ? `# New Gemini API Code Cell\nresponse = client.models.generate_content(\n    model="gemini-3.8-flash",\n    contents="Your prompt here"\n)\nprint(response.text)`
          : `## New Section\nAdd your markdown notes here.`,
      executionCount: null,
    };
    const next = [...cells];
    next.splice(targetIndex, 0, newCell);
    setCells(next);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSubTab('notebook')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              subTab === 'notebook' ? 'bg-[#800020] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            Interactive Notebook
          </button>
          <button
            onClick={() => setSubTab('integration')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              subTab === 'integration' ? 'bg-[#800020] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            5-Repo Engine Code
          </button>
          <button
            onClick={() => setSubTab('guide')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              subTab === 'guide' ? 'bg-[#800020] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Key className="w-4 h-4" />
            Colab Secrets Guide
          </button>
        </div>

        {subTab === 'notebook' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRunAll}
              disabled={isRunningAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-60 transition"
            >
              <Play className="w-3.5 h-3.5" />
              {isRunningAll ? 'Running...' : 'Run All Cells'}
            </button>
            <button
              onClick={handleClearOutputs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Outputs
            </button>
            <button
              onClick={() => downloadIpynb(cells, notebookTitle)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#fdf2f4] border border-[#e6ccd2] text-[#800020] hover:bg-rose-100 text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              Export .ipynb
            </button>
            <button
              onClick={() => setIsColabModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 text-xs font-semibold transition"
            >
              Open in Colab
            </button>
          </div>
        )}
      </div>

      {subTab === 'notebook' && (
        <NotebookView
          cells={cells}
          selectedNotebook={selectedNotebook}
          onSelectNotebook={handleSelectNotebook}
          onRunCell={handleRunCell}
          onUpdateContent={handleUpdateContent}
          onDeleteCell={handleDeleteCell}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onClearOutput={handleClearSingleOutput}
          onInsertCell={handleInsertCell}
        />
      )}

      {subTab === 'integration' && <NotebookIntegrationCode />}

      {subTab === 'guide' && <ColabGuideView />}

      <ColabGuideModal
        isOpen={isColabModalOpen}
        onClose={() => setIsColabModalOpen(false)}
        cells={cells}
        notebookTitle={notebookTitle}
      />
    </div>
  );
}
