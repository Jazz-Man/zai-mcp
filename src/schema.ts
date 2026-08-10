import * as Schema from "effect/Schema";

const UnknownSchema = Schema.optional(
	Schema.Record(Schema.String, Schema.Unknown),
);

export const WebReaderParamsSchema = Schema.Struct({
	keep_img_data_url: Schema.optional(Schema.Boolean).annotate({
		default: false,
		description: "Keep image data URL (true/false), default is false",
	}),
	no_cache: Schema.optional(Schema.Boolean).annotateKey({
		default: false,
		description: "Disable cache(true/false), default is false",
	}),
	no_gfm: Schema.optional(Schema.Boolean).annotateKey({
		default: false,
		description:
			"Disable GitHub Flavored Markdown (true/false), default is false",
	}),
	retain_images: Schema.optional(Schema.Boolean).annotateKey({
		default: false,
		description: "Retain images (true/false), default is true",
	}),
	return_format: Schema.optional(
		Schema.Literals(["markdown", "text"]),
	).annotateKey({
		default: "markdown",
		description:
			"Reader response content type (markdown or text), default is markdown",
	}),
	timeout: Schema.optional(Schema.Finite).annotateKey({
		default: 20,
		description: "Request timeout(unit is second), default is 20",
	}),
	url: Schema.Trimmed.check(Schema.isNonEmpty()).annotateKey({
		description: "The URL of the website to fetch and read",
	}),
	with_images_summary: Schema.optional(Schema.Boolean).annotateKey({
		default: false,
		description: "Include images summary (true/false), default is false",
	}),
	with_links_summary: Schema.optional(Schema.Boolean).annotateKey({
		default: false,
		description: "Include links summary (true/false), default is false",
	}),
});

export const WebReaderResponseSchema = Schema.Struct({
	created: Schema.Finite,
	id: Schema.String,
	model: Schema.String,
	reader_result: Schema.Struct({
		content: Schema.String,
		description: Schema.optional(Schema.String),
		external: UnknownSchema,
		images: UnknownSchema,
		metadata: UnknownSchema,
		title: Schema.optional(Schema.String),
		url: Schema.optional(Schema.String),
	}),
	request_id: Schema.optional(Schema.String),
});
