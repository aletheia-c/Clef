export type TagMap = Record<string, string[]>;

export const TAGGABLE_EXTENSIONS = new Set([
  '.mp3',
  '.flac',
  '.m4a',
  '.ogg',
  '.opus',
]);

export interface TagService {
  tags(path: string, signal: AbortSignal): Promise<TagMap>;
}
