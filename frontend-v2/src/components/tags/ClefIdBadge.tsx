import { Fingerprint } from "lucide-react";
import { SimpleTooltip } from "@/components/ui/tooltip";

/**
 * Read-only Clef_ID indicator. The Clef_ID identifies a file in the change-history
 * database; it is managed by the backend and cannot be edited/removed here.
 */
export function ClefIdBadge({ clefId }: { clefId: string }) {
  return (
    <SimpleTooltip label="Clef ID — identifies this file in the change history">
      <div className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
        <Fingerprint className="size-3 shrink-0" />
        <span className="truncate">{clefId}</span>
      </div>
    </SimpleTooltip>
  );
}
