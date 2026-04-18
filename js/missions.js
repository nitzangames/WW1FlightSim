// Mission definitions + runtime tracking.

export const MISSIONS = [
  {
    id: 'air_superiority',
    name: 'Air Superiority',
    brief: 'Shoot down 5 enemy fighters to secure the skies.',
    difficulty: 1,
    objectives: [{ type: 'kill_planes', target: 5 }],
    spawn: { planes: 2, balloons: 0, zeppelin: false, artillery: 0 },
  },
  {
    id: 'balloon_buster',
    name: 'Balloon Buster',
    brief: 'Destroy 3 enemy observation balloons.',
    difficulty: 1,
    objectives: [{ type: 'kill_balloons', target: 3 }],
    spawn: { planes: 1, balloons: 5, zeppelin: false, artillery: 0 },
  },
  {
    id: 'bombing_run',
    name: 'Bombing Run',
    brief: 'Strafe and destroy 4 enemy artillery batteries.',
    difficulty: 1,
    objectives: [{ type: 'kill_artillery', target: 4 }],
    spawn: { planes: 1, balloons: 0, zeppelin: false, artillery: 6 },
  },
  {
    id: 'survive_3min',
    name: 'Survival',
    brief: 'Stay alive for 3 minutes against endless waves.',
    difficulty: 2,
    objectives: [{ type: 'survive_time', target: 180 }],
    spawn: { planes: 3, balloons: 0, zeppelin: false, artillery: 2 },
  },
  {
    id: 'ace_duel',
    name: 'Ace Duel',
    brief: 'Defeat the enemy ace in a one-on-one dogfight.',
    difficulty: 2,
    objectives: [{ type: 'kill_ace', target: 1 }],
    spawn: { planes: 0, balloons: 0, zeppelin: false, artillery: 0, ace: true },
  },
  {
    id: 'zeppelin_hunt',
    name: 'Zeppelin Hunter',
    brief: 'Take down the enemy zeppelin. Watch for its escorts.',
    difficulty: 2,
    objectives: [{ type: 'kill_zeppelin', target: 1 }],
    spawn: { planes: 2, balloons: 0, zeppelin: true, artillery: 0 },
  },
  {
    id: 'patrol',
    name: 'Patrol Route',
    brief: 'Fly through all patrol checkpoints to secure the area.',
    difficulty: 1,
    objectives: [{ type: 'checkpoints', target: 6 }],
    spawn: { planes: 1, balloons: 0, zeppelin: false, artillery: 0 },
  },
  {
    id: 'survive_waves',
    name: 'Wave Defense',
    brief: 'Survive 3 waves of increasingly fierce attackers.',
    difficulty: 3,
    objectives: [{ type: 'survive_waves', target: 3 }],
    spawn: { planes: 2, balloons: 0, zeppelin: false, artillery: 3 },
  },
  {
    id: 'escort',
    name: 'Escort Duty',
    brief: 'Protect the allied zeppelin as it crosses the valley.',
    difficulty: 3,
    objectives: [{ type: 'escort', target: 1 }],
    spawn: { planes: 3, balloons: 0, zeppelin: false, artillery: 0, escortZeppelin: true },
  },
  {
    id: 'combined_ops',
    name: 'Combined Ops',
    brief: 'Destroy 2 balloons, 3 fighters, and return to base.',
    difficulty: 3,
    objectives: [
      { type: 'kill_balloons', target: 2 },
      { type: 'kill_planes', target: 3 },
      { type: 'return_base' },
    ],
    spawn: { planes: 2, balloons: 4, zeppelin: false, artillery: 2 },
  },
];

// Runtime state for the active mission.
export class MissionState {
  constructor(missionDef) {
    this.def = missionDef;
    this.active = true;
    this.won = false;
    this.failed = false;
    this.elapsed = 0;
    this.progress = {}; // { objectiveIndex: currentValue }
    for (let i = 0; i < missionDef.objectives.length; i++) {
      this.progress[i] = 0;
    }
    // Checkpoints (generated at mission start if needed).
    this.checkpoints = [];
    this.nextCheckpoint = 0;
    // Escort zeppelin ref.
    this.escortZep = null;
    this.escortArrived = false;
  }

  update(dt) {
    if (!this.active) return;
    this.elapsed += dt;
  }

