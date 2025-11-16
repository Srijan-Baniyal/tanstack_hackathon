import { createFileRoute } from "@tanstack/react-router";
import { SignInAndSignUp } from "../components/SignInAndUp";
import Navbar from "../components/Navbar";

export const Route = createFileRoute("/signinandsignup")({
  head: () => ({
    meta: [
      {
        title: "Sign In / Sign Up - MeshMind",
      },
      {
        name: "description",
        content: "Sign in to your MeshMind account or create a new one to start using our AI-powered chat platform.",
      },
      {
        name: "robots",
        content: "noindex, nofollow",
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center p-4">
        <SignInAndSignUp />
      </div>
    </>
  );
}
