import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Chat } from "@/lib/chat-storage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import CustomCollapsible  from "@/components/CustomCollapsible";
import { useAuthStore } from "@/zustand/AuthStore";
import { useChatStore } from "@/zustand/ChatStore";
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
  const currentUser = useAuthStore((state) => state.user);
  const activeAgents = useChatStore((state) => state.activeAgents);
  const userInitials = getUserInitials(
    currentUser?.fullName,
    currentUser?.email,
    conversation.avatar
  );
  const userAvatarUrl = currentUser?.avatarUrl ?? null;
  const displayMessages = messages.length > 0 ? messages : [];
  const hasMultipleAgents = activeAgents.length > 1;

  const agentSummaries = useMemo(() => {
    if (!hasMultipleAgents) {
      return [];
    }

    const findModelName = (_provider: string, modelId?: string | null) => {
      if (!modelId) {
        return "Model auto-select";
      }
      return modelId;
    };

    const truncatePrompt = (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) {
        return "";
      }
      return trimmed.length > 220
        ? `${trimmed.slice(0, 220).trim()}…`
        : trimmed;
    };

    return activeAgents.map((agent, index) => {
      const providerLabel =
        agent.provider === "vercel" ? "Vercel" : "OpenRouter";
      const status = isStreaming ? "running" : "success";
      const statusLabel = isStreaming ? "Running" : "Ready";
      const modelName = findModelName(agent.provider, agent.modelId);
      const promptPreview = truncatePrompt(agent.systemPrompt ?? "");

      return {
        id: `${agent.provider}-${index}`,
        label: `Agent ${index + 1}`,
        providerLabel,
        modelName,
        status,
        statusLabel,
        prompt: promptPreview,
        webSearch:
          agent.webSearch && agent.webSearch !== "none"
            ? agent.webSearch
            : null,
      };
    });
  }, [activeAgents, hasMultipleAgents, isStreaming]);

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
        {agentSummaries.length > 0 && (
          <div className="pt-2 space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground/80">
              <span>Active Agents</span>
              <span className="text-[10px] font-normal tracking-normal text-muted-foreground/70">
                {agentSummaries.length}
              </span>
            </div>
            <div className="space-y-2">
              {agentSummaries.map((agent) => {
                const statusClasses =
                  agent.status === "running"
                    ? "bg-primary/10 text-primary"
                    : agent.status === "success"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : agent.status === "error"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted/60 text-muted-foreground";

                return (
                  <CustomCollapsible
                    key={agent.id}
                    defaultOpen={false}
                    className="rounded-2xl border border-border/70 bg-card/70 shadow-xs"
                    title={
                      <div className="flex w-full items-center gap-3 pr-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.35em]">
                          {agent.label}
                        </span>
                        <span className="text-xs truncate">
                          {agent.providerLabel} · {agent.modelName}
                        </span>
                        <span
                          className={cn(
                            "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            statusClasses
                          )}
                        >
                          {agent.statusLabel}
                        </span>
                      </div>
                    }
                  >
                    <div className="space-y-3 text-xs leading-relaxed text-muted-foreground/90">
                      {agent.webSearch && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                            Web Search
                          </span>
                          <span className="rounded-full bg-muted/60 px-2 py-0.5 font-medium capitalize text-muted-foreground/90">
                            {agent.webSearch}
                          </span>
                        </div>
                      )}
                      {agent.prompt && (
                        <div className="space-y-2">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            System Prompt
                          </div>
                          <p>{agent.prompt}</p>
                        </div>
                      )}
                      {!agent.prompt && !agent.webSearch && (
                        <p className="text-[11px] text-muted-foreground/80">
                          No additional configuration provided.
                        </p>
                      )}
                    </div>
                  </CustomCollapsible>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
