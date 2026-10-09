import type {TagRegistry} from './tag_registry';
import type {TagMap} from './tags';

export interface FileTag {
  key: string;
  values: string[];
}

export interface MergedTag {
  name: string;
  perFile: Array<FileTag | undefined>;
  common: string[] | null;
}

export function mergeTags(files: TagMap[], registry: TagRegistry): MergedTag[] {
  const byName = new Map<string, Array<FileTag | undefined>>();
  files.forEach((tags, index) => {
    for (const key of Object.keys(tags).sort()) {
      const name = registry.nameOf(key);
      let perFile = byName.get(name);
      if (!perFile) {
        perFile = new Array<FileTag | undefined>(files.length).fill(undefined);
        byName.set(name, perFile);
      }
      perFile[index] ??= {key, values: tags[key]};
    }
  });

  return [...byName]
    .map(([name, perFile]) => ({name, perFile, common: commonValues(perFile)}))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function commonValues(perFile: Array<FileTag | undefined>): string[] | null {
  const [first, ...rest] = perFile;
  if (!first) {
    return null;
  }
  for (const tag of rest) {
    if (!tag || !sameValues(tag.values, first.values)) {
      return null;
    }
  }
  return first.values;
}

function sameValues(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}
