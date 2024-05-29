import { Effect } from "effect";
import { archive } from "./mod.ts";

Deno.bench("Markdown archiving", async () => {
  const program = archive(`
# Benchmarking

![Google Logo 1998](https://web.archive.org/web/19990504112211im_/http://www.google.com/google.jpg)
`);

  await Effect.runPromise(program);
});
