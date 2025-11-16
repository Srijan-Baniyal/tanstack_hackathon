import { createFileRoute } from "@tanstack/react-router";
import { SignInAndSignUp } from "../components/SignInAndUp";
import Navbar from "../components/Navbar";

export const Route = createFileRoute("/signinandsignup")({
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
