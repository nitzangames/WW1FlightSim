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

  // ---- TIER 2: Double difficulty ----
  {
    id: 'air_dominance',
    name: 'Air Dominance',
    brief: 'Shoot down 10 enemy fighters.',
    objectives: [{ type: 'kill_planes', target: 10 }],
    spawn: { planes: 3, balloons: 0, zeppelin: false, artillery: 0 },
  },
  {
    id: 'balloon_sweep',
    name: 'Balloon Sweep',
    brief: 'Destroy 5 balloons while fending off escorts.',
    objectives: [{ type: 'kill_balloons', target: 5 }],
    spawn: { planes: 2, balloons: 7, zeppelin: false, artillery: 0 },
  },
  {
    id: 'double_zeppelin',
    name: 'Double Strike',
    brief: 'Take down 2 enemy zeppelins.',
    objectives: [{ type: 'kill_zeppelin', target: 2 }],
    spawn: { planes: 2, balloons: 0, zeppelin: true, artillery: 0 },
  },
  {
    id: 'survive_5min',
    name: 'Endurance',
    brief: 'Survive for 5 minutes against relentless waves.',
    objectives: [{ type: 'survive_time', target: 300 }],
    spawn: { planes: 3, balloons: 0, zeppelin: false, artillery: 3 },
  },
  {
    id: 'ace_gauntlet',
    name: 'Ace Gauntlet',
    brief: 'Defeat 3 enemy aces, one after another.',
    objectives: [{ type: 'kill_ace', target: 3 }],
    spawn: { planes: 0, balloons: 0, zeppelin: false, artillery: 0, ace: true },
  },
  {
    id: 'artillery_storm',
    name: 'Artillery Storm',
    brief: 'Destroy 8 heavily defended artillery batteries.',
    objectives: [{ type: 'kill_artillery', target: 8 }],
    spawn: { planes: 2, balloons: 0, zeppelin: false, artillery: 10 },
  },
  {
    id: 'escort_assault',
    name: 'Escort Under Fire',
    brief: 'Escort the zeppelin while destroying 3 attackers.',
    objectives: [{ type: 'escort', target: 1 }, { type: 'kill_planes', target: 3 }],
    spawn: { planes: 3, balloons: 0, zeppelin: false, artillery: 0, escortZeppelin: true },
  },
  {
    id: 'long_patrol',
    name: 'Long Patrol',
    brief: 'Fly through 10 checkpoints across hostile territory.',
    objectives: [{ type: 'checkpoints', target: 10 }],
    spawn: { planes: 2, balloons: 0, zeppelin: false, artillery: 2 },
  },
  {
    id: 'score_rush',
    name: 'Score Rush',
    brief: 'Score 30 points in under 3 minutes.',
    objectives: [{ type: 'kill_planes', target: 6 }, { type: 'survive_time', target: 0 }],
    spawn: { planes: 3, balloons: 3, zeppelin: false, artillery: 3 },
  },
  {
    id: 'mixed_assault',
    name: 'Mixed Assault',
    brief: 'Destroy 4 fighters, 3 balloons, and 4 artillery.',
    objectives: [
      { type: 'kill_planes', target: 4 },
      { type: 'kill_balloons', target: 3 },
      { type: 'kill_artillery', target: 4 },
    ],
    spawn: { planes: 2, balloons: 5, zeppelin: false, artillery: 6 },
  },

  // ---- TIER 3: Triple difficulty ----
  {
    id: 'air_supremacy',
    name: 'Air Supremacy',
    brief: 'Shoot down 15 fighters. Total air control.',
    objectives: [{ type: 'kill_planes', target: 15 }],
    spawn: { planes: 4, balloons: 0, zeppelin: false, artillery: 0 },
  },
  {
    id: 'total_war',
    name: 'Total War',
    brief: 'Destroy 5 planes, 3 balloons, and the zeppelin.',
    objectives: [
      { type: 'kill_planes', target: 5 },
      { type: 'kill_balloons', target: 3 },
      { type: 'kill_zeppelin', target: 1 },
    ],
    spawn: { planes: 3, balloons: 5, zeppelin: true, artillery: 3 },
  },
  {
    id: 'survive_8min',
    name: 'Iron Will',
    brief: 'Survive 8 minutes of maximum pressure.',
    objectives: [{ type: 'survive_time', target: 480 }],
    spawn: { planes: 4, balloons: 0, zeppelin: false, artillery: 5 },
  },
  {
    id: 'ace_squadron',
    name: 'Ace Squadron',
    brief: 'Defeat an entire squadron of 5 enemy aces.',
    objectives: [{ type: 'kill_ace', target: 5 }],
    spawn: { planes: 0, balloons: 0, zeppelin: false, artillery: 0, ace: true },
  },
  {
    id: 'fortress_run',
    name: 'Fortress Run',
    brief: 'Destroy 12 artillery in a heavily defended zone.',
    objectives: [{ type: 'kill_artillery', target: 12 }],
    spawn: { planes: 3, balloons: 0, zeppelin: false, artillery: 14 },
  },
  {
    id: 'survive_5_waves',
    name: 'Last Stand',
    brief: 'Survive 5 waves of increasingly fierce attackers.',
    objectives: [{ type: 'survive_waves', target: 5 }],
    spawn: { planes: 3, balloons: 0, zeppelin: false, artillery: 4 },
  },
  {
    id: 'speed_patrol',
    name: 'Speed Patrol',
    brief: 'Race through 12 checkpoints under heavy fire.',
    objectives: [{ type: 'checkpoints', target: 12 }],
    spawn: { planes: 3, balloons: 0, zeppelin: false, artillery: 3 },
  },
  {
    id: 'escort_gauntlet',
    name: 'Escort Gauntlet',
    brief: 'Escort the zeppelin through 5 waves of attackers.',
    objectives: [{ type: 'escort', target: 1 }, { type: 'survive_waves', target: 5 }],
    spawn: { planes: 4, balloons: 0, zeppelin: false, artillery: 0, escortZeppelin: true },
  },
  {
    id: 'final_assault',
    name: 'Final Assault',
    brief: 'Destroy everything and return to base alive.',
    objectives: [
      { type: 'kill_planes', target: 8 },
      { type: 'kill_balloons', target: 3 },
      { type: 'kill_zeppelin', target: 1 },
      { type: 'kill_artillery', target: 6 },
      { type: 'return_base' },
    ],
    spawn: { planes: 3, balloons: 5, zeppelin: true, artillery: 8 },
  },
  {
    id: 'red_baron',
    name: "Red Baron's Trial",
    brief: 'The ultimate challenge. Survive 10 minutes against everything.',
    objectives: [{ type: 'survive_time', target: 600 }],
    spawn: { planes: 4, balloons: 3, zeppelin: true, artillery: 6 },
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
        case 'escort': {
          if (this.escortArrived) return 'Escort: ARRIVED';
          const ez = this.escortZep;
          if (ez && ez.alive) {
            const pct = Math.round((ez.hp / ez.maxHp) * 100);
            const d = Math.round(Math.hypot(ez.dest.x - ez.position.x, ez.dest.z - ez.position.z));
            return `Escort HP: ${pct}% — ${d}m`;
          }
          return 'Escort: DESTROYED';
        }
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
