export const STATE = { MENU: 'menu', PLAYING: 'playing', GAMEOVER: 'gameover' };

export class GameState {
  constructor() {
    this.state = STATE.MENU;
    this.kills = 0;
    this.best = parseInt(localStorage.getItem('ww1.best') || '0', 10) || 0;
    this.gameOverTimer = 0;
  }
  startRun() {
    this.state = STATE.PLAYING;
    this.kills = 0;
    this.gameOverTimer = 0;
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
  }
}
