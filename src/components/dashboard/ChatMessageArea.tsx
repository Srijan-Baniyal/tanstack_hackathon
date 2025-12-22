import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ScrollArea } from "../ui/scroll-area";
import CustomCollapsible from "../CustomCollapsible";
import type { Chat } from "../../lib/chat-storage";
import {
  extractMeshAgentSegments,
  type MeshAgentSegment,
} from "../../lib/mesh/segments";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../zustand/AuthStore";
import { useChatStore } from "../../zustand/ChatStore";
import type { UIMessage } from "ai";
import { Loader2 } from "lucide-react";
import { Streamdown } from "streamdown";

const getUserInitials = (
  fullName: string | undefined,
  email: string | undefined,
  fallback: string,
) => {
  const name = (fullName ?? "").trim();
  if (name) {
    const segments = name.split(/\s+/);
    const first = segments[0]?.[0] ?? "";
    const last =
      segments.length > 1 ? (segments[segments.length - 1]?.[0] ?? "") : "";
    const initials = `${first}${last}`.toUpperCase();
    if (initials.trim()) {
      return initials;
    }
  }
  if (email) {
    const prefix = email.split("@")[0] ?? "";
    const initials = prefix.slice(0, 2).toUpperCase();
    if (initials) {
      return initials;
    }
  }
  return fallback;
};

type MeshAwareMessage = UIMessage & {
  meshSegments?: MeshAgentSegment[];
};

type DisplayAgentSegment = MeshAgentSegment & {
  isPending?: boolean;
};

interface ChatMessageAreaProps {
  conversation: Chat;
  messages?: MeshAwareMessage[];
  isStreaming?: boolean;
}

export default function ChatMessageArea({
  conversation,
  messages = [],
  isStreaming = false,
}: ChatMessageAreaProps) {
  const currentUser = useAuthStore((state) => state.user);
  const activeAgents = useChatStore((state) => state.activeAgents);
  const hasMultipleAgents = activeAgents.length > 1;
  const userInitials = getUserInitials(
    currentUser?.fullName,
    currentUser?.email,
    conversation.avatar,
  );
  const userAvatarUrl = currentUser?.avatarUrl ?? null;
  const displayMessages = messages.length > 0 ? messages : [];
  const latestMessageId =
    displayMessages.length > 0
      ? displayMessages[displayMessages.length - 1]?.id
      : null;

  // Auto-refresh settings every 2 seconds to get latest system prompts
  // const { data: settings } = useQuery({
  //   queryKey: ["settings"],
  //   queryFn: () => getSettings(),
  //   refetchInterval: 2000,
  //   staleTime: 1000,
  // });

  return (
    <ScrollArea className="h-full p-4 md:p-6">
      <div className="space-y-4 max-w-3xl mx-auto">
        {hasMultipleAgents && isStreaming && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60 pb-2">
            <Loader2 className="size-3 animate-spin" />
            <span>Agents processing in parallel...</span>
          </div>
        )}
        {displayMessages.map((message) => {
          const textContent = message.parts
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text)
            .join("");

          const parsedSegments =
            message.role === "assistant"
              ? message.meshSegments && message.meshSegments.length > 0
                ? message.meshSegments
                : extractMeshAgentSegments(textContent)
              : [];

          const isStreamingMessage =
            isStreaming && message.id === latestMessageId;
          const shouldUseMultiAgent =
            hasMultipleAgents &&
            (parsedSegments.length > 0 || isStreamingMessage);

          // Display agents in completion order - whoever finishes first shows first
          const multiAgentSegments: DisplayAgentSegment[] | null =
            shouldUseMultiAgent
              ? (() => {
                  // Start with completed segments in order they appear (completion order)
                  const completed = parsedSegments.map((seg) => ({
                    ...seg,
                    isPending: false,
                  }));

                  if (!isStreamingMessage) {
                    return completed;
                  }

                  // Add pending agents that haven't completed yet
                  const completedIndices = new Set(
                    parsedSegments.map((s) => s.agentIndex),
                  );
                  const pending = activeAgents
                    .map((agent, idx) => ({
                      agentIndex: idx + 1,
                      provider: agent.provider,
                      modelId: agent.modelId,
                      content: "",
                      isPending: true,
                    }))
                    .filter((agent) => !completedIndices.has(agent.agentIndex));

                  // Show completed first (in order they finished), then pending
                  return [...completed, ...pending];
                })()
              : parsedSegments.length > 0
                ? parsedSegments.map((seg) => ({ ...seg, isPending: false }))
                : null;

          // Render multi-agent response with labeled sections
          if (
            shouldUseMultiAgent &&
            multiAgentSegments &&
            multiAgentSegments.length > 1
          ) {
            return (
              <div key={message.id} className="space-y-2">
                {isStreamingMessage && (
                  <div className="text-[10px] text-muted-foreground/50 mb-1 px-1">
                    {parsedSegments.length} of {activeAgents.length} completed
                  </div>
                )}
                {multiAgentSegments.map((segment, idx) => {
                  const hasContent = segment.content.trim().length > 0;
                  const isPending = segment.isPending === true;
                  const isComplete = hasContent;
                  const canInteract = isComplete;

                  return (
                    <CustomCollapsible
                      key={`${message.id}-agent-${idx}`}
                      defaultOpen={isComplete}
                      disabled={!canInteract}
                      className="rounded-md border border-border/20 bg-card/5 hover:bg-card/10 transition-colors"
                      title={
                        <div className="flex w-full items-center gap-2">
                          <span className="text-[11px] font-medium text-foreground/80">
                            {segment.modelId || `Agent ${segment.agentIndex}`}
                          </span>
                          {isPending && (
                            <Loader2 className="size-3 ml-auto animate-spin text-primary/40" />
                          )}
                          {isComplete && (
                            <span className="ml-auto text-[10px] text-emerald-500/60">
                              ✓
                            </span>
                          )}
                        </div>
                      }
                    >
                      {hasContent ? (
                        <Streamdown
                          className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed prose-headings:text-foreground prose-p:text-foreground/90"
                          isAnimating={isPending}
                        >
                          {segment.content}
                        </Streamdown>
                      ) : (
                        <div className="flex items-center gap-2 text-xs py-3 text-muted-foreground/50">
                          <Loader2 className="size-3 animate-spin" />
                          <span>Processing...</span>
                        </div>
                      )}
                    </CustomCollapsible>
                  );
                })}
              </div>
            );
          }

          // Render single-agent response (original behavior)
          return (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start",
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
                  "rounded-lg px-4 py-2.5 max-w-[80%]",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/20",
                )}
              >
                <Streamdown
                  className="prose prose-sm dark:prose-invert max-w-none"
                  isAnimating={isStreaming && message.role === "assistant"}
                >
                  {textContent || ""}
                </Streamdown>
              </div>
              {message.role === "user" && (
                <Avatar className="size-8 shrink-0">
                  {userAvatarUrl && (
                    <AvatarImage
                      src={userAvatarUrl}
                      alt={currentUser?.fullName ?? "You"}
                    />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
