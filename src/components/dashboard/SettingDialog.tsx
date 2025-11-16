import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  SettingsIcon,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import { getSettings, saveSettings, type Settings } from "../../lib/settings";
import { useVercelCredits, useOpenRouterCredits } from "../../lib/credits";
import { useAuthStore } from "@/zustand/AuthStore";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

type SettingsFormValues = {
  openRouterKey: string;
  vercelAiGateway: string;
  systemPrompts: string[];
  fullName: string;
  email: string;
};

type UserKeysResponse = {
  openrouterKey: string | null;
  vercelKey: string | null;
};

export default function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
  const [showVercelKey, setShowVercelKey] = useState(false);
  const [ setUser] = useState<any>(null);

  const initialSettings = getSettings();
  const callAuthenticatedAction = useAuthStore(
    (state) => state.callAuthenticatedAction
  );

  // Fetch Vercel AI Gateway credits
  const {
    data: vercelCredits,
    isLoading: vercelLoading,
    error: vercelError,
    dataUpdatedAt: vercelUpdatedAt,
    refetch: refetchVercel,
  } = useVercelCredits(open);

  // Fetch OpenRouter credits
  const {
    data: openRouterCredits,
    isLoading: openRouterLoading,
    error: openRouterError,
    dataUpdatedAt: openRouterUpdatedAt,
    refetch: refetchOpenRouter,
  } = useOpenRouterCredits(open);

  const handleRefreshAll = () => {
    refetchVercel();
    refetchOpenRouter();
    toast.success("Refreshing credits...");
  };

  const form = useForm({
    defaultValues: {
      openRouterKey: initialSettings.openRouterKey || "",
      vercelAiGateway: initialSettings.vercelAiGateway || "",
      systemPrompts: initialSettings.systemPrompts || [],
      fullName: "",
      email: "",
    } as SettingsFormValues,
    onSubmit: async ({ value }) => {
      const trimmedOpenRouterKey = value.openRouterKey.trim();
      const trimmedVercelGateway = value.vercelAiGateway.trim();

      try {
        await callAuthenticatedAction(api.authActions.upsertUserKeys, {
          keys: {
            openrouterKey:
              trimmedOpenRouterKey.length > 0
                ? trimmedOpenRouterKey
                : undefined,
            vercelKey:
              trimmedVercelGateway.length > 0
                ? trimmedVercelGateway
                : undefined,
          },
        });

        const sanitized = saveSettings({
          openRouterKey: trimmedOpenRouterKey,
          vercelAiGateway: trimmedVercelGateway,
          systemPrompts: value.systemPrompts,
        } as Settings);

        if (sanitized) {
          form.setFieldValue("openRouterKey", sanitized.openRouterKey);
          form.setFieldValue("vercelAiGateway", sanitized.vercelAiGateway);
          form.setFieldValue("systemPrompts", sanitized.systemPrompts);
        }

        toast.success("Settings saved", {
          description: "Your API keys are stored securely.",
        });
        setOpen(false);
      } catch (error) {
        console.error("Failed to save settings", error);
        const description =
          error instanceof Error ? error.message : "Please try again.";
        toast.error("Failed to save settings", { description });
      }
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      setIsLoadingKeys(true);
      try {
        const [keys, userProfile] = await Promise.all([
          callAuthenticatedAction<UserKeysResponse | null>(
            api.authActions.getUserKeys
          ),
          callAuthenticatedAction<any>(api.authActions.me)
        ]);
        
        if (cancelled) {
          return;
        }

        // Set user profile
        setUser(userProfile);
        form.setFieldValue("fullName", userProfile?.fullName || "");
        form.setFieldValue("email", userProfile?.email || "");

        // Only set keys if they exist, otherwise use empty strings for new users
        form.setFieldValue("openRouterKey", keys?.openrouterKey || "");
        form.setFieldValue("vercelAiGateway", keys?.vercelKey || "");
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load data", error);
          // Set empty values on error (user might not have keys yet)
          form.setFieldValue("openRouterKey", "");
          form.setFieldValue("vercelAiGateway", "");
          form.setFieldValue("fullName", "");
          form.setFieldValue("email", "");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingKeys(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [open, callAuthenticatedAction, form]);

  const addPrompt = () => {
    if (newPrompt.trim()) {
      const currentPrompts = form.getFieldValue("systemPrompts");
      form.setFieldValue("systemPrompts", [
        ...currentPrompts,
        newPrompt.trim(),
      ]);
      setNewPrompt("");
    }
  };

  const removePrompt = (index: number) => {
    const currentPrompts = form.getFieldValue("systemPrompts");
    form.setFieldValue(
      "systemPrompts",
      currentPrompts.filter((_, i) => i !== index)
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl size-10 shrink-0"
        >
          <SettingsIcon className="size-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Settings</DialogTitle>
          <DialogDescription>
            Configure your API keys and system prompts, innit.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-6"
        >
          <Tabs defaultValue="main" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="main">Main Settings</TabsTrigger>
              <TabsTrigger value="tools">Additional Tools</TabsTrigger>
            </TabsList>

            <TabsContent value="main" className="space-y-4 mt-4">
              <form.Field name="openRouterKey">
                {(field) => (
                  <div className="space-y-2">
                    <label
                      htmlFor={field.name}
                      className="text-sm font-medium leading-none"
                    >
                      OpenRouter API Key
                    </label>
                    <div className="relative">
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Openrouter keys goes here"
                        type={showOpenRouterKey ? "text" : "password"}
                        disabled={isLoadingKeys}
                        className="pr-20"
                      />
                      <div className="absolute right-0 top-0 h-full flex">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-full px-3 hover:bg-transparent"
                          onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                          disabled={isLoadingKeys}
                        >
                          {showOpenRouterKey ? (
                            <EyeOff className="size-4 text-muted-foreground" />
                          ) : (
                            <Eye className="size-4 text-muted-foreground" />
                          )}
                          <span className="sr-only">
                            {showOpenRouterKey ? "Hide" : "Show"} API key
                          </span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-full px-3 hover:bg-transparent text-destructive hover:text-destructive"
                          onClick={async () => {
                            field.handleChange("");
                            try {
                              await callAuthenticatedAction(api.authActions.upsertUserKeys, {
                                keys: {
                                  openrouterKey: undefined,
                                },
                              });
                              toast.success("OpenRouter key deleted", {
                                description: "Your OpenRouter API key has been removed.",
                              });
                            } catch (error) {
                              console.error("Failed to delete OpenRouter key", error);
                              toast.error("Failed to delete key", {
                                description: "Please try again.",
                              });
                            }
                          }}
                          disabled={isLoadingKeys || !field.state.value}
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only">Delete OpenRouter key</span>
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Optional. Your OpenRouter API key for AI models.
                    </p>
                  </div>
                )}
              </form.Field>

              <form.Field name="vercelAiGateway">
                {(field) => (
                  <div className="space-y-2">
                    <label
                      htmlFor={field.name}
                      className="text-sm font-medium leading-none"
                    >
                      Vercel AI Gateway
                    </label>
                    <div className="relative">
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        type={showVercelKey ? "text" : "password"}
                        placeholder="Vercel AI Gateway key goes here"
                        disabled={isLoadingKeys}
                        className="pr-20"
                      />
                      <div className="absolute right-0 top-0 h-full flex">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-full px-3 hover:bg-transparent"
                          onClick={() => setShowVercelKey(!showVercelKey)}
                          disabled={isLoadingKeys}
                        >
                          {showVercelKey ? (
                            <EyeOff className="size-4 text-muted-foreground" />
                          ) : (
                            <Eye className="size-4 text-muted-foreground" />
                          )}
                          <span className="sr-only">
                            {showVercelKey ? "Hide" : "Show"} API key
                          </span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-full px-3 hover:bg-transparent text-destructive hover:text-destructive"
                          onClick={async () => {
                            field.handleChange("");
                            try {
                              await callAuthenticatedAction(api.authActions.upsertUserKeys, {
                                keys: {
                                  vercelKey: undefined,
                                },
                              });
                              toast.success("Vercel key deleted", {
                                description: "Your Vercel AI Gateway key has been removed.",
                              });
                            } catch (error) {
                              console.error("Failed to delete Vercel key", error);
                              toast.error("Failed to delete key", {
                                description: "Please try again.",
                              });
                            }
                          }}
                          disabled={isLoadingKeys || !field.state.value}
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only">Delete Vercel key</span>
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Optional. Your Vercel AI Gateway endpoint.
                    </p>
                  </div>
                )}
              </form.Field>

              <form.Field name="systemPrompts">
                {(field) => (
                  <div className="space-y-3">
                    <label className="text-sm font-medium leading-none">
                      System Prompts
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Store your custom system prompts for quick access.
                    </p>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter a system prompt..."
                        value={newPrompt}
                        onChange={(e) => setNewPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.ctrlKey) {
                            e.preventDefault();
                            addPrompt();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={addPrompt}
                        size="icon"
                        className="shrink-0"
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>

                    {field.state.value && field.state.value.length > 0 && (
                      <div className="space-y-2 mt-4">
                        {field.state.value.map(
                          (prompt: string, index: number) => (
                            <div
                              key={index}
                              className="flex items-start gap-2 p-3 rounded-lg border bg-muted/50"
                            >
                              <p className="flex-1 text-sm leading-relaxed">
                                {prompt}
                              </p>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0 text-destructive hover:text-destructive"
                                onClick={() => removePrompt(index)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}
              </form.Field>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <form.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting]}
                >
                  {([canSubmit, isSubmitting]) => (
                    <Button
                      type="submit"
                      disabled={!canSubmit || isLoadingKeys}
                    >
                      {isSubmitting || isLoadingKeys
                        ? "Saving..."
                        : "Save Settings"}
                    </Button>
                  )}
                </form.Subscribe>
              </div>
            </TabsContent>

            <TabsContent value="tools" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">API Credits & Usage</h3>
                </div>

                {/* Vercel AI Gateway Credits */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between w-full">
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="size-5" />
                        Vercel AI Gateway
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {new Date(vercelUpdatedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {vercelLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <RefreshCw className="size-4 animate-spin" />
                        <span>Loading credits...</span>
                      </div>
                    ) : vercelError ? (
                      <div className="text-destructive text-sm">
                        <p className="font-medium">Failed to load credits</p>
                        <p className="text-xs mt-1">
                          {vercelError instanceof Error
                            ? vercelError.message
                            : "Please check your API key"}
                        </p>
                      </div>
                    ) : !vercelCredits ? (
                      <p className="text-sm text-muted-foreground">
                        No API key configured. Add your Vercel AI Gateway key in
                        Main Settings.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Balance:
                          </span>
                          <span className="text-lg font-bold">
                            $
                            {typeof vercelCredits.balance === "string"
                              ? parseFloat(vercelCredits.balance).toFixed(2)
                              : typeof vercelCredits.balance === "number"
                                ? vercelCredits.balance.toFixed(2)
                                : "0.00"}
                          </span>
                        </div>
                        {vercelCredits.total_used !== undefined && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Total Used:
                            </span>
                            <span className="text-sm font-medium">
                              $
                              {typeof vercelCredits.total_used === "string"
                                ? parseFloat(vercelCredits.total_used).toFixed(
                                    2
                                  )
                                : typeof vercelCredits.total_used === "number"
                                  ? vercelCredits.total_used.toFixed(2)
                                  : "0.00"}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* OpenRouter Credits */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between w-full">
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="size-5" />
                        OpenRouter
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {new Date(openRouterUpdatedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {openRouterLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <RefreshCw className="size-4 animate-spin" />
                        <span>Loading credits...</span>
                      </div>
                    ) : openRouterError ? (
                      <div className="text-destructive text-sm">
                        <p className="font-medium">Failed to load credits</p>
                        <p className="text-xs mt-1">
                          {openRouterError instanceof Error
                            ? openRouterError.message
                            : "Please check your API key"}
                        </p>
                      </div>
                    ) : !openRouterCredits ? (
                      <p className="text-sm text-muted-foreground">
                        No API key configured. Add your OpenRouter key in Main
                        Settings.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Balance:
                          </span>
                          <span className="text-lg font-bold">
                            $
                            {openRouterCredits.data?.limit
                              ? (
                                  openRouterCredits.data.limit -
                                  (openRouterCredits.data.usage || 0)
                                ).toFixed(2)
                              : "0.00"}
                          </span>
                        </div>
                        {openRouterCredits.data?.usage !== undefined && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Usage:
                            </span>
                            <span className="text-sm font-medium">
                              $
                              {openRouterCredits.data.usage?.toFixed(2) ||
                                "0.00"}
                            </span>
                          </div>
                        )}
                        {openRouterCredits.data?.limit !== undefined && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Limit:
                            </span>
                            <span className="text-sm font-medium">
                              $
                              {openRouterCredits.data.limit?.toFixed(2) ||
                                "0.00"}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <RefreshCw className="size-3 animate-spin" />
                    Updates every 30 seconds
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshAll}
                    disabled={vercelLoading || openRouterLoading}
                    className="h-8"
                  >
                    <RefreshCw
                      className={`size-3 mr-1 ${vercelLoading || openRouterLoading ? "animate-spin" : ""}`}
                    />
                    Refresh Now
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  );
}
