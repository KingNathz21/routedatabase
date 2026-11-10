const ALLOWED_ORIGINS = new Set([
  "https://kingnathz21.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000"
]);

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const headers = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
  if (ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(data, status = 200, request, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(request),
      ...extraHeaders
    }
  });
}

function parseRoute(row) {
  if (!row) return null;
  let record = {};
  try {
    record = JSON.parse(row.raw_json || "{}");
  } catch {
    record = {};
  }
  return {
    ...record,
    id: row.id,
    routeNumber: row.route_number,
    status: row.status,
    startPoint: row.start_point,
    destination: row.destination,
    operator: row.operator_name,
    garage: row.garage_name,
    routeType: row.route_type,
    vehicleType: row.vehicle_type,
    powerType: row.power_type,
    pvr: row.pvr,
    via: row.via,
    serviceNotes: row.service_notes,
    updatedAt: row.updated_at
  };
}

function safeLimit(value, fallback = 50) {
  const number = Number.parseInt(value || String(fallback), 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, 1), 100);
}

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (request.method !== "GET") {
    return json({ error: "Method not allowed" }, 405, request, { Allow: "GET, OPTIONS" });
  }

  if (!env.DB) {
    return json({ error: "Database binding DB is not configured" }, 503, request);
  }

  try {
    if (path === "/" || path === "/api" || path === "/api/health") {
      const result = await env.DB.prepare("SELECT 1 AS ok").first();
      return json({
        service: "RouteFlow London API",
        status: result?.ok === 1 ? "ok" : "degraded",
        database: result?.ok === 1 ? "connected" : "unavailable",
        version: "0.1.0"
      }, 200, request, { "Cache-Control": "public, max-age=30" });
    }

    if (path === "/api/routes") {
      const status = url.searchParams.get("status");
      const search = (url.searchParams.get("search") || "").trim().slice(0, 80);
      const limit = safeLimit(url.searchParams.get("limit"));
      const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0);
      const conditions = [];
      const values = [];

      if (status === "current" || status === "withdrawn") {
        conditions.push("status = ?");
        values.push(status);
      }
      if (search) {
        conditions.push("(route_number LIKE ? OR start_point LIKE ? OR destination LIKE ? OR operator_name LIKE ?)");
        const term = "%" + search.replace(/[\\%_]/g, "\\$&") + "%";
        values.push(term, term, term, term);
      }

      const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
      const count = await env.DB.prepare(`SELECT COUNT(*) AS total FROM routes ${where}`).bind(...values).first();
      const rows = await env.DB.prepare(
        `SELECT * FROM routes ${where} ORDER BY route_number COLLATE NOCASE LIMIT ? OFFSET ?`
      ).bind(...values, limit, offset).all();

      return json({
        data: (rows.results || []).map(parseRoute),
        pagination: { total: count?.total || 0, limit, offset, hasMore: offset + (rows.results || []).length < (count?.total || 0) }
      }, 200, request, { "Cache-Control": "public, max-age=60, s-maxage=120" });
    }

    const routeMatch = path.match(/^\/api\/routes\/([^/]+)$/);
    if (routeMatch) {
      const routeNumber = decodeURIComponent(routeMatch[1]);
      const status = url.searchParams.get("status");
      let query = "SELECT * FROM routes WHERE route_number = ?";
      const values = [routeNumber];
      if (status === "current" || status === "withdrawn") {
        query += " AND status = ?";
        values.push(status);
      }
      query += " ORDER BY CASE status WHEN 'current' THEN 0 ELSE 1 END LIMIT 1";
      const row = await env.DB.prepare(query).bind(...values).first();
      if (!row) return json({ error: "Route not found", routeNumber }, 404, request);
      return json({ data: parseRoute(row) }, 200, request, { "Cache-Control": "public, max-age=60, s-maxage=120" });
    }

    if (path === "/api/operators") {
      const result = await env.DB.prepare(
        "SELECT id, name, website_url AS websiteUrl, logo_url AS logoUrl FROM operators ORDER BY name COLLATE NOCASE"
      ).all();
      return json({ data: result.results || [] }, 200, request, { "Cache-Control": "public, max-age=300" });
    }

    if (path === "/api/garages") {
      const result = await env.DB.prepare(
        "SELECT id, name, operator_id AS operatorId, address, postcode FROM garages ORDER BY name COLLATE NOCASE"
      ).all();
      return json({ data: result.results || [] }, 200, request, { "Cache-Control": "public, max-age=300" });
    }

    if (path === "/api/fleet") {
      const search = (url.searchParams.get("search") || "").trim().slice(0, 80);
      const limit = safeLimit(url.searchParams.get("limit"), 50);
      const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0);
      let query = "SELECT id, fleet_number AS fleetNumber, registration, manufacturer, model, vehicle_type AS vehicleType, power_type AS powerType, operator_id AS operatorId, garage_id AS garageId, status, notes, updated_at AS updatedAt FROM vehicles";
      const values = [];
      if (search) {
        query += " WHERE fleet_number LIKE ? OR registration LIKE ? OR model LIKE ?";
        const term = "%" + search.replace(/[\\%_]/g, "\\$&") + "%";
        values.push(term, term, term);
      }
      query += " ORDER BY fleet_number COLLATE NOCASE LIMIT ? OFFSET ?";
      values.push(limit, offset);
      const result = await env.DB.prepare(query).bind(...values).all();
      return json({ data: result.results || [], pagination: { limit, offset } }, 200, request, {
        "Cache-Control": "public, max-age=30"
      });
    }

    return json({ error: "Not found", path }, 404, request);
  } catch (error) {
    console.error("RouteFlow API error:", error);
    return json({ error: "Internal server error" }, 500, request);
  }
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  }
};
