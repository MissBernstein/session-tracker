import React, { useState, useEffect, useMemo } from 'react';
import { UserPlus, LogOut, Archive, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { supabase } from '../supabaseClient';
import { toRow, fromRow } from '../types';
import type { Client, Category, PackageType } from '../types';
import ClientCard from '../components/ClientCard';
import AddClientForm from '../components/AddClientForm';

export default function AdminDashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filter, setFilter] = useState<'All' | Category>('All');
  const [showArchived, setShowArchived] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<Record<string, string>>({} as Record<string, string>);

  useEffect(() => {
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
  }, []);

  const addClient = async (
    newClient: Omit<Client, 'id' | 'sessions' | 'completedPackages' | 'isArchived' | 'createdAt'>
  ) => {
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
    setClients((prev) => [client, ...prev]);
    setIsFormOpen(false);
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const { error } = await supabase.from('clients').update(toRow(updates)).eq('id', id);
    if (error) { console.error('Failed to update client:', error); return; }
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const deleteClient = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this client?')) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) { console.error('Failed to delete client:', error); return; }
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  const addSession = async (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    const timestamp = new Date().toLocaleString();
    const newSessions = [...client.sessions, { id: crypto.randomUUID(), timestamp }];
    const { error } = await supabase.from('clients').update({ sessions: newSessions }).eq('id', clientId);
    if (error) { console.error('Failed to add session:', error); return; }
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, sessions: newSessions } : c)));
  };

  const undoSession = async (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client || client.sessions.length === 0) return;
    const newSessions = client.sessions.slice(0, -1);
    const { error } = await supabase.from('clients').update({ sessions: newSessions }).eq('id', clientId);
    if (error) { console.error('Failed to undo session:', error); return; }
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, sessions: newSessions } : c)));
  };

  const renewPackage = async (clientId: string, packageType: PackageType, customCount?: number) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    const newCompletedPackages = [...(client.completedPackages || []), client.sessions];
    const { error } = await supabase.from('clients').update({
      completed_packages: newCompletedPackages,
      sessions: [],
      package_type: String(packageType),
      custom_package_count: customCount ?? null,
    }).eq('id', clientId);
    if (error) { console.error('Failed to renew package:', error); return; }
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? { ...c, completedPackages: newCompletedPackages, sessions: [], packageType, customPackageCount: customCount }
          : c
      )
    );
  };

  const inviteClient = async (client: Client) => {
    if (!client.email) return;
    setInviteStatus((prev) => ({ ...prev, [client.id]: 'sending' }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-client`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ email: client.email, name: client.name }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Invite failed');
      }
      setInviteStatus((prev) => ({ ...prev, [client.id]: 'sent' }));
      setTimeout(() => setInviteStatus((prev) => { const n = { ...prev }; delete n[client.id]; return n; }), 4000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to send invite';
      setInviteStatus((prev) => ({ ...prev, [client.id]: `error: ${msg}` }));
      setTimeout(() => setInviteStatus((prev) => { const n = { ...prev }; delete n[client.id]; return n; }), 5000);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const filteredClients = useMemo(
    () => clients.filter((c) => (filter === 'All' || c.category === filter) && !c.isArchived),
    [clients, filter]
  );

  const archivedClients = useMemo(() => clients.filter((c) => c.isArchived), [clients]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen p-4 font-sans flex items-center justify-center">
        <p className="text-[#AFAFAF] text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen p-4 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Session Tracker</h1>
          <p className="text-[11px] text-[#AFAFAF] mt-1">Admin</p>
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

      {/* Invite status toasts */}
      <AnimatePresence>
        {Object.entries(inviteStatus).map(([id, status]: [string, string]) => {
          const client = clients.find((c) => c.id === id);
          if (!client) return null;
          const isError = status.startsWith('error:');
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mb-4 px-3 py-2 rounded-lg text-xs border ${
                isError
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  : status === 'sent'
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}
            >
              {status === 'sending' && `Sending invite to ${client.email}…`}
              {status === 'sent' && `✓ Invite sent to ${client.email}`}
              {isError && status.replace('error: ', '')}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Active Clients List */}
      <div className="space-y-4 mb-12">
        {filteredClients.length === 0 ? (
          <div className="text-center py-12 text-[#AFAFAF] text-sm italic">No active clients found.</div>
        ) : (
          filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onAddSession={() => addSession(client.id)}
              onUndoSession={() => undoSession(client.id)}
              onArchive={() => updateClient(client.id, { isArchived: true })}
              onDelete={() => deleteClient(client.id)}
              onRenew={(type, count) => renewPackage(client.id, type, count)}
              onInvite={() => inviteClient(client)}
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
                {archivedClients.map((client) => (
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
