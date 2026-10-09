export type EntityType = 'directory' | 'music' | 'picture' | 'file';

export type SortKey = 'name' | 'size' | 'type';

export interface Entity {
  name: string;
  type: EntityType;
  extension: string;
  size: number;
}

export interface ListRequest {
  path: string;
  offset: number;
  limit: number;
  sortKey: SortKey;
  ascending: boolean;
}

export interface ListPage {
  path: string;
  total: number;
  offset: number;
  entities: Entity[];
}

export interface ListingService {
  mountPoint(): Promise<string>;
  list(request: ListRequest, signal: AbortSignal): Promise<ListPage>;
  createFolder(directory: string, name: string): Promise<void>;
  rename(path: string, newName: string): Promise<void>;
  upload(directory: string, file: File): Promise<void>;
}
