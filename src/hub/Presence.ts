import type { PresenceInfo } from '../types/domain';

const UNKNOWN: PresenceInfo = { status: 'UNKNOWN' };

export class PresenceRegistry {
  private map = new Map<string, PresenceInfo>();

  get(groupId: string): PresenceInfo {
    return this.map.get(groupId) ?? { ...UNKNOWN };
  }

  set(groupId: string, info: Partial<PresenceInfo>): PresenceInfo {
    const merged = { ...this.get(groupId), ...info };
    this.map.set(groupId, merged);
    return merged;
  }

  delete(groupId: string): void {
    this.map.delete(groupId);
  }

  entries(): Array<[string, PresenceInfo]> {
    return Array.from(this.map.entries());
  }
}
