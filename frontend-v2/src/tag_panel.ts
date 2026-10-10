import {confirmAction} from './confirm_dialog';
import type {SelectedFile} from './directory_view';
import {byId} from './dom';
import {HistoryView} from './history_view';
import {mergeTags, type MergedTag} from './tag_merge';
import type {TagRegistry} from './tag_registry';
import {
  isClefId,
  TAGGABLE_EXTENSIONS,
  type TagMap,
  type TagService,
} from './tags';

interface LoadedTags {
  paths: string[];
  rows: MergedTag[];
}

export class TagPanel {
  private readonly panel = byId('tag-panel', HTMLElement);
  private readonly fileName = byId('tag-file', HTMLHeadingElement);
  private readonly clefIdBadge = byId('tag-clef-id', HTMLElement);
  private readonly cover = byId('tag-cover', HTMLElement);
  private readonly coverImage = byId('tag-cover-image', HTMLImageElement);
  private readonly coverMissing = byId('tag-cover-missing', HTMLElement);
  private readonly status = byId('tag-status', HTMLParagraphElement);
  private readonly editor = byId('tag-editor', HTMLFieldSetElement);
  private readonly list = byId('tag-list', HTMLDListElement);
  private readonly addForm = byId('tag-add', HTMLFormElement);
  private readonly addName = byId('tag-add-name', HTMLInputElement);
  private readonly addValue = byId('tag-add-value', HTMLInputElement);
  private readonly tagNames = byId('tag-names', HTMLDataListElement);
  private pending?: AbortController;
  private current?: LoadedTags;
  private readonly history: HistoryView;

