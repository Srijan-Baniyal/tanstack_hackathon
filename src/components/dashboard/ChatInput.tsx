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
  DEFAULT_SYSTEM_PROMPT,
  VERCEL_MODELS,
  useOpenRouterModels,
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
  DEFAULT_PROMPT_KEY,
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
  }, [selectedChatId, isNewChatMode, hydrateAgents, resetAgents, systemPrompts]);

  const systemPromptOptions = useMemo(
    () => [
      {
        value: DEFAULT_PROMPT_KEY,
        label: DEFAULT_SYSTEM_PROMPT,
        preview: DEFAULT_SYSTEM_PROMPT,
      },
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
      if (key === DEFAULT_PROMPT_KEY) {
        return DEFAULT_SYSTEM_PROMPT;
      }
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
        return VERCEL_MODELS;
      }
      return [];
    },
    [openRouterModels]
  );

  const agentCountOptions = useMemo(
    () => Array.from({ length: MAX_AGENTS }, (_, index) => index + 1),
    []
  );

  const currentSystemPromptKey =
    agentConfigs[0]?.systemPromptKey ?? DEFAULT_PROMPT_KEY;
  const currentWebSearch = agentConfigs[0]?.webSearch ?? "none";

  const persistAgentConfiguration = useCallback(() => {
    if (!selectedChatId || isNewChatMode) {
      return;
    }

    const preparedAgents: PreparedAgentConfig[] = agentConfigs.map((agent) => ({
      provider: agent.provider,
      modelId: agent.modelId,
      systemPrompt:
        agent.systemPromptOverride ?? resolveSystemPrompt(agent.systemPromptKey),
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

  const handleWebSearchChangeAll = (
    value: "none" | "native" | "firecrawl"
  ) => {
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
        agent.systemPromptOverride ?? resolveSystemPrompt(agent.systemPromptKey),
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
    console.log(
      "Vercel Gateway key set:",
      settings.vercelAiGateway !== ""
    );
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
    <div className="space-y-2 p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="space-y-0.5">
          <label className="text-[10px] text-muted-foreground">
            No. of Agents
          </label>
          <Select
            value={String(agentCount)}
            onValueChange={handleAgentCountChange}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Choose No." />
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

        <div className="space-y-0.5">
          <label className="text-[10px] text-muted-foreground">
            System Prompt
          </label>
          <Select
            value={currentSystemPromptKey}
            onValueChange={(value) =>
              handleSystemPromptChangeAll(value as SystemPromptKey)
            }
          >
            <SelectTrigger className="h-8 text-xs max-w-full">
              <SelectValue placeholder="Choose Sys Prompt" className="truncate" />
            </SelectTrigger>
            <SelectContent className="max-w-[300px]">
              {systemPromptOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="truncate block max-w-[260px]">{option.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-0.5">
          <label className="text-[10px] text-muted-foreground">
            Web Search
          </label>
          <Select
            value={currentWebSearch}
            onValueChange={(value) =>
              handleWebSearchChangeAll(value as "none" | "native" | "firecrawl")
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Choose Search" className="truncate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="native">Native</SelectItem>
              <SelectItem value="firecrawl">Firecrawl</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Agent Configurations */}
      <div
        className={`space-y-1.5 ${agentCount > 1 ? "rounded border p-2" : ""}`}
      >
  {agentConfigs.map((agent, index) => {
          const models = getModelsForAgent(agent);
          const modelValue = agent.modelId && models.some((model) => model.id === agent.modelId)
            ? agent.modelId
            : undefined;
          const isOpenRouter = agent.provider === "openrouter";
          const modelPlaceholder = isOpenRouter
            ? isLoadingOpenRouterModels
              ? "Loading..."
              : models.length === 0
                ? (openRouterError ?? "No models")
                : "Choose Model"
            : models.length === 0
              ? "No models"
              : "Choose Model";

          return (
            <div key={`agent-${index}`} className="space-y-1.5">
              {agentCount > 1 && (
                <div className="text-[10px] font-medium text-muted-foreground">
                  Agent {index + 1}
                </div>
              )}

              <div className="flex flex-wrap items-end gap-1.5">
                <div className="min-w-[120px] flex-1 space-y-0.5">
                  <label className="text-[10px] text-muted-foreground">
                    Provider
                  </label>
                  <Select
                    value={agent.provider}
                    onValueChange={(value) =>
                      handleProviderChange(index, value as ProviderType)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Choose Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vercel">Vercel</SelectItem>
                      <SelectItem value="openrouter">OpenRouter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[140px] flex-1 space-y-0.5">
                  <label className="text-[10px] text-muted-foreground flex items-center gap-1">
                    Model
                    {isOpenRouter && isRefetchingOpenRouter && (
                      <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                    )}
                  </label>
                  <Select
                    disabled={models.length === 0}
                    value={modelValue}
                    onValueChange={(value) => handleModelChange(index, value)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={modelPlaceholder} />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <span className="truncate text-xs">{model.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              </div>

              {isOpenRouter && openRouterError && (
                <p className="text-[10px] text-destructive">
                  {openRouterError}
                </p>
              )}

              {agentCount > 1 && index < agentConfigs.length - 1 && (
                <div className="border-b" />
              )}
            </div>
          );
        })}
      </div>

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
