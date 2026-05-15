import * as Toolkit from "@effect/ai/Toolkit";
import { WebReaderTool } from "./tool.ts";

export const ZaiToolkit = Toolkit.make(WebReaderTool);