  constructor(
    private readonly service: TagService,
    private readonly registry: TagRegistry,
    private showRawNames: boolean,
    private readonly useClefId: boolean,
  ) {
    this.history = new HistoryView(service, registry, () => {
      if (this.current) {
        void this.load(this.current.paths);
      }
    });
    this.tagNames.append(...registry.names.map(name => new Option(name)));
    this.coverImage.addEventListener('error', () => {
      this.coverImage.hidden = true;
      this.coverMissing.hidden = false;
    });
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

  setShowRawNames(show: boolean): void {
    this.showRawNames = show;
    if (this.current) {
      this.render();
    }
  }

  show(files: SelectedFile[]): void {
    this.pending?.abort();
    this.pending = undefined;
    this.current = undefined;
    this.editor.hidden = true;
    this.addForm.reset();
    this.cover.hidden = true;
    this.clefIdBadge.hidden = true;
    this.history.show(null);
    this.coverImage.removeAttribute('src');

    if (files.length === 0) {
      this.panel.hidden = true;
      return;
    }
    this.panel.hidden = false;

    const taggable = files.filter(
      ({entity}) =>
        entity.type === 'music' && TAGGABLE_EXTENSIONS.has(entity.extension),
    );
    this.fileName.textContent = titleFor(files, taggable.length);
    if (taggable.length === 0) {
      this.setStatus(whyNotTaggable(files));
      return;
    }
    if (files.length === 1) {
      this.showCover(files[0].path);
    }
    void this.load(taggable.map(file => file.path));
  }

  private showCover(path: string): void {
    this.coverImage.hidden = false;
    this.coverMissing.hidden = true;
    this.coverImage.src = this.service.coverUrl(path);
    this.cover.hidden = false;
  }

  private async load(paths: string[], notice = ''): Promise<void> {
    const controller = new AbortController();
    this.pending = controller;

    try {
      const files: TagMap[] = [];
      for (const path of paths) {
        this.setStatus(progress('Loading', files.length, paths.length));
        files.push(await this.service.tags(path, controller.signal));
      }
      if (controller.signal.aborted) {
        return;
      }
      this.current = {
        paths,
        rows: mergeTags(files.map(withoutClefId), this.registry),
      };
      this.render();
      if (files.length === 1) {
        const clefId = this.showClefId(files[0]);
        this.history.show(this.useClefId && clefId ? clefId : paths[0]);
      }
      if (notice) {
        this.setStatus(notice);
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      this.setStatus(`Cannot read tags: ${messageOf(error)}`);
    }
  }

  private showClefId(tags: TagMap): string | undefined {
    const key = Object.keys(tags).find(isClefId);
    const clefId = key ? tags[key][0] : undefined;
    this.clefIdBadge.textContent = clefId ?? '';
    this.clefIdBadge.hidden = !clefId;
    return clefId;
  }

  private render(): void {
    const rows = this.current!.rows;

    this.list.replaceChildren();
    rows.forEach((row, index) => {
      const term = document.createElement('dt');
      const rawNames = rawKeysOf(row).join(' / ');
      term.textContent = this.showRawNames ? rawNames : row.name;
      term.title = this.showRawNames ? row.name : rawNames;
      this.list.append(term);
      if (row.common) {
        for (const value of row.common) {
          this.list.append(renderValue(index, row.name, value));
        }
      } else {
        this.list.append(renderVaried(index, row.name));
      }
    });

    this.editor.hidden = false;
    this.editor.disabled = false;
    this.setStatus(rows.length === 0 ? 'No tags.' : '');
  }

  private async handleValueChange(input: HTMLInputElement): Promise<void> {
    const row = this.rowOf(input);
    const oldValue = input.defaultValue;
    const newValue = input.value;

    if (!row.common) {
      if (newValue.trim() === '') {
        input.value = '';
      } else {
        await this.save((path, index) =>
          this.setValue(row, path, index, newValue),
        );
      }
      return;
    }
    if (newValue.trim() === '') {
      if (await confirmRemove(row.name, oldValue)) {
        await this.save((path, index) =>
          this.service.removeValue(path, row.perFile[index]!.key, oldValue),
        );
      } else {
        input.value = oldValue;
      }
      return;
    }
    await this.save((path, index) =>
      this.service.editValue(path, row.perFile[index]!.key, oldValue, newValue),
    );
  }

  private async handleRemoveClick(button: HTMLButtonElement): Promise<void> {
    const row = this.rowOf(button);
    if (!row.common) {
      const files = this.current!.paths.length;
      if (
        await confirmAction(`Remove ${row.name} from ${files} files?`, 'Remove')
      ) {
        await this.save((path, index) => this.removeAll(row, path, index));
      }
      return;
    }
    const value = button.closest('dd')!.querySelector('input')!.defaultValue;
    if (await confirmRemove(row.name, value)) {
      await this.save((path, index) =>
        this.service.removeValue(path, row.perFile[index]!.key, value),
      );
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

  private async setValue(
    row: MergedTag,
    path: string,
    index: number,
    value: string,
  ): Promise<void> {
    const tag = row.perFile[index];
    if (!tag) {
      await this.service.addValue(path, row.name, value);
      return;
    }
    for (const old of tag.values) {
      if (old !== value) {
        await this.service.removeValue(path, tag.key, old);
      }
    }
    if (!tag.values.includes(value)) {
      await this.service.addValue(path, tag.key, value);
    }
  }

  private async removeAll(
    row: MergedTag,
    path: string,
    index: number,
  ): Promise<void> {
    const tag = row.perFile[index];
    for (const value of tag?.values ?? []) {
      await this.service.removeValue(path, tag!.key, value);
    }
  }

  private async save(
    change: (path: string, index: number) => Promise<void>,
  ): Promise<boolean> {
    const current = this.current;
    if (!current) {
      return false;
    }
    this.editor.disabled = true;

    const total = current.paths.length;
    let failed = 0;
    let firstError = '';
    for (const [index, path] of current.paths.entries()) {
      if (this.current !== current) {
        return false;
      }
      this.setStatus(progress('Saving', index, total));
      try {
        await change(path, index);
      } catch (error) {
        failed++;
        firstError ||= messageOf(error);
      }
    }

    if (this.current === current) {
      const notice =
        failed === 0
          ? ''
          : total === 1
            ? `Cannot save: ${firstError}`
            : `Saved ${total - failed}/${total} files. ${firstError}`;
      void this.load(current.paths, notice);
    }
    return failed === 0;
  }

  private rowOf(element: Element): MergedTag {
    const index = Number(element.closest('dd')!.dataset.row);
    return this.current!.rows[index];
  }

  private setStatus(text: string): void {
    this.status.textContent = text;
    this.status.hidden = text === '';
  }
}

function renderValue(row: number, name: string, value: string): HTMLElement {
  const description = document.createElement('dd');
  description.dataset.row = String(row);

  const input = document.createElement('input');
  input.type = 'text';
  input.defaultValue = value;
  input.setAttribute('aria-label', name);

  description.append(input, removeButton(`Remove ${value} from ${name}`));
  return description;
}

function renderVaried(row: number, name: string): HTMLElement {
  const description = document.createElement('dd');
  description.dataset.row = String(row);
  description.className = 'varied';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Different values';
  input.setAttribute('aria-label', name);

  description.append(input, removeButton(`Remove ${name} from all files`));
  return description;
}

function removeButton(label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '×';
  button.title = 'Remove';
  button.setAttribute('aria-label', label);
  return button;
}

function withoutClefId(tags: TagMap): TagMap {
  return Object.fromEntries(
    Object.entries(tags).filter(([key]) => !isClefId(key)),
  );
}

function rawKeysOf(row: MergedTag): string[] {
  const keys = row.perFile.flatMap(tag => (tag ? [tag.key] : []));
  return [...new Set(keys)];
}

function titleFor(files: SelectedFile[], taggable: number): string {
  if (files.length === 1) {
    return files[0].entity.name;
  }
  if (taggable === files.length || taggable === 0) {
    return `${files.length} files`;
  }
  return `${taggable} of ${files.length} files`;
}

function whyNotTaggable(files: SelectedFile[]): string {
  if (files.length > 1) {
    return 'None of these files has tags that can be edited.';
  }
  const {type, extension} = files[0].entity;
  if (type !== 'music') {
    return 'Not a music file.';
  }
  return `Tags of ${extension} files are not supported.`;
}

function progress(action: string, done: number, total: number): string {
  return total === 1 ? `${action}…` : `${action} ${done + 1}/${total}…`;
}

function confirmRemove(name: string, value: string): Promise<boolean> {
  return confirmAction(`Remove "${value}" from ${name}?`, 'Remove');
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
