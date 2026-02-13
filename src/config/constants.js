export const GAME_TITLE = "Starfall Protocol";
export const FRAME_DT = 1 / 60;
export const TOTAL_WAVES = 4;
export const CLASS_HIDDEN = "hidden";
export const CONTINUE_PROMPT_SECONDS = 10;

export const BOSS_LAYER_HP = [120, 130, 150, 170];
export function createBossConfig(width) {
  return {
    startX: width * 0.5,
    startY: 120,
    offscreenY: -170,
    baseW: 225,
    baseH: 336,
    baseSpeed: 130,
    initialShotTimer: 0.9,
    spawnMinionTimer: 3.6,
    retryMinionTimer: 4.2,
    phaseBannerTimer: 1.4,
    entranceDuration: 2.8,
    retryEntranceDuration: 2.25,
    entranceTargetY: 120,
    graceDuration: 1.25,
    initialRevealAlpha: 0.12,
    entranceRevealAlpha: 0.1,
    entranceShotTimer: 0.95,
  };
}

export const WAVE_DROP_PACING = {
  // Slightly lower than legacy pacing, with soft anti-streak control.
  baseChance: 3,
  waveChanceStep: 1.5,
  minChance: 3,
  maxChance: 7,
  minKillsBetweenDropsByWave: [0, 0, 0, 1, 1],
  cooldownSecondsByWave: [0, 0.1, 0.2, 0.3, 0.4],
};

export const PLAYER_HIT_FX = {
  shakeDuration: 0.12,
  shakeAmplitude: 3,
  flashDuration: 0.1,
  flashAlpha: 0.28,
  flickerDuration: 0.16,
  retriggerCooldown: 0.11,
};

export const POWERUP_DURATION_SECONDS = {
  rapid_fire: 10,
  spread_shot: 10,
};

export const BGM_VOLUME_STORAGE_KEY = "space_invader_bgm_volume";
export const SFX_VOLUME_STORAGE_KEY = "space_invader_sfx_volume";
export const DEFAULT_BGM_VOLUME = 0.6;
export const DEFAULT_SFX_VOLUME = 0.7;
