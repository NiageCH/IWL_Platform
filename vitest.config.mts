import { defineConfig } from "vitest/config";

/**
 * Tests de unidad. Los tests de RLS van aparte porque necesitan Supabase
 * local levantado: ver `vitest.rls.config.mts`.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "components/**/*.test.tsx"],
    exclude: ["tests/rls/**", "tests/e2e/**", "node_modules/**"],
  },
});
