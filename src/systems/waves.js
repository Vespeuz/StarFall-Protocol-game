export function spawnWave(state, waveNumber, { clamp, TOTAL_WAVES, WAVE_DROP_PACING }) {
  const rows = 2 + waveNumber;
  const cols = 7 + waveNumber;
  const startX = 108;
  const startY = 86;
  const gapX = 72;
  const gapY = 56;
  const waveVisualMap = {
    1: "wave1",
    2: "wave2",
    3: "wave3",
    4: "wave4",
  };
  const visualVariant = waveVisualMap[waveNumber] || "wave4";
  state.enemies = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      state.enemies.push({
        x: startX + col * gapX,
        y: startY + row * gapY,
        w: 34,
        h: 24,
        alive: true,
        visualVariant,
        animPhase: Math.random() * Math.PI * 2,
        shotBias: 0.8 + Math.random() * 0.5,
      });
    }
  }
  state.enemyDir = 1;
  state.enemySpeed = 54 + waveNumber * 16;
  state.enemyShotTimer = Math.max(0.25, 1.15 - waveNumber * 0.17);
  const waveIndex = clamp(Math.floor(waveNumber), 1, TOTAL_WAVES);
  state.waveDropCooldown = 0;
  state.waveKillsSinceDrop = WAVE_DROP_PACING.minKillsBetweenDropsByWave[waveIndex];
}

export function updateEnemyWave(state, dt, { WIDTH, HEIGHT, triggerLoss, shootEnemy, pick }) {
  if (!state.enemies.length) {
    return;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  for (const enemy of state.enemies) {
    if (!enemy.alive) {
      continue;
    }
    enemy.x += state.enemyDir * state.enemySpeed * dt;
    minX = Math.min(minX, enemy.x - enemy.w / 2);
    maxX = Math.max(maxX, enemy.x + enemy.w / 2);
  }

  if (minX <= 40 || maxX >= WIDTH - 40) {
    state.enemyDir *= -1;
    for (const enemy of state.enemies) {
      if (enemy.alive) {
        enemy.y += state.enemyDescend;
      }
    }
  }

  const reachesViewportBottom = state.enemies.some(
    (enemy) => enemy.alive && enemy.y + enemy.h / 2 >= HEIGHT
  );
  if (reachesViewportBottom) {
    triggerLoss();
    return;
  }

  state.enemyShotTimer -= dt;
  if (state.enemyShotTimer <= 0) {
    const alive = state.enemies.filter((enemy) => enemy.alive);
    if (alive.length > 0) {
      const shooter = pick(alive);
      shootEnemy(shooter.x, shooter.y, 1 + state.wave * 0.12);
    }
    state.enemyShotTimer = Math.max(0.22, 1.08 - state.wave * 0.15);
  }
}
