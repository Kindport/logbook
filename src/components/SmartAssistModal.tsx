import React, { useState } from 'react';
import { Sparkles, X, ChevronDown, ChevronUp, Wrench, Users, BookOpenCheck, Coffee, Check } from 'lucide-react';

interface SmartAssistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyNotes: (notes: string) => void;
}

interface QuestionItem {
  id: string;
  icon: any;
  title: string;
  placeholder: string;
  prefix: string;
}

const QUESTIONS: QuestionItem[] = [
  {
    id: 'debug',
    icon: Wrench,
    title: 'Did you fix, debug, or service something?',
    placeholder: 'e.g. Diagnosed faulty Ethernet switch in server room, re-crimped RJ45 connectors, replaced cooling fan...',
    prefix: 'Maintenance & Troubleshooting: ',
  },
  {
    id: 'training',
    icon: Users,
    title: 'Did you attend a meeting, safety drill, or training session?',
    placeholder: 'e.g. Attended weekly engineering briefing on workplace occupational safety and pipeline pressure protocols...',
    prefix: 'Meetings & Workplace Sessions: ',
  },
  {
    id: 'tools',
    icon: BookOpenCheck,
    title: 'Did you learn or work with a new tool or technology?',
    placeholder: 'e.g. Trained on AutoCAD for isometric drawings, practiced multimeter voltage calibration on PCB boards...',
    prefix: 'Tools & Technical Skills: ',
  },
  {
    id: 'admin',
    icon: Coffee,
    title: 'Was it mostly a routine, documentation, or inventory week?',
    placeholder: 'e.g. Logged equipment serial numbers into department spreadsheet, filed weekly inspection records...',
    prefix: 'Routine Operations & Documentation: ',
  },
];

export const SmartAssistModal: React.FC<SmartAssistModalProps> = ({ isOpen, onClose, onApplyNotes }) => {
  const [activeQuestionIds, setActiveQuestionIds] = useState<string[]>(['debug']);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const toggleQuestion = (id: string) => {
    if (activeQuestionIds.includes(id)) {
      setActiveQuestionIds(activeQuestionIds.filter((qId) => qId !== id));
    } else {
      setActiveQuestionIds([...activeQuestionIds, id]);
    }
  };

  const handleAnswerChange = (id: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [id]: text,
    }));
  };

  const handleTurnIntoNotes = () => {
    const filledPieces: string[] = [];

    for (const q of QUESTIONS) {
      const text = answers[q.id]?.trim();
      if (text) {
        filledPieces.push(`${q.prefix}${text}`);
      }
    }

    if (filledPieces.length > 0) {
      onApplyNotes(filledPieces.join('\n\n'));
    }
    onClose();
  };

  const filledCount = Object.values(answers).filter((v) => v?.trim().length > 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl p-6 sm:p-7 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400/10 text-lime-400 border border-lime-400/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Smart Assist: Memory Prompts</h3>
              <p className="text-xs text-zinc-400">
                Stuck on what happened this week? Tap any question to jot down quick memory fragments.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Question List (Scrollable) */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {QUESTIONS.map((q) => {
            const isExpanded = activeQuestionIds.includes(q.id);
            const isAnswered = Boolean(answers[q.id]?.trim());
            const Icon = q.icon;

            return (
              <div
                key={q.id}
                className={`rounded-xl border transition-all duration-200 ${
                  isExpanded
                    ? 'border-lime-500/40 bg-zinc-950/80 shadow-md'
                    : 'border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleQuestion(q.id)}
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                        isAnswered
                          ? 'bg-lime-400 text-zinc-950'
                          : isExpanded
                          ? 'bg-zinc-800 text-lime-400'
                          : 'bg-zinc-800/60 text-zinc-400'
                      }`}
                    >
                      {isAnswered ? <Check className="h-4 w-4 stroke-[3]" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <span className="text-sm font-semibold text-zinc-200">{q.title}</span>
                  </div>
                  <div className="text-zinc-400">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-zinc-800/60 animate-in fade-in">
                    <textarea
                      rows={2}
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder={q.placeholder}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900/90 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400 transition"
                      autoFocus={isExpanded && !answers[q.id]}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            {filledCount === 0
              ? 'Answer at least one question to compile notes'
              : `${filledCount} of ${QUESTIONS.length} questions answered`}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={filledCount === 0}
              onClick={handleTurnIntoNotes}
              className="flex items-center gap-2 rounded-xl bg-lime-400 px-5 py-2.5 text-xs font-bold text-zinc-950 transition hover:bg-lime-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-lime-400/10"
            >
              <Sparkles className="h-4 w-4" />
              Turn into notes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
