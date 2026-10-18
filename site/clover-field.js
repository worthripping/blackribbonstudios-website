/* Clover field — a swaying field of three-leaf clovers with exactly one four-leaf clover hidden in it.
   Used for the hero on the website (animated, clickable) and for rendering the cover art (still).

   CloverField.create(canvas, options) -> { relayout(), destroy(), found }
     palette   "dusk" | "day"
     seed      number, same seed = same field
     fourLeaf  { x, y } as fractions of the canvas (0..1), where the four-leaf clover sits
     animate   true = sway in the wind (ignored when the viewer prefers reduced motion)
     fireflies true/false (defaults to the palette's setting)
     highlight true = give the four-leaf clover a soft glow (for key art)
     scale     size multiplier for the clovers
     onFound   function(seconds) called when someone clicks the four-leaf clover
*/
(function (global) {
  "use strict";

  var PALETTES = {
    dusk: {
      ground: ["#08130B", "#0E2214", "#12301A"],
      tones: [
        ["#0B2012", "#173A20"],
        ["#123220", "#24552E"],
        ["#18432A", "#33733D"],
        ["#1F5530", "#4A9147"],
        ["#27673A", "#64AE55"]
      ],
      chevron: "rgba(226,244,196,0.20)",
      edge: "rgba(2,10,4,0.75)",
      rib: "rgba(3,14,6,0.35)",
      shadow: "rgba(0,0,0,0.45)",
      light: ["rgba(214,240,140,0.16)", "rgba(214,240,140,0)"],
      vignette: "rgba(4,6,8,0.75)",
      grass: ["#0E2A15", "#2E6A36"],
      fly: [232, 255, 150],
      fireflies: true
    },
    golden: {
      ground: ["#0A1A0C", "#143416", "#1E4C1D"],
      tones: [
        ["#123018", "#214F27"],
        ["#184222", "#317436"],
        ["#205528", "#4A9444"],
        ["#28692E", "#69B454"],
        ["#317E36", "#8ACB64"]
      ],
      chevron: "rgba(250,255,224,0.30)",
      edge: "rgba(3,14,4,0.72)",
      rib: "rgba(3,16,4,0.32)",
      shadow: "rgba(0,0,0,0.5)",
      light: ["rgba(255,210,120,0.40)", "rgba(255,210,120,0)"],
      vignette: "rgba(3,8,3,0.72)",
      grass: ["#10301A", "#5A9A40"],
      fly: [255, 230, 160],
      fireflies: true
    },
    day: {
      ground: ["#14300F", "#1F4416", "#2A5A1C"],
      tones: [
        ["#1F4A22", "#356B33"],
        ["#28602A", "#4C8D3E"],
        ["#307434", "#66AA4C"],
        ["#3A8838", "#86C65C"],
        ["#459C3E", "#A6DC72"]
      ],
      chevron: "rgba(250,255,232,0.36)",
      edge: "rgba(10,30,8,0.62)",
      rib: "rgba(12,40,10,0.28)",
      shadow: "rgba(6,24,4,0.42)",
      light: ["rgba(255,236,170,0.30)", "rgba(255,236,170,0)"],
      vignette: "rgba(6,18,6,0.55)",
      grass: ["#1E4A1C", "#5E9E44"],
      fly: [255, 246, 214],
      fireflies: false
    }
  };

  function rng(seed) {
    var s = (seed >>> 0) || 1;
    return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---- one leaflet, pointing up (-y) from the clover's centre ---- */
  function leafletPath(L, w) {
    var p = new Path2D();
    p.moveTo(0, 0);
    p.bezierCurveTo(-0.62 * L * w, -0.10 * L, -0.86 * L * w, -0.84 * L, -0.38 * L * w, -1.0 * L);
    p.quadraticCurveTo(-0.11 * L * w, -1.06 * L, 0, -0.84 * L);
    p.quadraticCurveTo(0.11 * L * w, -1.06 * L, 0.38 * L * w, -1.0 * L);
    p.bezierCurveTo(0.86 * L * w, -0.84 * L, 0.62 * L * w, -0.10 * L, 0, 0);
    p.closePath();
    return p;
  }

  function drawLeaflet(ctx, L, w, tone, pal) {
    var path = leafletPath(L, w);
    var g = ctx.createLinearGradient(0, 0, 0, -L);
    g.addColorStop(0, tone[0]);
    g.addColorStop(0.85, tone[1]);
    ctx.fillStyle = g;
    ctx.fill(path);
    ctx.save();
    ctx.clip(path);
    ctx.shadowColor = "transparent";
    // pale chevron, typical of white clover
    ctx.beginPath();
    ctx.moveTo(-0.44 * L * w, -0.66 * L);
    ctx.quadraticCurveTo(0, -0.36 * L, 0.44 * L * w, -0.66 * L);
    ctx.strokeStyle = pal.chevron;
    ctx.lineWidth = L * 0.11;
    ctx.lineCap = "round";
    ctx.stroke();
    // soft highlight on the outer half
    var hl = ctx.createRadialGradient(-0.18 * L * w, -0.78 * L, 0, -0.18 * L * w, -0.78 * L, L * 0.5);
    hl.addColorStop(0, "rgba(255,255,240,0.16)");
    hl.addColorStop(1, "rgba(255,255,240,0)");
    ctx.fillStyle = hl;
    ctx.fillRect(-L, -L * 1.2, L * 2, L * 1.2);
    // midrib
    ctx.beginPath();
    ctx.moveTo(0, -L * 0.04);
    ctx.lineTo(0, -L * 0.80);
    ctx.strokeStyle = pal.rib;
    ctx.lineWidth = L * 0.022;
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = pal.edge;
    ctx.lineWidth = L * 0.04;
    ctx.stroke(path);
  }

  /* ---- one clover sprite on its own canvas ---- */
  function makeSprite(size, leaves, tone, pal, rand, blur) {
    var c = document.createElement("canvas");
    c.width = c.height = size;
    var ctx = c.getContext("2d");
    ctx.translate(size / 2, size / 2);
    if (blur) ctx.filter = "blur(" + blur + "px)";
    ctx.scale(1, 0.74); // seen from slightly above
    var L = size * 0.44;
    var base = rand() * Math.PI * 2;
    ctx.shadowColor = pal.shadow;
    ctx.shadowBlur = size * 0.05;
    ctx.shadowOffsetY = size * 0.035;
    for (var i = 0; i < leaves; i++) {
      ctx.save();
      ctx.rotate(base + i * (Math.PI * 2 / leaves) + (rand() - 0.5) * 0.22);
      ctx.translate(0, -L * 0.05);
      drawLeaflet(ctx, L * (0.9 + rand() * 0.14), 0.78 + rand() * 0.1, tone, pal);
      ctx.restore();
    }
    // tiny centre
    ctx.shadowColor = "transparent";
    ctx.beginPath();
    ctx.arc(0, 0, L * 0.05, 0, Math.PI * 2);
    ctx.fillStyle = tone[0];
    ctx.fill();
    return c;
  }

  function makeGrass(size, pal, rand, blur) {
    var c = document.createElement("canvas");
    c.width = c.height = size;
    var ctx = c.getContext("2d");
    if (blur) ctx.filter = "blur(" + blur + "px)";
    var n = 4 + Math.floor(rand() * 4);
    for (var i = 0; i < n; i++) {
      var bx = size * (0.42 + rand() * 0.16), by = size * 0.62;
      var h = size * (0.28 + rand() * 0.3), lean = (rand() - 0.5) * size * 0.32;
      var w = size * (0.012 + rand() * 0.01);
      var g = ctx.createLinearGradient(0, by, 0, by - h);
      g.addColorStop(0, pal.grass[0]);
      g.addColorStop(1, pal.grass[1]);
      ctx.beginPath();
      ctx.moveTo(bx - w, by);
      ctx.quadraticCurveTo(bx + lean * 0.3 - w, by - h * 0.6, bx + lean, by - h);
      ctx.quadraticCurveTo(bx + lean * 0.3 + w, by - h * 0.6, bx + w, by);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
    }
    return c;
  }

  function glowSprite(rgb) {
    var c = document.createElement("canvas");
    c.width = c.height = 64;
    var ctx = c.getContext("2d");
    var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(" + rgb + ",1)");
    g.addColorStop(0.22, "rgba(" + rgb + ",0.4)");
    g.addColorStop(1, "rgba(" + rgb + ",0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return c;
  }

  function create(canvas, options) {
    var o = options || {};
    var pal = PALETTES[o.palette] || PALETTES.dusk;
    var seed = o.seed || 7;
    var reduce = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var animate = o.animate !== false && !reduce;
    var useFireflies = o.fireflies == null ? pal.fireflies : o.fireflies;
    var dpr = Math.min(global.devicePixelRatio || 1, o.maxDpr || 1.5);
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, items = [], sprites = [], grass = [], four = null, flies = [], spriteSize = 0;
    var under = null, over = null, flySprite = glowSprite(pal.fly.join(","));
    var start = performance.now(), raf = 0, visible = true, foundAt = 0, burst = [];
    var api = { found: false };

    function buildSprites(sNear) {
      var size = Math.ceil(clamp(sNear * dpr * 1.15, 96, o.spriteMax || 360));
      if (size === spriteSize && sprites.length) return;
      spriteSize = size;
      var r = rng(seed * 31 + 5);
      sprites = pal.tones.map(function (tone, ti) {
        var blur = ti === 0 ? size * (o.farBlur || 0.012) : ti === 1 && o.farBlur ? size * o.farBlur * 0.45 : 0;
        var three = [];
        for (var v = 0; v < 6; v++) three.push(makeSprite(size, 3, tone, pal, r, blur));
        return { three: three, four: makeSprite(size, 4, tone, pal, r, blur) };
      });
      grass = [];
      for (var gi = 0; gi < 5; gi++) grass.push(makeGrass(size, pal, r, gi === 0 ? size * 0.012 : 0));
    }

    function layout() {
      var rect = canvas.getBoundingClientRect();
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      var k = o.scale || 1;
      var sNear = clamp(Math.max(W, H * 1.2) * 0.105, 84, 230) * k;
      var sFar = sNear * 0.44;
      buildSprites(sNear);
      var r = rng(seed);
      items = [];
      var y = -sFar * 0.5;
      while (y < H + sNear * 0.4) {
        var d = clamp(y / H, 0, 1);
        var s = lerp(sFar, sNear, Math.pow(d, 1.35));
        var stepY = s * 0.36, stepX = s * 0.66;
        for (var x = -s * 0.5 + r() * stepX; x < W + s * 0.5; x += stepX * (0.78 + r() * 0.44)) {
          items.push({
            x: x + (r() - 0.5) * stepX * 0.5,
            y: y + (r() - 0.5) * stepY * 0.9,
            s: s * (0.82 + r() * 0.34),
            d: d,
            t: clamp(Math.floor(d * 4.3 + (r() - 0.5) * 1.2), 0, 4),
            v: Math.floor(r() * 6),
            rot: (r() - 0.5) * 0.5,
            ph: r() * Math.PI * 2,
            sp: 0.7 + r() * 0.7,
            four: false,
            k: y
          });
          if (r() < 0.45) items.push({
            x: x + (r() - 0.5) * stepX, y: y + (r() - 0.5) * stepY, s: s * (0.9 + r() * 0.5), d: d,
            g: d < 0.2 ? 0 : 1 + Math.floor(r() * 4), rot: (r() - 0.5) * 0.3, ph: r() * 6.28, sp: 0.9 + r() * 0.8, k: y + 0.01
          });
        }
        y += stepY;
      }
      // the four-leaf clover
      var fl = typeof o.fourLeaf === "function" ? o.fourLeaf(W, H) : o.fourLeaf;
      var fx = (fl && fl.x != null ? fl.x : 0.7) * W;
      var fy = (fl && fl.y != null ? fl.y : 0.6) * H;
      var fd = clamp(fy / H, 0, 1);
      var fs = lerp(sFar, sNear, Math.pow(fd, 1.35)) * (o.fourScale || (o.highlight ? 1.25 : 1.02));
      four = {
        x: fx, y: fy, s: fs, d: fd, t: clamp(Math.floor(fd * 4.3), 0, 4), v: 0,
        rot: 0.15, ph: 1.3, sp: 0.9, four: true, k: o.highlight ? 1e9 : fy + fs * 0.3
      };
      items.push(four);
      items.sort(function (a, b) { return a.k - b.k; });
      bakeLayers();
      // fireflies
      flies = [];
      if (useFireflies) {
        var n = Math.round(clamp(W * H / 26000, 14, 46));
        for (var i = 0; i < n; i++) flies.push({ x: r() * W, y: r() * H * 0.95, a: r() * 6.28, b: r() * 6.28, sp: 0.2 + r() * 0.5, r: 1 + r() * 1.8 });
      }
      if (!animate) draw(performance.now());
    }

    function layer(paint) {
      var c = document.createElement("canvas");
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      var x = c.getContext("2d");
      x.scale(dpr, dpr);
      paint(x);
      return c;
    }
    function bakeLayers() {
      under = layer(function (x) {
        var g = x.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, pal.ground[0]);
        g.addColorStop(0.5, pal.ground[1]);
        g.addColorStop(1, pal.ground[2]);
        x.fillStyle = g;
        x.fillRect(0, 0, W, H);
      });
      over = layer(function (x) {
        var lx = (o.light && o.light.x != null ? o.light.x : 0.72) * W, ly = (o.light && o.light.y != null ? o.light.y : 0.35) * H;
        var lg = x.createRadialGradient(lx, ly, 0, lx, ly, Math.max(W, H) * 0.7);
        lg.addColorStop(0, pal.light[0]);
        lg.addColorStop(1, pal.light[1]);
        x.fillStyle = lg;
        x.fillRect(0, 0, W, H);
        var vg = x.createRadialGradient(W * 0.5, H * 0.45, Math.min(W, H) * 0.35, W * 0.5, H * 0.5, Math.max(W, H) * 0.8);
        vg.addColorStop(0, "rgba(0,0,0,0)");
        vg.addColorStop(1, pal.vignette);
        x.fillStyle = vg;
        x.fillRect(0, 0, W, H);
      });
    }

    function draw(now) {
      var t = (now - start) / 1000;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(under, 0, 0);
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var gust = animate ? Math.sin(it.x * 0.0045 - t * 0.9) * 0.5 + 0.5 : 0.4;
        var sway = animate ? Math.sin(t * it.sp + it.ph) * (0.035 + gust * 0.06) * (0.5 + it.d) : 0;
        var a = it.rot + sway;
        var bob = animate ? Math.sin(t * it.sp * 1.3 + it.ph) * it.s * 0.012 : 0;
        var S = it.s, cs = Math.cos(a), sn = Math.sin(a);
        var px = it.x + sway * S * 0.25, py = it.y + bob;
        if (it.four) { it.dx = px; it.dy = py; }
        if (it.four && (o.highlight || api.found)) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          var glow = ctx.createRadialGradient(px, py, 0, px, py, S * 0.9);
          glow.addColorStop(0, o.highlight ? "rgba(240,255,170,0.55)" : "rgba(232,255,160,0.42)");
          glow.addColorStop(1, "rgba(232,255,160,0)");
          ctx.fillStyle = glow;
          ctx.fillRect(px - S, py - S, S * 2, S * 2);
        }
        ctx.setTransform(cs * dpr, sn * dpr, -sn * dpr, cs * dpr, px * dpr, py * dpr);
        if (it.g != null) { ctx.drawImage(grass[it.g], -S / 2, -S / 2, S, S); continue; }
        var set = sprites[it.t];
        ctx.drawImage(it.four ? set.four : set.three[it.v], -S / 2, -S / 2, S, S);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(over, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // fireflies
      if (flies.length) {
        ctx.globalCompositeOperation = "lighter";
        for (var f = 0; f < flies.length; f++) {
          var fl = flies[f];
          var fx = fl.x + Math.sin(t * fl.sp + fl.a) * 26, fy = fl.y + Math.cos(t * fl.sp * 0.8 + fl.b) * 18;
          var on = 0.35 + 0.65 * Math.max(0, Math.sin(t * (0.8 + fl.sp) + fl.a * 3));
          var hr = fl.r * 7;
          ctx.globalAlpha = 0.9 * on;
          ctx.drawImage(flySprite, fx - hr, fy - hr, hr * 2, hr * 2);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      // found burst
      if (api.found && four) {
        var e = (now - foundAt) / 1000;
        if (e < 1.6) {
          var R = four.s * (0.5 + e * 0.9);
          ctx.beginPath();
          ctx.arc(four.dx, four.dy, R, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(236,255,170," + (1 - e / 1.6) + ")";
          ctx.lineWidth = 3;
          ctx.stroke();
          for (var b = 0; b < burst.length; b++) {
            var bp = burst[b];
            var bx = four.dx + Math.cos(bp.a) * bp.v * e * 60, by = four.dy + Math.sin(bp.a) * bp.v * e * 60 + e * e * 30;
            ctx.fillStyle = "rgba(236,255,170," + Math.max(0, 1 - e / 1.4) + ")";
            ctx.fillRect(bx - 2, by - 2, 4, 4);
          }
        } else if (!animate) {
          return;
        }
        if (!animate && e < 1.6) raf = requestAnimationFrame(draw);
      }
    }

    function loop(now) {
      if (visible) draw(now);
      raf = requestAnimationFrame(loop);
    }

    function onClick(ev) {
      if (!four || api.found) return;
      var rect = canvas.getBoundingClientRect();
      var x = ev.clientX - rect.left, y = ev.clientY - rect.top;
      var fx = four.dx != null ? four.dx : four.x, fy = four.dy != null ? four.dy : four.y;
      var dx = x - fx, dy = (y - fy) * 1.25;
      if (Math.sqrt(dx * dx + dy * dy) < four.s * 0.5) {
        api.found = true;
        foundAt = performance.now();
        burst = [];
        for (var i = 0; i < 18; i++) burst.push({ a: Math.random() * 6.28, v: 0.6 + Math.random() });
        if (!animate) raf = requestAnimationFrame(draw);
        if (o.onFound) o.onFound(Math.max(1, Math.round((foundAt - start) / 1000)));
      } else if (o.onMiss) {
        o.onMiss();
      }
    }

    layout();
    if (o.interactive !== false) canvas.addEventListener("click", onClick);
    var ro = global.ResizeObserver ? new ResizeObserver(function () { layout(); }) : null;
    if (ro) ro.observe(canvas);
    var io = global.IntersectionObserver ? new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }) : null;
    if (io) io.observe(canvas);
    document.addEventListener("visibilitychange", function () { visible = !document.hidden; });
    if (animate) raf = requestAnimationFrame(loop); else draw(performance.now());

    api.relayout = layout;
    api.drawAt = function (seconds) { draw(start + seconds * 1000); };
    api.destroy = function () { cancelAnimationFrame(raf); if (ro) ro.disconnect(); if (io) io.disconnect(); canvas.removeEventListener("click", onClick); };
    api.fourLeafAt = function () { return four ? { x: four.dx != null ? four.dx : four.x, y: four.dy != null ? four.dy : four.y, size: four.s } : null; };
    return api;
  }

  global.CloverField = { create: create, palettes: PALETTES };
})(window);
