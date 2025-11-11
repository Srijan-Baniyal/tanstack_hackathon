import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSettings } from "@/lib/settings";
import {
  useOpenRouterModels,
  useVercelModels,
  type Model,
  type ProviderType,
} from "@/lib/models";
import { Send, RefreshCw, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  MAX_AGENTS,
  NONE_PROMPT_KEY,
  useAgentStore,
  type AgentConfig,
  type PreparedAgentConfig,
  type SystemPromptKey,
} from "@/zustand/AgentStore";
import { useChatStore } from "@/zustand/ChatStore";

interface ChatInputProps {
  onSendMessage?: (
    message: string,
    agents?: PreparedAgentConfig[]
  ) => void | Promise<void>;
  disabled?: boolean;
}

export default function ChatInput({
  onSendMessage,
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState(() => getSettings());
  const [systemPrompts, setSystemPrompts] = useState<string[]>(
    settings.systemPrompts
  );
  const {
    agentCount,
    agentConfigs,
    setAgentCount: updateAgentCount,
    setProvider: updateProvider,
    setModelId: updateModelId,
    setSystemPromptKey: updateSystemPromptKey,
    setWebSearch: updateWebSearch,
    validateSystemPromptKeys,
    hydrateFromPreparedAgents: hydrateAgents,
    resetAgents,
  } = useAgentStore();
  const selectedChatId = useChatStore((state) => state.selectedChatId);
  const isNewChatMode = useChatStore((state) => state.isNewChatMode);
  const saveAgentConfiguration = useChatStore(
    (state) => state.saveAgentConfiguration
  );
  const lastPersistedSignatureRef = useRef<string>("");
  const [isConfiguratorOpen, setConfiguratorOpen] = useState(false);

  // Use React Query hook for OpenRouter models
  const {
    data: openRouterModels = [],
    isLoading: isLoadingOpenRouterModels,
    error: openRouterQueryError,
    isFetching: isRefetchingOpenRouter,
  } = useOpenRouterModels(settings.openRouterKey);

  const openRouterError = openRouterQueryError
    ? openRouterQueryError instanceof Error
      ? openRouterQueryError.message
      : "Failed to load models"
    : null;

  const {
    data: vercelModels = [],
    isLoading: isLoadingVercelModels,
    error: vercelQueryError,
    isFetching: isRefetchingVercel,
  } = useVercelModels(settings.vercelAiGateway);

  const vercelError = vercelQueryError
    ? vercelQueryError instanceof Error
      ? vercelQueryError.message
      : "Failed to load models"
    : null;

  useEffect(() => {
    const refreshSettings = () => {
      const next = getSettings();
      setSettings(next);
      setSystemPrompts(next.systemPrompts);
    };

    refreshSettings();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "dashboard-settings") {
        refreshSettings();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorage);
      }
    };
  }, []);

  useEffect(() => {
    validateSystemPromptKeys(systemPrompts.length);
  }, [systemPrompts.length, validateSystemPromptKeys]);

  useEffect(() => {
    if (!selectedChatId || isNewChatMode) {
      resetAgents();
      lastPersistedSignatureRef.current = "";
      return;
    }

    const conversations = useChatStore.getState().conversations;
    const target = conversations.find((chat) => chat.id === selectedChatId);
    if (!target) {
      return;
    }

    const prepared = target.agentConfigs.map((agent) => ({
      provider: agent.provider,
      modelId: agent.modelId,
      systemPrompt: agent.systemPrompt,
      webSearch: agent.webSearch,
    }));

    hydrateAgents(prepared, systemPrompts);
    lastPersistedSignatureRef.current = JSON.stringify(prepared);
  }, [
    selectedChatId,
    isNewChatMode,
    hydrateAgents,
    resetAgents,
    systemPrompts,
  ]);

  const systemPromptOptions = useMemo(
    () => [
      {
        value: NONE_PROMPT_KEY,
        label: "No system prompt",
        preview: "No system prompt will be sent.",
      },
      ...systemPrompts.map((prompt, index) => ({
        value: `custom-${index}` as SystemPromptKey,
        label: prompt,
        preview: prompt,
      })),
    ],
    [systemPrompts]
  );

  const resolveSystemPrompt = useCallback(
    (key: SystemPromptKey): string => {
      if (key === NONE_PROMPT_KEY) {
        return "";
      }
      if (key.startsWith("custom-")) {
        const index = Number(key.split("-")[1]);
        return systemPrompts[index] ?? "";
      }
      return "";
    },
    [systemPrompts]
  );

  const getModelsForAgent = useCallback(
    (agent: AgentConfig) => {
      if (agent.provider === "openrouter") {
        return openRouterModels;
      }
      if (agent.provider === "vercel") {
        return vercelModels;
      }
      return [];
    },
    [openRouterModels, vercelModels]
  );

  const agentCountOptions = useMemo(
    () => Array.from({ length: MAX_AGENTS }, (_, index) => index + 1),
    []
  );

  const currentSystemPromptKey =
    agentConfigs[0]?.systemPromptKey ?? NONE_PROMPT_KEY;
  const currentWebSearch = agentConfigs[0]?.webSearch ?? "none";

  const truncate = useCallback((value: string, max = 48) => {
    if (!value) return "";
    return value.length > max ? `${value.slice(0, max)}…` : value;
  }, []);

  const providersSummary: string[] = useMemo(() => {
    if (agentConfigs.length === 0) {
      return [];
    }
    const counts: Record<string, number> = {};
    agentConfigs.forEach((agent) => {
      counts[agent.provider] = (counts[agent.provider] ?? 0) + 1;
    });
    return Object.entries(counts).map(([provider, count]) => {
      const label = provider === "vercel" ? "vercel" : "openrouter";
      return `${label} ×${count}`;
    });
  }, [agentConfigs]);

  const webSearchLabel = useMemo(() => {
    if (currentWebSearch === "none") {
      return "Web search off";
    }
    return `Web search: ${currentWebSearch}`;
  }, [currentWebSearch]);

  const promptPreview = useMemo(() => {
    const basePrompt = resolveSystemPrompt(currentSystemPromptKey);
    const override = agentConfigs[0]?.systemPromptOverride ?? "";
    return override || basePrompt;
  }, [agentConfigs, currentSystemPromptKey, resolveSystemPrompt]);

  const promptBadgeLabel = useMemo(() => {
    const prompt = promptPreview.trim();
    if (!prompt) {
      return "Prompt: none";
    }
    return `Prompt: ${truncate(prompt, 42)}`;
  }, [promptPreview, truncate]);

  const persistAgentConfiguration = useCallback(() => {
    if (!selectedChatId || isNewChatMode) {
      return;
    }

    const preparedAgents: PreparedAgentConfig[] = agentConfigs.map((agent) => ({
      provider: agent.provider,
      modelId: agent.modelId,
      systemPrompt:
        agent.systemPromptOverride ??
        resolveSystemPrompt(agent.systemPromptKey),
      webSearch: agent.webSearch,
    }));

    const nextSignature = JSON.stringify(preparedAgents);
    if (nextSignature === lastPersistedSignatureRef.current) {
      return;
    }

    lastPersistedSignatureRef.current = nextSignature;
    void saveAgentConfiguration(selectedChatId, preparedAgents);
  }, [
    agentConfigs,
    isNewChatMode,
    resolveSystemPrompt,
    saveAgentConfiguration,
    selectedChatId,
  ]);

  const handleAgentCountChange = (value: string) => {
    const nextCount = Number(value);
    if (Number.isNaN(nextCount) || nextCount < 1) return;
    updateAgentCount(nextCount);
    setTimeout(persistAgentConfiguration, 0);
  };

  const handleProviderChange = (index: number, provider: ProviderType) => {
    updateProvider(index, provider);
    setTimeout(persistAgentConfiguration, 0);
  };

  const handleModelChange = (index: number, modelId: string) => {
    updateModelId(index, modelId);
    setTimeout(persistAgentConfiguration, 0);
  };

  const handleSystemPromptChangeAll = (key: SystemPromptKey) => {
    agentConfigs.forEach((agent, index) => {
      if (agent.systemPromptKey !== key) {
        updateSystemPromptKey(index, key);
      }
    });
    setTimeout(persistAgentConfiguration, 0);
  };

  const handleWebSearchChangeAll = (value: "none" | "native" | "firecrawl") => {
    agentConfigs.forEach((agent, index) => {
      const next = agent.webSearch ?? "none";
      if (next !== value) {
        updateWebSearch(index, value);
      }
    });
    setTimeout(persistAgentConfiguration, 0);
  };

  useEffect(() => {
    if (agentConfigs.length <= 1) {
      return;
    }

    agentConfigs.forEach((agent, index) => {
      if (index === 0) return;
      if (agent.systemPromptKey !== currentSystemPromptKey) {
        updateSystemPromptKey(index, currentSystemPromptKey);
      }
      const current = agent.webSearch ?? "none";
      if (current !== currentWebSearch) {
        updateWebSearch(index, currentWebSearch);
      }
    });
  }, [
    agentConfigs.length,
    currentSystemPromptKey,
    currentWebSearch,
    updateSystemPromptKey,
    updateWebSearch,
  ]);

  useEffect(() => {
    agentConfigs.forEach((agent, index) => {
      const models = getModelsForAgent(agent);
      if (models.length === 0) {
        return;
      }

      const hasSelectedModel = agent.modelId
        ? models.some((model) => model.id === agent.modelId)
        : false;

      if (!hasSelectedModel) {
        updateModelId(index, models[0]!.id);
      }
    });
    setTimeout(persistAgentConfiguration, 0);
  }, [agentConfigs, getModelsForAgent, updateModelId]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || !onSendMessage) {
      return;
    }

    const preparedAgents: PreparedAgentConfig[] = agentConfigs.map((agent) => ({
      provider: agent.provider,
      modelId: agent.modelId,
      systemPrompt:
        agent.systemPromptOverride ??
        resolveSystemPrompt(agent.systemPromptKey),
      webSearch: agent.webSearch,
    }));

    console.groupCollapsed("🤖 Agent Orchestration");
    console.log("Total agents:", preparedAgents.length);
    console.log("User prompt:", trimmed);
    console.table(
      preparedAgents.map((agent, index) => ({
        Agent: index + 1,
        Provider: agent.provider,
        "Web Search": agent.webSearch ?? "none",
        Model: agent.modelId ?? "(not selected)",
        "System Prompt": agent.systemPrompt || "(empty)",
      }))
    );
    console.log("OpenRouter key set:", settings.openRouterKey !== "");
    console.log("Vercel Gateway key set:", settings.vercelAiGateway !== "");
    console.groupEnd();

    void onSendMessage(trimmed, preparedAgents);
    setMessage("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-3 p-3">
      <Sheet
        open={isConfiguratorOpen}
        onOpenChange={(nextOpen) => {
          setConfiguratorOpen(nextOpen);
          if (!nextOpen) {
            persistAgentConfiguration();
          }
        }}
      >
        <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Agent Orchestration
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full px-2 py-1 text-[11px]"
                >
                  {agentCount} {agentCount === 1 ? "agent" : "agents"}
                </Badge>
                {providersSummary.map((provider) => (
                  <Badge
                    key={provider}
                    variant="secondary"
                    className="rounded-full px-2 py-1 text-[11px] capitalize"
                  >
                    {provider}
                  </Badge>
                ))}
                <Badge
                  variant="outline"
                  className="rounded-full px-2 py-1 text-[11px]"
                >
                  {webSearchLabel}
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-full px-2 py-1 text-[11px]"
                >
                  {promptBadgeLabel}
                </Badge>
              </div>
            </div>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Configure Agents
              </Button>
            </SheetTrigger>
          </div>
        </div>

        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Configure agents</SheetTitle>
            <SheetDescription>
              Choose how many agents collaborate, which models they use, and any
              web tools they can access.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-1 pb-8">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    No. of agents
                  </label>
                  <Select
                    value={String(agentCount)}
                    onValueChange={handleAgentCountChange}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      {agentCountOptions.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Web search
                  </label>
                  <Select
                    value={currentWebSearch}
                    onValueChange={(value) =>
                      handleWebSearchChangeAll(
                        value as "none" | "native" | "firecrawl"
                      )
                    }
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Choose" className="truncate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="native">Native</SelectItem>
                      <SelectItem value="firecrawl">Firecrawl</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  System prompt
                </label>
                <Select
                  value={currentSystemPromptKey}
                  onValueChange={(value) =>
                    handleSystemPromptChangeAll(value as SystemPromptKey)
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Choose" className="truncate" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {systemPromptOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="block truncate text-sm">
                          {option.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                {agentConfigs.map((agent, index) => {
                  const models = getModelsForAgent(agent);
                  const modelValue =
                    agent.modelId &&
                    models.some((model: Model) => model.id === agent.modelId)
                      ? agent.modelId
                      : undefined;
                  const isOpenRouter = agent.provider === "openrouter";
                  const isVercel = agent.provider === "vercel";
                  const modelPlaceholder = (() => {
                    if (isOpenRouter) {
                      if (isLoadingOpenRouterModels) {
                        return "Loading...";
                      }
                      if (models.length === 0) {
                        return openRouterError ?? "No models";
                      }
                      return "Choose model";
                    }

                    if (isVercel) {
                      if (isLoadingVercelModels) {
                        return "Loading...";
                      }
                      if (models.length === 0) {
                        return vercelError ?? "No models";
                      }
                      return "Choose model";
                    }

                    return models.length === 0 ? "No models" : "Choose model";
                  })();

                  return (
                    <div
                      key={`agent-${index}`}
                      className="rounded-xl border border-border/60 bg-muted/40 p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Agent {index + 1}
                          </p>
                          <p className="text-[11px] text-muted-foreground/80">
                            {agent.provider === "vercel"
                              ? "Vercel"
                              : "OpenRouter"}
                            {agent.modelId ? ` · ${agent.modelId}` : ""}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className="rounded-full px-2 py-1 text-[11px]"
                        >
                          {agent.webSearch && agent.webSearch !== "none"
                            ? `Web: ${agent.webSearch}`
                            : "Web: off"}
                        </Badge>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                            Provider
                          </label>
                          <Select
                            value={agent.provider}
                            onValueChange={(value) =>
                              handleProviderChange(index, value as ProviderType)
                            }
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Choose provider" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="vercel">Vercel</SelectItem>
                              <SelectItem value="openrouter">
                                OpenRouter
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1">
                            Model
                            {(isOpenRouter && isRefetchingOpenRouter) ||
                            (isVercel && isRefetchingVercel) ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : null}
                          </label>
                          <Select
                            disabled={models.length === 0}
                            value={modelValue}
                            onValueChange={(value) =>
                              handleModelChange(index, value)
                            }
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder={modelPlaceholder} />
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                              {models.map((model: Model) => (
                                <SelectItem key={model.id} value={model.id}>
                                  <span className="block truncate text-sm">
                                    {model.name}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {(isOpenRouter && openRouterError) ||
                      (isVercel && vercelError) ? (
                        <p className="mt-3 text-[11px] text-destructive">
                          {isOpenRouter ? openRouterError : vercelError}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <SheetFooter className="justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setConfiguratorOpen(false);
                persistAgentConfiguration();
              }}
            >
              Done
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Message Input */}
      <div className="flex items-end gap-2 rounded border bg-card p-2">
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={disabled}
          className="min-h-[44px] max-h-44 flex-1 resize-none border-0 bg-transparent p-1.5 text-sm focus-visible:ring-0"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="size-8 shrink-0"
        >
          <Send className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
