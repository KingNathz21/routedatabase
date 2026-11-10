import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const workerDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = resolve(workerDir, "..");
const sourcePath = join(repoRoot, "data", "routes.json");
const databaseName = "routeflow-london";
const batchSize = 10;

function sqlString(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text && !/^(not yet (verified|recorded)|not recorded|n\/a)$/i.test(text) ? text : null;
}

function cleanInteger(value) {
  const match = String(value ?? "").match(/^\s*(\d+)\s*$/);
  return match ? Number(match[1]) : null;
}

function mapRoute(record, status) {
  const routeNumber = String(record.Route ?? "").trim();
  if (!routeNumber) throw new Error("Encountered a route record without a Route number");
  const current = status === "current";
  const id = `${status}:${routeNumber.toLowerCase()}`;
  const start = current ? record.Start : record["Former Start"];
  const destination = current ? record.Destination : record["Former Destination"];
  const operator = current ? record.Operator : record["Final Operator"];
  const garage = current ? record.Garage : record["Final Garage"];
  const routeType = current ? record["Route Type"] : "Withdrawn route";
  const vehicleType = current ? record["Vehicle Type (Single/Double Deck)"] : record["Vehicle Type"];
  const powerType = current ? record["Power Type"] : null;
  const pvr = cleanInteger(record.PVR);
  const via = Array.isArray(record.Via) ? JSON.stringify(record.Via) : null;

  return [
    id, routeNumber, status, cleanText(start), cleanText(destination),
    cleanText(operator), cleanText(garage), cleanText(routeType),
    cleanText(vehicleType), cleanText(powerType), pvr, via,
    cleanText(current ? record.Notes : record["Historical Notes"]),
    "data/routes.json", null, JSON.stringify(record)
  ];
}

function insertStatement(row) {
  const values = row.map((value, index) => {
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    return sqlString(value);
  }).join(", ");
  return `INSERT INTO routes (
    id, route_number, status, start_point, destination, operator_name, garage_name,
    route_type, vehicle_type, power_type, pvr, via, service_notes, source,
    source_updated_at, raw_json
  ) VALUES (${values})
  ON CONFLICT(id) DO UPDATE SET
    route_number=excluded.route_number,
    status=excluded.status,
    start_point=excluded.start_point,
    destination=excluded.destination,
    operator_name=excluded.operator_name,
    garage_name=excluded.garage_name,
    route_type=excluded.route_type,
    vehicle_type=excluded.vehicle_type,
    power_type=excluded.power_type,
    pvr=excluded.pvr,
    via=excluded.via,
    service_notes=excluded.service_notes,
    source=excluded.source,
    raw_json=excluded.raw_json,
    updated_at=CURRENT_TIMESTAMP;`;
}

function slug(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";
}

function entityStatements(data) {
  const operators = new Map();
  const garages = new Map();

  for (const status of ["current", "withdrawn"]) {
    for (const route of data[status] || []) {
      const operatorName = cleanText(status === "current" ? route.Operator : route["Final Operator"]);
      const garageName = cleanText(status === "current" ? route.Garage : route["Final Garage"]);
      const logo = cleanText(route.OperatorLogo);

      let operatorId = null;
      if (operatorName) {
        const operatorKey = operatorName.toLowerCase();
        operatorId = "op:" + slug(operatorName);
        const existing = operators.get(operatorKey);
        operators.set(operatorKey, {
          id: operatorId,
          name: operatorName,
          logo: existing?.logo || logo
        });
      }

      if (garageName) {
        const garageKey = (operatorName || "").toLowerCase() + "|" + garageName.toLowerCase();
        garages.set(garageKey, {
          id: "garage:" + slug(operatorName) + ":" + slug(garageName),
          name: garageName,
          operatorId
        });
      }
    }
  }

  const statements = [];
  for (const operator of operators.values()) {
    statements.push(`INSERT INTO operators (id, name, logo_url)
      VALUES (${sqlString(operator.id)}, ${sqlString(operator.name)}, ${sqlString(operator.logo)})
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,
      logo_url=COALESCE(excluded.logo_url, operators.logo_url);`);
  }
  for (const garage of garages.values()) {
    statements.push(`INSERT INTO garages (id, name, operator_id)
      VALUES (${sqlString(garage.id)}, ${sqlString(garage.name)}, ${sqlString(garage.operatorId)})
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, operator_id=excluded.operator_id;`);
  }
  return statements;
}

async function main() {
  const data = JSON.parse(await readFile(sourcePath, "utf8"));
  const entitySql = entityStatements(data);
  const routeSql = [
    ...(data.current || []).map((route) => insertStatement(mapRoute(route, "current"))),
    ...(data.withdrawn || []).map((route) => insertStatement(mapRoute(route, "withdrawn")))
  ];
  const records = [...entitySql, ...routeSql];
  if (!records.length) throw new Error("No current or withdrawn route records found.");

  const execute = process.argv.includes("--execute");
  const tempDir = await mkdtemp(join(tmpdir(), "routeflow-import-"));
  try {
    const batches = [];
    for (let index = 0; index < records.length; index += batchSize) {
      batches.push(records.slice(index, index + batchSize));
    }

    for (let index = 0; index < batches.length; index++) {
      const sql = batches[index].join("\n\n") + "\n";
      const sqlPath = join(tempDir, `routes-${String(index + 1).padStart(3, "0")}.sql`);
      await writeFile(sqlPath, sql, "utf8");

      if (execute) {
        const command = process.platform === "win32" ? "npx.cmd" : "npx";
        const result = spawnSync(command, [
          "wrangler", "d1", "execute", databaseName, "--remote", `--file=${sqlPath}`
        ], { cwd: workerDir, stdio: "inherit", shell: process.platform === "win32" });
        if (result.error) throw result.error;
        if (result.status !== 0) throw new Error(`Wrangler import batch ${index + 1} failed with exit code ${result.status}`);
      } else {
        console.log(`Prepared batch ${index + 1}/${batches.length}: ${sqlPath}`);
      }
    }

    console.log(`${execute ? "Imported" : "Prepared"} ${routeSql.length} route records (${data.current?.length || 0} current, ${data.withdrawn?.length || 0} withdrawn), plus ${entitySql.length} operator/garage records, in ${batches.length} batches.`);
    if (!execute) console.log("Run again with --execute to apply the batches to the remote D1 database.");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("RouteFlow import failed:", error.message);
  process.exitCode = 1;
});
