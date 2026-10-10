export interface ServerSettings {
  clef_id: boolean;
  mountpoint: string;
  version: string;
}

export interface ServerService {
  heartbeat(): Promise<boolean>;
  settings(): Promise<ServerSettings>;
}
