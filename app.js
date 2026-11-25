"use strict";

const { nodes, edges, passages } = window.JAZZ_NETWORK;
const byId = new Map(nodes.map((n) => [n.id, n]));
const neighbors = new Map(nodes.map((n) => [n.id, new Map()]));
const pairs = new Map();
const keyOf = (a, b) => [a, b].sort().join("-");
const className = {
  interviewee: "Interviewee",
  shrine: "Jazz shrine",
  musician: "Musician",
};
const colors = {
  interviewee: "#e6a18c",
  shrine: "#e4bc70",
  musician: "#89b9ae",
};
const priority = [
  "performed at",
  "recorded at place",
  "founder of",
  "founded by",
  "booked",
  "frequented place",
  "attended performance at",
  "visited place",
  "knows of place",
];
const rank = (label) =>
  priority.includes(label) ? priority.indexOf(label) : priority.length;
for (const e of edges) {
  const key = keyOf(e.source, e.target);
  if (!pairs.has(key)) pairs.set(key, []);
  pairs.get(key).push(e);
  neighbors.get(e.source).set(e.target, pairs.get(key));
  neighbors.get(e.target).set(e.source, pairs.get(key));
}
for (const items of pairs.values())
  items.sort(
    (a, b) => rank(a.label) - rank(b.label) || a.label.localeCompare(b.label)
  );

const icons = {
  network:
    '<circle cx="5" cy="12" r="2.5"/><circle cx="17" cy="5" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m7 11 8-5m-8 7 9 4m1-9 .5 7"/>',
  focus:
    '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
  book: '<path d="M12 6C8 3 5 4 2 4v14c3 0 6-1 10 2 4-3 7-2 10-2V4c-3 0-6-1-10 2v14"/>',
  search: '<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/>',
  fit: '<path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5"/>',
  file: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7m-7 4h6"/>',
  external: '<path d="M13 4h7v7m0-7L10 14m-1-9H4v15h15v-5"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0z"/><circle cx="12" cy="10" r="2.25"/>',
  left: '<path d="m14.5 5-7 7 7 7"/>',
  right: '<path d="m9.5 5 7 7-7 7"/>',
  plus: '<path d="M4 12h16M12 4v16"/>',
  minus: '<path d="M4 12h16"/>',
  x: '<path d="m5 5 14 14m0-14L5 19"/>',
  building:
    '<path d="M3 20h18M5 20V9h14v11M3 9l2-5h14l2 5zM8 20v-6h4v6m3-7h2v3h-2z"/>',
};
const icon = (k) =>
  '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">' +
  icons[k] +
  "</svg>";
const inlineIcon = (k) => '<i data-icon="' + k + '">' + icon(k) + "</i>";
document
  .querySelectorAll("[data-icon]")
  .forEach((i) => (i.innerHTML = icon(i.dataset.icon)));
const $ = (id) => document.getElementById(id);
const graph = $("graph");
const esc = (val) =>
  String(val ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ])
  );
const itemUrl = (q) => "https://base.semlab.io/wiki/Item:" + q;
const link = (url, title) =>
  '<a class="record-link" href="' +
  esc(url) +
  '" target="_blank" rel="noreferrer">' +
  esc(title) +
  inlineIcon("external") +
  "</a>";
const dot = (type) => '<b class="dot ' + type + '"></b>';
const initials = (n) =>
  n.name
    .split(/\s+/)
    .filter((w) => !/^sr[.,]*$/i.test(w))
    .filter((_, i, a) => i === 0 || i === a.length - 1)
    .map((w) => w[0])
    .join("");
const avatar = (n, big = false) =>
  '<span aria-hidden="true" class="avatar ' +
  n.type +
  (big ? " big" : "") +
  '">' +
  (n.photo
    ? '<img src="' + esc(n.photo) + '" alt="">'
    : n.type === "shrine"
    ? inlineIcon("building")
    : esc(initials(n))) +
  "</span>";
const classTag = (n) =>
  '<span class="class-label ' +
  n.type +
  '">' +
  dot(n.type) +
  className[n.type] +
  "</span>";
const state = {
  id: null,
  full: true,
  pair: null,
  page: 0,
  labels: true,
  x: 0,
  y: 0,
  scale: 1,
};
let width = 900,
  height = 510,
  capacity = 8,
  overview = null,
  directoryType = "all",
  searchOpener = null;
