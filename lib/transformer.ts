import type { Html, Image, Root } from "mdast";
import type { FetchImageError } from "./image.ts";

import { Context, Effect, Layer } from "effect";
import { visit } from "unist-util-visit";

import { ImageService } from "./image.ts";

export class TransformerService extends Context.Tag("TransformerService")<
  TransformerService,
  {
    readonly embedImages: (
      ast: Root,
    ) => Effect.Effect<void, FetchImageError, ImageService>;
  }
>() {}

function processImage(image: Image) {
  return Effect.gen(function* () {
    const imageService = yield* ImageService;

    const dataUri = yield* imageService.fetch(image.url);

    image.url = dataUri;
  });
}

function processHtmlImage({
  node,
  html,
}: Readonly<{ node: Html; html: string }>) {
  return Effect.gen(function* () {
    const imageService = yield* ImageService;
    const imgRegex = /<img [^>]*src="([^"]+)"[^>]*>/g;
    const match = imgRegex.exec(html);

    if (match) {
      const url = match[1];

      const dataUri = yield* imageService.fetch(url);

      node.value = node.value.replace(url, dataUri);
    }
  });
}

export const TransformerServiceLive = Layer.succeed(
  TransformerService,
  TransformerService.of({
    embedImages(ast: Root) {
      return Effect.gen(function* () {
        const imageNodes: Image[] = [];
        const htmlImageNodes: Readonly<{ node: Html; html: string }>[] = [];

        visit(ast, "image", (node) => {
          imageNodes.push(node);
        });

        visit(ast, "html", (node) => {
          htmlImageNodes.push({ node: node, html: node.value });
        });

        yield* Effect.all(
          [
            ...imageNodes.map(processImage),
            ...htmlImageNodes.map(processHtmlImage),
          ],
          {
            concurrency: "unbounded",
          },
        );
      });
    },
  }),
);
