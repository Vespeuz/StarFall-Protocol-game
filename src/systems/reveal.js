export function updateReveal(state, dt, { clamp, composeFinalClue, showEndPanel }) {
  state.revealTimer += dt;
  state.transitionAlpha = clamp(state.transitionAlpha + dt * 0.6, 0, 1);
  if (state.bossDefeatFx && !state.bossDefeatFx.completed) {
    const fx = state.bossDefeatFx;
    fx.timer = Math.min(fx.duration, fx.timer + dt);
    for (let i = fx.particles.length - 1; i >= 0; i--) {
      const p = fx.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 360 * dt;
      p.vx *= 0.985;
      p.vy *= 0.985;
      if (p.life <= 0) {
        fx.particles.splice(i, 1);
      }
    }
    if (fx.timer >= fx.duration && fx.particles.length === 0) {
      fx.completed = true;
    }
  }
  const bossFxReady = !state.bossDefeatFx || state.bossDefeatFx.completed;
  if (!state.revealedClue && bossFxReady) {
    state.revealedClue = composeFinalClue();
  }
  if (state.revealedClue && state.revealTimer > 4.6) {
    state.mode = "end";
    state.endReason = "win";
    showEndPanel();
  }
}

export function updateContinuePrompt(state, dt, { continueCountdown, chooseContinueNo }) {
  state.continueTimer = Math.max(0, state.continueTimer - dt);
  if (continueCountdown) {
    continueCountdown.textContent = String(Math.ceil(state.continueTimer));
  }
  if (state.continueTimer <= 0) {
    void chooseContinueNo();
  }
}
