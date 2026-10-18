# blackribbonstudios.com

The Black Ribbon Studios website. Everything in `site/` is published by Cloudflare Pages
every time this repository changes, usually within a minute.

## Where things live
- `site/games.js`: all the content. Games on Steam go in `GAMES`; the mystery cards are `TEASERS`.
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

## Contact form
The form on the page posts to `/api/contact`, which is handled by the small Worker in
`contact-worker/` (Cloudflare Worker "blackribbon-contact", deployed automatically from this
folder). It emails each message to studiosblackribbon@gmail.com through Cloudflare Email
Routing, with the visitor's address as Reply-To, so pressing Reply in Gmail answers them.
To change the inbox, edit `TO` in `contact-worker/src/index.js` and `destination_address` in
`contact-worker/wrangler.toml`; the new address must be verified under Email Routing >
Destination addresses first.

## Email
hello@blackribbonstudios.com forwards to studiosblackribbon@gmail.com (Cloudflare Email Routing).
