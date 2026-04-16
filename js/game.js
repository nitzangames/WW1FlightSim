export const STATE = { MENU: 'menu', TAKEOFF: 'takeoff', PLAYING: 'playing', GAMEOVER: 'gameover' };

const RANKS = [
  { min: 0,  title: 'Cadet' },
  { min: 2,  title: 'Pilot' },
  { min: 5,  title: 'Lieutenant' },
  { min: 10, title: 'Captain' },
  { min: 15, title: 'Flight Commander' },
  { min: 20, title: 'Ace' },
  { min: 30, title: 'Double Ace' },
  { min: 50, title: 'Red Baron' },
];

export class GameState {
  constructor() {
    this.state = STATE.MENU;
    this.kills = 0;
    this.planeKills = 0;
    this.balloonKills = 0;
    this.zeppelinKills = 0;
    this.best = parseInt(localStorage.getItem('ww1.best') || '0', 10) || 0;
    this.gameOverTimer = 0;
    this.wave = 1;
    this.waveFlash = 0; // countdown timer for wave announcement
    this.ammo = 200;
    this.maxAmmo = 200;
    this.reloading = false;
    this.reloadTimer = 0;
    this.reloadDuration = 2.5; // seconds to reload
  }

  startRun() {
    this.state = STATE.TAKEOFF;
    this.takeoffTime = 0;
    this.kills = 0;
    this.planeKills = 0;
    this.balloonKills = 0;
    this.zeppelinKills = 0;
    this.gameOverTimer = 0;
    this.wave = 1;
    this.waveFlash = 0;
    this.ammo = this.maxAmmo;
    this.reloading = false;
    this.reloadTimer = 0;
  }

  die() {
    this.state = STATE.GAMEOVER;
    this.gameOverTimer = 2.0;
    if (this.kills > this.best) {
      this.best = this.kills;
      localStorage.setItem('ww1.best', String(this.best));
    }
  }

  reset() {
    this.kills = 0;
    this.planeKills = 0;
    this.balloonKills = 0;
    this.zeppelinKills = 0;
  }

  get rank() {
    let r = RANKS[0].title;
    for (const rank of RANKS) {
      if (this.kills >= rank.min) r = rank.title;
    }
    return r;
  }

  // Call each frame while playing. Returns true if a new wave just triggered.
  updateWave(dt) {
    this.waveFlash = Math.max(0, this.waveFlash - dt);
    // Wave ramps at 5, 10 kills (matching SPAWN.KILLS_PER_RAMP).
    const newWave = 1 + Math.floor(this.kills / 5);
    if (newWave > this.wave) {
      this.wave = newWave;
      this.waveFlash = 2.5; // show announcement for 2.5s
      return true;
    }
    return false;
  }

  // Returns true if we can fire, consuming 1 round. False if out/reloading.
  tryFire() {
    if (this.reloading || this.ammo <= 0) return false;
    this.ammo--;
    if (this.ammo <= 0) {
      this.reloading = true;
      this.reloadTimer = this.reloadDuration;
    }
    return true;
  }

  updateReload(dt) {
    if (!this.reloading) return;
    this.reloadTimer -= dt;
    if (this.reloadTimer <= 0) {
      this.reloading = false;
      this.ammo = this.maxAmmo;
    }
  }
}
