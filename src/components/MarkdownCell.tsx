import React, { useState } from 'react';
import {
  Edit3,
  Check,
  Trash2,
  ChevronUp,
  ChevronDown,
  Copy,
  FileText,
} from 'lucide-react';
import { NotebookCell } from '../types';

interface MarkdownCellProps {
  cell: NotebookCell;
  index: number;
  totalCells: number;
  onUpdateContent: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

export const MarkdownCell: React.FC<MarkdownCellProps> = ({
  cell,
  index,
  totalCells,
  onUpdateContent,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(cell.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple clean markdown parser for titles, bold, code, lists
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // H1
      if (line.startsWith('# ')) {
        return (
          <h1 key={i} className="text-xl sm:text-2xl font-bold text-white mb-2 pb-1 border-b border-[#333842]">
            {line.replace('# ', '')}
          </h1>
        );
      }
      // H2
      if (line.startsWith('## ')) {
        return (
          <h2 key={i} className="text-lg sm:text-xl font-semibold text-gray-100 mt-3 mb-1.5 flex items-center gap-2">
            {line.replace('## ', '')}
          </h2>
        );
      }
      // H3
      if (line.startsWith('### ')) {
        return (
          <h3 key={i} className="text-base font-medium text-gray-200 mt-2 mb-1">
            {line.replace('### ', '')}
          </h3>
        );
      }
      // Numbered List
      const numMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        return (
          <div key={i} className="flex items-start gap-2 text-sm text-gray-300 ml-2 my-0.5">
            <span className="font-semibold text-blue-400 min-w-[20px]">{numMatch[1]}.</span>
            <span>{parseInlineFormatting(numMatch[2])}</span>
          </div>
        );
      }
      // Bullet List
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <div key={i} className="flex items-start gap-2 text-sm text-gray-300 ml-3 my-0.5">
            <span className="text-emerald-400 mt-1.5 text-xs">•</span>
            <span>{parseInlineFormatting(line.replace(/^[-*]\s+/, ''))}</span>
          </div>
        );
      }
      // Empty line
      if (!line.trim()) {
        return <div key={i} className="h-2" />;
      }
      // Regular paragraph
      return (
        <p key={i} className="text-sm text-gray-300 leading-relaxed my-1">
          {parseInlineFormatting(line)}
        </p>
      );
    });
  };

  const parseInlineFormatting = (str: string) => {
    // Replace **bold** and `code`
    const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={idx} className="px-1.5 py-0.5 rounded bg-[#282c34] text-blue-300 font-mono text-xs border border-[#373c47]">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className="group relative rounded-lg border border-[#2e333d] bg-[#1c2026] hover:border-[#3e4453] transition-colors mb-3">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#181a1f] rounded-t-lg border-b border-[#262a33] text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400 bg-[#22252c] px-1.5 py-0.5 rounded flex items-center gap-1">
            <FileText className="w-3 h-3 text-emerald-400" />
            Markdown
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[#282c34] text-gray-400 hover:text-gray-200 text-[11px]"
            title="Edit markdown"
          >
            {isEditing ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" /> Done
              </>
            ) : (
              <>
                <Edit3 className="w-3 h-3" /> Edit
              </>
            )}
          </button>

          <button
            onClick={() => onMoveUp(cell.id)}
            disabled={index === 0}
            className="p-1 hover:bg-[#282c34] rounded text-gray-400 hover:text-gray-200 disabled:opacity-30"
            title="Move cell up"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onMoveDown(cell.id)}
            disabled={index === totalCells - 1}
            className="p-1 hover:bg-[#282c34] rounded text-gray-400 hover:text-gray-200 disabled:opacity-30"
            title="Move cell down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopy}
            className="p-1 hover:bg-[#282c34] rounded text-gray-400 hover:text-gray-200"
            title="Copy markdown text"
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

      {/* Main Body */}
      <div className="p-4">
        {isEditing ? (
          <textarea
            value={cell.content}
            onChange={(e) => onUpdateContent(cell.id, e.target.value)}
            rows={Math.max(4, cell.content.split('\n').length)}
            autoFocus
            className="w-full bg-[#14161a] text-gray-100 font-mono text-xs sm:text-sm p-3 rounded border border-blue-500/70 outline-none resize-y leading-relaxed"
          />
        ) : (
          <div
            onDoubleClick={() => setIsEditing(true)}
            className="cursor-text"
            title="Double click to edit"
          >
            {renderMarkdown(cell.content)}
          </div>
        )}
      </div>
    </div>
  );
};
