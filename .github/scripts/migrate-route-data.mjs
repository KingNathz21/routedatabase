import fs from "node:fs";

const file = "data/routes.json";
const data = JSON.parse(fs.readFileSync(file, "utf8"));

const routeOneVia = [
  "Rosslyn Hill",
  "Hawley Road",
  "British Library",
  "Waterloo Bridge / South Bank",
  "Bricklayer's Arms / New Kent Road",
  "Anchor Street",
  "Gomm Road"
];

function migrateRoute(route) {
  const routeNumber = String(route.Route ?? "").trim();
  const oldImage = String(route.Image || "").trim();
  const oldImageAlt = String(route.ImageAlt || `London bus route ${routeNumber}`).trim();

  if (!("PVR" in route)) route.PVR = routeNumber === "1" ? "17" : "Not yet recorded";
  if (!Array.isArray(route.Via)) route.Via = routeNumber === "1" ? routeOneVia : [];
  if (!Array.isArray(route.Images)) {
    route.Images = oldImage ? [{ src: oldImage, alt: oldImageAlt }] : [];
  }

  if (!("OperatorLogo" in route)) {
    route.OperatorLogo = routeNumber === "1" ? "images/operators/go-ahead-london.svg" : "";
  }
  if (!("OperatorLogoAlt" in route)) {
    route.OperatorLogoAlt = routeNumber === "1"
      ? "Go-Ahead London"
      : String(route.Operator || route["Final Operator"] || "");
  }

  delete route["Number of Stops"];
  delete route.Image;
  delete route.ImageAlt;

  return route;
}

for (const group of ["current", "withdrawn"]) {
  if (Array.isArray(data[group])) data[group] = data[group].map(migrateRoute);
}

fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
