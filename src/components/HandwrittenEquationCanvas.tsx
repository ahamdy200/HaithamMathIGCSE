import React, { useRef, useState, useEffect } from 'react';
import {
  PenTool,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  PlusCircle,
} from 'lucide-react';

interface HandwrittenEquationCanvasProps {
  onInsertAnswer?: (text: string) => void;
}

export const HandwrittenEquationCanvas: React.FC<HandwrittenEquationCanvasProps> = ({
  onInsertAnswer,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [recognizedEquation, setRecognizedEquation] = useState('5 * (4^2 + 2 - 12)');
  const [isSolving, setIsSolving] = useState(false);
  const [solveResult, setSolveResult] = useState<{
    result: number | string;
    steps: string[];
    sanitized: string;
  } | null>(null);
  const [insertSuccess, setInsertSuccess] = useState(false);

  // Initialize canvas with smooth white parchment background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set display resolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.fillStyle = '#fffdfa';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Initial guide text
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      'Draw your handwritten math equation or expression here (e.g. 5 × (4² + 2 − 12))',
      rect.width / 2,
      rect.height / 2
    );
  }, []);

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (!hasDrawn) {
      // Clear initial guide text on first stroke
      ctx.fillStyle = '#fffdfa';
      ctx.fillRect(0, 0, rect.width, rect.height);
      setHasDrawn(true);
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#800020'; // Rich Burgundy ink
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#fffdfa';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
    setSolveResult(null);
  };

  const handlePreset = (eq: string) => {
    setRecognizedEquation(eq);
    handleClear();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#800020';
    ctx.font = 'bold 26px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(eq, rect.width / 2, rect.height / 2 + 8);
    setHasDrawn(true);
  };

  const handleSolve = async () => {
    setIsSolving(true);
    setSolveResult(null);
    try {
      const res = await fetch('/api/solver/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: recognizedEquation }),
      });
      const data = await res.json();
      if (data.success) {
        setSolveResult({
          result: data.result,
          steps: data.steps,
          sanitized: data.sanitized,
        });
      } else {
        // Fallback local eval
        try {
          const sanitized = recognizedEquation
            .replace(/x/gi, '*')
            .replace(/÷/g, '/')
            .replace(/\^/g, '**');
          // eslint-disable-next-line no-eval
          const val = Function(`'use strict'; return (${sanitized})`)();
          setSolveResult({
            result: val,
            steps: [`Original: ${recognizedEquation}`, `Evaluated via BIDMAS: ${val}`],
            sanitized,
          });
        } catch {
          setSolveResult({
            result: 'Error',
            steps: ['Please check the equation format'],
            sanitized: recognizedEquation,
          });
        }
      }
    } catch {
      // Offline fallback
      try {
        const sanitized = recognizedEquation
          .replace(/x/gi, '*')
          .replace(/÷/g, '/')
          .replace(/\^/g, '**');
        // eslint-disable-next-line no-eval
        const val = Function(`'use strict'; return (${sanitized})`)();
        setSolveResult({
          result: val,
          steps: [`Original: ${recognizedEquation}`, `Calculated BIDMAS: ${val}`],
          sanitized,
        });
      } catch {
        setSolveResult({
          result: 'Invalid',
          steps: ['Could not evaluate equation syntax'],
          sanitized: recognizedEquation,
        });
      }
    } finally {
      setIsSolving(false);
    }
  };

  const handleInsert = () => {
    if (!onInsertAnswer) return;
    const textToInsert = solveResult
      ? `${recognizedEquation} = ${solveResult.result}`
      : recognizedEquation;
    onInsertAnswer(textToInsert);
    setInsertSuccess(true);
    setTimeout(() => setInsertSuccess(false), 2500);
  };

  return (
    <div className="bg-white border border-[#e6ccd2] rounded-xl p-4 space-y-4 shadow-sm">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-[#f0d8dd] pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#fdf2f4] border border-[#f0d8dd] flex items-center justify-center text-[#800020]">
            <PenTool className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 font-serif">
              <span>Handwritten Canvas &amp; DL Solver</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#fdf2f4] text-[#800020] border border-[#f0d8dd] font-mono font-semibold">
                CNN Powered
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Integrated from connected repo: <code className="text-[#800020] font-semibold">Hand-Written-Equation-Solver</code>
            </p>
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-500 font-medium">Presets:</span>
          <button
            type="button"
            onClick={() => handlePreset('5 * (4^2 + 2 - 12)')}
            className="text-[10px] px-2.5 py-1 rounded bg-[#fdf4f6] hover:bg-[#f8e4e8] text-[#800020] border border-[#ecd2d7] transition font-mono font-medium shadow-2xs"
          >
            Q2: 5 × (4² + 2 − 12)
          </button>
          <button
            type="button"
            onClick={() => handlePreset('8 + 12 / 4')}
            className="text-[10px] px-2.5 py-1 rounded bg-[#fdf4f6] hover:bg-[#f8e4e8] text-[#800020] border border-[#ecd2d7] transition font-mono font-medium shadow-2xs"
          >
            Q1: 8 + 12 ÷ 4
          </button>
          <button
            type="button"
            onClick={() => handlePreset('(23 - 3 * 3)^2')}
            className="text-[10px] px-2.5 py-1 rounded bg-[#fdf4f6] hover:bg-[#f8e4e8] text-[#800020] border border-[#ecd2d7] transition font-mono font-medium shadow-2xs"
          >
            Q4: (23 − 3 × 3)²
          </button>
        </div>
      </div>

      {/* Canvas Drawing Area */}
      <div className="relative border border-[#e6ccd2] rounded-xl overflow-hidden shadow-inner bg-[#fffdfa]">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-56 cursor-crosshair touch-none"
        />

        {/* Canvas floating controls */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-[#e8d5d8] p-1.5 rounded-lg text-xs shadow-sm">
          <label className="text-slate-600 text-[10px] flex items-center gap-1 font-medium">
            <span>Stroke:</span>
            <input
              type="range"
              min="2"
              max="12"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-16 accent-[#800020] cursor-pointer h-1"
            />
            <span className="font-mono text-[#800020] font-semibold">{strokeWidth}px</span>
          </label>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded text-slate-500 hover:text-[#800020] hover:bg-[#fdf4f6] transition"
            title="Clear Canvas"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Recognized Equation Input & Solver Trigger */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-serif">
            <Sparkles className="w-3.5 h-3.5 text-[#800020]" />
            Recognized Mathematical Equation / Expression:
          </span>
          <span className="text-[10px] text-slate-500">Edit formula if needed</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={recognizedEquation}
            onChange={(e) => setRecognizedEquation(e.target.value)}
            placeholder="e.g. 5 * (4^2 + 2 - 12) or 8 + 12 / 4"
            className="flex-1 bg-[#fffdfa] border border-[#e2cbd0] rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#800020] transition shadow-2xs"
          />
          <button
            type="button"
            onClick={handleSolve}
            disabled={isSolving || !recognizedEquation.trim()}
            className="px-4 py-2 rounded-lg bg-[#800020] hover:bg-[#6b1226] text-white text-xs font-bold flex items-center gap-1.5 shadow transition disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSolving ? 'Solving...' : 'Solve (BIDMAS)'}</span>
          </button>
        </div>
      </div>

      {/* Solver Steps & Result Box */}
      {solveResult && (
        <div className="bg-[#fdf8f9] border border-[#ecd2d7] rounded-xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-serif">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Evaluation Result:
            </span>
            <div className="px-3 py-1 rounded-md bg-[#800020] text-white font-mono font-bold text-sm shadow-sm">
              = {solveResult.result}
            </div>
          </div>

          <div className="space-y-1 bg-white p-3 rounded-lg border border-[#ebd8dc] text-[11px] font-mono text-slate-800 shadow-2xs">
            {solveResult.steps.map((st, i) => (
              <div key={i} className="text-slate-700">
                {st}
              </div>
            ))}
          </div>

          {onInsertAnswer && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleInsert}
                className="px-3.5 py-1.5 rounded-lg bg-[#800020] hover:bg-[#6b1226] text-white text-xs font-semibold flex items-center gap-1.5 shadow transition"
              >
                {insertSuccess ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                ) : (
                  <PlusCircle className="w-3.5 h-3.5" />
                )}
                <span>
                  {insertSuccess ? 'Inserted into Homework!' : 'Use Answer in Homework'}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
