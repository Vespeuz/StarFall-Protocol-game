export function updateBullets(state, dt, { WIDTH, HEIGHT }) {
  for (const b of state.bulletsPlayer) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  for (const b of state.bulletsEnemy) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  state.bulletsPlayer = state.bulletsPlayer.filter(
    (b) => b.y > -40 && b.y < HEIGHT + 40 && b.x > -40 && b.x < WIDTH + 40
  );
  state.bulletsEnemy = state.bulletsEnemy.filter(
    (b) => b.y > -40 && b.y < HEIGHT + 40 && b.x > -40 && b.x < WIDTH + 40
  );
}

export function handleCollisions(state, {
  overlaps,
  getPlayerHitbox,
  consumePlayerHit,
  damageBoss,
  maybeDropPowerup,
  maybeDropWavePowerup,
  onEnemyExplosion,
}) {
  const playerBox = getPlayerHitbox();

  for (let i = state.bulletsEnemy.length - 1; i >= 0; i--) {
    const bullet = state.bulletsEnemy[i];
    if (overlaps(bullet, playerBox)) {
      state.bulletsEnemy.splice(i, 1);
      consumePlayerHit(bullet.damage || 1);
      if (state.mode !== "playing") {
        return;
      }
    }
  }

  for (let i = state.bulletsPlayer.length - 1; i >= 0; i--) {
    const bullet = state.bulletsPlayer[i];
    let hitSomething = false;

    if (state.boss) {
      for (let m = state.bossMinions.length - 1; m >= 0; m--) {
        const minion = state.bossMinions[m];
        if (overlaps(bullet, minion)) {
          minion.hp -= 8;
          hitSomething = true;
          if (minion.hp <= 0) {
            state.bossMinions.splice(m, 1);
            state.score += 150;
            maybeDropPowerup(minion.x, minion.y, state.wave + 2);
          }
          break;
        }
      }
      if (
        !hitSomething &&
        overlaps(bullet, {
          x: state.boss.x,
          y: state.boss.y,
          w: state.boss.w,
          h: state.boss.h,
        })
      ) {
        damageBoss(4);
        hitSomething = true;
      }
    } else {
      for (const enemy of state.enemies) {
        if (!enemy.alive) {
          continue;
        }
        if (overlaps(bullet, enemy)) {
          enemy.alive = false;
          state.score += 100;
          state.waveKillsSinceDrop += 1;
          maybeDropWavePowerup(enemy.x, enemy.y);
          onEnemyExplosion();
          hitSomething = true;
          break;
        }
      }
    }

    if (hitSomething) {
      state.bulletsPlayer.splice(i, 1);
    }
  }

  state.enemies = state.enemies.filter((enemy) => enemy.alive);
}
