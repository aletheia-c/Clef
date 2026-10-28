import { api } from "@/lib/api";
import type { TagMap } from "@/lib/types";
import { useApp } from "@/context/AppContext";
import { useExplorer } from "@/context/ExplorerContext";
import { usePrefs } from "@/context/PrefsContext";
import { forEachLimit } from "@/lib/concurrency";
import { rawKeyIn } from "@/lib/tagRegistry";
import { useToast } from "@/components/ui/toast";

/**
 * Tag write operations for the single-file editor, in both "this file" and
 * "whole folder" scopes. Each resolves after reloading and shows a toast.
 *
 * Every operation resolves to whether it succeeded, so callers can hold a
 * transitional UI (a pending value box, a "saving" row) in place until the
 * write actually lands instead of tearing it down on click.
 *
 * `tagType`/`fieldType` here is always a **raw** tag name — the one the edited
 * file reported. Folder-scope writes resolve it per file within the selected
 * format, so one metadata block cannot overwrite another block's field.
 */
export function useTagMutations(reload: () => void, format?: string) {
  const { getFolderMusicPaths } = useExplorer();
  const { writeLimit } = usePrefs();
  const { tagIndex } = useApp();
  const { toast } = useToast();

  async function runFolder(
    verb: string,
    op: (path: string, tags: TagMap) => Promise<unknown>,
  ): Promise<boolean> {
    // Resolved per run rather than held in context: with paging on, the
    // explorer only has the current page, so this may fetch the full listing.
    const paths = await getFolderMusicPaths();
    if (paths.length === 0) {
      toast("No music files in this folder", "error");
      return false;
    }
    let skipped = 0;
    const failed = await forEachLimit(paths, writeLimit, async (path) => {
      const groups = await api.getTags(path);
      if (format && !(format in groups)) {
        skipped += 1;
        return;
      }
      const tags = format ? groups[format] : Object.values(groups)[0] ?? {};
      if (await op(path, tags) === false) skipped += 1;
    });
    const total = paths.length - skipped;
    if (total === 0) {
      toast("No music files have the requested tag or format", "error");
      return false;
    }
    if (failed === 0) toast(`${verb} ${total} file${total > 1 ? "s" : ""}`, "success");
    else toast(`${verb} ${total - failed}/${total}, ${failed} failed`, "error");
    reload();
    return failed < total;
  }

  return {
    format,
    async editFile(
      filePath: string,
      tagType: string,
      replaceWhat: string,
      replaceWith: string,
    ): Promise<boolean> {
      if (!replaceWith.trim()) {
        toast("Tag value cannot be empty", "error");
        return false;
      }
      try {
        await api.editTag({ path: filePath, tagType, replaceWhat, replaceWith, format });
        toast("Tag saved", "success");
        reload();
        return true;
      } catch (err) {
        toast(`Failed to save: ${(err as Error).message}`, "error");
        return false;
      }
    },

    editFolder(tagType: string, replaceWhat: string, replaceWith: string) {
      if (!replaceWith.trim()) {
        toast("Tag value cannot be empty", "error");
        return Promise.resolve(false);
      }
      return runFolder("Saved", async (path, tags) => {
        const raw = rawKeyIn(tagIndex, tags, tagType);
        if (!raw) return false;
        return api.editTag({ path, tagType: raw, replaceWhat, replaceWith, format });
      });
    },

    async removeFile(
      filePath: string,
      fieldType: string,
      value: string,
    ): Promise<boolean> {
      try {
        await api.removeField({ path: filePath, fieldType, value, format });
        toast("Field removed", "success");
        reload();
        return true;
      } catch (err) {
        toast(`Failed to remove: ${(err as Error).message}`, "error");
        return false;
      }
    },

    removeFolder(fieldType: string, value: string) {
      return runFolder("Removed field from", async (path, tags) => {
        const raw = rawKeyIn(tagIndex, tags, fieldType);
        if (!raw) return false;
        return api.removeField({ path, fieldType: raw, value, format });
      });
    },

    async addFile(
      filePath: string,
      fieldType: string,
      value: string,
    ): Promise<boolean> {
      try {
        await api.addField({ path: filePath, fieldType, value: value || "none", format });
        toast("Field added", "success");
        reload();
        return true;
      } catch (err) {
        toast(`Failed to add field: ${(err as Error).message}`, "error");
        return false;
      }
    },

    /**
     * Adding a value to a field that already exists in the file uses that
     * file's raw name; for a field it doesn't have yet, `fieldType` goes
     * through as typed and the backend resolves it.
     */
    addFolder(fieldType: string, value: string) {
      return runFolder("Added field to", async (path, tags) => {
        const raw = rawKeyIn(tagIndex, tags, fieldType) ?? fieldType;
        return api.addField({ path, fieldType: raw, value: value || "none", format });
      });
    },
  };
}
