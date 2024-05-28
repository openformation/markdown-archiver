import type { FetchImageError } from "./image.ts";

import { Effect, Layer } from "effect";
import { ImageServiceLive } from "./image.ts";
import { EnvironmentServiceLive } from "./environment.ts";
import { MarkdownService, MarkdownServiceLive } from "./markdown.ts";
import { TransformerService, TransformerServiceLive } from "./transformer.ts";

function makeServices() {
  const imageService = ImageServiceLive.pipe(
    Layer.provide(EnvironmentServiceLive),
  );

  const markdownService = MarkdownServiceLive;

  const transformerService = TransformerServiceLive.pipe(
    Layer.provide(imageService),
  );

  return Layer.mergeAll(imageService, markdownService, transformerService);
}

export type Archiver = Readonly<{
  asEffect: () => Effect.Effect<string, FetchImageError, never>;
  asPromise: () => Promise<string>;
}>;

export function archive(markdown: string): Archiver {
  const run = Effect.gen(function* () {
    const markdownService = yield* MarkdownService;

    const ast = yield* markdownService.parse(markdown);

    const transformer = yield* TransformerService;

    yield* transformer.embedImages(ast);

    return yield* markdownService.stringify(ast);
  });

  const program = Effect.provide(run, makeServices());

  return {
    asEffect: () => program,
    asPromise: () => Effect.runPromise(program),
  } as const;
}
