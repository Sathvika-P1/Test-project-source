import { defineConfig } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3000);
const apiPort = 3101;

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: `http://localhost:${port}` },
  webServer: [
    {
      // Fake Shop API so e2e needs no database; must be up before the web build.
      command: "node e2e/fake-api.mjs",
      url: `http://localhost:${apiPort}/health`,
      env: { FAKE_API_PORT: String(apiPort) },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `pnpm build && pnpm start -p ${port}`,
      url: `http://localhost:${port}`,
      env: { SHOP_API_URL: `http://localhost:${apiPort}` },
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
    },
  ],
});
