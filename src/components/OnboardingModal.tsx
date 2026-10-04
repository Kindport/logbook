import React, { useState } from 'react';
import { Building2, Calendar, Clock, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { api } from '../lib/api.ts';
import { Placement } from '../types/index.ts';

interface OnboardingModalProps {
  userName: string;
  onPlacementSaved: (placement: Placement) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ userName, onPlacementSaved }) => {
  const [hostOrg, setHostOrg] = useState('');
  const [startDate, setStartDate] = useState(() => {
    // Default to current Monday or recent date
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  });
  const [durationWeeks, setDurationWeeks] = useState(24);
  const [customWeeks, setCustomWeeks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostOrg.trim()) {
      setError('Please enter your host organisation.');
      return;
    }
    if (!startDate) {
      setError('Please select your placement start date.');
      return;
    }

    const finalWeeks = durationWeeks === -1 ? parseInt(customWeeks, 10) : durationWeeks;
    if (isNaN(finalWeeks) || finalWeeks < 1 || finalWeeks > 52) {
      setError('Please provide a valid duration between 1 and 52 weeks.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await api.savePlacement({
        host_organization: hostOrg.trim(),
        start_date: startDate,
        duration_weeks: finalWeeks,
      });
      onPlacementSaved(res.placement);
    } catch (err: any) {
      setError(err.message || 'Failed to save placement record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400 text-zinc-950 shadow-lg shadow-lime-400/20 mb-3">
            <Building2 className="h-6 w-6 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">Welcome, {userName.split(' ')[0]}!</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Let's configure your SIWES / Industrial Training placement particulars before entering your logbook.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Host Organisation */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-lime-400" />
              Host Organisation / Company Name
            </label>
            <input
              type="text"
              required
              value={hostOrg}
              onChange={(e) => setHostOrg(e.target.value)}
              placeholder="e.g. Chevron Nigeria Ltd, NNPC, MainOne, or Tech Studio"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400 transition"
            />
            <span className="mt-1 block text-[11px] text-zinc-500">
              The firm or establishment where your industrial training is being conducted.
            </span>
          </div>

          {/* Placement Start Date */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-lime-400" />
              Attachment Commencement Date
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400 transition"
            />
            <span className="mt-1 block text-[11px] text-zinc-500">
              The Monday or official start date your training began.
            </span>
          </div>

          {/* Duration in Weeks */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-lime-400" />
              Placement Duration
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[
                { label: '24 Weeks', sub: '6 Months (Uni)', val: 24 },
                { label: '16 Weeks', sub: '4 Months (Poly)', val: 16 },
                { label: '12 Weeks', sub: '3 Months (IT)', val: 12 },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setDurationWeeks(item.val)}
                  className={`flex flex-col items-center justify-center rounded-xl p-2.5 border text-center transition ${
                    durationWeeks === item.val
                      ? 'border-lime-400 bg-lime-400/10 text-lime-300 font-bold'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-xs font-bold">{item.label}</span>
                  <span className="text-[10px] text-zinc-500">{item.sub}</span>
                </button>
              ))}
            </div>

            {/* Custom option */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDurationWeeks(-1)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                  durationWeeks === -1
                    ? 'border-lime-400 bg-lime-400/10 text-lime-300 font-semibold'
                    : 'border-zinc-800 text-zinc-400'
                }`}
              >
                Other duration
              </button>
              {durationWeeks === -1 && (
                <input
                  type="number"
                  min="1"
                  max="52"
                  placeholder="Weeks (e.g. 20)"
                  value={customWeeks}
                  onChange={(e) => setCustomWeeks(e.target.value)}
                  className="w-32 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white focus:border-lime-400 focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Value note */}
          <div className="flex items-start gap-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 text-[11px] text-zinc-400">
            <ShieldCheck className="h-4 w-4 text-lime-400 shrink-0 mt-0.5" />
            <span>
              This information will be printed directly onto your official ITF/SIWES defense logbook header and PDF exports.
            </span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-lime-400 py-3 text-sm font-bold text-zinc-950 transition hover:bg-lime-300 disabled:opacity-50 shadow-lg shadow-lime-400/20"
          >
            {isSubmitting ? (
              'Saving Placement Record...'
            ) : (
              <>
                <span>Launch My LogBook</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
