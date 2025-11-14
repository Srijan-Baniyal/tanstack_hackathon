import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import CustomCollapsible from "@/components/CustomCollapsible";
import type { Chat } from "@/lib/chat-storage";
import {
  extractMeshAgentSegments,
  type MeshAgentSegment,
} from "@/lib/mesh/segments";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/zustand/AuthStore";
import { useChatStore } from "@/zustand/ChatStore";
import type { UIMessage } from "ai";
import { Loader2 } from "lucide-react";
import { Streamdown } from "streamdown";

const getUserInitials = (
  fullName: string | undefined,
  email: string | undefined,
  fallback: string
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
    conversation.avatar
  );
  const userAvatarUrl = currentUser?.avatarUrl ?? null;
  const displayMessages = messages.length > 0 ? messages : [];
  const latestMessageId =
    displayMessages.length > 0
      ? displayMessages[displayMessages.length - 1]?.id
      : null;

  return (
    <ScrollArea className="h-full p-4 md:p-6">
      <div className="space-y-4 max-w-3xl mx-auto">
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

          console.log("Message Debug:", {
            messageId: message.id,
            role: message.role,
            textContent: textContent.substring(0, 200),
            parsedSegments,
            isStreaming,
            latestMessageId,
          });

          const isStreamingMessage =
            isStreaming && message.id === latestMessageId;
          const shouldUseMultiAgent =
            hasMultipleAgents &&
            (parsedSegments.length > 0 || isStreamingMessage);

          const multiAgentSegments: DisplayAgentSegment[] | null =
            shouldUseMultiAgent
              ? activeAgents.map((agent, idx) => {
                  const agentIndex = idx + 1;
                  const existing = parsedSegments.find(
                    (segment) => segment.agentIndex === agentIndex
                  );

                  if (existing) {
                    // If we have content, the agent is done regardless of streaming state
                    return {
                      ...existing,
                      isPending: false,
                    };
                  }

                  // No existing segment - agent is either pending or running
                  return {
                    agentIndex,
                    provider: agent.provider,
                    modelId: agent.modelId,
                    content: "",
                    isPending: isStreamingMessage,
                  };
                })
              : parsedSegments.length > 0
                ? parsedSegments.map(seg => ({ ...seg, isPending: false }))
                : null;

          console.log("Multi-Agent Segments:", {
            shouldUseMultiAgent,
            hasMultipleAgents,
            activeAgentsCount: activeAgents.length,
            multiAgentSegments,
            isStreamingMessage,
          });

          // Render multi-agent response with labeled sections
          if (
            shouldUseMultiAgent &&
            multiAgentSegments &&
            multiAgentSegments.length > 1
          ) {
            return (
              <div key={message.id} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <div className="h-px flex-1 bg-linear-to-r from-transparent via-border to-transparent" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground/70">
                    Multi-Agent Response
                  </span>
                  <div className="h-px flex-1 bg-linear-to-r from-transparent via-border to-transparent" />
                </div>
                {multiAgentSegments.map((segment, idx) => {
                  const hasContent = segment.content.trim().length > 0;
                  const isPending = segment.isPending === true;
                  const isComplete = hasContent;
                  
                  console.log(`Agent ${segment.agentIndex} Status:`, {
                    agentIndex: segment.agentIndex,
                    hasContent,
                    contentLength: segment.content.length,
                    isPending,
                    isComplete,
                    provider: segment.provider,
                    modelId: segment.modelId,
                  });
                  
                  // Status: Complete if has content, Running if streaming and no content, Pending if not streaming and no content
                  const statusLabel = isComplete ? "Complete" : isPending ? "Running" : "Pending";
                  const statusClasses = isComplete
                    ? "bg-emerald-500/10 text-emerald-400"
                    : isPending
                      ? "bg-blue-500/10 text-blue-400"
                      : "bg-muted text-muted-foreground";

                  // Find matching agent config
                  const agentConfig = activeAgents[segment.agentIndex - 1];
                  const modelName = segment.modelId?.trim() || agentConfig?.modelId || "Model auto-select";
                  const systemPrompt = agentConfig?.systemPrompt?.trim() || "";
                  const truncatedPrompt =
                    systemPrompt.length > 220
                      ? `${systemPrompt.slice(0, 220).trim()}…`
                      : systemPrompt;
                  const webSearch =
                    agentConfig?.webSearch && agentConfig.webSearch !== "none"
                      ? agentConfig.webSearch
                      : null;

                  return (
                    <CustomCollapsible
                      key={`${message.id}-agent-${idx}`}
                      defaultOpen={true}
                      className="rounded-2xl border border-border/70 bg-card/70 shadow-xs"
                      title={
                        <div className="flex w-full items-center gap-3 pr-2">
                          <Avatar className="size-6 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                              {segment.agentIndex}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.35em]">
                            Agent {segment.agentIndex}
                          </span>
                          <span className="text-xs truncate text-muted-foreground">
                            {segment.provider === "vercel" ? "Vercel" : "OpenRouter"} · {modelName}
                          </span>
                          <span
                            className={cn(
                              "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              statusClasses
                            )}
                          >
                            {statusLabel}
                          </span>
                        </div>
                      }
                    >
                      <div className="space-y-4">
                        <div>
                          {hasContent ? (
                            <Streamdown
                              className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed"
                              isAnimating={false}
                            >
                              {segment.content}
                            </Streamdown>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                              {isPending ? (
                                <>
                                  <Loader2 className="size-3 animate-spin" />
                                  <span>Generating response...</span>
                                </>
                              ) : (
                                <span className="text-muted-foreground/60">No response received</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Agent Configuration */}
                        {(webSearch || truncatedPrompt) && (
                          <div className="pt-3 border-t border-border/40 space-y-3 text-xs leading-relaxed text-muted-foreground/90">
                            {webSearch && (
                              <div className="flex items-center gap-2 text-[11px]">
                                <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                                  Web Search
                                </span>
                                <span className="rounded-full bg-muted/60 px-2 py-0.5 font-medium capitalize text-muted-foreground/90">
                                  {webSearch}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
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
