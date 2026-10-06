import {DirectoryModel} from './directory_model';
import {byId} from './dom';
import type {Entity, EntityType, ListingService, SortKey} from './listing';

const APP_NAME = 'Clef';
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const PRELOAD_MARGIN_PX = 200;

const TYPE_NAMES: Record<EntityType, string> = {
  directory: 'Folder',
  music: 'Audio',
  picture: 'Image',
  file: 'File',
};

const SIZE_FORMATS = [
  'byte',
  'kilobyte',
  'megabyte',
  'gigabyte',
  'terabyte',
].map(
  unit =>
    new Intl.NumberFormat(undefined, {
      style: 'unit',
      unit,
      unitDisplay: 'short',
      maximumFractionDigits: unit === 'byte' ? 0 : 1,
    }),
);

export interface SelectedFile {
  path: string;
  entity: Entity;
}

export class DirectoryView {
  private readonly upButton = byId('up', HTMLButtonElement);
  private readonly refreshButton = byId('refresh', HTMLButtonElement);
  private readonly pathForm = byId('path-form', HTMLFormElement);
  private readonly pathInput = byId('path', HTMLInputElement);
  private readonly errorBanner = byId('error', HTMLParagraphElement);
  private readonly listing = byId('listing', HTMLElement);
  private readonly rows = byId('rows', HTMLTableSectionElement);
  private readonly sentinel = byId('sentinel', HTMLDivElement);
  private readonly loadingLabel = byId('loading', HTMLSpanElement);
  private readonly countLabel = byId('count', HTMLSpanElement);
  private readonly sortHeaders =
    document.querySelectorAll<HTMLTableCellElement>('th[data-sort]');

  private readonly model: DirectoryModel;
  private replaceHistory = true;
  private selectedRow?: HTMLTableRowElement;

  constructor(
    service: ListingService,
    private readonly rootPath: string,
    private readonly onSelect: (file: SelectedFile | null) => void,
  ) {
    this.model = new DirectoryModel(service, {
      reset: () => this.handleReset(),
      rowsAppended: first => this.handleRowsAppended(first),
      loadingChanged: loading => this.handleLoadingChanged(loading),
      loadFailed: (path, error) => this.handleLoadFailed(path, error),
    });

    this.upButton.addEventListener('click', () => {
      this.model.load(parentOf(this.model.path));
    });
    this.refreshButton.addEventListener('click', () => this.model.reload());
    this.pathForm.addEventListener('submit', event => {
      event.preventDefault();
      const path = this.pathInput.value.trim();
      if (path) {
        this.model.load(path);
      }
    });

    for (const header of this.sortHeaders) {
      const key = header.dataset.sort as SortKey;
      header.querySelector('button')?.addEventListener('click', () => {
        this.sortBy(key);
      });
    }

    this.rows.addEventListener('click', event => this.handleRowClick(event));
    window.addEventListener('popstate', () => {
      this.replaceHistory = true;
      this.model.load(pathFromUrl(location.href) ?? this.rootPath);
    });

    const observer = new IntersectionObserver(() => this.fetchMoreIfNeeded(), {
      root: this.listing,
      rootMargin: `${PRELOAD_MARGIN_PX}px`,
    });
    observer.observe(this.sentinel);
  }

  start(): void {
    this.updateSortHeaders();
    this.model.load(pathFromUrl(location.href) ?? this.rootPath);
  }

  private handleReset(): void {
    const path = this.model.path;
    if (pathFromUrl(location.href) !== path) {
      if (this.replaceHistory) {
        history.replaceState(null, '', urlFor(path));
      } else {
        history.pushState(null, '', urlFor(path));
      }
    }
    this.replaceHistory = false;

    document.title = `${path} - ${APP_NAME}`;
    this.pathInput.value = path;
    this.upButton.disabled = path === this.rootPath;
    this.errorBanner.hidden = true;

    if (this.selectedRow) {
      this.selectedRow = undefined;
      this.onSelect(null);
    }
    this.rows.replaceChildren(
      ...this.model.entities.map(e => this.renderRow(e)),
    );
    this.listing.scrollTop = 0;
    this.updateCount();
    this.fetchMoreIfNeeded();
  }

