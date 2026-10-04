import React from 'react';
import { User, Placement } from '../types/index.ts';
import { BookOpen, LayoutDashboard, PenTool, Calendar, Building, LogOut, CheckCircle2 } from 'lucide-react';

interface NavbarProps {
  user: User;
  placement: Placement | null;
  activeTab: 'dashboard' | 'composer' | 'timeline';
  setActiveTab: (tab: 'dashboard' | 'composer' | 'timeline') => void;
  onOpenPlacementSettings: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  placement,
  activeTab,
  setActiveTab,
  onOpenPlacementSettings,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex cursor-pointer items-center gap-2.5 transition hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-400 text-zinc-950 shadow-md shadow-lime-400/20">
              <BookOpen className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-white">LogBook</span>
                <span className="rounded-md bg-lime-400/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-lime-400 border border-lime-400/20">
                  SIWES
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">Industrial Training Companion</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 rounded-xl bg-zinc-900/80 p-1 border border-zinc-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'dashboard'
                  ? 'bg-zinc-800 text-lime-400 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('composer')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'composer'
                  ? 'bg-zinc-800 text-lime-400 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <PenTool className="h-4 w-4" />
              Composer
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'timeline'
                  ? 'bg-zinc-800 text-lime-400 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Calendar className="h-4 w-4" />
              Timeline & PDF
            </button>
          </nav>
        </div>

        {/* User Particulars & Actions */}
        <div className="flex items-center gap-3">
          {placement && (
            <button
              onClick={onOpenPlacementSettings}
              className="hidden lg:flex items-center gap-2 rounded-xl bg-zinc-900/70 border border-zinc-800 px-3 py-1.5 text-left text-xs transition hover:border-zinc-700"
              title="Click to view or edit placement details"
            >
              <Building className="h-3.5 w-3.5 text-lime-400 shrink-0" />
              <div className="max-w-[160px] truncate">
                <span className="block truncate font-medium text-zinc-200">{placement.host_organization}</span>
                <span className="block text-[10px] text-zinc-400">{placement.duration_weeks} Weeks Plan</span>
              </div>
            </button>
          )}

          {/* Student Profile Info */}
          <div className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-1.5">
            <div className="h-7 w-7 rounded-lg bg-lime-400/20 text-lime-400 flex items-center justify-center font-bold text-xs">
              {user.name ? user.name[0].toUpperCase() : 'S'}
            </div>
            <div className="text-left hidden sm:block">
              <span className="block text-xs font-medium text-zinc-100 max-w-[120px] truncate">{user.name}</span>
              <span className="block text-[10px] text-zinc-400 max-w-[120px] truncate">{user.matric_no}</span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-800 text-zinc-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="flex md:hidden border-t border-zinc-800/60 bg-zinc-950 px-4 py-2 justify-around">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium ${
            activeTab === 'dashboard' ? 'text-lime-400 bg-zinc-900' : 'text-zinc-400'
          }`}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('composer')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium ${
            activeTab === 'composer' ? 'text-lime-400 bg-zinc-900' : 'text-zinc-400'
          }`}
        >
          <PenTool className="h-3.5 w-3.5" />
          Composer
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium ${
            activeTab === 'timeline' ? 'text-lime-400 bg-zinc-900' : 'text-zinc-400'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          Timeline
        </button>
      </div>
    </header>
  );
};
