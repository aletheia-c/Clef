import type { TagGroups, TagMap } from "./types";

export function tagFormatLabel(format: string): string {
  return ({ id3v2: "ID3v2", id3v24: "ID3v2.4", riff: "RIFF INFO", xiph: "Xiph comments", mp4: "MP4", tags: "Tags" } as Record<string, string>)[format] ?? format;
}

/** Defaults also make it possible to add the first tag to an empty file. */
function defaultFormats(path: string): string[] {
  const extension = path.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "wav": case "wave": return ["id3v2", "riff"];
    case "mp3": return ["id3v24"];
    case "flac": case "ogg": case "opus": case "spx": return ["xiph"];
    case "m4a": case "mp4": return ["mp4"];
    default: return ["tags"];
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isScalar(value: unknown): boolean {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function isTagMap(value: unknown): value is Record<string, unknown> {
  return isObject(value) && Object.values(value).every((item) =>
    isScalar(item) || (Array.isArray(item) && item.every(isScalar)),
  );
}

function normalizeMap(tags: Record<string, unknown>): TagMap {
  return Object.fromEntries(Object.entries(tags).map(([key, value]) => [
    key, Array.isArray(value) ? value.map((item) => String(item ?? "")) : String(value ?? ""),
  ]));
}

/** Accept grouped responses and the previous flat response without stringifying objects. */
export function normalizeTagGroups(data: unknown, path: string): TagGroups {
  if (!isObject(data)) throw new Error("Invalid tag response");
  const defaults = defaultFormats(path);
  if (Object.keys(data).length === 0) return Object.fromEntries(defaults.map((format) => [format, {}]));
  if (isTagMap(data)) return { [defaults[0]]: normalizeMap(data) };
  if (!Object.values(data).every(isTagMap)) throw new Error("Invalid tag group response");
  const groups = Object.fromEntries(Object.entries(data).map(([format, tags]) => [format, normalizeMap(tags as Record<string, unknown>)]));
  // WAV can carry either block even when only one currently exists.
  return defaults.length > 1 ? { ...Object.fromEntries(defaults.map((format) => [format, {}])), ...groups } : groups;
}
