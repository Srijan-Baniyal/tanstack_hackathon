import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { ConvexProvider } from "convex/react";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import appCss from "../styles.css?url";
import ThemeProvider from "@/provider/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { convexClient } from "@/lib/convexClient";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "TanStack Start Starter",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ConvexProvider client={convexClient}>
          <ThemeProvider>
            {children}
            <Toaster
              position="top-center"
              expand
              visibleToasts={5}
              toastOptions={{ duration: 4500 }}
            />
          </ThemeProvider>
        </ConvexProvider>
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
