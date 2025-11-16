import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { useAuthStore } from "../../zustand/AuthStore";

type OAuthProvider = "google" | "github";

const SUPPORTED_PROVIDERS: OAuthProvider[] = ["google", "github"];

export const Route = createFileRoute("/oauth/callback/$provider")({
  head: () => ({
    meta: [
      {
        title: "OAuth Callback - MeshMind",
      },
      {
        name: "robots",
        content: "noindex, nofollow",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
    error_description:
      typeof search.error_description === "string"
        ? search.error_description
        : undefined,
  }),
  component: OAuthCallbackPage,
});

function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { provider } = Route.useParams();
  const { code, state, error, error_description } = Route.useSearch();
  const completeOAuth = useAuthStore((store) => store.completeOAuth);
  const [status, setStatus] = useState<"processing" | "error">("processing");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!SUPPORTED_PROVIDERS.includes(provider as OAuthProvider)) {
      setStatus("error");
      setMessage("Unsupported provider.");
      return;
    }

    if (error) {
      setStatus("error");
      setMessage(error_description ?? error);
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setMessage("Missing authorization details. Please restart sign-in.");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        if (typeof window !== "undefined") {
          try {
            const pendingRaw = window.sessionStorage.getItem(
              "meshmind.oauth.pending"
            );
            if (pendingRaw) {
              const pending = JSON.parse(pendingRaw) as {
                state?: string | null;
              };
              if (pending.state && pending.state !== state) {
                console.warn("OAuth state mismatch detected on client.");
              }
              window.sessionStorage.removeItem("meshmind.oauth.pending");
            }
          } catch {
            // Ignore session storage issues
          }
        }

        await completeOAuth({
          provider: provider as OAuthProvider,
          code,
          state,
        });

        if (!cancelled) {
          toast.success("Signed in successfully");
          navigate({ to: "/dashboard" });
        }
      } catch (err) {
        if (cancelled) return;
        const description =
          err instanceof Error ? err.message : "Please try again.";
        toast.error("Could not complete sign-in", {
          description,
        });
        setStatus("error");
        setMessage(description);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    provider,
    code,
    state,
    error,
    error_description,
    completeOAuth,
    navigate,
  ]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm text-center space-y-4">
        {status === "processing" ? (
          <>
            <Loader2 className="mx-auto size-8 animate-spin text-primary" />
            <h1 className="text-base font-semibold">Signing you in…</h1>
            <p className="text-sm text-muted-foreground">
              Hang tight while we finish connecting your account.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-base font-semibold">Something went wrong</h1>
            {message && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {message}
              </p>
            )}
            <Button
              type="button"
              onClick={() => navigate({ to: "/signinandsignup" })}
            >
              Back to sign in
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
