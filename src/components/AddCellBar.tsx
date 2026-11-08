import React from 'react';
import { Plus } from 'lucide-react';

interface AddCellBarProps {
  onAddCode: () => void;
  onAddText: () => void;
}

export const AddCellBar: React.FC<AddCellBarProps> = ({ onAddCode, onAddText }) => {
  return (
    <div className="relative group/bar flex items-center justify-center my-1.5 py-1">
      {/* Invisible hover zone with subtle line indicator */}
      <div className="absolute inset-x-0 h-[1px] bg-transparent group-hover/bar:bg-blue-500/30 transition-colors" />

      <div className="opacity-0 group-hover/bar:opacity-100 transition-opacity z-10 flex items-center gap-2 bg-[#1e222a] px-2 py-0.5 rounded-full border border-[#373c47] shadow-lg">
        <button
          onClick={onAddCode}
          className="flex items-center gap-1 text-[11px] font-medium text-gray-300 hover:text-white hover:bg-[#282c34] px-2 py-0.5 rounded-full transition"
        >
          <Plus className="w-3 h-3 text-blue-400" />
          <span>Code</span>
        </button>

        <span className="text-gray-600 text-xs">•</span>

        <button
          onClick={onAddText}
          className="flex items-center gap-1 text-[11px] font-medium text-gray-300 hover:text-white hover:bg-[#282c34] px-2 py-0.5 rounded-full transition"
        >
          <Plus className="w-3 h-3 text-emerald-400" />
          <span>Text</span>
        </button>
      </div>
    </div>
  );
};
