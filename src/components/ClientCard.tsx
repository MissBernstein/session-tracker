import React, { useState, useEffect } from 'react';
import {
  Plus,
  History,
  Undo2,
  Archive,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  X,
  Mic,
  Heart,
  Trash2,
  RotateCcw,
  Send,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Client, PackageType } from '../types';

interface ClientCardProps {
  client: Client;
  readOnly?: boolean;
  onAddSession?: () => void;
  onUndoSession?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onDelete?: () => void;
  onRenew?: (type: PackageType, count?: number) => void;
  onInvite?: () => void;
  isArchived?: boolean;
}

const ClientCard: React.FC<ClientCardProps> = ({
  client,
  readOnly = false,
  onAddSession,
  onUndoSession,
  onArchive,
  onUnarchive,
  onDelete,
  onRenew,
  onInvite,
  isArchived = false,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [newPackageType, setNewPackageType] = useState<PackageType>(client.packageType);
  const [newCustomCount, setNewCustomCount] = useState(client.customPackageCount || 1);

  const totalSessions =
    client.packageType === 'Custom'
      ? client.customPackageCount || 1
      : (client.packageType as number);
  const currentCount = client.sessions.length;
  const progress = Math.min((currentCount / totalSessions) * 100, 100);
  const isComplete = currentCount >= totalSessions;

  useEffect(() => {
    if (isComplete && currentCount === totalSessions && !isArchived && !readOnly) {
      setCelebrate(true);
      const timer = setTimeout(() => setCelebrate(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentCount, totalSessions, isArchived, readOnly]);

  return (
    <div
      className={`bg-[#252525] rounded-xl border border-[#373737] overflow-hidden transition-all relative ${
        isArchived ? 'opacity-60' : ''
      }`}
    >
      {/* Card Header */}
      <div className="p-4 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {client.category === 'Vocal Coaching' ? (
              <Mic size={14} className="text-blue-400" />
            ) : (
              <Heart size={14} className="text-rose-400" />
            )}
            <span className="text-[10px] uppercase tracking-widest text-[#AFAFAF] font-bold">
              {client.category}
            </span>
          </div>
          <h3 className="text-base font-semibold text-[#EBEBEB] leading-tight">{client.name}</h3>
          {client.email && !readOnly && (
            <p className="text-[10px] text-[#555] mt-0.5">{client.email}</p>
          )}
        </div>

        {/* Admin actions */}
        {!readOnly && !isArchived && (
          <div className="flex gap-1">
            {client.email && onInvite && (
              <button
                onClick={onInvite}
                className="p-1.5 rounded-md hover:bg-[#373737] text-[#AFAFAF] transition-colors"
                title="Invite client to portal"
              >
                <Send size={15} />
              </button>
            )}
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

        {/* Archived admin actions */}
        {!readOnly && isArchived && (
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
            <span className={`text-lg font-bold ${isComplete ? 'text-green-400' : 'text-[#EBEBEB]'}`}>
              {currentCount}
            </span>
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

      {/* Admin action buttons */}
      {!readOnly && !isArchived && (
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
                    <span className="text-[10px] uppercase tracking-widest text-[#AFAFAF] font-bold">
                      Select New Package
                    </span>
                    <button onClick={() => setIsRenewing(false)} className="text-[#AFAFAF] hover:text-[#EBEBEB]">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={newPackageType}
                      onChange={(e) => setNewPackageType(e.target.value as unknown as PackageType)}
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
                        onChange={(e) => setNewCustomCount(parseInt(e.target.value) || 1)}
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

      {/* Session History */}
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
                      <span className="text-[8px] uppercase tracking-widest text-[#444] font-bold">
                        Package {pIdx + 1}
                      </span>
                      <div className="h-[1px] flex-1 bg-[#333]"></div>
                    </div>
                    <div className="space-y-2 opacity-50">
                      {pkg
                        .slice()
                        .reverse()
                        .map((session, idx) => (
                          <div
                            key={session.id}
                            className="flex items-center justify-between text-[11px] text-[#AFAFAF]"
                          >
                            <span className="font-mono text-[#666]">#{pkg.length - idx}</span>
                            <span>{session.timestamp}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}

                {/* Current Package */}
                {client.sessions.length === 0 &&
                (!client.completedPackages || client.completedPackages.length === 0) ? (
                  <p className="text-[10px] text-[#555] italic">No sessions logged yet.</p>
                ) : (
                  <div className="space-y-2 mt-4">
                    {client.completedPackages && client.completedPackages.length > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-[1px] flex-1 bg-[#333]"></div>
                        <span className="text-[8px] uppercase tracking-widest text-blue-500/50 font-bold">
                          Current Package
                        </span>
                        <div className="h-[1px] flex-1 bg-[#333]"></div>
                      </div>
                    )}
                    {client.sessions
                      .slice()
                      .reverse()
                      .map((session, idx) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between text-[11px] text-[#AFAFAF]"
                        >
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
};

export default ClientCard;