const resetCamera = () => Object.assign(state, { x: 0, y: 0, scale: 1 });
const byName = (a, b) => byId.get(a).name.localeCompare(byId.get(b).name);
function orderOf(id) {
  const ids = [...neighbors.get(id).keys()];
  return ids.sort(
    (a, b) =>
      neighbors.get(id).get(b).length - neighbors.get(id).get(a).length ||
      byName(a, b)
  );
}
function focusOrder(id) {
  const items = orderOf(id);
  if (byId.get(id).type !== "shrine") return items;
  const first = items.filter((i) => byId.get(i).type === "interviewee");
  const second = items.filter((i) => byId.get(i).type === "musician");
  const result = [];
  for (let i = 0; i < Math.max(first.length, second.length); i++) {
    if (first[i]) result.push(first[i]);
    if (second[i]) result.push(second[i]);
  }
  return result;
}
function navigate(id, full = false) {
  const hash = full ? (id ? "#all/" + id : "#all") : "#" + id;
  if (location.hash === hash) loadRoute();
  else location.hash = hash;
}
function loadRoute() {
  const match = /^#(all\/)?(Q\d+)$/.exec(location.hash);
  const id = match && byId.has(match[2]) ? match[2] : null;
  Object.assign(state, {
    id,
    full: !id || Boolean(match[1]),
    pair: null,
    page: 0,
  });
  resetCamera();
  render();
}
function svgEl(tag, attrs, parent) {
  const object = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs || {})) object.setAttribute(k, v);
  if (parent) parent.append(object);
  return object;
}
function svgText(tag, attrs, parent, text) {
  const object = svgEl(tag, attrs, parent);
  object.textContent = text;
  return object;
}
function graphDefs() {
  const defs = svgEl("defs", {}, graph);
  Object.entries(colors).forEach(([type, color]) => {
    const marker = svgEl(
      "marker",
      {
        id: "tip-" + type,
        viewBox: "0 0 10 10",
        refX: 8,
        refY: 5,
        markerWidth: 6,
        markerHeight: 6,
        orient: "auto-start-reverse",
      },
      defs
    );
    svgEl("path", { d: "M1 1 9 5 1 9Z", fill: color }, marker);
  });
  return defs;
}
function linesFor(name, limit) {
  const words = name.split(/\s+/),
    lines = [""];
  for (const word of words) {
    const last = lines.length - 1;
    if (lines[last].length && (lines[last] + " " + word).length > limit)
      lines.push(word);
    else lines[last] += (lines[last] ? " " : "") + word;
  }
  return lines;
}
function nodeShape(parent, n, x, y, center, defs, topName = false) {
  const small = width < 590;
  const r = center ? (small ? 29 : 35) : small ? 18 : 23;
  const g = svgEl(
    "g",
    {
      class: "node",
      transform: "translate(" + x + " " + y + ")",
      "data-node": n.id,
      role: "button",
      tabindex: 0,
      "aria-label": "Explore " + n.name + ", " + className[n.type],
    },
    parent
  );
  svgText(
    "title",
    {},
    g,
    n.name + " · " + className[n.type] + " · Explore connections"
  );
  const color = colors[n.type];
  if (n.type === "shrine") {
    const diamond = r + 4;
    const path = (d) => "M0 " + -d + " " + d + " 0 0 " + d + " " + -d + " 0Z";
    svgEl(
      "path",
      { d: path(diamond + 4), fill: "none", stroke: color, opacity: 0.5 },
      g
    );
    svgEl(
      "path",
      {
        class: "rim",
        d: path(diamond),
        fill: center ? "#deb876" : "#2e3e34",
        stroke: color,
        "stroke-width": 1.5,
      },
      g
    );
    const shop = svgEl(
      "g",
      {
        transform: "scale(" + (center ? 1 : 0.65) + ")",
        stroke: center ? "#463e2a" : color,
        fill: "none",
        "stroke-width": 1.7,
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
      },
      g
    );
    svgEl(
      "path",
      {
        d: "M-18 15h36m-33-1V-4h30v18M-17-4l3-9h28l3 9zM-18-4q2 5 5 0 2.5 5 5 0 2.5 5 5 0 3 5 6 0 2.5 5 5 0 2.5 5 5 0 3 5 5 0M-11 13V2h7v11m5-11h10v7H1zM-12-16h24",
      },
      shop
    );
  } else {
    const clip = "clip-" + n.id;
    svgEl(
      "circle",
      {
        cx: 0,
        cy: 0,
        r: r + 4.5,
        fill: "#1d302d",
        stroke: color,
        "stroke-width": n.type === "interviewee" ? 1.7 : 0.8,
      },
      g
    );
    svgEl(
      "circle",
      {
        class: "rim",
        cx: 0,
        cy: 0,
        r: r + 1.7,
        fill: color,
        stroke: color,
        "stroke-width": 1.8,
      },
      g
    );
    if (n.photo) {
      svgEl(
        "circle",
        { cx: 0, cy: 0, r },
        svgEl("clipPath", { id: clip }, defs)
      );
      svgEl(
        "image",
        {
          x: -r,
          y: -r,
          width: r * 2,
          height: r * 2,
          href: n.photo,
          preserveAspectRatio: "xMidYMid slice",
          "clip-path": "url(#" + clip + ")",
          style: "filter:grayscale(1)",
        },
        g
      );
    } else {
      svgEl(
        "circle",
        {
          cx: 0,
          cy: 0,
          r,
          fill: n.type === "interviewee" ? "#694c41" : "#34544f",
        },
        g
      );
      svgText(
        "text",
        {
          "text-anchor": "middle",
          y: small ? 5 : 7,
          fill: "#f3e9ce",
          "font-family": "Georgia,serif",
          "font-size": center ? 25 : 19,
        },
        g,
        initials(n)
      );
    }
  }
  const nameLimit = Math.max(
    9,
    Math.floor(((Math.min(x, width - x) - 5) * 2) / (small ? 7.6 : 8.3))
  );
  const lines = linesFor(
    n.name,
    Math.min(nameLimit, center ? (small ? 17 : 25) : small ? 15 : 21)
  );
  const space = small ? 15 : 17;
  const y0 = topName
    ? -r - 12 - (lines.length - 1) * space
    : r + (center ? 26 : 22);
  const t = svgEl(
    "text",
    {
      class: "node-name" + (center ? " center-name" : ""),
      "text-anchor": "middle",
      y: y0,
    },
    g
  );
  lines
    .slice(0, 3)
    .forEach((line, i) =>
      svgText(
        "tspan",
        { x: 0, dy: i === 0 ? 0 : space },
        t,
        line + (i === 2 && lines.length > 3 ? "…" : "")
      )
    );
}
function drawPair(parent, center, other, a, b) {
  const items = neighbors.get(center.id).get(other.id);
  const active = state.pair === keyOf(center.id, other.id);
  const g = svgEl(
    "g",
    {
      class: "pair" + (active ? " active" : ""),
      "data-pair": other.id,
      role: "button",
      tabindex: 0,
      "aria-label": items
        .map(
          (e) =>
            byId.get(e.source).name +
            " " +
            e.label +
            " " +
            byId.get(e.target).name
        )
        .join(". "),
    },
    parent
  );
  svgText(
    "title",
    {},
    g,
    items
      .map(
        (e) =>
          byId.get(e.source).name +
          " · " +
          e.label +
          " · " +
          byId.get(e.target).name
      )
      .join("\n")
  );
  const vx = b.x - a.x,
    vy = b.y - a.y,
    len = Math.hypot(vx, vy);
  const ux = vx / len,
    uy = vy / len;
  const boundary = (n, r) =>
    n.type === "shrine" ? (r + 9) / (Math.abs(ux) + Math.abs(uy)) : r + 6;
  const small = width < 590,
    near = boundary(center, small ? 29 : 35),
    far = boundary(other, small ? 18 : 23);
  const x1 = a.x + ux * (near + 2),
    y1 = a.y + uy * (near + 2),
    x2 = b.x - ux * (far + 2),
    y2 = b.y - uy * (far + 2);
  const type = other.type,
    color = colors[type],
    line = { x1, y1, x2, y2 };
  svgEl("line", { ...line, stroke: "transparent", "stroke-width": 18 }, g);
  const attrs = {
    ...line,
    class: "connector",
    stroke: color,
    "stroke-opacity": 0.78,
    "stroke-width": 1.4,
  };
  if (other.type === "interviewee") attrs["stroke-dasharray"] = "5 4";
  if (items.some((e) => e.target === center.id))
    attrs["marker-start"] = "url(#tip-" + type + ")";
  if (items.some((e) => e.target === other.id))
    attrs["marker-end"] = "url(#tip-" + type + ")";
  svgEl("line", attrs, g);
  if (!state.labels) return;
  const angle = (Math.atan2(vy, vx) * 180) / Math.PI;
  const rot = angle > 90 ? angle - 180 : angle < -90 ? angle + 180 : angle;
  const tx = (x1 + x2) / 2,
    ty = (y1 + y2) / 2;
  const words = active
    ? [...new Set(items.map((e) => e.label))]
    : [items[0].label + (items.length > 1 ? " +" + (items.length - 1) : "")];
  const label = svgEl(
    "g",
    { transform: "translate(" + tx + " " + ty + ") rotate(" + rot + ")" },
    g
  );
  const available = Math.max(
    10,
    Math.floor((len - near - far - 6) / (small ? 7.2 : 8))
  );
  const rows = words.flatMap((word) => linesFor(word, available));
  rows.forEach((word, i) =>
    svgText(
      "text",
      {
        "text-anchor": "middle",
        y: -5 - (rows.length - 1 - i) * 15,
        class: "edge-word",
      },
      label,
      word
    )
  );
}
function positions(items) {
  const small = width < 590,
    cx = width / 2,
    cy = height / 2 + (small ? 4 : 0);
  const center = { x: cx, y: cy };
  const pts = new Map();
  let left = items.filter((q) => byId.get(q).type === "interviewee"),
    right = items.filter((q) => byId.get(q).type !== "interviewee");
  if (
    !left.length ||
    !right.length ||
    Math.abs(left.length - right.length) > (small ? 1 : 2)
  ) {
    left = items.slice(0, Math.ceil(items.length / 2));
    right = items.slice(left.length);
  }
  for (const [side, group] of [
    [-1, left],
    [1, right],
  ]) {
    group.forEach((id, i) => {
      const solo = small ? (side < 0 ? -0.78 : 0.78) : 0;
      const t = group.length === 1 ? solo : (i / (group.length - 1)) * 2 - 1;
      const dx = small
        ? width * (0.285 + 0.033 * (1 - Math.abs(t)))
        : (width * 0.5 - 85) * (1 - 0.27 * t * t);
      const dy = small
        ? height * 0.267
        : Math.min(height * 0.302, (height - 180) / 2);
      pts.set(id, {
        x: cx + side * dx,
        y: cy + t * dy,
        topName: small && t < 0,
      });
    });
  }
  return { center, pts };
}
function drawFocus(view, defs) {
  const n = byId.get(state.id),
    all = focusOrder(n.id),
    pages = Math.max(1, Math.ceil(all.length / capacity));
  state.page = Math.min(state.page, pages - 1);
  const items = all.slice(state.page * capacity, (state.page + 1) * capacity);
  const { center, pts } = positions(items);
  [57, 80, 105].forEach((r) =>
    svgEl("circle", { class: "ring", cx: center.x, cy: center.y, r }, view)
  );
  for (const [id, b] of pts) drawPair(view, n, byId.get(id), center, b);
  for (const [id, p] of pts)
    nodeShape(view, byId.get(id), p.x, p.y, false, defs, p.topName);
  nodeShape(view, n, center.x, center.y, true, defs);
  if (!all.length)
    svgText(
      "text",
      {
        class: "empty-message",
        x: width / 2,
        y: center.y + 99,
        "text-anchor": "middle",
      },
      view,
      "No direct connections in this selection"
    );
  $("page-controls").hidden = pages === 1;
  $("page-count").textContent = state.page + 1 + " / " + pages;
  $("prev").disabled = state.page === 0;
  $("next").disabled = state.page === pages - 1;
  $("graph-count").textContent =
    pages > 1
      ? state.page * capacity +
        1 +
        "–" +
        (state.page * capacity + items.length) +
        " of " +
        all.length +
        " connections"
      : all.length + " direct connection" + (all.length === 1 ? "" : "s");
}
// Give the full graph a stable layout. Only this overview uses a force layout.
function overviewLayout() {
  const active = nodes.filter((n) => neighbors.get(n.id).size),
    isolated = nodes.filter((n) => !neighbors.get(n.id).size);
  const pts = active.map((n, i) => {
    const a = i * 2.399963,
      r = 15 + 145 * Math.sqrt((i + 1) / active.length);
    return { id: n.id, x: Math.cos(a) * r, y: Math.sin(a) * r, vx: 0, vy: 0 };
  });
  const map = new Map(pts.map((p) => [p.id, p]));
  const joins = [...pairs.values()].map(([edge]) => {
    const degree = Math.min(
      neighbors.get(edge.source).size,
      neighbors.get(edge.target).size
    );
    return [
      map.get(edge.source),
      map.get(edge.target),
      0.022 / Math.sqrt(degree),
    ];
  });
  for (let step = 0; step < 180; step++) {
    const cool = 1 - step / 205;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      p.vx -= p.x * 0.0015;
      p.vy -= p.y * 0.0015;
      for (let j = 0; j < i; j++) {
        const q = pts[j],
          dx = p.x - q.x,
          dy = p.y - q.y,
          force = 24 / (dx * dx + dy * dy + 3);
        p.vx += dx * force;
        p.vy += dy * force;
        q.vx -= dx * force;
        q.vy -= dy * force;
      }
    }
    for (const [p, q, strength] of joins) {
      const dx = q.x - p.x,
        dy = q.y - p.y,
        dist = Math.hypot(dx, dy) || 1;
      const f = (strength * (dist - 36)) / dist;
      p.vx += dx * f;
      p.vy += dy * f;
      q.vx -= dx * f;
      q.vy -= dy * f;
    }
    for (const p of pts) {
      p.vx *= 0.62;
      p.vy *= 0.62;
      p.x += p.vx * cool;
      p.y += p.vy * cool;
    }
  }
  const maxX = Math.max(...pts.map((p) => Math.abs(p.x))),
    maxY = Math.max(...pts.map((p) => Math.abs(p.y)));
  for (const p of pts) {
    p.x /= maxX;
    p.y /= maxY;
  }
  // Spread the dense core over the canvas while preserving radial order and direction.
  const radial = pts
    .map((p) => ({ p, distance: Math.hypot(p.x, p.y) }))
    .sort((a, b) => a.distance - b.distance);
  radial.forEach(({ p, distance }, i) => {
    if (!distance) return;
    const radius =
      0.38 * distance + 0.62 * Math.sqrt((i + 0.5) / radial.length);
    p.x *= radius / distance;
    p.y *= radius / distance;
  });
  isolated.forEach((n, i) =>
    map.set(n.id, {
      id: n.id,
      x: -0.55 + (1.1 * i) / Math.max(1, isolated.length - 1),
      y: 1.03,
    })
  );
  return map;
}
const overviewPoints = new Map();
const labelOrder = [];
const byDegree = (a, b) =>
  neighbors.get(b.id).size - neighbors.get(a.id).size ||
  a.name.localeCompare(b.name);
