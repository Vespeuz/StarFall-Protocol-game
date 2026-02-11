export function createBossAttacksSystem({
  getState,
  clamp,
  overlaps,
  width,
  height,
  pick,
  consumePlayerHit,
  maybeDropPowerup,
}) {
  function spawnHostileProjectile(projectile) {
    const state = getState();
    state.bulletsEnemy.push({
      x: projectile.x,
      y: projectile.y,
      w: projectile.w || 8,
      h: projectile.h || 16,
      vx: projectile.vx || 0,
      vy: projectile.vy || 0,
      damage: projectile.damage || 1,
      source: projectile.source || "boss",
    });
  }

  function shootEnemy(sourceX, sourceY, speedMultiplier) {
    spawnHostileProjectile({
      x: sourceX,
      y: sourceY + 14,
      w: 6,
      h: 16,
      vx: 0,
      vy: 220 * speedMultiplier,
      damage: 1,
      source: "enemy_wave",
    });
  }

  function fireBossSpread(boss, count, arc, speed, damage) {
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const angle = -arc + t * arc * 2;
      spawnHostileProjectile({
        x: boss.x,
        y: boss.y + boss.h * 0.34,
        w: 8,
        h: 18,
        vx: Math.sin(angle) * speed,
        vy: Math.cos(angle) * speed,
        damage,
        source: "boss_spread",
      });
    }
  }

  function fireBossAimedShot(boss, speed, damage, ox = 0) {
    const state = getState();
    const sx = boss.x + ox;
    const sy = boss.y + boss.h * 0.3;
    const dx = state.player.x - sx;
    const dy = state.player.y - sy;
    const length = Math.max(1, Math.hypot(dx, dy));
    spawnHostileProjectile({
      x: sx,
      y: sy,
      w: 9,
      h: 18,
      vx: (dx / length) * speed,
      vy: (dy / length) * speed,
      damage,
      source: "boss_aimed",
    });
  }

  function fireBossMutantLances(boss, speed, damage) {
    const leftX = boss.x - boss.w * 0.34;
    const rightX = boss.x + boss.w * 0.34;
    spawnHostileProjectile({
      x: leftX,
      y: boss.y + boss.h * 0.26,
      w: 10,
      h: 20,
      vx: -speed * 0.24,
      vy: speed,
      damage,
      source: "boss_lance",
    });
    spawnHostileProjectile({
      x: rightX,
      y: boss.y + boss.h * 0.26,
      w: 10,
      h: 20,
      vx: speed * 0.24,
      vy: speed,
      damage,
      source: "boss_lance",
    });
  }

  function fireBossConstrictor(boss, lanes, speed, damage) {
    for (let i = 1; i <= lanes; i++) {
      const x = (width / (lanes + 1)) * i;
      spawnHostileProjectile({
        x,
        y: boss.y + boss.h * 0.22,
        w: 8,
        h: 20,
        vx: 0,
        vy: speed,
        damage,
        source: "boss_constrictor",
      });
    }
  }

  function spawnBossMinion() {
    const state = getState();
    if (!state.boss) {
      return;
    }
    const boss = state.boss;
    state.bossMinions.push({
      x: clamp(
        boss.x + (Math.random() - 0.5) * (boss.w * 0.9),
        32,
        width - 32
      ),
      y: boss.y + boss.h * 0.32,
      w: 26,
      h: 22,
      hp: boss.enraged ? 26 : 18,
      speed: 88 + boss.currentLayer * 16 + (boss.enraged ? 22 : 0),
      shotTimer: 0.75 + Math.random() * 0.45,
      pulse: Math.random() * Math.PI * 2,
    });
  }

  function updateBossMinions(dt, paused) {
    const state = getState();
    for (let i = state.bossMinions.length - 1; i >= 0; i--) {
      const minion = state.bossMinions[i];
      if (!paused) {
        minion.y += minion.speed * dt;
        minion.x += Math.sin(state.loopTime * 3 + minion.pulse) * 18 * dt;
        minion.shotTimer -= dt;
        if (minion.shotTimer <= 0) {
          const dx = state.player.x - minion.x;
          const dy = state.player.y - minion.y;
          const len = Math.max(1, Math.hypot(dx, dy));
          const shotSpeed = 260 + (state.boss && state.boss.enraged ? 80 : 30);
          spawnHostileProjectile({
            x: minion.x,
            y: minion.y + minion.h * 0.3,
            w: 7,
            h: 14,
            vx: (dx / len) * shotSpeed,
            vy: (dy / len) * shotSpeed,
            damage: state.boss && state.boss.enraged ? 2 : 1,
            source: "boss_minion",
          });
          minion.shotTimer =
            0.6 + Math.random() * 0.35 - (state.boss ? state.boss.currentLayer * 0.06 : 0);
        }
      }

      if (minion.y - minion.h / 2 > height + 40 || minion.hp <= 0) {
        state.bossMinions.splice(i, 1);
        continue;
      }

      if (
        overlaps(minion, {
          x: state.player.x,
          y: state.player.y,
          w: state.player.w,
          h: state.player.h,
        })
      ) {
        consumePlayerHit(1);
        state.bossMinions.splice(i, 1);
      }
    }
  }

  function spawnBossBreakParticles(boss, count) {
    for (let i = 0; i < count; i++) {
      boss.particles.push({
        x: boss.x + (Math.random() - 0.5) * boss.w * 0.4,
        y: boss.y + (Math.random() - 0.5) * boss.h * 0.4,
        vx: (Math.random() - 0.5) * 220,
        vy: (Math.random() - 0.5) * 220,
        life: 0.4 + Math.random() * 0.6,
        size: 2 + Math.random() * 3,
        color: pick(["#f6ffff", "#8dffe2", "#66d4ff", "#9f8bff"]),
      });
    }
  }

  function maybeDropBossCombatPowerup(boss, wave, chance = 0.3) {
    if (!boss || Math.random() >= chance) {
      return;
    }
    const dropX = clamp(
      boss.x + (Math.random() - 0.5) * Math.min(220, boss.w * 0.9),
      48,
      width - 48
    );
    const dropY = boss.y + boss.h * 0.35;
    maybeDropPowerup(dropX, dropY, wave + 3);
  }

  return {
    spawnHostileProjectile,
    shootEnemy,
    fireBossSpread,
    fireBossAimedShot,
    fireBossMutantLances,
    fireBossConstrictor,
    spawnBossMinion,
    updateBossMinions,
    spawnBossBreakParticles,
    maybeDropBossCombatPowerup,
  };
}
