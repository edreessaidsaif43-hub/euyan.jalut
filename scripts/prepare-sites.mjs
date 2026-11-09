import { cp, readFile, rename, rm, writeFile } from "node:fs/promises";

const base = new URL("../", import.meta.url);
const out = new URL("dist/server/", base);
await rename(new URL("worker.js", out), new URL("index.js", out));
await rm(new URL("worker.js.map", out), { force: true });
await cp(new URL(".open-next/assets/", base), new URL("dist/client/", base), { recursive: true });
const wrangler = JSON.parse(await readFile(new URL("wrangler.jsonc", base), "utf8"));
delete wrangler.$schema;
wrangler.main = "index.js";
wrangler.assets.directory = "../client";
await writeFile(new URL("wrangler.json", out), JSON.stringify(wrangler, null, 2));
