import { MorphingText } from "@/components/ui/morphing";
import { useMemo } from "react";
import { useAuthStore } from "@/zustand/AuthStore";

export default function ChatEmptyState() {
  const user = useAuthStore((state) => state.user);

  const { greeting, messages } = useMemo(() => {
    const hour = new Date().getHours();
    const fullName = user?.fullName || "";

    if (hour >= 5 && hour < 12) {
      return {
        greeting: `Good Morning${fullName ? `, ${fullName}` : ""}`,
        messages: [
          "Start your creative day ☀️",
          "Start your amazing day 💡",
          "Start your perfect day ✨",
        ],
      };
    } else if (hour >= 12 && hour < 17) {
      return {
        greeting: `Good Afternoon${fullName ? `, ${fullName}` : ""}`,
        messages: [
          "Keep creating great work 🚀",
          "Keep creating new ideas 💪",
          "Keep creating your best ✨",
        ],
      };
    } else if (hour >= 17 && hour < 22) {
      return {
        greeting: `Good Evening${fullName ? `, ${fullName}` : ""}`,
        messages: [
          "Time to reflect and rest 🌅",
          "Time to reflect and chat 💭",
          "Time to reflect and plan 🌟",
        ],
      };
    } else {
      return {
        greeting: `Still Going Strong${fullName ? `, ${fullName}` : ""}`,
        messages: [
          "Creative hours ahead 🦉",
          "Creative ideas ahead 🎨",
          "Creative magic ahead 💫",
        ],
      };
    }
  }, [user?.fullName]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-xl space-y-6">
        <div className="space-y-3">
          <h2 className="text-lg md:text-xl font-medium text-muted-foreground">
            {greeting} 👋
          </h2>
          <MorphingText
            key={`${greeting}-morphing`}
            className="text-2xl md:text-3xl font-semibold text-foreground max-w-2xl"
            text={messages}
            loop={true}
            holdDelay={2500}
          />
        </div>
      </div>
    </div>
  );
}
