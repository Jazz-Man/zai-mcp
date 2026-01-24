import { Schema } from "effect";

const UnknownSchema = Schema.Record({
	key: Schema.String,
	value: Schema.Unknown,
});

export const WebReaderResponseSchema = Schema.Struct({
	id: Schema.String,
	created: Schema.Number,
	request_id: Schema.optional(Schema.String),
	model: Schema.String,
	reader_result: Schema.Struct({
		content: Schema.String,
		description: Schema.optional(Schema.String),
		title: Schema.optional(Schema.String),
		url: Schema.optional(Schema.String),
		metadata: Schema.optional(UnknownSchema),
		external: Schema.optional(UnknownSchema),
		images: Schema.optional(UnknownSchema),
	}),
});
