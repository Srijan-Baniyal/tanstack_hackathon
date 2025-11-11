import { useMemo, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
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

export function CustomCollapsible({
  title,
  children,
  defaultOpen = false,
  className,
  items,
}: CustomCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const resolvedItems = useMemo(
    () =>
      items?.filter((item): item is CustomCollapsibleItem => Boolean(item)) ??
      [],
    [items]
  );
  const hasRenderableItems = resolvedItems.length > 0;
  const hasChildren = Boolean(children);

  return (
    <div className={cn("group", className)}>
      <Button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full py-4 sm:py-5 md:py-6 lg:py-7 flex items-center gap-3 sm:gap-4 md:gap-6 lg:gap-8 group transition-all duration-500 ease-out hover:pl-1 sm:hover:pl-1.5 md:hover:pl-2"
      >
        <span className="text-sm sm:text-base md:text-lg font-light tracking-wide sm:tracking-wider text-foreground whitespace-nowrap transition-all duration-500 group-hover:tracking-wider sm:group-hover:tracking-widest">
          {title}
        </span>
        <div className="relative flex-1 h-px overflow-hidden">
          <div
            className={cn(
              "absolute inset-0 bg-border transition-all duration-700 ease-out",
              "group-hover:scale-x-105 group-hover:bg-linear-to-r group-hover:from-border group-hover:via-foreground/30 group-hover:to-border"
            )}
          />
        </div>
        <ChevronRight
          className={cn(
            "h-4 w-4 sm:h-[18px] sm:w-[18px] md:h-5 md:w-5 text-muted-foreground/60 transition-all duration-700 ease-out shrink-0",
            isOpen && "rotate-90 text-foreground/80",
            "group-hover:text-foreground group-hover:scale-110"
          )}
        />
      </Button>
      <div
        className={cn(
          "grid transition-all duration-700 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          {(hasRenderableItems || hasChildren) && (
            <div className="pb-6 sm:pb-8 md:pb-10 pr-4 sm:pr-8 md:pr-10 lg:pr-12 pl-1 sm:pl-1.5 md:pl-2 text-muted-foreground/90 text-[13px] sm:text-[14px] md:text-[15px] font-light space-y-4">
              {hasRenderableItems && (
                <div className="space-y-3">
                  {resolvedItems.map((item) => {
                    const statusStyle = item.status
                      ? STATUS_STYLES[item.status]
                      : STATUS_STYLES.idle;

                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border/60 bg-card/60 p-3 sm:p-4 shadow-xs"
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
                                    statusStyle
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
