import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Zap, Clock, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { cn } from "../../lib/utils";

interface AgentPerformance {
  agentIndex: number;
  provider: string;
  modelId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: "waiting" | "running" | "complete" | "error";
}

interface PerformanceStatsProps {
  agentCount: number;
  isStreaming: boolean;
  className?: string;
}

export default function PerformanceStats({
  agentCount,
  isStreaming,
  className,
}: PerformanceStatsProps) {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [agents, setAgents] = useState<AgentPerformance[]>([]);

  useEffect(() => {
    if (isStreaming && !startTime) {
      const now = Date.now();
      setStartTime(now);

      // Initialize agents as waiting
      setAgents(
        Array.from({ length: agentCount }, (_, i) => ({
          agentIndex: i + 1,
          provider: "unknown",
          startTime: now,
          status: "running" as const,
        }))
      );
    } else if (!isStreaming && startTime) {
      // Mark all as complete when streaming stops
      setAgents((prev) =>
        prev.map((agent) => ({
          ...agent,
          endTime: agent.endTime || Date.now(),
          duration: agent.duration || Date.now() - agent.startTime,
          status: agent.status === "running" ? ("complete" as const) : agent.status,
        }))
      );
    }
  }, [isStreaming, startTime, agentCount]);

  useEffect(() => {
    if (!isStreaming || !startTime) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [isStreaming, startTime]);

  // Reset when new streaming starts
  useEffect(() => {
    if (!isStreaming) {
      setStartTime(null);
    }
  }, [isStreaming]);

  const completedCount = agents.filter((a) => a.status === "complete").length;
  const runningCount = agents.filter((a) => a.status === "running").length;
  const errorCount = agents.filter((a) => a.status === "error").length;

  const averageDuration =
    completedCount > 0
      ? agents
          .filter((a) => a.duration !== undefined)
          .reduce((sum, a) => sum + (a.duration || 0), 0) / completedCount
      : 0;

  const sequentialTime =
    agents.reduce((sum, a) => sum + (a.duration || 0), 0);

  const parallelTime = Math.max(...agents.map((a) => a.duration || 0), 0);

  const timeSaved = sequentialTime - parallelTime;
  const speedup = sequentialTime > 0 ? sequentialTime / parallelTime : 1;

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (agentCount <= 1) {
    return null;
  }

  return (
    <Card className={cn("border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            Parallel Execution Stats
          </CardTitle>
          {isStreaming && (
            <Badge variant="outline" className="animate-pulse border-blue-500/50 text-blue-400">
              <div className="size-2 rounded-full bg-blue-400 mr-2 animate-ping" />
              Live
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              Elapsed
            </div>
            <div className="text-lg font-bold text-primary">
              {isStreaming ? formatTime(elapsedTime) : formatTime(parallelTime)}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="size-3" />
              Completed
            </div>
            <div className="text-lg font-bold text-emerald-400">
              {completedCount}/{agentCount}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="size-3" />
              Speedup
            </div>
            <div className="text-lg font-bold text-blue-400">
              {speedup > 1 ? `${speedup.toFixed(1)}x` : "-"}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Zap className="size-3" />
              Time Saved
            </div>
            <div className="text-lg font-bold text-violet-400">
              {timeSaved > 0 ? formatTime(timeSaved) : "-"}
            </div>
          </div>
        </div>

        {/* Agent Status Bars */}
        {!isStreaming && agents.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="text-xs font-medium text-muted-foreground">
              Agent Performance
            </div>
            {agents.map((agent) => {
              const percentage = agent.duration && parallelTime > 0
                ? (agent.duration / parallelTime) * 100
                : 0;

              return (
                <div key={agent.agentIndex} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Agent {agent.agentIndex}
                    </span>
                    <span className="font-mono text-primary">
                      {agent.duration ? formatTime(agent.duration) : "-"}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        agent.status === "complete"
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                          : agent.status === "error"
                            ? "bg-gradient-to-r from-red-500 to-red-400"
                            : "bg-gradient-to-r from-blue-500 to-blue-400"
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Comparison */}
        {!isStreaming && sequentialTime > 0 && (
          <div className="pt-2 border-t border-border/50 space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              Execution Comparison
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1 p-2 rounded-lg bg-muted/50">
                <div className="text-muted-foreground">Sequential</div>
                <div className="font-mono font-bold text-red-400">
                  {formatTime(sequentialTime)}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  (one by one)
                </div>
              </div>
              <div className="space-y-1 p-2 rounded-lg bg-primary/10">
                <div className="text-muted-foreground">Parallel</div>
                <div className="font-mono font-bold text-emerald-400">
                  {formatTime(parallelTime)}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  (concurrent)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Real-time indicator */}
        {isStreaming && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
            <div className="flex gap-1">
              <div
                className="size-1.5 rounded-full bg-blue-400 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="size-1.5 rounded-full bg-blue-400 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="size-1.5 rounded-full bg-blue-400 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
            <span className="text-blue-400 font-medium">
              Processing {runningCount} agent{runningCount !== 1 ? "s" : ""} in parallel...
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
