// Route-specific information that you can edit manually.
//
// For each route you can set:
// - Via: the key places shown in the Via section.
// - PVR: the peak vehicle requirement shown in Route Information.
// - Images: one or more route photos used by the image gallery.
// - OperatorLogo: optional logo override when automatic operator matching is unsuitable.
//
// Image paths can point to files stored in this repository, for example:
// "images/routes/1/photo-1.jpg"
// You can also use a full https:// image URL.

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
      // Add more photos by placing a comma after the item above, then add:
      // {
      //   src: "images/routes/1/photo-2.jpg",
      //   alt: "Route 1 bus at Waterloo"
      // }
    ]
  }

  // Add another route by placing a comma after the route 1 block, for example:
  // "2": {
  //   PVR: "20",
  //   Via: ["Baker Street", "Victoria", "Brixton"],
  //   Images: [
  //     { src: "images/routes/2/photo-1.jpg", alt: "London bus route 2" },
  //     { src: "images/routes/2/photo-2.jpg", alt: "Route 2 at Victoria" }
  //   ]
  // }
};