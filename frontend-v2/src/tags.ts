import type {TagAliases} from './tag_registry';

export type TagMap = Record<string, string[]>;

export const TAGGABLE_EXTENSIONS = new Set([
  '.mp3',
  '.flac',
  '.m4a',
  '.ogg',
  '.opus',
]);

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