const cohorts = ["shrine", "interviewee", "musician"].map((type) =>
  nodes.filter((n) => n.type === type).sort(byDegree)
);
for (let i = 0; i < Math.max(...cohorts.map((group) => group.length)); i++) {
  for (const cohort of cohorts) if (cohort[i]) labelOrder.push(cohort[i]);
}

function drawFull(view) {
  if (!overview) overview = overviewLayout();
  overviewPoints.clear();
  const nodeLayer = svgEl("g", { class: "overview-nodes" });
  for (const n of nodes) {
    const p = overview.get(n.id);
    const active = n.id === state.id;
    const r = active
      ? 6.5
      : 3 + Math.min(3, Math.sqrt(neighbors.get(n.id).size) * 0.45);
    const x = width / 2 + p.x * (width * 0.465),
      y = height * 0.52 + p.y * (height * 0.385);
    overviewPoints.set(n.id, { x, y, r });
    const g = svgEl(
      "g",
      {
        class: "node",
        "data-node": n.id,
        transform: "translate(" + x + " " + y + ")",
        role: "button",
        tabindex: active ? 0 : -1,
        "aria-label": "Explore " + n.name,
      },
      nodeLayer
    );
    svgText("title", {}, g, n.name + " · " + className[n.type]);
    const mark = svgEl("g", { class: "overview-mark" }, g);
    const paint = {
      fill: colors[n.type],
      stroke: active ? "#fff5cd" : "#172b2b",
      "stroke-width": 0.9,
    };
    if (n.type === "shrine") {
      svgEl("path", { ...paint, d: `M0 ${-r} ${r} 0 0 ${r} ${-r} 0Z` }, mark);
    } else {
      svgEl("circle", { ...paint, r }, mark);
      if (n.type === "interviewee")
        svgEl(
          "circle",
          {
            r: r + 1.3,
            fill: "none",
            stroke: colors.interviewee,
            "stroke-width": 0.7,
          },
          mark
        );
    }
    svgEl("circle", { r: r + 3, fill: "transparent" }, mark);
  }
  const edgeLayer = svgEl("g", {}, view);
  for (const [key, list] of pairs) {
    const e = list[0],
      a = overviewPoints.get(e.source),
      b = overviewPoints.get(e.target);
    const person = byId.get(
      byId.get(e.source).type === "shrine" ? e.target : e.source
    );
    const near = e.source === state.id || e.target === state.id;
    const g = svgEl(
      "g",
      { class: "pair", "data-overview-edge": key },
      edgeLayer
    );
    const line = {
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      "vector-effect": "non-scaling-stroke",
    };
    svgEl("line", { ...line, stroke: "transparent", "stroke-width": 6 }, g);
    svgEl(
      "line",
      {
        ...line,
        class: "connector",
        stroke: near ? "#e2c987" : colors[person.type],
        "stroke-opacity": near ? 0.9 : 0.31,
        "stroke-width": near ? 1.5 : 0.85,
      },
      g
    );
    svgText(
      "desc",
      {},
      g,
      list
        .map(
          (r) =>
            byId.get(r.source).name +
            " · " +
            r.label +
            " · " +
            byId.get(r.target).name
        )
        .join("\n")
    );
  }
  view.append(nodeLayer);
  svgEl("g", { id: "map-names" }, graph);
  svgText(
    "text",
    { id: "overview-label", class: "map-name hover-label", "text-anchor": "middle", "pointer-events": "none" },
    graph,
    ""
  );
  $("page-controls").hidden = true;
  $("graph-count").textContent =
    nodes.length + " nodes · " + pairs.size + " connections";
}

