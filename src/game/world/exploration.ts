import { palette } from '../../config/palette';
import { clamp, distance, TAU } from '../../shared/math';
import type { GameSession } from '../core/GameSession';
import type { EnemyKind, InteractSite, PickupKind, V } from '../types';
import type { Point } from '../world/chunks';
import { CHUNK_SIZE, chunkCoord, circleBlocked, makeChunk, worldHash } from '../world/chunks';

export function danger(this: GameSession): number {
  const depth = Math.max(Math.abs(chunkCoord(this.player.x)), Math.abs(chunkCoord(this.player.y)));
  return clamp(
    Math.floor(depth / 3) + Math.floor(this.events / 3) + (this.bag.cores > 0 ? 1 : 0),
    0,
    3,
  );
}

export function refreshChunks(this: GameSession, force = false): void {
  const cx = chunkCoord(this.player.x),
    cy = chunkCoord(this.player.y),
    key = cx + ',' + cy;
  if (!force && key === this.currentChunk) return;
  this.currentChunk = key;
  this.visited.add(key);
  const keep = new Set<string>();
  for (let x = cx - 1; x <= cx + 1; x++)
    for (let y = cy - 1; y <= cy + 1; y++) {
      const k = x + ',' + y;
      keep.add(k);
      if (!this.chunks.has(k)) {
        const chunk = makeChunk(x, y, this.seed);
        this.chunks.set(k, chunk);
        const sid = k + ':supply';
        if (!this.consumedSupplies.has(sid) && !this.pickups.some((p) => p.id === sid)) {
          const kinds: PickupKind[] = ['heal', 'shield', 'overcharge', 'speed'],
            h = worldHash(x, y, this.seed);
          this.pickups.push({
            id: sid,
            x: x * CHUNK_SIZE + 25,
            y: y * CHUNK_SIZE + 125,
            type: kinds[h % 4],
            amount: 1,
            phase: 0,
            life: Infinity,
          });
        }
      }
    }
  for (const k of this.chunks.keys()) if (!keep.has(k)) this.chunks.delete(k);
  this.sites = [...this.chunks.values()].flatMap((c) => c.sites);
  this.obstacles = [...this.chunks.values()].flatMap((c) => c.obstacles);
  if (this.bossSite)
    this.obstacles = this.obstacles.filter(
      (o) => distance({ x: o.x + o.w / 2, y: o.y + o.h / 2 }, this.bossSite!) > 420,
    );
  if (this.bossExtraction) this.sites.push(this.bossExtraction);
  const removed = new Set(
    this.enemies
      .filter((e) => e.type !== 'boss' && distance(e, this.player) > 1600)
      .map((e) => e.id),
  );
  for (const [id, state] of this.eventStates)
    if (state.status === 'active' && state.guards.some((n) => removed.has(n))) {
      state.status = 'idle';
      state.guards = [];
      this.enemies = this.enemies.filter((e) => e.guard !== id);
    }
  this.enemies = this.enemies.filter((e) => !removed.has(e.id));
  this.pickups = this.pickups.filter((p) => p.type === 'core' || distance(p, this.player) < 1700);
}

export function freePosition(this: GameSession, pos: V, r: number): Point {
  if (!circleBlocked(pos, r, this.obstacles)) return pos;
  for (let ring = 1; ring < 8; ring++)
    for (let j = 0; j < 12; j++) {
      const a = (j / 12) * TAU,
        p = { x: pos.x + Math.cos(a) * ring * 30, y: pos.y + Math.sin(a) * ring * 30 };
      if (!circleBlocked(p, r, this.obstacles)) return p;
    }
  return {
    x: Math.round(pos.x / CHUNK_SIZE) * CHUNK_SIZE,
    y: Math.round(pos.y / CHUNK_SIZE) * CHUNK_SIZE,
  };
}

export function moveEntity(this: GameSession, entity: V, dx: number, dy: number, r: number): void {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 12));
  for (let i = 0; i < steps; i++) {
    if (!circleBlocked({ x: entity.x + dx / steps, y: entity.y }, r, this.obstacles))
      entity.x += dx / steps;
    if (!circleBlocked({ x: entity.x, y: entity.y + dy / steps }, r, this.obstacles))
      entity.y += dy / steps;
  }
}

