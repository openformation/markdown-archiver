import { assertSnapshot } from "@std/testing/snapshot";
import { archive } from "./mod.ts";
import { Effect } from "effect";

Deno.test("should archive a markdown file with all images", async (t) => {
  const program = archive(`
#  Testing

![Google Logo 1998](https://web.archive.org/web/19990504112211im_/http://www.google.com/google.jpg)

<img src="https://web.archive.org/web/20061116065438im_/http://www.google.com/intl/en_ALL/images/logo.gif" alt="Google Logo 2006" />
`);

  const result = await Effect.runPromise(program);

  await assertSnapshot(t, result);
});

Deno.test("should use a fallback image if downloading the image failed", async (t) => {
  const program = archive(`
#  Testing

![](https://example.com/not-found.jpg)

<img src="https://example.com/not-found.jpg" />
`);

  const result = await Effect.runPromise(program);

  await assertSnapshot(t, result);
});
