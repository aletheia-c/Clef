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
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {signal});
  if (!response.ok) {
    const message = (await response.text()).trim();
    throw new Error(message || `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}
