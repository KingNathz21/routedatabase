import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const source = JSON.parse(await readFile(resolve(repoRoot, "data/routes.json"), "utf8"));
const current = source.current || [];
const withdrawn = source.withdrawn || [];
const seen = new Set();

for (const [status, records] of [["current", current], ["withdrawn", withdrawn]]) {
  for (const route of records) {
    const number = String(route.Route || "").trim();
    if (!number) throw new Error(`${status} record has no route number`);
    const key = `${status}:${number.toLowerCase()}`;
    if (seen.has(key)) throw new Error(`Duplicate ${status} route: ${number}`);
    seen.add(key);
    if (!Array.isArray(route.Via) && route.Via !== undefined) {
      throw new Error(`Route ${number} has an invalid Via field`);
    }
    if (!Array.isArray(route.Images) && route.Images !== undefined) {
      throw new Error(`Route ${number} has an invalid Images field`);
    }
  }
}

if (current.length === 0 || withdrawn.length === 0) {
  throw new Error("Expected both current and withdrawn route archives to be present.");
}

console.log(`Route archive validation passed: ${current.length} current + ${withdrawn.length} withdrawn = ${seen.size} unique status/route records.`);
