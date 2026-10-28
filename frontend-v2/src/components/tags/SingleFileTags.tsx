import * as React from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { CoverSection } from "./CoverSection";
import { TagField } from "./TagField";
import { AddFieldSection } from "./AddFieldSection";
import { TagPanelContextMenu } from "./TagPanelContextMenu";
import { useTags } from "@/hooks/useTags";
import { useTagMutations } from "@/hooks/useTagMutations";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { useApp } from "@/context/AppContext";
import { usePrefs } from "@/context/PrefsContext";
import { useHistoryPanel } from "@/context/HistoryContext";
import { useDialogs } from "@/hooks/useDialogs";
import { readClefId, isHiddenTag } from "@/lib/tags";
import { displayTag, tagLabel, tagTooltip } from "@/lib/tagRegistry";
import { basename } from "@/lib/utils";
import { ClefIdBadge } from "./ClefIdBadge";
import { TagFormatList } from "./TagFormatList";
import type { TagMap } from "@/lib/types";

export function SingleFileTags({
  filePath,
  onClefId,
}: {
  filePath: string;
  onClefId: (badge: React.ReactNode) => void;
}) {
  const { tags, loading, error, reload } = useTags(filePath);
  const { useClefId } = useApp();
  const { setTarget, tagsRefreshToken } = useHistoryPanel();

  // Reload after an undo elsewhere (history panel).
  const skipFirstRefresh = React.useRef(true);
  React.useEffect(() => {
    if (skipFirstRefresh.current) {
      skipFirstRefresh.current = false;
      return;
    }
    reload();
  }, [tagsRefreshToken, reload]);

  const clefId = tags ? Object.values(tags).map(readClefId).find((id) => id !== null) ?? null : null;
  const showThrobber = useDelayedFlag(!tags && !error);

  // Publish the Clef_ID badge to the panel header.
  React.useEffect(() => {
    onClefId(clefId ? <ClefIdBadge clefId={clefId} /> : null);
  }, [clefId, onClefId]);

  // Configure the history target (clefId when useClefId, else the path). Do NOT
  // clear on unmount: switching between music files should swap the history
  // panel's content, not close it. TagPanel clears the target when the
  // selection is no longer a single music file.
  React.useEffect(() => {
    if (!useClefId) {
      // Identifier is the path — known immediately, no need to wait for tags.
      setTarget({ identifier: filePath, title: basename(filePath) });
      return;
    }
    // useClefId: identifier is the file's Clef_ID, known only once tags load.
    // Keep the current target while loading so the panel doesn't flash closed.
    if (loading && !tags) return;
    setTarget(clefId ? { identifier: clefId, title: basename(filePath) } : null);
  }, [useClefId, filePath, clefId, loading, tags, setTarget]);

  if (!tags && !error) {
    // Only reveal the throbber if the load is actually slow — avoids a flash.
    return showThrobber ? (
      <div className="flex flex-col items-center justify-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        <span className="text-sm">Loading tags…</span>
      </div>
    ) : null;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
        <AlertCircle className="size-6 text-destructive" />
        <p className="text-sm">Failed to load tags</p>
        <p className="text-xs">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <CoverSection path={filePath} />

      <div className="flex flex-col gap-4 p-4">
        {Object.entries(tags ?? {}).map(([format, fields]) => (
          <SingleTagFormat key={format} format={format} tags={fields} filePath={filePath} reload={reload} />
        ))}
      </div>
    </div>
  );
}

function SingleTagFormat({ format, tags, filePath, reload }: {
  format: string;
  tags: TagMap;
  filePath: string;
  reload: () => void;
}) {
  const mut = useTagMutations(reload, format);
  const { tagIndex } = useApp();
  const { showRawTags } = usePrefs();
  const { confirm } = useDialogs();
  const rows = Object.entries(tags).filter(([key]) => !isHiddenTag(key))
    .sort(([a], [b]) => displayTag(tagIndex, a).localeCompare(displayTag(tagIndex, b), undefined, { numeric: true }));
  return (
    <TagPanelContextMenu onRemoveField={async ({ key, label, value }) => {
      if (await confirm({ title: `Remove “${label || key}”?`, description: "This deletes the tag field from this file.", destructive: true, confirmLabel: "Remove" })) {
        await mut.removeFile(filePath, key, value);
      }
    }}>
      <TagFormatList format={format} count={rows.length}>
        {rows.length === 0 && <p className="text-center text-sm text-muted-foreground">No tags found</p>}
        {rows.map(([key, value]) => (
          <TagField key={key} filePath={filePath} tagKey={key}
            label={tagLabel(tagIndex, key, showRawTags)}
            labelTitle={tagTooltip(tagIndex, key, showRawTags)}
            value={value} mut={mut} reload={reload} />
        ))}
        <AddFieldSection variant="single" onAdd={(scope, fieldType, value) =>
          scope === "folder" ? mut.addFolder(fieldType, value) : mut.addFile(filePath, fieldType, value)
        } />
      </TagFormatList>
    </TagPanelContextMenu>
  );
}
