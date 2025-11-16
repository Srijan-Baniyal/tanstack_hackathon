// vite.config.ts
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import netlify from "@netlify/vite-plugin-tanstack-start"; // ← add this
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    tanstackStart(),
    netlify(), // ← add this (anywhere in the array is fine)
    viteReact(),
  ],
});
