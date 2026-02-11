export function createSceneRenderer({
  ctx,
  getState,
  width,
  height,
  clamp,
  playerHitFx,
  drawBackground,
  drawPowerups,
  drawEnemies,
  drawBoss,
  drawBossDefeatFx,
  drawBossMinions,
  drawBullets,
  drawPlayer,
  drawHud,
  drawRevealOverlay,
}) {
  function render() {
    const state = getState();
    drawBackground();

    if (state.mode === "start") {
      return;
    }

    if (state.mode === "playing" || state.mode === "reveal" || state.mode === "continue_prompt") {
      const boss = state.boss;
      const bossShake =
        boss && (boss.evolving || boss.enraged || boss.layerBreakFxTimer > 0)
          ? Math.max(0, boss.shakeAmount || 0)
          : 0;
      const hitShake =
        state.hitFx && state.hitFx.shakeTimer > 0
          ? playerHitFx.shakeAmplitude * (state.hitFx.shakeTimer / playerHitFx.shakeDuration)
          : 0;
      const shake = Math.min(4, bossShake + hitShake);
      ctx.save();
      if (shake > 0.01) {
        const offsetX = (Math.random() - 0.5) * shake * 2;
        const offsetY = (Math.random() - 0.5) * shake * 2;
        ctx.translate(offsetX, offsetY);
      }
      drawPowerups();
      drawEnemies();
      drawBoss();
      if (state.mode === "reveal") {
        drawBossDefeatFx();
      }
      drawBossMinions();
      drawBullets();
      drawPlayer();
      ctx.restore();

      if (boss && boss.evolving) {
        const flashAlpha = 0.05 + boss.flickerAlpha * 0.48;
        ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
        ctx.fillRect(0, 0, width, height);
      } else if (boss && boss.mutated) {
        ctx.fillStyle = boss.enraged ? "rgba(255,60,132,0.06)" : "rgba(94,255,214,0.04)";
        ctx.fillRect(0, 0, width, height);
      }

      drawHud();

      if (state.hitFx && state.hitFx.flashTimer > 0) {
        const alpha = playerHitFx.flashAlpha * (state.hitFx.flashTimer / playerHitFx.flashDuration);
        ctx.fillStyle = `rgba(255, 82, 82, ${clamp(alpha, 0, 0.4)})`;
        ctx.fillRect(0, 0, width, height);
      }
    }

    if (state.mode === "reveal") {
      drawRevealOverlay();
    }

    if (state.mode === "end") {
      if (state.endReason === "win") {
        drawRevealOverlay();
      }
      drawHud();
    }
  }

  return { render };
}
