import React, { useState, useEffect } from 'react';
import { User, Placement, Entry } from './types/index.ts';
import { api, getStoredToken } from './lib/api.ts';
import { computeCurrentWeek } from './lib/dateUtils.ts';
import { Navbar } from './components/Navbar.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { OnboardingModal } from './components/OnboardingModal.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { ComposerView } from './components/ComposerView.tsx';
import { TimelineView } from './components/TimelineView.tsx';
import { PlacementSettingsModal } from './components/PlacementSettingsModal.tsx';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'composer' | 'timeline'>('dashboard');
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initialize session from token
  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        setIsInitializing(false);
        return;
      }

      try {
        const me = await api.getMe();
        setUser(me.user);
        setPlacement(me.placement);

        if (me.placement) {
          const currentWk = computeCurrentWeek(me.placement.start_date, me.placement.duration_weeks);
          setSelectedWeek(currentWk);

          const entriesData = await api.getEntries();
          setEntries(entriesData.entries || []);
        }
      } catch (err) {
        console.error('Session restoration failed:', err);
        api.logout();
        setUser(null);
        setPlacement(null);
      } finally {
        setIsInitializing(false);
      }
    };

    initAuth();
  }, []);

  // When placement is created or loaded, refresh entries
  const refreshEntries = async () => {
    try {
      const res = await api.getEntries();
      setEntries(res.entries || []);
    } catch (err) {
      console.error('Failed to refresh entries:', err);
    }
  };

  const handleAuthSuccess = async (authenticatedUser: User, existingPlacement: Placement | null) => {
    setUser(authenticatedUser);
    setPlacement(existingPlacement);

    if (existingPlacement) {
      const currentWk = computeCurrentWeek(existingPlacement.start_date, existingPlacement.duration_weeks);
      setSelectedWeek(currentWk);
      await refreshEntries();
      setActiveTab('dashboard');
    }
  };

  const handlePlacementSaved = async (newPlacement: Placement) => {
    setPlacement(newPlacement);
    const currentWk = computeCurrentWeek(newPlacement.start_date, newPlacement.duration_weeks);
    setSelectedWeek(currentWk);
    await refreshEntries();
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setPlacement(null);
    setEntries([]);
    setActiveTab('dashboard');
  };

  const handleEntrySaved = (savedEntry: Entry) => {
    setEntries((prev) => {
      const index = prev.findIndex((e) => e.week_number === savedEntry.week_number);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = savedEntry;
        return updated;
      }
      return [...prev, savedEntry];
    });
  };

  const handleEntryDeleted = (weekNumber: number) => {
    setEntries((prev) => prev.filter((e) => e.week_number !== weekNumber));
  };

  const handleNavigateToComposer = (weekNumber?: number) => {
    if (weekNumber !== undefined) {
      setSelectedWeek(weekNumber);
    } else if (placement) {
      const currentWk = computeCurrentWeek(placement.start_date, placement.duration_weeks);
      setSelectedWeek(currentWk);
    }
    setActiveTab('composer');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToTimeline = () => {
    setActiveTab('timeline');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Loading screen
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-3">
        <RefreshCw className="h-6 w-6 text-lime-400 animate-spin" />
        <span className="text-xs font-semibold tracking-wide">Loading SIWES LogBook...</span>
      </div>
    );
  }

  // If not authenticated, show Landing Page
  if (!user) {
    return <LandingPage onAuthSuccess={handleAuthSuccess} />;
  }

  // If authenticated but no placement record, show Onboarding
  if (!placement) {
    return (
      <OnboardingModal
        userName={user.name}
        onPlacementSaved={handlePlacementSaved}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        user={user}
        placement={placement}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenPlacementSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            user={user}
            placement={placement}
            entries={entries}
            onNavigateToComposer={handleNavigateToComposer}
            onNavigateToTimeline={handleNavigateToTimeline}
          />
        )}

        {activeTab === 'composer' && (
          <ComposerView
            placement={placement}
            entries={entries}
            selectedWeek={selectedWeek}
            setSelectedWeek={setSelectedWeek}
            onEntrySaved={handleEntrySaved}
            onEntryDeleted={handleEntryDeleted}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelineView
            user={user}
            placement={placement}
            entries={entries}
            onNavigateToComposer={handleNavigateToComposer}
          />
        )}
      </main>

      {/* Placement & Profile Settings Modal */}
      <PlacementSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        placement={placement}
        onPlacementUpdated={(updated) => setPlacement(updated)}
      />
    </div>
  );
}
