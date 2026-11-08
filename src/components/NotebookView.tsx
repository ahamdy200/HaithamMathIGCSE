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
        } shrink-0 bg-[#181a1f] border-r border-[#2b303a] transition-all duration-200 select-none hidden md:flex flex-col`}
      >
        <div className="flex items-center justify-between p-2.5 border-b border-[#262a33]">
          {showToc && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
              <ListTree className="w-3.5 h-3.5 text-blue-400" />
              <span>Table of contents</span>
            </div>
          )}
          <button
            onClick={() => setShowToc(!showToc)}
            className="p-1 rounded hover:bg-[#282c34] text-gray-400 hover:text-white transition ml-auto"
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
                className={`block py-1 px-2 rounded hover:bg-[#252932] text-gray-400 hover:text-gray-200 transition line-clamp-1 ${
                  item.level === 1
                    ? 'font-bold text-gray-200'
                    : item.level === 2
                    ? 'pl-4 text-gray-300'
                    : 'pl-6 text-gray-400'
                }`}
              >
                {item.title}
              </a>
            ))}

            <div className="pt-4 mt-4 border-t border-[#262a33]">
              <div className="bg-[#20242c] p-2.5 rounded-lg border border-[#2d323d] space-y-2">
                <span className="text-[11px] font-semibold text-white flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  Gemini API Status
                </span>
                <p className="text-[11px] text-gray-400 leading-normal">
                  Google GenAI client active with <code className="text-blue-300">gemini-3.8-flash</code>.
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Ready to execute
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Notebook Canvas */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-8 py-6">
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
        <div className="mt-8 p-4 rounded-xl bg-[#1e222a] border border-[#2b303a] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              All code cells run live against the backend Gemini 3.8 Flash model. Shift+Enter or click the play button to execute.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onInsertCell('code', cells.length)}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#252932] hover:bg-[#303542] text-gray-200 border border-[#383e4c] transition"
            >
              <Code2 className="w-3.5 h-3.5 text-blue-400" />
              <span>+ Code cell</span>
            </button>
            <button
              onClick={() => onInsertCell('markdown', cells.length)}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#252932] hover:bg-[#303542] text-gray-200 border border-[#383e4c] transition"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Text cell</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
