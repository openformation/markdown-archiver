import type { Root } from "npm:mdast";
import type { Processor } from "npm:unified";

import { Effect, Context, Layer } from "npm:effect";

import { unified } from "npm:unified";
import md from "npm:remark-parse";
import gfm from "npm:remark-gfm";
import stringify from "npm:remark-stringify";

class MarkdownProcessor extends Context.Tag("MarkdownProcessor")<
	MarkdownProcessor,
	Processor<Root, undefined, undefined, Root, string>
>() {}

const MarkdownProcessorLive = Layer.succeed(
	MarkdownProcessor,
	MarkdownProcessor.of(unified().use(md).use(gfm).use(stringify)),
);

export class MarkdownService extends Context.Tag("MarkdownService")<
	MarkdownService,
	{
		readonly parse: (markdown: string) => Effect.Effect<Root>;
		readonly stringify: (ast: Root) => Effect.Effect<string>;
	}
>() {}

export const MarkdownServiceLive = Layer.effect(
	MarkdownService,
	Effect.gen(function* () {
		const processor = yield* MarkdownProcessor;

		return {
			parse: (markdown: string) =>
				Effect.sync(() => {
					const ast = processor.parse(markdown);

					return ast;
				}),
			stringify: (ast: Root) =>
				Effect.sync(() => {
					return processor.stringify(ast);
				}),
		} as const;
	}),
).pipe(Layer.provide(MarkdownProcessorLive));
