import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabaseClient';

type AuthView = 'login' | 'signup' | 'signup-sent' | 'forgot' | 'forgot-sent';

export default function AuthScreen() {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const switchView = (v: AuthView) => { setView(v); setError(''); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(error.message);
    setSubmitting(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setSubmitting(true);
    setError('');
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
    } else {
      setView('signup-sent');
    }
    setSubmitting(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    if (error) {
      setError(error.message);
    } else {
      setView('forgot-sent');
    }
    setSubmitting(false);
  };

  const emailField = (autoFocus = false) => (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-[#AFAFAF] mb-1">Email</label>
      <div className="relative">
        <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#777]" />
        <input
          autoFocus={autoFocus}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full bg-[#191919] border border-[#373737] rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>
    </div>
  );

  const passwordField = (label = 'Password') => (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-[#AFAFAF] mb-1">{label}</label>
      <div className="relative">
        <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#777]" />
        <input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full bg-[#191919] border border-[#373737] rounded-md pl-9 pr-10 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777] hover:text-[#AFAFAF]"
        >
          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );

  const errorBox = error ? (
    <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md px-3 py-2">
      {error}
    </div>
  ) : null;

  return (
    <div className="max-w-md mx-auto min-h-screen p-4 font-sans flex items-center justify-center selection:bg-blue-500/30">
      <div className="w-full bg-[#252525] p-6 rounded-2xl border border-[#373737] shadow-2xl">

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-blue-500/15 text-blue-400">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[#EBEBEB]">
              {view === 'login' && 'Sign in'}
              {view === 'signup' && 'Create account'}
              {view === 'signup-sent' && 'Check your inbox'}
              {(view === 'forgot' || view === 'forgot-sent') && 'Reset password'}
            </h1>
            <p className="text-sm text-[#AFAFAF]">Session Tracker</p>
          </div>
        </div>

        {/* ── Login ── */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            {emailField(true)}
            {passwordField()}
            <button type="submit" disabled={submitting}
              className="w-full bg-[#EBEBEB] text-[#191919] font-semibold py-2 rounded-md hover:bg-white transition-colors text-sm disabled:opacity-60">
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
            <div className="flex justify-between text-xs text-[#AFAFAF]">
              <button type="button" onClick={() => switchView('signup')} className="hover:text-[#EBEBEB] transition-colors">
                New here? Create account →
              </button>
              <button type="button" onClick={() => switchView('forgot')} className="hover:text-[#EBEBEB] transition-colors">
                Forgot password?
              </button>
            </div>
            {errorBox}
          </form>
        )}

        {/* ── Sign up ── */}
        {view === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <p className="text-sm text-[#AFAFAF]">
              Use the email address your coach has on file for you.
            </p>
            {emailField(true)}
            {passwordField('Choose a password')}
            <button type="submit" disabled={submitting}
              className="w-full bg-[#EBEBEB] text-[#191919] font-semibold py-2 rounded-md hover:bg-white transition-colors text-sm disabled:opacity-60">
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
            <button type="button" onClick={() => switchView('login')}
              className="w-full text-xs text-[#AFAFAF] hover:text-[#EBEBEB] transition-colors text-center">
              ← Back to sign in
            </button>
            {errorBox}
          </form>
        )}

        {/* ── Sign-up confirmation sent ── */}
        {view === 'signup-sent' && (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-md px-3 py-3 text-sm text-green-400">
              Almost there! Check your inbox at <strong>{email}</strong> and click the confirmation link to activate your account.
            </div>
            <button onClick={() => switchView('login')}
              className="w-full text-xs text-[#AFAFAF] hover:text-[#EBEBEB] transition-colors text-center">
              ← Back to sign in
            </button>
          </div>
        )}

        {/* ── Forgot password ── */}
        {view === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <p className="text-sm text-[#AFAFAF]">Enter your email and we'll send you a reset link.</p>
            {emailField(true)}
            <button type="submit" disabled={submitting}
              className="w-full bg-[#EBEBEB] text-[#191919] font-semibold py-2 rounded-md hover:bg-white transition-colors text-sm disabled:opacity-60">
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
            <button type="button" onClick={() => switchView('login')}
              className="w-full text-xs text-[#AFAFAF] hover:text-[#EBEBEB] transition-colors text-center">
              ← Back to sign in
            </button>
            {errorBox}
          </form>
        )}

        {/* ── Reset link sent ── */}
        {view === 'forgot-sent' && (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-md px-3 py-3 text-sm text-green-400">
              Check your inbox — a password reset link is on its way to <strong>{email}</strong>.
            </div>
            <button onClick={() => switchView('login')}
              className="w-full text-xs text-[#AFAFAF] hover:text-[#EBEBEB] transition-colors text-center">
              ← Back to sign in
            </button>
          </div>
        )}

      </div>
    </div>
  );
}


