import { MessageSquare } from "lucide-react";

export default function ChatEmptyState() {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="text-center max-w-md">
        <div className="relative mx-auto mb-6 w-fit">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
          <div className="relative flex size-20 md:size-24 items-center justify-center rounded-3xl bg-linear-to-br from-primary/90 to-primary text-primary-foreground shadow-lg shadow-primary/25">
            <MessageSquare className="size-10 md:size-12" strokeWidth={1.5} />
          </div>
        </div>
        <h3 className="text-2xl md:text-3xl font-bold mb-3 text-balance bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          Select a conversation
        </h3>
        <p className="text-sm md:text-base text-muted-foreground text-balance leading-relaxed">
          Choose a chat from the sidebar to start messaging or create a new
          conversation
        </p>
      </div>
    </div>
  );
}
