export type Weapon = 'pulse' | 'scatter' | 'drone';
export type Character = 'gunner' | 'engineer';
export type UpgradeChoice = { id: string; name: string; description: string; kind: string };
export type GameHud = {
  hp: number; maxHp: number; shield: number; time: number; xp: number; xpNeeded: number;
  level: number; kills: number; alloy: number; chips: number; cores: number;
  extractionOpen: boolean; extractProgress: number; bossHp: number; bossMaxHp: number;
  status: string; dashReady: boolean; nearExtract: boolean;
};
export type GameResult = {
  success: boolean; reason: 'extracted' | 'dead' | 'timeout'; alloy: number; chips: number;
  cores: number; kills: number; time: number; level: number; bossKilled: boolean;
  collected: { alloy: number; chips: number; cores: number };
};
export type GameOptions = {
  weapon: Weapon; character: Character; healthLevel: number; magnetLevel: number; trail: boolean;
  onHud: (hud: GameHud) => void; onUpgrade: (choices: UpgradeChoice[]) => void;
  onFinish: (result: GameResult) => void;
};

type V = { x: number; y: number };
type Enemy = V & { id: number; type: 'normal' | 'runner' | 'elite' | 'boss'; hp: number; max: number; r: number; speed: number; hit: number; shot: number; phase: number };
type Bullet = V & { vx: number; vy: number; damage: number; life: number; hostile: boolean; r: number; color: string; hits: number };
type Pickup = V & { type: 'xp' | 'alloy' | 'chip' | 'core'; amount: number; phase: number };
type Particle = V & { vx: number; vy: number; life: number; max: number; size: number; color: string };
type FloatText = V & { text: string; color: string; life: number; max: number; size: number };
type Chest = V & { opened: boolean; rare: boolean };
const TAU = Math.PI * 2;
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const distance = (a: V, b: V) => Math.hypot(a.x - b.x, a.y - b.y);
const palette = { cyan: '#7bf4e7', blue: '#7ca8ff', purple: '#bf94ff', gold: '#ffd680', red: '#fa7c86', green: '#a5e9a5' };
const UPGRADES: UpgradeChoice[] = [
  { id: 'damage', name: '超载弹头', description: '武器伤害提高 25%', kind: '火力' },
  { id: 'rapid', name: '急速回路', description: '自动攻击速度提高 18%', kind: '火力' },
  { id: 'shield', name: '护盾充能', description: '立即获得 28 点额外护盾', kind: '生存' },
  { id: 'heal', name: '纳米修复', description: '立即恢复 35 点生命值', kind: '生存' },
  { id: 'speed', name: '推进强化', description: '移动速度提高 12%，冲刺冷却缩短', kind: '机动' },
  { id: 'magnet', name: '引力吸附', description: '拾取范围增加 38%，立即吸取附近物资', kind: '搜集' },
];

