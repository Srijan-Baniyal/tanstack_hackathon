import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type { Conversation } from "@/components/dashboard/ChatSidebar";

interface ChatHeaderProps {
  selectedChat: Conversation | null;
}

export default function ChatHeader({ selectedChat }: ChatHeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex h-16 items-center gap-4 border-b px-4 md:px-6 bg-card">
      <SidebarTrigger className="-ml-1 size-10 hover:bg-accent rounded-xl" />
      <Separator orientation="vertical" className="h-6" />
      {selectedChat && (
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="size-9 border-2 border-background">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
              {selectedChat.avatar}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="font-semibold text-sm truncate">
              {selectedChat.title}
            </h2>
            <p className="text-xs text-muted-foreground">Active now</p>
          </div>
        </div>
      )}
      {!selectedChat && <div className="flex-1" />}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="rounded-xl size-10 shrink-0"
      >
        <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </header>
  );
}
