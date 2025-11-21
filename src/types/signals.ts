import type { Envelope } from './envelope';
import type { PresenceInfo, SessionMeta } from './domain';

export type ClientRole = 'app-client' | 'service-node' | 'dashboard';

export type Identify = Envelope<
  {
    clientType: ClientRole;
    groupId?: string;
    metadata?: {
      platform?: string;
      appVersion?: string;
    };
  },
  'identify'
>;

export type Ready =
  Envelope<
    {
      connectionId: string;
      heartbeat: { intervalMs: number; timeoutMs: number };
      presence?: PresenceInfo;
    },
    'ready'
  > & { groupId?: string };

export type Heartbeat = Envelope<undefined, 'heartbeat'> & {
  groupId?: string;
  sessionId?: string;
};

export type PresenceUpdate = Envelope<
  {
    groupId: string;
    info: PresenceInfo;
  },
  'presence_update'
>;

export type DataUpdate =
  Envelope<
    {
      data: unknown;
      meta?: SessionMeta;
    },
    'data_update'
  > & { groupId?: string; sessionId?: string };

export type ErrorMsg =
  Envelope<
    {
      code: string;
      message: string;
      status?: string;
    },
    'error'
  > & { groupId?: string; sessionId?: string };

export type IncomingFromClient = Identify | Heartbeat | DataUpdate;

export type OutgoingToClient = Ready | PresenceUpdate | DataUpdate | ErrorMsg;
