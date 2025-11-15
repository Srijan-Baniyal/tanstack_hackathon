import { createFileRoute } from "@tanstack/react-router";
import HeroSection from "@/components/HeroSection";
import Navbar from "@/components/Navbar";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "MeshMind - AI Orchestration Platform",
      },
      {
        name: "description",
        content: "Orchestrate multiple AI models simultaneously to compare responses, see what's better, save time, and explore more models for clearer, more reliable answers.",
      },
    ],
  }),
  component: App,
});

function App() {
  return (
    <>
      <Navbar />
      <HeroSection />
    </>
  );
}
