/* Black Ribbon Studios: contact form.
   Receives the form on blackribbonstudios.com/api/contact and emails it to the
   studio inbox through Cloudflare Email Routing. Replying to the email in Gmail
   goes straight to the visitor (their address is set as Reply-To). */

import { EmailMessage } from "cloudflare:email";

const TO = "studiosblackribbon@gmail.com";       // must be a verified Email Routing destination
const FROM = "website@blackribbonstudios.com";   // any address on the domain
const FROM_NAME = "Black Ribbon Studios website";
const ALLOWED_ORIGINS = [
  "https://blackribbonstudios.com",
  "https://www.blackribbonstudios.com",
  "https://blackribbonstudios-website.pages.dev"
];
const TOPICS = ["General question", "Bug report", "Press", "Business", "Something else"];
const MIN_FILL_MS = 3000;          // faster than this is a bot
const LIMITS = { name: 100, email: 200, message: 5000 };

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = ALLOWED_ORIGINS.includes(origin)
      ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" }
      : {};

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: {
        ...cors,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400"
      }});
    }
    if (request.method !== "POST") {
      return new Response("This address only accepts the contact form.", { status: 405, headers: { Allow: "POST, OPTIONS" } });
    }

    const wantsJson = (request.headers.get("Accept") || "").includes("application/json");
    const reply = (ok, error, status) => {
      if (wantsJson) {
        return new Response(JSON.stringify(ok ? { ok: true } : { ok: false, error }), {
          status: status || (ok ? 200 : 400),
          headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" }
        });
      }
      // Works without JavaScript too: send the visitor back to the page.
      return Response.redirect("https://blackribbonstudios.com/?" + (ok ? "sent=1" : "error=1") + "#contact", 303);
    };

    if (origin && !ALLOWED_ORIGINS.includes(origin)) return reply(false, "Not allowed.", 403);

    let data;
    try {
      const type = request.headers.get("Content-Type") || "";
      if (type.includes("application/json")) data = await request.json();
      else data = Object.fromEntries(await request.formData());
    } catch {
      return reply(false, "Couldn't read the form.");
    }

    const clean = (v, max) => String(v == null ? "" : v).replace(/\r\n?/g, "\n").trim().slice(0, max);
    const name = clean(data.name, LIMITS.name).replace(/[\n\t]+/g, " ");
    const email = clean(data.email, LIMITS.email);
    const message = clean(data.message, LIMITS.message);
    const topic = TOPICS.includes(data.topic) ? data.topic : "General question";
    const page = clean(data.page, 300);

    // Spam traps: a hidden field people never see, and a form filled in too fast.
    if (clean(data.website, 200)) return reply(true);
    const started = Number(data.t);
    if (started && Date.now() - started < MIN_FILL_MS) return reply(true);

    if (!name) return reply(false, "Please add your name.");
    if (!/^[^\s@<>()",;:\\[\]]+@[^\s@<>()",;:\\[\]]+\.[A-Za-z]{2,}$/.test(email)) return reply(false, "That email address doesn't look right.");
    if (message.length < 2) return reply(false, "Please write a message.");

    const country = (request.cf && request.cf.country) || "";
    const body =
      message + "\n\n" +
      "------------------------------\n" +
      "From:    " + name + " <" + email + ">\n" +
      "Topic:   " + topic + "\n" +
      (page ? "Page:    " + page + "\n" : "") +
      (country ? "Country: " + country + "\n" : "") +
      "Sent:    " + new Date().toUTCString() + "\n\n" +
      "Hit Reply to answer " + name + " directly.\n";

    const raw = buildMime({
      fromName: FROM_NAME, from: FROM, to: TO,
      replyName: name, replyTo: email,
      subject: "[" + topic + "] " + name + " via blackribbonstudios.com",
      text: body
    });

    try {
      await env.CONTACT.send(new EmailMessage(FROM, TO, raw));
    } catch (e) {
      console.error("send failed", e && e.message);
      return reply(false, "The message couldn't be sent right now. Please try again in a minute.", 502);
    }
    return reply(true);
  }
};

/* ---------- a plain-text email, built by hand ---------- */
function b64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function encWord(s) {
  return /^[\x20-\x7E]*$/.test(s) ? s : "=?UTF-8?B?" + b64(s) + "?=";
}
function addr(name, email) {
  const safe = name.replace(/["\\\r\n]/g, "");
  return (/^[\x20-\x7E]*$/.test(safe) ? '"' + safe + '"' : encWord(safe)) + " <" + email + ">";
}
function buildMime(m) {
  const id = crypto.randomUUID() + "@blackribbonstudios.com";
  const body = b64(m.text).replace(/.{1,76}/g, "$&\r\n");
  return [
    "From: " + addr(m.fromName, m.from),
    "To: <" + m.to + ">",
    "Reply-To: " + addr(m.replyName, m.replyTo),
    "Subject: " + encWord(m.subject.replace(/[\r\n]/g, " ")),
    "Date: " + new Date().toUTCString().replace("GMT", "+0000"),
    "Message-ID: <" + id + ">",
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    body
  ].join("\r\n");
}
