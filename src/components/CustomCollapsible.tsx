import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface CustomCollapsibleProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CustomCollapsible({
  title,
  children,
  defaultOpen = false,
}: CustomCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="group">
      <Button
        onClick={() => setIsOpen(!isOpen)}
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
          <div className="pb-6 sm:pb-8 md:pb-10 pr-8 sm:pr-10 md:pr-12 lg:pr-14 pl-1 sm:pl-1.5 md:pl-2 text-muted-foreground/90 leading-relaxed text-[13px] sm:text-[14px] md:text-[15px] font-light">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
