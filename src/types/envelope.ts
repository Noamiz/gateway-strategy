export type UUID = string;
export type UnixMs = number;

export interface Envelope<TPayload = unknown, TType extends string = string> {
  type: TType;
  ts: UnixMs;
  traceId?: UUID;
  version?: string;
  groupId?: string;
  sessionId?: string;
  payload?: TPayload;
}
