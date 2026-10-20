import type { AppRecord } from '../types';

export type MutationOperation = 'upsert' | 'tombstone';

export interface SyncMutation {
  mutationId: string;
  recordId: string;
  operation: MutationOperation;
  baseVersion: number;
  clientUpdatedAt: number;
  record?: AppRecord;
}

export interface SyncAcknowledgement {
  mutationId: string;
  recordId: string;
  status: 'applied' | 'conflict' | 'rejected';
  serverVersion?: number;
  serverUpdatedAt?: number;
  reason?: string;
}

export interface SyncSnapshot {
  cursor: number;
  records: AppRecord[];
  tombstones: Array<{ recordId: string; version: number; deletedAt: number }>;
}

export interface SyncAdapter {
  pull(cursor: number | null): Promise<SyncSnapshot>;
  push(mutations: SyncMutation[]): Promise<SyncAcknowledgement[]>;
}

export function mapAcknowledgement(result: SyncAcknowledgement): 'synced' | 'conflict' | 'rejected' {
  if (result.status === 'applied') return 'synced';
  if (result.status === 'conflict') return 'conflict';
  return 'rejected';
}

/**
 * Conflict policy is intentionally not guessed here. The server adapter must
 * define version checks, idempotency, delete/update precedence, and recovery.
 */
export function assertAcknowledgementMatches(mutation: SyncMutation, result: SyncAcknowledgement): void {
  if (mutation.mutationId !== result.mutationId || mutation.recordId !== result.recordId) {
    throw new Error('Sync acknowledgement does not match its mutation.');
  }
}