const textMetrics = document.createElement("canvas").getContext("2d");
const labelWidths = new Map();
function labelWidth(text, font) {
  const key = font + text;
  if (!labelWidths.has(key)) {
    textMetrics.font = font;
    labelWidths.set(key, Math.ceil(textMetrics.measureText(text).width));
  }
  return labelWidths.get(key);
}
function screenPosition(p) {
  return {
    x: width / 2 + state.x + (p.x - width / 2) * state.scale,
    y: height / 2 + state.y + (p.y - height / 2) * state.scale,
    r: p.r,
  };
}
function intersects(a, b) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}
let reservedSpace = [];
function layoutOverviewLabels() {
  const layer = $("map-names");
  const points = new Map(),
    occupied = reservedSpace.slice();
  for (const [id, p] of overviewPoints) {
    const s = screenPosition(p);
    points.set(id, s);
    if (s.x < -8 || s.y < -8 || s.x > width + 8 || s.y > height + 8) continue;
    occupied.push({
      x: s.x - s.r - 1,
      y: s.y - s.r - 1,
      w: s.r * 2 + 2,
      h: s.r * 2 + 2,
    });
  }
  const fragment = document.createDocumentFragment();
  function fits(box) {
    return (
      box.x >= 5 &&
      box.y >= 5 &&
      box.x + box.w <= width - 5 &&
      box.y + box.h <= height - 5 &&
      !occupied.some((obstacle) => intersects(box, obstacle))
    );
  }
  const maxNames = Math.max(
    8,
    Math.ceil(((width * height) / 18000) * Math.pow(state.scale, 1.25))
  );
  let placed = 0;
  const ordered = state.id
    ? [byId.get(state.id), ...labelOrder.filter((n) => n.id !== state.id)]
    : labelOrder;
  for (const n of ordered) {
    if (placed >= maxNames) break;
    const p = points.get(n.id);
    if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) continue;
    const font = '500 13px "Helvetica Neue", Arial, sans-serif';
    const w = labelWidth(n.name, font) + 7,
      h = 19,
      gap = p.r + 4;
    const options = [
      [gap, -h / 2],
      [-w - gap, -h / 2],
      [-w / 2, -h - gap],
      [-w / 2, gap],
      [gap, -h - gap],
      [-w - gap, gap],
      [gap, gap],
      [-w - gap, -h - gap],
    ];
    for (const [dx, dy] of options) {
      const box = { x: p.x + dx, y: p.y + dy, w, h };
      if (!fits(box)) continue;
      svgText(
        "text",
        {
          x: box.x + 3.5,
          y: box.y + 14,
          class: "map-name " + n.type,
          "data-node": n.id,
        },
        fragment,
        n.name
      );
      occupied.push(box);
      placed++;
      break;
    }
  }
  layer.replaceChildren(fragment);
  showOverviewName(null);
}

