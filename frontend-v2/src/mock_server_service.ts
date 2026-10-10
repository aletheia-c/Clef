import type {ServerService} from './server';

export class MockServerService implements ServerService {
  heartbeat(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
