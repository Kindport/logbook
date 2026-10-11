import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  Radio,
  FileText,
  AlertCircle,
  Headphones,
  Check,
} from 'lucide-react';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToNotes: (notes: string) => void;
  weekNumber: number;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({
  isOpen,
  onClose,
  onApplyToNotes,
  weekNumber,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcriptItems, setTranscriptItems] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const isMutedRef = useRef(false);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (isOpen) {
      startVoiceSession();
    } else {
      stopVoiceSession();
    }

    return () => {
      stopVoiceSession();
    };
  }, [isOpen]);

  const pcmFloat32ToBase64 = (float32Array: Float32Array): string => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const uint8 = new Uint8Array(int16Array.buffer);
    let binary = '';
    for (let i = 0; i < uint8.byteLength; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary);
  };

  const base64ToFloat32 = (base64: string): Float32Array => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }
    return float32;
  };

  const playAudioChunk = (audioBase64: string) => {
    if (!outputAudioCtxRef.current) return;
    const ctx = outputAudioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const float32 = base64ToFloat32(audioBase64);
    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const sourceNode = ctx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(ctx.destination);

    const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
    sourceNode.start(startTime);
    nextStartTimeRef.current = startTime + audioBuffer.duration;

    setIsAiSpeaking(true);
    sourceNode.onended = () => {
      if (ctx.currentTime >= nextStartTimeRef.current - 0.05) {
        setIsAiSpeaking(false);
      }
    };
  };

  const startVoiceSession = async () => {
    try {
      setIsConnecting(true);
      setErrorMessage(null);

      // Create WebSockets
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // AudioContexts
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputCtx;

      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      // Microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      micStreamRef.current = stream;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);

        // Send opening greeting trigger
        ws.send(
          JSON.stringify({
            text: `Hello! I am a SIWES trainee reviewing my activities for Week ${weekNumber}. Please greet me and ask what practical engineering tasks, equipment, or assignments I carried out this week.`,
          })
        );

        // Hook up audio capture
        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        source.connect(processor);
        processor.connect(inputCtx.destination);

        processor.onaudioprocess = (e) => {
          if (isMutedRef.current) return;
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            const base64Audio = pcmFloat32ToBase64(inputData);
            ws.send(JSON.stringify({ audio: base64Audio }));
          }
        };
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.error) {
            setErrorMessage(msg.error);
          }
          if (msg.audio) {
            playAudioChunk(msg.audio);
          }
          if (msg.text) {
            setTranscriptItems((prev) => [...prev, { sender: 'ai', text: msg.text }]);
          }
          if (msg.interrupted) {
            setIsAiSpeaking(false);
            if (outputCtx) {
              nextStartTimeRef.current = outputCtx.currentTime;
            }
          }
        } catch (err) {
          console.error('Error handling WS audio message:', err);
        }
      };

      ws.onerror = () => {
        setErrorMessage('Could not establish real-time Live connection. Verify microphone permissions and connection.');
        setIsConnecting(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
      };
    } catch (err: any) {
      console.error('Error starting live voice session:', err);
      setErrorMessage(err.message || 'Microphone access denied or audio failed.');
      setIsConnecting(false);
    }
  };

  const stopVoiceSession = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsAiSpeaking(false);
  };

  const handleTransferToNotes = () => {
    if (transcriptItems.length > 0) {
      const summaryNotes = transcriptItems
        .filter((item) => item.sender === 'ai')
        .map((item) => item.text)
        .join(' ');

      if (summaryNotes.trim()) {
        onApplyToNotes(summaryNotes.trim());
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Live Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3.5 py-1 text-xs font-bold text-lime-400 mb-6">
          <Radio className="h-3.5 w-3.5 animate-pulse text-lime-400" />
          <span>Gemini Live (gemini-3.8-live)</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          SIWES Voice Interviewer
        </h3>
        <p className="text-xs text-zinc-400 max-w-sm mt-1 mb-8">
          Speak directly with LogBook about your activities during <strong className="text-zinc-200">Week {weekNumber}</strong>. Explain what you fixed, measured, tested, or attended.
        </p>

        {/* Animated Visualizer Circle */}
        <div className="relative flex items-center justify-center mb-8">
          {/* Outer glowing pulsing rings when active */}
          {isConnected && (
            <>
              <div
                className={`absolute h-36 w-36 rounded-full transition-all duration-300 ${
                  isAiSpeaking
                    ? 'bg-lime-400/20 scale-125 animate-ping'
                    : !isMuted
                    ? 'bg-lime-400/10 scale-110 animate-pulse'
                    : 'bg-zinc-800/20'
                }`}
              />
              <div
                className={`absolute h-28 w-28 rounded-full border border-lime-400/30 transition-all duration-300 ${
                  isAiSpeaking ? 'scale-110' : 'scale-100'
                }`}
              />
            </>
          )}

          {/* Central orb */}
          <div
            className={`relative flex h-24 w-24 items-center justify-center rounded-full shadow-2xl transition-all duration-300 ${
              isAiSpeaking
                ? 'bg-lime-400 text-zinc-950 shadow-lime-400/40 scale-105'
                : isConnected && !isMuted
                ? 'bg-zinc-800 text-lime-400 border-2 border-lime-400/60 shadow-lime-400/20'
                : isConnecting
                ? 'bg-zinc-800 text-zinc-400 animate-pulse'
                : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            {isConnecting ? (
              <Radio className="h-8 w-8 animate-spin" />
            ) : isAiSpeaking ? (
              <Headphones className="h-9 w-9 stroke-[2.2]" />
            ) : isMuted ? (
              <MicOff className="h-9 w-9 stroke-[2.2]" />
            ) : (
              <Mic className="h-9 w-9 stroke-[2.2]" />
            )}
          </div>
        </div>

        {/* Status Indicator */}
        <div className="mb-6">
          {isConnecting ? (
            <span className="text-xs font-semibold text-zinc-400">Connecting to Live Voice session...</span>
          ) : isAiSpeaking ? (
            <span className="text-xs font-bold text-lime-400 flex items-center gap-1.5 justify-center">
              <span className="h-2 w-2 rounded-full bg-lime-400 animate-ping" />
              LogBook Voice Assistant is speaking...
            </span>
          ) : isConnected ? (
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 justify-center">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Listening to your voice... (Speak freely)
            </span>
          ) : (
            <span className="text-xs text-zinc-500">Session closed</span>
          )}
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300 flex items-center gap-2 max-w-sm text-left">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Live Controls */}
        <div className="flex items-center justify-center gap-3 w-full max-w-xs">
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            disabled={!isConnected}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition border ${
              isMuted
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-750 hover:text-white'
            }`}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            <span>{isMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
          </button>

          <button
            type="button"
            onClick={stopVoiceSession}
            className="flex items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-750 transition"
          >
            End
          </button>
        </div>

        {/* Transfer Button */}
        {transcriptItems.length > 0 && (
          <div className="mt-6 pt-4 border-t border-zinc-800 w-full">
            <button
              type="button"
              onClick={handleTransferToNotes}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-lime-400 py-2.5 text-xs font-bold text-zinc-950 hover:bg-lime-300 transition shadow-md shadow-lime-400/20"
            >
              <FileText className="h-4 w-4" />
              <span>Transfer Conversation into Weekly Notes</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
