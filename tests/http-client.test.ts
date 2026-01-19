import { expect, it } from "@effect/vitest";
import { Redacted } from "effect";

it("should properly construct config values", () => {
  const config = {
    apiKey: Redacted.make("test-api-key"),
    baseUrl: "https://api.test-z.ai/api",
    timeoutMs: 5000,
    maxRetries: 3
  };

  expect(Redacted.value(config.apiKey)).toBe("test-api-key");
  expect(config.baseUrl).toBe("https://api.test-z.ai/api");
  expect(config.timeoutMs).toBe(5000);
  expect(config.maxRetries).toBe(3);
});
