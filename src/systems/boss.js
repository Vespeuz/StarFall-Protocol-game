export function createBossSystem({
  getState,
  width,
  height,
  bossConfig,
  bossLayerHp,
  clamp,
  pick,
  newPlayer,
  attacks,
  maybeDropPowerup,
  bgm,
  onBossDefeatSfx,
  onLossFallback,
}) {
  function applyBossScale(boss, scaleMultiplier) {
    const safeScale = Math.max(0.01, scaleMultiplier);
    boss.scaleMultiplier = safeScale;
    boss.w = bossConfig.baseW * safeScale;
    boss.h = bossConfig.baseH * safeScale;
  }

  function snapshotBossPhaseStart(boss) {
    if (!boss) {
      return;
    }
    const layer = boss.layers[boss.currentLayer];
    boss.phaseStartSnapshot = {
      layerIndex: boss.currentLayer,
      layerHp: layer ? layer.max : 0,
      x: bossConfig.startX,
      y: bossConfig.startY,
      dir: 1,
      shotTimer: boss.currentLayer <= 1 ? 0.68 : 0.86,
      minionSpawnTimer: boss.enraged ? 2.8 : 3.8,
      mutated: boss.mutated,
      enraged: boss.enraged,
    };
  }

  function resetBossTransientState(boss, options = {}) {
    const state = getState();
    const { resetAttackCycle = false, resetBurstInterval = false } = options;
    boss.invulnerable = false;
    boss.transitionTimer = 0;
    boss.layerBreakFxTimer = 0;
    boss.flashTimer = 0;
    boss.shieldTimer = 0;
    boss.counterPunishTimer = 0;
    if (resetAttackCycle) {
      boss.attackCycle = 0;
    }
    boss.burstShots = 0;
    if (resetBurstInterval) {
      boss.burstInterval = 0;
    }
    boss.burstTimer = 0;
    boss.windupTimer = 0;
    boss.windupType = null;
    boss.windupDuration = 0;
    boss.pendingAttack = null;
    boss.attackLockTimer = 0;
    boss.particles = [];
    state.bossMinions = [];
    state.bulletsEnemy = [];
  }

  function resetBossToInitialPhase(boss) {
    if (!boss) {
      return;
    }
    boss.currentLayer = 0;
    boss.nextLayer = null;
    for (let i = 0; i < boss.layers.length; i++) {
      boss.layers[i].hp = boss.layers[i].max;
    }
    boss.mutated = false;
    boss.enraged = false;
    boss.evolving = false;
    boss.evolutionTimer = 0;
    boss.evolutionDuration = 0;
    boss.mutationProgress = 0;
    resetBossTransientState(boss, { resetAttackCycle: true, resetBurstInterval: true });
    applyBossScale(boss, 1);
    boss.speed = bossConfig.baseSpeed;
    boss.dir = 1;
    boss.shotTimer = bossConfig.initialShotTimer;
    boss.minionSpawnTimer = bossConfig.retryMinionTimer;
    boss.phaseBannerTimer = bossConfig.phaseBannerTimer;
    snapshotBossPhaseStart(boss);
  }

  function beginBossEntrance(boss, isRetry) {
    const state = getState();
    if (!boss) {
      return;
    }
    boss.entranceActive = true;
    boss.entranceDuration = isRetry ? bossConfig.retryEntranceDuration : bossConfig.entranceDuration;
    boss.entranceTimer = boss.entranceDuration;
    boss.entranceTargetY = bossConfig.entranceTargetY;
    boss.graceActive = false;
    boss.graceTimer = 0;
    boss.graceDuration = bossConfig.graceDuration;
    boss.revealAlpha = bossConfig.entranceRevealAlpha;
    boss.invulnerable = true;
    boss.x = bossConfig.startX;
    boss.y = -Math.max(Math.abs(bossConfig.offscreenY), boss.h * 1.2);
    boss.shotTimer = bossConfig.entranceShotTimer;
    boss.pendingAttack = null;
    boss.windupTimer = 0;
    boss.attackLockTimer = 0;
    boss.burstShots = 0;
    state.bulletsEnemy = [];
    state.bossMinions = [];
    boss.phaseBannerTimer = 1.45;
  }

  function spawnBoss() {
    const state = getState();
    bgm.play("boss", { fadeMs: 140 });
    state.boss = {
      x: bossConfig.startX,
      y: bossConfig.offscreenY,
      w: bossConfig.baseW,
      h: bossConfig.baseH,
      scaleMultiplier: 1,
      speed: bossConfig.baseSpeed,
      dir: 1,
      shotTimer: bossConfig.initialShotTimer,
      layers: bossLayerHp.map((hp) => ({ max: hp, hp })),
      currentLayer: 0,
      nextLayer: null,
      evolutionLayerIndex: 2,
      evolving: false,
      evolutionTimer: 0,
      evolutionDuration: 0,
      mutationProgress: 0,
      mutated: false,
      enraged: false,
      invulnerable: false,
      transitionTimer: 0,
      layerBreakFxTimer: 0,
      flashTimer: 0,
      phaseBannerTimer: 1.2,
      shakeAmount: 0,
      flickerTimer: 0,
      flickerAlpha: 0,
      shieldTimer: 0,
      counterPunishTimer: 0,
      attackCycle: 0,
      burstShots: 0,
      burstInterval: 0,
      burstTimer: 0,
      windupTimer: 0,
      windupType: null,
      windupDuration: 0,
      pendingAttack: null,
      attackLockTimer: 0,
      minionSpawnTimer: bossConfig.spawnMinionTimer,
      particles: [],
      phaseStartSnapshot: null,
      entranceActive: true,
      entranceTimer: bossConfig.entranceDuration,
      entranceDuration: bossConfig.entranceDuration,
      entranceTargetY: bossConfig.entranceTargetY,
      graceActive: false,
      graceTimer: 0,
      graceDuration: bossConfig.graceDuration,
      revealAlpha: bossConfig.initialRevealAlpha,
    };
    state.bossMinions = [];
    state.bulletsEnemy = [];
    snapshotBossPhaseStart(state.boss);
    beginBossEntrance(state.boss, false);
  }

  function respawnAtBossCheckpoint() {
    const state = getState();
    if (!state.boss || state.mode !== "playing") {
      onLossFallback();
      return;
    }
    state.player = newPlayer(width, height);
    state.player.x = bossConfig.startX;
    state.player.y = height - 56;
    state.bulletsPlayer = [];
    state.bulletsEnemy = [];
    state.powerups = [];
    resetBossToInitialPhase(state.boss);
    beginBossEntrance(state.boss, true);
  }

  function triggerBossDefeat() {
    const state = getState();
    const defeatedBoss = state.boss;
    state.mode = "reveal";
    state.revealTimer = 0;
    state.transitionAlpha = 0;
    if (defeatedBoss) {
      const particleCount = 36;
      const particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: defeatedBoss.x + (Math.random() - 0.5) * defeatedBoss.w * 0.42,
          y: defeatedBoss.y + (Math.random() - 0.5) * defeatedBoss.h * 0.36,
          vx: (Math.random() - 0.5) * 260,
          vy: -90 - Math.random() * 250,
          size: 3 + Math.random() * 4,
          life: 0.9 + Math.random() * 0.5,
          color: pick(["#ffffff", "#9ef7ff", "#ff8cb8", "#ffd26f"]),
        });
      }
      state.bossDefeatFx = {
        x: defeatedBoss.x,
        y: defeatedBoss.y,
        w: defeatedBoss.w,
        h: defeatedBoss.h,
        timer: 0,
        duration: 1.35,
        completed: false,
        particles,
      };
    } else {
      state.bossDefeatFx = null;
    }
    state.boss = null;
    state.bulletsEnemy = [];
    state.bulletsPlayer = [];
    state.powerups = [];
    state.bossMinions = [];
    bgm.play("end", { fadeMs: 220 });
    onBossDefeatSfx();
  }

  function beginBossEvolution(boss) {
    const state = getState();
    boss.evolving = true;
    boss.evolutionDuration = 2.8;
    boss.evolutionTimer = 2.8;
    boss.transitionTimer = 2.8;
    boss.mutationProgress = 0;
    boss.invulnerable = true;
    boss.flickerTimer = 0;
    boss.flickerAlpha = 0;
    boss.shakeAmount = 0;
    state.bulletsEnemy = [];
    state.bossMinions = [];
    attacks.spawnBossBreakParticles(boss, 42);
  }

  function completeBossEvolution(boss) {
    boss.evolving = false;
    boss.mutated = true;
    boss.mutationProgress = 1;
    boss.transitionTimer = 0;
    boss.invulnerable = false;
    if (boss.nextLayer !== null) {
      boss.currentLayer = boss.nextLayer;
      boss.nextLayer = null;
    }
    applyBossScale(boss, 1.35);
    boss.speed += 36;
    boss.phaseBannerTimer = 1.3;
    boss.shotTimer = 0.2;
    attacks.fireBossMutantLances(boss, 320, 1);
    attacks.spawnBossBreakParticles(boss, 34);
    if (boss.currentLayer >= boss.layers.length - 1) {
      boss.enraged = true;
    }
    snapshotBossPhaseStart(boss);
  }

  function handleBossLayerBreak(boss) {
    const state = getState();
    boss.layerBreakFxTimer = 1.15;
    boss.flashTimer = 0.18;
    boss.phaseBannerTimer = 1.2;
    attacks.spawnBossBreakParticles(boss, 32);
    maybeDropPowerup(boss.x - 26, boss.y + 18, state.wave + 3);
    maybeDropPowerup(boss.x + 26, boss.y + 18, state.wave + 3);
    state.score += 400;

    if (boss.currentLayer >= boss.layers.length - 1) {
      triggerBossDefeat();
      return;
    }

    boss.nextLayer = boss.currentLayer + 1;
    boss.invulnerable = true;
    if (boss.nextLayer === boss.evolutionLayerIndex && !boss.mutated) {
      beginBossEvolution(boss);
    } else {
      boss.transitionTimer = 1.05;
    }
  }

  function damageBoss(rawDamage) {
    const state = getState();
    const boss = state.boss;
    if (!boss) {
      return false;
    }
    if (boss.evolving || boss.transitionTimer > 0 || boss.invulnerable) {
      return false;
    }
    if (boss.shieldTimer > 0) {
      if (boss.counterPunishTimer <= 0) {
        attacks.fireBossAimedShot(boss, 360 + (boss.enraged ? 90 : 0), boss.enraged ? 2 : 1);
        boss.counterPunishTimer = 0.2;
      }
      return false;
    }

    const layer = boss.layers[boss.currentLayer];
    const damage = rawDamage * (boss.enraged ? 1.45 : 1);
    layer.hp = Math.max(0, layer.hp - damage);
    boss.flashTimer = 0.14;

    if (layer.hp <= 0) {
      handleBossLayerBreak(boss);
    }
    return true;
  }

  function updateBoss(dt) {
    const state = getState();
    if (!state.boss) {
      return;
    }
    const boss = state.boss;
    for (let i = boss.particles.length - 1; i >= 0; i--) {
      const particle = boss.particles[i];
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.97;
      particle.vy *= 0.97;
      if (particle.life <= 0) {
        boss.particles.splice(i, 1);
      }
    }

    boss.layerBreakFxTimer = Math.max(0, boss.layerBreakFxTimer - dt);
    boss.flashTimer = Math.max(0, boss.flashTimer - dt);
    boss.shieldTimer = Math.max(0, boss.shieldTimer - dt);
    boss.counterPunishTimer = Math.max(0, boss.counterPunishTimer - dt);
    boss.phaseBannerTimer = Math.max(0, boss.phaseBannerTimer - dt);
    boss.attackLockTimer = Math.max(0, boss.attackLockTimer - dt);

    if (boss.entranceActive) {
      boss.entranceTimer = Math.max(0, boss.entranceTimer - dt);
      const progress = 1 - boss.entranceTimer / Math.max(0.001, boss.entranceDuration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const startY = -Math.max(170, boss.h * 1.2);
      boss.y = startY + (boss.entranceTargetY - startY) * eased;
      boss.x = width * 0.5 + Math.sin(state.loopTime * 1.5) * 8 * (1 - progress);
      boss.shakeAmount = 0.45 + (1 - progress) * 0.55;
      boss.revealAlpha = clamp(0.08 + progress * 0.92, 0.08, 1);
      attacks.updateBossMinions(dt, true);
      if (boss.entranceTimer <= 0) {
        boss.entranceActive = false;
        boss.graceActive = true;
        boss.graceTimer = boss.graceDuration;
        boss.shakeAmount = 0.35;
        state.bulletsEnemy = [];
      }
      return;
    }

    if (boss.graceActive) {
      boss.graceTimer = Math.max(0, boss.graceTimer - dt);
      boss.invulnerable = false;
      boss.shakeAmount = 0.15 + Math.sin(state.loopTime * 8) * 0.08;
      attacks.updateBossMinions(dt, true);
      if (boss.graceTimer <= 0) {
        boss.graceActive = false;
        boss.shotTimer = Math.max(0.75, boss.shotTimer);
        boss.shakeAmount = 0;
      }
      return;
    }

    boss.invulnerable = false;

    if (boss.evolving) {
      boss.evolutionTimer = Math.max(0, boss.evolutionTimer - dt);
      boss.mutationProgress =
        1 - boss.evolutionTimer / Math.max(0.001, boss.evolutionDuration);
      boss.shakeAmount = 2 + boss.mutationProgress * 4;
      boss.flickerTimer -= dt;
      if (boss.flickerTimer <= 0) {
        boss.flickerTimer = 0.05 + Math.random() * 0.22;
        boss.flickerAlpha = 0.1 + Math.random() * 0.22;
      }
      boss.x += Math.sin(state.loopTime * 7) * 18 * dt;
      boss.x = clamp(boss.x, boss.w * 0.55, width - boss.w * 0.55);
      attacks.updateBossMinions(dt, true);
      if (boss.evolutionTimer <= 0) {
        completeBossEvolution(boss);
      }
      return;
    }

    if (boss.transitionTimer > 0) {
      boss.transitionTimer = Math.max(0, boss.transitionTimer - dt);
      attacks.updateBossMinions(dt, true);
      if (boss.transitionTimer <= 0) {
        if (boss.nextLayer !== null) {
          boss.currentLayer = boss.nextLayer;
          boss.nextLayer = null;
        }
        boss.invulnerable = false;
        if (boss.currentLayer >= boss.layers.length - 1) {
          boss.enraged = true;
          boss.phaseBannerTimer = 1.4;
          boss.shakeAmount = 1.5;
        }
        boss.shotTimer = 0.74 - boss.currentLayer * 0.06;
        snapshotBossPhaseStart(boss);
      }
      return;
    }

    const phase = boss.currentLayer;
    const baseSpeeds = [132, 162, 194, 225];
    let moveSpeed = baseSpeeds[phase] || 225;
    if (boss.mutated) {
      moveSpeed += 24;
    }
    if (boss.enraged) {
      moveSpeed += 40;
      boss.shakeAmount = 1.1 + Math.sin(state.loopTime * 8) * 0.35;
    } else {
      boss.shakeAmount = 0;
    }

    boss.x += boss.dir * moveSpeed * dt;
    if (boss.mutated) {
      boss.y = 120 + Math.sin(state.loopTime * (boss.enraged ? 4.5 : 2.8)) * 12;
    } else {
      boss.y = 120;
    }
    if (boss.x - boss.w / 2 <= 70 || boss.x + boss.w / 2 >= width - 70) {
      boss.dir *= -1;
    }

    boss.burstTimer -= dt;
    if (boss.burstShots > 0 && boss.burstTimer <= 0) {
      const damage = boss.enraged ? 2 : 1;
      attacks.fireBossSpread(
        boss,
        boss.enraged ? 6 : 5,
        boss.enraged ? 0.56 : 0.42,
        boss.enraged ? 320 : 285,
        damage
      );
      boss.burstShots -= 1;
      boss.burstTimer = boss.burstInterval + (boss.enraged ? 0.03 : 0.05);
      boss.attackLockTimer = Math.max(boss.attackLockTimer, 0.08);
      attacks.maybeDropBossCombatPowerup(boss, state.wave, boss.enraged ? 0.025 : 0.016);
      if (boss.burstShots <= 0 && phase >= 2) {
        boss.shieldTimer = boss.enraged ? 0.42 : 0.3;
        boss.shotTimer = Math.max(boss.shotTimer, boss.enraged ? 0.46 : 0.56);
      }
      return;
    }

    if (boss.windupTimer > 0) {
      boss.windupTimer = Math.max(0, boss.windupTimer - dt);
      if (boss.windupTimer <= 0 && boss.pendingAttack) {
        const fire = boss.pendingAttack;
        boss.pendingAttack = null;
        fire();
        attacks.maybeDropBossCombatPowerup(boss, state.wave, phase >= 2 ? 0.055 : 0.034);
      }
      return;
    }

    if (boss.attackLockTimer > 0) {
      return;
    }

    boss.shotTimer -= dt;
    if (boss.shotTimer <= 0) {
      boss.attackCycle += 1;
      const damage = boss.enraged ? 2 : 1;
      if (phase === 0) {
        boss.windupType = "spread";
        boss.windupDuration = 0.22;
        boss.windupTimer = boss.windupDuration;
        boss.pendingAttack = () => {
          attacks.fireBossSpread(boss, 3, 0.2, 235, damage);
          boss.shotTimer = 0.9;
          boss.attackLockTimer = 0.12;
        };
      } else if (phase === 1) {
        boss.windupType = "mixed";
        boss.windupDuration = 0.28;
        boss.windupTimer = boss.windupDuration;
        boss.pendingAttack = () => {
          attacks.fireBossSpread(boss, 4, 0.34, 270, damage);
          if (boss.attackCycle % 4 === 0) {
            attacks.fireBossAimedShot(boss, 315, damage);
          }
          boss.shotTimer = 0.82;
          boss.attackLockTimer = 0.16;
        };
      } else if (phase === 2) {
        boss.windupType = "mutant";
        boss.windupDuration = 0.34;
        boss.windupTimer = boss.windupDuration;
        boss.pendingAttack = () => {
          if (boss.attackCycle % 2 === 0) {
            attacks.fireBossMutantLances(boss, 295, damage);
            attacks.fireBossSpread(boss, 5, 0.45, 300, damage);
            boss.shieldTimer = 0.28;
          } else {
            attacks.fireBossConstrictor(boss, 2, 255, damage);
            boss.burstShots = 2;
            boss.burstInterval = 0.16;
            boss.burstTimer = 0.05;
          }
          boss.shotTimer = 0.92;
          boss.attackLockTimer = 0.22;
        };
      } else {
        boss.windupType = "enraged";
        boss.windupDuration = 0.36;
        boss.windupTimer = boss.windupDuration;
        boss.pendingAttack = () => {
          if (boss.attackCycle % 2 === 0) {
            attacks.fireBossMutantLances(boss, 330, damage);
            attacks.fireBossSpread(boss, 6, 0.52, 325, damage);
            boss.shieldTimer = 0.36;
          } else {
            attacks.fireBossAimedShot(boss, 355, damage);
            boss.burstShots = 2;
            boss.burstInterval = 0.14;
            boss.burstTimer = 0.05;
          }
          boss.shotTimer = 0.76;
          boss.attackLockTimer = 0.28;
        };
      }
    }

    if (phase >= 2) {
      const minionCap = boss.enraged ? 2 : 1;
      boss.minionSpawnTimer -= dt;
      if (boss.minionSpawnTimer <= 0 && state.bossMinions.length < minionCap) {
        attacks.spawnBossMinion();
        boss.minionSpawnTimer = boss.enraged ? 4.8 : 6.2;
      }
    }
    attacks.updateBossMinions(dt, false);

    if (boss.mutated && Math.random() < dt * 10) {
      boss.particles.push({
        x: boss.x + (Math.random() - 0.5) * boss.w * 0.6,
        y: boss.y + (Math.random() - 0.5) * boss.h * 0.6,
        vx: (Math.random() - 0.5) * 38,
        vy: -20 - Math.random() * 46,
        life: 0.35 + Math.random() * 0.35,
        size: 2 + Math.random() * 2,
        color: boss.enraged ? "#ff6da9" : "#74ffe2",
      });
    }
  }

  return {
    spawnBoss,
    respawnAtBossCheckpoint,
    triggerBossDefeat,
    damageBoss,
    updateBoss,
  };
}
