import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

export type CollapsibleItemStatus = "idle" | "running" | "success" | "error";

export interface CustomCollapsibleItem {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  content?: ReactNode;
  status?: CollapsibleItemStatus;
  statusLabel?: ReactNode;
}

interface CustomCollapsibleProps {
  title: ReactNode;
  children?: ReactNode;
  defaultOpen?: boolean;
  disabled?: boolean;
  className?: string;
  items?: CustomCollapsibleItem[];
}

const STATUS_STYLES: Record<CollapsibleItemStatus, string> = {
  idle: "bg-muted/70 text-muted-foreground",
  running: "bg-primary/10 text-primary",
  success:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  error: "bg-destructive/10 text-destructive",
};

export default function CustomCollapsible({
  title,
  children,
  defaultOpen = false,
  disabled = false,
  className,
  items,
}: CustomCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Sync internal state when defaultOpen prop changes
  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  const resolvedItems = useMemo(
    () =>
      items?.filter((item): item is CustomCollapsibleItem => Boolean(item)) ??
      [],
    [items],
  );
  const hasRenderableItems = resolvedItems.length > 0;
  const hasChildren = Boolean(children);

  return (
    <div className={cn("group", className)}>
      <Button
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        className={cn(
          "w-full py-2 px-3 flex bg-transparent hover:bg-accent/5 items-center gap-2 transition-colors",
          disabled && "opacity-50 cursor-not-allowed hover:bg-transparent",
        )}
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground/40 transition-transform shrink-0",
            isOpen && "rotate-90",
          )}
        />
        <span className="text-xs font-medium text-foreground/70">{title}</span>
      </Button>
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          {(hasRenderableItems || hasChildren) && (
            <div className="pb-3 pl-6 text-sm space-y-3">
              {hasRenderableItems && (
                <div className="space-y-3">
                  {resolvedItems.map((item) => {
                    const statusStyle = item.status
                      ? STATUS_STYLES[item.status]
                      : STATUS_STYLES.idle;

                    return (
                      <div
                        key={item.id}
                        className="rounded-md border border-border/30 bg-card/5 p-3"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {item.title}
                            </div>
                            {item.description && (
                              <div className="text-xs leading-relaxed text-muted-foreground/90">
                                {item.description}
                              </div>
                            )}
                          </div>
                          {(item.status || item.statusLabel || item.meta) && (
                            <div className="flex flex-col items-start sm:items-end gap-1 text-[11px] text-muted-foreground/80">
                              {item.status && (
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-0.5 font-medium uppercase tracking-wider",
                                    statusStyle,
                                  )}
                                >
                                  {item.statusLabel ?? item.status}
                                </span>
                              )}
                              {item.meta && <span>{item.meta}</span>}
                            </div>
                          )}
                        </div>
                        {item.content && (
                          <div className="mt-3 text-[12px] leading-relaxed text-muted-foreground/90">
                            {item.content}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {hasChildren && <div className="space-y-3">{children}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
