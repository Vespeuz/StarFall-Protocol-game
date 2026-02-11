export function createHudRenderer({
  ctx,
  getState,
  width,
  height,
  totalWaves,
  colorByPower,
  bossLayerColors,
  clamp,
}) {
  function drawHud() {
    const state = getState();
    ctx.fillStyle = "#e8f5ff";
    ctx.font = '18px "Press Start 2P", monospace';
    ctx.textAlign = "left";
    ctx.fillText(`Lives: ${state.player.lives}`, 20, 30);
    ctx.fillText(`Score: ${state.score}`, 20, 56);
    ctx.fillText(`Wave: ${state.boss ? "Boss" : state.wave + "/" + totalWaves}`, 20, 82);

    let x = 20;
    const y = 106;
    const active = [];
    if (state.player.rapid.active) {
      active.push({ key: "rapid_fire", label: `R ${state.player.rapid.level}`, t: state.player.rapid.duration });
    }
    if (state.player.spread.active) {
      active.push({
        key: "spread_shot",
        label: `S ${state.player.spread.level}`,
        t: state.player.spread.duration,
      });
    }
    if (state.player.shieldHits > 0) {
      active.push({ key: "shield", label: `O ${state.player.shieldHits}`, t: 1 });
    }

    for (const item of active) {
      ctx.fillStyle = "rgba(7, 15, 36, 0.8)";
      ctx.fillRect(x, y, 120, 22);
      ctx.strokeStyle = colorByPower[item.key];
      ctx.strokeRect(x, y, 120, 22);
      ctx.fillStyle = colorByPower[item.key];
      ctx.font = '13px "Press Start 2P", monospace';
      ctx.fillText(item.label, x + 8, y + 15);
      if (item.key !== "shield") {
        const widthValue = clamp(item.t / 14, 0, 1) * 56;
        ctx.fillRect(x + 56, y + 8, widthValue, 6);
      }
      x += 128;
    }

    if (!state.boss) {
      return;
    }

    const boss = state.boss;
    const pad = 170;
    const barW = width - pad * 2;
    const barH = 12;
    const overlap = 5;
    const stackBaseY = 18;

    for (let i = boss.layers.length - 1; i >= 0; i--) {
      const yLayer = stackBaseY + (boss.layers.length - 1 - i) * overlap;
      const layer = boss.layers[i];
      const isActive = i === boss.currentLayer;
      const isBroken = i < boss.currentLayer;
      const ratio = isBroken ? 0 : isActive ? clamp(layer.hp / layer.max, 0, 1) : 1;
      const baseAlpha = isBroken ? 0.2 : isActive ? 0.95 : 0.6;
      ctx.fillStyle = `rgba(7, 12, 24, ${0.72 + (1 - baseAlpha) * 0.2})`;
      ctx.fillRect(pad, yLayer, barW, barH);
      ctx.fillStyle = bossLayerColors[i] || "#ff6fa4";
      ctx.globalAlpha = baseAlpha;
      ctx.fillRect(pad, yLayer, barW * ratio, barH);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = isActive ? "#f6ffff" : "rgba(210, 232, 255, 0.45)";
      ctx.strokeRect(pad, yLayer, barW, barH);

      if (isActive && boss.layerBreakFxTimer > 0) {
        const crackAlpha = clamp(boss.layerBreakFxTimer / 1.15, 0, 1) * 0.42;
        ctx.fillStyle = `rgba(255,255,255,${crackAlpha})`;
        ctx.fillRect(pad, yLayer, barW, barH);
        ctx.strokeStyle = `rgba(255,180,214,${crackAlpha})`;
        ctx.beginPath();
        const crackX = pad + barW * (1 - ratio);
        ctx.moveTo(crackX, yLayer - 2);
        ctx.lineTo(crackX + 8, yLayer + barH * 0.35);
        ctx.lineTo(crackX - 6, yLayer + barH + 2);
        ctx.stroke();
      }
    }

    const remainingLayers = boss.layers.length - boss.currentLayer;
    ctx.fillStyle = "#f1fbff";
    ctx.font = '13px "Press Start 2P", monospace';
    ctx.textAlign = "center";
    ctx.fillText(`BOSS LAYERS ${remainingLayers}`, width / 2, 12);

    const markerSize = 10;
    const markerGap = 6;
    const markerStartX = width / 2 - ((markerSize + markerGap) * boss.layers.length - markerGap) * 0.5;
    const markerY = stackBaseY + boss.layers.length * overlap + barH + 8;
    for (let i = 0; i < boss.layers.length; i++) {
      const alive = i >= boss.currentLayer;
      ctx.fillStyle = alive ? bossLayerColors[i] || "#ff6fa4" : "rgba(56,66,92,0.6)";
      ctx.fillRect(markerStartX + i * (markerSize + markerGap), markerY, markerSize, markerSize);
      ctx.strokeStyle = "rgba(220,236,255,0.5)";
      ctx.strokeRect(markerStartX + i * (markerSize + markerGap), markerY, markerSize, markerSize);
    }

    if (boss.phaseBannerTimer > 0) {
      const phaseText = boss.evolving
        ? "EVOLUTION"
        : boss.entranceActive
          ? "THREAT APPROACHING"
          : boss.graceActive
            ? "STABILIZE"
            : boss.enraged
              ? "ENRAGED CORE"
              : `PHASE ${boss.currentLayer + 1}`;
      const alpha = clamp(boss.phaseBannerTimer / 1.4, 0, 1);
      ctx.fillStyle = `rgba(10,15,36,${0.35 + alpha * 0.35})`;
      ctx.fillRect(width / 2 - 180, 76, 360, 26);
      ctx.fillStyle = `rgba(255,244,252,${0.5 + alpha * 0.5})`;
      ctx.font = '14px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.fillText(phaseText, width / 2, 94);
    }

    if (boss.graceActive) {
      ctx.fillStyle = "rgba(186, 228, 255, 0.95)";
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      const remain = Math.max(0, boss.graceTimer).toFixed(1);
      ctx.fillText(`GRACE ${remain}s`, width / 2, 120);
    }
  }

  function drawRevealOverlay() {
    const state = getState();
    if (state.mode !== "reveal" && !(state.mode === "end" && state.endReason === "win")) {
      return;
    }
    const alpha = state.mode === "reveal" ? clamp(0.25 + state.transitionAlpha * 0.55, 0, 0.85) : 0.72;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(0, 0, width, height);

    if (state.revealedClue) {
      ctx.fillStyle = "#111932";
      ctx.font = 'bold 52px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.fillText(state.revealedClue, width / 2, height / 2);
    }
  }

  function drawBossDefeatFx() {
    const state = getState();
    const fx = state.bossDefeatFx;
    if (!fx) {
      return;
    }
    const progress = clamp(fx.timer / Math.max(0.001, fx.duration), 0, 1);
    const coreScale = 1 + progress * 1.15;
    const coreAlpha = (1 - progress) * 0.7;
    if (coreAlpha > 0.01) {
      const rx = fx.w * 0.28 * coreScale;
      const ry = fx.h * 0.22 * coreScale;
      ctx.fillStyle = `rgba(255, 240, 180, ${coreAlpha})`;
      ctx.beginPath();
      ctx.ellipse(fx.x, fx.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 110, 180, ${coreAlpha * 0.55})`;
      ctx.beginPath();
      ctx.ellipse(fx.x, fx.y, rx * 0.58, ry * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of fx.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = clamp(p.life / 1.2, 0, 1);
      ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
      ctx.globalAlpha = 1;
    }
  }

  return {
    drawHud,
    drawRevealOverlay,
    drawBossDefeatFx,
  };
}
