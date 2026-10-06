import type {TagMap, TagService} from './tags';

const LATENCY_MS = 250;

export class MockTagService implements TagService {
  async tags(path: string, signal: AbortSignal): Promise<TagMap> {
    await delay(LATENCY_MS, signal);

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
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}