  // Check if all objectives are complete.
  checkWin() {
    if (!this.active || this.failed) return false;
    for (let i = 0; i < this.def.objectives.length; i++) {
      const obj = this.def.objectives[i];
      const val = this.progress[i] || 0;
      if (obj.type === 'survive_time' && this.elapsed < obj.target) return false;
      if (obj.type === 'survive_waves' && val < obj.target) return false;
      if (obj.type === 'kill_planes' && val < obj.target) return false;
      if (obj.type === 'kill_balloons' && val < obj.target) return false;
      if (obj.type === 'kill_zeppelin' && val < obj.target) return false;
      if (obj.type === 'kill_ace' && val < obj.target) return false;
      if (obj.type === 'kill_artillery' && val < obj.target) return false;
      if (obj.type === 'checkpoints' && val < obj.target) return false;
      if (obj.type === 'escort' && !this.escortArrived) return false;
      if (obj.type === 'return_base' && val < 1) return false;
    }
    return true;
  }

  // Track a kill event.
  onKill(type) {
    for (let i = 0; i < this.def.objectives.length; i++) {
      const obj = this.def.objectives[i];
      if (obj.type === 'kill_planes' && type === 'plane') this.progress[i]++;
      if (obj.type === 'kill_balloons' && type === 'balloon') this.progress[i]++;
      if (obj.type === 'kill_zeppelin' && type === 'zeppelin') this.progress[i]++;
      if (obj.type === 'kill_ace' && type === 'ace') this.progress[i]++;
      if (obj.type === 'kill_artillery' && (type === 'artillery')) this.progress[i]++;
    }
  }

  onWaveComplete(waveNum) {
    for (let i = 0; i < this.def.objectives.length; i++) {
      if (this.def.objectives[i].type === 'survive_waves') this.progress[i] = waveNum;
    }
  }

  onCheckpoint() {
    for (let i = 0; i < this.def.objectives.length; i++) {
      if (this.def.objectives[i].type === 'checkpoints') this.progress[i]++;
    }
    this.nextCheckpoint++;
  }

  onReturnBase() {
    for (let i = 0; i < this.def.objectives.length; i++) {
      if (this.def.objectives[i].type === 'return_base') this.progress[i] = 1;
    }
  }

  // Generate objective description strings for HUD.
  getObjectiveStrings() {
    return this.def.objectives.map((obj, i) => {
      const val = this.progress[i] || 0;
      switch (obj.type) {
        case 'kill_planes': return `Fighters: ${val}/${obj.target}`;
        case 'kill_balloons': return `Balloons: ${val}/${obj.target}`;
        case 'kill_zeppelin': return `Zeppelin: ${val ? 'DESTROYED' : 'alive'}`;
        case 'kill_ace': return `Ace: ${val ? 'DEFEATED' : 'alive'}`;
        case 'kill_artillery': return `Artillery: ${val}/${obj.target === 'all' ? '?' : obj.target}`;
        case 'survive_time': {
          const left = Math.max(0, obj.target - this.elapsed);
          const m = Math.floor(left / 60), s = Math.floor(left % 60);
          return `Survive: ${m}:${s.toString().padStart(2, '0')}`;
        }
        case 'survive_waves': return `Waves: ${val}/${obj.target}`;
        case 'checkpoints': return `Checkpoints: ${val}/${obj.target}`;
        case 'escort': return `Escort: ${this.escortArrived ? 'ARRIVED' : 'in progress'}`;
        case 'return_base': return `Return to base: ${val ? 'DONE' : 'pending'}`;
        default: return '';
      }
    });
  }

  // Persistence: which missions are completed.
  static getCompleted() {
    try { return JSON.parse(localStorage.getItem('ww1.missions') || '[]'); } catch (_) { return []; }
  }
  static markCompleted(id) {
    const list = MissionState.getCompleted();
    if (!list.includes(id)) { list.push(id); localStorage.setItem('ww1.missions', JSON.stringify(list)); }
  }
  static isUnlocked(mission, index) {
    if (index === 0) return true; // first mission always unlocked
    // Unlock if the previous mission is completed.
    const completed = MissionState.getCompleted();
    return completed.includes(MISSIONS[index - 1].id);
  }
}
