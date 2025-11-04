import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Conversation } from "@/components/dashboard/ChatSidebar";

interface ChatMessageAreaProps {
  conversation: Conversation;
}

export default function ChatMessageArea({ conversation }: ChatMessageAreaProps) {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="text-center max-w-md">
        <div className="relative mx-auto mb-6 w-fit">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          <Avatar className="relative size-20 md:size-24 border-4 border-background shadow-xl shadow-primary/10">
            <AvatarFallback className="bg-linear-to-br from-primary/20 to-primary/10 text-primary font-bold text-2xl md:text-3xl">
              {conversation.avatar}
            </AvatarFallback>
          </Avatar>
        </div>
        <h3 className="text-2xl md:text-3xl font-bold mb-3 text-balance bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          {conversation.title}
        </h3>
        <p className="text-sm md:text-base text-muted-foreground text-balance leading-relaxed mb-4">
          Start typing to send a message
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <div className="size-2 rounded-full bg-green-500 animate-pulse" />
          <span>Active now</span>
        </div>
      </div>
    </div>
  );
}
