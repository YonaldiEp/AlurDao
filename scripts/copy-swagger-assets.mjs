/**
 * Copy swagger-ui-dist assets to public/swagger-ui/ so they can be served
 * as static files without runtime path resolution from node_modules.
 *
 * Runs automatically via the "postinstall" npm script.
 */

import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "swagger-ui-dist");
const dest = join(root, "public", "swagger-ui");

mkdirSync(dest, { recursive: true });

const files = ["swagger-ui.css", "swagger-ui-bundle.js"];
for (const file of files) {
  copyFileSync(join(src, file), join(dest, file));
}

console.log(`✓ Swagger UI assets copied to public/swagger-ui/ (${files.join(", ")})`);
