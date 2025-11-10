import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsIcon, Plus, Trash2 } from "lucide-react";
import { getSettings, saveSettings, type Settings } from "@/lib/settings";

type SettingsFormValues = {
  openRouterKey: string;
  vercelAiGateway: string;
  systemPrompts: string[];
};

export default function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");

  const initialSettings = getSettings();

  const form = useForm({
    defaultValues: {
      openRouterKey: initialSettings.openRouterKey || "",
      vercelAiGateway: initialSettings.vercelAiGateway || "",
      systemPrompts: initialSettings.systemPrompts || [],
    } as SettingsFormValues,
    onSubmit: async ({ value }) => {
      console.log("Form submitted with values:", value);
      saveSettings(value as Settings);
      setOpen(false);
    },
  });

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
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="sk-or-v1-..."
                      type="password"
                    />
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
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="https://gateway.vercel.ai/..."
                    />
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
            </TabsContent>

            <TabsContent value="tools" className="space-y-4 mt-4">
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">
                  Additional tools coming soon, innit! 🚀
                </p>
                <p className="text-muted-foreground text-xs mt-2">
                  We're cooking up some proper features for you.
                </p>
              </div>
            </TabsContent>
          </Tabs>

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
                <Button type="submit" disabled={!canSubmit}>
                  {isSubmitting ? "Saving..." : "Save Settings"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
