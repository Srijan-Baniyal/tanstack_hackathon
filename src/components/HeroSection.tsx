import { Button } from "@/components/ui/button";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { ArrowRight, GitBranch } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/zustand/AuthStore";

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden flex flex-col items-center justify-center">
      {/* Animated grid background - horizontal lines */}
      <div className="absolute inset-0 z-0">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute h-px bg-border opacity-40"
            style={{
              top: `${i * 40}px`,
              left: 0,
              right: 0,
              transformOrigin: i % 2 === 0 ? "left" : "right",
              transform: isVisible ? "scaleX(1)" : "scaleX(0)",
              transition: `transform ${1.8 + Math.sin(i * 0.1) * 0.3}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * 0.04 + Math.random() * 0.02}s`,
            }}
          />
        ))}
      </div>

      {/* Animated grid background - vertical lines */}
      <div className="absolute inset-0 z-0">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute w-px bg-border opacity-40"
            style={{
              left: `${i * 40}px`,
              top: 0,
              bottom: 0,
              transformOrigin: i % 2 === 0 ? "top" : "bottom",
              transform: isVisible ? "scaleY(1)" : "scaleY(0)",
              transition: `transform ${1.6 + Math.sin(i * 0.15) * 0.4}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * 0.025 + Math.random() * 0.015}s`,
            }}
          />
        ))}
      </div>
      {/* Hero content */}
      <div className="relative mx-auto max-w-5xl px-6 text-center">
        {/* Badge */}
        <div className="mb-8">
          <HoverBorderGradient
            as="div"
            containerClassName="inline-flex"
            duration={1.5}
            clockwise={true}
          >
            <GitBranch className="h-3.5 w-3.5" />
            <span>Multi-Model Research Orchestrator</span>
          </HoverBorderGradient>
        </div>

        {/* Headline */}
        <h1 className="mb-6 text-balance font-sans text-5xl font-semibold tracking-tight text-foreground lg:text-7xl">
          MeshMind — Orchestrate Multiple{" "}
          <span className="text-muted-foreground">AI Models.</span>
        </h1>

        {/* Sub-headline */}
        <p className="mx-auto mb-12 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground lg:text-xl">
          Configure up to 10 AI agents with custom system prompts, stream
          responses in real-time, and compare different models side-by-side in
          a beautiful segmented interface.
        </p>

        {/* Feature bullets */}
        <div className="mb-12 flex flex-wrap items-center justify-center gap-6 text-sm text-foreground lg:gap-8 lg:text-base">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
            <span>Multi-agent streaming</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
            <span>Custom system prompts</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
            <span>Model comparison</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
            <span>OAuth & secure auth</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            className="group gap-2 px-8"
            onClick={() =>
              navigate({ to: user ? "/dashboard" : "/signinandsignup" })
            }
          >
            Get Started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
        {/* Subtle hint text */}
        <p className="mt-12 text-xs text-muted-foreground">
          Powered by OpenRouter · Vercel AI · Convex · TanStack Start · FireCrawl · Cloudflare
        </p>
      </div>
    </div>
  );
}
