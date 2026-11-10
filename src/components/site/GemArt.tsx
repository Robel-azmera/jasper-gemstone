// Procedurally drawn gemstone illustrations: any cut shape, either as a
// coloured faceted gem or as a technical line drawing. No client JS needed.

type Pt = [number, number];
type Style = "brilliant" | "step" | "cabochon";

interface Geometry {
  outline: Pt[];
  facets: Pt[][];
  table: Pt[];
  style: Style;
}

const TAU = Math.PI * 2;

function sampled(n: number, f: (t: number) => Pt): Pt[] {
  return Array.from({ length: n }, (_, k) => f((k / n) * TAU));
}

function ellipse(n: number, rx: number, ry: number): Pt[] {
  return sampled(n, (t) => [rx * Math.sin(t), -ry * Math.cos(t)]);
}

function superellipse(n: number, a: number, b: number, e: number): Pt[] {
  const p = (v: number) => Math.sign(v) * Math.abs(v) ** (2 / e);
  return sampled(n, (t) => [a * p(Math.sin(t + Math.PI / n)), -b * p(Math.cos(t + Math.PI / n))]);
}

function chamferRect(w: number, h: number, c: number): Pt[] {
  const x = w / 2;
  const y = h / 2;
  return [
    [-x + c, -y], [x - c, -y], [x, -y + c], [x, y - c],
    [x - c, y], [-x + c, y], [-x, y - c], [-x, -y + c],
  ];
}

/** Scale/translate raw points so their bounding box is w×h centred at (50,50). */
function fit(points: Pt[], w: number, h: number): Pt[] {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const s = Math.min(w / (maxX - minX), h / (maxY - minY));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  // Rounded so the trig/pow results (which may differ in the last bits between
  // server and browser) can't produce different markup and break hydration.
  const r = (v: number) => Math.round(v * 100) / 100;
  return points.map(([x, y]) => [r(50 + (x - cx) * s), r(50 + (y - cy) * s)]);
}

function outlineFor(shape: string): { pts: Pt[]; style: Style } {
  switch (shape) {
    case "oval":
      return { pts: fit(ellipse(16, 33, 45), 66, 90), style: "brilliant" };
    case "cushion":
      return { pts: fit(superellipse(16, 41, 45, 3.4), 80, 88), style: "brilliant" };
    case "pear":
      return {
        pts: fit(sampled(16, (t) => [Math.sin(t) * Math.sin(t / 2) ** 0.8, -Math.cos(t)]), 64, 90),
        style: "brilliant",
      };
    case "heart":
      return {
        pts: fit(
          sampled(20, (t) => [
            16 * Math.sin(t) ** 3,
            -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
          ]),
          88,
          80,
        ),
        style: "brilliant",
      };
    case "marquise":
      return {
        pts: fit(sampled(14, (t) => [0.52 * Math.sign(Math.sin(t)) * Math.abs(Math.sin(t)) ** 1.25, -Math.cos(t)]), 50, 92),
        style: "brilliant",
      };
    case "octagon":
      return { pts: fit(chamferRect(62, 86, 13), 62, 88), style: "step" };
    case "asscher":
      return { pts: fit(chamferRect(80, 80, 20), 82, 82), style: "step" };
    case "radiant":
      return { pts: fit(chamferRect(68, 86, 11), 68, 88), style: "brilliant" };
    case "princess":
      return {
        pts: fit([[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]], 80, 80),
        style: "brilliant",
      };
    case "trillion": {
      const corner = (a: number, r: number): Pt => [r * Math.cos(a), r * Math.sin(a)];
      const a0 = -Math.PI / 2;
      const pts: Pt[] = [];
      for (let i = 0; i < 3; i++) {
        pts.push(corner(a0 + (i * TAU) / 3, 1));
        pts.push(corner(a0 + (i * TAU) / 3 + Math.PI / 3, 0.62));
      }
      return { pts: fit(pts, 90, 80), style: "brilliant" };
    }
    case "cabochon":
      return { pts: fit(ellipse(28, 34, 44), 70, 88), style: "cabochon" };
    case "round":
    default:
      return { pts: fit(ellipse(16, 44, 44), 88, 88), style: "brilliant" };
  }
}

function centroid(pts: Pt[]): Pt {
  const n = pts.length;
  return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n];
}

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const scaleAbout = (pts: Pt[], c: Pt, s: number): Pt[] => pts.map((p) => lerp(c, p, s));

