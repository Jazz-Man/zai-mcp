import * as Schema from "effect/Schema";

const UnknownSchema = Schema.optional(
	Schema.Record({
		key: Schema.String,
		value: Schema.Unknown,
	}),
);

export const WebReaderResponseSchema = Schema.Struct({
	created: Schema.Number,
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

export type WebReaderResponseType = Schema.Schema.Encoded<
	typeof WebReaderResponseSchema
>;
