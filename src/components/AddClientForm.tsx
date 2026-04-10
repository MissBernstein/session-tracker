import React, { useState } from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import type { Category, PackageType } from '../types';

interface Props {
  onSubmit: (client: {
    name: string;
    email?: string;
    category: Category;
    packageType: PackageType;
    customPackageCount?: number;
    initialNotes: string;
  }) => void;
  onCancel: () => void;
}

export default function AddClientForm({ onSubmit, onCancel }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<Category>('Vocal Coaching');
  const [packageType, setPackageType] = useState<PackageType>(3);
  const [customCount, setCustomCount] = useState(1);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      email: email.trim() || undefined,
      category,
      packageType,
      customPackageCount: packageType === 'Custom' ? customCount : undefined,
      initialNotes: notes,
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
            onChange={(e) => setName(e.target.value)}
            placeholder="Client Name"
            className="w-full bg-[#191919] border border-[#373737] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-[#AFAFAF] mb-1">
            Email <span className="text-[#555] normal-case">(optional — for portal access)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@example.com"
            className="w-full bg-[#191919] border border-[#373737] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#AFAFAF] mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
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
              onChange={(e) => setPackageType(e.target.value as unknown as PackageType)}
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
              onChange={(e) => setCustomCount(parseInt(e.target.value) || 1)}
              className="w-full bg-[#191919] border border-[#373737] rounded-md px-3 py-2 text-sm focus:outline-none"
            />
          </motion.div>
        )}

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-[#AFAFAF] mb-1">Initial Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
