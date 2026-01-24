/**
 * Z.AI MCP Server - Entry Point
 *
 * Main server file that launches the MCP server with stdio transport
 * Currently exposes webReader tool
 */

import { McpServer } from "@effect/ai";
import { BunRuntime, BunSink, BunStream } from "@effect/platform-bun";
import { Layer, Logger } from "effect";
import { ZaiToolkit, ZaiToolkitHandlers } from "./toolkit";

const ServerLayer = Layer.mergeAll(McpServer.toolkit(ZaiToolkit)).pipe(
	Layer.provide(ZaiToolkitHandlers),
	Layer.provide(
		McpServer.layerStdio({
			name: "Z.AI MCP Server",
			version: "1.0.0",
			stdin: BunStream.stdin,
			stdout: BunSink.stdout,
		}),
	),
	Layer.provide(Logger.add(Logger.prettyLogger({ stderr: true }))),
);

Layer.launch(ServerLayer).pipe(BunRuntime.runMain);
