export const VERSION = 'v0.0.20';

export const CANVAS_W = 1080;
export const CANVAS_H = 1920;

export const PLAYER = {
  HP: 100,
  SPEED: 80,             // m/s forward
  PITCH_RATE_MAX: 1.4,   // rad/s at full joystick
  ROLL_ANGLE_MAX: Math.PI / 3,   // 60 deg
  TURN_GAIN: 1.2,        // yaw rate = sin(roll) * gain
  SMOOTH: 0.1,
};

export const ENEMY = {
  HP: 60,
  SPEED: 75,
  TURN_CAP: Math.PI * 40 / 180,  // 40 deg/s for chaser
  FIRE_CONE_DEG: 12,
  FIRE_RANGE: 350,
  DPS: 10,
};

export const GUN = {
  RPM: 600,
  DAMAGE_PER_ROUND: 2,
  CONE_DEG: 15,
  RANGE: 400,
};

export const WORLD = {
  GROUND_Y: -200,
  GROUND_SIZE: 6000,
  FOG_NEAR: 800,
  FOG_FAR: 2400,
  RETURN_SOFT: 1800,
  RETURN_HARD: 2400,
};

export const SPAWN = {
  START_COUNT: 2,
  CAP_COUNT: 4,
  KILLS_PER_RAMP: 5,
  SPAWN_MIN_DIST: 900,
  SPAWN_MAX_DIST: 1400,
  SPAWN_ALT_JITTER: 100,
};
