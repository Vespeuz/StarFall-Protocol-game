export function createEntityRenderer({
  ctx,
  getState,
  width,
  clamp,
  playerShipSprite,
  enemyWaveArt,
  eliteMinionSprite,
  colorByPower,
  iconByPower,
  playerSpriteImage,
  isPlayerSpriteReady,
  powerupSprites,
  bossSpriteImage,
  isBossSpriteReady,
}) {
  function drawPlayer() {
    const state = getState();
    const p = state.player;
    const flickerAlpha =
      state.hitFx && state.hitFx.flickerTimer > 0
        ? Math.sin(state.loopTime * 90) > 0
          ? 0.28
          : 1
        : 1;
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = flickerAlpha;
    if (p.shieldHits > 0) {
      const shieldStacks = Math.max(1, Math.min(3, p.shieldHits));
      const pulseSpeed = 1.1 + shieldStacks * 0.45;
      const pulsePhase = (Math.sin(state.loopTime * pulseSpeed * Math.PI * 2) + 1) * 0.5;
      const coreColor = shieldStacks >= 3 ? "#93f8ff" : shieldStacks === 2 ? "#78ecff" : "#5fdfff";
      const accentColor = shieldStacks >= 3 ? "#d9ffff" : "#aef8ff";
      const radiusX = 30 + shieldStacks * 2 + (pulsePhase > 0.55 ? 1 : 0);
      const radiusY = 22 + shieldStacks * 2 + (pulsePhase > 0.55 ? 1 : 0);
      const ringSegments = shieldStacks >= 3 ? 20 : shieldStacks === 2 ? 16 : 12;
      const rotation = state.loopTime * (1.2 + shieldStacks * 0.2);

      // Circular pixel ring that wraps the ship silhouette (no box/bounds overlays).
      ctx.fillStyle = coreColor;
      for (let i = 0; i < ringSegments; i++) {
        const angle = rotation + (i / ringSegments) * Math.PI * 2;
        const x = Math.round(p.x + Math.cos(angle) * radiusX);
        const y = Math.round(p.y + Math.sin(angle) * radiusY);
        const segSize = shieldStacks >= 3 && i % 5 === 0 ? 2 : 1;
        ctx.fillRect(x, y, segSize, segSize);
      }

      // Secondary circular ring for 2+ stacks to increase readable energy.
      if (shieldStacks >= 2) {
        const innerSegments = shieldStacks >= 3 ? 14 : 10;
        const innerRadiusX = radiusX - 4;
        const innerRadiusY = radiusY - 4;
        ctx.fillStyle = shieldStacks >= 3 ? "#6eeeff" : "#57d3ff";
        for (let i = 0; i < innerSegments; i++) {
          const angle = -rotation * 1.15 + (i / innerSegments) * Math.PI * 2;
          const x = Math.round(p.x + Math.cos(angle) * innerRadiusX);
          const y = Math.round(p.y + Math.sin(angle) * innerRadiusY);
          ctx.fillRect(x, y, 1, 1);
        }
      }

      // Orbiting spark accents that circle the ship and reinforce protection feel.
      const sparkCount = shieldStacks + 1;
      const sparkOrbitX = radiusX + 2;
      const sparkOrbitY = radiusY + 2;
      ctx.fillStyle = accentColor;
      for (let i = 0; i < sparkCount; i++) {
        const angle = state.loopTime * (1.7 + shieldStacks * 0.35) + (i / sparkCount) * Math.PI * 2;
        const sx = Math.round(p.x + Math.cos(angle) * sparkOrbitX);
        const sy = Math.round(p.y + Math.sin(angle) * sparkOrbitY);
        const sparkSize = shieldStacks >= 3 && i % 2 === 0 ? 2 : 1;
        ctx.fillRect(sx, sy, sparkSize, sparkSize);
      }
    }

    const spriteW = 42;
    const spriteH = 30;
    const ox = p.x - spriteW * 0.5;
    const oy = p.y - spriteH * 0.5;

    if (isPlayerSpriteReady()) {
      ctx.drawImage(playerSpriteImage, ox, oy, spriteW, spriteH);
      if (state.hitFx && state.hitFx.flickerTimer > 0) {
        // Sprite-only hit flash using the same silhouette-preserving blend approach as the boss.
        const pulse = Math.sin(state.loopTime * 90) > 0 ? 0.36 : 0.16;
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = pulse;
        ctx.filter = "brightness(1.9) saturate(1.2)";
        ctx.drawImage(playerSpriteImage, ox, oy, spriteW, spriteH);
        ctx.filter = "none";
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.globalAlpha = prevAlpha;
      return;
    }

    const pattern = playerShipSprite.pattern;
    const rows = pattern.length;
    const cols = pattern[0].length;
    const pixelSize = 3;
    for (let py = 0; py < rows; py++) {
      const row = pattern[py];
      for (let px = 0; px < cols; px++) {
        const token = row[px];
        if (token === ".") {
          continue;
        }
        const color = playerShipSprite.colors[token];
        if (!color) {
          continue;
        }
        ctx.fillStyle = color;
        ctx.fillRect(ox + px * pixelSize, oy + py * pixelSize, pixelSize, pixelSize);
      }
    }
    ctx.globalAlpha = prevAlpha;
  }

  function drawEnemies() {
    const state = getState();
    function drawEnemySprite(enemy) {
      const sprite = enemyWaveArt[enemy.visualVariant] || enemyWaveArt.wave1;
      const pattern = sprite.pattern;
      const rows = pattern.length;
      const cols = pattern[0].length;
      const pixelSize = 2;
      const spriteW = cols * pixelSize;
      const spriteH = rows * pixelSize;
      const bob = Math.sin(state.loopTime * 6 + enemy.animPhase) * 1.2;
      const ox = enemy.x - spriteW * 0.5;
      const oy = enemy.y - spriteH * 0.5 + bob;

      for (let py = 0; py < rows; py++) {
        const row = pattern[py];
        for (let px = 0; px < cols; px++) {
          const token = row[px];
          if (token === ".") {
            continue;
          }
          const color = sprite.colors[token];
          if (!color) {
            continue;
          }
          ctx.fillStyle = color;
          ctx.fillRect(ox + px * pixelSize, oy + py * pixelSize, pixelSize, pixelSize);
        }
      }
    }

    for (const enemy of state.enemies) {
      drawEnemySprite(enemy);
    }
  }

  function drawPixelSprite(sprite, centerX, centerY, pixelSize, alpha = 1) {
    const pattern = sprite.pattern;
    const rows = pattern.length;
    const cols = pattern[0].length;
    const spriteW = cols * pixelSize;
    const spriteH = rows * pixelSize;
    const ox = centerX - spriteW * 0.5;
    const oy = centerY - spriteH * 0.5;
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = clamp(alpha, 0, 1);
    for (let py = 0; py < rows; py++) {
      const row = pattern[py];
      for (let px = 0; px < cols; px++) {
        const token = row[px];
        if (token === ".") {
          continue;
        }
        const color = sprite.colors[token];
        if (!color) {
          continue;
        }
        ctx.fillStyle = color;
        ctx.fillRect(ox + px * pixelSize, oy + py * pixelSize, pixelSize, pixelSize);
      }
    }
    ctx.globalAlpha = prevAlpha;
  }

  function drawBossImage(centerX, centerY, spriteWidth, spriteHeight, alpha = 1, hitFlash = 0) {
    if (!isBossSpriteReady()) {
      return;
    }
    const x = centerX - spriteWidth * 0.5;
    const y = centerY - spriteHeight * 0.5;
    const clampedAlpha = clamp(alpha, 0, 1);
    const clampedHitFlash = clamp(hitFlash, 0, 1);

    ctx.save();
    ctx.globalAlpha = clampedAlpha;
    ctx.drawImage(bossSpriteImage, x, y, spriteWidth, spriteHeight);
    if (clampedHitFlash > 0) {
      // Re-draw the same sprite with a brief screen blend for silhouette-only hit feedback.
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = clampedHitFlash * 0.45;
      ctx.filter = `brightness(${1 + clampedHitFlash * 2.2}) saturate(${1 + clampedHitFlash * 0.6})`;
      ctx.drawImage(bossSpriteImage, x, y, spriteWidth, spriteHeight);
      ctx.filter = "none";
    }
    ctx.restore();
  }

  function drawBoss() {
    const state = getState();
    if (!state.boss) {
      return;
    }
    const b = state.boss;
    const hitFlash = clamp(b.flashTimer / 0.14, 0, 1);

    const entranceFlicker = b.entranceActive
      ? clamp(0.35 + Math.sin(state.loopTime * 18) * 0.2 + (1 - b.revealAlpha) * 0.35, 0.08, 0.95)
      : 0;

    if (b.windupTimer > 0 && b.windupDuration > 0) {
      const ratio = clamp(b.windupTimer / b.windupDuration, 0, 1);
      const cueColor =
        b.windupType === "enraged"
          ? "255, 92, 148"
          : b.windupType === "mutant"
            ? "112, 255, 218"
            : "174, 220, 255";
      ctx.strokeStyle = `rgba(${cueColor}, ${0.25 + (1 - ratio) * 0.45})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(
        b.x,
        b.y + b.h * 0.12,
        b.w * (0.25 + (1 - ratio) * 0.25),
        b.h * (0.12 + (1 - ratio) * 0.08),
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    if (b.shieldTimer > 0) {
      const shieldPulse = 0.55 + Math.sin(state.loopTime * 24) * 0.2;
      ctx.strokeStyle = `rgba(147, 228, 255, ${shieldPulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.w * 0.38, b.h * 0.34, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (b.evolving) {
      const progress = clamp(b.mutationProgress, 0, 1);
      const jitterX = (Math.random() - 0.5) * (3 + progress * 4);
      const jitterY = (Math.random() - 0.5) * (3 + progress * 4);
      const evolvingScale = 1 + progress * 0.45;
      drawBossImage(
        b.x,
        b.y,
        b.w,
        b.h,
        (1 - progress * 0.65) * (b.entranceActive ? b.revealAlpha : 1),
        Math.max(hitFlash, entranceFlicker * 0.4)
      );
      drawBossImage(
        b.x + jitterX,
        b.y + jitterY,
        b.w * evolvingScale,
        b.h * evolvingScale,
        0.22 + progress * 0.78,
        Math.max(hitFlash, entranceFlicker * 0.4)
      );
    } else if (b.mutated) {
      const mutatedScale = b.enraged ? 1.45 : 1.3;
      drawBossImage(
        b.x,
        b.y,
        b.w * mutatedScale,
        b.h * mutatedScale,
        b.entranceActive ? b.revealAlpha : 1,
        Math.max(hitFlash, entranceFlicker * 0.35)
      );
    } else {
      drawBossImage(
        b.x,
        b.y,
        b.w,
        b.h,
        b.entranceActive ? b.revealAlpha : 1,
        Math.max(hitFlash, entranceFlicker)
      );
      if (b.entranceActive) {
        const jitter = 1.6 + (1 - b.revealAlpha) * 1.8;
        const ox = (Math.random() - 0.5) * jitter;
        const oy = (Math.random() - 0.5) * jitter;
        drawBossImage(
          b.x + ox,
          b.y + oy,
          b.w,
          b.h,
          (1 - b.revealAlpha) * 0.25,
          entranceFlicker * 0.5
        );
      }
    }

    for (const particle of b.particles) {
      ctx.fillStyle = particle.color;
      ctx.fillRect(
        particle.x - particle.size * 0.5,
        particle.y - particle.size * 0.5,
        particle.size,
        particle.size
      );
    }
  }

  function drawBossMinions() {
    const state = getState();
    for (const minion of state.bossMinions) {
      const pulse = Math.sin(state.loopTime * 10 + minion.pulse);
      const pixelSize = pulse > 0 ? 4 : 3;
      drawPixelSprite(eliteMinionSprite, minion.x, minion.y, pixelSize, 1);
      if (state.boss && state.boss.enraged) {
        ctx.strokeStyle = "rgba(255, 138, 188, 0.45)";
        ctx.strokeRect(
          minion.x - minion.w * 0.5 - 2,
          minion.y - minion.h * 0.5 - 2,
          minion.w + 4,
          minion.h + 4
        );
      }
    }
  }

  function drawBullets() {
    const state = getState();
    const hasRapid = Boolean(state.player.rapid.active);
    const hasSpread = Boolean(state.player.spread.active);
    const hasShield = state.player.shieldHits > 0;
    const activeCount = (hasRapid ? 1 : 0) + (hasSpread ? 1 : 0) + (hasShield ? 1 : 0);

    let playerBulletColor = "#9aa3b2";
    if (activeCount === 1) {
      if (hasRapid) {
        playerBulletColor = "#3be46d";
      } else if (hasSpread) {
        playerBulletColor = "#ff9a2f";
      } else {
        playerBulletColor = "#4ea8ff";
      }
    } else if (activeCount === 2) {
      if (hasRapid && hasSpread) {
        playerBulletColor = "#c9e63f";
      } else if (hasRapid && hasShield) {
        playerBulletColor = "#36d6d8";
      } else {
        playerBulletColor = "#c24dff";
      }
    } else if (activeCount === 3) {
      const hue = (state.loopTime * 180) % 360;
      playerBulletColor = `hsl(${hue}, 95%, 62%)`;
    }

    ctx.fillStyle = playerBulletColor;
    if (activeCount > 0) {
      ctx.shadowBlur = activeCount === 3 ? 14 : 10;
      ctx.shadowColor = playerBulletColor;
    } else {
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
    }
    for (const bullet of state.bulletsPlayer) {
      ctx.fillRect(bullet.x - bullet.w / 2, bullet.y - bullet.h / 2, bullet.w, bullet.h);
    }
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";

    ctx.fillStyle = "#ffac58";
    for (const bullet of state.bulletsEnemy) {
      ctx.fillRect(bullet.x - bullet.w / 2, bullet.y - bullet.h / 2, bullet.w, bullet.h);
    }
  }

  function drawPowerups() {
    const state = getState();
    for (const p of state.powerups) {
      const sprite = powerupSprites ? powerupSprites[p.type] : null;
      if (sprite && sprite.isReady) {
        ctx.drawImage(sprite.image, p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
        continue;
      }
      ctx.fillStyle = colorByPower[p.type];
      ctx.fillRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
      ctx.fillStyle = "#102033";
      ctx.font = 'bold 16px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.fillText(iconByPower[p.type], p.x, p.y + 5);
    }
  }

  return {
    drawPlayer,
    drawEnemies,
    drawBoss,
    drawBossMinions,
    drawBullets,
    drawPowerups,
  };
}
