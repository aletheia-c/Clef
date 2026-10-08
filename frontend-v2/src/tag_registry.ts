export type TagAliases = Record<string, string[]>;

export class TagRegistry {
  readonly names: string[];
  private readonly nameByRaw = new Map<string, string>();

  constructor(aliases: TagAliases = {}) {
    this.names = Object.keys(aliases).sort();
    for (const name of this.names) {
      for (const raw of aliases[name]) {
        if (!this.nameByRaw.has(raw)) {
          this.nameByRaw.set(raw, name);
        }
      }
    }
  }

  nameOf(raw: string): string {
    return this.nameByRaw.get(raw) ?? raw;
  }
}
