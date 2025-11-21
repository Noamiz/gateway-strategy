import type { SessionMeta } from '../types/domain';

export interface SessionRecord {
  groupId: string;
  sessionId: string;
  meta: SessionMeta;
  createdAt: number;
  updatedAt: number;
}

export class SessionStore {
  private byGroup = new Map<string, Map<string, SessionRecord>>();

  upsert(groupId: string, sessionId: string, meta: SessionMeta): SessionRecord {
    const now = Date.now();
    let groupMap = this.byGroup.get(groupId);
    if (!groupMap) {
      groupMap = new Map();
      this.byGroup.set(groupId, groupMap);
    }
    const existing = groupMap.get(sessionId);
    const record: SessionRecord = existing
      ? { ...existing, meta, updatedAt: now }
      : { groupId, sessionId, meta, createdAt: now, updatedAt: now };
    groupMap.set(sessionId, record);
    return record;
  }

  get(groupId: string, sessionId: string): SessionRecord | undefined {
    return this.byGroup.get(groupId)?.get(sessionId);
  }
}
