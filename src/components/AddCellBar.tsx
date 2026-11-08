import React from 'react';
import { Plus } from 'lucide-react';

interface AddCellBarProps {
  onAddCode: () => void;
  onAddText: () => void;
}

export const AddCellBar: React.FC<AddCellBarProps> = ({ onAddCode, onAddText }) => {
  return (
    <div className="relative group/bar flex items-center justify-center my-1.5 py-1">
      {/* Invisible hover zone with subtle burgundy line indicator */}
      <div className="absolute inset-x-0 h-[1px] bg-transparent group-hover/bar:bg-[#800020]/30 transition-colors" />

      <div className="opacity-0 group-hover/bar:opacity-100 transition-opacity z-10 flex items-center gap-2 bg-white px-2 py-0.5 rounded-full border border-[#e6ccd2] shadow-md">
        <button
          onClick={onAddCode}
          className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-[#800020] hover:bg-[#fdf2f4] px-2.5 py-0.5 rounded-full transition"
        >
          <Plus className="w-3 h-3 text-[#800020]" />
          <span>Code</span>
        </button>

        <span className="text-slate-300 text-xs">•</span>

        <button
          onClick={onAddText}
          className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-[#800020] hover:bg-[#fdf2f4] px-2.5 py-0.5 rounded-full transition"
        >
          <Plus className="w-3 h-3 text-[#800020]" />
          <span>Text</span>
        </button>
      </div>
    </div>
  );
};
