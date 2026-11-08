import React, { useState } from 'react';
import {
  FileText,
  Code2,
  ListTree,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Info,
  Layers,
} from 'lucide-react';
import { NotebookCell } from '../types';
import { CodeCell } from './CodeCell';
import { MarkdownCell } from './MarkdownCell';
import { AddCellBar } from './AddCellBar';

interface NotebookViewProps {
  cells: NotebookCell[];
  selectedNotebook?: 'igcse' | 'equation_solver';
  onSelectNotebook?: (nb: 'igcse' | 'equation_solver') => void;
  onRunCell: (id: string) => Promise<void>;
  onUpdateContent: (id: string, content: string) => void;
  onDeleteCell: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onClearOutput: (id: string) => void;
  onInsertCell: (type: 'code' | 'markdown', index: number) => void;
}

export const NotebookView: React.FC<NotebookViewProps> = ({
  cells,
  selectedNotebook = 'igcse',
  onSelectNotebook,
  onRunCell,
  onUpdateContent,
  onDeleteCell,
  onMoveUp,
  onMoveDown,
  onClearOutput,
  onInsertCell,
}) => {
  const [showToc, setShowToc] = useState(true);

  // Extract headings for Table of Contents
  const tocItems = cells
    .filter((c) => c.type === 'markdown')
    .map((c) => {
      const match = c.content.match(/^(#{1,3})\s+(.*)/m);
      if (match) {
        return {
          id: c.id,
          level: match[1].length,
          title: match[2].replace(/[*`_]/g, ''),
        };
      }
      return null;
    })
    .filter(Boolean) as Array<{ id: string; level: number; title: string }>;

  return (
    <div className="flex w-full min-h-[calc(100vh-100px)]">
      {/* Colab Sidebar Table of Contents (Collapsible) */}
      <aside
        className={`${
          showToc ? 'w-64' : 'w-10'
        } shrink-0 bg-white border-r border-[#e6ccd2] transition-all duration-200 select-none hidden md:flex flex-col shadow-xs`}
      >
        <div className="flex items-center justify-between p-2.5 border-b border-[#f0d8dd]">
          {showToc && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#800020] font-serif">
              <ListTree className="w-3.5 h-3.5 text-[#800020]" />
              <span>Table of contents</span>
            </div>
          )}
          <button
            onClick={() => setShowToc(!showToc)}
            className="p-1 rounded hover:bg-[#fdf4f6] text-slate-500 hover:text-[#800020] transition ml-auto"
            title={showToc ? 'Collapse outline' : 'Expand outline'}
          >
            {showToc ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {showToc && (
          <div className="p-2 space-y-1 overflow-y-auto flex-1 text-xs">
            {tocItems.map((item, idx) => (
              <a
                key={idx}
                href={`#${item.id}`}
                className={`block py-1 px-2 rounded hover:bg-[#fdf2f4] text-slate-600 hover:text-[#800020] transition line-clamp-1 ${
                  item.level === 1
                    ? 'font-bold text-slate-900 font-serif'
                    : item.level === 2
                    ? 'pl-4 text-slate-700 font-medium'
                    : 'pl-6 text-slate-500'
                }`}
              >
                {item.title}
              </a>
            ))}

            <div className="pt-4 mt-4 border-t border-[#f0d8dd]">
              <div className="bg-[#fffdfa] p-2.5 rounded-lg border border-[#edd7dc] space-y-2 shadow-2xs">
                <span className="text-[11px] font-bold text-[#800020] flex items-center gap-1 font-serif">
                  <Sparkles className="w-3 h-3 text-[#800020]" />
                  Gemini API Status
                </span>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Google GenAI client active with <code className="text-[#800020] font-semibold">gemini-3.8-flash</code>.
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-mono font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  Ready to execute
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Notebook Canvas */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-4">
        {/* Notebook Switcher Header */}
        <div className="bg-white border border-[#e6ccd2] rounded-xl p-3.5 flex items-center justify-between flex-wrap gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-medium">Active Colab Notebook:</span>
            <div className="flex rounded-lg bg-[#fbf4f5] p-1 border border-[#ecd5da] gap-1">
              <button
                type="button"
                onClick={() => onSelectNotebook?.('igcse')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                  selectedNotebook === 'igcse'
                    ? 'bg-[#800020] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#800020] hover:bg-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>1. IGCSE BIDMAS Grader</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  selectedNotebook === 'igcse' ? 'bg-white/20 text-white' : 'bg-[#edd7dc] text-[#800020]'
                }`}>
                  9 Cells
                </span>
              </button>
              <button
                type="button"
                onClick={() => onSelectNotebook?.('equation_solver')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                  selectedNotebook === 'equation_solver'
                    ? 'bg-[#800020] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#800020] hover:bg-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>2. Handwritten Equation Solver CNN</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  selectedNotebook === 'equation_solver' ? 'bg-white/20 text-white' : 'bg-[#edd7dc] text-[#800020]'
                }`}>
                  44 Cells (Connected Repo)
                </span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            {selectedNotebook === 'equation_solver' ? (
              <span className="text-[#800020] font-semibold">
                Source: repos/Hand-Written-Equation-Solver/Notebook.ipynb
              </span>
            ) : (
              <span className="text-[#800020] font-semibold">
                Source: Cambridge IGCSE Math Model Key
              </span>
            )}
          </div>
        </div>

        {/* Top Add Cell Bar */}
        <AddCellBar onAddCode={() => onInsertCell('code', 0)} onAddText={() => onInsertCell('markdown', 0)} />

        {/* Cells List */}
        {cells.map((cell, index) => (
          <React.Fragment key={cell.id}>
            <div id={cell.id} className="scroll-mt-20">
              {cell.type === 'code' ? (
                <CodeCell
                  cell={cell}
                  index={index}
                  totalCells={cells.length}
                  onRun={onRunCell}
                  onUpdateContent={onUpdateContent}
                  onDelete={onDeleteCell}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                  onClearOutput={onClearOutput}
                />
              ) : (
                <MarkdownCell
                  cell={cell}
                  index={index}
                  totalCells={cells.length}
                  onUpdateContent={onUpdateContent}
                  onDelete={onDeleteCell}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                />
              )}
            </div>

            {/* In-between cell insertion bar */}
            <AddCellBar
              onAddCode={() => onInsertCell('code', index + 1)}
              onAddText={() => onInsertCell('markdown', index + 1)}
            />
          </React.Fragment>
        ))}

        {/* Bottom helper card */}
        <div className="mt-8 p-4 rounded-xl bg-white border border-[#e6ccd2] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-[#800020] shrink-0" />
            <span>
              All code cells run live against the backend Gemini 3.8 Flash model. Shift+Enter or click the play button to execute.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onInsertCell('code', cells.length)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#fdf2f4] hover:bg-[#fae3e7] text-[#800020] border border-[#f0d8dd] font-semibold transition"
            >
              <Code2 className="w-3.5 h-3.5 text-[#800020]" />
              <span>+ Code cell</span>
            </button>
            <button
              onClick={() => onInsertCell('markdown', cells.length)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#fdf2f4] hover:bg-[#fae3e7] text-[#800020] border border-[#f0d8dd] font-semibold transition"
            >
              <FileText className="w-3.5 h-3.5 text-[#800020]" />
              <span>+ Text cell</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
