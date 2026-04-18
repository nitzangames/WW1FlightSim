export const STATE = { MENU: 'menu', MISSION_SELECT: 'mission_select', BRIEFING: 'briefing', TAKEOFF: 'takeoff', PLAYING: 'playing', PAUSED: 'paused', GAMEOVER: 'gameover', MISSION_WIN: 'mission_win' };

// Persisted settings (localStorage).
const SETTINGS_KEY = 'ww1.settings';
export function loadSettings() {
  try {
    return { soundOn: true, invertY: false, sensitivity: 1.0,
      ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch (_) { return { soundOn: true, invertY: false, sensitivity: 1.0 }; }
}
export function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (_) { /* ignore */ }
}

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
    this.stateBeforePause = null;
    this.settingsOpen = false;
    this.settings = loadSettings();
    this.mission = null;       // MissionState instance, null for endless mode
    this.missionDef = null;    // mission definition for briefing display
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
    this.showTutorial = !localStorage.getItem('ww1.tutorialSeen');
    this.tutorialTimer = 6; // auto-dismiss after 6s
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

  dismissTutorial() {
    this.showTutorial = false;
    try { localStorage.setItem('ww1.tutorialSeen', '1'); } catch (_) {}
  }

  pause() {
    if (this.state === STATE.PLAYING || this.state === STATE.TAKEOFF) {
      this.stateBeforePause = this.state;
      this.state = STATE.PAUSED;
      this.settingsOpen = false;
    }
  }
  resume() {
    if (this.state === STATE.PAUSED) {
      this.state = this.stateBeforePause || STATE.PLAYING;
      this.settingsOpen = false;
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