function showOverviewName(nodeId) {
  const label = $("overview-label");
  if (!label) return;
  if (!nodeId || $("map-names").querySelector('[data-node="' + nodeId + '"]')) {
    label.textContent = "";
    return;
  }
  const point = screenPosition(overviewPoints.get(nodeId));
  const text = byId.get(nodeId).name;
  const margin = Math.min(width / 2, labelWidth(text, "13px Arial") / 2 + 7);
  label.setAttribute("x", Math.max(margin, Math.min(width - margin, point.x)));
  label.setAttribute("y", Math.max(15, Math.min(height - 4, point.y - 12)));
  label.textContent = text;
}
let cameraFrame = 0;
function camera() {
  const view = $("viewport");
  if (!view) return;
  view.setAttribute(
    "transform",
    `translate(${width / 2 + state.x} ${height / 2 + state.y}) scale(${
      state.scale
    }) translate(${-width / 2} ${-height / 2})`
  );
  if (state.full) {
    view.style.setProperty("--marker-scale", 1 / state.scale);
    layoutOverviewLabels();
  }
  $("out").disabled = state.scale <= 0.65;
  $("in").disabled = state.scale >= maxZoom();
}
function requestCamera() {
  if (cameraFrame) return;
  cameraFrame = requestAnimationFrame(() => {
    cameraFrame = 0;
    camera();
  });
}
function draw() {
  const rect = graph.getBoundingClientRect();
  if (state.full && rect.width && rect.height) {
    state.x *= Math.round(rect.width) / width;
    state.y *= Math.round(rect.height) / height;
  }
  width = Math.round(rect.width) || 900;
  height = Math.round(rect.height) || 510;
  capacity = width < 590 ? 4 : 8;
  graph.replaceChildren();
  graph.setAttribute("viewBox", "0 0 " + width + " " + height);
  const defs = graphDefs(),
    view = svgEl("g", { id: "viewport" }, graph);
  if (state.full) {
    drawFull(view);
    reservedSpace = [
      ...document.querySelectorAll(".plot-bar > *, .graph-controls"),
    ].map((el) => {
      const box = el.getBoundingClientRect();
      return {
        x: box.left - rect.left - 3,
        y: box.top - rect.top - 3,
        w: box.width + 6,
        h: box.height + 6,
      };
    });
  } else drawFocus(view, defs);
  camera();
}
function linkRow(id, items) {
  const n = byId.get(id);
  return (
    '<button class="list-row" data-edge="' +
    id +
    '">' +
    avatar(n) +
    "<span><b>" +
    esc(n.name) +
    "</b><small>" +
    esc(items[0].label) +
    (items.length > 1 ? " +" + (items.length - 1) : "") +
    "</small></span>" +
    inlineIcon("right") +
    "</button>"
  );
}
function recordDetails(n) {
  const ids = orderOf(n.id);
  let html =
    '<div class="record-body">' +
    (n.type === "shrine" ? "" : avatar(n, true)) +
    classTag(n) +
    '<h3 class="record-title">' +
    esc(n.name) +
    "</h3>";
  if (n.type === "shrine") {
    if (n.address)
      html +=
        '<p class="address">' + inlineIcon("pin") + esc(n.address) + "</p>";
    if (n.map)
      html +=
        '<div class="map-thumb"><img alt="Detail of the 1950 Brooklyn street map near ' +
        esc(n.name) +
        '" src="' +
        n.map +
        '"><span class="pin"></span><small>1950 STREET MAP</small></div>';
    const facts = [];
    if (n.aliases.length) facts.push(["Also known as", n.aliases.join(", ")]);
    if (n.start.length) facts.push(["Start year", n.start.join(", ")]);
    if (n.end.length) facts.push(["End year", n.end.join(", ")]);
    if (facts.length)
      html +=
        '<dl class="facts">' +
        facts
          .map(
            ([k, v]) => "<div><dt>" + k + "</dt><dd>" + esc(v) + "</dd></div>"
          )
          .join("") +
        "</dl>";
  } else {
    if (n.description) html += '<p class="desc">' + esc(n.description) + "</p>";
    if (n.musicianEvidence)
      html += '<p class="method">' + esc(n.musicianEvidence) + "</p>";
    if (n.interviews)
      html +=
        "<details><summary>Interview records (" +
        n.interviews.length +
        ')</summary><ul class="source-list">' +
        n.interviews
          .map((d) => "<li>" + link(itemUrl(d.id), d.name) + "</li>")
          .join("") +
        "</ul></details>";
  }
  html +=
    '<div class="source-links">' +
    link(itemUrl(n.id), "Wikibase record") +
    (n.credit ? link(n.credit, "Portrait source") : "") +
    (n.wikidata
      ? link("https://www.wikidata.org/wiki/" + n.wikidata, "Wikidata")
      : "") +
    "</div></div>";
  html +=
    '<div class="connection-section"><div class="section-title"><h3>Direct connections</h3><span class="badge">' +
    ids.length +
    '</span></div><div class="list-scroll">' +
    (ids.length
      ? ids.map((q) => linkRow(q, neighbors.get(n.id).get(q))).join("")
      : '<p class="empty">No qualifying person–shrine statements in this snapshot.</p>') +
    "</div></div>";
  return html;
}
function passageBody(block) {
  const [id, name] = block;
  return (
    "<blockquote>" +
    esc(passages[id] || "Passage text is unavailable for this block.") +
    "</blockquote>" +
    link(itemUrl(id), name)
  );
}
function passageReader(r, index) {
  if (!r.blocks.length)
    return (
      '<p class="unreferenced">This statement has no cited transcript block.</p>' +
      link(itemUrl(r.source) + "#" + r.pid, "Wikibase statement")
    );
  let controls = '<span class="minihead">Transcript passage</span>';
  if (r.blocks.length > 1) {
    controls +=
      '<select aria-label="Choose a cited transcript passage" data-passage="' +
      index +
      '">' +
      r.blocks
        .map(
          ([id, name], i) =>
            '<option value="' +
            i +
            '">' +
            (i + 1) +
            " of " +
            r.blocks.length +
            " · " +
            esc(name) +
            "</option>"
        )
        .join("") +
      "</select>";
  }
  return (
    '<div class="passage-reader">' +
    controls +
    '<div class="passage-body">' +
    passageBody(r.blocks[0]) +
    "</div></div>"
  );
}
function pairDetails() {
  const items = pairs.get(state.pair),
    e = items[0],
    other = byId.get(e.source === state.id ? e.target : e.source);
  let html =
    '<div class="record-body">' +
    classTag(other) +
    '<h3 class="pair-title">' +
    esc(other.name) +
    '</h3><p class="desc">Connected to ' +
    esc(byId.get(state.id).name) +
    "</p>";
  for (const [index, r] of items.entries()) {
    html +=
      '<div class="relation"><h3>' +
      esc(byId.get(r.source).name) +
      " <span>" +
      esc(r.label) +
      "</span> " +
      esc(byId.get(r.target).name) +
      "</h3>";
    for (const detail of r.details)
      html += "<small>" + esc(detail) + "</small><br>";
    html += passageReader(r, index);
    html += "</div>";
  }
  const query =
    "SELECT ?subject ?property ?object WHERE { VALUES (?subject ?object) { (wd:" +
    e.source +
    " wd:" +
    e.target +
    ") (wd:" +
    e.target +
    " wd:" +
    e.source +
    ") } ?subject ?direct ?object . ?property wikibase:directClaim ?direct . }";
  return (
    html +
    link(
      "https://query.semlab.io/#" + encodeURIComponent(query),
      "Inspect live statements"
    ) +
    '<button class="action-button" data-focus="' +
    other.id +
    '">Explore ' +
    esc(other.name) +
    '</button><button class="record-link" data-back>Back to ' +
    esc(byId.get(state.id).name) +
    "</button></div>"
  );
}
function inspector() {
  const panel = document.querySelector(".inspector");
  panel.hidden = !state.id;
  panel.scrollTop = 0;
  document
    .querySelector(".workbench")
    .classList.toggle("overview-only", !state.id);
  if (!state.id) {
    $("record").replaceChildren();
    return;
  }
  $("panel-head").textContent = state.pair
    ? "Relationship details"
    : "Node details";
  $("record").innerHTML = state.pair
    ? pairDetails()
    : recordDetails(byId.get(state.id));
}
function render() {
  $("edge-label-control").hidden = state.full;
  $("focused").setAttribute("aria-pressed", String(!state.full));
  $("whole").setAttribute("aria-pressed", String(state.full));
  $("mode").textContent = state.full
    ? "Collection overview"
    : "Direct connections";
  $("plot-name").textContent = state.full
    ? "Full network"
    : byId.get(state.id).name;
  inspector();
  draw();
  document
    .querySelector("#shrine-list [aria-current]")
    ?.removeAttribute("aria-current");
  if (state.id)
    document
      .querySelector('#shrine-list a[href="#' + state.id + '"]')
      ?.setAttribute("aria-current", "true");
  $("announce").textContent = state.full
    ? "Full network"
    : byId.get(state.id).name +
      ", " +
      neighbors.get(state.id).size +
      " direct connections";
}
function selectPair(id) {
  state.pair = keyOf(state.id, id);
  if (!state.full)
    state.page = Math.floor(focusOrder(state.id).indexOf(id) / capacity);
  inspector();
  draw();
  $("announce").textContent =
    "Relationship details for " +
    byId.get(id).name +
    " and " +
    byId.get(state.id).name;
  if (window.matchMedia("(max-width:800px)").matches)
    document.querySelector(".inspector").scrollIntoView({ block: "start" });
}
function graphSelect(target) {
  const n = target.closest("[data-node]"),
    p = target.closest("[data-pair]");
  const overviewEdge = target.closest("[data-overview-edge]");
  if (n) navigate(n.dataset.node);
  else if (p) selectPair(p.dataset.pair);
  else if (overviewEdge) {
    const { source, target } = pairs.get(overviewEdge.dataset.overviewEdge)[0];
    if (source !== state.id && target !== state.id) {
      state.id = byId.get(source).type === "shrine" ? source : target;
      history.replaceState(null, "", "#all/" + state.id);
    }
    selectPair(state.id === source ? target : source);
  }
}
let drag = null,
  moved = false;
