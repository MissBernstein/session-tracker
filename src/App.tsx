import React, { useState, useEffect } from 'react';
import type { Session as AuthSession } from '@supabase/supabase-js';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import type { Role } from './types';
import AuthScreen from './components/AuthScreen';
import SetPasswordForm from './components/SetPasswordForm';
import AdminDashboard from './pages/AdminDashboard';
import ClientPortal from './pages/ClientPortal';

export default function App() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [noProfile, setNoProfile] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error('Failed to load auth session:', error);
      else setAuthSession(data.session);
      setAuthLoading(false);
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthSession(session);
      setAuthLoading(false);
      if (event === 'PASSWORD_RECOVERY') {
        setNeedsPasswordReset(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch role whenever user changes
  useEffect(() => {
    if (!authSession?.user) { setRole(null); setNoProfile(false); return; }
    setRoleLoading(true);
    supabase
      .from('profiles')
      .select('role')
      .eq('id', authSession.user.id)
      .single()
      .then(({ data }) => {
        if (data?.role) {
          setRole(data.role as Role);
          setNoProfile(false);
        } else {
          setRole(null);
          setNoProfile(true);
        }
        setRoleLoading(false);
      });
  }, [authSession?.user?.id]);

  if (authLoading) {
    return (
      <div className="max-w-md mx-auto min-h-screen p-4 font-sans flex items-center justify-center">
        <p className="text-[#AFAFAF] text-sm">Checking sign-in…</p>
      </div>
    );
  }

  if (needsPasswordReset && authSession) {
    return <SetPasswordForm onDone={() => setNeedsPasswordReset(false)} />;
  }

  if (!authSession?.user) {
    return <AuthScreen />;
  }

  // Still fetching role
  if (roleLoading) {
    return (
      <div className="max-w-md mx-auto min-h-screen p-4 font-sans flex items-center justify-center">
        <p className="text-[#AFAFAF] text-sm">Loading…</p>
      </div>
    );
  }

  // Logged in but no profile row found
  if (noProfile) {
    return (
      <div className="max-w-md mx-auto min-h-screen p-4 font-sans flex items-center justify-center">
        <div className="w-full bg-[#252525] p-6 rounded-2xl border border-[#373737] text-center space-y-3">
          <p className="text-[#EBEBEB] text-sm font-semibold">Account not set up yet</p>
          <p className="text-[#AFAFAF] text-xs">
            Your account exists but hasn't been assigned a role yet.<br />
            Please ask your administrator to run the setup SQL.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs text-[#AFAFAF] hover:text-[#EBEBEB] underline"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={role === 'admin' ? '/admin' : '/my-sessions'} replace />} />
        <Route path="/admin" element={role === 'admin' ? <AdminDashboard /> : <Navigate to="/my-sessions" replace />} />
        <Route path="/my-sessions" element={role === 'client' ? <ClientPortal /> : <Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// ---- types below are intentionally kept empty — all types live in src/types.ts ----
type _unused = never;
