import { createFileRoute } from "@tanstack/react-router";
import HeroSection from "@/components/HeroSection";
import Navbar from "@/components/Navbar";
export const Route = createFileRoute("/")({ component: App });

function App() {
  return (
    <>
      <Navbar />
      <HeroSection />
    </>
  );
}
