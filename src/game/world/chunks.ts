export type Point = { x: number; y: number };
export type Obstacle = { x: number; y: number; w: number; h: number; kind: 'rock' | 'wall' };
export type Site = Point & {
  id: string;
  kind: 'resource' | 'terminal' | 'extract';
  title: string;
  rare: boolean;
};
export type Chunk = {
  key: string;
  cx: number;
  cy: number;
  variant: number;
  title: string;
  obstacles: Obstacle[];
  sites: Site[];
};
export const CHUNK_SIZE = 720;
export function chunkCoord(n: number) {
  return Math.floor((n + CHUNK_SIZE / 2) / CHUNK_SIZE);
}
export function worldHash(x: number, y: number, seed: number) {
  let n = Math.imul(x + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(y + 0x7f4a7c15, 0xc2b2ae35) ^ seed;
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  return (n ^ (n >>> 16)) >>> 0;
}
const TITLES = ['边境荒原', '废墟掩体', '十字走廊', '矿石阵列', '遗落仓库', '异常残骸'];
// All six templates leave the central approach and the four chunk boundaries open.
const LAYOUTS: number[][][] = [
  [
    [-235, 150, 90, 70],
    [205, -245, 100, 65],
  ],
  [
    [-255, -210, 120, 55],
    [150, 155, 55, 125],
    [-235, 165, 75, 90],
  ],
  [
    [-265, -245, 150, 75],
    [125, -245, 150, 75],
    [-265, 170, 150, 75],
    [125, 170, 150, 75],
  ],
  [
    [-225, -205, 85, 100],
    [135, -210, 85, 95],
    [-225, 130, 85, 100],
    [140, 135, 85, 95],
  ],
  [
    [-265, -235, 55, 160],
    [205, 90, 55, 160],
    [-120, 220, 170, 45],
  ],
  [
    [-240, -250, 135, 65],
    [150, -180, 75, 130],
    [-230, 170, 115, 70],
  ],
];
export function makeChunk(cx: number, cy: number, seed: number): Chunk {
  const key = `${cx},${cy}`,
    h = worldHash(cx, cy, seed),
    variant = h % 6;
  const ox = cx * CHUNK_SIZE,
    oy = cy * CHUNK_SIZE;
  const obstacles = (
    cx === 0 && cy === 0
      ? [
          [-300, 110, 90, 65],
          [120, 170, 120, 55],
          [-100, -260, 130, 65],
        ]
      : LAYOUTS[variant]
  ).map((a, i) => ({
    x: ox + a[0],
    y: oy + a[1],
    w: a[2],
    h: a[3],
    kind: (i % 2 ? 'wall' : 'rock') as 'wall' | 'rock',
  }));
  const sites: Site[] = [
    {
      id: `${key}:resource`,
      kind: 'resource',
      x: ox,
      y: oy - 55,
      title: variant === 4 ? '遗落资源仓' : '边境补给仓',
      rare: Math.max(Math.abs(cx), Math.abs(cy)) >= 2,
    },
  ];
  if (cx === 0 && cy === 0) {
    sites[0] = {
      id: '0,0:resource',
      kind: 'resource',
      x: 265,
      y: -110,
      title: '前哨资源仓',
      rare: false,
    };
    sites.push({
      id: 'origin:terminal',
      kind: 'terminal',
      x: -185,
      y: -35,
      title: '异常契约终端',
      rare: false,
    });
    sites.push({
      id: 'origin:extract',
      kind: 'extract',
      x: 0,
      y: 115,
      title: '前哨接应站',
      rare: false,
    });
  } else {
    if (h % 3 === 0 || (cx === 1 && cy === 0))
      sites.push({
        id: `${key}:terminal`,
        kind: 'terminal',
        x: ox + 85,
        y: oy + 95,
        title: '异常契约终端',
        rare: false,
      });
    if (h % 4 === 0)
      sites.push({
        id: `${key}:extract`,
        kind: 'extract',
        x: ox - 85,
        y: oy + 95,
        title: '野外接应站',
        rare: false,
      });
  }
  return { key, cx, cy, variant, title: TITLES[variant], obstacles, sites };
}
export function circleBlocked(p: Point, radius: number, obstacles: Obstacle[]) {
  return obstacles.some((o) => {
    const x = Math.max(o.x, Math.min(o.x + o.w, p.x));
    const y = Math.max(o.y, Math.min(o.y + o.h, p.y));
    return (p.x - x) ** 2 + (p.y - y) ** 2 < radius * radius;
  });
}
export function lineBlocked(a: Point, b: Point, obstacles: Obstacle[], pad = 1) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  return obstacles.some((o) => {
    let near = 0,
      far = 1;
    for (const [origin, delta, lo, hi] of [
      [a.x, dx, o.x - pad, o.x + o.w + pad],
      [a.y, dy, o.y - pad, o.y + o.h + pad],
    ]) {
      if (Math.abs(delta) < 0.00001) {
        if (origin < lo || origin > hi) return false;
      } else {
        let u = (lo - origin) / delta,
          v = (hi - origin) / delta;
        if (u > v) [u, v] = [v, u];
        near = Math.max(near, u);
        far = Math.min(far, v);
        if (near > far) return false;
      }
    }
    return true;
  });
}
