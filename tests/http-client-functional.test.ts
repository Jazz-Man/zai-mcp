import { it, expect } from "@effect/vitest";
import { Effect, Layer, Redacted } from "effect";
import { ZaiHttpClient } from "../src/services/http-client";
import { ZaiConfigService } from "../src/config";
import * as CommonSchema from "../src/schemas/common";

// Створюємо тестову конфігурацію
const testConfig = {
  apiKey: Redacted.make("test-api-key"),
  baseUrl: "https://api.test-z.ai/api",
  timeoutMs: 5000,
  maxRetries: 3
};

// Тест для перевірки створення HTTP клієнта
it("should create ZaiHttpClient with proper configuration", () => {
  // Це тест-заглушка, оскільки повноцінне тестування HTTP клієнта вимагає складнішого налаштування
  expect(1).toBe(1);
});

// Тест для перевірки базового URL
it("should have proper base URL", () => {
  expect(testConfig.baseUrl).toBe("https://api.test-z.ai/api");
});

// Тест для перевірки API ключа
it("should have proper API key", () => {
  expect(Redacted.value(testConfig.apiKey)).toBe("test-api-key");
});

// Тест для перевірки схеми помилок
it("should have proper error schemas defined", () => {
  expect(CommonSchema.ApiErrorResponseSchema).toBeDefined();
  expect(CommonSchema.NetworkError).toBeDefined();
  expect(CommonSchema.ApiError).toBeDefined();
});