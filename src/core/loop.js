export function createLoopSystem({
  getState,
  refs,
  frameDt,
  clamp,
  updateStars,
  updateHitFeedback,
  updatePlaying,
  updateContinuePrompt,
  updateReveal,
  render,
}) {
  function tick(dt) {
    const state = getState();
    const fixedDt = clamp(dt, 0, 0.033);
    state.loopTime += fixedDt;
    updateStars(fixedDt);
    updateHitFeedback(fixedDt);
    if (state.mode === "playing") {
      updatePlaying(fixedDt);
    } else if (state.mode === "continue_prompt") {
      updateContinuePrompt(fixedDt);
    } else if (state.mode === "reveal") {
      updateReveal(fixedDt);
    }
  }

  function gameLoop(now) {
    if (!gameLoop.lastTime) {
      gameLoop.lastTime = now;
    }
    const dt = (now - gameLoop.lastTime) / 1000;
    gameLoop.lastTime = now;
    if (!refs.deterministicMode) {
      tick(dt);
    }
    render();
    refs.rafId = requestAnimationFrame(gameLoop);
  }

  async function advanceTime(ms) {
    refs.deterministicMode = true;
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i++) {
      tick(frameDt);
    }
    render();
    return Promise.resolve();
  }

  return {
    tick,
    gameLoop,
    advanceTime,
  };
}
