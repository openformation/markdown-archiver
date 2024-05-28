import { Context, Layer } from "npm:effect";

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
			return typeof window !== "undefined";
		},
	}),
);
