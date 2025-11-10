import { useCallback, useEffect, useMemo, useState } from "react";
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
  type ProviderType,
} from "@/lib/models";
import { Send } from "lucide-react";
import {
  DEFAULT_PROMPT_KEY,
  MAX_AGENTS,
  NONE_PROMPT_KEY,
  useAgentStore,
  type AgentConfig,
  type PreparedAgentConfig,
  type SystemPromptKey,
} from "@/zustand/AgentStore";

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
    openRouterModels,
    isLoadingOpenRouterModels,
    openRouterError,
    setAgentCount: updateAgentCount,
    setProvider: updateProvider,
    setModelId: updateModelId,
    setSystemPromptKey: updateSystemPromptKey,
    setWebSearch: updateWebSearch,
    ensureOpenRouterModels: ensureOpenRouterModelsFromStore,
    validateSystemPromptKeys,
  } = useAgentStore();

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

  const systemPromptOptions = useMemo(
    () => [
      {
        value: DEFAULT_PROMPT_KEY,
        label: "Helpful Assistant",
        preview: DEFAULT_SYSTEM_PROMPT,
      },
      {
        value: NONE_PROMPT_KEY,
        label: "No prompt",
        preview: "No system prompt will be sent.",
      },
      ...systemPrompts.map((prompt, index) => ({
        value: `custom-${index}` as SystemPromptKey,
        label: `Custom ${index + 1}`,
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

  const handleAgentCountChange = (value: string) => {
    const nextCount = Number(value);
    if (Number.isNaN(nextCount) || nextCount < 1) return;
    updateAgentCount(nextCount);
  };

  const handleProviderChange = (index: number, provider: ProviderType) => {
    updateProvider(index, provider);
  };

  const handleModelChange = (index: number, modelId: string) => {
    updateModelId(index, modelId);
  };

  const handleSystemPromptChange = (index: number, key: SystemPromptKey) => {
    updateSystemPromptKey(index, key);
  };

  const handleWebSearchChange = (
    index: number,
    value: "none" | "native" | "firecrawl"
  ) => {
    updateWebSearch(index, value);
  };

  useEffect(() => {
    if (agentConfigs.some((agent) => agent.provider === "openrouter")) {
      void ensureOpenRouterModelsFromStore(settings.openRouterKey);
    }
  }, [agentConfigs, ensureOpenRouterModelsFromStore, settings.openRouterKey]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || !onSendMessage) {
      return;
    }

    const preparedAgents: PreparedAgentConfig[] = agentConfigs.map((agent) => ({
      provider: agent.provider,
      modelId: agent.modelId,
      systemPrompt: resolveSystemPrompt(agent.systemPromptKey),
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
      {/* Agent Count Selector - Shows separately when multiple agents */}
      {agentCount > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Number of Agents:
          </span>
          <Select
            value={String(agentCount)}
            onValueChange={handleAgentCountChange}
          >
            <SelectTrigger className="h-8 w-16 text-xs">
              <SelectValue />
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
      )}

      {/* Agent Configurations */}
      <div
        className={`space-y-1.5 ${agentCount > 1 ? "rounded border p-2" : ""}`}
      >
  {agentConfigs.map((agent, index) => {
          const models = getModelsForAgent(agent);
          const modelValue = models.some((model) => model.id === agent.modelId)
            ? agent.modelId
            : undefined;
          const isOpenRouter = agent.provider === "openrouter";
          const modelPlaceholder = isOpenRouter
            ? isLoadingOpenRouterModels
              ? "Loading..."
              : models.length === 0
                ? (openRouterError ?? "No models")
                : "Select model"
            : models.length === 0
              ? "No models"
              : "Select model";

          return (
            <div key={`agent-${index}`} className="space-y-1.5">
              {agentCount > 1 && (
                <div className="text-[10px] font-medium text-muted-foreground">
                  Agent {index + 1}
                </div>
              )}

              <div className="flex flex-wrap items-end gap-1.5">
                {index === 0 && agentCount === 1 && (
                  <div className="space-y-0.5">
                    <label className="text-[10px] text-muted-foreground">
                      Agents
                    </label>
                    <Select
                      value={String(agentCount)}
                      onValueChange={handleAgentCountChange}
                    >
                      <SelectTrigger className="h-8 w-16 text-xs">
                        <SelectValue />
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
                )}

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
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vercel">Vercel</SelectItem>
                      <SelectItem value="openrouter">OpenRouter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[140px] flex-1 space-y-0.5">
                  <label className="text-[10px] text-muted-foreground">
                    Model
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

                <div className="min-w-[120px] flex-1 space-y-0.5">
                  <label className="text-[10px] text-muted-foreground">
                    System Prompt
                  </label>
                  <Select
                    value={agent.systemPromptKey}
                    onValueChange={(value) =>
                      handleSystemPromptChange(index, value as SystemPromptKey)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {systemPromptOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[100px] space-y-0.5">
                  <label className="text-[10px] text-muted-foreground">
                    Web Search
                  </label>
                  <Select
                    value={agent.webSearch ?? "none"}
                    onValueChange={(value) =>
                      handleWebSearchChange(
                        index,
                        value as "none" | "native" | "firecrawl"
                      )
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="native">Native</SelectItem>
                      <SelectItem value="firecrawl">Firecrawl</SelectItem>
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
