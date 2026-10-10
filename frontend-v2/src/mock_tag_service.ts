import type {TagAliases} from './tag_registry';
import {
  isClefId,
  type HistoryEntry,
  type TagMap,
  type TagService,
} from './tags';

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
  private readonly log: HistoryEntry[] = [];
  private nextId = 1;

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

  coverUrl(path: string): string {
    const [artist, album] = path.split('/').slice(-3);
    if (album === 'Album 2') {
      return 'data:,';
    }
    const hue = [...artist, ...album].reduce(
      (sum, c) => sum + c.charCodeAt(0),
      0,
    );
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220">' +
      `<rect width="220" height="220" fill="hsl(${hue % 360} 45% 35%)"/>` +
      '<text x="110" y="117" fill="white" font-family="sans-serif" ' +
      `font-size="20" text-anchor="middle">${album}</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  async editValue(
    path: string,
    tag: string,
    oldValue: string,
    newValue: string,
  ): Promise<void> {
    await delay(LATENCY_MS);
    this.replace(path, tag, oldValue, newValue);
    this.record(path, 'change', tag, oldValue, newValue);
  }

  async addValue(path: string, tag: string, value: string): Promise<void> {
    await delay(LATENCY_MS);
    const raw = MAPPING[tag]?.vorbis ?? tag;
    this.append(path, raw, value);
    this.record(path, 'add', raw, '', value);
  }

  async removeValue(path: string, tag: string, value: string): Promise<void> {
    await delay(LATENCY_MS);
    this.drop(path, tag, value);
    this.record(path, 'remove', tag, value, '');
  }

  async history(
    identifier: string,
    signal: AbortSignal,
  ): Promise<HistoryEntry[]> {
    await delay(LATENCY_MS, signal);
    return this.log
      .filter(
        entry => entry.path === identifier || entry.clef_id === identifier,
      )
      .reverse();
  }

  async undo(entry: HistoryEntry): Promise<void> {
    await delay(LATENCY_MS);
    const undone = this.log
      .filter(
        later =>
          later.id >= entry.id &&
          later.path === entry.path &&
          later.tag === entry.tag,
      )
      .reverse();
    for (const later of undone) {
      if (later.action === 'add') {
        this.drop(later.path, later.tag, later.new_value);
      } else if (later.action === 'change') {
        this.replace(later.path, later.tag, later.new_value, later.old_value);
      } else {
        this.append(later.path, later.tag, later.old_value);
      }
      this.log.splice(this.log.indexOf(later), 1);
    }
  }

  private replace(path: string, tag: string, from: string, to: string): void {
    const values = this.valuesOf(path, tag);
    values[indexOf(values, from)] = to;
  }

  private append(path: string, tag: string, value: string): void {
    const tags = this.tagsOf(path);
    tags[tag] = [...(tags[tag] ?? []), value];
  }

  private drop(path: string, tag: string, value: string): void {
    const values = this.valuesOf(path, tag);
    values.splice(indexOf(values, value), 1);
    if (values.length === 0) {
      delete this.tagsOf(path)[tag];
    }
  }

  private record(
    path: string,
    action: HistoryEntry['action'],
    tag: string,
    oldValue: string,
    newValue: string,
  ): void {
    const tags = this.tagsOf(path);
    const idKey = Object.keys(tags).find(isClefId);
    this.log.push({
      id: this.nextId++,
      path,
      clef_id: idKey ? tags[idKey][0] : '',
      action,
      tag,
      old_value: oldValue,
      new_value: newValue,
      changed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });
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
  if (Number(track) % 5 === 0) {
    tags.CLEF_ID = [`jPnT${artist.at(-1)}${album.at(-1)}${track}uy7g8Lk`];
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
