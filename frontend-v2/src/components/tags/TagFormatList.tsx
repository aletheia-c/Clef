import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { tagFormatLabel } from "@/lib/tagGroups";

export function TagFormatList({ format, count, children }: {
  format: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <details open className="group/format rounded-lg border border-border" data-tag-format={format}>
      <summary className="flex cursor-pointer list-none items-center gap-2 p-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 transition-transform group-open/format:rotate-90" />
        {tagFormatLabel(format)}
        <span className="ml-auto text-xs font-normal text-muted-foreground">{count}</span>
      </summary>
      <div className="flex flex-col gap-4 border-t border-border p-3">{children}</div>
    </details>
  );
}
