import { describe, expect, it } from 'vitest';
import { assertAcknowledgementMatches, mapAcknowledgement } from './syncContract';
import type { SyncAcknowledgement, SyncMutation } from './syncContract';

const mutation: SyncMutation = {
  mutationId: 'mutation-1', recordId: 'record-1', operation: 'upsert',
  baseVersion: 2, clientUpdatedAt: 123,
};

describe('sync contract', () => {
  it('maps explicit server acknowledgements to durable states', () => {
    const applied: SyncAcknowledgement = { mutationId: 'mutation-1', recordId: 'record-1', status: 'applied' };
    const conflict: SyncAcknowledgement = { mutationId: 'mutation-1', recordId: 'record-1', status: 'conflict' };
    const rejected: SyncAcknowledgement = { mutationId: 'mutation-1', recordId: 'record-1', status: 'rejected' };
    expect(mapAcknowledgement(applied)).toBe('synced');
    expect(mapAcknowledgement(conflict)).toBe('conflict');
    expect(mapAcknowledgement(rejected)).toBe('rejected');
  });

  it('rejects an acknowledgement for another mutation or record', () => {
    expect(() => assertAcknowledgementMatches(mutation, {
      mutationId: 'other-mutation', recordId: 'record-1', status: 'applied',
    })).toThrow(/does not match/i);
  });
});
