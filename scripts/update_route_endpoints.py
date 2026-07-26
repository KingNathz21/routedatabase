import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROUTES_FILE = Path("data/routes.json")
TFL_URL = "https://api.tfl.gov.uk/Line/Mode/bus/Route"


def fetch_tfl_routes() -> list[dict]:
    params = {}
    api_key = os.environ.get("TFL_API_KEY", "").strip()
    if api_key:
        params["app_key"] = api_key

    url = TFL_URL
    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"

    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "RFL-Route-Database-Updater/1.0",
        },
    )

    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code == 429 and attempt < 3:
                retry_after = error.headers.get("Retry-After")
                delay = int(retry_after) if retry_after and retry_after.isdigit() else 15 * (attempt + 1)
                print(f"TfL returned 429. Retrying in {delay} seconds...", file=sys.stderr)
                time.sleep(delay)
                continue
            raise

    raise RuntimeError("TfL route data could not be downloaded")


def endpoint_pair(line: dict) -> tuple[str, str] | None:
    sections = line.get("routeSections") or []
    if not sections:
        return None

    outbound = [
        section
        for section in sections
        if str(section.get("direction", "")).lower() == "outbound"
        and section.get("originationName")
        and section.get("destinationName")
    ]
    candidates = outbound or [
        section
        for section in sections
        if section.get("originationName") and section.get("destinationName")
    ]
    if not candidates:
        return None

    section = candidates[0]
    return str(section["originationName"]).strip(), str(section["destinationName"]).strip()


def main() -> None:
    database = json.loads(ROUTES_FILE.read_text(encoding="utf-8"))
    tfl_lines = fetch_tfl_routes()

    endpoints = {}
    for line in tfl_lines:
        line_id = str(line.get("id", "")).strip().lower()
        pair = endpoint_pair(line)
        if line_id and pair:
            endpoints[line_id] = pair

    updated = 0
    unchanged = 0
    missing = []

    for route in database.get("current", []):
        route_id = str(route.get("Route", "")).strip()
        pair = endpoints.get(route_id.lower())
        if not pair:
            missing.append(route_id)
            continue

        start, destination = pair
        if route.get("Start") != start or route.get("Destination") != destination:
            print(
                f"{route_id}: {route.get('Start')} -> {route.get('Destination')} "
                f"becomes {start} -> {destination}"
            )
            route["Start"] = start
            route["Destination"] = destination
            updated += 1
        else:
            unchanged += 1

    ROUTES_FILE.write_text(
        json.dumps(database, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Updated {updated} routes; {unchanged} already matched TfL.")
    if missing:
        print(f"TfL did not return endpoints for {len(missing)} routes: {', '.join(missing)}")


if __name__ == "__main__":
    main()
