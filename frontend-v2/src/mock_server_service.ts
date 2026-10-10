import type {ServerService, ServerSettings} from './server';

export class MockServerService implements ServerService {
  heartbeat(): Promise<boolean> {
    return Promise.resolve(true);
  }

  settings(): Promise<ServerSettings> {
    return Promise.resolve({
      clef_id: false,
      mountpoint: '/music',
      version: 'mock',
    });
  }
}
