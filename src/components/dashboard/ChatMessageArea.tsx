import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Chat } from "@/lib/chat-storage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ChatMessageAreaProps {
  conversation: Chat;
  messages?: any[];
  isStreaming?: boolean;
}

export default function ChatMessageArea({
  conversation,
  messages = [],
  isStreaming = false,
}: ChatMessageAreaProps) {
  const displayMessages = messages.length > 0 ? messages : [];
  return (
    <ScrollArea className="h-full p-4 md:p-6">
      <div className="space-y-4 max-w-3xl mx-auto">
        {displayMessages.map((message: any) => {
          const textContent = message.parts
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text)
            .join("");

          return (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    AI
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 max-w-[80%]",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {textContent}
                </p>
              </div>
              {message.role === "user" && (
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {conversation.avatar}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}
        {isStreaming && (
          <div className="flex gap-3 justify-start">
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                AI
              </AvatarFallback>
            </Avatar>
            <div className="rounded-2xl px-4 py-3 bg-muted">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
