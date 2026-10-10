export interface ServerService {
  heartbeat(): Promise<boolean>;
}
