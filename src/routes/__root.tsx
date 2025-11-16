import { useState } from "react";
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexProvider } from "convex/react";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import appCss from "../styles.css?url";
import ThemeProvider from "../provider/ThemeProvider";
import { Toaster } from "../components/ui/sonner";
import { convexClient } from "../lib/convexClient";

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
        title: "MeshMind - AI-Powered Chat and Collaboration Platform",
      },
      {
        name: "description",
        content: "Experience the future of AI-driven conversations with MeshMind. Seamlessly integrate multiple AI models, manage chats, and collaborate effortlessly on innovative projects.",
      },
      {
        name: "keywords",
        content: "AI chat, artificial intelligence, conversation platform, MeshMind, AI integration, collaborative tools, machine learning",
      },
      {
        name: "author",
        content: "MeshMind Team",
      },
      {
        name: "robots",
        content: "index, follow",
      },
      {
        property: "og:title",
        content: "MeshMind - AI-Powered Chat and Collaboration Platform",
      },
      {
        property: "og:description",
        content: "Experience the future of AI-driven conversations with MeshMind. Seamlessly integrate multiple AI models, manage chats, and collaborate effortlessly on innovative projects.",
      },
      {
        property: "og:image",
        content: "/og-image.png", // Add your OG image
      },
      {
        property: "og:url",
        content: "https://startathon.netlify.app/", // Replace with your domain
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:title",
        content: "MeshMind - AI-Powered Chat and Collaboration Platform",
      },
      {
        name: "twitter:description",
        content: "Experience the future of AI-driven conversations with MeshMind. Seamlessly integrate multiple AI models, manage chats, and collaborate effortlessly on innovative projects.",
      },
      {
        name: "twitter:image",
        content: "/og-image.png", // Add your Twitter image
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "canonical",
        href: "https://startathon.netlify.app/", // Replace with your domain
      },
      {
        rel: "icon",
        type: "image/x-icon",
        href: "/favicon.ico",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "MeshMind",
              "description": "AI-Powered Chat and Collaboration Platform",
              "url": "https://meshmind.app",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "creator": {
                "@type": "Organization",
                "name": "MeshMind Team"
              }
            })
          }}
        />
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
