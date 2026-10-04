import React, { useState } from 'react';
import { User, Placement, Entry } from '../types/index.ts';
import { api } from '../lib/api.ts';
import {
  Download,
  Calendar,
  ChevronDown,
  ChevronUp,
  PenLine,
  FileText,
  Building,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface TimelineViewProps {
  user: User;
  placement: Placement;
  entries: Entry[];
  onNavigateToComposer: (weekNumber: number) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  user,
  placement,
  entries,
  onNavigateToComposer,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // Set all expanded initially or tracked by week id
  const [expandedWeekIds, setExpandedWeekIds] = useState<number[]>(() =>
    entries.slice(0, 3).map((e) => e.id)
  );

  const toggleExpand = (id: number) => {
    if (expandedWeekIds.includes(id)) {
      setExpandedWeekIds(expandedWeekIds.filter((wId) => wId !== id));
    } else {
      setExpandedWeekIds([...expandedWeekIds, id]);
    }
  };

  const handleExpandAll = () => {
    setExpandedWeekIds(entries.map((e) => e.id));
  };

  const handleCollapseAll = () => {
    setExpandedWeekIds([]);
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      setExportError(null);
      await api.exportLogbookPdf();
    } catch (err: any) {
      setExportError(err.message || 'Failed to download official PDF export.');
    } finally {
      setIsExporting(false);
    }
  };

  // Sort entries by week ascending
  const sortedEntries = [...entries].sort((a, b) => a.week_number - b.week_number);

  // Filter entries
  const filteredEntries = sortedEntries.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchWeek = `week ${e.week_number}`.includes(q);
    const matchSummary = e.summary.toLowerCase().includes(q);
    const matchDays = e.days?.some((d) => d.text.toLowerCase().includes(q));
    const matchRange = e.date_range.toLowerCase().includes(q);
    return matchWeek || matchSummary || matchDays || matchRange;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 sm:p-6 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="rounded-full bg-lime-400/10 px-2.5 py-0.5 text-[11px] font-bold text-lime-400 border border-lime-400/20">
              SIWES Archive
            </span>
            <span className="text-xs text-zinc-400">
              {entries.length} of {placement.duration_weeks} Weeks Recorded
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Training Timeline & PDF Export</h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Review all chronological weekly log entries, day-by-day technical tasks, and compile your official ITF-compliant report for defense.
          </p>
        </div>

        {/* Export Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-5 py-3 text-xs sm:text-sm font-bold text-zinc-950 transition hover:bg-lime-300 disabled:opacity-50 shadow-md shadow-lime-400/20 cursor-pointer"
          >
            {isExporting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating Official PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 stroke-[2.5]" />
                Export Logbook (PDF)
              </>
            )}
          </button>
        </div>
      </div>

      {exportError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
          {exportError}
        </div>
      )}

      {/* Filter and Expand Controls */}
      {entries.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search tasks, tools, weeks, or summaries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-lime-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-zinc-400">
            <button
              onClick={handleExpandAll}
              className="rounded-lg px-2.5 py-1.5 hover:bg-zinc-800 hover:text-white transition"
            >
              Expand All
            </button>
            <span>•</span>
            <button
              onClick={handleCollapseAll}
              className="rounded-lg px-2.5 py-1.5 hover:bg-zinc-800 hover:text-white transition"
            >
              Collapse All
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {entries.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/30 p-12 text-center flex flex-col items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400 mb-4">
            <Calendar className="h-8 w-8 stroke-[1.5]" />
          </div>
          <h3 className="text-lg font-bold text-white">Your timeline is empty</h3>
          <p className="mt-1 text-xs text-zinc-400 max-w-md">
            You haven't recorded any weekly entries yet. Once you compose your first report in the Composer, it will appear here in chronological sequence.
          </p>
          <button
            onClick={() => onNavigateToComposer(1)}
            className="mt-6 flex items-center gap-2 rounded-xl bg-lime-400 px-5 py-2.5 text-xs font-bold text-zinc-950 hover:bg-lime-300 transition shadow-md shadow-lime-400/10"
          >
            <PenLine className="h-4 w-4" />
            Compose Week 1 Now
            <ArrowRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-xs text-zinc-400">
          No entries matched your search query "{searchQuery}".
        </div>
      ) : (
        /* Chronological Accordion List */
        <div className="space-y-4">
          {filteredEntries.map((entry) => {
            const isExpanded = expandedWeekIds.includes(entry.id);

            return (
              <div
                key={entry.id}
                className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 transition hover:border-zinc-700/80 shadow-sm"
              >
                {/* Accordion Week Header */}
                <div
                  onClick={() => toggleExpand(entry.id)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 cursor-pointer bg-zinc-900/90 select-none hover:bg-zinc-850"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-400/10 text-lime-400 font-black text-sm border border-lime-400/20">
                      W{entry.week_number}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-extrabold text-white">
                          Week {entry.week_number}
                        </span>
                        <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                          {entry.date_range}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          ({entry.days?.length || 0} Weekdays)
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-1 max-w-2xl">
                        {entry.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-zinc-800/60 sm:border-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToComposer(entry.week_number);
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-lime-400 hover:bg-zinc-700 transition"
                    >
                      <PenLine className="h-3 w-3" />
                      Edit Week
                    </button>

                    <div className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-white">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content: Summary & Daily Rows */}
                {isExpanded && (
                  <div className="border-t border-zinc-800/80 bg-zinc-950/70 p-5 space-y-4 animate-in fade-in">
                    {/* Weekly Summary */}
                    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4">
                      <span className="text-[10px] uppercase font-bold text-lime-400 tracking-wider block mb-1.5">
                        Weekly Overview & Key Achievements
                      </span>
                      <p className="text-xs text-zinc-200 leading-relaxed">
                        {entry.summary || 'No summary text.'}
                      </p>
                    </div>

                    {/* Day-by-Day Breakdown */}
                    <div>
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                        Daily Operational Records
                      </span>
                      <div className="space-y-2">
                        {entry.days && entry.days.length > 0 ? (
                          entry.days.map((d) => (
                            <div
                              key={d.id || d.day_name}
                              className="flex flex-col sm:flex-row sm:items-start gap-3 rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-3"
                            >
                              <span className="w-24 shrink-0 rounded bg-zinc-800/80 px-2 py-0.5 text-center text-[10px] font-bold uppercase text-lime-400 font-mono">
                                {d.day_name}
                              </span>
                              <p className="text-xs text-zinc-300 leading-relaxed flex-1">
                                {d.text || <span className="italic text-zinc-500">No tasks logged for this day.</span>}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-zinc-500 italic">No daily entries found.</p>
                        )}
                      </div>
                    </div>

                    {/* Raw Notes Snippet (collapsible or small font) */}
                    {entry.raw_notes && (
                      <div className="pt-2 border-t border-zinc-800/40">
                        <span className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">
                          Original Notes Scratchpad
                        </span>
                        <p className="text-[11px] text-zinc-400 italic bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-850">
                          {entry.raw_notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
