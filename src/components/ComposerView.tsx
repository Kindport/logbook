import React, { useState, useEffect } from 'react';
import { Placement, Entry, EntryDay } from '../types/index.ts';
import { formatDateRange } from '../lib/dateUtils.ts';
import { api } from '../lib/api.ts';
import { SmartAssistModal } from './SmartAssistModal.tsx';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Save,
  CheckCircle2,
  Calendar,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  RefreshCw,
  Clock,
  RotateCcw,
  Copy,
  Check,
  Trash2,
  Plus,
  Minus,
  Radio,
} from 'lucide-react';

interface ComposerViewProps {
  placement: Placement;
  entries: Entry[];
  selectedWeek: number;
  setSelectedWeek: (week: number) => void;
  onEntrySaved: (entry: Entry) => void;
  onEntryDeleted?: (weekNumber: number) => void;
  onOpenVoiceAssistant?: () => void;
}

const DEFAULT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const ComposerView: React.FC<ComposerViewProps> = ({
  placement,
  entries,
  selectedWeek,
  setSelectedWeek,
  onEntrySaved,
  onEntryDeleted,
  onOpenVoiceAssistant,
}) => {
  const [rawNotes, setRawNotes] = useState('');
  const [summary, setSummary] = useState('');
  const [days, setDays] = useState<EntryDay[]>(
    DEFAULT_DAYS.map((day_name) => ({ day_name, text: '' }))
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSmartAssistOpen, setIsSmartAssistOpen] = useState(false);

  // Computed Date Range for the active week
  const dateRange = formatDateRange(placement.start_date, selectedWeek);

  // Sync form when selectedWeek changes or existing entry is found
  useEffect(() => {
    setSaveSuccessMsg(null);
    setErrorMsg(null);

    const existing = entries.find((e) => e.week_number === selectedWeek);
    if (existing) {
      setRawNotes(existing.raw_notes || '');
      setSummary(existing.summary || '');

      // Load days from existing entry
      const existingDaysMap = new Map(existing.days.map((d) => [d.day_name, d.text]));
      const dayList = existing.days && existing.days.length > 0
        ? existing.days.map((d) => ({ day_name: d.day_name, text: d.text }))
        : DEFAULT_DAYS.map((day_name) => ({
            day_name,
            text: existingDaysMap.get(day_name) || '',
          }));
      setDays(dayList);
    } else {
      // Empty state for this week
      setRawNotes('');
      setSummary('');
      setDays(DEFAULT_DAYS.map((day_name) => ({ day_name, text: '' })));
    }
  }, [selectedWeek, entries]);

  // Week Selector navigation
  const handlePrevWeek = () => {
    if (selectedWeek > 1) {
      setSelectedWeek(selectedWeek - 1);
    }
  };

  const handleNextWeek = () => {
    if (selectedWeek < placement.duration_weeks) {
      setSelectedWeek(selectedWeek + 1);
    }
  };

  // AI Generation call
  const handleGenerate = async () => {
    if (!rawNotes.trim()) {
      setErrorMsg('Please input some rough notes or use Smart Assist first.');
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMsg(null);
      setSaveSuccessMsg(null);

      const generated = await api.generateEntry({
        weekNumber: selectedWeek,
        dateRange,
        rawNotes,
      });

      setSummary(generated.summary);
      setDays(
        generated.days.map((d) => ({
          day_name: d.day,
          text: d.text,
        }))
      );
      setSaveSuccessMsg('Generated structured entries from your notes! Review and refine below.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate entries.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save entry (Upsert)
  const handleSave = async () => {
    if (!summary.trim() && days.every((d) => !d.text.trim())) {
      setErrorMsg('Please enter a summary or at least one daily activity before saving.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);

      const res = await api.saveEntry({
        week_number: selectedWeek,
        date_range: dateRange,
        raw_notes: rawNotes,
        summary: summary.trim(),
        days: days.map((d) => ({ day_name: d.day_name, text: d.text.trim() })),
      });

      onEntrySaved(res.entry);
      setSaveSuccessMsg(`Week ${selectedWeek} report saved successfully!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save entry.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete entry
  const handleDeleteEntry = async () => {
    const existing = entries.find((e) => e.week_number === selectedWeek);
    if (!existing) {
      setRawNotes('');
      setSummary('');
      setDays(DEFAULT_DAYS.map((day_name) => ({ day_name, text: '' })));
      return;
    }

    if (confirm(`Are you sure you want to delete Week ${selectedWeek} entry? This cannot be undone.`)) {
      try {
        setIsSaving(true);
        await api.deleteEntry(selectedWeek);
        onEntryDeleted?.(selectedWeek);
        setRawNotes('');
        setSummary('');
        setDays(DEFAULT_DAYS.map((day_name) => ({ day_name, text: '' })));
        setSaveSuccessMsg(`Week ${selectedWeek} report deleted.`);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to delete entry.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Copy Week to Clipboard
  const handleCopyWeek = () => {
    const textLines = [
      `SIWES INDUSTRIAL TRAINING REPORT: WEEK ${selectedWeek} (${dateRange})`,
      `STUDENT ATTACHMENT: ${placement.host_organization}`,
      '',
      `WEEKLY SUMMARY:`,
      summary || '(No summary text)',
      '',
      `DAILY ACTIVITIES:`,
      ...days.map((d) => `• ${d.day_name.toUpperCase()}: ${d.text || 'No tasks logged'}`),
    ];
    navigator.clipboard.writeText(textLines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Toggle Saturday
  const hasSaturday = days.some((d) => d.day_name.toLowerCase() === 'saturday');
  const toggleSaturday = () => {
    if (hasSaturday) {
      setDays((prev) => prev.filter((d) => d.day_name.toLowerCase() !== 'saturday'));
    } else {
      setDays((prev) => [...prev, { day_name: 'Saturday', text: '' }]);
    }
  };

  const handleDayTextChange = (dayName: string, text: string) => {
    setDays((prev) =>
      prev.map((d) => (d.day_name === dayName ? { ...d, text } : d))
    );
  };

  const isRawNotesEmpty = !rawNotes.trim();
  const existingForThisWeek = entries.find((e) => e.week_number === selectedWeek);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Top Header & Week Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 shadow-lg">
        {/* Navigation Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl bg-zinc-950 border border-zinc-800 p-1">
            <button
              onClick={handlePrevWeek}
              disabled={selectedWeek <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
              title="Previous Week"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="px-3.5 text-center min-w-[130px]">
              <span className="text-xs font-bold text-white block">
                Week {selectedWeek} of {placement.duration_weeks}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono block">
                {dateRange}
              </span>
            </div>

            <button
              onClick={handleNextWeek}
              disabled={selectedWeek >= placement.duration_weeks}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
              title="Next Week"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Status Badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            {existingForThisWeek ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-lime-400/10 px-2.5 py-1 text-[11px] font-semibold text-lime-400 border border-lime-400/20">
                <CheckCircle2 className="h-3 w-3" />
                Saved in Logbook
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-400">
                Draft / Unsaved
              </span>
            )}
          </div>
        </div>

        {/* Action: Save & Utility Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleCopyWeek}
            disabled={!summary && days.every((d) => !d.text)}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-750 hover:text-white transition disabled:opacity-40"
            title="Copy formatted weekly report text to clipboard"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-lime-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {existingForThisWeek && (
            <button
              type="button"
              onClick={handleDeleteEntry}
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition"
              title="Delete this week's entry"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-lime-400 px-5 py-2 text-xs font-bold text-zinc-950 transition hover:bg-lime-300 disabled:opacity-50 shadow-md shadow-lime-400/10 cursor-pointer"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 stroke-[2.5]" />
                Save Entry
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {saveSuccessMsg && (
        <div className="flex items-center justify-between rounded-xl border border-lime-500/30 bg-lime-500/10 px-4 py-3 text-xs text-lime-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-lime-400" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMsg(null)}
            className="text-lime-400 hover:text-lime-200 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-red-400 hover:text-red-200 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Step 1: Rough Notes & AI Assistant Panel */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[11px] text-lime-400 font-black">
                1
              </span>
              Rough Weekly Notes
            </h2>
            <p className="text-xs text-zinc-400">
              Jot down quick informal bullet points of what you worked on this week.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Live Voice Assistant Trigger */}
            {onOpenVoiceAssistant && (
              <button
                type="button"
                onClick={onOpenVoiceAssistant}
                className="flex items-center gap-1.5 rounded-xl border border-lime-400/40 bg-lime-400/10 px-3 py-1.5 text-xs font-bold text-lime-400 hover:bg-lime-400/20 transition shadow-sm"
                title="Speak directly with gemini-3.8-live about your week"
              >
                <Radio className="h-3.5 w-3.5 animate-pulse text-lime-400" />
                <span>Voice Interview (Live AI)</span>
              </button>
            )}

            {/* Smart Assist Trigger */}
            <button
              type="button"
              onClick={() => setIsSmartAssistOpen(true)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                isRawNotesEmpty
                  ? 'bg-lime-400/10 border-2 border-lime-400/60 text-lime-400 shadow-sm shadow-lime-400/20 animate-pulse'
                  : 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-lime-400" />
              <span>Smart Assist</span>
            </button>
          </div>
        </div>

        {/* Textarea for raw notes */}
        <textarea
          rows={4}
          value={rawNotes}
          onChange={(e) => setRawNotes(e.target.value)}
          placeholder="e.g. Worked with the networking team to terminate Cat6 cables in the server room. Tested continuity with LAN cable tester. Attended safety briefing on Thursday. Fixed a faulty switch on Friday..."
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400 transition"
        />

        {/* Anti-Hallucination Guarantee & Generate Action */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-800/60">
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <ShieldCheck className="h-4 w-4 text-lime-400 shrink-0" />
            <span>
              <strong className="text-zinc-300">Strict Factual Fidelity:</strong> AI only restructures your real notes. It will never fabricate unseen tools, machines, or events.
            </span>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || isRawNotesEmpty}
            className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 px-4 py-2 text-xs font-bold text-lime-400 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shrink-0"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Synthesizing Entry...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Generate Entry
              </>
            )}
          </button>
        </div>
      </div>

      {/* Step 2: Formatted Weekly Summary & Daily Breakdown */}
      <div className="space-y-5">
        {/* Weekly Summary Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[11px] text-lime-400 font-black">
                2
              </span>
              Official Weekly Summary (2–3 Sentences)
            </h2>
            <span className="text-[11px] text-zinc-500 font-mono">
              {summary.length} chars
            </span>
          </div>
          <p className="text-xs text-zinc-400 mb-3">
            An overview of core skills acquired, technical operations conducted, and milestones achieved during Week {selectedWeek}.
          </p>

          <textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="A professional 2-3 sentence overview of this week's technical activities..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400 transition"
          />
        </div>

        {/* Step 3: Day-by-Day Breakdown */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[11px] text-lime-400 font-black">
                3
              </span>
              Daily Activity Breakdown ({hasSaturday ? 'Monday – Saturday' : 'Monday – Friday'})
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSaturday}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border transition ${
                  hasSaturday
                    ? 'border-lime-400/40 bg-lime-400/10 text-lime-400'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                {hasSaturday ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                <span>{hasSaturday ? 'Remove Saturday' : '+ Add Saturday Duty'}</span>
              </button>
            </div>
          </div>
          <p className="text-xs text-zinc-400 mb-5">
            Each day represents an independent row in your SIWES logbook database. You can edit any day's text manually.
          </p>

          <div className="space-y-4">
            {days.map((d, index) => (
              <div
                key={d.day_name}
                className="rounded-xl border border-zinc-800/90 bg-zinc-950 p-4 transition focus-within:border-zinc-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-900 text-lime-400 font-mono font-bold text-xs border border-zinc-800">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                      {d.day_name}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {d.text.length} chars
                  </span>
                </div>

                <textarea
                  rows={2}
                  value={d.text}
                  onChange={(e) => handleDayTextChange(d.day_name, e.target.value)}
                  placeholder={`Describe technical work executed on ${d.day_name}...`}
                  className="w-full rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none transition"
                />
              </div>
            ))}
          </div>

          {/* Bottom Save Bar */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-zinc-800">
            <span className="text-xs text-zinc-400">
              Finished reviewing? Save this entry to lock in your logbook progress.
            </span>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-6 py-2.5 text-xs font-bold text-zinc-950 transition hover:bg-lime-300 disabled:opacity-50 shadow-md shadow-lime-400/10 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 stroke-[2.5]" />
                  Save Week {selectedWeek} Entry
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Smart Assist Modal */}
      <SmartAssistModal
        isOpen={isSmartAssistOpen}
        onClose={() => setIsSmartAssistOpen(false)}
        onApplyNotes={(compiledNotes) => {
          setRawNotes((prev) => (prev.trim() ? `${prev.trim()}\n\n${compiledNotes}` : compiledNotes));
        }}
      />
    </div>
  );
};
