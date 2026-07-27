// Editable route extras used by every route in the database.
//
// Every route automatically receives these fields:
// - PVR
// - Via
// - Images
// - OperatorLogo / OperatorLogoAlt
//
// Add a route below only when you want to replace the defaults.

window.ROUTE_INFO_DEFAULTS = {
  PVR: "Not yet recorded",
  Via: [],
  Images: [],
  OperatorLogo: "",
  OperatorLogoAlt: ""
};

window.ROUTE_INFO = {
  "1": {
    PVR: "17",

    Via: [
      "Rosslyn Hill",
      "Hawley Road",
      "British Library",
      "Waterloo Bridge / South Bank",
      "Bricklayer's Arms / New Kent Road",
      "Anchor Street",
      "Gomm Road"
    ],

    OperatorLogo: "images/operators/go-ahead-london.svg",
    OperatorLogoAlt: "Go-Ahead London",

    Images: [
      {
        src: "https://static.wikia.nocookie.net/bus-routes-in-london/images/1/17/1_CW.jpeg/revision/latest/scale-to-width-down/1000?cb=20250727165656",
        alt: "London bus route 1"
      }
    ]
  }

  // Add more routes using this pattern:
  // ,"2": {
  //   PVR: "20",
  //   Via: ["Baker Street", "Victoria", "Brixton"],
  //   Images: [
  //     { src: "images/routes/2/photo-1.jpg", alt: "London bus route 2" },
  //     { src: "images/routes/2/photo-2.jpg", alt: "Route 2 at Victoria" }
  //   ]
  // }
};

window.getRouteInfo = function getRouteInfo(routeNumber) {
  const routeId = String(routeNumber ?? "").trim();
  const saved = window.ROUTE_INFO[routeId] || {};

  return {
    ...window.ROUTE_INFO_DEFAULTS,
    ...saved,
    Via: Array.isArray(saved.Via) ? saved.Via : [],
    Images: Array.isArray(saved.Images) ? saved.Images : []
  };
};
