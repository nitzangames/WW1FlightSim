export const VERSION = 'v0.4.1';

export const CANVAS_W = 1080;
export const CANVAS_H = 1920;

export const PLAYER = {
  HP: 100,
  SPEED: 35,             // m/s forward — lazy WW1-pace cruise
  PITCH_RATE_MAX: 0.9,   // rad/s at full joystick
  ROLL_ANGLE_MAX: Math.PI / 3,   // 60 deg
  TURN_GAIN: 0.9,        // yaw rate = sin(roll) * gain
  SMOOTH: 0.1,
};

export const ENEMY = {
  HP: 60,
  SPEED: 40,             // slightly faster than player so they can close
  TURN_CAP: Math.PI * 22 / 180,  // 22 deg/s
  FIRE_CONE_DEG: 10,
  FIRE_RANGE: 320,
  FIRE_INTERVAL: 0.2,    // seconds between enemy shots (slower cadence to match slower pace)
  DAMAGE_PER_HIT: 0.9,
  HIT_CHANCE: 0.55,
  TRACER_SPREAD_DEG: 4,
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
  // Enemies spawn on the far side of the playable map from the player.
  SPAWN_EDGE_MIN: 700,   // meters from world origin — close enough to read on screen
  SPAWN_EDGE_MAX: 1100,
  SPAWN_BEARING_SPREAD: Math.PI / 2.5, // random arc around "opposite" direction (~72°)
  SPAWN_ALT_JITTER: 60,
};
