import React, { useState } from 'react';
import { User, Placement } from '../types/index.ts';
import { api } from '../lib/api.ts';
import { Building2, Calendar, Clock, X, Check, AlertCircle } from 'lucide-react';

interface PlacementSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  placement: Placement | null;
  onPlacementUpdated: (placement: Placement) => void;
}

export const PlacementSettingsModal: React.FC<PlacementSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  placement,
  onPlacementUpdated,
}) => {
  const [hostOrg, setHostOrg] = useState(placement?.host_organization || '');
  const [startDate, setStartDate] = useState(placement?.start_date || '');
  const [durationWeeks, setDurationWeeks] = useState(placement?.duration_weeks || 24);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostOrg.trim() || !startDate || durationWeeks <= 0) {
      setError('Please provide valid host organisation, start date, and duration.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const res = await api.savePlacement({
        host_organization: hostOrg.trim(),
        start_date: startDate,
        duration_weeks: Number(durationWeeks),
      });
      onPlacementUpdated(res.placement);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update placement.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="h-4 w-4 text-lime-400" />
            Placement & Profile Details
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Student Profile Overview */}
        <div className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3.5 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-500 font-medium">Student Name:</span>
            <span className="text-zinc-200 font-semibold">{user.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 font-medium">Matric No:</span>
            <span className="text-zinc-200 font-mono">{user.matric_no}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 font-medium">Institution:</span>
            <span className="text-zinc-200 text-right max-w-[200px] truncate">{user.institution}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 font-medium">Department:</span>
            <span className="text-zinc-200 text-right max-w-[200px] truncate">{user.department}</span>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Edit Placement Form */}
        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Host Organisation
            </label>
            <input
              type="text"
              required
              value={hostOrg}
              onChange={(e) => setHostOrg(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Total Weeks
              </label>
              <input
                type="number"
                min="1"
                max="52"
                required
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-xl bg-lime-400 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-lime-300 transition"
            >
              <Check className="h-3.5 w-3.5" />
              {isSaving ? 'Updating...' : 'Update Placement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
