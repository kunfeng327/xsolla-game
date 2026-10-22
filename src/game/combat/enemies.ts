import { palette } from '../../config/palette';
import { clamp, distance, TAU } from '../../shared/math';
import type { GameSession } from '../core/GameSession';
import type { Enemy, EnemyKind, V } from '../types';
import { circleBlocked, lineBlocked } from '../world/chunks';

export function pruneDistantEnemies(this: GameSession): void {
  const far = Math.max(980, Math.hypot(this.width, this.height) / 2 + 220);
  this.enemies = this.enemies.filter(
    (e) => e.type === 'boss' || e.guard || distance(e, this.player) < far,
  );
}

export function queueWave(this: GameSession, count: number, noLoot = false, range = 490): void {
  if (this.bossActive) return;
  this.pruneDistantEnemies();
  const nearby = this.enemies.filter((e) => distance(e, this.player) < 900).length,
    limit = 12 + this.danger() * 4;
  count = Math.min(
    count,
    Math.max(0, limit - nearby - this.pending.length),
    42 - this.enemies.length - this.pending.length,
  );
  if (count <= 0) return;
  const moving = Math.hypot(this.velocity.x, this.velocity.y) > 20,
    heading = moving ? Math.atan2(this.velocity.y, this.velocity.x) : this.wave * 0.72;
  for (let i = 0; i < count; i++) {
    const a =
        heading +
        (i % 2 ? 1 : -1) * (0.55 + Math.floor(i / 2) * 0.68) +
        (moving ? 0 : Math.PI * 0.2),
      roll = Math.random();
    const type: EnemyKind =
      this.danger() >= 2 && roll < 0.16
        ? 'teleporter'
        : this.danger() >= 1 && roll < 0.28
          ? 'lobber'
          : i === count - 1
            ? 'shooter'
            : 'normal';
    const lead = moving ? Math.min(150, Math.hypot(this.velocity.x, this.velocity.y) * 0.55) : 0,
      pos = this.freePosition(
        {
          x: this.player.x + Math.cos(a) * range + Math.cos(heading) * lead,
          y: this.player.y + Math.sin(a) * range + Math.sin(heading) * lead,
        },
        22,
      );
    this.pending.push({ ...pos, type, delay: 0.8 + i * 0.07, noLoot });
  }
  this.wave++;
}

export function updateDirector(this: GameSession, dt: number): void {
  this.cleanupTimer -= dt;
  if (this.cleanupTimer <= 0) {
    this.cleanupTimer = 0.8;
    this.pruneDistantEnemies();
  }
  for (const p of this.pending) {
    p.delay -= dt;
    if (p.delay <= 0) {
      if (distance(p, this.player) < 130) {
        p.delay = 0.25;
        continue;
      }
      this.spawnEnemy(p.type, { x: p.x, y: p.y }, undefined, p.noLoot);
      p.delay = -99;
    }
  }
  this.pending = this.pending
    .filter((p) => p.delay > -90 && distance(p, this.player) < 1300)
    .slice(-16);
  if (this.bossActive) {
    this.pending = [];
    return;
  }
  if (this.activeExtraction) {
    if (this.extractionProgress > 0.35 && this.extractionWave === 0) {
      this.extractionWave = 1;
      this.queueWave(4, true, 340);
    }
    return;
  }
  this.spawnTimer -= dt;
  if (this.spawnTimer <= 0) {
    this.queueWave(5 + this.danger());
    this.spawnTimer = 4.6 - this.danger() * 0.3;
  }
}

export function route(this: GameSession, enemy: Enemy, target: V, dt: number): void {
  let point = target;
  if (lineBlocked(enemy, target, this.obstacles, enemy.r + 2)) {
    if (this.flowTimer <= 0) {
      this.flowTimer = 0.55;
      this.buildFlow();
    }
    const cell = 40,
      gx = Math.round(enemy.x / cell),
      gy = Math.round(enemy.y / cell),
      next = this.flow.get(gx + ',' + gy);
    if (next) point = next;
    else {
      enemy.pathTime -= dt;
      if (enemy.pathTime <= 0) {
        enemy.pathTime = 0.45;
        enemy.path = undefined;
        const candidates: V[] = [];
        for (const o of this.obstacles)
          if (lineBlocked(enemy, target, [o], enemy.r + 2))
            for (const x of [o.x - enemy.r - 10, o.x + o.w + enemy.r + 10])
              for (const y of [o.y - enemy.r - 10, o.y + o.h + enemy.r + 10]) {
                const p = { x, y };
                if (
                  !circleBlocked(p, enemy.r, this.obstacles) &&
                  !lineBlocked(enemy, p, this.obstacles, enemy.r + 1)
                )
                  candidates.push(p);
              }
        enemy.path = candidates.sort(
          (a, b) =>
            distance(enemy, a) + distance(a, target) - distance(enemy, b) - distance(b, target),
        )[0];
      }
      if (enemy.path) point = enemy.path;
    }
  }
  const dx = point.x - enemy.x,
    dy = point.y - enemy.y,
    d = Math.max(1, Math.hypot(dx, dy));
  this.moveEntity(enemy, (dx / d) * enemy.speed * dt, (dy / d) * enemy.speed * dt, enemy.r);
}

