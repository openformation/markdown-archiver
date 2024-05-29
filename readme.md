# markdown-archiver

Library for creating self-contained markdown files by embedding images.

## Installation

The library is published to [jsr.io](https://jsr.io/) and can be installed into
your TypeScript project by utilizing your respective package manager:

```sh
deno add @openformation/markdown-archiver
# OR for npm
npx jsr add @openformation/markdown-archiver
# OR for Yarn
yarn dlx jsr add @openformation/markdown-archiver
# OR for pnpm
pnpm dlx jsr add @openformation/markdown-archiver
# OR for bun
bunx jsr add @openformation/markdown-archiver
```

## Usage

> **Important:** Your project needs to have [effect](https://effect.website/) as
> a dependency.

```ts
import { Effect } from "effect";

import { archive } from "@openformation/markdown-archiver";

async function main() {
  const program = archive(`
# Hello World

![Google Logo 1998](https://web.archive.org/web/19990504112211im_/http://www.google.com/google.jpg)
`);

  const markdown = await Effect.runPromise(program);

  console.log(markdown); // Markdown with embedded images
}

main().catch(console.error);
```

## 📝 License

`markdown-archiver` is OSS, licensed as MIT.
