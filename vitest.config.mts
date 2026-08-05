import { defineConfig, configDefaults } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // Agent worktrees (created by the coding assistant for isolated work)
    // live under .claude/worktrees inside this repo — exclude them
    // explicitly, or vitest's default glob picks up their test files too
    // and silently double-runs (and double-reports) every suite.
    exclude: [...configDefaults.exclude, ".claude/worktrees/**"],
  },
});
