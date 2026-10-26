import { defineConfig } from "@playwright/test";

const port = 3000;

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: `http://localhost:${port}` },
  webServer: {
    command: "pnpm build && pnpm start",
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