export function buildFlow(this: GameSession): void {
  this.flow.clear();
  const cell = 40,
    cx = Math.round(this.player.x / cell),
    cy = Math.round(this.player.y / cell),
    queue: { x: number; y: number }[] = [];
  const seen = new Set<string>();
  let start = { x: cx, y: cy };
  if (circleBlocked({ x: cx * cell, y: cy * cell }, 22, this.obstacles))
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      if (!circleBlocked({ x: (cx + dx) * cell, y: (cy + dy) * cell }, 22, this.obstacles)) {
        start = { x: cx + dx, y: cy + dy };
        break;
      }
  queue.push(start);
  seen.add(start.x + ',' + start.y);
  for (let i = 0; i < queue.length && i < 1800; i++) {
    const n = queue[i];
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = n.x + dx,
        y = n.y + dy,
        key = x + ',' + y;
      if (Math.abs(x - cx) > 20 || Math.abs(y - cy) > 20 || seen.has(key)) continue;
      seen.add(key);
      if (circleBlocked({ x: x * cell, y: y * cell }, 22, this.obstacles)) continue;
      this.flow.set(key, { x: n.x * cell, y: n.y * cell });
      queue.push({ x, y });
    }
  }
}

export function updateEnemy(this: GameSession, e: Enemy, dt: number): void {
  if (e.type === 'boss') {
    this.updateBoss(e, dt);
    return;
  }
  if (e.mode === 'emerge') {
    e.timer -= dt;
    if (e.timer <= 0) e.mode = 'idle';
    return;
  }
  const d = distance(e, this.player);
  if (d < e.r + 16 && e.mode !== 'telegraph' && e.mode !== 'strike' && e.mode !== 'windup-rush')
    this.hurt(
      e.type === 'teleporter' ? 12 : 8,
      'contact',
      e.type === 'normal' ? '追击怪撞击' : '敌人近战',
    );
  if (e.type === 'normal') {
    if (e.mode === 'windup-rush') {
      e.timer -= dt;
      if (e.timer <= 0) {
        e.mode = 'rush';
        e.timer = 0.5;
      }
      return;
    }
    if (e.mode === 'rush') {
      this.moveEntity(e, Math.cos(e.aim) * 235 * dt, Math.sin(e.aim) * 235 * dt, e.r);
      e.timer -= dt;
      if (e.timer <= 0) {
        e.mode = 'idle';
        e.shot = 4.8;
      }
      return;
    }
    if (
      e.id % 4 === 0 &&
      e.shot <= 0 &&
      d > 130 &&
      d < 290 &&
      !lineBlocked(e, this.player, this.obstacles)
    ) {
      e.mode = 'windup-rush';
      e.timer = 0.55;
      e.aim = Math.atan2(
        this.player.y + clamp(this.velocity.y * 0.45, -70, 70) - e.y,
        this.player.x + clamp(this.velocity.x * 0.45, -70, 70) - e.x,
      );
      return;
    }
    if (d > e.r + 14) this.route(e, this.player, dt);
    return;
  }
  if (e.type === 'shooter') {
    if (e.mode === 'aim') {
      e.timer -= dt;
      if (e.timer <= 0) {
        this.hostileBullet(e, e.aim, 285, 10);
        e.mode = 'idle';
        e.shot = 2.15;
      }
      return;
    }
    if ((d > 250 || lineBlocked(e, this.player, this.obstacles)) && d > 50)
      this.route(e, this.player, dt);
    if (d < 125) {
      const a = Math.atan2(e.y - this.player.y, e.x - this.player.x);
      this.moveEntity(e, Math.cos(a) * 60 * dt, Math.sin(a) * 60 * dt, e.r);
    }
    if (e.shot <= 0 && d < 490 && !lineBlocked(e, this.player, this.obstacles)) {
      e.mode = 'aim';
      e.timer = 0.7;
      e.aim = Math.atan2(this.player.y - e.y, this.player.x - e.x);
    }
    return;
  }
  if (e.type === 'lobber') {
    if (d > 310 || (lineBlocked(e, this.player, this.obstacles) && d > 380))
      this.route(e, this.player, dt);
    if (e.shot <= 0 && d < 530) {
      e.shot = 3.3;
      this.warnings.push({
        x: this.player.x + clamp(this.velocity.x * 0.3, -65, 65),
        y: this.player.y + clamp(this.velocity.y * 0.3, -65, 65),
        r: 65,
        timer: 1.1,
        max: 1.1,
        damage: 17,
        color: palette.gold,
      });
      this.burst(e.x, e.y, palette.gold, 8, 50);
    }
    return;
  }
  if (e.mode === 'telegraph') {
    e.timer -= dt;
    if (e.timer <= 0) {
      e.x = e.tx;
      e.y = e.ty;
      e.mode = 'strike';
      e.timer = 0.35;
      this.burst(e.x, e.y, palette.purple, 12, 85);
    }
    return;
  }
  if (e.mode === 'strike') {
    e.timer -= dt;
    if (e.timer <= 0) {
      if (d < 62) this.hurt(15, 'contact', '瞬移怪突袭');
      e.mode = 'idle';
      e.shot = 4.7;
      this.burst(e.x, e.y, palette.purple, 15, 100);
    }
    return;
  }
  if (d > 80) this.route(e, this.player, dt);
  if (e.shot <= 0 && d > 105 && d < 620) {
    const p = this.freePosition(
      {
        x: this.player.x + clamp(this.velocity.x * 0.95, -180, 180),
        y: this.player.y + clamp(this.velocity.y * 0.95, -180, 180),
      },
      e.r,
    );
    e.tx = p.x;
    e.ty = p.y;
    e.mode = 'telegraph';
    e.timer = 0.75;
  }
}

