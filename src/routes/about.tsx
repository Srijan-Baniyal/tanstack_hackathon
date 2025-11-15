import { createFileRoute } from "@tanstack/react-router";
import AboutPage from "@/components/AboutPage";
import Navbar from "@/components/Navbar";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      {
        title: "About MeshMind - AI Orchestration Platform",
      },
      {
        name: "description",
        content: "Learn about MeshMind, a platform that orchestrates multiple AI models simultaneously for better, more reliable answers through collective intelligence.",
      },
      {
        property: "og:title",
        content: "About MeshMind - AI Orchestration Platform",
      },
      {
        property: "og:description",
        content: "Learn about MeshMind, a platform that orchestrates multiple AI models simultaneously for better, more reliable answers through collective intelligence.",
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
