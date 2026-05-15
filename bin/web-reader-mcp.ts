#!/usr/bin/env bun

import * as McpServer from "@effect/ai/McpServer";
import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunSink from "@effect/platform-bun/BunSink";
import * as BunStream from "@effect/platform-bun/BunStream";
import * as Layer from "effect/Layer";
import { ZaiToolkit, ZaiToolkitHandlers } from "../src/index.ts";

// ============================================================================
// Server Layer
// ============================================================================

export const ServerLayer = Layer.mergeAll(McpServer.toolkit(ZaiToolkit)).pipe(
	Layer.provide(ZaiToolkitHandlers),
	Layer.provide(
		McpServer.layerStdio({
			name: "Z.AI Web Reader MCP Server",
			stdin: BunStream.stdin,
			stdout: BunSink.stdout,
			version: "1.0.0",
		}),
	),
);

// ============================================================================
// Launch
// ============================================================================

Layer.launch(ServerLayer).pipe(BunRuntime.runMain);
