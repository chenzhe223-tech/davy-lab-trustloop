export type SyncState = 'local' | 'pending' | 'synced' | 'conflict';

export interface AppRecord {
  id: string;
  title: string;
  content: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  syncState: SyncState;
}
