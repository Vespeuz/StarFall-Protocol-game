export function createProgressionSystem({
  getState,
  totalWaves,
  updatePlayer,
  updateEnemyWave,
  updateBoss,
  updatePowerups,
  updateBullets,
  handleCollisions,
  onSpawnWave,
  onSpawnBoss,
}) {
  function updatePlaying(dt) {
    const state = getState();
    if (!state.boss) {
      state.waveDropCooldown = Math.max(0, state.waveDropCooldown - dt);
    }
    updatePlayer(dt);
    updateEnemyWave(dt);
    updateBoss(dt);
    updatePowerups(dt);
    updateBullets(dt);
    handleCollisions();

    if (state.mode !== "playing") {
      return;
    }

    if (!state.boss && state.enemies.length === 0) {
      if (state.wave < totalWaves) {
        state.wave += 1;
        onSpawnWave(state.wave);
      } else {
        onSpawnBoss();
      }
    }
  }

  return { updatePlaying };
}
