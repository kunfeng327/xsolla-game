/** Kenney CC0 assets. Provenance: docs/ASSETS.md. */
import barrelSprite from '../../assets/kenney/barrel.png?inline';
import bossSprite from '../../assets/kenney/boss.png?inline';
import playerReloadSprite from '../../assets/kenney/playerReload.png?inline';
import {
  default as chestSprite,
  default as crateSprite,
} from '../../assets/kenney/crate.png?inline';
import engineerSprite from '../../assets/kenney/engineer.png?inline';
import engineerIdleSprite from '../../assets/kenney/engineerIdle.png?inline';
import lobberSprite from '../../assets/kenney/lobber.png?inline';
import normalSprite from '../../assets/kenney/normal.png?inline';
import normalIdleSprite from '../../assets/kenney/normalIdle.png?inline';
import playerSprite from '../../assets/kenney/player.png?inline';
import playerIdleSprite from '../../assets/kenney/playerIdle.png?inline';
import rockSprite from '../../assets/kenney/rock.png?inline';
import shooterSprite from '../../assets/kenney/shooter.png?inline';
import shooterIdleSprite from '../../assets/kenney/shooterIdle.png?inline';
import teleporterSprite from '../../assets/kenney/teleporter.png?inline';
export const SPRITE_ANGLE = 0;
export const ART: Record<string, string> = {
  player: playerSprite,
  engineer: engineerSprite,
  normal: normalSprite,
  shooter: shooterSprite,
  lobber: lobberSprite,
  teleporter: teleporterSprite,
  boss: bossSprite,
  chest: chestSprite,
  crate: crateSprite,
  barrel: barrelSprite,
  rock: rockSprite,
  playerIdle: playerIdleSprite,
  playerReload: playerReloadSprite,
  engineerIdle: engineerIdleSprite,
  normalIdle: normalIdleSprite,
  shooterIdle: shooterIdleSprite,
};
