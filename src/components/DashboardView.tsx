import React from 'react';
import { User, Placement, Entry } from '../types/index.ts';
import {
  computeCurrentWeek,
  computeDaysRemaining,
  computeLoggingStreak,
  formatDateRange,
} from '../lib/dateUtils.ts';
import {
  Flame,
  FileCheck2,
  CalendarDays,
  Clock,
  PenLine,
  ArrowRight,
  Sparkles,
  ChevronRight,
  BookOpen,
  Calendar,
  AlertCircle,
} from 'lucide-react';

interface DashboardViewProps {
  user: User;
  placement: Placement;
  entries: Entry[];
  onNavigateToComposer: (weekNumber?: number) => void;
  onNavigateToTimeline: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  placement,
  entries,
  onNavigateToComposer,
  onNavigateToTimeline,
}) => {
  // Calculations
  const currentWeek = computeCurrentWeek(placement.start_date, placement.duration_weeks);
  const totalWeeks = placement.duration_weeks;
  const daysRemaining = computeDaysRemaining(placement.start_date, placement.duration_weeks);
  const totalEntriesSaved = entries.length;
  const streak = computeLoggingStreak(entries, currentWeek);

  const percentage = Math.min(100, Math.round((currentWeek / totalWeeks) * 100));

  // Current week entry status
  const currentWeekEntry = entries.find((e) => e.week_number === currentWeek);

  // Recent entries (last 3-4 ordered by week_number desc)
  const recentEntries = [...entries]
    .sort((a, b) => b.week_number - a.week_number)
    .slice(0, 4);

  // Circular progress calculations for SVG
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const firstName = user.name ? user.name.split(' ')[0] : 'Student';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Welcome & Week Header */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 p-6 sm:p-8 shadow-xl">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-lime-400/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-400/10 px-3 py-1 text-xs font-semibold text-lime-400 border border-lime-400/20">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-400 animate-pulse" />
                Active Industrial Training
              </span>
              <span className="text-xs text-zinc-400">
                {placement.host_organization}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Good day, {firstName}! 👋
            </h1>
            <p className="mt-1 text-sm text-zinc-400 max-w-xl">
              You are currently in <span className="font-semibold text-zinc-200">Week {currentWeek}</span> of your{' '}
              <span className="text-zinc-200 font-semibold">{totalWeeks}-week</span> SIWES program. Keep your daily records updated for defense.
            </p>
          </div>

          {/* Circular Progress Indicator */}
          <div className="flex items-center gap-4 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-4 self-start md:self-auto shadow-inner">
            <div className="relative flex items-center justify-center">
              <svg className="w-24 h-24 transform -rotate-90">
                {/* Background track */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="7"
                  fill="transparent"
                  className="text-zinc-800"
                />
                {/* Animated progress ring */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="7"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="text-lime-400 transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-lg font-black text-white">{percentage}%</span>
                <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">Elapsed</span>
              </div>
            </div>

            <div className="text-left pr-2">
              <div className="text-sm font-bold text-white">
                Week {currentWeek} <span className="text-xs text-zinc-400 font-normal">of {totalWeeks}</span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {formatDateRange(placement.start_date, currentWeek)}
              </div>
              <div className="mt-2 text-[10px] font-medium text-lime-400 flex items-center gap-1">
                <span>{daysRemaining} calendar days left</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Entries Saved */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 hover:border-zinc-700 transition">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Entries Saved</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-800 text-lime-400">
              <FileCheck2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{totalEntriesSaved}</div>
          <p className="mt-1 text-xs text-zinc-400">
            {totalWeeks > 0 ? `${Math.round((totalEntriesSaved / totalWeeks) * 100)}% of logbook completed` : 'Logged reports'}
          </p>
        </div>

        {/* Stat 2: Current Streak */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 hover:border-zinc-700 transition">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Logging Streak</span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${streak > 0 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
              <Flame className="h-4 w-4 fill-current" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{streak}</span>
            <span className="text-xs font-semibold text-zinc-400">{streak === 1 ? 'Week' : 'Weeks'}</span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {streak > 0 ? 'Consistent weekly logging 🔥' : 'Log this week to ignite streak'}
          </p>
        </div>

        {/* Stat 3: Days Remaining */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 hover:border-zinc-700 transition">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Days Remaining</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-800 text-lime-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{daysRemaining}</span>
            <span className="text-xs font-semibold text-zinc-400">Days</span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Attachment conclusion countdown
          </p>
        </div>

        {/* Stat 4: Total Weeks */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 hover:border-zinc-700 transition">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Duration</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-800 text-lime-400">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{totalWeeks}</span>
            <span className="text-xs font-semibold text-zinc-400">Weeks</span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            SIWES Training Requirement
          </p>
        </div>
      </div>

      {/* Main Grid: Quick Log & Recent Entries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Log Card (1 Col) */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:opacity-20 transition">
            <PenLine className="h-28 w-28 text-lime-400" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="rounded-full bg-lime-400/10 px-3 py-1 text-xs font-bold text-lime-400 border border-lime-400/20">
                Quick Log: Week {currentWeek}
              </span>
              <span className="text-xs text-zinc-400">
                {currentWeekEntry ? '✓ Saved' : '⏳ Pending'}
              </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
              {currentWeekEntry ? 'Review & Edit Week ' + currentWeek : 'Record Week ' + currentWeek + ' Activities'}
            </h3>

            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              {currentWeekEntry
                ? `You already have an active entry logged for Week ${currentWeek}. You can update day notes, review the AI summary, or modify tasks anytime.`
                : `Draft your daily tasks for Week ${currentWeek} (${formatDateRange(
                    placement.start_date,
                    currentWeek
                  )}). Use rough notes or Smart Assist to generate professional entries.`}
            </p>

            {currentWeekEntry && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 mb-4">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-1">
                  Saved Summary Preview
                </span>
                <p className="text-xs text-zinc-300 italic line-clamp-2">
                  "{currentWeekEntry.summary}"
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateToComposer(currentWeek)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-lime-400 py-3 text-xs sm:text-sm font-bold text-zinc-950 transition hover:bg-lime-300 shadow-md shadow-lime-400/20"
          >
            <PenLine className="h-4 w-4" />
            {currentWeekEntry ? `Edit Week ${currentWeek} Entry` : `Log Week ${currentWeek} Now`}
            <ArrowRight className="h-4 w-4 ml-1" />
          </button>
        </div>

        {/* Recent Entries List (2 Cols) */}
        <div className="lg:col-span-2 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-lime-400" />
                <h3 className="text-base font-bold text-white">Recent Log Entries</h3>
              </div>
              <button
                onClick={onNavigateToTimeline}
                className="text-xs font-semibold text-lime-400 hover:text-lime-300 flex items-center gap-1 transition"
              >
                View all in Timeline
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {recentEntries.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center">
                <div className="h-12 w-12 rounded-2xl bg-zinc-800/80 text-zinc-500 flex items-center justify-center mb-3">
                  <Calendar className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-zinc-300">No entries saved yet</h4>
                <p className="text-xs text-zinc-500 max-w-sm mt-1">
                  Start logging your weekly industrial work to view entry records, build your streak, and export your logbook PDF.
                </p>
                <button
                  onClick={() => onNavigateToComposer(1)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-lime-400 hover:bg-zinc-700 transition"
                >
                  <PenLine className="h-3.5 w-3.5" />
                  Compose Week 1 Report
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentEntries.map((entry) => {
                  const summarySnippet =
                    entry.summary.length > 80
                      ? entry.summary.slice(0, 80).trim() + '...'
                      : entry.summary;

                  return (
                    <div
                      key={entry.id}
                      onClick={() => onNavigateToComposer(entry.week_number)}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-4 hover:border-zinc-700 hover:bg-zinc-950 transition cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-400/10 text-lime-400 font-black text-sm border border-lime-400/20">
                          W{entry.week_number}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              Week {entry.week_number} Report
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              ({entry.date_range})
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300 mt-1 line-clamp-1">
                            {summarySnippet || 'No summary text.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-zinc-400 pt-2 sm:pt-0 border-t border-zinc-900 sm:border-0">
                        <span className="text-[11px] text-zinc-400">
                          {entry.days ? `${entry.days.length} days logged` : 'Logged'}
                        </span>
                        <div className="flex items-center gap-1 font-semibold text-lime-400 group-hover:translate-x-0.5 transition">
                          <span>Edit</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick link banner */}
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
            <span>Defense readiness tip: Ensure day-by-day logs contain technical verbs (e.g. Configured, Replaced, Tested).</span>
            <button
              onClick={onNavigateToTimeline}
              className="text-xs text-zinc-300 hover:text-white underline underline-offset-2 shrink-0 ml-2"
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
