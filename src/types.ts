export type Category = 'Vocal Coaching' | 'Life Coaching';
export type PackageType = 3 | 5 | 10 | 'Custom';
export type Role = 'admin' | 'client';

export interface Session {
  id: string;
  timestamp: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  category: Category;
  packageType: PackageType;
  customPackageCount?: number;
  initialNotes: string;
  sessions: Session[];
  completedPackages: Session[][];
  isArchived: boolean;
  createdAt: string;
}

export function toRow(c: Partial<Client> & { id?: string; createdAt?: string }) {
  const row: Record<string, unknown> = {};
  if (c.id !== undefined) row.id = c.id;
  if (c.name !== undefined) row.name = c.name;
  if (c.email !== undefined) row.email = c.email;
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

export function fromRow(row: Record<string, unknown>): Client {
  const pt = row.package_type as string;
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string | undefined,
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
