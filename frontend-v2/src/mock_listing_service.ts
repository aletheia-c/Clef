import type {
  Entity,
  EntityType,
  ListPage,
  ListRequest,
  ListingService,
} from './listing';

const ROOT_PATH = '/music';
const LATENCY_MS = 250;
const TYPE_ORDER: EntityType[] = ['directory', 'music', 'picture', 'file'];
const MUSIC_EXTENSIONS = new Set(['.mp3', '.flac', '.ogg', '.opus', '.wav']);
const PICTURE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);

export class MockListingService implements ListingService {
  private readonly directories = new Map<string, Entity[]>();
  private readonly collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
  });

  constructor() {
    this.directories.set(ROOT_PATH, []);
    let seed = 0;

    for (let artist = 1; artist <= 3; artist++) {
      const artistPath = this.addDirectory(ROOT_PATH, `Artist ${artist}`);
      for (let album = 1; album <= 2; album++) {
        const albumPath = this.addDirectory(artistPath, `Album ${album}`);
        for (let track = 1; track <= 12; track++) {
          const size = fakeSize(++seed, 20e6, 40e6);
          this.addFile(albumPath, `Track ${track}.flac`, size);
        }
        this.addFile(albumPath, 'cover.jpg', fakeSize(++seed, 5e5, 2e6));
        this.addFile(albumPath, 'notes.txt', 2_000);
      }
    }

    const recordingsPath = this.addDirectory(ROOT_PATH, 'Recordings');
    for (let i = 1; i <= 1500; i++) {
      const size = fakeSize(++seed, 1e7, 1e8);
      this.addFile(recordingsPath, `Recording ${i}.wav`, size);
    }

    this.addFile(ROOT_PATH, 'playlist.m3u', 4_096);
  }

  mountPoint(): Promise<string> {
    return Promise.resolve(ROOT_PATH);
  }

  list(request: ListRequest, signal: AbortSignal): Promise<ListPage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        try {
          resolve(this.respond(request));
        } catch (error) {
          reject(error);
        }
      }, LATENCY_MS);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(signal.reason);
      });
    });
  }

  private respond(request: ListRequest): ListPage {
    let path = normalizePath(request.path);
    if (path !== ROOT_PATH && !path.startsWith(`${ROOT_PATH}/`)) {
      throw new Error('The requested path is not a mount-point');
    }

    let entities = this.directories.get(path);
    if (!entities) {
      const slash = path.lastIndexOf('/');
      const name = path.slice(slash + 1);
      path = path.slice(0, slash);
      entities = this.directories.get(path);
      if (!entities?.some(e => e.type !== 'directory' && e.name === name)) {
        throw new Error('Something went wrong. Check logs.');
      }
    }

    const direction = request.ascending ? 1 : -1;
    const sorted = [...entities].sort((a, b) => {
      const aIsDirectory = a.type === 'directory';
      if (aIsDirectory !== (b.type === 'directory')) {
        return aIsDirectory ? -1 : 1;
      }
      let order = 0;
      if (request.sortKey === 'size') {
        order = a.size - b.size;
      } else if (request.sortKey === 'type') {
        order = TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type);
      }
      return direction * (order || this.collator.compare(a.name, b.name));
    });

    const total = sorted.length;
    const offset = Math.min(Math.max(request.offset, 0), total);
    const end = request.limit > 0 ? offset + request.limit : total;
    return {path, total, offset, entities: sorted.slice(offset, end)};
  }

  private addDirectory(parent: string, name: string): string {
    const path = `${parent}/${name}`;
    this.entriesOf(parent).push({
      name,
      type: 'directory',
      extension: '',
      size: 0,
    });
    this.directories.set(path, []);
    return path;
  }

  private addFile(directory: string, name: string, size: number): void {
    const dot = name.lastIndexOf('.');
    const extension = dot > 0 ? name.slice(dot) : '';
    this.entriesOf(directory).push({
      name,
      type: typeForExtension(extension),
      extension,
      size,
    });
  }

  private entriesOf(path: string): Entity[] {
    let entries = this.directories.get(path);
    if (!entries) {
      entries = [];
      this.directories.set(path, entries);
    }
    return entries;
  }
}

function typeForExtension(extension: string): EntityType {
  const lower = extension.toLowerCase();
  if (MUSIC_EXTENSIONS.has(lower)) {
    return 'music';
  }
  if (PICTURE_EXTENSIONS.has(lower)) {
    return 'picture';
  }
  return 'file';
}

function normalizePath(path: string): string {
  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (part === '..') {
      parts.pop();
    } else if (part !== '' && part !== '.') {
      parts.push(part);
    }
  }
  return `/${parts.join('/')}`;
}

function fakeSize(seed: number, min: number, max: number): number {
  return min + ((seed * 2_654_435_761) % (max - min));
}
