/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import type { Session as AuthSession } from '@supabase/supabase-js';
import { 
  Plus, 
  History, 
  Undo2, 
  Archive, 
  UserPlus, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  X,
  Filter,
  Mic,
  Heart,
  Mail,
  LogOut,
  ShieldCheck,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './supabaseClient';

// --- Types ---

type Category = 'Vocal Coaching' | 'Life Coaching';
type PackageType = 3 | 5 | 10 | 'Custom';

interface Session {
  id: string;
  timestamp: string;
}

interface Client {
  id: string;
  name: string;
  category: Category;
  packageType: PackageType;
  customPackageCount?: number;
  initialNotes: string;
  sessions: Session[];
  completedPackages: Session[][]; // Added to store previous packages
  isArchived: boolean;
  createdAt: string;
}

// --- Supabase helpers ---

function toRow(c: Partial<Client> & { id?: string; createdAt?: string }) {
  const row: Record<string, unknown> = {};
  if (c.id !== undefined) row.id = c.id;
  if (c.name !== undefined) row.name = c.name;
  if (c.category !== undefined) row.category = c.category;
  if (c.packageType !== undefined) row.package_type = String(c.packageType);
  if (c.customPackageCount !== undefined) row.custom_package_count = c.customPackageCount;
  if (c.initialNotes !== undefined) row.initial_notes = c.initialNotes;
  if (c.sessions !== undefined) row.sessions = c.sessions;
  if (c.completedPackages !== undefined) row.completed_packages = c.completedPackages;
  if (c.isArchived !== undefined) row.is_archived = c.isArchived;
  if (c.createdAt !== undefined) row.created_at = c.createdAt;
  return row;
}

function fromRow(row: Record<string, unknown>): Client {
  const pt = row.package_type as string;
  return {
    id: row.id as string,
    name: row.name as string,
    category: row.category as Category,
    packageType: (pt === 'Custom' ? 'Custom' : Number(pt)) as PackageType,
    customPackageCount: row.custom_package_count as number | undefined,
    initialNotes: row.initial_notes as string,
    sessions: (row.sessions ?? []) as Session[],
    completedPackages: (row.completed_packages ?? []) as Session[][],
    isArchived: row.is_archived as boolean,
    createdAt: row.created_at as string,
  };
}

// --- Components ---

export default function App() {
  const [clients, setClients] = useState<Client[]>([]);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filter, setFilter] = useState<'All' | Category>('All');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Failed to load auth session:', error);
      } else {
        setAuthSession(data.session);
      }
      setAuthLoading(false);
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data from Supabase for the signed-in user
  useEffect(() => {
    if (!authSession?.user) {
      setClients([]);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) console.error('Failed to load clients:', error);
      else setClients((data ?? []).map(fromRow));
      setLoading(false);
    })();
  }, [authSession?.user?.id]);

  const addClient = async (newClient: Omit<Client, 'id' | 'sessions' | 'completedPackages' | 'isArchived' | 'createdAt'>) => {
    const client: Client = {
      ...newClient,
      id: crypto.randomUUID(),
      sessions: [],
      completedPackages: [],
      isArchived: false,
      createdAt: new Date().toISOString(),
    };
    const { error } = await supabase.from('clients').insert(toRow(client));
    if (error) { console.error('Failed to add client:', error); return; }
    setClients(prev => [client, ...prev]);
    setIsFormOpen(false);
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const { error } = await supabase.from('clients').update(toRow(updates)).eq('id', id);
    if (error) { console.error('Failed to update client:', error); return; }
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteClient = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this client?')) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) { console.error('Failed to delete client:', error); return; }
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const addSession = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const timestamp = new Date().toLocaleString();
    const newSessions = [...client.sessions, { id: crypto.randomUUID(), timestamp }];
    const { error } = await supabase.from('clients').update({ sessions: newSessions }).eq('id', clientId);
    if (error) { console.error('Failed to add session:', error); return; }
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, sessions: newSessions } : c));
  };

  const undoSession = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client || client.sessions.length === 0) return;
    const newSessions = client.sessions.slice(0, -1);
    const { error } = await supabase.from('clients').update({ sessions: newSessions }).eq('id', clientId);
    if (error) { console.error('Failed to undo session:', error); return; }
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, sessions: newSessions } : c));
  };

  const renewPackage = async (clientId: string, packageType: PackageType, customCount?: number) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const newCompletedPackages = [...(client.completedPackages || []), client.sessions];
    const { error } = await supabase.from('clients').update({
      completed_packages: newCompletedPackages,
      sessions: [],
      package_type: String(packageType),
      custom_package_count: customCount ?? null,
    }).eq('id', clientId);
    if (error) { console.error('Failed to renew package:', error); return; }
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        return {
          ...c,
          completedPackages: newCompletedPackages,
          sessions: [],
          packageType,
          customPackageCount: customCount,
        };
      }
      return c;
    }));
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Failed to sign out:', error);
      return;
    }
    setClients([]);
    setIsFormOpen(false);
  };

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchesFilter = filter === 'All' || c.category === filter;
      return matchesFilter && !c.isArchived;
    });
  }, [clients, filter]);

  const archivedClients = useMemo(() => {
    return clients.filter(c => c.isArchived);
  }, [clients]);

  if (authLoading || loading) return (
    <div className="max-w-md mx-auto min-h-screen p-4 font-sans flex items-center justify-center">
      <p className="text-[#AFAFAF] text-sm">{authLoading ? 'Checking sign-in…' : 'Loading…'}</p>
    </div>
  );

  if (!authSession?.user) {
    return <AuthScreen />;
  }

  return (
    <div className="max-w-md mx-auto min-h-screen p-4 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Session Tracker</h1>
          <p className="text-[11px] text-[#AFAFAF] mt-1">Signed in as {authSession.user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={signOut}
            className="p-2 rounded-full bg-[#2F2F2F] hover:bg-[#3F3F3F] transition-colors text-white"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
          <button 
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="p-2 rounded-full bg-[#2F2F2F] hover:bg-[#3F3F3F] transition-colors text-white"
            title="Add Client"
          >
            <UserPlus size={20} />
          </button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        {(['All', 'Vocal Coaching', 'Life Coaching'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
              filter === f 
                ? 'bg-[#EBEBEB] text-[#191919]' 
                : 'bg-[#2F2F2F] text-[#AFAFAF] hover:text-[#EBEBEB]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Add Client Form */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <AddClientForm onSubmit={addClient} onCancel={() => setIsFormOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Clients List */}
      <div className="space-y-4 mb-12">
        {filteredClients.length === 0 ? (
          <div className="text-center py-12 text-[#AFAFAF] text-sm italic">
            No active clients found.
          </div>
        ) : (
          filteredClients.map(client => (
            <ClientCard 
              key={client.id} 
              client={client} 
              onAddSession={() => addSession(client.id)}
              onUndoSession={() => undoSession(client.id)}
              onArchive={() => updateClient(client.id, { isArchived: true })}
              onDelete={() => deleteClient(client.id)}
              onRenew={(type, count) => renewPackage(client.id, type, count)}
            />
          ))
        )}
      </div>

      {/* Archive Section */}
      {archivedClients.length > 0 && (
        <div className="border-t border-[#2F2F2F] pt-6">
          <button 
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 text-[#AFAFAF] hover:text-[#EBEBEB] transition-colors text-sm font-medium mb-4"
          >
            <Archive size={16} />
            Archive ({archivedClients.length})
            {showArchived ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          <AnimatePresence>
            {showArchived && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="space-y-4"
              >
                {archivedClients.map(client => (
                  <ClientCard 
                    key={client.id} 
                    client={client} 
                    isArchived
                    onUnarchive={() => updateClient(client.id, { isArchived: false })}
                    onDelete={() => deleteClient(client.id)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function AuthScreen() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    setStatus('');

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setStatus(error.message);
    } else {
      setStatus('Check your email for a magic sign-in link.');
    }

    setSubmitting(false);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen p-4 font-sans flex items-center justify-center selection:bg-blue-500/30">
      <div className="w-full bg-[#252525] p-6 rounded-2xl border border-[#373737] shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-blue-500/15 text-blue-400">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[#EBEBEB]">Secure sign-in</h1>
            <p className="text-sm text-[#AFAFAF]">Use a magic link so only you can access your session data.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#AFAFAF] mb-1">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#777]" />
              <input
                autoFocus
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#191919] border border-[#373737] rounded-md pl-10 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#EBEBEB] text-[#191919] font-semibold py-2 rounded-md hover:bg-white transition-colors text-sm disabled:opacity-60"
          >
            {submitting ? 'Sending link…' : 'Email me a sign-in link'}
          </button>

          <p className="text-xs text-[#888] leading-relaxed">
            No password needed. Open the link from your inbox on this device to sign in.
          </p>

          {status && (
            <div className="text-sm text-[#AFAFAF] bg-[#1D1D1D] border border-[#373737] rounded-md px-3 py-2">
              {status}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function AddClientForm({ onSubmit, onCancel }: { 
  onSubmit: (client: any) => void; 
  onCancel: () => void 
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('Vocal Coaching');
  const [packageType, setPackageType] = useState<PackageType>(3);
  const [customCount, setCustomCount] = useState(1);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name,
      category,
      packageType,
      customPackageCount: packageType === 'Custom' ? customCount : undefined,
      initialNotes: notes
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#252525] p-4 rounded-xl border border-[#373737] space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-[#EBEBEB]">New Client Intake</h3>
        <button type="button" onClick={onCancel} className="text-[#AFAFAF] hover:text-[#EBEBEB]">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-[#AFAFAF] mb-1">Name</label>
          <input 
            autoFocus
            type="text" 
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Client Name"
            className="w-full bg-[#191919] border border-[#373737] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#AFAFAF] mb-1">Category</label>
            <select 
              value={category}
              onChange={e => setCategory(e.target.value as Category)}
              className="w-full bg-[#191919] border border-[#373737] rounded-md px-3 py-2 text-sm focus:outline-none"
            >
              <option value="Vocal Coaching">Vocal Coaching</option>
              <option value="Life Coaching">Life Coaching</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#AFAFAF] mb-1">Package</label>
            <select 
              value={packageType}
              onChange={e => setPackageType(e.target.value as any)}
              className="w-full bg-[#191919] border border-[#373737] rounded-md px-3 py-2 text-sm focus:outline-none"
            >
              <option value={3}>3 Sessions</option>
              <option value={5}>5 Sessions</option>
              <option value={10}>10 Sessions</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
        </div>

        {packageType === 'Custom' && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
            <label className="block text-[10px] uppercase tracking-wider text-[#AFAFAF] mb-1">Session Count</label>
            <input 
              type="number" 
              min={1}
              value={customCount}
              onChange={e => setCustomCount(parseInt(e.target.value) || 1)}
              className="w-full bg-[#191919] border border-[#373737] rounded-md px-3 py-2 text-sm focus:outline-none"
            />
          </motion.div>
        )}

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-[#AFAFAF] mb-1">Initial Notes</label>
          <textarea 
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Goals, vocal range, etc."
            className="w-full bg-[#191919] border border-[#373737] rounded-md px-3 py-2 text-sm focus:outline-none h-20 resize-none"
          />
        </div>
      </div>

      <button 
        type="submit"
        className="w-full bg-[#EBEBEB] text-[#191919] font-semibold py-2 rounded-md hover:bg-white transition-colors text-sm"
      >
        Add Client
      </button>
    </form>
  );
}

interface ClientCardProps {
  client: Client; 
  onAddSession?: () => void;
  onUndoSession?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onDelete: () => void;
  onRenew?: (type: PackageType, count?: number) => void;
  isArchived?: boolean;
}

const ClientCard: React.FC<ClientCardProps> = ({ 
  client, 
  onAddSession, 
  onUndoSession, 
  onArchive, 
  onUnarchive,
  onDelete,
  onRenew,
  isArchived = false 
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [newPackageType, setNewPackageType] = useState<PackageType>(client.packageType);
  const [newCustomCount, setNewCustomCount] = useState(client.customPackageCount || 1);

  const totalSessions = client.packageType === 'Custom' ? (client.customPackageCount || 1) : (client.packageType as number);
  const currentCount = client.sessions.length;
  const progress = Math.min((currentCount / totalSessions) * 100, 100);
  const isComplete = currentCount >= totalSessions;

  // Trigger celebration when hitting exactly 100%
  useEffect(() => {
    if (isComplete && currentCount === totalSessions && !isArchived) {
      setCelebrate(true);
      const timer = setTimeout(() => setCelebrate(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentCount, totalSessions, isArchived]);

  return (
    <div className={`bg-[#252525] rounded-xl border border-[#373737] overflow-hidden transition-all ${isArchived ? 'opacity-60' : ''}`}>
      {/* Card Header */}
      <div className="p-4 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {client.category === 'Vocal Coaching' ? <Mic size={14} className="text-blue-400" /> : <Heart size={14} className="text-rose-400" />}
            <span className="text-[10px] uppercase tracking-widest text-[#AFAFAF] font-bold">{client.category}</span>
          </div>
          <h3 className="text-base font-semibold text-[#EBEBEB] leading-tight">{client.name}</h3>
        </div>
        {!isArchived && (
          <div className="flex gap-1">
            <button 
              onClick={onUndoSession}
              disabled={currentCount === 0}
              className="p-1.5 rounded-md hover:bg-[#373737] text-[#AFAFAF] disabled:opacity-30 transition-colors"
              title="Undo last session"
            >
              <Undo2 size={16} />
            </button>
            <button 
              onClick={onArchive}
              className="p-1.5 rounded-md hover:bg-[#373737] text-[#AFAFAF] transition-colors"
              title="Archive Client"
            >
              <Archive size={16} />
            </button>
          </div>
        )}
        {isArchived && (
          <div className="flex gap-1">
            <button 
              onClick={onUnarchive}
              className="p-1.5 rounded-md hover:bg-[#373737] text-[#AFAFAF] transition-colors"
              title="Restore Client"
            >
              <RotateCcw size={16} />
            </button>
            <button 
              onClick={onDelete}
              className="p-1.5 rounded-md hover:bg-rose-500/20 text-rose-400 transition-colors"
              title="Delete Permanently"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Progress Section */}
      <div className="px-4 pb-4">
        <div className="flex justify-between items-end mb-2">
          <div className="text-xs font-medium text-[#AFAFAF]">
            <span className={`text-lg font-bold ${isComplete ? 'text-green-400' : 'text-[#EBEBEB]'}`}>{currentCount}</span>
            <span className="mx-1">/</span>
            <span>{totalSessions} sessions</span>
          </div>
          {isComplete && !isArchived && (
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              className="flex items-center gap-1 text-green-400 text-[10px] font-bold uppercase tracking-wider"
            >
              <CheckCircle2 size={12} />
              Package Complete
            </motion.div>
          )}
        </div>
        
        <div className="h-2 bg-[#191919] rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className={`h-full transition-colors duration-500 ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
          />
        </div>
      </div>

      {/* Action Buttons */}
      {!isArchived && (
        <div className="px-4 pb-4 flex flex-col gap-2">
          {isComplete ? (
            <div className="space-y-2">
              {!isRenewing ? (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsRenewing(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm bg-blue-500 text-white hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                  >
                    <RotateCcw size={18} />
                    Renew Package
                  </button>
                  <button 
                    onClick={onArchive}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm bg-[#373737] text-[#EBEBEB] hover:bg-[#444] transition-all active:scale-95"
                  >
                    <Archive size={18} />
                    Archive
                  </button>
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#1D1D1D] p-3 rounded-lg border border-[#373737] space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-widest text-[#AFAFAF] font-bold">Select New Package</span>
                    <button onClick={() => setIsRenewing(false)} className="text-[#AFAFAF] hover:text-[#EBEBEB]">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <select 
                      value={newPackageType}
                      onChange={e => setNewPackageType(e.target.value as any)}
                      className="flex-1 bg-[#191919] border border-[#373737] rounded-md px-2 py-1.5 text-xs focus:outline-none"
                    >
                      <option value={3}>3 Sessions</option>
                      <option value={5}>5 Sessions</option>
                      <option value={10}>10 Sessions</option>
                      <option value="Custom">Custom</option>
                    </select>
                    {newPackageType === 'Custom' && (
                      <input 
                        type="number" 
                        min={1}
                        value={newCustomCount}
                        onChange={e => setNewCustomCount(parseInt(e.target.value) || 1)}
                        className="w-16 bg-[#191919] border border-[#373737] rounded-md px-2 py-1.5 text-xs focus:outline-none"
                      />
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      onRenew?.(newPackageType, newPackageType === 'Custom' ? newCustomCount : undefined);
                      setIsRenewing(false);
                    }}
                    className="w-full py-2 bg-[#EBEBEB] text-[#191919] rounded-md text-xs font-bold hover:bg-white transition-colors"
                  >
                    Start New Package
                  </button>
                </motion.div>
              )}
            </div>
          ) : (
            <button 
              onClick={onAddSession}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm bg-[#EBEBEB] text-[#191919] hover:bg-white transition-all active:scale-95"
            >
              <Plus size={18} />
              Log Session
            </button>
          )}
        </div>
      )}

      {/* History Toggle */}
      <button 
        onClick={() => setShowHistory(!showHistory)}
        className="w-full px-4 py-2 border-t border-[#373737] flex items-center justify-between text-[10px] uppercase tracking-widest text-[#AFAFAF] hover:bg-[#2A2A2A] transition-colors"
      >
        <div className="flex items-center gap-2">
          <History size={12} />
          Session History
        </div>
        {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden bg-[#1D1D1D]"
          >
            <div className="p-4 space-y-3">
              {client.initialNotes && (
                <div className="mb-4">
                  <span className="text-[9px] uppercase tracking-widest text-[#666] block mb-1">Initial Notes</span>
                  <p className="text-xs text-[#AFAFAF] leading-relaxed italic">"{client.initialNotes}"</p>
                </div>
              )}
              
              <div>
                <span className="text-[9px] uppercase tracking-widest text-[#666] block mb-2">Logs</span>
                
                {/* Previous Packages */}
                {client.completedPackages?.map((pkg, pIdx) => (
                  <div key={pIdx} className="mb-4 last:mb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-[1px] flex-1 bg-[#333]"></div>
                      <span className="text-[8px] uppercase tracking-widest text-[#444] font-bold">Package {pIdx + 1}</span>
                      <div className="h-[1px] flex-1 bg-[#333]"></div>
                    </div>
                    <div className="space-y-2 opacity-50">
                      {pkg.slice().reverse().map((session, idx) => (
                        <div key={session.id} className="flex items-center justify-between text-[11px] text-[#AFAFAF]">
                          <span className="font-mono text-[#666]">#{pkg.length - idx}</span>
                          <span>{session.timestamp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Current Package */}
                {client.sessions.length === 0 && (!client.completedPackages || client.completedPackages.length === 0) ? (
                  <p className="text-[10px] text-[#555] italic">No sessions logged yet.</p>
                ) : (
                  <div className="space-y-2 mt-4">
                    {client.completedPackages && client.completedPackages.length > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-[1px] flex-1 bg-[#333]"></div>
                        <span className="text-[8px] uppercase tracking-widest text-blue-500/50 font-bold">Current Package</span>
                        <div className="h-[1px] flex-1 bg-[#333]"></div>
                      </div>
                    )}
                    {client.sessions.slice().reverse().map((session, idx) => (
                      <div key={session.id} className="flex items-center justify-between text-[11px] text-[#AFAFAF]">
                        <span className="font-mono text-[#666]">#{client.sessions.length - idx}</span>
                        <span>{session.timestamp}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Celebration Overlay */}
      <AnimatePresence>
        {celebrate && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center bg-green-500/10 backdrop-blur-[1px] z-50"
          >
            <motion.div
              initial={{ scale: 0.5, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#252525] border border-green-500/50 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3"
            >
              <div className="text-2xl">🎉</div>
              <div className="text-sm font-bold text-green-400 uppercase tracking-tighter">Package Complete!</div>
              <div className="text-2xl">✨</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
