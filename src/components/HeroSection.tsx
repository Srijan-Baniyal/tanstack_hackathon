"use client";

import { Button } from "@/components/ui/button";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { ArrowRight, GitBranch } from "lucide-react";
import { useEffect, useState } from "react";

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);

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
          PolyMind — One Question.{" "}
          <span className="text-muted-foreground">Many Minds.</span>
        </h1>

        {/* Sub-headline */}
        <p className="mx-auto mb-12 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground lg:text-xl">
          A multi-model research orchestrator that queries multiple LLMs in
          parallel and synthesizes their reasoning into one collective
          consensus.
        </p>

        {/* Feature bullets */}
        <div className="mb-12 flex flex-wrap items-center justify-center gap-6 text-sm text-foreground lg:gap-8 lg:text-base">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
            <span>No single-model bias</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
            <span>Automatic multi-AI comparison</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
            <span>RPC-powered orchestration</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
            <span>Consensus reasoning in one click</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" className="group gap-2 px-8">
            Try a query
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="gap-2 px-8 bg-background/20 backdrop-blur-xl backdrop-saturate-150 backdrop-brightness-110 border border-white/10 shadow-2xl shadow-black/20"
          >
            View architecture
          </Button>
        </div>

        {/* Subtle hint text */}
        <p className="mt-12 text-xs text-muted-foreground">
          GPT · Claude · Gemini · GLM
        </p>
      </div>
    </div>
  );
}
