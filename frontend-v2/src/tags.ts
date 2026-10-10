import type {TagAliases} from './tag_registry';

export type TagMap = Record<string, string[]>;

export const TAGGABLE_EXTENSIONS = new Set([
  '.mp3',
  '.flac',
  '.m4a',
  '.ogg',
  '.opus',
]);

const ID_PREFIXES = ['TXXX:', '----:com.apple.iTunes:'];
const ID_NAMES = new Set(['CLEF_ID', 'RTEID']);

export function isClefId(key: string): boolean {
  const prefix = ID_PREFIXES.find(prefix => key.startsWith(prefix)) ?? '';
  return ID_NAMES.has(key.slice(prefix.length).toUpperCase());
}

export interface TagService {
  registry(): Promise<TagAliases>;
  tags(path: string, signal: AbortSignal): Promise<TagMap>;
  coverUrl(path: string): string;
  editValue(
    path: string,
    tag: string,
    oldValue: string,
    newValue: string,
  ): Promise<void>;
  addValue(path: string, tag: string, value: string): Promise<void>;
  removeValue(path: string, tag: string, value: string): Promise<void>;
}
