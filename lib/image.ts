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
      try: () => fetch(url),
      catch: (cause: unknown) =>
        new FetchImageError(`Failed to fetch image at ${url}: ${cause}`, {
          cause,
        }),
    });

    if (!response.ok) {
      if (response.body) {
        yield* Effect.promise(response.body.cancel.bind(response.body));
      }

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
    readonly getFallbackImageDataUri: () => Effect.Effect<
      ImageDataUri
    >;
  }
>() {}

function getFallbackImageDataUri() {
  return Effect.succeed(
    ImageDataUri(
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAADN0lEQVR4nO2Y3U9SYRzH+T/qstq6sYv+gmKkKaAmaLalazJNjdNoikAo0PSyteWFF3mRlk0Kp64ZDGsElq/LeLtpxYbrwoZ4lq04cG5+7XnwIfDEi43ToTy/7bs9nPNs5/N5Xsb2k0jEEkssscQqdzVq9cebKNMzldb0TUWZQNBoMcPMJcp8snR4rXFXcHAqN4hJrTMdKyqAV54ygW10HCLRLaBpWtBEoltgHX1AROxFBcixqQR4OksC7wJl+lpcYH/LhIamD4RwHV2B0y8SfzW0KED/Zzug8CVA4WPgvIeBKtfvP4qeo/dortzHgLTAXJTrKwH4EhuG7Z1h6FwJ8itQv8RkQuCQkNzLwDkPA2fdaejseWRulZMLf8aVgFh8GGBPjxOLj+TM41XgsKnzpkUOysazBHbiI+kF8aV3sKIE8sXmD2IJBI/G2e94FVB6PoNsSgOyJxo85kOO5k3Al4AL9j6QPqzGaXDcAksoCcYAC+1ryRyIlmUGdO9TMBRiYSiUAt1mCprfCiRgCLBgCbPQ7p7OwJNoXk2DLcyCNcxiyMFQCsxBBM3i59lBIh3rSRjwp8X0gRS0rf4Sb1tl8LuyC6CP6zc+gWxSwRGQTcqhf/0DB/YwsYRZvEjkd9kFLMEfoLR3ceBJFHYNDIW+c8Bu+7dBvdALqoUbeFyqEF1ugTbnWF54knbnWC5IKAVXXGaQzzbgtLqMYA0nhRGQTtQUFUBzdMsbGYjuJUcGnqT7jYN7LwIx6PXYoMdzB4/5ESgGv5/aqVYY9O+CYTMCynk1R0A5p4aBdx9zdknrvQediz04Wu9dvEuCCaA0z1tBvXCTA0+C7oNl/770r7ky8CR9ay5hBVBqniryCqBoXo+D2R+FrpcURwA9E1wA3Ye6mfr8EnON0LE4wIEnEV4A/T88vlhwF+rnmkDj7q5cAXyUpuUFJVTPL1e2gHSiGmodyoISV53XKlgAHaVHNSCfzX8flOg+uLv4FRA6qiMj0EQZ9/711uIMmowaqpUgEYlugeV+urmLGs9FBVp6DadUlCnOd7v8z9rrhhOSUgr14VErmxwnQcEp4x5a+ZLhxRJLLLHEkhyifgJu5rlgZTGQ8gAAAABJRU5ErkJggg==",
    ),
  );
}

const ImageServiceServer = ImageService.of({
  getFallbackImageDataUri,
  fetch(url: string) {
    return Effect.gen(function* () {
      const { buffer, mimeType } = yield* fetchImage(url);

      const base64 = encodeBase64(buffer);

      return ImageDataUri(`data:${mimeType};base64,${base64}`);
    });
  },
});

const ImageServiceBrowser = ImageService.of({
  getFallbackImageDataUri,
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
