import {getJson, postJson} from './http';
import type {TagMap, TagService} from './tags';

export class HttpTagService implements TagService {
  tags(path: string, signal: AbortSignal): Promise<TagMap> {
    const params = new URLSearchParams({path});
    return getJson<TagMap>(`/api/tag?${params}`, signal);
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
}
