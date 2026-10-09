import {getJson, postForm, postJson} from './http';
import type {ListPage, ListRequest, ListingService} from './listing';

export class HttpListingService implements ListingService {
  async mountPoint(): Promise<string> {
    const {path} = await getJson<{path: string}>('/api/getmntpoint');
    return path;
  }

  list(request: ListRequest, signal: AbortSignal): Promise<ListPage> {
    const params = new URLSearchParams({
      path: request.path,
      limit: String(request.limit),
      offset: String(request.offset),
      sort: request.sortKey,
      asc: String(request.ascending),
    });
    return getJson<ListPage>(`/api/list-v2?${params}`, signal);
  }

  createFolder(directory: string, name: string): Promise<void> {
    return postJson('/api/mkdir', {path: directory, name});
  }

  rename(path: string, newName: string): Promise<void> {
    return postJson('/api/rename', {path, newName});
  }

  upload(directory: string, file: File): Promise<void> {
    const form = new FormData();
    form.append('path', directory);
    form.append('file', file, file.name);
    return postForm('/api/store', form);
  }
}
