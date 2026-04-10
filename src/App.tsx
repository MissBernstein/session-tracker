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
    if (!authSession?.user) { setRole(null); return; }
    supabase
      .from('profiles')
      .select('role')
      .eq('id', authSession.user.id)
      .single()
      .then(({ data }) => setRole((data?.role as Role) ?? null));
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
  if (role === null) {
    return (
      <div className="max-w-md mx-auto min-h-screen p-4 font-sans flex items-center justify-center">
        <p className="text-[#AFAFAF] text-sm">Loading…</p>
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
