import { expect, it } from "@effect/vitest";
import { Redacted } from "effect";

// Тестова конфігурація
const testConfig = {
  apiKey: Redacted.make("test-api-key"),
  baseUrl: "https://api.test-z.ai/api",
  timeoutMs: 5000,
  maxRetries: 3
};

// Простий тест для перевірки конфігурації
it("should have proper configuration values", () => {
  expect(Redacted.value(testConfig.apiKey)).toBe("test-api-key");
  expect(testConfig.baseUrl).toBe("https://api.test-z.ai/api");
  expect(testConfig.timeoutMs).toBe(5000);
  expect(testConfig.maxRetries).toBe(3);
});

// Тест для перевірки функціональності Redacted
it("should properly handle redacted API key", () => {
  const apiKey = Redacted.make("secret-key");
  expect(Redacted.value(apiKey)).toBe("secret-key");
});
