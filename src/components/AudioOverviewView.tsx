import React, { useState, useEffect, useRef } from 'react';
import {
  Headphones,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  Copy,
  Check,
  Radio,
  Loader2,
  FileText,
} from 'lucide-react';
import { SourceDocument, AudioOverviewData, DialogueTurn } from '../types';

interface AudioOverviewViewProps {
  sources: SourceDocument[];
}

export const AudioOverviewView: React.FC<AudioOverviewViewProps> = ({ sources }) => {
  const [audioData, setAudioData] = useState<AudioOverviewData>({
    title: 'Deep Dive: Cambridge IGCSE Math Marking & Assessment Studio',
    durationSeconds: 155,
    turns: [
      {
        speaker: 'Alex',
        text: "Welcome to today's NotebookLM Deep Dive! We're digging into the Cambridge IGCSE Mathematics homework assessment architecture and how student working is evaluated.",
      },
      {
        speaker: 'Jordan',
        text: "Yeah, and what immediately stands out is the multi-repository grading pipeline. It doesn't just look at the final answer—it analyzes intermediate working for method [M1] and accuracy [A1] marks.",
      },
      {
        speaker: 'Alex',
        text: "Right! For example on Order of Operations (BIDMAS), if a student expands brackets correctly but makes a small arithmetic slip at the end, the engine detects that and awards partial credit.",
      },
      {
        speaker: 'Jordan',
        text: "Exactly. Plus with the 5-repository pool—AutoMark CV, CNN equation solving, Pix2Text LaTeX formula recognition, and vision AI—handwritten worksheets are parsed seamlessly.",
      },
      {
        speaker: 'Alex',
        text: 'And each student receives a Cambridge-formatted diagnostic evaluation report with personalized next steps and target practice problems.',
      },
      {
        speaker: 'Jordan',
        text: "It really transforms mathematics homework from passive red-pen marking into an active pedagogical learning loop.",
      },
      {
        speaker: 'Alex',
        text: 'Outstanding stuff. Let’s encourage everyone checking homework to hit "Run 5-Repo Unified Pool" and test their submissions!',
      },
    ],
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [focusTopic, setFocusTopic] = useState('Cambridge IGCSE Math & BIDMAS Assessment');
  const [copiedScript, setCopiedScript] = useState(false);

  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Web Speech playback
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isPlaying) {
      if (synthRef.current && synthRef.current.speaking) {
        synthRef.current.cancel();
      }

      const currentTurn = audioData.turns[currentTurnIndex];
      if (currentTurn && synthRef.current) {
        const utterance = new SpeechSynthesisUtterance(currentTurn.text);
        utterance.rate = playbackSpeed;
        utterance.pitch = currentTurn.speaker === 'Alex' ? 1.15 : 0.95;

        utterance.onend = () => {
          if (currentTurnIndex < audioData.turns.length - 1) {
            setCurrentTurnIndex((prev) => prev + 1);
          } else {
            setIsPlaying(false);
            setCurrentTurnIndex(0);
          }
        };

        utterance.onerror = () => {
          timer = setTimeout(() => {
            if (currentTurnIndex < audioData.turns.length - 1) {
              setCurrentTurnIndex((prev) => prev + 1);
            } else {
              setIsPlaying(false);
              setCurrentTurnIndex(0);
            }
          }, 4500 / playbackSpeed);
        };

        synthRef.current.speak(utterance);
      } else {
        timer = setTimeout(() => {
          if (currentTurnIndex < audioData.turns.length - 1) {
            setCurrentTurnIndex((prev) => prev + 1);
          } else {
            setIsPlaying(false);
            setCurrentTurnIndex(0);
          }
        }, 5000 / playbackSpeed);
      }
    } else {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    }

    return () => {
      clearTimeout(timer);
    };
  }, [isPlaying, currentTurnIndex, audioData.turns, playbackSpeed]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (synthRef.current) synthRef.current.cancel();
    } else {
      setIsPlaying(true);
    }
  };

  const handleRestart = () => {
    setIsPlaying(false);
    setCurrentTurnIndex(0);
    if (synthRef.current) synthRef.current.cancel();
  };

  const handleGenerateScript = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/gemini/audio-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources: sources.map((s) => ({ title: s.title, content: s.content })),
          focus: focusTopic,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.script && data.script.length > 0) {
          setAudioData({
            title: data.title || focusTopic,
            durationSeconds: data.script.length * 25,
            turns: data.script,
          });
          setCurrentTurnIndex(0);
          setIsPlaying(true);
        }
      }
    } catch (err) {
      console.warn('Audio overview API call failed, keeping active transcript', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyScript = () => {
    const text = audioData.turns.map((t) => `${t.speaker}: ${t.text}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 min-h-[calc(100vh-100px)] text-slate-800">
      {/* Cambridge Academic Studio Banner */}
      <div className="bg-gradient-to-r from-[#6b1226] via-[#800020] to-[#590e1f] text-white border border-[#9f1239] rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Subtle Mathematical Watermark Background */}
        <div className="absolute right-4 top-2 text-white/10 text-7xl md:text-9xl font-serif select-none pointer-events-none font-bold tracking-widest">
          ∯ ∑ π
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 text-rose-200 border border-white/20 flex items-center justify-center shadow-inner">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/15 text-rose-100 font-semibold uppercase tracking-wider flex items-center gap-1 border border-white/20">
                  <Radio className="w-3 h-3 text-rose-200 animate-pulse" />
                  NotebookLM Audio Overview
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1.5 tracking-tight">{audioData.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyScript}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition shadow-xs"
            >
              {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedScript ? 'Copied' : 'Copy Script'}</span>
            </button>
          </div>
        </div>

        {/* Audio Player Controls & Waveform */}
        <div className="bg-black/20 backdrop-blur-xs border border-white/15 rounded-xl p-5 space-y-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleTogglePlay}
                className="w-12 h-12 rounded-full bg-white text-[#800020] hover:bg-rose-50 flex items-center justify-center shadow-lg transition transform active:scale-95 font-bold"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              <button
                onClick={handleRestart}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition"
                title="Restart from beginning"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 text-xs text-rose-100 font-mono bg-white/10 px-2.5 py-1 rounded-md border border-white/15">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Turn {currentTurnIndex + 1} of {audioData.turns.length}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-200">Speed:</span>
              <button
                onClick={() => setPlaybackSpeed((s) => (s === 1 ? 1.25 : s === 1.25 ? 1.5 : 1))}
                className="text-xs px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-rose-100 font-mono font-medium border border-white/15 transition"
              >
                {playbackSpeed}x
              </button>
            </div>
          </div>

          {/* Interactive Waveform Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-rose-200 font-mono">
              <span>Host Dialogue Progression</span>
              <span>{Math.round(((currentTurnIndex + 1) / audioData.turns.length) * 100)}%</span>
            </div>
            <div className="w-full bg-white/15 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-rose-200 to-amber-200 h-full transition-all duration-300 shadow-sm"
                style={{ width: `${((currentTurnIndex + 1) / audioData.turns.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Custom Regenerate Topic Bar */}
        <div className="mt-4 pt-4 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
          <input
            type="text"
            value={focusTopic}
            onChange={(e) => setFocusTopic(e.target.value)}
            placeholder="Focus topic (e.g. Cambridge Method [M1] & Accuracy [A1] rubrics)..."
            className="flex-1 bg-white text-slate-900 px-3.5 py-2 rounded-lg border border-white/30 text-xs outline-none focus:ring-2 focus:ring-rose-200 w-full"
          />
          <button
            onClick={handleGenerateScript}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#be123c] hover:bg-[#e11d48] text-white rounded-lg text-xs font-bold shadow-md shrink-0 disabled:opacity-50 transition w-full sm:w-auto justify-center"
          >
            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{isGenerating ? 'Synthesizing...' : 'Regenerate Deep Dive'}</span>
          </button>
        </div>
      </div>

      {/* Synchronized Live Transcript */}
      <div className="bg-white border border-[#f0d8dd] rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-[#f5e6e8]">
          <h3 className="font-bold text-sm text-[#701a2d] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#800020]" />
            Synchronized Podcast Transcript
          </h3>
          <span className="text-xs text-slate-400 font-mono">Grounded in Cambridge Notes</span>
        </div>

        <div className="space-y-3">
          {audioData.turns.map((turn, index) => {
            const isCurrent = index === currentTurnIndex;
            return (
              <div
                key={index}
                onClick={() => setCurrentTurnIndex(index)}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  isCurrent
                    ? 'bg-[#fff1f2] border-2 border-[#800020] shadow-sm ring-1 ring-[#800020]/20'
                    : 'bg-[#fffdfa] border-[#f0d8dd] hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                      turn.speaker === 'Alex'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-rose-100 text-[#800020] border border-rose-300'
                    }`}
                  >
                    {turn.speaker === 'Alex' ? 'AL' : 'JO'}
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      turn.speaker === 'Alex' ? 'text-amber-900' : 'text-[#800020]'
                    }`}
                  >
                    {turn.speaker} {turn.speaker === 'Alex' ? '(Host)' : '(Co-Host)'}
                  </span>
                  {isCurrent && isPlaying && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#800020] text-white font-semibold ml-auto flex items-center gap-1 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                      Speaking
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed pl-8 font-medium">
                  {turn.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
