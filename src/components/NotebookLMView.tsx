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
      text: `Welcome to your grounded NotebookLM assistant! I am conditioned to answer questions strictly grounded in your ${sources.length} notebook sources, including the Google GenAI SDK specs, Colab Secrets guide, and architecture docs.

Try asking:
- "How do I configure authentication in Colab without hardcoding my key?"
- "What is the difference between gemini-3.8-flash and legacy models?"
- "Generate a concise study guide comparing streaming vs unary calls."`,
    },
  ]);
  const [isAsking, setIsAsking] = useState(false);

  // Audio Overview state
  const [audioData, setAudioData] = useState<AudioOverviewData>({
    title: 'Gemini API & Colab Architecture Deep Dive',
    durationSeconds: 145,
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
    ],
  });
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioFocus, setAudioFocus] = useState('Google GenAI SDK & Colab Best Practices');

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
        // Pitch differences for the two hosts
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
          // If speech synthesis fails, advance on timed duration
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
        // Fallback simulation timer if speech synthesis is disabled in browser
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

      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { sender: 'assistant', text: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: 'assistant', text: data.error || 'Unable to retrieve answer from sources.' },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: `Error calling grounded endpoint: ${err.message}` },
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
      const data = await res.json();
      if (data.script && data.script.length > 0) {
        setAudioData({
          title: data.title || audioFocus,
          durationSeconds: data.script.length * 28,
          turns: data.script,
        });
        setCurrentTurnIndex(0);
        setIsPlayingAudio(true);
      }
    } catch (e) {
      console.error(e);
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
    <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[calc(100vh-100px)]">
      {/* Left Column: Source Knowledge Library (4 cols) */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="bg-[#1e222a] border border-[#333842] rounded-xl p-4 shadow-sm flex flex-col h-full max-h-[85vh]">
          <div className="flex items-center justify-between pb-3 border-b border-[#2b303a]">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <h2 className="font-semibold text-sm text-white">Sources ({sources.length})</h2>
            </div>
            <button
              onClick={() => setShowAddSourceModal(true)}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-[#2b303a] hover:bg-[#383e4c] text-emerald-400 border border-[#3c4250] transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Source</span>
            </button>
          </div>

          <p className="text-[11px] text-gray-400 my-2">
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
                      ? 'bg-[#252a35] border-emerald-500/60 shadow-sm'
                      : 'bg-[#181a1f] border-[#2b303a] hover:border-[#3e4453] hover:bg-[#20232a]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#2b303a] text-emerald-400 font-bold">
                        [{index + 1}]
                      </span>
                      <span className="font-medium text-gray-200 line-clamp-1">{source.title}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 uppercase font-mono">{source.type}</span>
                  </div>
                  <p className="text-gray-400 text-[11px] mt-1.5 line-clamp-2 leading-relaxed">
                    {source.snippet}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
                    <span>~{source.tokenCount || 350} tokens</span>
                    {isSelected && <span className="text-emerald-400 font-medium">Viewing</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Source Inspector */}
          {activeSourceId && (
            <div className="mt-3 pt-3 border-t border-[#2b303a] bg-[#14161a] p-3 rounded-lg border border-[#232730] text-xs">
              <div className="flex items-center justify-between text-gray-300 font-semibold mb-1 text-[11px]">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <FileText className="w-3.5 h-3.5" />
                  Document Excerpt
                </span>
                <span className="font-mono text-[10px] text-gray-500">Full Text Preview</span>
              </div>
              <div className="max-h-36 overflow-y-auto text-[11px] text-gray-400 leading-relaxed font-mono whitespace-pre-wrap">
                {sources.find((s) => s.id === activeSourceId)?.content}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Middle & Right Column: Grounded Q&A Chat & Audio Overview (8 cols) */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        {/* NotebookLM Audio Overview Banner */}
        <div className="bg-gradient-to-r from-[#1c2230] via-[#202534] to-[#251e33] border border-[#3e4455] rounded-xl p-4 shadow-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#313645]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">Audio Overview (Deep Dive)</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-medium">
                    2 AI Co-Hosts
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  Alex &amp; Jordan discuss your notebook sources in a lively conversational podcast
                </p>
              </div>
            </div>

            {/* Audio Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleAudio}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow transition"
              >
                {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlayingAudio ? 'Pause' : 'Play Deep Dive'}</span>
              </button>

              <button
                onClick={handleResetAudio}
                className="p-1.5 rounded-lg bg-[#2b303a] hover:bg-[#383e4c] text-gray-400 hover:text-white transition"
                title="Restart audio"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setPlaybackSpeed((s) => (s === 1 ? 1.25 : s === 1.25 ? 1.5 : 1))}
                className="text-xs px-2 py-1 rounded bg-[#2b303a] text-purple-300 font-mono font-medium hover:bg-[#383e4c]"
                title="Toggle playback speed"
              >
                {playbackSpeed}x
              </button>

              <button
                onClick={handleGenerateAudioOverview}
                disabled={isGeneratingAudio}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#2d3240] hover:bg-[#3a4052] text-xs text-gray-200 border border-[#434b5e] disabled:opacity-50 transition"
                title="Regenerate podcast script from current sources"
              >
                {isGeneratingAudio ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
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
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                }`}
              >
                {audioData.turns[currentTurnIndex]?.speaker === 'Alex' ? 'AL' : 'JO'}
              </div>

              <div>
                <span className="text-xs font-semibold text-gray-200">
                  {audioData.turns[currentTurnIndex]?.speaker === 'Alex' ? 'Alex (Host)' : 'Jordan (Co-Host)'}
                </span>
                <p className="text-xs text-gray-300 italic line-clamp-1">
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
                    isPlayingAudio ? 'bg-purple-400 animate-pulse' : 'bg-gray-600'
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
        <div className="bg-[#1e222a] border border-[#333842] rounded-xl flex-1 flex flex-col shadow-sm overflow-hidden min-h-[480px]">
          {/* Chat Header */}
          <div className="p-3 border-b border-[#2d323b] bg-[#181a1f] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Grounded Notebook Q&amp;A</h3>
            </div>
            <div className="flex items-center gap-2">
              {/* Preset Studio Prompts */}
              <button
                onClick={() => handleAsk('Generate a comprehensive Study Guide from these notebook sources.')}
                className="text-[11px] px-2 py-1 rounded bg-[#282c34] hover:bg-[#323742] text-gray-300 border border-[#373c47] flex items-center gap-1 transition"
              >
                <FileCheck className="w-3 h-3 text-emerald-400" /> Study Guide
              </button>

              <button
                onClick={() => handleAsk('Create an FAQ with 4 questions and grounded answers based on the notes.')}
                className="text-[11px] px-2 py-1 rounded bg-[#282c34] hover:bg-[#323742] text-gray-300 border border-[#373c47] flex items-center gap-1 transition"
              >
                <HelpCircle className="w-3 h-3 text-amber-400" /> FAQ
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 text-sm ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 text-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`p-3.5 rounded-xl max-w-[85%] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none shadow'
                      : 'bg-[#252932] text-gray-200 border border-[#333842] rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isAsking && (
              <div className="flex items-center gap-2 text-xs text-blue-400 p-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Reading sources and synthesizing grounded citations...</span>
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-[#2d323b] bg-[#181a1f]">
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
                placeholder="Ask anything grounded in your notebook sources (e.g. How does Colab userdata work?)..."
                className="flex-1 bg-[#252932] text-white px-3.5 py-2 rounded-lg border border-[#373c47] text-xs sm:text-sm focus:border-blue-500 outline-none"
              />
              <button
                type="submit"
                disabled={!query.trim() || isAsking}
                className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Add Source Modal */}
      {showAddSourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#1e222a] border border-[#333842] rounded-xl max-w-lg w-full p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-1">Add Research Source</h3>
            <p className="text-xs text-gray-400 mb-4">
              Add notes, paper extracts, or transcripts to ground your Gemini queries.
            </p>

            <form onSubmit={handleAddSourceSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Source Title</label>
                <input
                  type="text"
                  required
                  value={newSourceTitle}
                  onChange={(e) => setNewSourceTitle(e.target.value)}
                  placeholder="e.g. Gemini 3.8 Flash Benchmark Paper"
                  className="w-full bg-[#14161a] border border-[#333842] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Content / Notes</label>
                <textarea
                  required
                  rows={6}
                  value={newSourceContent}
                  onChange={(e) => setNewSourceContent(e.target.value)}
                  placeholder="Paste research text, notes, API specifications, or excerpts here..."
                  className="w-full bg-[#14161a] border border-[#333842] rounded-lg p-3 text-xs text-white outline-none focus:border-emerald-500 resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSourceModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white rounded-lg hover:bg-[#282c34]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow"
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