const cache = new Map<string, Geometry>();

function geometry(shape: string): Geometry {
  const hit = cache.get(shape);
  if (hit) return hit;
  const { pts: P, style } = outlineFor(shape);
  const c = centroid(P);
  const n = P.length;
  const facets: Pt[][] = [];
  let table: Pt[];

  if (style === "brilliant") {
    const T = scaleAbout(P, c, 0.52);
    table = T;
    const M = P.map((p, i) => lerp(p, P[(i + 1) % n], 0.5));
    const S = T.map((t, i) => lerp(lerp(t, T[(i + 1) % n], 0.5), M[i], 0.5));
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const prev = (i - 1 + n) % n;
      facets.push([T[i], T[j], S[i]]); // star
      facets.push([T[i], S[i], P[i], S[prev]]); // bezel kite
      facets.push([S[i], P[i], M[i]]); // upper girdle
      facets.push([S[i], M[i], P[j]]);
    }
  } else if (style === "step") {
    const rings = [1, 0.8, 0.62, 0.46].map((s) => scaleAbout(P, c, s));
    for (let k = 0; k < rings.length - 1; k++) {
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        facets.push([rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]]);
      }
    }
    table = rings[rings.length - 1];
  } else {
    table = scaleAbout(P, c, 0.62);
  }

  const g = { outline: P, facets, table, style };
  cache.set(shape, g);
  return g;
}

const poly = (pts: Pt[]) => pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

/** Light comes from the top-left; returns -1 (dark) … 1 (bright). */
function lightness(pts: Pt[], index: number): number {
  const [x, y] = centroid(pts);
  const dx = x - 50;
  const dy = y - 50;
  const len = Math.hypot(dx, dy) || 1;
  const d = (dx / len) * -0.6 + (dy / len) * -0.8;
  return Math.max(-1, Math.min(1, d + (index % 3 === 0 ? 0.25 : index % 3 === 1 ? -0.15 : 0)));
}

export interface GemArtProps {
  shape: string;
  palette?: [string, string];
  /** "color" = faceted gem, "line" = technical line drawing. */
  mode?: "color" | "line";
  className?: string;
  title?: string;
}

export function GemArt({ shape, palette = ["#8b1a1a", "#e9a0a0"], mode = "color", className = "", title }: GemArtProps) {
  const g = geometry(shape);
  const a11y = title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const };

  if (mode === "line") {
    return (
      <svg viewBox="0 0 100 100" className={className} {...a11y}>
        <g fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
          {g.facets.map((f, i) => (
            <polygon key={i} points={poly(f)} vectorEffect="non-scaling-stroke" />
          ))}
          <polygon points={poly(g.table)} vectorEffect="non-scaling-stroke" />
          <polygon points={poly(g.outline)} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
    );
  }

  const [deep, light] = palette;
  const id = `ga-${shape}-${deep}${light}`.replace(/[^a-zA-Z0-9-]/g, "");
  return (
    <svg viewBox="0 0 100 100" className={className} {...a11y}>
      <defs>
        <radialGradient id={`${id}-b`} cx="38%" cy="32%" r="80%">
          <stop offset="0%" stopColor={light} />
          <stop offset="55%" stopColor={deep} />
          <stop offset="100%" stopColor={deep} stopOpacity="0.95" />
        </radialGradient>
        <radialGradient id={`${id}-h`} cx="35%" cy="28%" r="45%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <polygon points={poly(g.outline)} fill={`url(#${id}-b)`} />
      {g.facets.map((f, i) => {
        const l = lightness(f, i);
        return (
          <polygon
            key={i}
            points={poly(f)}
            fill={l > 0 ? "#fff" : "#000"}
            // Rounded so server and browser render identical strings (float math can differ in the last digits).
            fillOpacity={(l > 0 ? 0.04 + l * 0.32 : 0.04 + -l * 0.28).toFixed(3)}
            stroke="#fff"
            strokeOpacity="0.18"
            strokeWidth="0.3"
          />
        );
      })}
      {g.style === "cabochon" ? (
        <ellipse cx="42" cy="36" rx="20" ry="16" fill={`url(#${id}-h)`} />
      ) : (
        <polygon points={poly(g.table)} fill="#fff" fillOpacity="0.16" stroke="#fff" strokeOpacity="0.35" strokeWidth="0.4" />
      )}
      <polygon points={poly(g.outline)} fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="0.6" />
    </svg>
  );
}
