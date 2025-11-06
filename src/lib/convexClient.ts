import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  // Fail fast so misconfiguration is caught during development.
  throw new Error("Missing VITE_CONVEX_URL environment variable.");
}

export const convexClient = new ConvexReactClient(convexUrl);
