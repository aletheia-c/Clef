import {getJson} from './http';
import type {TagMap, TagService} from './tags';

export class HttpTagService implements TagService {
  tags(path: string, signal: AbortSignal): Promise<TagMap> {
    const params = new URLSearchParams({path});
    return getJson<TagMap>(`/api/tag?${params}`, signal);
  }
}