graph.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  drag = {
    startX: e.clientX,
    startY: e.clientY,
    x: state.x,
    y: state.y,
    id: e.pointerId,
  };
  moved = false;
});
graph.addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.startX,
    dy = e.clientY - drag.startY;
  if (Math.hypot(dx, dy) > 4 && !moved) {
    moved = true;
    graph.setPointerCapture(e.pointerId);
    graph.classList.add("dragging");
  }
  if (moved) {
    state.x = drag.x + dx;
    state.y = drag.y + dy;
    requestCamera();
  }
});
function endDrag() {
  drag = null;
  graph.classList.remove("dragging");
}
window.addEventListener("pointerup", endDrag);
graph.addEventListener("pointercancel", endDrag);
graph.addEventListener("pointerover", (e) => {
  if (!state.full || drag) return;
  showOverviewName(e.target.closest("[data-node]")?.dataset.node);
});
graph.addEventListener("pointerout", (e) => {
  if (state.full && !e.relatedTarget?.closest?.("[data-node]"))
    showOverviewName(null);
});
graph.addEventListener("click", (e) => {
  if (!moved) graphSelect(e.target);
  moved = false;
});
graph.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    graphSelect(e.target);
  }
});
$("record").addEventListener("click", (e) => {
  const row = e.target.closest("[data-edge]"),
    focus = e.target.closest("[data-focus]");
  if (row) selectPair(row.dataset.edge);
  else if (focus) {
    navigate(focus.dataset.focus);
    if (window.matchMedia("(max-width:800px)").matches)
      graph.scrollIntoView({ block: "center" });
  } else if (e.target.closest("[data-back]")) {
    state.pair = null;
    draw();
    inspector();
  }
});
$("focused").onclick = () => (state.id ? navigate(state.id) : openDirectory());
$("whole").onclick = () => navigate(null, true);
$("show-labels").onchange = (e) => {
  state.labels = e.target.checked;
  draw();
};
function page(delta) {
  state.page += delta;
  state.pair = null;
  resetCamera();
  inspector();
  draw();
}
$("prev").onclick = () => page(-1);
$("next").onclick = () => page(1);
const maxZoom = () => (state.full ? 24 : 4);
function zoom(factor, point = { x: 0, y: 0 }) {
  const next = Math.min(maxZoom(), Math.max(0.65, state.scale * factor));
  const ratio = next / state.scale;
  if (ratio === 1) return;
  state.x = point.x - (point.x - state.x) * ratio;
  state.y = point.y - (point.y - state.y) * ratio;
  state.scale = next;
  requestCamera();
}
$("in").onclick = () => zoom(1.4);
$("out").onclick = () => zoom(1 / 1.4);
$("fit").onclick = () => {
  resetCamera();
  camera();
};
graph.addEventListener(
  "wheel",
  (e) => {
    if (!e.deltaY) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? height : 1;
    const step = Math.max(
      -0.85,
      Math.min(0.85, -e.deltaY * unit * (e.ctrlKey ? 0.009 : 0.0026))
    );
    const r = graph.getBoundingClientRect();
    zoom(Math.exp(step), {
      x: e.clientX - r.left - width / 2,
      y: e.clientY - r.top - height / 2,
    });
  },
  { passive: false }
);
$("record").addEventListener("change", (e) => {
  const choice = e.target.closest("[data-passage]");
  if (!choice) return;
  const r = pairs.get(state.pair)[Number(choice.dataset.passage)];
  choice.parentElement.querySelector(".passage-body").innerHTML = passageBody(
    r.blocks[Number(choice.value)]
  );
});
const norm = (s) =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const searchIndex = nodes.map((n) => [
  n,
  norm([n.name, n.id, ...(n.aliases || [])].join(" ")),
]);
const shrineIndex = searchIndex
  .filter(([n]) => n.type === "shrine")
  .sort(([a], [b]) => a.name.localeCompare(b.name));
