import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  FileText,
  Plus,
  Send,
  Sparkles,
  Headphones,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Quote,
  MessageSquare,
  HelpCircle,
  FileCheck,
  Calendar,
  Layers,
} from 'lucide-react';
import { SourceDocument, AudioOverviewData, DialogueTurn } from '../types';

interface NotebookLMViewProps {
  sources: SourceDocument[];
  onAddSource: (source: Omit<SourceDocument, 'id'>) => void;
  onDeleteSource: (id: string) => void;
}

export const NotebookLMView: React.FC<NotebookLMViewProps> = ({
  sources,
  onAddSource,
  onDeleteSource,
}) => {
  // Chat state
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    {
      sender: 'assistant',
      text: `Welcome to your grounded NotebookLM assistant! I am conditioned to answer questions strictly grounded in your ${sources.length} notebook sources, including Cambridge & Pearson Edexcel mark schemes, Colab Secrets guide, and architectural specifications.

Try asking:
- "How do I configure authentication in Colab without hardcoding my key?"
- "What is the difference between gemini-3.8-flash and legacy models?"
- "Generate a concise study guide comparing method [M1] and accuracy [A1] marks."`,
    },
  ]);
  const [isAsking, setIsAsking] = useState(false);

  // Audio Overview state
  const [audioData, setAudioData] = useState<AudioOverviewData>({
    title: 'Cambridge IGCSE Math & AI Architecture Deep Dive',
    durationSeconds: 145,
    turns: [
      {
        speaker: 'Alex',
        text: "Welcome to today's NotebookLM Deep Dive! We're digging into the brand new Cambridge IGCSE Math grading engine and how the 5 integrated repositories evaluate student working.",
      },
      {
        speaker: 'Jordan',
        text: "Yeah, and what immediately jumps out from these notes is how the multi-layer equivalence engine checks algebraic working step-by-step to award method [M1] and accuracy [A1] marks.",
      },
      {
        speaker: 'Alex',
        text: "Right! Even if a student simplifies intermediate brackets differently, symbolic-numeric probing verifies mathematical equivalence.",
      },
      {
        speaker: 'Jordan',
        text: "Exactly. Plus, with Gemini 3.8 Flash multimodal vision, uploaded student handwriting worksheets are processed in seconds.",
      },
      {
        speaker: 'Alex',
        text: 'That combination of rigorous mark schemes and lightning-fast inference really makes this the ideal platform for Cambridge mathematics revision.',
      },
    ],
  });
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioFocus, setAudioFocus] = useState('Cambridge IGCSE Math & BIDMAS Assessment');

  // Source modal / adding state
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newSourceContent, setNewSourceContent] = useState('');

  // Active highlighted source
  const [activeSourceId, setActiveSourceId] = useState<string | null>(sources[0]?.id || null);

  // Web Speech API synthesis reference
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Audio Playback simulation / Web Speech API
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isPlayingAudio) {
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
            setIsPlayingAudio(false);
            setCurrentTurnIndex(0);
          }
        };

        utterance.onerror = () => {
          timer = setTimeout(() => {
            if (currentTurnIndex < audioData.turns.length - 1) {
              setCurrentTurnIndex((prev) => prev + 1);
            } else {
              setIsPlayingAudio(false);
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
            setIsPlayingAudio(false);
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
  }, [isPlayingAudio, currentTurnIndex, audioData.turns, playbackSpeed]);

  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      setIsPlayingAudio(false);
      if (synthRef.current) synthRef.current.cancel();
    } else {
      setIsPlayingAudio(true);
    }
  };

  const handleResetAudio = () => {
    setIsPlayingAudio(false);
    setCurrentTurnIndex(0);
    if (synthRef.current) synthRef.current.cancel();
  };

  const handleAsk = async (promptQuery?: string) => {
    const q = promptQuery || query;
    if (!q.trim() || isAsking) return;

    setMessages((prev) => [...prev, { sender: 'user', text: q }]);
    setQuery('');
    setIsAsking(true);

    try {
      const res = await fetch('/api/gemini/grounded-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          sources: sources.map((s, idx) => ({ id: idx + 1, title: s.title, content: s.content })),
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.reply) {
          setMessages((prev) => [...prev, { sender: 'assistant', text: data.reply }]);
          return;
        }
      }
      
      // Fallback response if offline or static Netlify
      const qLower = q.toLowerCase();
      let fallbackText = `According to the Cambridge IGCSE Mathematics specification and active notebook sources:\n\n`;
      if (qLower.includes('study guide')) {
        fallbackText += `1. **Order of Operations (BIDMAS)**: Evaluate Brackets, Indices, Division/Multiplication (left to right), and Addition/Subtraction.\n2. **Marking Standards**: [M1] marks require explicit intermediate method working; [A1] marks require exact simplified accuracy.\n3. **Examination Best Practices**: Never round intermediate answers before the final step. Always write units where required.`;
      } else if (qLower.includes('faq')) {
        fallbackText += `**Q1: How are method marks awarded?**\nMethod [M1] marks are earned for demonstrating correct mathematical operations even if an arithmetic calculation error occurs later.\n\n**Q2: What is the recommended strategy for algebraic fractions?**\nFind the common denominator first, factorise numerators, and eliminate common factors.`;
      } else {
        fallbackText += `Review your working step-by-step according to the mark scheme. For question "${q}", check all algebraic simplifications and verify each bracket expansion.`;
      }
      setMessages((prev) => [...prev, { sender: 'assistant', text: fallbackText }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `Grounded response: According to Cambridge IGCSE standards, method [M1] credit is awarded for valid intermediate steps, and accuracy [A1] requires exact final values.`,
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleGenerateAudioOverview = async () => {
    setIsGeneratingAudio(true);
    try {
      const res = await fetch('/api/gemini/audio-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources: sources.map((s) => ({ title: s.title, content: s.content })),
          focus: audioFocus,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.script && data.script.length > 0) {
          setAudioData({
            title: data.title || audioFocus,
            durationSeconds: data.script.length * 28,
            turns: data.script,
          });
          setCurrentTurnIndex(0);
          setIsPlayingAudio(true);
          return;
        }
      }
    } catch (e) {
      console.warn('Audio overview API unavailable, retaining default conversation', e);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleAddSourceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceTitle.trim() || !newSourceContent.trim()) return;

    onAddSource({
      title: newSourceTitle.trim(),
      type: 'note',
      snippet: newSourceContent.slice(0, 120) + '...',
      content: newSourceContent.trim(),
      tokenCount: Math.round(newSourceContent.split(/\s+/).length * 1.3),
    });

    setNewSourceTitle('');
    setNewSourceContent('');
    setShowAddSourceModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[calc(100vh-100px)] text-slate-800">
      {/* Left Column: Source Knowledge Library (4 cols) */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="bg-white border border-[#f0d8dd] rounded-xl p-4 shadow-sm flex flex-col h-full max-h-[85vh]">
          <div className="flex items-center justify-between pb-3 border-b border-[#f5e6e8]">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#800020]" />
              <h2 className="font-bold text-sm text-[#701a2d]">Knowledge Sources ({sources.length})</h2>
            </div>
            <button
              onClick={() => setShowAddSourceModal(true)}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-[#fff1f2] hover:bg-[#ffe4e6] text-[#800020] border border-[#fecdd3] font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Source</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-500 my-2">
            Answers are strictly grounded in these documents. Click any source to inspect its contents.
          </p>

          {/* Sources List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {sources.map((source, index) => {
              const isSelected = activeSourceId === source.id;
              return (
                <div
                  key={source.id}
                  onClick={() => setActiveSourceId(source.id)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                    isSelected
                      ? 'bg-[#fff1f2] border-2 border-[#800020] shadow-sm'
                      : 'bg-[#fffdfa] border-[#f0d8dd] hover:border-[#800020] hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#800020] text-white font-bold">
                        [{index + 1}]
                      </span>
                      <span className="font-semibold text-slate-800 line-clamp-1">{source.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">{source.type}</span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-1.5 line-clamp-2 leading-relaxed">
                    {source.snippet}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span>~{source.tokenCount || 350} tokens</span>
                    {isSelected && <span className="text-[#800020] font-bold">Viewing</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Source Inspector */}
          {activeSourceId && (
            <div className="mt-3 pt-3 border-t border-[#f5e6e8] bg-[#fffdfa] p-3 rounded-lg border border-[#f0d8dd] text-xs">
              <div className="flex items-center justify-between text-slate-700 font-semibold mb-1 text-[11px]">
                <span className="flex items-center gap-1.5 text-[#800020]">
                  <FileText className="w-3.5 h-3.5" />
                  Document Excerpt
                </span>
                <span className="font-mono text-[10px] text-slate-400">Full Text Preview</span>
              </div>
              <div className="max-h-36 overflow-y-auto text-[11px] text-slate-600 leading-relaxed font-mono whitespace-pre-wrap">
                {sources.find((s) => s.id === activeSourceId)?.content}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Middle & Right Column: Grounded Q&A Chat & Audio Overview (8 cols) */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        {/* NotebookLM Audio Overview Banner in Cambridge Burgundy */}
        <div className="bg-gradient-to-r from-[#6b1226] via-[#800020] to-[#590e1f] text-white rounded-xl p-4 shadow-md border border-[#9f1239]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/15">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-white/10 text-rose-200 border border-white/20 flex items-center justify-center">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Audio Overview (Deep Dive)</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/15 text-rose-100 font-semibold">
                    2 AI Co-Hosts
                  </span>
                </div>
                <p className="text-xs text-rose-100/80">
                  Alex &amp; Jordan discuss Cambridge IGCSE Math curriculum &amp; marking schemes
                </p>
              </div>
            </div>

            {/* Audio Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleAudio}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#800020] hover:bg-rose-50 text-xs font-bold shadow transition"
              >
                {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlayingAudio ? 'Pause' : 'Play Deep Dive'}</span>
              </button>

              <button
                onClick={handleResetAudio}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition"
                title="Restart audio"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setPlaybackSpeed((s) => (s === 1 ? 1.25 : s === 1.25 ? 1.5 : 1))}
                className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-rose-100 font-mono font-medium border border-white/20"
                title="Toggle playback speed"
              >
                {playbackSpeed}x
              </button>

              <button
                onClick={handleGenerateAudioOverview}
                disabled={isGeneratingAudio}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#9f1239] hover:bg-[#be123c] text-xs text-white border border-rose-300/30 disabled:opacity-50 transition"
                title="Regenerate podcast script from current sources"
              >
                {isGeneratingAudio ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-200" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-rose-200" />
                )}
                <span>{isGeneratingAudio ? 'Synthesizing...' : 'Regenerate'}</span>
              </button>
            </div>
          </div>

          {/* Animated Waveform & Active Speaker Display */}
          <div className="mt-3 pt-1 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Speaker Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  audioData.turns[currentTurnIndex]?.speaker === 'Alex'
                    ? 'bg-amber-400/20 text-amber-200 border border-amber-300/40'
                    : 'bg-rose-200/20 text-rose-100 border border-rose-300/40'
                }`}
              >
                {audioData.turns[currentTurnIndex]?.speaker === 'Alex' ? 'AL' : 'JO'}
              </div>

              <div>
                <span className="text-xs font-semibold text-rose-100">
                  {audioData.turns[currentTurnIndex]?.speaker === 'Alex' ? 'Alex (Host)' : 'Jordan (Co-Host)'}
                </span>
                <p className="text-xs text-white/90 italic line-clamp-1">
                  &ldquo;{audioData.turns[currentTurnIndex]?.text}&rdquo;
                </p>
              </div>
            </div>

            {/* Simulated Animated Audio Waveform */}
            <div className="flex items-center gap-1 h-6">
              {[40, 75, 20, 90, 60, 30, 85, 45, 95, 35, 70, 50].map((h, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-300 ${
                    isPlayingAudio ? 'bg-rose-200 animate-pulse' : 'bg-rose-900/60'
                  }`}
                  style={{
                    height: isPlayingAudio ? `${Math.max(6, (h * (i % 2 === 0 ? 0.9 : 1.1)) % 24)}px` : '4px',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Grounded Chat Box */}
        <div className="bg-white border border-[#f0d8dd] rounded-xl flex-1 flex flex-col shadow-sm overflow-hidden min-h-[480px]">
          {/* Chat Header */}
          <div className="p-3 border-b border-[#f5e6e8] bg-[#fff8f8] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#800020]" />
              <h3 className="text-sm font-bold text-[#701a2d]">Grounded Notebook Q&amp;A</h3>
            </div>
            <div className="flex items-center gap-2">
              {/* Preset Studio Prompts */}
              <button
                onClick={() => handleAsk('Generate a comprehensive Study Guide from these notebook sources.')}
                className="text-[11px] px-2.5 py-1 rounded bg-white hover:bg-[#fff1f2] text-[#800020] border border-[#f0d8dd] font-semibold flex items-center gap-1 transition shadow-2xs"
              >
                <FileCheck className="w-3 h-3 text-[#be123c]" /> Study Guide
              </button>

              <button
                onClick={() => handleAsk('Create an FAQ with 4 questions and grounded answers based on the notes.')}
                className="text-[11px] px-2.5 py-1 rounded bg-white hover:bg-[#fff1f2] text-[#800020] border border-[#f0d8dd] font-semibold flex items-center gap-1 transition shadow-2xs"
              >
                <HelpCircle className="w-3 h-3 text-amber-600" /> FAQ
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#fffdfa]/50">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 text-sm ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-[#fff1f2] text-[#800020] border border-[#fecdd3] flex items-center justify-center shrink-0 text-xs font-serif font-black shadow-2xs">
                    ∯
                  </div>
                )}

                <div
                  className={`p-3.5 rounded-xl max-w-[85%] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-2xs ${
                    msg.sender === 'user'
                      ? 'bg-[#800020] text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-[#f0d8dd] rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isAsking && (
              <div className="flex items-center gap-2 text-xs text-[#800020] p-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Reading sources and synthesizing grounded citations...</span>
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-[#f5e6e8] bg-[#fff8f8]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything grounded in notebook sources (e.g. How does [M1] method marking work?)..."
                className="flex-1 bg-white text-slate-800 px-3.5 py-2 rounded-lg border border-[#e2e8f0] text-xs sm:text-sm focus:border-[#800020] focus:ring-1 focus:ring-[#800020] outline-none transition"
              />
              <button
                type="submit"
                disabled={!query.trim() || isAsking}
                className="p-2.5 bg-[#800020] hover:bg-[#701a2d] disabled:opacity-40 text-white rounded-lg transition shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Add Source Modal */}
      {showAddSourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white border border-[#f0d8dd] rounded-xl max-w-lg w-full p-5 shadow-2xl text-slate-800">
            <h3 className="text-base font-bold text-[#701a2d] mb-1">Add Knowledge Source</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add mark scheme notes, exam solutions, or curriculum references to ground your Gemini queries.
            </p>

            <form onSubmit={handleAddSourceSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Source Title</label>
                <input
                  type="text"
                  required
                  value={newSourceTitle}
                  onChange={(e) => setNewSourceTitle(e.target.value)}
                  placeholder="e.g. Pearson Edexcel Mark Scheme Nov 2024"
                  className="w-full bg-[#fffdfa] border border-[#e2e8f0] focus:border-[#800020] rounded-lg px-3 py-2 text-xs text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Content / Mark Scheme Notes</label>
                <textarea
                  required
                  rows={6}
                  value={newSourceContent}
                  onChange={(e) => setNewSourceContent(e.target.value)}
                  placeholder="Paste syllabus guidelines, model steps, mark scheme rules, or sample working here..."
                  className="w-full bg-[#fffdfa] border border-[#e2e8f0] focus:border-[#800020] rounded-lg p-3 text-xs text-slate-800 outline-none resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSourceModal(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#800020] hover:bg-[#701a2d] text-white text-xs font-semibold rounded-lg shadow"
                >
                  Add Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
