import { createFileRoute } from "@tanstack/react-router";
import AboutPage from "../components/AboutPage";
import Navbar from "../components/Navbar";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      {
        title: "About MeshMind | Learn About Our AI Platform",
      },
      {
        name: "description",
        content: "Learn more about MeshMind, a cutting-edge AI-powered chat and collaboration platform. Discover our mission, features, and how we're revolutionizing AI interactions.",
      },
      {
        name: "keywords",
        content: "about MeshMind, AI platform info, chat collaboration, AI features, MeshMind mission",
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Navbar />
      <AboutPage />
    </>
  );
}
