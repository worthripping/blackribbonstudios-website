/* Writes search-engine content into the website from site/games.js.
   Cloudflare Pages runs this on every deploy (build command: node tools/build-seo.mjs),
   so whatever is in games.js always ends up in the page title, Google's structured data,
   the sitemap and plain HTML text that crawlers can read without running JavaScript.
   Run it locally the same way; it only rewrites the parts between <!-- seo:... --> markers. */

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import vm from "node:vm";

const SITE = "https://blackribbonstudios.com";
const root = new URL("../site/", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");

// ---- load the content exactly as the browser does
const sandbox = { window: {} };
vm.runInNewContext(read("games.js"), sandbox);
const STUDIO = sandbox.window.STUDIO || {};
const GAMES = (sandbox.window.GAMES || []).filter((g) => g && g.id && g.title);
const feat = GAMES.find((g) => g.featured) || GAMES[0];
const NAME = STUDIO.name || "Black Ribbon Studios";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const abs = (p) => (/^https?:/.test(p) ? p : SITE + "/" + String(p).replace(/^\//, ""));
const paras = (t) => String(t || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
const isVideoFile = (u) => /\.(mp4|webm|mov)(\?|$)/i.test(u || "");
const STATUS = { out: "Out now", demo: "Free demo", soon: "Coming soon", dev: "In development" };
const statusText = (g) => STATUS[g.status] || STATUS.dev;
const steamOf = (g) => (g.links && g.links.steam) || "";

let lastmod;
try { lastmod = execSync("git log -1 --format=%cs", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch {}
if (!/^\d{4}-\d\d-\d\d$/.test(lastmod || "")) lastmod = new Date().toISOString().slice(0, 10);
const videoDate = (g) => (/^\d{4}-\d\d-\d\d$/.test(g.trailerDate || "") ? g.trailerDate + "T12:00:00+00:00" : addedAt(g.trailer));
// When a file was first added to the project (full date and time with timezone, as Google wants).
function addedAt(file) {
  try {
    const out = execSync(`git log --diff-filter=A --follow --format=%cI -- "site/${file}"`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim().split("\n").pop();
    if (/^\d{4}-\d\d-\d\dT/.test(out)) return out;
  } catch {}
  return lastmod + "T12:00:00+00:00";
}

// ---- page title and descriptions
const gameList = GAMES.map((g) => g.title);
const shown = feat ? [feat, ...GAMES.filter((g) => g !== feat)] : [];
const title = feat ? `${NAME} · Indie games · ${shown.slice(0, 3).map((g) => g.title).join(", ")}` : `${NAME} · Indie game studio`;
const alsoLine = shown.length > 1 ? " Also coming: " + shown.slice(1, 3).map((g) => `${g.title}, a ${(g.genre || "").toLowerCase()}`).join("; ") + "." : "";
const description = feat
  ? `${NAME} is an indie game studio. ${feat.title}: ${feat.pitch} ${!steamOf(feat) ? "Coming soon to Steam." : feat.status === "out" ? "Out now on Steam." : "Wishlist it on Steam."}${alsoLine}`
  : `${NAME} is an independent game studio making games for Steam.`;
const shortDesc = feat ? `${STUDIO.headline || ""} ${feat.title}: ${feat.pitch}`.trim() : description;

const head = `
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-video-preview:-1">
<meta name="author" content="${esc(NAME)}">
<link rel="canonical" href="${SITE}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(NAME)}">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="${esc(feat ? `${feat.title} | ${NAME}` : NAME)}">
<meta property="og:description" content="${esc(shortDesc)}">
<meta property="og:url" content="${SITE}/">
<meta property="og:image" content="${SITE}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(NAME)} logo${feat ? " and " + feat.title : ""}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(feat ? `${feat.title} | ${NAME}` : NAME)}">
<meta name="twitter:description" content="${esc(shortDesc)}">
<meta name="twitter:image" content="${SITE}/og.png">
`;

// ---- structured data (schema.org) for Google
const social = STUDIO.social || {};
const sameAs = Object.values(social).filter((u) => /^https?:\/\//.test(u || ""));
const org = {
  "@type": "Organization",
  "@id": SITE + "/#studio",
  name: NAME,
  url: SITE + "/",
  logo: { "@type": "ImageObject", url: SITE + "/images/brand/mark-512.png", width: 512, height: 512 },
  description: paras(STUDIO.about)[0] || description,
  ...(sameAs.length ? { sameAs } : {})
};
const website = { "@type": "WebSite", "@id": SITE + "/#website", name: NAME, alternateName: ["Black Ribbon", "blackribbonstudios.com"], url: SITE + "/", publisher: { "@id": SITE + "/#studio" }, inLanguage: "en" };
const games = GAMES.map((g) => {
  const shots = (g.shots || []).filter((s) => !isVideoFile(s));
  const trailer = g.trailer && isVideoFile(g.trailer) ? {
    "@type": "VideoObject",
    name: `${g.title} trailer`,
    description: `Official trailer for ${g.title}. ${g.pitch || ""}`.trim(),
    thumbnailUrl: abs(g.trailerPoster || g.cover || "og.png"),
    contentUrl: abs(g.trailer),
    uploadDate: videoDate(g)
  } : null;
  const game = {
    "@type": "VideoGame",
    "@id": `${SITE}/#${g.id}`,
    name: g.title,
    url: `${SITE}/#${g.id}`,
    description: paras(g.about).join(" ") || g.pitch,
    genre: [g.genre, ...(g.tags || [])].filter(Boolean),
    gamePlatform: g.platforms || ["PC"],
    operatingSystem: "Windows",
    applicationCategory: "Game",
    playMode: /co-?op|multi/i.test(`${g.players || ""} ${(g.tags || []).join(" ")}`) ? ["SinglePlayer", "CoOp", "MultiPlayer"] : ["SinglePlayer"],
    ...(g.players ? { numberOfPlayers: { "@type": "QuantitativeValue", minValue: 1, maxValue: Number((String(g.players).match(/(\d+)\s*[–-]\s*(\d+)/) || [])[2]) || 1 } } : {}),
    author: { "@id": SITE + "/#studio" },
    publisher: { "@id": SITE + "/#studio" },
    image: abs(g.cover || shots[0] || "og.png"),
    ...(shots.length ? { screenshot: shots.map((s) => abs(s)) } : {}),
    ...(trailer ? { trailer } : {}),
    ...(steamOf(g) ? { sameAs: [steamOf(g)] } : {})
  };
  return game;
});
const page = { "@type": "WebPage", "@id": SITE + "/#page", url: SITE + "/", name: title, description, isPartOf: { "@id": SITE + "/#website" }, about: { "@id": SITE + "/#studio" }, ...(feat ? { mainEntity: { "@id": `${SITE}/#${feat.id}` } } : {}), dateModified: lastmod };
const jsonld = `
<script type="application/ld+json">
${JSON.stringify({ "@context": "https://schema.org", "@graph": [org, website, page, ...games] }, null, 1).replace(/</g, "\\u003c")}
</script>
`;

// ---- plain HTML versions of the content (the page's script replaces these when it runs)
const heroTitle = feat
  ? (feat.heroLogo ? `<img class="hero-logo" src="${esc(feat.heroLogo)}" alt="${esc(feat.title)}" width="1200" height="538">` : `<span class="lime">${esc(feat.title)}</span>`)
  : `<span class="lime">${esc(STUDIO.headline || NAME)}</span>`;
const heroPitch = esc(feat ? feat.pitch : STUDIO.intro);
const aboutHTML = paras(STUDIO.about).map((p) => `<p>${esc(p)}</p>`).join("");
const gameHTML = (g) => `
<div class="media"><div class="shots">${(g.shots || []).slice(0, 4).map((s, i) => `<img src="${esc(s.replace("/shots/", "/thumbs/"))}" alt="${esc(g.title)} screenshot ${i + 1}" loading="lazy" width="640" height="360">`).join("")}</div></div>
<div class="copy">
<h3>${esc(g.title)}</h3>
<p class="g-intro">${esc(g.genre)} · ${esc(statusText(g))}${steamOf(g) ? "" : " to Steam"}</p>
${paras(g.about).map((p) => `<p class="g-intro">${esc(p)}</p>`).join("")}
${(g.features || []).length ? `<ul class="features">${g.features.map((f) => `<li><i aria-hidden="true"></i><span>${esc(f)}</span></li>`).join("")}</ul>` : ""}
<p class="g-intro">Platforms: ${esc((g.platforms || []).join(", "))}${g.players ? ` · Players: ${esc(g.players)}` : ""}</p>
${g.contentNote ? `<p class="g-intro">${esc(g.contentNote)}</p>` : ""}
</div>
`;
const detailHTML = feat ? gameHTML(feat) : "";
const moreHTML = shown.slice(1, 3).map((g, k) => `<div class="game-detail${k % 2 === 0 ? " flip" : ""}" id="game-${esc(g.id)}">${gameHTML(g)}</div>`).join("\n");

// ---- write index.html
let html = read("index.html");
function fill(name, content, { inner = false } = {}) {
  const re = new RegExp(`(<!-- seo:${name} -->)[\\s\\S]*?(<!-- /seo:${name} -->)`);
  if (!re.test(html)) throw new Error(`Marker seo:${name} is missing from index.html`);
  html = html.replace(re, (_, a, b) => a + (inner ? content : content) + b);
}
fill("head", head);
fill("jsonld", jsonld);
fill("hero-title", heroTitle);
fill("hero-pitch", heroPitch);
fill("about", aboutHTML);
fill("detail", detailHTML);
fill("more", moreHTML);
writeFileSync(new URL("index.html", root), html);

// the privacy page's own "Last updated" date
const privacyDate = (() => {
  const m = read("privacy.html").match(/Last updated: (\d{1,2}) (\w+) (\d{4})/);
  if (!m) return lastmod;
  const mon = ["January","February","March","April","May","June","July","August","September","October","November","December"].indexOf(m[2]) + 1;
  return mon ? `${m[3]}-${String(mon).padStart(2, "0")}-${m[1].padStart(2, "0")}` : lastmod;
})();

// ---- sitemap with images and the trailer, so they can show up in image and video search
const imageTags = GAMES.flatMap((g) => [g.cover, g.heroLogo, ...(g.shots || [])].filter(Boolean).filter((s) => !isVideoFile(s)))
  .map((s) => `    <image:image><image:loc>${esc(abs(s))}</image:loc></image:image>`);
const videoTags = GAMES.filter((g) => g.trailer && isVideoFile(g.trailer)).map((g) => `    <video:video>
      <video:thumbnail_loc>${esc(abs(g.trailerPoster || g.cover))}</video:thumbnail_loc>
      <video:title>${esc(g.title)} trailer</video:title>
      <video:description>${esc(`Official trailer for ${g.title}. ${g.pitch || ""}`.trim())}</video:description>
      <video:content_loc>${esc(abs(g.trailer))}</video:content_loc>
      <video:publication_date>${videoDate(g)}</video:publication_date>
    </video:video>`);
writeFileSync(new URL("sitemap.xml", root), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>${SITE}/</loc>
    <lastmod>${lastmod}</lastmod>
${[...imageTags, ...videoTags].join("\n")}
  </url>
  <url>
    <loc>${SITE}/privacy</loc>
    <lastmod>${privacyDate}</lastmod>
  </url>
</urlset>
`);

console.log(`SEO build done: ${GAMES.length} game(s), lastmod ${lastmod}`);
console.log("Title:", title);
