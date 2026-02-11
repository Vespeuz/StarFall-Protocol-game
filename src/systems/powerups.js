export function maybeDropPowerup(state, x, y, waveHint, { clamp, pick }) {
  const baseChance = 0.14;
  const scaledChance = clamp(baseChance + waveHint * 0.018, 0.14, 0.34);
  if (Math.random() > scaledChance) {
    return;
  }
  const type = pick(["rapid_fire", "shield", "spread_shot"]);
  state.powerups.push({
    x,
    y,
    w: 24,
    h: 24,
    vy: 82,
    type,
  });
}

export function maybeDropWavePowerup(state, x, y, {
  clamp,
  TOTAL_WAVES,
  WAVE_DROP_PACING,
  maybeDropPowerupFn,
}) {
  if (state.boss || state.mode !== "playing") {
    return;
  }
  const waveIndex = clamp(Math.floor(state.wave), 1, TOTAL_WAVES);
  if (state.waveDropCooldown > 0) {
    return;
  }
  const minKills = WAVE_DROP_PACING.minKillsBetweenDropsByWave[waveIndex];
  if (state.waveKillsSinceDrop < minKills) {
    return;
  }
  const chance = clamp(
    WAVE_DROP_PACING.baseChance + waveIndex * WAVE_DROP_PACING.waveChanceStep,
    WAVE_DROP_PACING.minChance,
    WAVE_DROP_PACING.maxChance
  );
  if (Math.random() > chance) {
    return;
  }
  maybeDropPowerupFn(x, y, waveIndex);
  state.waveDropCooldown = WAVE_DROP_PACING.cooldownSecondsByWave[waveIndex];
  state.waveKillsSinceDrop = 0;
}

export function applyPowerup(state, type, {
  clamp,
  POWERUP_DURATION_SECONDS,
  onPickupSfx,
}) {
  const player = state.player;
  if (type === "rapid_fire") {
    player.rapid.active = true;
    player.rapid.duration += POWERUP_DURATION_SECONDS.rapid_fire;
    player.rapid.level = clamp(player.rapid.level + 1, 1, 3);
  } else if (type === "spread_shot") {
    player.spread.active = true;
    player.spread.duration += POWERUP_DURATION_SECONDS.spread_shot;
    player.spread.level = clamp(player.spread.level + 1, 1, 3);
  } else if (type === "shield") {
    player.shieldHits += 2;
  }
  onPickupSfx();
}

export function updatePowerups(state, dt, {
  HEIGHT,
  overlaps,
  getPlayerHitbox,
  applyPowerupFn,
}) {
  for (const p of state.powerups) {
    p.y += p.vy * dt;
  }
  state.powerups = state.powerups.filter((p) => p.y < HEIGHT + 40);

  for (let i = state.powerups.length - 1; i >= 0; i--) {
    const p = state.powerups[i];
    if (overlaps(p, getPlayerHitbox())) {
      state.powerups.splice(i, 1);
      applyPowerupFn(p.type);
    }
  }
}
