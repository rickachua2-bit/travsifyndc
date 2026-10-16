// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    importProtection: {
      client: {
        // These modules export compiler-transformed RPCs, not server helpers.
        // Keep the rest of src/server protected from browser imports.
        excludeFiles: ["**/node_modules/**", "**/server/*.functions.ts", "**/server/booking-engine.ts"],
      },
    },
  },
});
