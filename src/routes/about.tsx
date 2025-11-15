import { createFileRoute } from "@tanstack/react-router";
import AboutPage from "@/components/AboutPage";
import Navbar from "@/components/Navbar";

export const Route = createFileRoute("/about")({
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
