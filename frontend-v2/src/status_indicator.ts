import {byId} from './dom';
import type {ServerService} from './server';

const CONNECTED_INTERVAL_MS = 30_000;
const RETRY_INTERVAL_MS = 3_000;

type Status = 'connecting' | 'connected' | 'disconnected';

const LABELS: Record<Status, string> = {
  connecting: 'Connecting…',
  connected: 'Connected',
  disconnected: 'Disconnected',
};

export class StatusIndicator {
  private readonly element = byId('server-status', HTMLElement);

  constructor(private readonly service: ServerService) {}

  start(): void {
    this.show('connecting');
    void this.check();
  }

  private async check(): Promise<void> {
    const alive = await this.service.heartbeat();
    this.show(alive ? 'connected' : 'disconnected');
    setTimeout(
      () => void this.check(),
      alive ? CONNECTED_INTERVAL_MS : RETRY_INTERVAL_MS,
    );
  }

  private show(status: Status): void {
    this.element.dataset.status = status;
    this.element.title = LABELS[status];
    this.element.setAttribute('aria-label', LABELS[status]);
  }
}
