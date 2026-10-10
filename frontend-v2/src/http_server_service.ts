import {getJson} from './http';
import type {ServerService, ServerSettings} from './server';

export class HttpServerService implements ServerService {
  async heartbeat(): Promise<boolean> {
    try {
      const response = await fetch('/api/heartbeat', {
        signal: AbortSignal.timeout(5_000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  settings(): Promise<ServerSettings> {
    return getJson<ServerSettings>('/api/settings');
  }
}
