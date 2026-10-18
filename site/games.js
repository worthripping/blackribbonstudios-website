/* ==========================================================================
   BLACK RIBBON STUDIOS — site content
   --------------------------------------------------------------------------
   This is the only file you need to touch to add or change games.

   ONLY GAMES IN "GAMES" SHOW ON THE SITE. Put a game there once its Steam
   page is live. Games that aren't on Steam yet are written up in
   not-on-steam-yet.js, which is kept OUT of the website so nobody can read
   it. When one goes up on Steam, copy its { ... } block into GAMES here.

   ADD A NEW GAME: copy one { ... } block, paste it into GAMES where you
   want it to appear (order here = order on the site), and change the text.

   Fields:
     id        short web-safe name, used in links: blackribbonstudios.com/#greyhaven
     title     game name
     genre     a few words, shown on the card
     status    "out" (Out now) | "demo" (Free demo) | "soon" (Coming soon) | "dev" (In development)
     featured  true = this game fills the top of the page (use it on one game;
               if none is marked, the first game gets it)
     hero      "clover-field" = the animated clover field at the top. Leave it out
               and the top of the page uses the game's cover image instead.
     heroTitle the title split into lines for the top of the page, e.g.
               ["Find the", "Four Leaf", "Clover"]: small first line, the
               second line in the accent colour. Leave it out to use the title.
     features  short bullet points shown in the game's section
     pitch     one or two sentences for the card
     about     longer text for the game's popup. Blank line = new paragraph.
     platforms list, e.g. ["PC", "Steam Deck"]
     tags      list of short labels
     cover     image file in the /images folder, e.g. "images/greyhaven.jpg"
               (16:10 or 16:9 works best). Leave "" to use the poster style.
     shots     screenshots, e.g. ["images/gh/shots/shot-01.jpg", ...]. If a matching
               small copy exists in a "thumbs" folder next to "shots", it's used for the
               thumbnails (images/gh/thumbs/shot-01.jpg).
     trailer   a video file (e.g. "videos/greyhaven-trailer.mp4", keep it under 25 MB
               for Cloudflare) or a YouTube link
     trailerPoster  still image shown before the trailer plays
     trailerCredit  line shown under the trailer (music credits etc.)
     heroLogo  transparent logo image shown at the top of the page instead of the title
     links     store links, e.g. steam: "https://store.steampowered.com/app/1234567/"
               Without a Steam link the game shows "Coming soon to Steam".
     art       colours for the poster-style cover (used when cover is "")
   ========================================================================== */

window.STUDIO = {
  name: "Black Ribbon Studios",
  headline: "Games with a loose screw.",
  intro: "Stubborn little sims, physics chaos and the odd nightmare. Here's what's on Steam right now, with plenty more on the way.",
  about: "Black Ribbon Studios is an independent game studio. We like games you can feel in your hands: bodies that won't do what you tell them, worlds that react when you poke them, and jokes that only work because the physics is real.\n\nSome of our games are cosy. Some are cruel. A couple are both. If one of them looks like your kind of thing, wishlist it, follow along, or just tell us what you think.",
  email: "studiosblackribbon@gmail.com",
  // Social links: paste the full address. Empty ones are hidden.
  social: {
    youtube: "",
    x: "",
    reddit: "",
    tiktok: "",
    instagram: "",
    itch: "https://blackribbonstudios.itch.io",
    steam: ""
  }
};

/* "More on the way" cards: mystery projects shown without naming them.
   Change the hints, add or remove cards, or set TEASERS = [] to hide the section. */
window.TEASERS = [
  { code: "BR-02", hint: "Rubber bodies. Bad decisions." },
  { code: "BR-03", hint: "Never trust your co-op partner." },
  { code: "BR-04", hint: "Dress warm." }
];

window.GAMES = [
  {
    id: "four-leaf-clover",
    title: "Find the Four Leaf Clover",
    genre: "First-person search sim",
    status: "soon",
    featured: true,
    hero: "clover-field",
    heroTitle: ["Find the", "Four Leaf", "Clover"],
    heroLogo: "images/four-leaf-clover/logo.png",
    pitch: "One field. Millions of clovers. Exactly one of them has four leaves.",
    about: "Somewhere in this field is a single four-leaf clover. Everything else has three. Pick clovers, sell them, and upgrade from bare hands to scissors to tools that have no business being anywhere near a clover patch.\n\nThe dowsing rod, the dog and the drone are out there too, if you can afford them. Finding it will take a while. That's the point.",
    platforms: ["PC"],
    tags: ["Singleplayer", "Relaxing", "Upgrades"],
    features: [
      "One huge field, and exactly one four-leaf clover in it",
      "Pick clovers and sell them to pay for upgrades",
      "Work your way up from bare hands to scissors and faster tools",
      "Save up for the dowsing rod, the dog and the drone",
      "Takes a while to find. That's the whole point"
    ],
    cover: "images/four-leaf-clover/capsule.jpg",
    // The screenshots and trailer from the Steam page, in the same order as on Steam
    shots: [
      "images/four-leaf-clover/shots/shot-01.jpg",
      "images/four-leaf-clover/shots/shot-02.jpg",
      "images/four-leaf-clover/shots/shot-03.jpg",
      "images/four-leaf-clover/shots/shot-04.jpg",
      "images/four-leaf-clover/shots/shot-05.jpg",
      "images/four-leaf-clover/shots/shot-06.jpg",
      "images/four-leaf-clover/shots/shot-07.jpg",
      "images/four-leaf-clover/shots/shot-08.jpg",
      "images/four-leaf-clover/shots/shot-09.jpg",
      "images/four-leaf-clover/shots/shot-10.jpg",
      "images/four-leaf-clover/shots/shot-11.jpg",
      "images/four-leaf-clover/shots/shot-12.jpg",
      "images/four-leaf-clover/shots/shot-13.jpg"
    ],
    trailer: "videos/four-leaf-clover-trailer.mp4",
    trailerPoster: "images/four-leaf-clover/trailer-poster.jpg",
    trailerCredit: "Music: \"Celebration\" by Alexander Nakarada (alexandernakarada.com), CC BY 4.0",
    // Paste the store page link here, e.g. "https://store.steampowered.com/app/1234567/"
    links: { steam: "", itch: "" },
    art: { bg: "#1E4A2A", fg: "#D6F08C", band: "#0D0E11", bandFg: "#D6F08C" }
  }
];
