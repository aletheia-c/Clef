import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
} from "@/components/ui/context-menu";

function focusAddField(root: HTMLDivElement | null) {
  const section = root?.querySelector<HTMLElement>("[data-add-field-section]");
  if (!section) return;
  const details = section.closest("details");
  if (details) details.open = true;
  section.scrollIntoView({ behavior: "smooth", block: "nearest" });
  section.querySelector("input")?.focus();
}

interface FieldTarget {
  /** Raw tag name — what a remove issued from here must send. */
  key: string;
  /** What the row displays for that tag (raw or normalized). */
  label: string;
  value: string;
}

/**
 * Wraps the tag editor with the right-click menu from new-frontend.md:
 * "Add new tag field" everywhere, plus "Remove current tag field" when the
 * cursor is over a field. Suppresses the native browser menu inside the panel.
 */
export function TagPanelContextMenu({
  onRemoveField,
  children,
}: {
  onRemoveField: (target: FieldTarget) => void;
  children: React.ReactNode;
}) {
  const [target, setTarget] = React.useState<FieldTarget | null>(null);
  const root = React.useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest("[data-tag-key]");
    if (el) {
      const key = el.getAttribute("data-tag-key") ?? "";
      setTarget({
        key,
        label: el.getAttribute("data-tag-label") || key,
        value: el.getAttribute("data-tag-value") ?? "",
      });
    } else {
      setTarget(null);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div ref={root} onContextMenu={handleContextMenu}>
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {target && (
          <>
            <ContextMenuLabel className="max-w-[16rem] truncate">
              {target.label}
            </ContextMenuLabel>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem onSelect={() => focusAddField(root.current)}>
          <Plus />
          Add new tag field
        </ContextMenuItem>
        {target && (
          <ContextMenuItem
            variant="destructive"
            onSelect={() => onRemoveField(target)}
          >
            <Trash2 />
            Remove current tag field
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
