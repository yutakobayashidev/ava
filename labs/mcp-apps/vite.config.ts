import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const entry = process.env.VITE_ENTRY || "ui-react";

export default defineConfig({
  root: "src",
  plugins: [react(), viteSingleFile()],
  build: {
    rollupOptions: {
      input: resolve(__dirname, "src", `${entry}.html`),
    },
    outDir: `dist`,
    emptyOutDir: false,
  },
});
