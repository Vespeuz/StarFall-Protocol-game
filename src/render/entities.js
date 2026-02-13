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
  bossSprites,
}) {
  const BOSS_PHASE_TRANSITION_DURATION = 1.05;

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
      const pulse = 0.5 + 0.5 * Math.sin(state.loopTime * pulseSpeed * Math.PI * 2);
      const orbitSpeed = 1.15 + shieldStacks * 0.25;
      const orbitAngle = state.loopTime * orbitSpeed;
      const baseRadius = 28 + shieldStacks * 2;
      const radius = baseRadius + pulse * 3;
      const ringWidth = 2.2 + shieldStacks * 0.5;
      const glowBlur = 8 + shieldStacks * 4;

      const hue = shieldStacks >= 3 ? 190 : shieldStacks === 2 ? 200 : 210;
      const ringColor = `hsla(${hue}, 95%, 72%, ${0.55 + pulse * 0.25})`;
      const coreGlow = `hsla(${hue}, 100%, 70%, ${0.18 + pulse * 0.18})`;
      const arcSpan = Math.PI * (0.95 + shieldStacks * 0.16);

      ctx.save();
      ctx.shadowBlur = glowBlur;
      ctx.shadowColor = ringColor;
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = ringWidth;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, orbitAngle, orbitAngle + arcSpan);
      ctx.stroke();

      // Secondary smooth ring for higher stack readability.
      if (shieldStacks >= 2) {
        ctx.strokeStyle = `hsla(${hue + 12}, 95%, 78%, ${0.32 + pulse * 0.22})`;
        ctx.lineWidth = 1.2 + shieldStacks * 0.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius - 4, -orbitAngle * 1.15, -orbitAngle * 1.15 + Math.PI * 0.9);
        ctx.stroke();
      }

      // Soft inner energy field.
      const energyGradient = ctx.createRadialGradient(p.x, p.y, radius * 0.45, p.x, p.y, radius + 6);
      energyGradient.addColorStop(0, "rgba(120, 220, 255, 0)");
      energyGradient.addColorStop(0.65, coreGlow);
      energyGradient.addColorStop(1, "rgba(120, 220, 255, 0)");
      ctx.fillStyle = energyGradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius + 6, 0, Math.PI * 2);
      ctx.fill();

      // Orbiting smooth energy nodes.
      const nodeCount = shieldStacks + 1;
      for (let i = 0; i < nodeCount; i++) {
        const a = orbitAngle * 1.2 + (i / nodeCount) * Math.PI * 2;
        const nx = p.x + Math.cos(a) * (radius + 1.5);
        const ny = p.y + Math.sin(a) * (radius + 1.5);
        ctx.fillStyle = `hsla(${hue + 20}, 100%, 82%, ${0.65 + pulse * 0.2})`;
        ctx.beginPath();
        ctx.arc(nx, ny, shieldStacks >= 3 ? 2.2 : 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
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

  function resolveBossPhaseKey(layerIndex, layerCount, isEnraged) {
    if (isEnraged) {
      return "phase3";
    }
    if (layerCount <= 0 || layerIndex <= 0) {
      return "phase1";
    }
    return "phase2";
  }

  function resolveBossSpriteImage(phaseKey) {
    const lookupOrder = [phaseKey, "phase2", "phase1"];
    for (const key of lookupOrder) {
      const sprite = bossSprites ? bossSprites[key] : null;
      if (sprite && sprite.isReady) {
        return sprite.image;
      }
    }
    return null;
  }

  function resolveBossVisualProfile(phaseKey, boss) {
    if (phaseKey === "phase3") {
      return {
        scale: 1.45,
        glowColor: "255, 96, 150",
        glowBlur: 24,
        glowAlpha: 0.7,
      };
    }
    if (phaseKey === "phase2") {
      return {
        scale: boss && boss.mutated ? 1.3 : 1.08,
        glowColor: "102, 255, 220",
        glowBlur: boss && boss.mutated ? 18 : 12,
        glowAlpha: boss && boss.mutated ? 0.52 : 0.34,
      };
    }
    return {
      scale: 1,
      glowColor: "150, 220, 255",
      glowBlur: 6,
      glowAlpha: 0.16,
    };
  }

  function drawBossImage({
    image,
    centerX,
    centerY,
    spriteWidth,
    spriteHeight,
    alpha = 1,
    hitFlash = 0,
    glowColor = "0, 0, 0",
    glowBlur = 0,
    glowAlpha = 0,
    surge = 0,
  }) {
    if (!image) {
      return;
    }
    const x = centerX - spriteWidth * 0.5;
    const y = centerY - spriteHeight * 0.5;
    const clampedAlpha = clamp(alpha, 0, 1);
    const clampedHitFlash = clamp(hitFlash, 0, 1);

    ctx.save();
    ctx.globalAlpha = clampedAlpha;
    if (glowBlur > 0 && glowAlpha > 0) {
      ctx.shadowBlur = glowBlur;
      ctx.shadowColor = `rgba(${glowColor}, ${clamp(glowAlpha, 0, 1)})`;
    }
    ctx.drawImage(image, x, y, spriteWidth, spriteHeight);
    if (surge > 0) {
      const clampedSurge = clamp(surge, 0, 1);
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = clampedSurge * 0.42;
      ctx.filter = `brightness(${1 + clampedSurge * 1.6}) saturate(${1 + clampedSurge * 0.9})`;
      ctx.drawImage(image, x, y, spriteWidth, spriteHeight);
      ctx.filter = "none";
      ctx.globalCompositeOperation = "source-over";
    }
    if (clampedHitFlash > 0) {
      // Re-draw the same sprite with a brief screen blend for silhouette-only hit feedback.
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = clampedHitFlash * 0.45;
      ctx.filter = `brightness(${1 + clampedHitFlash * 2.2}) saturate(${1 + clampedHitFlash * 0.6})`;
      ctx.drawImage(image, x, y, spriteWidth, spriteHeight);
      ctx.filter = "none";
      ctx.globalCompositeOperation = "source-over";
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
    const layerCount = Array.isArray(b.layers) ? b.layers.length : 0;
    const currentPhaseKey = resolveBossPhaseKey(b.currentLayer, layerCount, b.enraged);
    const currentProfile = resolveBossVisualProfile(currentPhaseKey, b);
    const currentImage = resolveBossSpriteImage(currentPhaseKey);

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
      const evolvingTargetKey = "phase2";
      const evolvingTargetImage = resolveBossSpriteImage(evolvingTargetKey);
      const evolvingTargetProfile = resolveBossVisualProfile(evolvingTargetKey, {
        ...b,
        mutated: true,
      });
      drawBossImage({
        image: currentImage,
        centerX: b.x,
        centerY: b.y,
        spriteWidth: b.w * currentProfile.scale,
        spriteHeight: b.h * currentProfile.scale,
        alpha: (1 - progress * 0.65) * (b.entranceActive ? b.revealAlpha : 1),
        hitFlash: Math.max(hitFlash, entranceFlicker * 0.4),
        glowColor: currentProfile.glowColor,
        glowBlur: currentProfile.glowBlur,
        glowAlpha: currentProfile.glowAlpha,
        surge: 0.2 + progress * 0.4,
      });
      drawBossImage({
        image: evolvingTargetImage || currentImage,
        centerX: b.x + jitterX,
        centerY: b.y + jitterY,
        spriteWidth: b.w * (evolvingTargetProfile.scale + progress * 0.15),
        spriteHeight: b.h * (evolvingTargetProfile.scale + progress * 0.15),
        alpha: 0.22 + progress * 0.78,
        hitFlash: Math.max(hitFlash, entranceFlicker * 0.4),
        glowColor: evolvingTargetProfile.glowColor,
        glowBlur: evolvingTargetProfile.glowBlur + 4,
        glowAlpha: evolvingTargetProfile.glowAlpha + 0.15,
        surge: 0.45 + progress * 0.45,
      });
    } else if (b.transitionTimer > 0 && b.nextLayer !== null) {
      const nextEnraged = layerCount > 0 && b.nextLayer >= layerCount - 1;
      const nextPhaseKey = resolveBossPhaseKey(b.nextLayer, layerCount, nextEnraged);
      const nextProfile = resolveBossVisualProfile(nextPhaseKey, {
        ...b,
        mutated: b.mutated || b.nextLayer >= 2,
        enraged: nextEnraged,
      });
      const nextImage = resolveBossSpriteImage(nextPhaseKey);
      const transitionProgress = clamp(
        1 - b.transitionTimer / BOSS_PHASE_TRANSITION_DURATION,
        0,
        1
      );
      const transitionPulse = Math.sin(transitionProgress * Math.PI);
      const baseAlpha = b.entranceActive ? b.revealAlpha : 1;

      drawBossImage({
        image: currentImage,
        centerX: b.x,
        centerY: b.y,
        spriteWidth: b.w * currentProfile.scale,
        spriteHeight: b.h * currentProfile.scale,
        alpha: baseAlpha * (1 - transitionProgress * 0.65),
        hitFlash: Math.max(hitFlash, entranceFlicker * 0.45),
        glowColor: currentProfile.glowColor,
        glowBlur: currentProfile.glowBlur,
        glowAlpha: currentProfile.glowAlpha,
        surge: transitionPulse * 0.5,
      });
      drawBossImage({
        image: nextImage || currentImage,
        centerX: b.x + (Math.random() - 0.5) * (1 + transitionPulse * 3),
        centerY: b.y + (Math.random() - 0.5) * (1 + transitionPulse * 3),
        spriteWidth: b.w * nextProfile.scale,
        spriteHeight: b.h * nextProfile.scale,
        alpha: baseAlpha * (0.18 + transitionProgress * 0.82),
        hitFlash: Math.max(hitFlash, entranceFlicker * 0.35),
        glowColor: nextProfile.glowColor,
        glowBlur: nextProfile.glowBlur + 2,
        glowAlpha: nextProfile.glowAlpha + transitionPulse * 0.22,
        surge: 0.35 + transitionPulse * 0.45,
      });
    } else {
      drawBossImage({
        image: currentImage,
        centerX: b.x,
        centerY: b.y,
        spriteWidth: b.w * currentProfile.scale,
        spriteHeight: b.h * currentProfile.scale,
        alpha: b.entranceActive ? b.revealAlpha : 1,
        hitFlash: Math.max(hitFlash, entranceFlicker),
        glowColor: currentProfile.glowColor,
        glowBlur: currentProfile.glowBlur,
        glowAlpha: currentProfile.glowAlpha,
      });
      if (b.entranceActive) {
        const jitter = 1.6 + (1 - b.revealAlpha) * 1.8;
        const ox = (Math.random() - 0.5) * jitter;
        const oy = (Math.random() - 0.5) * jitter;
        drawBossImage({
          image: currentImage,
          centerX: b.x + ox,
          centerY: b.y + oy,
          spriteWidth: b.w * currentProfile.scale,
          spriteHeight: b.h * currentProfile.scale,
          alpha: (1 - b.revealAlpha) * 0.25,
          hitFlash: entranceFlicker * 0.5,
          glowColor: currentProfile.glowColor,
          glowBlur: currentProfile.glowBlur,
          glowAlpha: currentProfile.glowAlpha,
          surge: entranceFlicker * 0.35,
        });
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