export function spawnEnemy(
  this: GameSession,
  type: EnemyKind,
  pos?: V,
  guard?: string,
  noLoot = false,
): Enemy | null {
  if (this.enemies.length >= 42) return null;
  const a = Math.random() * TAU,
    range = 480 + Math.random() * 100,
    at = this.freePosition(
      pos || { x: this.player.x + Math.cos(a) * range, y: this.player.y + Math.sin(a) * range },
      type === 'boss' ? 46 : type === 'lobber' ? 21 : 18,
    );
  const values =
    type === 'boss'
      ? { hp: 1050, r: 46, speed: 30 }
      : type === 'lobber'
        ? { hp: 78, r: 21, speed: 90 }
        : type === 'teleporter'
          ? { hp: 52, r: 17, speed: 125 }
          : type === 'shooter'
            ? { hp: 50, r: 17, speed: 100 }
            : { hp: 54, r: 18, speed: 140 };
  const scale = type === 'boss' ? 1 : 1 + this.danger() * 0.1,
    e: Enemy = {
      id: this.nextId++,
      x: at.x,
      y: at.y,
      type,
      hp: values.hp * scale,
      max: values.hp * scale,
      r: values.r,
      speed: values.speed,
      hit: 0,
      shot: 1.8 + Math.random(),
      phase: Math.random() * TAU,
      mode: type === 'boss' ? 'idle' : 'emerge',
      timer: type === 'boss' ? 1.3 : 0.55,
      aim: 0,
      tx: 0,
      ty: 0,
      pattern: 0,
      guard,
      pathTime: 0,
      noLoot,
    };
  this.enemies.push(e);
  return e;
}

export function updateEnemies(this: GameSession, dt: number): void {
  for (const e of this.enemies) {
    if (e.hp <= 0) continue;
    e.hit = Math.max(0, e.hit - dt);
    e.phase += dt;
    e.shot -= dt;
    this.updateEnemy(e, dt);
  }
  for (let i = 0; i < this.enemies.length; i++)
    for (let j = i + 1; j < this.enemies.length; j++) {
      const a = this.enemies[i],
        b = this.enemies[j];
      if (a.type === 'boss' || b.type === 'boss') continue;
      const dx = a.x - b.x,
        dy = a.y - b.y,
        d = Math.hypot(dx, dy),
        min = a.r + b.r - 3;
      if (d > 0.1 && d < min) {
        const f = (min - d) * 0.18;
        this.moveEntity(a, (dx / d) * f, (dy / d) * f, a.r);
        this.moveEntity(b, (-dx / d) * f, (-dy / d) * f, b.r);
      }
    }
}
