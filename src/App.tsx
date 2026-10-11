import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './lib/firebase.ts';
import {
  getUserProfileFirestore,
  getPlacementFirestore,
  getEntriesFirestore,
  savePlacementFirestore,
  saveEntryFirestore,
  deleteEntryFirestore,
} from './lib/firestoreService.ts';
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
import { LiveVoiceModal } from './components/LiveVoiceModal.tsx';
import { RefreshCw, Radio, Mic } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'composer' | 'timeline'>('dashboard');
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);

  // Initialize session from Firebase Auth or stored Token
  useEffect(() => {
    // 1. Firebase Auth listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getUserProfileFirestore(firebaseUser.uid);
          if (profile) {
            setUser(profile);
            const placementRecord = await getPlacementFirestore(firebaseUser.uid);
            setPlacement(placementRecord);

            if (placementRecord) {
              const currentWk = computeCurrentWeek(placementRecord.start_date, placementRecord.duration_weeks);
              setSelectedWeek(currentWk);
              const firestoreEntries = await getEntriesFirestore(firebaseUser.uid);
              setEntries(firestoreEntries || []);
            }
            setIsInitializing(false);
            return;
          }
        } catch (err) {
          console.warn('Firestore profile load note:', err);
        }
      }

      // 2. Fallback to API session token (for email/demo users)
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
    });

    return () => unsubscribe();
  }, []);

  // When placement is created or loaded, refresh entries
  const refreshEntries = async (currentUserId?: string | number) => {
    try {
      if (auth.currentUser) {
        const fsEntries = await getEntriesFirestore(auth.currentUser.uid);
        setEntries(fsEntries || []);
      } else {
        const res = await api.getEntries();
        setEntries(res.entries || []);
      }
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
      await refreshEntries(authenticatedUser.id);
      setActiveTab('dashboard');
    }
  };

  const handlePlacementSaved = async (newPlacement: Placement) => {
    setPlacement(newPlacement);

    // If using Firebase Auth, persist in Firestore
    if (auth.currentUser) {
      try {
        await savePlacementFirestore(auth.currentUser.uid, {
          host_organization: newPlacement.host_organization,
          start_date: newPlacement.start_date,
          duration_weeks: newPlacement.duration_weeks,
        });
      } catch (err) {
        console.error('Firestore placement save error:', err);
      }
    }

    const currentWk = computeCurrentWeek(newPlacement.start_date, newPlacement.duration_weeks);
    setSelectedWeek(currentWk);
    if (user) {
      await refreshEntries(user.id);
    }
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    signOut(auth).catch(() => {});
    api.logout();
    setUser(null);
    setPlacement(null);
    setEntries([]);
    setActiveTab('dashboard');
  };

  const handleEntrySaved = async (savedEntry: Entry) => {
    setEntries((prev) => {
      const index = prev.findIndex((e) => e.week_number === savedEntry.week_number);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = savedEntry;
        return updated;
      }
      return [...prev, savedEntry];
    });

    // If using Firebase Auth, persist in Firestore as well
    if (auth.currentUser) {
      try {
        await saveEntryFirestore(auth.currentUser.uid, {
          week_number: savedEntry.week_number,
          date_range: savedEntry.date_range,
          raw_notes: savedEntry.raw_notes || '',
          summary: savedEntry.summary || '',
          days: savedEntry.days || [],
        });
      } catch (err) {
        console.error('Firestore entry save error:', err);
      }
    }
  };

  const handleEntryDeleted = async (weekNumber: number) => {
    setEntries((prev) => prev.filter((e) => e.week_number !== weekNumber));

    if (auth.currentUser) {
      try {
        await deleteEntryFirestore(auth.currentUser.uid, weekNumber);
      } catch (err) {
        console.error('Firestore delete entry error:', err);
      }
    }
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col relative">
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24">
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
            onOpenVoiceAssistant={() => setIsLiveVoiceOpen(true)}
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

      {/* Floating Voice Assistant Trigger */}
      <button
        type="button"
        onClick={() => setIsLiveVoiceOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full bg-lime-400 px-4 py-3 text-xs font-extrabold text-zinc-950 shadow-2xl shadow-lime-400/40 hover:bg-lime-300 hover:scale-105 transition-all duration-200 cursor-pointer border border-lime-300/40"
        title="Start real-time voice conversation with gemini-3.8-live"
      >
        <Radio className="h-4 w-4 animate-pulse text-zinc-950" />
        <span className="hidden sm:inline">Voice Log Assistant</span>
        <span className="sm:hidden">Voice AI</span>
      </button>

      {/* Live Voice Modal (gemini-3.8-live) */}
      <LiveVoiceModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
        weekNumber={selectedWeek}
        onApplyToNotes={(notes) => {
          // If in composer, append to notes
          setActiveTab('composer');
        }}
      />

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
