import type {SelectedFile} from './directory_view';
import {byId} from './dom';
import {TAGGABLE_EXTENSIONS, type TagMap, type TagService} from './tags';

export class TagPanel {
  private readonly panel = byId('tag-panel', HTMLElement);
  private readonly fileName = byId('tag-file', HTMLHeadingElement);
  private readonly status = byId('tag-status', HTMLParagraphElement);
  private readonly list = byId('tag-list', HTMLDListElement);
  private pending?: AbortController;

  constructor(private readonly service: TagService) {}

  show(file: SelectedFile | null): void {
    this.pending?.abort();
    this.pending = undefined;
    this.list.replaceChildren();

    if (!file) {
      this.panel.hidden = true;
      return;
    }
    this.panel.hidden = false;
    this.fileName.textContent = file.entity.name;

    const {type, extension} = file.entity;
    if (type !== 'music') {
      this.setStatus('Not a music file.');
    } else if (!TAGGABLE_EXTENSIONS.has(extension)) {
      this.setStatus(`Tags of ${extension} files are not supported.`);
    } else {
      void this.load(file.path);
    }
  }

  private async load(path: string): Promise<void> {
    const controller = new AbortController();
    this.pending = controller;
    this.setStatus('Loading…');

    try {
      const tags = await this.service.tags(path, controller.signal);
      if (controller.signal.aborted) {
        return;
      }
      this.render(tags);
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.setStatus(`Cannot read tags: ${message}`);
    }
  }

  private render(tags: TagMap): void {
    const keys = Object.keys(tags).sort();
    if (keys.length === 0) {
      this.setStatus('No tags.');
      return;
    }
    this.setStatus('');

    for (const key of keys) {
      const term = document.createElement('dt');
      term.textContent = key;
      this.list.append(term);
      for (const value of tags[key]) {
        const description = document.createElement('dd');
        description.textContent = value;
        this.list.append(description);
      }
    }
  }

  private setStatus(text: string): void {
    this.status.textContent = text;
    this.status.hidden = text === '';
  }
}
