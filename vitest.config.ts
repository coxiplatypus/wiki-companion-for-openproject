// Overview: Vitest unit-test configuration used for fast local checks.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    globals: true
  }
});
