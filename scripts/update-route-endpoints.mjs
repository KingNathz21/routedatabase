import { readFile, writeFile } from "node:fs/promises";

const databasePath = new URL("../data/routes.json", import.meta.url);
const apiUrl = new URL("https://api.tfl.gov.uk/Line/Mode/bus/Route");
apiUrl.searchParams.set("serviceTypes", "Regular");

if (process.env.TFL_API_KEY) {
  apiUrl.searchParams.set("app_key", process.env.TFL_API_KEY);
}

const response = await fetch(apiUrl, {
  headers: { Accept: "application/json" }
});

if (!response.ok) {
  throw new Error(`TfL returned ${response.status} ${response.statusText}`);
}

const lines = await response.json();
const database = JSON.parse(await readFile(databasePath, "utf8"));

function normalise(value) {
  return String(value ?? "").trim().toLowerCase();
}

function routeId(line) {
  return normalise(line.id || line.name);
}

function endpointPair(line) {
  const sections = Array.isArray(line.routeSections) ? line.routeSections : [];
  const usable = sections.filter(section =>
    String(section.originationName ?? "").trim() &&
    String(section.destinationName ?? "").trim()
  );

  const outbound = usable.filter(section => normalise(section.direction) === "outbound");
  const selected = outbound[0] || usable[0];

  if (!selected) return null;
  return {
    start: String(selected.originationName).trim(),
    destination: String(selected.destinationName).trim()
  };
}

const tflRoutes = new Map();
for (const line of lines) {
  const pair = endpointPair(line);
  if (pair) tflRoutes.set(routeId(line), pair);
}

let updated = 0;
let unchanged = 0;
let missing = 0;

for (const route of database.current || []) {
  const pair = tflRoutes.get(normalise(route.Route));
  if (!pair) {
    missing += 1;
    console.warn(`No TfL endpoint found for route ${route.Route}`);
    continue;
  }

  if (route.Start === pair.start && route.Destination === pair.destination) {
    unchanged += 1;
    continue;
  }

  route.Start = pair.start;
  route.Destination = pair.destination;
  updated += 1;
  console.log(`Updated ${route.Route}: ${pair.start} -> ${pair.destination}`);
}

await writeFile(databasePath, `${JSON.stringify(database, null, 2)}\n`, "utf8");
console.log(`Finished: ${updated} updated, ${unchanged} unchanged, ${missing} not found.`);
