import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Lightbulb, Zap, Shield, Play, Github } from "lucide-react";
import { HoverBorderGradient } from "./ui/hover-border-gradient";

export default function AboutPage() {
  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden">
      {/* Elegant static grid background */}
      <div className="absolute inset-0 z-0">
        {/* Horizontal lines with varying opacity */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={`h-${i}`}
              className="absolute h-px bg-border opacity-40"
              style={{
                top: `${i * 40}px`,
                left: 0,
                right: 0,
              }}
            />
          ))}
        </div>
        {/* Static grid background - vertical lines */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={`v-${i}`}
              className="absolute w-px bg-border opacity-40"
              style={{
                left: `${i * 40}px`,
                top: 0,
                bottom: 0,
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-20 max-w-6xl">
        {/* Hero Section with Split Layout */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
          <div className="space-y-8">
            <div className="space-y-4">
                <div className="p-1">
                  <HoverBorderGradient
                    as="div"
                    containerClassName="inline-flex"
                    duration={1.5}
                    clockwise={true}
                  >
                    <Lightbulb className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-medium text-primary">
                      About MeshMind
                    </span>
                  </HoverBorderGradient>
                </div>

              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-foreground">MeshMind — </span>
                <span className="bg-linear-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  Collective AI Intelligence
                </span>
              </h1>
            </div>

            <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
              Run multiple AI models simultaneously to compare responses, see
              what's better, save time, and explore more models for clearer,
              more reliable answers.
            </p>

            <div className="flex flex-wrap gap-3">
              <Badge
                variant="secondary"
                className="px-4 py-2 text-sm font-medium bg-primary/5 text-primary border-primary/20"
              >
                Multi-Model
              </Badge>
              <Badge
                variant="secondary"
                className="px-4 py-2 text-sm font-medium bg-primary/5 text-primary border-primary/20"
              >
                Real-time
              </Badge>
              <Badge
                variant="secondary"
                className="px-4 py-2 text-sm font-medium bg-primary/5 text-primary border-primary/20"
              >
                BYOK
              </Badge>
              <Badge
                variant="secondary"
                className="px-4 py-2 text-sm font-medium bg-primary/5 text-primary border-primary/20"
              >
                Secure
              </Badge>
            </div>
          </div>

          {/* Enhanced Project Card */}
          <Card className="p-8 border-0 shadow-2xl bg-linear-to-br from-card/80 to-card/40 backdrop-blur-xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-foreground">
                    MeshMind
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    AI Orchestration Platform
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Built for</div>
                  <div className="text-lg font-bold text-primary">
                    TanStack Hackathon
                  </div>
                </div>
              </div>

              <Separator className="bg-border/50" />

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 mt-0.5">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">
                      Bring Your Own Key (BYOK)
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Full control over AI providers and API keys. Connect
                      OpenRouter, Vercel AI Gateway. Your credentials stay
                      private and secure.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <div className="text-2xl font-bold text-primary">10</div>
                  <div className="text-xs text-muted-foreground">
                    Max Agents
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <div className="text-2xl font-bold text-primary">∞</div>
                  <div className="text-xs text-muted-foreground">Models</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Core Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-linear-to-br from-card/60 to-card/30 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-linear-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-colors">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl font-semibold">
                  Multi-Agent Orchestration
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                Run up to 10 AI agents simultaneously with custom prompts and
                personalities. Compare responses, identify consensus, and reduce
                single-model limitations.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-linear-to-br from-card/60 to-card/30 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-linear-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-colors">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl font-semibold">
                  Real-Time Streaming
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                Watch responses unfold live with our segmented UI. See each
                agent's reasoning process, compare outputs instantly, and make
                informed decisions.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-linear-to-br from-card/60 to-card/30 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-linear-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-colors">
                  <Github className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl font-semibold">
                  Privacy First
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                BYOK architecture ensures your API keys never leave your device.
                OAuth authentication with secure JWT tokens for complete peace
                of mind.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Why We Built It Section */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Why I Built MeshMind
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            In a world of increasingly sophisticated AI, we saw an opportunity
            to harness collective intelligence rather than relying on
            single-model responses.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 mb-20">
          <Card className="border-0 shadow-xl bg-linear-to-br from-card/80 to-card/40 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                The Problem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                Traditional AI chat applications rely on single models, creating
                inherent biases and blind spots. Each model has unique training
                data, algorithmic approaches, and potential failure modes.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                What if we could combine multiple perspectives? What if AI could
                collaborate and cross-verify its own outputs?
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-linear-to-br from-card/80 to-card/40 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                The Solution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                MeshMind orchestrates multiple AI agents simultaneously,
                creating a "mesh" of diverse perspectives that collectively
                provide more balanced, comprehensive, and reliable insights.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Built for the TanStack Hackathon, it demonstrates modern React
                patterns, type-safe routing, and streaming UIs in a real-world
                application.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tech Stack Showcase */}
        <Card className="mb-20 border-0 shadow-xl bg-linear-to-br from-card/60 to-card/30 backdrop-blur-sm">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-3xl font-bold">
              Built with Modern Tools
            </CardTitle>
            <CardDescription className="text-lg">
              Leveraging the best of modern web development
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center p-6 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="text-2xl font-bold text-primary mb-2">
                  TanStack
                </div>
                <div className="text-sm text-muted-foreground">
                  Start • Router • Query
                </div>
              </div>
              <div className="text-center p-6 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="text-2xl font-bold text-primary mb-2">
                  TypeScript
                </div>
                <div className="text-sm text-muted-foreground">Type Safety</div>
              </div>
              <div className="text-center p-6 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="text-2xl font-bold text-primary mb-2">
                  Convex
                </div>
                <div className="text-sm text-muted-foreground">
                  Real-time Backend
                </div>
              </div>
              <div className="text-center p-6 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="text-2xl font-bold text-primary mb-2">
                  Tailwind
                </div>
                <div className="text-sm text-muted-foreground">
                  Modern Styling
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Video Section */}
        <Card className="mb-20 border-0 shadow-2xl bg-linear-to-br from-card/80 to-card/40 backdrop-blur-xl">
          <CardHeader className="text-center pb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Play className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-3xl font-bold">
                See MeshMind in Action
              </CardTitle>
            </div>
            <CardDescription className="text-lg">
              Watch how multiple AI models collaborate in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-linear-to-br from-muted/30 to-muted/10 rounded-2xl flex items-center justify-center border border-border/30 shadow-inner">
              <div className="text-center space-y-6">
                <div className="p-6 bg-linear-to-br from-primary/20 to-primary/10 rounded-full w-fit mx-auto shadow-lg">
                  <Play className="h-16 w-16 text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-foreground">
                    Demo Coming Soon
                  </p>
                  <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
                    I'll show you how to configure agents, add your API keys,
                    and orchestrate multiple AI models for better results.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced CTA */}
        <div className="text-center space-y-12">
          <Separator className="opacity-30" />

          <div className="space-y-8">
            <HoverBorderGradient
              duration={2}
              clockwise={true}
            >
              <div className="p-2 rounded-full bg-primary/20">
                <Lightbulb className="h-5 w-5 text-primary" />
              </div>
              <span className="text-lg font-medium text-primary">
                Ready to orchestrate AI?
              </span>
            </HoverBorderGradient>

            <h2 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              Start Building Your
              <span className="block bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                AI Mesh Today
              </span>
            </h2>

            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Connect your preferred AI providers, configure your agents, and
              experience the power of collective AI intelligence. Your API keys
              stay secure, your data stays private.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Button
              size="lg"
              className="px-10 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-shadow"
              asChild
            >
              <a href="/" className="flex items-center gap-3">
                <Zap className="h-5 w-5" />
                Try MeshMind Now
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-10 py-4 text-lg font-semibold border-2 hover:bg-primary/5 transition-colors"
              asChild
            >
              <a
                href="https://github.com/Srijan-Baniyal/tanstack_hackathon"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3"
              >
                <Github className="h-5 w-5" />
                View Source Code
              </a>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Built with ❤️ for the TanStack Hackathon • BYOK • Privacy First
          </p>
        </div>
      </div>
    </div>
  );
}
