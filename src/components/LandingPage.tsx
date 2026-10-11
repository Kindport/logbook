import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase.ts';
import {
  getUserProfileFirestore,
  saveUserProfileFirestore,
  getPlacementFirestore,
} from '../lib/firestoreService.ts';
import { api } from '../lib/api.ts';
import { User, Placement } from '../types/index.ts';
import {
  BookOpen,
  Sparkles,
  ShieldCheck,
  Download,
  Flame,
  CheckCircle2,
  ArrowRight,
  Lock,
  Mail,
  GraduationCap,
  Building,
  User as UserIcon,
  ChevronRight,
  FileText,
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react';

interface LandingPageProps {
  onAuthSuccess: (user: User, placement: Placement | null) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onAuthSuccess }) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [matricNo, setMatricNo] = useState('');
  const [institution, setInstitution] = useState('');
  const [department, setDepartment] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const resetAuthForm = () => {
    setPassword('');
    setShowPassword(false);
    setAuthError(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setAuthError(null);
      const res = await api.login({ email, password });
      resetAuthForm();
      onAuthSuccess(res.user, res.placement);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setAuthError(null);
      const res = await api.signup({
        name,
        email,
        password,
        matric_no: matricNo,
        institution,
        department,
      });
      resetAuthForm();
      onAuthSuccess(res.user, res.placement);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to create account.');
    } finally {
      setIsLoading(false);
    }
  };

  const [googleUserTemp, setGoogleUserTemp] = useState<any>(null);
  const [showGoogleDetailsModal, setShowGoogleDetailsModal] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setAuthError(null);
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      // Check existing profile in Firestore
      const existingProfile = await getUserProfileFirestore(firebaseUser.uid);
      if (existingProfile && existingProfile.matric_no) {
        const placement = await getPlacementFirestore(firebaseUser.uid);
        onAuthSuccess(existingProfile, placement);
      } else {
        // Show detail collection modal for student info
        setGoogleUserTemp(firebaseUser);
        setName(firebaseUser.displayName || '');
        setEmail(firebaseUser.email || '');
        setShowGoogleDetailsModal(true);
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setAuthError(err.message || 'Google sign-in could not be completed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleProfileComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleUserTemp) return;
    try {
      setIsLoading(true);
      setAuthError(null);
      const profile = await saveUserProfileFirestore(googleUserTemp.uid, {
        name: name || googleUserTemp.displayName || 'Student',
        email: email || googleUserTemp.email || '',
        matric_no: matricNo.trim(),
        institution: institution.trim(),
        department: department.trim(),
      });
      const placement = await getPlacementFirestore(googleUserTemp.uid);
      setShowGoogleDetailsModal(false);
      onAuthSuccess(profile, placement);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to save student profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setIsLoading(true);
      setAuthError(null);
      const res = await api.loginDemo();
      onAuthSuccess(res.user, res.placement);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to launch demo account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-lime-400 selection:text-zinc-950">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-400 text-zinc-950 shadow-md shadow-lime-400/20">
              <BookOpen className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-white">LogBook</span>
                <span className="rounded-md bg-lime-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-lime-400 border border-lime-400/20">
                  SIWES
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setAuthError(null);
                setAuthMode('login');
              }}
              className="text-xs font-semibold text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg transition"
            >
              Log in
            </button>
            <button
              onClick={() => {
                setAuthError(null);
                setAuthMode('signup');
              }}
              className="flex items-center gap-1.5 rounded-xl bg-lime-400 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-lime-300 transition shadow-md shadow-lime-400/20"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col justify-center py-12 px-6">
        <div className="mx-auto max-w-5xl text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3.5 py-1.5 text-xs font-semibold text-lime-400 shadow-inner">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Built for Nigerian University & Polytechnic SIWES Students</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.1]">
            Never struggle with your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-200">
              SIWES Logbook
            </span>{' '}
            ever again.
          </h1>

          {/* Subtitle */}
          <p className="mx-auto max-w-2xl text-sm sm:text-base text-zinc-400 leading-relaxed">
            Transform messy, informal notes into polished, ITF-compliant daily reports. Built with strict anti-hallucination guardrails, live week streak tracking, and 1-click official PDF export for your defense.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-2xl border border-zinc-700 bg-zinc-900 px-7 py-3.5 text-sm font-bold text-white hover:bg-zinc-800 transition cursor-pointer shadow-xl shadow-black/40"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>
            <button
              onClick={() => {
                setAuthError(null);
                setAuthMode('signup');
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-lime-400 px-7 py-3.5 text-sm font-extrabold text-zinc-950 hover:bg-lime-300 transition shadow-xl shadow-lime-400/20 cursor-pointer"
            >
              <span>Email Sign Up</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-lime-400/40 bg-lime-400/10 px-6 py-3.5 text-sm font-bold text-lime-400 hover:bg-lime-400/20 transition cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Try Demo Account</span>
            </button>
          </div>

          {/* Trust snippet */}
          <p className="text-xs text-zinc-500 pt-2">
            Adheres strictly to Industrial Training Fund (ITF) & NUC/NBTE weekly report format.
          </p>
        </div>

        {/* 3-Feature Row */}
        <div className="mx-auto max-w-6xl w-full grid grid-cols-1 md:grid-cols-3 gap-6 pt-16">
          {/* Feature 1 */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-7 hover:border-zinc-700 transition">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400 border border-lime-400/20 mb-4">
              <ShieldCheck className="h-6 w-6 stroke-[2.2]" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Zero-Fabrication AI</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Our system prompt is constrained to never invent tools, software, or machinery you didn't touch. It strictly restructures and grammatically refines what you actually performed.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-7 hover:border-zinc-700 transition">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400 border border-lime-400/20 mb-4">
              <Flame className="h-6 w-6 stroke-[2.2]" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Streak & Progress Analytics</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Track your 12, 16, or 24-week industrial placement with visual countdowns, completion percentages, and logging streaks so you never fall weeks behind.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-7 hover:border-zinc-700 transition">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400 border border-lime-400/20 mb-4">
              <Download className="h-6 w-6 stroke-[2.2]" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Official SIWES PDF Export</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Generate a multi-page, formatted PDF complete with your matric number, institution, weekly summaries, and supervisor sign-off tables ready for print and defense.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-6 text-center text-xs text-zinc-500">
        <p>LogBook — Supporting Nigerian engineering, science, and technology trainees nationwide.</p>
      </footer>

      {/* Auth Modal (Login / Signup) */}
      {authMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 shadow-2xl">
            {/* Close */}
            <button
              onClick={() => {
                resetAuthForm();
                setAuthMode(null);
              }}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              ✕
            </button>

            {/* Tabs */}
            <div className="flex rounded-xl bg-zinc-950 p-1 border border-zinc-800 mb-6">
              <button
                type="button"
                onClick={() => {
                  resetAuthForm();
                  setAuthMode('login');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  authMode === 'login'
                    ? 'bg-zinc-800 text-lime-400 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  resetAuthForm();
                  setAuthMode('signup');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  authMode === 'signup'
                    ? 'bg-zinc-800 text-lime-400 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Sign Up
              </button>
            </div>

            {authError && (
              <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
                {authError}
              </div>
            )}

            {/* Google One-Click Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-zinc-700 bg-zinc-950 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 transition mb-4 shadow-sm"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative flex items-center justify-center mb-4">
              <div className="border-t border-zinc-800 w-full" />
              <span className="bg-zinc-900 px-2 text-[10px] uppercase font-bold text-zinc-500 absolute">
                or with email
              </span>
            </div>

            {authMode === 'login' ? (
              /* LOGIN FORM */
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Student Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@university.edu.ng"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-zinc-300">Password</label>
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Lock className="h-2.5 w-2.5 text-lime-400" />
                      Encrypted & Protected
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-10 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 transition"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-lime-400 py-2.5 text-xs font-bold text-zinc-950 hover:bg-lime-300 transition shadow-md shadow-lime-400/10 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? 'Verifying...' : 'Log in to LogBook'}
                </button>

                <div className="relative flex items-center justify-center pt-2">
                  <div className="border-t border-zinc-800 w-full" />
                  <span className="bg-zinc-900 px-2 text-[10px] uppercase font-bold text-zinc-500 absolute">
                    or
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 py-2.5 text-xs font-bold text-lime-400 hover:bg-zinc-800 transition"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Explore Demo Student Account (1-Click)</span>
                </button>
              </form>
            ) : (
              /* SIGNUP FORM */
              <form onSubmit={handleSignupSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Adebayo Emmanuel Okafor"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@email.com"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Password</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Matric / Registration Number
                  </label>
                  <input
                    type="text"
                    required
                    value={matricNo}
                    onChange={(e) => setMatricNo(e.target.value)}
                    placeholder="e.g. 2020/1/83940EE or ND/21/0491"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Institution (University / Polytechnic)
                  </label>
                  <input
                    type="text"
                    required
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. University of Lagos, FUT Minna, Yabatech"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Computer Engineering / Electrical / Biochemistry"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-lime-400 py-2.5 text-xs font-bold text-zinc-950 hover:bg-lime-300 transition shadow-md shadow-lime-400/10 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isLoading ? 'Creating Account...' : 'Register & Start SIWES'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* First-time Google Student Academic Info Modal */}
      {showGoogleDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-7 shadow-2xl">
            <div className="text-center mb-5">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-400 text-zinc-950 font-bold mb-2.5">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Complete Student Details</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Signed in as <strong className="text-zinc-200">{googleUserTemp?.email}</strong>. Enter your university particulars for official SIWES logbook documents.
              </p>
            </div>

            {authError && (
              <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
                {authError}
              </div>
            )}

            <form onSubmit={handleGoogleProfileComplete} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Adebayo Emmanuel Okafor"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Matric / Reg. Number</label>
                <input
                  type="text"
                  required
                  value={matricNo}
                  onChange={(e) => setMatricNo(e.target.value)}
                  placeholder="e.g. 2021/1/89204EE"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Institution</label>
                <input
                  type="text"
                  required
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. University of Lagos, FUT Minna, Yabatech"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Department</label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Electrical Engineering / Computer Science"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-lime-400 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleDetailsModal(false)}
                  className="flex-1 rounded-xl border border-zinc-800 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 rounded-xl bg-lime-400 py-2.5 text-xs font-bold text-zinc-950 hover:bg-lime-300 transition"
                >
                  {isLoading ? 'Saving...' : 'Enter LogBook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
