import { palette } from '../../config/palette';
import { clamp } from '../../shared/math';
import { CombatAudio } from '../audio/CombatAudio';
import * as boss from '../combat/boss';
import * as damage from '../combat/damage';
import * as enemies from '../combat/enemies';
import * as player from '../combat/player';
import * as projectiles from '../combat/projectiles';
import * as weapons from '../combat/weapons';
import * as interactions from '../core/interactions';
import * as navigation from '../core/navigation';
import * as simulation from '../core/update';
import * as extraction from '../extraction/extraction';
import * as contracts from '../progression/contracts';
import * as supplies from '../progression/supplies';
import * as upgrades from '../progression/upgrades';
import * as actorRenderer from '../rendering/actorRenderer';
import * as effects from '../rendering/effects';
import * as navigationRenderer from '../rendering/navigationRenderer';
import * as renderer from '../rendering/renderer';
import { ART } from '../rendering/sprites';
import * as worldRenderer from '../rendering/worldRenderer';
import type {
  Bullet,
  DeathEffect,
  Enemy,
  EventState,
  FloatText,
  GameHud,
  GameOptions,
  Objective,
  Particle,
  PendingEnemy,
  Pickup,
  UpgradeChoice,
  V,
  Warning,
} from '../types';
import type { Chunk, Obstacle, Site } from '../world/chunks';
import * as exploration from '../world/exploration';

