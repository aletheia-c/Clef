import {confirmAction} from './confirm_dialog';
import {byId} from './dom';
import type {TagRegistry} from './tag_registry';
import type {HistoryEntry, TagService} from './tags';

const ACTIONS: Record<HistoryEntry['action'], string> = {
  add: 'Added',
  change: 'Changed',
  remove: 'Removed',
};

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'short',
  timeStyle: 'short',
});

export class HistoryView {
  private readonly details = byId('tag-history', HTMLDetailsElement);
  private readonly status = byId('history-status', HTMLParagraphElement);
  private readonly list = byId('history-list', HTMLOListElement);
  private identifier: string | null = null;
  private entries: HistoryEntry[] = [];
  private pending?: AbortController;

  constructor(
    private readonly service: TagService,
    private readonly registry: TagRegistry,
    private readonly onUndone: () => void,
  ) {
    this.details.addEventListener('toggle', () => {
      if (this.details.open) {
        void this.load();
      }
    });
    this.list.addEventListener('click', event => {
      const button = (event.target as Element).closest('button');
      if (button) {
        void this.undo(this.entries[Number(button.dataset.entry)]);
      }
    });
  }

  show(identifier: string | null): void {
    if (identifier !== this.identifier) {
      this.pending?.abort();
      this.identifier = identifier;
      this.entries = [];
      this.list.replaceChildren();
    }
    this.details.hidden = identifier === null;
    if (identifier !== null && this.details.open) {
      void this.load();
    }
  }

  private async load(): Promise<void> {
    const identifier = this.identifier;
    if (identifier === null) {
      return;
    }
    this.pending?.abort();
    const controller = new AbortController();
    this.pending = controller;
    this.setStatus('Loading…');

    try {
      const entries = await this.service.history(identifier, controller.signal);
      if (controller.signal.aborted) {
        return;
      }
      this.entries = entries;
      this.list.replaceChildren(
        ...entries.map((entry, index) => this.renderEntry(entry, index)),
      );
      this.setStatus(entries.length === 0 ? 'No changes yet.' : '');
    } catch (error) {
      if (!controller.signal.aborted) {
        this.setStatus(`Cannot read history: ${messageOf(error)}`);
      }
    }
  }

  private async undo(entry: HistoryEntry): Promise<void> {
    const name = this.registry.nameOf(entry.tag);
    const confirmed = await confirmAction(
      `Undo this change to ${name}? Later changes to ${name} are undone too.`,
      'Undo',
    );
    if (!confirmed) {
      return;
    }
    try {
      await this.service.undo(entry);
    } catch (error) {
      this.setStatus(`Cannot undo: ${messageOf(error)}`);
      return;
    }
    this.onUndone();
    void this.load();
  }

  private renderEntry(entry: HistoryEntry, index: number): HTMLLIElement {
    const item = document.createElement('li');

    const head = document.createElement('div');
    head.className = 'history-head';
    const action = document.createElement('strong');
    action.textContent = `${ACTIONS[entry.action]} ${this.registry.nameOf(entry.tag)}`;
    const time = document.createElement('time');
    const date = new Date(`${entry.changed_at.replace(' ', 'T')}Z`);
    time.dateTime = date.toISOString();
    time.textContent = DATE_FORMAT.format(date);
    const undo = document.createElement('button');
    undo.type = 'button';
    undo.textContent = 'Undo';
    undo.dataset.entry = String(index);
    head.append(action, time, undo);

    const values = document.createElement('div');
    values.className = 'history-values';
    if (entry.action === 'change') {
      values.textContent = `${entry.old_value} → ${entry.new_value}`;
    } else if (entry.action === 'add') {
      values.textContent = `+ ${entry.new_value}`;
    } else {
      values.textContent = `− ${entry.old_value}`;
    }

    item.append(head, values);
    return item;
  }

  private setStatus(text: string): void {
    this.status.textContent = text;
    this.status.hidden = text === '';
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
