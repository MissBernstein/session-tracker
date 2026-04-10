import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface Props {
  onDone: () => void;
}

export default function SetPasswordForm({ onDone }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      onDone();
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen p-4 font-sans flex items-center justify-center selection:bg-blue-500/30">
      <div className="w-full bg-[#252525] p-6 rounded-2xl border border-[#373737] shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-blue-500/15 text-blue-400">
            <Lock size={22} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[#EBEBEB]">Set your password</h1>
            <p className="text-sm text-[#AFAFAF]">Choose a password to secure your account.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#AFAFAF] mb-1">New password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#777]" />
              <input
                autoFocus
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
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

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#AFAFAF] mb-1">Confirm password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#777]" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                className="w-full bg-[#191919] border border-[#373737] rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#EBEBEB] text-[#191919] font-semibold py-2 rounded-md hover:bg-white transition-colors text-sm disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Set password'}
          </button>

          {error && (
            <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
