import type {TagAliases} from './tag_registry';
import type {TagMap, TagService} from './tags';

const LATENCY_MS = 250;

const MAPPING: Record<string, {id3v2: string; vorbis: string}> = {
  Album: {id3v2: 'TALB', vorbis: 'ALBUM'},
  Artist: {id3v2: 'TPE1', vorbis: 'ARTIST'},
  Artists: {id3v2: 'TXXX:Artists', vorbis: 'ARTISTS'},
  Comment: {id3v2: 'COMM', vorbis: 'COMMENT'},
  'Disc Number': {id3v2: 'TPOS', vorbis: 'DISCNUMBER'},
  Genre: {id3v2: 'TCON', vorbis: 'GENRE'},
  Mood: {id3v2: 'TMOO', vorbis: 'MOOD'},
  'Recording Date': {id3v2: 'TDRC', vorbis: 'DATE'},
  Title: {id3v2: 'TIT2', vorbis: 'TITLE'},
  'Track Number': {id3v2: 'TRCK', vorbis: 'TRACKNUMBER'},
};

export class MockTagService implements TagService {
  private readonly files = new Map<string, TagMap>();

  async registry(): Promise<TagAliases> {
    await delay(LATENCY_MS);
    return Object.fromEntries(
      Object.entries(MAPPING).map(([name, raw]) => [
        name,
        [raw.id3v2, raw.vorbis],
      ]),
    );
  }

  async tags(path: string, signal: AbortSignal): Promise<TagMap> {
    await delay(LATENCY_MS, signal);
    return structuredClone(this.tagsOf(path));
  }

  async editValue(
    path: string,
    tag: string,
    oldValue: string,
    newValue: string,
  ): Promise<void> {
    await delay(LATENCY_MS);
    const values = this.valuesOf(path, tag);
    values[indexOf(values, oldValue)] = newValue;
  }

  async addValue(path: string, tag: string, value: string): Promise<void> {
    await delay(LATENCY_MS);
    const raw = MAPPING[tag]?.vorbis ?? tag;
    const tags = this.tagsOf(path);
    tags[raw] = [...(tags[raw] ?? []), value];
  }

  async removeValue(path: string, tag: string, value: string): Promise<void> {
    await delay(LATENCY_MS);
    const values = this.valuesOf(path, tag);
    values.splice(indexOf(values, value), 1);
    if (values.length === 0) {
      delete this.tagsOf(path)[tag];
    }
  }

  private tagsOf(path: string): TagMap {
    let tags = this.files.get(path);
    if (!tags) {
      tags = fakeTags(path);
      this.files.set(path, tags);
    }
    return tags;
  }

  private valuesOf(path: string, tag: string): string[] {
    const values = this.tagsOf(path)[tag];
    if (!values) {
      throw new Error('Field type does not exist');
    }
    return values;
  }
}

function fakeTags(path: string): TagMap {
  const [artist, album, file] = path.split('/').slice(-3);
  const title = file.slice(0, file.lastIndexOf('.'));
  const track = title.replace(/\D/g, '');

  const tags: TagMap = {
    ALBUM: [album],
    ARTIST: [artist],
    DATE: ['2024'],
    GENRE: ['Electronic'],
    TITLE: [title],
    TRACKNUMBER: [track],
  };
  if (Number(track) % 3 === 0) {
    tags.ARTISTS = [artist, 'Guest Singer'];
  }
  return tags;
}

function indexOf(values: string[], value: string): number {
  const index = values.indexOf(value);
  if (index === -1) {
    throw new Error('Specified value was not found in a file. Check logs');
  }
  return index;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}
