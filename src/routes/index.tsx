import { createFileRoute } from "@tanstack/react-router";
import HeroSection from "../components/HeroSection";
import Navbar from "../components/Navbar";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "MeshMind - Home | AI-Powered Chat Platform",
      },
      {
        name: "description",
        content: "Welcome to MeshMind, your gateway to intelligent AI conversations. Discover seamless integration with top AI models, secure authentication, and collaborative features.",
      },
      {
        name: "keywords",
        content: "AI chat home, MeshMind platform, AI conversations, intelligent chat, AI integration",
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
