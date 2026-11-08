/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navbar, NavTabType } from './components/Navbar';
import { NotebookView } from './components/NotebookView';
import { NotebookLMView } from './components/NotebookLMView';
import { AudioOverviewView } from './components/AudioOverviewView';
import { ColabGuideView } from './components/ColabGuideView';
import { ColabGuideModal } from './components/ColabGuideModal';
import { StudentHomeworkPortal } from './components/StudentHomeworkPortal';
import { TeacherModelKeyViewer } from './components/TeacherModelKeyViewer';
import { NotebookIntegrationCode } from './components/NotebookIntegrationCode';
import { INITIAL_CELLS, INITIAL_SOURCES } from './data/defaultNotebook';
import { NotebookCell, SourceDocument } from './types';
import { downloadIpynb } from './utils/colabExport';

export default function App() {
  const [notebookTitle, setNotebookTitle] = useState('IGCSE_Math_BIDMAS_Grader.ipynb');
  const [cells, setCells] = useState<NotebookCell[]>(INITIAL_CELLS);
  const [sources, setSources] = useState<SourceDocument[]>(INITIAL_SOURCES);
  const [activeTab, setActiveTab] = useState<NavTabType>('homework');
  const [isColabModalOpen, setIsColabModalOpen] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [executionCounter, setExecutionCounter] = useState(9);

  // Cell Content Updater
  const handleUpdateContent = (id: string, content: string) => {
    setCells((prev) => prev.map((c) => (c.id === id ? { ...c, content } : c)));
  };

  // Run a single cell
  const handleRunCell = async (id: string) => {
    const targetCell = cells.find((c) => c.id === id);
    if (!targetCell || targetCell.type !== 'code') return;

    const nextCount = executionCounter;
    setExecutionCounter((prev) => prev + 1);

    // Mark executing
    setCells((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isExecuting: true, error: undefined } : c))
    );

    const startTime = Date.now();
    const content = targetCell.content.trim();

    try {
      // 1. Package install check (!pip install ...)
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

      // 2. Colab userdata authentication check
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

      // 3. Client initialization check
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

      // 4. Gemini API Call
      // Extract prompt from contents="..." or pass the prompt logic
      let promptToSend = 'Hello Gemini! Confirm you are working.';
      let systemInstruction: string | undefined = undefined;
      let responseMimeType: string | undefined = undefined;

      // Extract contents="string" or contents=prompt
      const contentsMatch = content.match(/contents\s*=\s*["']([^"']+)["']/s);
      if (contentsMatch) {
        promptToSend = contentsMatch[1];
      } else {
        const tripleQuoteMatch = content.match(/contents\s*=\s*"""(.*?)"""/s);
        if (tripleQuoteMatch) {
          promptToSend = tripleQuoteMatch[1].trim();
        } else {
          // If prompt variable was assigned earlier
          const promptVarMatch = content.match(/prompt\s*=\s*f?["']{1,3}(.*?)["']{1,3}/s);
          if (promptVarMatch) {
            promptToSend = promptVarMatch[1].trim();
          }
        }
      }

      // Check system instruction
      const sysMatch = content.match(/system_instruction\s*=\s*["']([^"']+)["']/);
      if (sysMatch) {
        systemInstruction = sysMatch[1];
      }

      // Check JSON response schema
      if (content.includes('application/json')) {
        responseMimeType = 'application/json';
      }

      // Call server backend proxy
      const res = await fetch('/api/gemini/run', {
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

  // Run all code cells sequentially
  const handleRunAll = async () => {
    if (isRunningAll) return;
    setIsRunningAll(true);

    const codeCells = cells.filter((c) => c.type === 'code');
    for (const cell of codeCells) {
      await handleRunCell(cell.id);
    }

    setIsRunningAll(false);
  };

  // Clear all cell outputs
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

  // Clear single cell output
  const handleClearSingleOutput = (id: string) => {
    setCells((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              output: undefined,
              error: undefined,
              executionCount: null,
              executionTimeMs: undefined,
            }
          : c
      )
    );
  };

  // Delete cell
  const handleDeleteCell = (id: string) => {
    if (cells.length <= 1) return;
    setCells((prev) => prev.filter((c) => c.id !== id));
  };

  // Move cell up
  const handleMoveUp = (id: string) => {
    const index = cells.findIndex((c) => c.id === id);
    if (index <= 0) return;
    const newCells = [...cells];
    const temp = newCells[index - 1];
    newCells[index - 1] = newCells[index];
    newCells[index] = temp;
    setCells(newCells);
  };

  // Move cell down
  const handleMoveDown = (id: string) => {
    const index = cells.findIndex((c) => c.id === id);
    if (index < 0 || index >= cells.length - 1) return;
    const newCells = [...cells];
    const temp = newCells[index + 1];
    newCells[index + 1] = newCells[index];
    newCells[index] = temp;
    setCells(newCells);
  };

  // Insert new cell
  const handleInsertCell = (type: 'code' | 'markdown', targetIndex: number) => {
    const newCell: NotebookCell = {
      id: `cell-${Date.now()}`,
      type,
      content:
        type === 'code'
          ? `# New Gemini API Code Cell\nresponse = client.models.generate_content(\n    model="gemini-3.8-flash",\n    contents="Your prompt here"\n)\nprint(response.text)`
          : `## 📝 New Section\nAdd your markdown notes here.`,
      executionCount: null,
    };

    const newCells = [...cells];
    newCells.splice(targetIndex, 0, newCell);
    setCells(newCells);
  };

  // Add source to NotebookLM
  const handleAddSource = (source: Omit<SourceDocument, 'id'>) => {
    setSources((prev) => [...prev, { ...source, id: `source-${Date.now()}` }]);
  };

  // Delete source from NotebookLM
  const handleDeleteSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#181a1f] text-gray-100 flex flex-col font-sans">
      {/* Top Navbar & Colab Status Bar */}
      <Navbar
        notebookTitle={notebookTitle}
        onTitleChange={setNotebookTitle}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRunAll={handleRunAll}
        onClearOutputs={handleClearOutputs}
        onAddCodeCell={() => handleInsertCell('code', cells.length)}
        onAddTextCell={() => handleInsertCell('markdown', cells.length)}
        onDownloadIpynb={() => downloadIpynb(cells, notebookTitle)}
        onOpenColabModal={() => setIsColabModalOpen(true)}
        isRunningAll={isRunningAll}
      />

      {/* Main Content Area based on Active Tab */}
      <div className="flex-1">
        {activeTab === 'homework' && <StudentHomeworkPortal />}

        {activeTab === 'modelkey' && <TeacherModelKeyViewer />}

        {activeTab === 'notebook' && (
          <NotebookView
            cells={cells}
            onRunCell={handleRunCell}
            onUpdateContent={handleUpdateContent}
            onDeleteCell={handleDeleteCell}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onClearOutput={handleClearSingleOutput}
            onInsertCell={handleInsertCell}
          />
        )}

        {activeTab === 'integration' && <NotebookIntegrationCode />}

        {activeTab === 'audio' && <AudioOverviewView sources={sources} />}

        {activeTab === 'guide' && <ColabGuideView />}
      </div>

      {/* Colab Launch & Code Export Modal */}
      <ColabGuideModal
        isOpen={isColabModalOpen}
        onClose={() => setIsColabModalOpen(false)}
        cells={cells}
        notebookTitle={notebookTitle}
      />
    </div>
  );
}
