import json
from pathlib import Path

path = Path("data/routes.json")
with path.open("r", encoding="utf-8") as handle:
    data = json.load(handle)

update = {
    "Start": "Brent Park",
    "Destination": "Paddington",
    "Operator": "Metroline",
    "Garage": "Cricklewood (W)",
    "Route Type": "Day route",
    "Date Introduced": "19 March 1906",
    "Peak Frequency": "About every 10 minutes",
    "Off-Peak Frequency": "About every 10 minutes",
    "Evening Frequency": "About every 10 minutes",
    "Sunday Frequency": "About every 10 minutes",
    "Night Frequency": "Route N32",
    "Typical Journey Time": "33–55 minutes",
    "Approximate Route Length": "6 miles (9 km)",
    "Models Used": "Wright StreetDeck Electroliner EV and New Routemaster",
    "Vehicle Type (Single/Double Deck)": "Double Decker",
    "Power Type": "Electric and Hybrid",
    "Previous Route Number": "Not recorded",
    "Notes": "Full conversion to Wright StreetDeck Electroliner EV operation is planned during 2026.",
    "PVR": "15",
    "Via": ["Cricklewood", "Brondesbury", "Kilburn", "Maida Vale", "Edgware Road"],
    "OperatorLogo": "assets/operators/metroline.png",
    "OperatorLogoAlt": "Metroline"
}

for route in data.get("current", []):
    if str(route.get("Route", "")).strip() == "16":
        images = route.get("Images", [])
        route.update(update)
        route["Images"] = images
        break
else:
    raise RuntimeError("Route 16 was not found in the current route list")

with path.open("w", encoding="utf-8") as handle:
    json.dump(data, handle, ensure_ascii=False, indent=2)
    handle.write("\n")
