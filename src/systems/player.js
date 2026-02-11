export function createPlayerSystem({
  getState,
  getInput,
  clamp,
  playerHitFx,
  powerupDurationSeconds,
  width,
  onShootSfx,
  onPickupSfx,
  applyPowerup,
  onPlayerDeathInBoss,
  onPlayerDeathInWave,
}) {
  function triggerPlayerDamageFeedback() {
    const state = getState();
    const fx = state.hitFx;
    if (!fx || fx.cooldownTimer > 0) {
      return;
    }
    fx.shakeTimer = playerHitFx.shakeDuration;
    fx.flashTimer = playerHitFx.flashDuration;
    fx.flickerTimer = playerHitFx.flickerDuration;
    fx.cooldownTimer = playerHitFx.retriggerCooldown;
  }

  function shootPlayer() {
    const state = getState();
    const player = state.player;
    const baseCd = 0.28;
    const rapidFactor = player.rapid.active ? 1 + player.rapid.level * 0.7 : 1;
    const cooldown = baseCd / rapidFactor;
    if (player.shotCooldown > 0) {
      return;
    }

    const spreadLevel = player.spread.active ? player.spread.level : 0;
    const bulletSpeed = 520;
    const angles = [0];
    if (spreadLevel >= 1) {
      angles.push(-0.2, 0.2);
    }
    if (spreadLevel >= 2) {
      angles.push(-0.35, 0.35);
    }
    if (spreadLevel >= 3) {
      angles.push(-0.5, 0.5);
    }

    for (const angle of angles) {
      state.bulletsPlayer.push({
        x: player.x,
        y: player.y - player.h * 0.6,
        w: 6,
        h: 16,
        vx: Math.sin(angle) * bulletSpeed,
        vy: -Math.cos(angle) * bulletSpeed,
      });
    }
    player.shotCooldown = cooldown;
    onShootSfx();
  }

  function consumePlayerHit(damage = 1) {
    const state = getState();
    const player = state.player;
    let pendingDamage = Math.max(1, Math.floor(damage));
    while (pendingDamage > 0 && player.shieldHits > 0) {
      player.shieldHits -= 1;
      pendingDamage -= 1;
    }
    if (pendingDamage <= 0) {
      return;
    }
    triggerPlayerDamageFeedback();
    player.lives -= pendingDamage;
    if (player.lives <= 0) {
      if (state.boss && state.mode === "playing") {
        onPlayerDeathInBoss();
      } else {
        onPlayerDeathInWave();
      }
    }
  }

  function applyPowerupToPlayer(type) {
    const state = getState();
    applyPowerup(state, type, {
      clamp,
      powerupDurationSeconds,
      onPickupSfx,
    });
  }

  function updatePlayer(dt) {
    const state = getState();
    const input = getInput();
    const player = state.player;
    player.vx = 0;
    if (input.left) {
      player.vx = -player.speed;
    }
    if (input.right) {
      player.vx = player.speed;
    }
    player.x = clamp(player.x + player.vx * dt, player.w * 0.6, width - player.w * 0.6);

    player.shotCooldown = Math.max(0, player.shotCooldown - dt);
    if (input.shoot) {
      shootPlayer();
    }

    if (player.rapid.active) {
      player.rapid.duration = Math.max(0, player.rapid.duration - dt);
      if (player.rapid.duration <= 0) {
        player.rapid.active = false;
        player.rapid.level = 0;
      }
    }
    if (player.spread.active) {
      player.spread.duration = Math.max(0, player.spread.duration - dt);
      if (player.spread.duration <= 0) {
        player.spread.active = false;
        player.spread.level = 0;
      }
    }
  }

  return {
    triggerPlayerDamageFeedback,
    shootPlayer,
    consumePlayerHit,
    applyPowerupToPlayer,
    updatePlayer,
  };
}
