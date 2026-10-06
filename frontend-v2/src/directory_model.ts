import type {Entity, ListingService, SortKey} from './listing';

const PAGE_SIZE = 100;

export interface DirectoryModelListener {
  reset(): void;
  rowsAppended(first: number): void;
  loadingChanged(loading: boolean): void;
  loadFailed(path: string, error: Error): void;
}

export class DirectoryModel {
  private currentPath = '';
  private items: Entity[] = [];
  private itemTotal = 0;
  private currentSortKey: SortKey = 'name';
  private isAscending = true;
  private pending?: AbortController;
  private fetchFailed = false;

  constructor(
    private readonly service: ListingService,
    private readonly listener: DirectoryModelListener,
  ) {}

  get path(): string {
    return this.currentPath;
  }

  get entities(): readonly Entity[] {
    return this.items;
  }

  get total(): number {
    return this.itemTotal;
  }

  get sortKey(): SortKey {
    return this.currentSortKey;
  }

  get ascending(): boolean {
    return this.isAscending;
  }

  get loading(): boolean {
    return this.pending !== undefined;
  }

  canFetchMore(): boolean {
    return (
      this.currentPath !== '' &&
      !this.loading &&
      !this.fetchFailed &&
      this.items.length < this.itemTotal
    );
  }

  load(path: string): void {
    this.fetchFailed = false;
    void this.request(path, 0, true);
  }

  reload(): void {
    if (this.currentPath) {
      this.load(this.currentPath);
    }
  }

  setSort(key: SortKey, ascending: boolean): void {
    this.currentSortKey = key;
    this.isAscending = ascending;
    this.reload();
  }

  fetchMore(): void {
    if (this.canFetchMore()) {
      void this.request(this.currentPath, this.items.length, false);
    }
  }

  private async request(
    path: string,
    offset: number,
    isReset: boolean,
  ): Promise<void> {
    const wasLoading = this.loading;
    this.pending?.abort();
    const controller = new AbortController();
    this.pending = controller;
    if (!wasLoading) {
      this.listener.loadingChanged(true);
    }

    try {
      const page = await this.service.list(
        {
          path,
          offset,
          limit: PAGE_SIZE,
          sortKey: this.currentSortKey,
          ascending: this.isAscending,
        },
        controller.signal,
      );
      if (controller.signal.aborted) {
        return;
      }
      this.finishRequest();

      if (isReset) {
        this.currentPath = page.path;
        this.items = page.entities;
        this.itemTotal = page.total;
        this.listener.reset();
        return;
      }

      const first = this.items.length;
      if (page.offset === first && page.entities.length > 0) {
        this.items.push(...page.entities);
        this.itemTotal = page.total;
      } else {
        this.itemTotal = first;
      }
      this.listener.rowsAppended(first);
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      this.finishRequest();
      if (!isReset) {
        this.fetchFailed = true;
      }
      const cause = error instanceof Error ? error : new Error(String(error));
      this.listener.loadFailed(path, cause);
    }
  }

  private finishRequest(): void {
    this.pending = undefined;
    this.listener.loadingChanged(false);
  }
}