/** A dependency-free, client-only extraction game. All permanent state is owned by React. */
export class StarbreakGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: GameOptions;
  private resizeObserver: ResizeObserver;
  private width = 960; private height = 640; private dpr = 1;
  private world = { width: 1800, height: 1300 };
  private player = { x: 900, y: 1050, hp: 110, maxHp: 110, shield: 0, angle: -Math.PI / 2, invulnerable: 0, dashTime: 0, dashCooldown: 0, dx: 0, dy: -1 };
  private extraction = { x: 900, y: 1100, r: 66 };
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private pickups: Pickup[] = [];
  private particles: Particle[] = [];
  private texts: FloatText[] = [];
  private chests: Chest[] = [
    { x: 690, y: 1000, opened: false, rare: false }, { x: 1110, y: 890, opened: false, rare: false },
    { x: 670, y: 720, opened: false, rare: false }, { x: 1250, y: 570, opened: false, rare: true },
    { x: 470, y: 440, opened: false, rare: true }, { x: 920, y: 250, opened: false, rare: true },
  ];
  private keys = new Set<string>();
  private input = { x: 0, y: 0 };
  private running = false; private destroyed = false; private paused = false; private upgrading = false;
  private raf = 0; private last = 0; private elapsed = 0; private visualTime = 0; private hudTimer = 0;
  private spawnTimer = 1.4; private shotTimer = .2; private droneTimer = 0;
  private level = 1; private xp = 0; private xpNeeded = 6; private kills = 0;
  private bag = { alloy: 0, chips: 0, cores: 0 };
  private damage = 1; private attackSpeed = 1; private moveSpeed = 1; private magnet = 1;
  private extractionProgress = 0; private bossSpawned = false; private bossKilled = false;
  private nextId = 0; private speed = 1; private shake = 0;
  private currentChoices: UpgradeChoice[] = [];
  private checkpoints = new Set<number>();
  private keyDown = (event: KeyboardEvent) => {
    const k = event.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright', ' '].includes(k) && this.running && !this.paused) {
      event.preventDefault(); this.keys.add(k); if (k === ' ' && !event.repeat) this.dash();
    }
  };
  private keyUp = (event: KeyboardEvent) => { this.keys.delete(event.key.toLowerCase()); };
  private blur = () => { this.keys.clear(); this.input = { x: 0, y: 0 }; };

  constructor(canvas: HTMLCanvasElement, options: GameOptions) {
    this.canvas = canvas; this.options = options;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('当前浏览器不支持 Canvas 2D');
    this.ctx = context;
    this.player.maxHp = 110 + options.healthLevel * 10;
    this.player.hp = this.player.maxHp;
    this.player.shield = options.character === 'engineer' ? 20 : 0;
    this.magnet = 1 + options.magnetLevel * .2;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.blur);
    this.resize();
  }

  start() {
    if (this.running || this.destroyed) return;
    this.running = true; this.last = performance.now();
    for (let i = 0; i < 3; i++) this.spawnEnemy('normal');
    this.float(this.player.x, this.player.y - 65, '探索补给箱 · 自动攻击', palette.cyan, 3, 16);
    this.emitHud(); this.raf = requestAnimationFrame(this.frame);
  }
  destroy() {
    this.running = false; this.destroyed = true; cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    window.removeEventListener('keydown', this.keyDown); window.removeEventListener('keyup', this.keyUp); window.removeEventListener('blur', this.blur);
  }
  setPaused(value: boolean) { this.paused = value; this.keys.clear(); this.input = { x: 0, y: 0 }; this.last = performance.now(); }
  setInput(x: number, y: number) { this.input = { x: clamp(x, -1, 1), y: clamp(y, -1, 1) }; }
  setSpeed(mult: number) { this.speed = clamp(mult, .5, 3); }
  dash() {
    if (!this.running || this.paused || this.upgrading || this.player.dashCooldown > 0) return;
    this.player.dashTime = .16; this.player.invulnerable = .3;
    this.player.dashCooldown = 3.3 / Math.sqrt(this.moveSpeed);
    this.burst(this.player.x, this.player.y, palette.cyan, 12, 110);
  }
  chooseUpgrade(id: string) {
    if (!this.upgrading || !this.currentChoices.some(c => c.id === id)) return;
    if (id === 'damage') this.damage += .25;
    if (id === 'rapid') this.attackSpeed += .18;
    if (id === 'shield') this.player.shield = Math.min(100, this.player.shield + 28);
    if (id === 'heal') this.player.hp = Math.min(this.player.maxHp, this.player.hp + 35);
    if (id === 'speed') this.moveSpeed += .12;
    if (id === 'magnet') this.magnet *= 1.38;
    this.upgrading = false; this.last = performance.now();
    this.burst(this.player.x, this.player.y, palette.cyan, 22, 160);
    this.float(this.player.x, this.player.y - 38, this.currentChoices.find(c => c.id === id)?.name || '', palette.cyan);
    this.emitHud(); this.checkLevel();
  }

  private resize() {
    const bounds = this.canvas.getBoundingClientRect();
    this.width = Math.max(280, bounds.width); this.height = Math.max(240, bounds.height);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.width * this.dpr); this.canvas.height = Math.round(this.height * this.dpr);
    this.draw();
  }
  private frame = (now: number) => {
    if (this.destroyed) return;
    const realDt = Math.min(.04, Math.max(0, (now - this.last) / 1000)); this.last = now;
    this.visualTime += realDt;
    if (this.running && !this.paused && !this.upgrading) {
      // Small fixed-size steps keep dash and collision reliable in accelerated demo mode.
      const total = realDt * this.speed; const steps = Math.max(1, Math.ceil(total / .025));
      for (let i = 0; i < steps && this.running && !this.upgrading; i++) this.update(total / steps);
    }
    this.draw();
    if (this.running) this.raf = requestAnimationFrame(this.frame);
  };

  private update(dt: number) {
    this.elapsed += dt;
    this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
    this.player.dashCooldown = Math.max(0, this.player.dashCooldown - dt);
    this.player.dashTime = Math.max(0, this.player.dashTime - dt);
    this.shake = Math.max(0, this.shake - dt * 15);
    let mx = this.input.x + (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0) - (this.keys.has('a') || this.keys.has('arrowleft') ? 1 : 0);
    let my = this.input.y + (this.keys.has('s') || this.keys.has('arrowdown') ? 1 : 0) - (this.keys.has('w') || this.keys.has('arrowup') ? 1 : 0);
    const ml = Math.hypot(mx, my);
    if (ml > 0) { mx /= Math.max(1, ml); my /= Math.max(1, ml); this.player.dx = mx; this.player.dy = my; }
    const moving = ml > .05;
    const dash = this.player.dashTime > 0;
    const v = 225 * this.moveSpeed * (dash ? 3.8 : 1);
    this.player.x = clamp(this.player.x + (dash ? this.player.dx : mx) * v * dt, 35, this.world.width - 35);
    this.player.y = clamp(this.player.y + (dash ? this.player.dy : my) * v * dt, 35, this.world.height - 35);
    if (moving && (this.options.trail || dash) && Math.random() < dt * 35) this.particles.push({ x: this.player.x, y: this.player.y, vx: -mx * 20, vy: -my * 20, life: .45, max: .45, color: this.options.trail ? palette.purple : palette.cyan, size: dash ? 6 : 3 });

    for (const threshold of [30, 60, 90, 120, 150, 170]) if (this.elapsed >= threshold && !this.checkpoints.has(threshold)) {
      this.checkpoints.add(threshold);
      if (threshold === 90) { this.float(this.player.x, this.player.y - 65, '撤离通道已开启', palette.cyan, 3, 18); this.burst(this.extraction.x, this.extraction.y, palette.cyan, 50, 180); }
      if (threshold === 120) this.spawnBoss();
      if (threshold === 150) this.float(this.player.x, this.player.y - 65, '剩余 30 秒 · 带着物资撤离', palette.gold, 3, 17);
      if (threshold === 170) this.float(this.player.x, this.player.y - 65, '区域即将关闭！', palette.red, 3, 19);
    }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.enemies.length < 65) {
      const stage = this.elapsed >= 120 ? 2 : this.elapsed >= 60 ? 1 : 0;
      const type = Math.random() < .12 + stage * .04 ? 'elite' : Math.random() < .28 ? 'runner' : 'normal';
      this.spawnEnemy(type); if (stage > 0 && Math.random() < .25) this.spawnEnemy('normal');
      const fightingBoss = this.enemies.some(e => e.type === 'boss' && e.hp > 0);
      this.spawnTimer = fightingBoss ? 2.1 : stage === 2 ? 1.2 : stage === 1 ? 1.35 : 1.65;
    }
    this.shotTimer -= dt;
    if (this.shotTimer <= 0) this.shoot();
    this.updateDrones(dt);

    for (const enemy of this.enemies) {
      enemy.hit = Math.max(0, enemy.hit - dt); enemy.phase += dt;
      const dx = this.player.x - enemy.x; const dy = this.player.y - enemy.y; const d = Math.max(1, Math.hypot(dx, dy));
      const speed = enemy.type === 'runner' && Math.sin(enemy.phase * 2.7) > .7 ? enemy.speed * 2 : enemy.speed;
      if (d > enemy.r + 13) { enemy.x += dx / d * speed * dt; enemy.y += dy / d * speed * dt; }
      if (d < enemy.r + 16) this.hurt(enemy.type === 'boss' ? 18 : enemy.type === 'elite' ? 12 : 8);
      if (enemy.type === 'boss') {
        enemy.shot -= dt;
        if (enemy.shot <= 0) {
          const count = enemy.hp < enemy.max * .5 ? 12 : 8;
          for (let j = 0; j < count; j++) {
            const a = j / count * TAU + enemy.phase * .2;
            this.bullets.push({ x: enemy.x, y: enemy.y, vx: Math.cos(a) * 125, vy: Math.sin(a) * 125, damage: 12, hostile: true, life: 6, r: 6, color: palette.red, hits: 1 });
          }
          enemy.shot = enemy.hp < enemy.max * .5 ? 1.9 : 2.5;
          this.burst(enemy.x, enemy.y, palette.purple, 10, 90);
        }
      }
    }
    // Avoid perfectly stacked mobs without expensive path finding.
    for (let i = 0; i < this.enemies.length; i++) for (let j = i + 1; j < this.enemies.length; j++) {
      const a = this.enemies[i], b = this.enemies[j]; const dx = a.x - b.x, dy = a.y - b.y;
      const d = Math.hypot(dx, dy); const min = a.r + b.r - 3;
      if (d > .1 && d < min) { const f = (min - d) * .3; a.x += dx / d * f; a.y += dy / d * f; b.x -= dx / d * f; b.y -= dy / d * f; }
    }
    for (const bullet of this.bullets) {
      bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; bullet.life -= dt;
      if (bullet.hostile) { if (distance(bullet, this.player) < bullet.r + 14) { this.hurt(bullet.damage); bullet.life = 0; } }
      else for (const enemy of this.enemies) {
        if (enemy.hp <= 0 || bullet.life <= 0 || distance(bullet, enemy) > bullet.r + enemy.r) continue;
        this.hitEnemy(enemy, bullet.damage); bullet.hits--; if (bullet.hits <= 0) bullet.life = 0;
      }
    }
    this.bullets = this.bullets.filter(b => b.life > 0);
    this.enemies = this.enemies.filter(e => e.hp > 0);
    for (const chest of this.chests) if (!chest.opened && distance(chest, this.player) < 46) {
      chest.opened = true; this.bag.alloy += chest.rare ? 13 : 10;
      if (chest.rare) this.bag.chips++;
      this.float(chest.x, chest.y - 30, chest.rare ? '+13 合金  +1 芯片' : '+10 合金', chest.rare ? palette.blue : palette.gold, 2, 14);
      this.burst(chest.x, chest.y, chest.rare ? palette.blue : palette.gold, 20, 120);
    }
    const pickupRange = 70 * this.magnet;
    for (const item of this.pickups) {
      item.phase += dt;
      let d = distance(item, this.player);
      if (d < pickupRange || item.type === 'core' && d < 110) {
        const speed = Math.max(260, 550 - d);
        item.x += (this.player.x - item.x) / Math.max(1, d) * speed * dt;
        item.y += (this.player.y - item.y) / Math.max(1, d) * speed * dt;
        d = distance(item, this.player);
      }
      if (d < 22) {
        if (item.type === 'xp') { this.xp += item.amount; this.checkLevel(); }
        if (item.type === 'alloy') this.bag.alloy += item.amount;
        if (item.type === 'chip') { this.bag.chips += item.amount; this.float(this.player.x, this.player.y - 30, `+${item.amount} 战术芯片`, palette.blue, 1.5, 14); }
        if (item.type === 'core') { this.bag.cores += item.amount; this.float(this.player.x, this.player.y - 50, '异常核心已拾取 · 请成功撤离', palette.purple, 3, 17); this.burst(this.player.x, this.player.y, palette.purple, 35, 160); }
        item.amount = 0;
      }
    }
    this.pickups = this.pickups.filter(p => p.amount > 0);
    this.updateEffects(dt);
    const near = distance(this.player, this.extraction) < this.extraction.r - 8;
    if (this.elapsed >= 90 && near && !moving && !dash) this.extractionProgress += dt / 3;
    else this.extractionProgress = 0;
    if (this.player.hp <= 0) { this.finish('dead'); return; }
    if (this.elapsed >= 180) { this.finish('timeout'); return; }
    if (this.extractionProgress >= 1) { this.finish('extracted'); return; }
    this.hudTimer += dt;
    if (this.hudTimer >= .08) { this.hudTimer = 0; this.emitHud(); }
  }

  private checkLevel() {
    if (this.upgrading || this.xp < this.xpNeeded || !this.running) return;
    this.xp -= this.xpNeeded; this.level++; this.xpNeeded = Math.round(6 + this.level * 2.2);
    this.upgrading = true; this.keys.clear(); this.input = { x: 0, y: 0 };
    this.currentChoices = [...UPGRADES].sort(() => Math.random() - .5).slice(0, 3);
    this.emitHud(); this.options.onUpgrade(this.currentChoices);
  }
  private shoot() {
    // A close boss gets a modest priority so automatic fire can finish the objective
    // while a steady stream of small enemies is present. Immediate threats still win.
    const priority = (enemy: Enemy) => distance(enemy, this.player) * (enemy.type === 'boss' && distance(enemy, this.player) < 320 ? .5 : 1);
    const target = this.enemies.reduce<Enemy | null>((best, enemy) => !best || priority(enemy) < priority(best) ? enemy : best, null);
    if (!target || distance(target, this.player) > 650) { this.shotTimer = .08; return; }
    const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x); this.player.angle = angle;
    const weapon = this.options.weapon;
    const spreads = weapon === 'scatter' ? [-.24, -.12, 0, .12, .24] : [0];
    for (const offset of spreads) {
      const a = angle + offset;
      this.bullets.push({ x: this.player.x + Math.cos(a) * 22, y: this.player.y + Math.sin(a) * 22, vx: Math.cos(a) * 690, vy: Math.sin(a) * 690, damage: (weapon === 'scatter' ? 10 : weapon === 'drone' ? 12 : 19) * this.damage, life: weapon === 'scatter' ? .55 : .9, hostile: false, r: weapon === 'scatter' ? 3 : 4, color: weapon === 'scatter' ? palette.gold : palette.cyan, hits: 1 });
    }
    this.shotTimer = (weapon === 'scatter' ? .62 : weapon === 'drone' ? .53 : .38) / this.attackSpeed;
    this.burst(this.player.x + Math.cos(angle) * 25, this.player.y + Math.sin(angle) * 25, weapon === 'scatter' ? palette.gold : palette.cyan, 3, 60);
  }
  private updateDrones(dt: number) {
    if (this.options.weapon !== 'drone' && this.options.character !== 'engineer') return;
    this.droneTimer -= dt;
    if (this.droneTimer > 0) return;
    this.droneTimer = .21 / this.attackSpeed;
    const count = (this.options.weapon === 'drone' ? 3 : 0) + (this.options.character === 'engineer' ? 1 : 0);
    for (let j = 0; j < count; j++) {
      const angle = this.elapsed * 2.1 + j / count * TAU;
      const pos = { x: this.player.x + Math.cos(angle) * 78, y: this.player.y + Math.sin(angle) * 78 };
      for (const enemy of this.enemies) if (distance(enemy, pos) < enemy.r + 22) this.hitEnemy(enemy, 14 * this.damage);
    }
  }
  private spawnEnemy(type: Enemy['type']) {
    const angle = Math.random() * TAU; const range = 460 + Math.random() * 120;
    const values = type === 'elite' ? { hp: 95, r: 24, speed: 45 } : type === 'runner' ? { hp: 28, r: 13, speed: 66 } : { hp: 34, r: 18, speed: 51 };
    const scaling = 1 + Math.max(0, this.elapsed - 60) / 200;
    this.enemies.push({ id: this.nextId++, x: clamp(this.player.x + Math.cos(angle) * range, 30, this.world.width - 30), y: clamp(this.player.y + Math.sin(angle) * range, 30, this.world.height - 30), type, hp: values.hp * scaling, max: values.hp * scaling, r: values.r, speed: values.speed, hit: 0, shot: 2, phase: Math.random() * TAU });
  }
  private spawnBoss() {
    if (this.bossSpawned) return;
    this.bossSpawned = true;
    const angle = Math.atan2(650 - this.player.y, 900 - this.player.x);
    this.enemies.push({ id: this.nextId++, x: clamp(this.player.x + Math.cos(angle) * 310, 90, this.world.width - 90), y: clamp(this.player.y + Math.sin(angle) * 310, 90, this.world.height - 90), type: 'boss', hp: 900, max: 900, r: 48, speed: 35, hit: 0, shot: 2, phase: 0 });
    this.float(this.player.x, this.player.y - 70, '核心守卫已出现 · 击败后保底掉落核心', palette.purple, 3.5, 18);
    this.shake = 3;
  }
  private hitEnemy(enemy: Enemy, damage: number) {
    if (enemy.hp <= 0) return;
    enemy.hp -= damage; enemy.hit = .09;
    this.burst(enemy.x, enemy.y, enemy.type === 'boss' ? palette.purple : palette.red, 3, 65);
    if (enemy.hp > 0) return;
    this.kills++;
    this.burst(enemy.x, enemy.y, enemy.type === 'boss' ? palette.purple : enemy.type === 'elite' ? palette.blue : palette.red, enemy.type === 'boss' ? 70 : 12, enemy.type === 'boss' ? 220 : 100);
    this.pickups.push({ x: enemy.x, y: enemy.y, type: 'xp', amount: enemy.type === 'boss' ? 10 : enemy.type === 'elite' ? 4 : 1, phase: Math.random() * TAU });
    if (enemy.type === 'boss') {
      this.bossKilled = true;
      this.pickups.push({ x: enemy.x + 18, y: enemy.y - 12, type: 'core', amount: 1, phase: 0 });
      this.pickups.push({ x: enemy.x - 20, y: enemy.y, type: 'chip', amount: 2, phase: 0 });
      this.pickups.push({ x: enemy.x, y: enemy.y + 20, type: 'alloy', amount: 15, phase: 0 });
      this.float(enemy.x, enemy.y - 60, '守卫已击败 · 拾取核心并撤离', palette.purple, 4, 17);
      this.shake = 5;
    } else {
      if (Math.random() < .65 || enemy.type === 'elite') this.pickups.push({ x: enemy.x + 12, y: enemy.y + 5, type: 'alloy', amount: enemy.type === 'elite' ? 5 : 2, phase: Math.random() * TAU });
      if (enemy.type === 'elite') this.pickups.push({ x: enemy.x - 12, y: enemy.y - 5, type: 'chip', amount: 1, phase: Math.random() * TAU });
    }
  }
  private hurt(amount: number) {
    if (this.player.invulnerable > 0 || !this.running) return;
    const shieldDamage = Math.min(this.player.shield, amount);
    this.player.shield -= shieldDamage; this.player.hp -= amount - shieldDamage;
    this.player.invulnerable = .75; this.shake = 3;
    this.float(this.player.x + 15, this.player.y - 28, `−${amount}`, palette.red, .65, 15);
    this.burst(this.player.x, this.player.y, shieldDamage ? palette.blue : palette.red, 10, 95);
  }
  private updateEffects(dt: number) {
    for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(.2, dt); p.vy *= Math.pow(.2, dt); p.life -= dt; }
    this.particles = this.particles.filter(p => p.life > 0).slice(-550);
    for (const t of this.texts) { t.y -= dt * 16; t.life -= dt; }
    this.texts = this.texts.filter(t => t.life > 0);
  }
  private burst(x: number, y: number, color: string, n = 10, speed = 100) {
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, life = .25 + Math.random() * .35; this.particles.push({ x, y, vx: Math.cos(a) * speed * Math.random(), vy: Math.sin(a) * speed * Math.random(), life, max: life, size: 1.5 + Math.random() * 3, color }); }
  }
  private float(x: number, y: number, text: string, color: string, life = 1.5, size = 14) { this.texts.push({ x, y, text, color, life, max: life, size }); }
  private emitHud() {
    const boss = this.enemies.find(e => e.type === 'boss' && e.hp > 0);
    const near = distance(this.player, this.extraction) < this.extraction.r - 8;
    this.options.onHud({ hp: Math.max(0, this.player.hp), maxHp: this.player.maxHp, shield: this.player.shield, time: this.elapsed, xp: this.xp, xpNeeded: this.xpNeeded, level: this.level, kills: this.kills, alloy: this.bag.alloy, chips: this.bag.chips, cores: this.bag.cores, extractionOpen: this.elapsed >= 90, extractProgress: this.extractionProgress, bossHp: boss?.hp || 0, bossMaxHp: boss?.max || 0, status: this.upgrading ? '选择战术升级' : this.bag.cores > 0 ? '核心已入背包 · 立即撤离' : this.bossKilled ? '拾取核心并撤离' : boss ? '核心守卫出现' : this.elapsed >= 90 ? '撤离已开启 · 也可继续挑战' : '搜集物资 · 自动攻击', dashReady: this.player.dashCooldown <= 0, nearExtract: near });
  }
  private finish(reason: GameResult['reason']) {
    if (!this.running) return;
    this.running = false; this.keys.clear(); this.emitHud();
    const success = reason === 'extracted';
    this.options.onFinish({ success, reason, alloy: success ? this.bag.alloy : Math.floor(this.bag.alloy * .2), chips: success ? this.bag.chips : 0, cores: success ? this.bag.cores : 0, kills: this.kills, time: Math.min(180, this.elapsed), level: this.level, bossKilled: this.bossKilled, collected: { ...this.bag } });
  }

  private camera() {
    return { x: clamp(this.player.x - this.width / 2, -40, Math.max(-40, this.world.width - this.width + 40)), y: clamp(this.player.y - this.height / 2, -40, Math.max(-40, this.world.height - this.height + 40)) };
  }
  private polygon(x: number, y: number, r: number, sides: number, angle = 0) {
    const c = this.ctx; c.beginPath();
    for (let j = 0; j < sides; j++) { const a = angle + j / sides * TAU; j ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    c.closePath();
  }
  private label(text: string, x: number, y: number, color = '#718397', size = 11) {
    this.ctx.font = `600 ${size}px "Segoe UI", "Microsoft YaHei", sans-serif`; this.ctx.fillStyle = color; this.ctx.textAlign = 'center'; this.ctx.fillText(text, x, y);
  }
  private draw() {
    const c = this.ctx; if (!c) return;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = '#080e16'; c.fillRect(0, 0, this.width, this.height);
    const cam = this.camera();
    c.save(); c.translate(-cam.x + (Math.random() - .5) * this.shake, -cam.y + (Math.random() - .5) * this.shake);
    this.drawFloor(cam); this.drawExtraction();
    for (const chest of this.chests) this.drawChest(chest);
    for (const item of this.pickups) this.drawPickup(item);
    for (const enemy of this.enemies) if (enemy.hp > 0) this.drawEnemy(enemy);
    for (const b of this.bullets) {
      c.strokeStyle = b.color; c.lineWidth = b.hostile ? 3 : 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(b.x - b.vx * .016, b.y - b.vy * .016); c.lineTo(b.x, b.y); c.stroke();
      c.fillStyle = b.color; c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.fill();
    }
    this.drawPlayer();
    for (const p of this.particles) { c.globalAlpha = clamp(p.life / p.max, 0, 1); c.fillStyle = p.color; c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
    c.globalAlpha = 1;
    for (const t of this.texts) { c.globalAlpha = Math.min(1, t.life * 2); c.shadowColor = '#000'; c.shadowBlur = 5; this.label(t.text, t.x, t.y, t.color, t.size); }
    c.shadowBlur = 0; c.globalAlpha = 1; c.restore();
    this.drawNavigation(cam); this.drawMinimap();
    const vignette = c.createRadialGradient(this.width / 2, this.height / 2, this.height * .25, this.width / 2, this.height / 2, this.width * .7);
    vignette.addColorStop(0, 'transparent'); vignette.addColorStop(1, 'rgba(0,0,0,.48)'); c.fillStyle = vignette; c.fillRect(0, 0, this.width, this.height);
    if (this.player.hp < this.player.maxHp * .28) { c.strokeStyle = `rgba(250,90,100,${.2 + Math.sin(this.visualTime * 5) * .1})`; c.lineWidth = 10; c.strokeRect(0, 0, this.width, this.height); }
  }
  private drawFloor(cam: V) {
    const c = this.ctx;
    c.fillStyle = '#111c27'; c.fillRect(0, 0, this.world.width, this.world.height);
    // A restrained industrial grid gives movement a readable sense of scale.
    c.strokeStyle = '#1b2935'; c.lineWidth = 1;
    for (let x = Math.floor(cam.x / 80) * 80; x < cam.x + this.width + 80; x += 80) { c.beginPath(); c.moveTo(x, Math.max(0, cam.y)); c.lineTo(x, Math.min(this.world.height, cam.y + this.height)); c.stroke(); }
    for (let y = Math.floor(cam.y / 80) * 80; y < cam.y + this.height + 80; y += 80) { c.beginPath(); c.moveTo(Math.max(0, cam.x), y); c.lineTo(Math.min(this.world.width, cam.x + this.width), y); c.stroke(); }
    c.fillStyle = 'rgba(155,100,230,.045)'; c.fillRect(140, 100, 1520, 460);
    c.strokeStyle = '#2d3d4a'; c.lineWidth = 6; c.strokeRect(16, 16, this.world.width - 32, this.world.height - 32);
    c.strokeStyle = '#283846'; c.lineWidth = 2; c.setLineDash([14, 14]);
    c.strokeRect(260, 160, 1280, 1000); c.setLineDash([]);
    c.fillStyle = '#172632'; c.fillRect(800, 120, 200, 500); c.fillRect(450, 610, 900, 74);
    c.strokeStyle = '#2e414e'; c.lineWidth = 1; c.strokeRect(800, 120, 200, 500);
    this.label('SECTOR 07 / 信号失联区', 900, 155, '#516374', 18);
    this.label('RESEARCH DECK', 900, 185, '#324d60', 10);
    this.label('危险补给区', 470, 390, '#665d7a', 12);
    this.label('危险补给区', 1250, 520, '#665d7a', 12);
    c.strokeStyle = '#2d3a45'; c.lineWidth = 3;
    for (const [x, y] of [[350, 850], [1450, 850], [330, 300], [1450, 300]]) {
      c.strokeRect(x - 45, y - 25, 90, 50); c.beginPath(); c.moveTo(x - 45, y - 25); c.lineTo(x + 45, y + 25); c.moveTo(x + 45, y - 25); c.lineTo(x - 45, y + 25); c.stroke();
    }
    // Painted arrows lead back to the extraction pad.
    for (const y of [810, 870, 930]) {
      c.strokeStyle = '#2a5554'; c.lineWidth = 3; c.beginPath(); c.moveTo(888, y); c.lineTo(900, y + 10); c.lineTo(912, y); c.stroke();
    }
  }
  private drawExtraction() {
    const c = this.ctx, p = this.extraction, open = this.elapsed >= 90;
    const color = open ? palette.cyan : '#566578';
    c.save(); c.translate(p.x, p.y);
    c.fillStyle = open ? 'rgba(70,230,206,.07)' : 'rgba(80,100,120,.08)';
    this.polygon(0, 0, 83, 6, Math.PI / 6); c.fill();
    c.strokeStyle = open ? 'rgba(123,244,231,.45)' : '#394759'; c.lineWidth = 2; c.stroke();
    c.setLineDash([9, 7]); c.strokeStyle = color; c.beginPath(); c.arc(0, 0, p.r, this.visualTime * .12, this.visualTime * .12 + TAU); c.stroke(); c.setLineDash([]);
    c.strokeStyle = open ? '#6ee0d1' : '#405264'; c.lineWidth = 3;
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; c.save(); c.rotate(a); c.beginPath(); c.moveTo(40, -12); c.lineTo(52, 0); c.lineTo(40, 12); c.stroke(); c.restore(); }
    c.fillStyle = open ? 'rgba(123,244,231,.25)' : '#213342'; c.fillRect(-16, -16, 32, 32);
    this.label(open ? '↑' : '⌁', 0, 9, color, 29);
    if (this.extractionProgress > 0) { c.strokeStyle = palette.cyan; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, 74, -Math.PI / 2, -Math.PI / 2 + this.extractionProgress * TAU); c.stroke(); }
    this.label(open ? '停留 3 秒 · 撤离' : `撤离开启 ${Math.max(0, Math.ceil(90 - this.elapsed))}s`, 0, 108, color, 13);
    c.restore();
  }
  private drawChest(chest: Chest) {
    const c = this.ctx, color = chest.rare ? palette.blue : palette.gold;
    c.save(); c.translate(chest.x, chest.y);
    c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(0, 13, 25, 10, 0, 0, TAU); c.fill();
    c.fillStyle = chest.opened ? '#1e2d37' : '#263a49'; c.fillRect(-21, -16, 42, 31);
    c.strokeStyle = chest.opened ? '#3b4c58' : color; c.lineWidth = 2; c.strokeRect(-21, -16, 42, 31);
    c.fillStyle = chest.opened ? '#3b4c58' : color; c.fillRect(-5, -4, 10, 8);
    c.strokeStyle = '#142633'; c.beginPath(); c.moveTo(-20, -5); c.lineTo(20, -5); c.stroke();
    if (!chest.opened) { c.globalAlpha = .3 + Math.sin(this.visualTime * 3) * .15; c.strokeStyle = color; c.beginPath(); c.arc(0, 0, 33, 0, TAU); c.stroke(); c.globalAlpha = 1; }
    this.label(chest.opened ? '已搜集' : chest.rare ? '战术补给' : '合金补给', 0, -29, chest.opened ? '#506372' : color, 11);
    c.restore();
  }
  private drawPickup(item: Pickup) {
    const c = this.ctx, y = item.y + Math.sin(item.phase * 3) * 2;
    const color = item.type === 'core' ? palette.purple : item.type === 'chip' ? palette.blue : item.type === 'alloy' ? palette.gold : palette.green;
    c.fillStyle = color;
    if (item.type === 'core') {
      c.shadowColor = color; c.shadowBlur = 20; this.polygon(item.x, y, 14, 6, this.visualTime); c.fill(); c.shadowBlur = 0;
      c.strokeStyle = 'rgba(191,148,255,.4)'; c.beginPath(); c.arc(item.x, y, 24 + Math.sin(this.visualTime * 4) * 3, 0, TAU); c.stroke();
      this.label('异常核心', item.x, y - 30, color, 13);
    } else if (item.type === 'chip') { c.fillRect(item.x - 6, y - 7, 12, 14); c.fillStyle = '#13364b'; c.fillRect(item.x - 3, y - 4, 6, 8); }
    else if (item.type === 'alloy') { this.polygon(item.x, y, 6, 4, .2); c.fill(); }
    else { this.polygon(item.x, y, 4, 4, 0); c.fill(); }
  }
  private drawEnemy(enemy: Enemy) {
    const c = this.ctx; const boss = enemy.type === 'boss', elite = enemy.type === 'elite';
    c.save(); c.translate(enemy.x, enemy.y);
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(0, enemy.r * .65, enemy.r * 1.1, enemy.r * .55, 0, 0, TAU); c.fill();
    const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
    c.rotate(angle);
    if (boss) {
      c.strokeStyle = 'rgba(185,131,255,.2)'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 62 + Math.sin(enemy.phase * 3) * 3, 0, TAU); c.stroke();
      for (let i = 0; i < 6; i++) { c.save(); c.rotate(i / 6 * TAU + enemy.phase * .3); c.fillStyle = '#44335f'; c.fillRect(36, -9, 18, 18); c.strokeStyle = palette.purple; c.strokeRect(36, -9, 18, 18); c.restore(); }
      this.polygon(0, 0, 45, 6, Math.PI / 6); c.fillStyle = enemy.hit ? '#f6e6ff' : '#3c2e55'; c.fill(); c.strokeStyle = palette.purple; c.lineWidth = 3; c.stroke();
      this.polygon(0, 0, 21, 6, -enemy.phase); c.fillStyle = palette.purple; c.fill(); c.fillStyle = '#fff'; c.fillRect(4, -4, 15, 8);
    } else if (enemy.type === 'runner') {
      this.polygon(0, 0, 16, 3, 0); c.fillStyle = enemy.hit ? '#fff' : '#7d4250'; c.fill(); c.strokeStyle = '#f69094'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#ffd3a6'; c.fillRect(4, -3, 5, 6);
    } else {
      c.fillStyle = enemy.hit ? '#fff' : elite ? '#324369' : '#523e4b';
      this.polygon(0, 0, enemy.r, elite ? 6 : 5, enemy.phase * .12); c.fill(); c.strokeStyle = elite ? palette.blue : '#ae6a7a'; c.lineWidth = 2; c.stroke();
      c.fillStyle = elite ? palette.blue : '#f6a3a4'; c.fillRect(2, -5, enemy.r * .6, 10);
      if (elite) { c.strokeStyle = '#617db3'; c.beginPath(); c.arc(0, 0, enemy.r + 6, enemy.phase, enemy.phase + Math.PI * 1.4); c.stroke(); }
    }
    c.restore();
    if (enemy.hp < enemy.max || boss || elite) { const w = boss ? 92 : elite ? 44 : 28; c.fillStyle = '#18242f'; c.fillRect(enemy.x - w / 2, enemy.y - enemy.r - 12, w, 4); c.fillStyle = boss ? palette.purple : elite ? palette.blue : palette.red; c.fillRect(enemy.x - w / 2, enemy.y - enemy.r - 12, w * Math.max(0, enemy.hp / enemy.max), 4); }
    if (boss) this.label('核心守卫', enemy.x, enemy.y - 76, palette.purple, 13);
  }
  private drawPlayer() {
    const c = this.ctx, p = this.player, engineer = this.options.character === 'engineer';
    c.save(); c.translate(p.x, p.y);
    c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(0, 15, 20, 10, 0, 0, TAU); c.fill();
    if (p.shield > 0) { c.strokeStyle = 'rgba(124,168,255,.6)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 28, this.visualTime, this.visualTime + TAU); c.stroke(); }
    if (p.invulnerable > 0) c.globalAlpha = .65 + Math.sin(this.visualTime * 40) * .25;
    c.rotate(p.angle);
    c.fillStyle = engineer ? '#b897f6' : '#a9e8df'; c.strokeStyle = engineer ? '#dfc9ff' : '#cafff6'; c.lineWidth = 2;
    this.polygon(0, 0, 18, 6, Math.PI / 6); c.fill(); c.stroke();
    c.fillStyle = '#183440'; c.fillRect(-6, -10, 12, 20); c.fillStyle = '#effffd'; c.fillRect(2, -8, 7, 16);
    c.fillStyle = '#526c80'; c.fillRect(9, 0, 22, 7); c.fillStyle = palette.cyan; c.fillRect(26, 1, 6, 5);
    c.restore();
    if (this.options.weapon === 'drone' || engineer) {
      const count = (this.options.weapon === 'drone' ? 3 : 0) + (engineer ? 1 : 0);
      c.strokeStyle = 'rgba(124,168,255,.12)'; c.setLineDash([4, 10]); c.beginPath(); c.arc(p.x, p.y, 78, 0, TAU); c.stroke(); c.setLineDash([]);
      for (let j = 0; j < count; j++) {
        const a = this.elapsed * 2.1 + j / count * TAU; const x = p.x + Math.cos(a) * 78, y = p.y + Math.sin(a) * 78;
        c.fillStyle = palette.blue; this.polygon(x, y, 9, 4, a); c.fill(); c.fillStyle = '#f4ffff'; c.fillRect(x - 2, y - 2, 4, 4);
      }
    }
    c.fillStyle = '#162d36'; c.fillRect(p.x - 20, p.y + 29, 40, 3); c.fillStyle = palette.cyan; c.fillRect(p.x - 20, p.y + 29, 40 * Math.max(0, p.hp / p.maxHp), 3);
  }
  private drawNavigation(cam: V) {
    const c = this.ctx;
    let target: V, title: string, color: string;
    const boss = this.enemies.find(e => e.type === 'boss' && e.hp > 0);
    if (this.elapsed >= 90) { target = this.extraction; title = '撤离点'; color = palette.cyan; }
    else { const chest = this.chests.filter(ch => !ch.opened).sort((a, b) => distance(a, this.player) - distance(b, this.player))[0]; if (!chest) return; target = chest; title = '补给箱'; color = chest.rare ? palette.blue : palette.gold; }
    const drawArrow = (point: V, text: string, tint: string, offset: number) => {
      const sx = point.x - cam.x, sy = point.y - cam.y;
      if (sx > 60 && sx < this.width - 60 && sy > 70 && sy < this.height - 70) return;
      const angle = Math.atan2(sy - this.height / 2, sx - this.width / 2);
      const rx = this.width / 2 - 60, ry = this.height / 2 - 55;
      const scale = Math.min(rx / Math.max(.001, Math.abs(Math.cos(angle))), ry / Math.max(.001, Math.abs(Math.sin(angle))));
      const x = this.width / 2 + Math.cos(angle) * scale, y = this.height / 2 + Math.sin(angle) * scale + offset;
      c.save(); c.translate(x, y); c.rotate(angle); this.polygon(0, 0, 9, 3); c.fillStyle = tint; c.fill(); c.restore();
      this.label(`${text} ${Math.round(distance(point, this.player) / 10)}m`, x, y + 23, tint, 11);
    };
    drawArrow(target, title, color, 0);
    if (boss) drawArrow(boss, '核心守卫', palette.purple, -30);
  }
  private drawMinimap() {
    if (this.width < 420) return;
    const c = this.ctx, w = 138, h = 100, x = this.width - w - 16, y = this.height - h - 16;
    c.fillStyle = 'rgba(7,16,26,.82)'; c.fillRect(x, y, w, h); c.strokeStyle = '#34434e'; c.lineWidth = 1; c.strokeRect(x, y, w, h);
    const px = (point: V) => ({ x: x + 8 + point.x / this.world.width * (w - 16), y: y + 8 + point.y / this.world.height * (h - 16) });
    for (const chest of this.chests) if (!chest.opened) { const p = px(chest); c.fillStyle = chest.rare ? palette.blue : palette.gold; c.fillRect(p.x - 2, p.y - 2, 4, 4); }
    const e = px(this.extraction); c.strokeStyle = this.elapsed >= 90 ? palette.cyan : '#61717c'; c.strokeRect(e.x - 4, e.y - 3, 8, 6);
    const b = this.enemies.find(en => en.type === 'boss' && en.hp > 0); if (b) { const p = px(b); c.fillStyle = palette.purple; c.beginPath(); c.arc(p.x, p.y, 4, 0, TAU); c.fill(); }
    const p = px(this.player); c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x, p.y, 3, 0, TAU); c.fill();
  }
}
