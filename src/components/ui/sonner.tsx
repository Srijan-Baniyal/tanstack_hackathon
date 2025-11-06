import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { cn } from "@/lib/utils";

type ToastOptions = NonNullable<ToasterProps["toastOptions"]>;

const DEFAULT_TOAST_CLASSNAMES: ToastOptions["classNames"] = {
  toast:
    "group/toast pointer-events-auto relative flex w-full max-w-sm items-start gap-3 rounded-2xl border border-border/60 bg-card/95 px-5 py-4 shadow-xl shadow-primary/10 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md data-[type=success]:border-primary/60 data-[type=error]:border-destructive/60 data-[type=warning]:border-amber-500/60",
  content: "flex flex-col gap-1",
  title: "text-sm font-semibold leading-tight text-foreground",
  description: "text-xs text-muted-foreground leading-relaxed",
  icon: "mt-0.5 flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner shadow-primary/20 data-[type=error]:bg-destructive/15 data-[type=error]:text-destructive data-[type=warning]:bg-amber-500/15 data-[type=warning]:text-amber-500",
  actionButton:
    "rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:shadow-xl hover:bg-primary/90",
  cancelButton:
    "rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted/80",
  closeButton: "text-muted-foreground transition hover:text-foreground",
};

const DEFAULT_TOAST_OPTIONS: ToastOptions = {
  duration: 4000,
  classNames: DEFAULT_TOAST_CLASSNAMES,
};

const BASE_STYLE = {
  "--normal-bg": "var(--card)",
  "--normal-border": "var(--border)",
  "--normal-text": "var(--foreground)",
  "--success-bg": "color-mix(in srgb, var(--card) 92%, var(--primary) 8%)",
  "--success-border": "color-mix(in srgb, var(--primary) 70%, transparent)",
  "--success-text": "var(--primary)",
  "--error-bg": "color-mix(in srgb, var(--card) 90%, var(--destructive) 10%)",
  "--error-border": "color-mix(in srgb, var(--destructive) 65%, transparent)",
  "--error-text": "var(--destructive)",
  "--warning-bg":
    "color-mix(in srgb, var(--card) 90%, rgba(251, 191, 36, 1) 10%)",
  "--warning-border":
    "color-mix(in srgb, rgba(251, 191, 36, 1) 60%, transparent)",
  "--warning-text": "rgba(251, 191, 36, 1)",
  "--border-radius": "var(--radius)",
} as React.CSSProperties;

const Toaster = ({
  className,
  toastOptions,
  style,
  ...props
}: ToasterProps) => {
  const { theme = "system" } = useTheme();

  const mergedToastOptions: ToastOptions = {
    ...DEFAULT_TOAST_OPTIONS,
    ...toastOptions,
    classNames: {
      ...DEFAULT_TOAST_OPTIONS.classNames,
      ...toastOptions?.classNames,
    },
  };

  const mergedStyle: React.CSSProperties = {
    ...BASE_STYLE,
    ...(style ?? {}),
  };

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className={cn("toaster pointer-events-none", className)}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={mergedToastOptions}
      style={mergedStyle}
      {...props}
    />
  );
};

export { Toaster };
