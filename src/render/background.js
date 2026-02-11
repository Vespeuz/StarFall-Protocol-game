export function drawBossFightBackground({ ctx, width, height, state }) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#1a0708");
  gradient.addColorStop(0.45, "#3a140f");
  gradient.addColorStop(1, "#120406");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const coreGlow = ctx.createRadialGradient(width * 0.5, height * 0.42, 18, width * 0.5, height * 0.42, width * 0.7);
  coreGlow.addColorStop(0, "rgba(214, 124, 72, 0.16)");
  coreGlow.addColorStop(0.5, "rgba(162, 68, 36, 0.08)");
  coreGlow.addColorStop(1, "rgba(118, 38, 24, 0)");
  ctx.fillStyle = coreGlow;
  ctx.fillRect(0, 0, width, height);

  const centerX = width * 0.5;
  const centerY = height * 0.48;
  const streakCount = 36;
  for (let i = 0; i < streakCount; i++) {
    const lane = i / streakCount;
    const angle = -0.88 + lane * 1.76;
    const cycle = (state.loopTime * 1.25 + lane * 0.91) % 1;
    const depth = cycle * cycle;
    const inner = 44 + depth * 220;
    const outer = inner + 22 + depth * 230;
    const streakWidth = 1 + depth * 2.6;
    const alpha = 0.08 + depth * 0.22;
    const x1 = centerX + Math.sin(angle) * inner;
    const y1 = centerY + Math.cos(angle) * inner;
    const x2 = centerX + Math.sin(angle) * outer;
    const y2 = centerY + Math.cos(angle) * outer;
    ctx.strokeStyle = `rgba(215, ${Math.round(72 + depth * 58)}, ${Math.round(36 + depth * 16)}, ${alpha})`;
    ctx.lineWidth = streakWidth;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  const trailCount = 20;
  for (let i = 0; i < trailCount; i++) {
    const lane = i / trailCount;
    const x = lane * width;
    const cycle = (state.loopTime * 380 + i * 48) % (height + 140);
    const y = cycle - 70;
    const len = 28 + ((i * 17) % 40);
    ctx.fillStyle = `rgba(212, ${96 + ((i * 13) % 52)}, 62, 0.13)`;
    ctx.fillRect(x - 1, y, 2, len);
  }

  const emberCount = 26;
  for (let i = 0; i < emberCount; i++) {
    const lane = (i * 53.7) % width;
    const cycle = (state.loopTime * (120 + (i % 6) * 18) + i * 22) % (height + 60);
    const y = cycle - 30;
    const size = 1 + (i % 3);
    const alpha = 0.22 + ((i % 5) * 0.05);
    ctx.fillStyle = `rgba(226, ${110 + (i % 4) * 20}, 64, ${alpha})`;
    ctx.fillRect(lane, y, size, size);
  }

  const boss = state.boss;
  if (!boss) {
    return;
  }
  if (boss.entranceActive) {
    const t = 1 - boss.entranceTimer / Math.max(0.001, boss.entranceDuration);
    const pulse = 0.05 + Math.sin(state.loopTime * 5) * 0.03;
    ctx.fillStyle = `rgba(188, 104, 72, ${0.05 + pulse + (1 - t) * 0.07})`;
    ctx.fillRect(0, 0, width, height);
  } else if (boss.graceActive) {
    const glow = 0.05 + Math.sin(state.loopTime * 10) * 0.02;
    ctx.fillStyle = `rgba(206, 134, 86, ${glow})`;
    ctx.fillRect(0, 0, width, height);
  } else if (boss.evolving) {
    ctx.fillStyle = `rgba(184, 62, 96, ${0.08 + boss.flickerAlpha * 0.2})`;
    ctx.fillRect(0, 0, width, height);
  } else if (boss.enraged) {
    ctx.fillStyle = "rgba(128, 30, 30, 0.1)";
    ctx.fillRect(0, 0, width, height);
  } else if (boss.mutated) {
    ctx.fillStyle = "rgba(142, 66, 34, 0.08)";
    ctx.fillRect(0, 0, width, height);
  }
}

export function drawBackgroundLayer({ ctx, width, height, state, starField }) {
  if (state.boss) {
    drawBossFightBackground({ ctx, width, height, state });
    return;
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#04071d");
  gradient.addColorStop(1, "#0c1033");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  for (const star of starField) {
    ctx.fillStyle = `rgba(188, 225, 255, ${0.45 + (star.r % 1) * 0.5})`;
    ctx.fillRect(star.x, star.y, star.r, star.r);
  }
}