export function updateEvents(this: GameSession): void {
  for (const site of this.sites) {
    if (site.kind !== 'resource') continue;
    const state = this.eventStates.get(site.id);
    if (state?.status !== 'active') continue;
    if (state.guards.some((id) => this.enemies.some((e) => e.id === id && e.hp > 0))) continue;
    state.status = 'done';
    this.events++;
    const alloy = site.rare ? 38 : 28,
      chips = site.rare ? 3 : 2;
    this.bag.alloy += alloy;
    this.bag.chips += chips;
    this.fragments = Math.min(99, this.fragments + (this.events === 1 ? 10 : 5));
    if (this.events === 1 && this.level === 1) {
      this.xp = Math.max(this.xp, this.xpNeeded);
      this.checkLevel();
    }
    this.notify(
      '资源仓完成：+' +
        alloy +
        ' 合金 / +' +
        chips +
        ' 芯片 / +' +
        (this.events === 1 ? 10 : 5) +
        ' 碎片',
      palette.gold,
    );
    this.burst(site.x, site.y, palette.gold, 30, 140);
    const kinds: PickupKind[] = ['heal', 'shield', 'overcharge', 'speed'];
    this.pickups.push({
      x: site.x + 32,
      y: site.y + 22,
      type: kinds[Math.floor(Math.random() * 4)],
      amount: 1,
      phase: 0,
      life: 90,
    });
    if (this.events >= 2 && !this.bossSite) {
      const cx = chunkCoord(this.player.x) + 1,
        cy = chunkCoord(this.player.y) - 1;
      this.bossSite = {
        id: 'boss',
        kind: 'resource',
        x: cx * CHUNK_SIZE,
        y: cy * CHUNK_SIZE,
        title: '核心守卫据点',
        rare: true,
      };
      this.refreshChunks(true);
      this.notify('两个资源事件已完成：核心守卫据点已标记，可主动挑战或先撤离', palette.purple);
    }
  }
}

export function nearestInteraction(this: GameSession): InteractSite | null {
  const candidates: InteractSite[] = this.sites.filter(
    (s) =>
      s.kind !== 'resource' ||
      (!this.bossActive && (this.eventStates.get(s.id)?.status || 'idle') === 'idle'),
  );
  if (this.bossSite && !this.bossKilled && !this.bossActive)
    candidates.push({ ...this.bossSite, kind: 'boss' });
  return (
    candidates
      .filter(
        (s) =>
          distance(s, this.player) < (s.kind === 'extract' ? 82 : s.kind === 'boss' ? 160 : 76),
      )
      .sort((a, b) => distance(a, this.player) - distance(b, this.player))[0] || null
  );
}

export function startResourceEvent(this: GameSession, near: InteractSite): void {
  const state = this.eventStates.get(near.id) || { status: 'idle', guards: [] };
  if (state.status !== 'idle') return;
  const count = near.rare ? 7 : 6;
  this.pruneDistantEnemies();
  if (this.enemies.length + count > 42) {
    this.notify('附近敌人过多，先清理再开启资源仓', palette.gold);
    return;
  }
  state.status = 'active';
  state.guards = [];
  this.eventStates.set(near.id, state);
  const formation = worldHash(Math.round(near.x), Math.round(near.y), this.seed) % 2;
  for (let i = 0; i < count; i++) {
    const a = formation ? Math.PI * 0.15 + (i / count) * TAU : (i / count) * TAU,
      rad = formation ? 175 + (i % 2) * 35 : 170;
    const pos = this.freePosition(
      { x: near.x + Math.cos(a) * rad, y: near.y + Math.sin(a) * rad },
      21,
    );
    const type: EnemyKind =
      i === count - 1 ? 'shooter' : near.rare && i === count - 2 ? 'lobber' : 'normal';
    const enemy = this.spawnEnemy(type, pos, near.id);
    if (enemy) state.guards.push(enemy.id);
  }
  this.notify('资源仓警报：击败标记守卫，领取一次性物资', palette.gold);
  this.emitHud();
  return;
}
