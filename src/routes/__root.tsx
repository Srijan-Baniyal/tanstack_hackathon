import { useState } from "react";
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
        title: "MeshMind - AI Orchestration Platform",
      },
      {
        name: "description",
        content: "Orchestrate multiple AI models simultaneously to compare responses, see what's better, save time, and explore more models for clearer, more reliable answers.",
      },
      // Open Graph
      {
        property: "og:title",
        content: "MeshMind - AI Orchestration Platform",
      },
      {
        property: "og:description",
        content: "Orchestrate multiple AI models simultaneously to compare responses, see what's better, save time, and explore more models for clearer, more reliable answers.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:url",
        content: "https://your-domain.com", // Replace with your actual domain
      },
      {
        property: "og:image",
        content: "/og_image.png",
      },
      // Twitter Card
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:title",
        content: "MeshMind - AI Orchestration Platform",
      },
      {
        name: "twitter:description",
        content: "Orchestrate multiple AI models simultaneously to compare responses, see what's better, save time, and explore more models for clearer, more reliable answers.",
      },
      {
        name: "twitter:image",
        content: "/og_image.png",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      // Favicon
      {
        rel: "icon",
        type: "image/x-icon",
        href: "/favicon/favicon.ico",
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon/favicon.svg",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "96x96",
        href: "/favicon/favicon-96x96.png",
      },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/favicon/apple-touch-icon.png",
      },
      {
        rel: "manifest",
        href: "/favicon/site.webmanifest",
      },
    ],
  }),

  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
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
        </QueryClientProvider>
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
