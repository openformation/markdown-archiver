import { Context, Layer } from "effect";

export class EnvironmentService extends Context.Tag("EnvironmentService")<
  EnvironmentService,
  {
    readonly isBrowser: () => boolean;
  }
>() {}

export const EnvironmentServiceLive = Layer.succeed(
  EnvironmentService,
  EnvironmentService.of({
    isBrowser() {
      return typeof globalThis?.location !== "undefined";
    },
  }),
);