/** Internal state for one battle. React uses the StarbreakGame facade instead. */
export class GameSession {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  options: GameOptions;
  resizeObserver: ResizeObserver;
  width = 960;
  height = 640;
  dpr = 1;
  player = {
    x: 0,
    y: 0,
    hp: 110,
    maxHp: 110,
    shield: 0,
    angle: -Math.PI / 2,
    invulnerable: 0,
    dashTime: 0,
    dashCooldown: 0,
    dx: 0,
    dy: -1,
  };
  seed = Math.floor(Math.random() * 0x7fffffff);
  chunks = new Map<string, Chunk>();
  visited = new Set<string>();
  eventStates = new Map<string, EventState>();
  usedTerminals = new Set<string>();
  consumedSupplies = new Set<string>();
  obstacles: Obstacle[] = [];
  sites: Site[] = [];
  currentChunk = '';
  extraction = { x: 0, y: 115, r: 85 };
  activeExtraction: Site | null = null;
  bossSite: Site | null = null;
  bossExtraction: Site | null = null;
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  pickups: Pickup[] = [];
  particles: Particle[] = [];
  texts: FloatText[] = [];
  warnings: Warning[] = [];
  keys = new Set<string>();
  input = { x: 0, y: 0 };
  running = false;
  destroyed = false;
  paused = false;
  upgrading = false;
  contracting = false;
  raf = 0;
  last = 0;
  elapsed = 0;
  visualTime = 0;
  hudTimer = 0;
  spawnTimer = 3;
  shotTimer = 0.1;
  droneTimer = 0;
  nextId = 0;
  speed = 1;
  shake = 0;
  level = 1;
  xp = 0;
  xpNeeded = 6;
  kills = 0;
  events = 0;
  fragments = 0;
  bag = { alloy: 0, chips: 0, cores: 0 };
  damage = 1;
  attackSpeed = 1;
  moveSpeed = 1;
  magnet = 1;
  extractionProgress = 0;
  bossKilled = false;
  bossActive = false;
  currentChoices: UpgradeChoice[] = [];
  activeTerminal: Site | null = null;
  contracts: GameHud['contracts'] = [];
  damageTaken = 1;
  chain = false;
  chainCooldown = 0;
  supplyTimers = { overcharge: 0, speed: 0 };
  combo = 0;
  maxCombo = 0;
  lastKill = -100;
  comboTime = 0;
  rescueUsed = false;
  message = '';
  messageTime = 0;
  objective: Objective = 'resource';
  objectiveManual = false;
  audio: CombatAudio;
  shakeEnabled = true;
  sprites = new Map<string, HTMLImageElement>();
  pending: PendingEnemy[] = [];
  deaths: DeathEffect[] = [];
  cleanupTimer = 0;
  wave = 0;
  muzzleTime = 0;
  damageTextTimer = 0;
  velocity = { x: 0, y: 0 };
  flow = new Map<string, V>();
  flowTimer = 0;
  lastDamageSource = '';
  extractionWave = 0;
  keyDown = (event: KeyboardEvent) => {
    const k = event.key.toLowerCase();
    this.audio.unlock();
    if (
      ['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright', ' ', 'e'].includes(
        k,
      ) &&
      this.running &&
      !this.paused
    ) {
      event.preventDefault();
      this.keys.add(k);
      if (k === ' ' && !event.repeat) this.dash();
      if (k === 'e' && !event.repeat) this.interact();
    }
  };
  keyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.key.toLowerCase());
  };
  pointerDown = () => {
    this.audio.unlock();
  };
  blur = () => {
    this.keys.clear();
    this.input = { x: 0, y: 0 };
  };
  constructor(canvas: HTMLCanvasElement, options: GameOptions) {
    this.canvas = canvas;
    this.options = options;
    this.objective = options.objective || 'resource';
    this.objectiveManual = !!options.objective && options.objective !== 'resource';
    this.audio = new CombatAudio(options.sound !== false);
    this.shakeEnabled = options.screenShake !== false;
    if (typeof Image !== 'undefined')
      for (const [key, src] of Object.entries(ART)) {
        const image = new Image();
        image.src = src;
        this.sprites.set(key, image);
      }
    const context = canvas.getContext('2d');
    if (!context) throw new Error('当前浏览器不支持 Canvas 2D');
    this.ctx = context;
    this.player.maxHp = 110 + options.healthLevel * 10;
    this.player.hp = this.player.maxHp;
    this.player.shield = options.character === 'engineer' ? 20 : 0;
    this.magnet =
      1 +
      options.magnetLevel * 0.2 +
      (this.hasModule('magnet') ? 0.25 + this.moduleLevel('magnet') * 0.1 : 0);
    if (this.hasModule('pierce')) this.damage += this.moduleLevel('pierce') * 0.08;
    this.refreshChunks(true);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    canvas.addEventListener('pointerdown', this.pointerDown);
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.blur);
    this.resize();
  }
  start() {
    if (this.running || this.destroyed) return;
    this.running = true;
    this.audio.unlock();
    this.last = performance.now();
    this.notify('首次行动：跟随金色标记，到资源仓按 E', palette.cyan);
    this.emitHud();
    this.raf = requestAnimationFrame(this.frame);
  }
  destroy() {
    this.running = false;
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.audio.destroy();
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener('pointerdown', this.pointerDown);
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    window.removeEventListener('blur', this.blur);
  }
  setPaused(value: boolean) {
    this.paused = value;
    this.blur();
    this.last = performance.now();
  }
  setInput(x: number, y: number) {
    if (x || y) this.audio.unlock();
    this.input = { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
  }
  setSpeed(mult: number) {
    this.speed = clamp(mult, 0.5, 3);
  }
  setObjective(goal: Objective) {
    this.objective = goal;
    this.objectiveManual = true;
    this.emitHud();
  }
  setAudioEnabled(enabled: boolean) {
    this.audio.setEnabled(enabled);
  }
  setAudioVolume(volume: number) {
    this.audio.setVolume(volume);
  }
  setScreenShake(enabled: boolean) {
    this.shakeEnabled = enabled;
  }
  resize() {
    const b = this.canvas.getBoundingClientRect();
    this.width = Math.max(280, b.width);
    this.height = Math.max(240, b.height);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.draw();
  }
  frame = (now: number) => {
    if (this.destroyed) return;
    const realDt = Math.min(0.04, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.visualTime += realDt;
    if (this.running && !this.paused && !this.upgrading && !this.contracting) {
      const total = realDt * this.speed,
        steps = Math.max(1, Math.ceil(total / 0.025));
      for (let i = 0; i < steps && this.running && !this.upgrading && !this.contracting; i++)
        this.update(total / steps);
    }
    this.draw();
    if (this.running) this.raf = requestAnimationFrame(this.frame);
  };
  movementMultiplier = player.movementMultiplier;
  dash = player.dash;
  hasModule = player.hasModule;
  moduleLevel = player.moduleLevel;
  shoot = weapons.shoot;
  updateDrones = weapons.updateDrones;
  hostileBullet = weapons.hostileBullet;
  pruneDistantEnemies = enemies.pruneDistantEnemies;
  queueWave = enemies.queueWave;
  updateDirector = enemies.updateDirector;
  route = enemies.route;
  buildFlow = enemies.buildFlow;
  updateEnemy = enemies.updateEnemy;
  spawnEnemy = enemies.spawnEnemy;
  updateBoss = boss.updateBoss;
  spawnBoss = boss.spawnBoss;
  hitEnemy = damage.hitEnemy;
  hurt = damage.hurt;
  danger = exploration.danger;
  refreshChunks = exploration.refreshChunks;
  freePosition = exploration.freePosition;
  moveEntity = exploration.moveEntity;
  updateEvents = exploration.updateEvents;
  nearestInteraction = exploration.nearestInteraction;
  startResourceEvent = exploration.startResourceEvent;
  chooseUpgrade = upgrades.chooseUpgrade;
  checkLevel = upgrades.checkLevel;
  chooseContract = contracts.chooseContract;
  closeContract = contracts.closeContract;
  openContract = contracts.openContract;
  updatePickups = supplies.updatePickups;
  nearestExtraction = extraction.nearestExtraction;
  finish = extraction.finish;
  requestExtraction = extraction.requestExtraction;
  updateExtraction = extraction.updateExtraction;
  updateEffects = effects.updateEffects;
  burst = effects.burst;
  float = effects.float;
  notify = effects.notify;
  camera = renderer.camera;
  polygon = renderer.polygon;
  label = renderer.label;
  draw = renderer.draw;
  drawFloor = worldRenderer.drawFloor;
  drawSite = worldRenderer.drawSite;
  drawBossSite = worldRenderer.drawBossSite;
  drawPickup = actorRenderer.drawPickup;
  drawSprite = actorRenderer.drawSprite;
  drawEnemy = actorRenderer.drawEnemy;
  drawPlayer = actorRenderer.drawPlayer;
  drawNavigation = navigationRenderer.drawNavigation;
  drawMinimap = navigationRenderer.drawMinimap;
  targetInfo = navigation.targetInfo;
  tutorialStep = navigation.tutorialStep;
  interactionText = navigation.interactionText;
  emitHud = navigation.emitHud;
  interact = interactions.interact;
  updatePlayerTimers = player.updatePlayerTimers;
  updateBuffTimers = supplies.updateBuffTimers;
  updateMovement = player.updateMovement;
  updateWeapons = weapons.updateWeapons;
  updateEnemies = enemies.updateEnemies;
  updateProjectiles = projectiles.updateProjectiles;
  update = simulation.update;
}
