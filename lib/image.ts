import { Brand, Context, Effect, Layer } from "effect";
import { encodeBase64 } from "@std/encoding";

import { EnvironmentService } from "./environment.ts";

/**
 * Represents an error that can occurre while fetching an image.
 */
export class FetchImageError extends Error {
  /**
   * The tag of the error (used by `Effect` to determine the error type)
   */
  readonly _tag = "FetchImageError";

  /**
   * The public error name.
   */
  readonly name = "FetchImageError";
}

type ImageDataUri = string & Brand.Brand<"ImageDataUri">;

const ImageDataUri = Brand.refined<ImageDataUri>(
  (value) => value.startsWith("data:"),
  (value) => Brand.error(`Expected a data URI, but got ${value}`),
);

export function fetchImage(url: string) {
  return Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () => {
        return fetch(url);
      },
      catch: (cause: unknown) =>
        new FetchImageError(`Failed to fetch image at ${url}: ${cause}`, {
          cause,
        }),
    });

    if (!response.ok) {
      return yield* Effect.fail(
        new FetchImageError(
          `Failed to fetch image at ${url} as the server responded with a status code of ${response.status}.`,
        ),
      );
    }

    const buffer = yield* Effect.tryPromise({
      try: () => {
        return response.arrayBuffer();
      },
      catch: (cause: unknown) =>
        new FetchImageError(
          `Failed to read array buffer of image at ${url}: ${cause}`,
          { cause },
        ),
    });

    const mimeType = response.headers.get("content-type");

    if (!mimeType) {
      return yield* Effect.fail(
        new FetchImageError(
          `The server didn't answered with a Content-Type header at ${url}. Therefore, we can't determine the MIME type of the image.`,
        ),
      );
    }

    return { buffer, mimeType } as const;
  });
}

export class ImageService extends Context.Tag("ImageService")<
  ImageService,
  {
    readonly fetch: (
      url: string,
    ) => Effect.Effect<ImageDataUri, FetchImageError>;
  }
>() {}

const ImageServiceServer = ImageService.of({
  fetch(url: string) {
    return Effect.gen(function* () {
      const { buffer, mimeType } = yield* fetchImage(url);

      const base64 = encodeBase64(buffer);

      return ImageDataUri(`data:${mimeType};base64,${base64}`);
    });
  },
});

const ImageServiceBrowser = ImageService.of({
  fetch(url: string) {
    return Effect.gen(function* () {
      const { buffer } = yield* fetchImage(url);
      const base64 = yield* Effect.tryPromise({
        try: () =>
          new Promise<ImageDataUri>((resolve, reject) => {
            const reader = new FileReader();

            function onLoad() {
              const result = reader.result;

              if (!result) {
                return reject(
                  new Error(
                    "Reading the image failed as the reader result was empty.",
                  ),
                );
              }

              reader.removeEventListener("load", onLoad);
              resolve(ImageDataUri(result as string));
            }

            function onError(cause: unknown) {
              reader.removeEventListener("load", onLoad);
              reader.removeEventListener("error", onError);

              reject(new Error("Reading the image failed.", { cause }));
            }

            reader.addEventListener("load", onLoad);
            reader.addEventListener("error", onError);

            reader.readAsDataURL(new Blob([buffer]));
          }),
        catch: (cause) =>
          new FetchImageError(`Failed to encode image at ${url}: ${cause}`, {
            cause,
          }),
      });

      return base64 as ImageDataUri;
    });
  },
});

export const ImageServiceLive = Layer.effect(
  ImageService,
  Effect.gen(function* () {
    const environment = yield* EnvironmentService;

    return environment.isBrowser() ? ImageServiceBrowser : ImageServiceServer;
  }),
);