function listShrines() {
  const terms = norm($("shrine-filter").value).split(" ");
  const matches = shrineIndex.filter(([, text]) =>
    terms.every((t) => text.includes(t))
  );
  $("shrine-count").textContent = matches.length;
  $("no-shrines").hidden = matches.length > 0;
  $("shrine-list").innerHTML = matches
    .map(
      ([n]) =>
        '<li><a href="#' +
        n.id +
        '"' +
        (n.id === state.id ? ' aria-current="true"' : "") +
        ">" +
        dot("shrine") +
        "<span>" +
        esc(n.name) +
        "</span></a></li>"
    )
    .join("");
}
$("shrine-filter").oninput = listShrines;
$("shrine-list").addEventListener("click", (e) => {
  const a = e.target.closest("a");
  if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  navigate(a.hash.slice(1));
  $("plot-name").focus({ preventScroll: true });
  document.querySelector(".graph-card").scrollIntoView({ block: "start" });
});
for (const home of document.querySelectorAll('a[href="#all"]'))
  home.onclick = (e) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(null, true);
    window.scrollTo(0, 0);
  };
listShrines();
function searchResults() {
  const query = norm($("search").value);
  const results = searchIndex.filter(
    ([n, text]) =>
      (directoryType === "all" || n.type === directoryType) &&
      query.split(" ").every((w) => text.includes(w))
  );
  $("found").textContent =
    results.length + " record" + (results.length === 1 ? "" : "s");
  $("matches").innerHTML = results.length
    ? results
        .map(
          ([n]) =>
            '<button class="list-row" data-result="' +
            n.id +
            '">' +
            avatar(n) +
            "<span><b>" +
            esc(n.name) +
            "</b><small>" +
            className[n.type] +
            " · " +
            neighbors.get(n.id).size +
            " connections</small></span>" +
            inlineIcon("right") +
            "</button>"
        )
        .join("")
    : '<p class="empty">No matching records. Try another name or class.</p>';
  $("matches").scrollTop = 0;
}
function directoryFilters() {
  $("types").innerHTML = [
    ["all", "All"],
    ["interviewee", "Interviewees"],
    ["shrine", "Shrines"],
    ["musician", "Musicians"],
  ]
    .map(
      ([v, s]) =>
        '<button data-type="' +
        v +
        '" aria-pressed="' +
        (directoryType === v) +
        '">' +
        s +
        "</button>"
    )
    .join("");
}
function openDirectory() {
  searchOpener = document.activeElement;
  directoryType = "all";
  $("search").value = "";
  directoryFilters();
  searchResults();
  $("directory").showModal();
  $("search").focus();
}
$("find").onclick = openDirectory;
$("search").oninput = searchResults;
$("types").addEventListener("click", (e) => {
  if (e.target.dataset.type) {
    directoryType = e.target.dataset.type;
    directoryFilters();
    searchResults();
    $("types").querySelector('[aria-pressed="true"]').focus();
  }
});
$("matches").addEventListener("click", (e) => {
  const b = e.target.closest("[data-result]");
  if (b) {
    $("directory").close();
    navigate(b.dataset.result);
  }
});
$("directory").addEventListener("close", () => {
  if (searchOpener?.isConnected) searchOpener.focus();
});
$("about").onclick = () => $("info").showModal();
document.querySelectorAll("dialog").forEach((d) => {
  d.querySelector("[data-close]").onclick = () => d.close();
  d.addEventListener("click", (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        d.close();
    }
  });
});
window.addEventListener("keydown", (e) => {
  if (
    e.key === "/" &&
    !e.target.closest?.("input, textarea, select, [contenteditable=true]") &&
    !e.ctrlKey &&
    !e.metaKey &&
    !document.querySelector("dialog[open]")
  ) {
    e.preventDefault();
    openDirectory();
  }
});
window.addEventListener("hashchange", loadRoute);
new ResizeObserver(() => {
  if (graph.clientWidth !== width || graph.clientHeight !== height) draw();
}).observe(graph);
loadRoute();
