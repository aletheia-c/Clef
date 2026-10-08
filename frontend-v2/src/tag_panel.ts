import {confirmAction} from './confirm_dialog';
import type {SelectedFile} from './directory_view';
import {byId} from './dom';
import type {TagRegistry} from './tag_registry';
import {TAGGABLE_EXTENSIONS, type TagMap, type TagService} from './tags';

interface LoadedTags {
  path: string;
  tags: TagMap;
}

export class TagPanel {
  private readonly panel = byId('tag-panel', HTMLElement);
  private readonly fileName = byId('tag-file', HTMLHeadingElement);
  private readonly status = byId('tag-status', HTMLParagraphElement);
  private readonly editor = byId('tag-editor', HTMLFieldSetElement);
  private readonly list = byId('tag-list', HTMLDListElement);
  private readonly addForm = byId('tag-add', HTMLFormElement);
  private readonly addName = byId('tag-add-name', HTMLInputElement);
  private readonly addValue = byId('tag-add-value', HTMLInputElement);
  private readonly tagNames = byId('tag-names', HTMLDataListElement);
  private pending?: AbortController;
  private current?: LoadedTags;

  constructor(
    private readonly service: TagService,
    private readonly registry: TagRegistry,
  ) {
    this.tagNames.append(...registry.names.map(name => new Option(name)));
    this.list.addEventListener('change', event => {
      void this.handleValueChange(event.target as HTMLInputElement);
    });
    this.list.addEventListener('click', event => {
      const button = (event.target as Element).closest('button');
      if (button) {
        void this.handleRemoveClick(button);
      }
    });
    this.addForm.addEventListener('submit', event => {
      event.preventDefault();
      this.handleAdd();
    });
  }

  show(file: SelectedFile | null): void {
    this.pending?.abort();
    this.pending = undefined;
    this.current = undefined;
    this.editor.hidden = true;
    this.addForm.reset();

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
      this.current = {path, tags};
      this.render();
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      this.setStatus(`Cannot read tags: ${messageOf(error)}`);
    }
  }

  private render(): void {
    const tags = this.current!.tags;
    const keys = Object.keys(tags)
      .map(key => ({key, name: this.registry.nameOf(key)}))
      .sort((a, b) => a.name.localeCompare(b.name));

    this.list.replaceChildren();
    for (const {key, name} of keys) {
      const term = document.createElement('dt');
      term.textContent = name;
      term.title = key;
      this.list.append(term);
      for (const value of tags[key]) {
        this.list.append(renderValue(key, name, value));
      }
    }

    this.editor.hidden = false;
    this.editor.disabled = false;
    this.setStatus(keys.length === 0 ? 'No tags.' : '');
  }

  private async handleValueChange(input: HTMLInputElement): Promise<void> {
    const tag = input.closest('dd')!.dataset.tag!;
    const oldValue = input.defaultValue;
    const newValue = input.value;

    if (newValue.trim() === '') {
      if (await confirmRemove(this.registry.nameOf(tag), oldValue)) {
        await this.save(path => this.service.removeValue(path, tag, oldValue));
      } else {
        input.value = oldValue;
      }
      return;
    }
    await this.save(path =>
      this.service.editValue(path, tag, oldValue, newValue),
    );
  }

  private async handleRemoveClick(button: HTMLButtonElement): Promise<void> {
    const value = button.closest('dd')!;
    const tag = value.dataset.tag!;
    const text = value.querySelector('input')!.defaultValue;
    if (await confirmRemove(this.registry.nameOf(tag), text)) {
      await this.save(path => this.service.removeValue(path, tag, text));
    }
  }

  private handleAdd(): void {
    const tag = this.addName.value.trim();
    const value = this.addValue.value;
    if (tag === '' || value.trim() === '') {
      return;
    }
    void this.save(path => this.service.addValue(path, tag, value)).then(
      saved => {
        if (saved) {
          this.addForm.reset();
        }
      },
    );
  }

  private async save(
    change: (path: string) => Promise<void>,
  ): Promise<boolean> {
    const current = this.current;
    if (!current) {
      return false;
    }
    this.editor.disabled = true;
    this.setStatus('Saving…');

    try {
      await change(current.path);
    } catch (error) {
      if (this.current === current) {
        this.render();
        this.setStatus(`Cannot save: ${messageOf(error)}`);
      }
      return false;
    }

    if (this.current === current) {
      void this.load(current.path);
    }
    return true;
  }

  private setStatus(text: string): void {
    this.status.textContent = text;
    this.status.hidden = text === '';
  }
}

function renderValue(tag: string, name: string, value: string): HTMLElement {
  const description = document.createElement('dd');
  description.dataset.tag = tag;

  const input = document.createElement('input');
  input.type = 'text';
  input.defaultValue = value;
  input.setAttribute('aria-label', name);

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = '×';
  remove.title = 'Remove';
  remove.setAttribute('aria-label', `Remove ${value} from ${name}`);

  description.append(input, remove);
  return description;
}

function confirmRemove(name: string, value: string): Promise<boolean> {
  return confirmAction(`Remove "${value}" from ${name}?`, 'Remove');
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
