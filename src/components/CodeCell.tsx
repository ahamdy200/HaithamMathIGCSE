import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  RotateCcw,
  Copy,
  Check,
  Trash2,
  ChevronUp,
  ChevronDown,
  Terminal,
  Loader2,
  Clock,
  Sparkles,
} from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import { NotebookCell } from '../types';

interface CodeCellProps {
  cell: NotebookCell;
  index: number;
  totalCells: number;
  onRun: (id: string) => void;
  onUpdateContent: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onClearOutput: (id: string) => void;
}

export const CodeCell: React.FC<CodeCellProps> = ({
  cell,
  index,
  totalCells,
  onRun,
  onUpdateContent,
  onDelete,
  onMoveUp,
  onMoveDown,
  onClearOutput,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [cell.content, isEditing]);

  const handleCopy = () => {
    navigator.clipboard.writeText(cell.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative rounded-lg border border-[#333842] bg-[#21252b] shadow-sm hover:border-[#4b5263] transition-colors mb-3">
      {/* Cell Header / Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#1e2227] rounded-t-lg border-b border-[#2d323b] text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-gray-400 bg-[#282c34] px-1.5 py-0.5 rounded">
            Cell {index + 1}
          </span>
          <span className="text-[11px] text-gray-500">Python 3 (google-genai)</span>
          {cell.executionTimeMs && (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" />
              {(cell.executionTimeMs / 1000).toFixed(2)}s
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onMoveUp(cell.id)}
            disabled={index === 0}
            className="p-1 hover:bg-[#2b303a] rounded text-gray-400 hover:text-gray-200 disabled:opacity-30"
            title="Move cell up"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onMoveDown(cell.id)}
            disabled={index === totalCells - 1}
            className="p-1 hover:bg-[#2b303a] rounded text-gray-400 hover:text-gray-200 disabled:opacity-30"
            title="Move cell down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopy}
            className="p-1 hover:bg-[#2b303a] rounded text-gray-400 hover:text-gray-200"
            title="Copy code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => onDelete(cell.id)}
            className="p-1 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400"
            title="Delete cell"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Cell Body */}
      <div className="flex items-start">
        {/* Left Colab-style Run Button Gutter */}
        <div className="p-3 pr-1 flex flex-col items-center select-none">
          <button
            onClick={() => onRun(cell.id)}
            disabled={cell.isExecuting}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
              cell.isExecuting
                ? 'bg-blue-600/30 text-blue-400 cursor-wait'
                : 'bg-[#2b303a] hover:bg-blue-600 hover:text-white text-gray-300'
            }`}
            title="Run cell (Shift+Enter)"
          >
            {cell.isExecuting ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>
          <span className="font-mono text-[11px] text-gray-500 mt-1">
            [{cell.isExecuting ? '*' : cell.executionCount !== undefined ? cell.executionCount : ' '}]
          </span>
        </div>

        {/* Code Editor / Highlighting Area */}
        <div className="flex-1 p-2 pl-1 overflow-x-auto">
          {isEditing ? (
            <textarea
              value={cell.content}
              onChange={(e) => onUpdateContent(cell.id, e.target.value)}
              onBlur={() => setIsEditing(false)}
              autoFocus
              rows={Math.max(3, cell.content.split('\n').length)}
              className="w-full bg-[#181a1f] text-gray-100 font-mono text-xs sm:text-sm p-3 rounded border border-blue-500/70 outline-none resize-y leading-relaxed"
            />
          ) : (
            <div
              onClick={() => setIsEditing(true)}
              className="group/code relative cursor-text rounded p-2.5 hover:bg-[#1c2026] transition font-mono text-xs sm:text-sm leading-relaxed"
              title="Click to edit code"
            >
              <pre className="!bg-transparent !p-0 !m-0 overflow-x-auto whitespace-pre">
                <code ref={codeRef} className="language-python">
                  {cell.content}
                </code>
              </pre>
              <span className="absolute top-2 right-2 text-[10px] text-gray-500 opacity-0 group-hover/code:opacity-100 transition px-1.5 py-0.5 rounded bg-[#282c34] pointer-events-none">
                Click to edit
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Output Console Section */}
      {(cell.output || cell.error || cell.isExecuting) && (
        <div className="border-t border-[#2d323b] bg-[#181a1f] rounded-b-lg p-3 text-xs font-mono">
          <div className="flex items-center justify-between mb-1.5 text-gray-400 text-[11px]">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-emerald-400" />
              <span className="font-semibold text-gray-300">Output</span>
              {cell.isExecuting && (
                <span className="text-blue-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 animate-pulse" /> Running against Gemini API...
                </span>
              )}
            </div>

            {cell.output && !cell.isExecuting && (
              <button
                onClick={() => onClearOutput(cell.id)}
                className="hover:text-gray-200 text-gray-500 flex items-center gap-1"
                title="Clear cell output"
              >
                <RotateCcw className="w-2.5 h-2.5" /> Clear
              </button>
            )}
          </div>

          {cell.output && (
            <pre className="whitespace-pre-wrap text-[#cdd3de] overflow-x-auto leading-relaxed bg-[#14161a] p-3 rounded border border-[#262a33]">
              {cell.output}
            </pre>
          )}

          {cell.error && (
            <div className="mt-2 p-3 bg-red-950/40 border border-red-500/40 rounded text-red-300 whitespace-pre-wrap">
              {cell.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
