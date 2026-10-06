import {DirectoryModel} from './directory_model';
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

  constructor(
    service: ListingService,
    private readonly rootPath: string,
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
    const link = (event.target as Element).closest('a');
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
      nameCell.append(entity.name);
    }

    row.insertCell().textContent = TYPE_NAMES[entity.type];
    row.insertCell().textContent = entity.extension;
    row.insertCell().textContent = isDirectory ? '' : formatSize(entity.size);
    return row;
  }
}

function byId<T extends HTMLElement>(id: string, type: {new (): T}): T {
  const element = document.getElementById(id);
  if (!(element instanceof type)) {
    throw new Error(`Missing element #${id}`);
  }
  return element;
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
