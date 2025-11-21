export type NodeStatus = 'DOWN' | 'UP' | 'DEGRADED' | 'UNKNOWN';

export interface PresenceInfo {
  status: NodeStatus;
  details?: Record<string, unknown>;
}

export interface SessionMeta {
  label?: string;
  createdBy?: string;
  tags?: string[];
}
