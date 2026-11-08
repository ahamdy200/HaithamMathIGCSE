import React, { useState, useEffect, useRef } from 'react';
import {
  Headphones,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  Download,
  Copy,
  Check,
  Radio,
  Share2,
  Sliders,
  Loader2,
  FileText,
} from 'lucide-react';
import { SourceDocument, AudioOverviewData, DialogueTurn } from '../types';

interface AudioOverviewViewProps {
  sources: SourceDocument[];
}

export const AudioOverviewView: React.FC<AudioOverviewViewProps> = ({ sources }) => {
  const [audioData, setAudioData] = useState<AudioOverviewData>({
    title: 'Deep Dive: Gemini 3.8 Flash & Google Colab Prototyping',
    durationSeconds: 155,
    turns: [
      {
        speaker: 'Alex',
        text: "Welcome to today's NotebookLM Deep Dive! We're digging into the brand new Google GenAI SDK and how developers are running it inside Google Colab.",
      },
      {
        speaker: 'Jordan',
        text: "Yeah, and what immediately jumps out from these notes is how Google solved the API key security issue in notebooks. People used to paste keys into raw cells—which was super risky.",
      },
      {
        speaker: 'Alex',
        text: "Right! Now Colab has that dedicated Key icon in the sidebar—Colab Secrets—and with just 'userdata.get', the environment is encrypted and safe.",
      },
      {
        speaker: 'Jordan',
        text: "Exactly. Plus, with Gemini 3.8 Flash, the response latency is drastically reduced, making streaming and structured Pydantic outputs feel instantaneous.",
      },
      {
        speaker: 'Alex',
        text: 'That combination of zero-friction auth and lightning-fast inference really makes Colab the ideal sandbox for AI prototyping.',
      },
      {
        speaker: 'Jordan',
        text: "And don't forget the 1-million token context window. In these notebook sources, they point out you can feed entire repos or research papers right into the prompt.",
      },
      {
        speaker: 'Alex',
        text: 'Mind-blowing stuff. Let’s encourage everyone listening to hit "Run All" and test it out for themselves!',
      },
    ],
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [focusTopic, setFocusTopic] = useState('Gemini API Quickstart & Security Architecture');
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
    } catch (err) {
      console.error(err);
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
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 min-h-[calc(100vh-100px)]">
      {/* Studio Banner */}
      <div className="bg-gradient-to-r from-purple-900/30 via-[#231e33] to-blue-900/30 border border-purple-500/30 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-inner">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Radio className="w-3 h-3 text-purple-400 animate-pulse" />
                  NotebookLM Audio Overview
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">{audioData.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyScript}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2b303a] hover:bg-[#383e4c] text-gray-200 text-xs font-medium border border-[#3e4453] transition"
            >
              {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedScript ? 'Copied' : 'Copy Script'}</span>
            </button>
          </div>
        </div>

        {/* Audio Player Controls & Waveform */}
        <div className="bg-[#181a1f] border border-[#2b303a] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleTogglePlay}
                className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg transition transform active:scale-95"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              <button
                onClick={handleRestart}
                className="p-2 rounded-lg bg-[#252932] hover:bg-[#303542] text-gray-400 hover:text-white transition"
                title="Restart from beginning"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 text-xs text-purple-300 font-mono bg-[#252932] px-2.5 py-1 rounded-md">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Turn {currentTurnIndex + 1} of {audioData.turns.length}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Speed:</span>
              <button
                onClick={() => setPlaybackSpeed((s) => (s === 1 ? 1.25 : s === 1.25 ? 1.5 : 1))}
                className="text-xs px-2.5 py-1 rounded-md bg-[#252932] hover:bg-[#303542] text-purple-300 font-mono font-medium transition"
              >
                {playbackSpeed}x
              </button>
            </div>
          </div>

          {/* Interactive Waveform Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
              <span>Host Dialogue Progression</span>
              <span>{Math.round(((currentTurnIndex + 1) / audioData.turns.length) * 100)}%</span>
            </div>
            <div className="w-full bg-[#252932] h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full transition-all duration-300"
                style={{ width: `${((currentTurnIndex + 1) / audioData.turns.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Custom Regenerate Topic Bar */}
        <div className="mt-4 pt-4 border-t border-[#313645] flex flex-col sm:flex-row items-center justify-between gap-3">
          <input
            type="text"
            value={focusTopic}
            onChange={(e) => setFocusTopic(e.target.value)}
            placeholder="Focus topic (e.g. Rate limits, Multimodal vision, Colab Secrets)..."
            className="flex-1 bg-[#181a1f] text-white px-3.5 py-2 rounded-lg border border-[#373c47] text-xs outline-none focus:border-purple-500 w-full"
          />
          <button
            onClick={handleGenerateScript}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow shrink-0 disabled:opacity-50 transition w-full sm:w-auto justify-center"
          >
            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{isGenerating ? 'Synthesizing...' : 'Regenerate Deep Dive'}</span>
          </button>
        </div>
      </div>

      {/* Synchronized Live Transcript */}
      <div className="bg-[#1e222a] border border-[#333842] rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-[#2d323b]">
          <h3 className="font-semibold text-sm text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            Synchronized Podcast Transcript
          </h3>
          <span className="text-xs text-gray-500 font-mono">Grounded in Notebook Sources</span>
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
                    ? 'bg-[#252336] border-purple-500/70 shadow-md ring-1 ring-purple-500/30'
                    : 'bg-[#181a1f] border-[#2b303a] hover:border-[#3e4453] hover:bg-[#20232a]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                      turn.speaker === 'Alex'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    }`}
                  >
                    {turn.speaker === 'Alex' ? 'AL' : 'JO'}
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      turn.speaker === 'Alex' ? 'text-amber-400' : 'text-cyan-400'
                    }`}
                  >
                    {turn.speaker} {turn.speaker === 'Alex' ? '(Host)' : '(Co-Host)'}
                  </span>
                  {isCurrent && isPlaying && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-300 font-medium ml-auto flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping"></span>
                      Speaking
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-200 leading-relaxed pl-8">
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