  private handleRowsAppended(first: number): void {
    const appended = this.model.entities.slice(first);
    this.rows.append(...appended.map(e => this.renderRow(e)));
    this.updateCount();
    this.fetchMoreIfNeeded();
  }

  private handleLoadingChanged(loading: boolean): void {
    this.loadingLabel.hidden = !loading;
    this.listing.setAttribute('aria-busy', String(loading));
  }

  private handleLoadFailed(path: string, error: Error): void {
    this.replaceHistory = false;
    this.pathInput.value = this.model.path;
    this.errorBanner.textContent = `Cannot list ${path}: ${error.message}`;
    this.errorBanner.hidden = false;
  }

  private handleRowClick(event: MouseEvent): void {
    const target = event.target as Element;
    const fileButton = target.closest('button');
    if (fileButton) {
      this.select(fileButton.closest('tr')!);
      return;
    }

    const link = target.closest('a');
    if (
      !link ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }
    const path = pathFromUrl(link.href);
    if (path) {
      event.preventDefault();
      this.model.load(path);
    }
  }

  private select(row: HTMLTableRowElement): void {
    this.selectedRow?.classList.remove('selected');
    row.classList.add('selected');
    this.selectedRow = row;

    const entity = this.model.entities[row.sectionRowIndex];
    this.onSelect({path: `${this.model.path}/${entity.name}`, entity});
  }

  private sortBy(key: SortKey): void {
    const ascending = key !== this.model.sortKey || !this.model.ascending;
    this.model.setSort(key, ascending);
    this.updateSortHeaders();
  }

  private updateSortHeaders(): void {
    for (const header of this.sortHeaders) {
      if (header.dataset.sort === this.model.sortKey) {
        const order = this.model.ascending ? 'ascending' : 'descending';
        header.setAttribute('aria-sort', order);
      } else {
        header.removeAttribute('aria-sort');
      }
    }
  }

  private fetchMoreIfNeeded(): void {
    const sentinelTop = this.sentinel.getBoundingClientRect().top;
    const listingBottom = this.listing.getBoundingClientRect().bottom;
    if (sentinelTop <= listingBottom + PRELOAD_MARGIN_PX) {
      this.model.fetchMore();
    }
  }

  private updateCount(): void {
    const loaded = this.model.entities.length;
    const total = this.model.total;
    if (loaded < total) {
      this.countLabel.textContent = `${loaded.toLocaleString()} of ${total.toLocaleString()} items`;
    } else if (total === 1) {
      this.countLabel.textContent = '1 item';
    } else {
      this.countLabel.textContent = `${total.toLocaleString()} items`;
    }
  }

  private renderRow(entity: Entity): HTMLTableRowElement {
    const row = document.createElement('tr');
    const isDirectory = entity.type === 'directory';

    const nameCell = row.insertCell();
    nameCell.append(icon(isDirectory ? 'folder' : 'file'));
    if (isDirectory) {
      const link = document.createElement('a');
      link.href = urlFor(`${this.model.path}/${entity.name}`);
      link.textContent = entity.name;
      nameCell.append(link);
    } else {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = entity.name;
      nameCell.append(button);
    }

    row.insertCell().textContent = TYPE_NAMES[entity.type];
    row.insertCell().textContent = entity.extension;
    row.insertCell().textContent = isDirectory ? '' : formatSize(entity.size);
    return row;
  }
}

function icon(name: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  const use = document.createElementNS(SVG_NAMESPACE, 'use');
  use.setAttribute('href', `#icon-${name}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.append(use);
  return svg;
}

function formatSize(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < SIZE_FORMATS.length - 1) {
    value /= 1024;
    unit++;
  }
  return SIZE_FORMATS[unit].format(value);
}

function parentOf(path: string): string {
  return path.slice(0, path.lastIndexOf('/'));
}

function urlFor(path: string): string {
  return `?${new URLSearchParams({path})}`;
}

function pathFromUrl(url: string): string | null {
  return new URL(url).searchParams.get('path');
}
