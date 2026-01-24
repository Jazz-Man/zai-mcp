import * as Tool from "@effect/ai/Tool";
import { Schema } from "effect";
import { WebReaderResponseSchema } from "../schemas/web-reader";

/**
 * Web Reader Tool for MCP
 *
 * Exposes webReader as an MCP tool for LLMs
 */
export const WebReaderTool = Tool.make("webReader", {
	description:
		"Read and parse content from a specified URL. Returns the page content, title, description, and metadata.",
	success: WebReaderResponseSchema,
	failure: Schema.Never,
	parameters: {
		url: Schema.NonEmptyTrimmedString.annotations({
			description: "The URL to retrieve",
		}),
		timeout: Schema.optional(Schema.Number).annotations({
			description: "Request timeout in seconds",
			default: 20,
		}),
		no_cache: Schema.optional(Schema.Boolean).annotations({
			description: "Whether to disable caching (true/false)",
			default: false,
		}),
		return_format: Schema.optional(
			Schema.Literal("markdown", "text"),
		).annotations({
			description: "Return format (e.g., markdown, text)",
			default: "markdown",
		}),
		retain_images: Schema.optional(Schema.Boolean).annotations({
			description: "Whether to retain images (true/false)",
			default: true,
		}),
		no_gfm: Schema.optional(Schema.Boolean).annotations({
			description: "Whether to disable GitHub Flavored Markdown (true/false)",
			default: false,
		}),
		keep_img_data_url: Schema.optional(Schema.Boolean).annotations({
			description: "Whether to keep image data URLs (true/false)",
			default: false,
		}),
		with_images_summary: Schema.optional(Schema.Boolean).annotations({
			description: "Whether to include image summary (true/false)",
			default: false,
		}),
		with_links_summary: Schema.optional(Schema.Boolean).annotations({
			description: "Whether to include links summary (true/false)",
			default: false,
		}),
	},
});
