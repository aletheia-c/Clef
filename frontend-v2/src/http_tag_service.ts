import {getJson, postJson} from './http';
import type {TagAliases} from './tag_registry';
import type {HistoryEntry, TagMap, TagService} from './tags';

type TagValue = string[] | string | number | boolean;

export class HttpTagService implements TagService {
  registry(): Promise<TagAliases> {
    return getJson<TagAliases>('/api/tag-registry');
  }

  async tags(path: string, signal: AbortSignal): Promise<TagMap> {
    const params = new URLSearchParams({path});
    const tags = await getJson<Record<string, TagValue>>(
      `/api/tag?${params}`,
      signal,
    );
    return Object.fromEntries(
      Object.entries(tags).map(([key, value]) => [
        key,
        Array.isArray(value) ? value : [String(value)],
      ]),
    );
  }

  coverUrl(path: string): string {
    return `/api/getalbumcover?${new URLSearchParams({path})}`;
  }

  editValue(
    path: string,
    tag: string,
    oldValue: string,
    newValue: string,
  ): Promise<void> {
    return postJson('/api/edittag', {
      path,
      tagType: tag,
      replaceWhat: oldValue,
      replaceWith: newValue,
    });
  }

  addValue(path: string, tag: string, value: string): Promise<void> {
    return postJson('/api/addfieldtag', {path, fieldType: tag, value});
  }

  removeValue(path: string, tag: string, value: string): Promise<void> {
    return postJson('/api/removefieldtag', {path, fieldType: tag, value});
  }

  history(identifier: string, signal: AbortSignal): Promise<HistoryEntry[]> {
    const params = new URLSearchParams({identifier});
    return getJson<HistoryEntry[]>(`/api/gethistory?${params}`, signal);
  }

  undo(entry: HistoryEntry): Promise<void> {
    return postJson('/api/undo', entry);
  }
}
