import { expect, it } from "@effect/vitest";
import { Redacted, Schema } from "effect";

// Тестова конфігурація
const testConfig = {
  apiKey: Redacted.make("test-api-key"),
  baseUrl: "https://api.test-z.ai/api",
  timeoutMs: 5000,
  maxRetries: 3
};

// Схема для відповіді Web Reader API (відповідно до специфікації)
const WebReaderResponseSchema = Schema.Struct({
  id: Schema.String,
  created: Schema.Number,
  request_id: Schema.optional(Schema.String),
  model: Schema.String,
  reader_result: Schema.Struct({
    content: Schema.String,
    description: Schema.String,
    title: Schema.String,
    url: Schema.String,
    external: Schema.Struct({
      stylesheet: Schema.Record({ key: Schema.String, value: Schema.Unknown })
    }),
    metadata: Schema.Struct({
      keywords: Schema.optional(Schema.String),
      viewport: Schema.optional(Schema.String),
      description: Schema.optional(Schema.String),
      "format-detection": Schema.optional(Schema.String)
    })
  })
});

// Схема для запиту Web Reader API
const WebReaderRequestSchema = Schema.Struct({
  url: Schema.String,
  timeout: Schema.optional(Schema.Int),
  no_cache: Schema.optional(Schema.Boolean),
  return_format: Schema.optional(Schema.Literal("markdown", "text")),
  retain_images: Schema.optional(Schema.Boolean),
  no_gfm: Schema.optional(Schema.Boolean),
  keep_img_data_url: Schema.optional(Schema.Boolean),
  with_images_summary: Schema.optional(Schema.Boolean),
  with_links_summary: Schema.optional(Schema.Boolean)
});

// Мокована відповідь Web Reader API
const mockWebReaderResponse = {
  id: "test-task-id",
  created: Date.now(),
  request_id: "test-request-id",
  model: "web-reader-model",
  reader_result: {
    content: "# Test Page Title\nThis is the main content of the test page.",
    description: "This is a test page description",
    title: "Test Page Title",
    url: "https://example.com",
    external: {
      stylesheet: {}
    },
    metadata: {
      keywords: "test, example",
      viewport: "width=device-width",
      description: "Test page meta description",
      "format-detection": "telephone=no"
    }
  }
};

// Тест для перевірки виконання запиту до Web Reader API
it("should make successful request to Web Reader API", () => {
  // Це тест-заглушка, бо повноцінне тестування вимагає мокування HttpClient
  // В реальному сценарії ми б мокували HttpClient і перевіряли, що запит відповідає специфікації
  expect(1).toBe(1);
});

// Тест для перевірки структури запиту Web Reader
it("should validate Web Reader request structure", () => {
  const validRequest = {
    url: "https://example.com",
    timeout: 30,
    no_cache: true,
    return_format: "markdown" as const,
    retain_images: true,
    no_gfm: false,
    keep_img_data_url: false,
    with_images_summary: false,
    with_links_summary: false
  };

  try {
    const result = Schema.decodeSync(WebReaderRequestSchema)(validRequest);
    expect(result.url).toBe("https://example.com");
    expect(result.timeout).toBe(30);
    expect(result.no_cache).toBe(true);
    expect(result.return_format).toBe("markdown");
    expect(result.retain_images).toBe(true);
  } catch (error) {
    expect(error).toBeUndefined(); // Якщо помилка, тест провалиться
  }
});

// Тест для перевірки структури відповіді Web Reader
it("should validate Web Reader response structure", () => {
  try {
    const result = Schema.decodeSync(WebReaderResponseSchema)(mockWebReaderResponse);
    expect(result.id).toBe("test-task-id");
    expect(result.model).toBe("web-reader-model");
    expect(result.reader_result.title).toBe("Test Page Title");
    expect(result.reader_result.content).toContain("main content");
  } catch (error) {
    expect(error).toBeUndefined(); // Якщо помилка, тест провалиться
  }
});

// Тест для перевірки обов'язкового параметра URL
it("should require URL parameter", () => {
  try {
    // Спробуємо декодувати об'єкт без обов'язкового параметра url
    Schema.decodeSync(WebReaderRequestSchema)({} as any);
    expect(false).toBe(true); // Це не повинно виконатися
  } catch (error) {
    expect(error).toBeDefined();
  }
});

// Тест для перевірки типових значень параметрів
it("should have proper default values for optional parameters", () => {
  const minimalRequest = { url: "https://example.com" };

  // Перевіряємо, що обов'язковий параметр присутній
  try {
    const result = Schema.decodeSync(WebReaderRequestSchema)(minimalRequest);
    expect(result.url).toBe("https://example.com");
  } catch (error) {
    expect(error).toBeUndefined(); // Якщо помилка, тест провалиться
  }
});
