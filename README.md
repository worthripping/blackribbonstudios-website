# blackribbonstudios.com

The Black Ribbon Studios website. Everything in `site/` is published by Cloudflare Pages
every time this repository changes, usually within a minute.

## Where things live
- `site/games.js`: all the content. Games on Steam go in `GAMES`; unreleased ones wait in
  `NOT_ON_STEAM_YET`; the mystery cards are `TEASERS`.
- `site/images/<game>/`: cover (capsule), logo, `shots/` (full size) and `thumbs/` (small copies).
- `site/videos/`: trailers. Keep each file under 25 MB (Cloudflare's limit per file).
- `site/index.html`: the page itself. When `games.js` or `clover-field.js` changes, bump the
  `?v=` number on their `<script>` tags so returning visitors get the new version.

## Cloudflare
Pages project connected to this repository. Build command: none. Build output directory: `site`.
Custom domains: blackribbonstudios.com and www.blackribbonstudios.com.

## How updates work
Change files, commit, push to `main`. Cloudflare Pages picks up the push and publishes it to
blackribbonstudios.com within about a minute. Nothing needs uploading by hand.
