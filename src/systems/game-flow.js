export function createGameFlowSystem({
  getState,
  setState,
  makeState,
  width,
  height,
  continuePromptSeconds,
  newPlayer,
  hidePanels,
  showEndPanel,
  showStartPanel,
  showContinuePromptPanel,
  hideContinuePrompt,
  continueCountdown,
  clearInput,
  bgm,
  ensureAudio,
  onSpawnWave,
  onRespawnBossCheckpoint,
}) {
  function startGame() {
    ensureAudio();
    bgm.play("wave", { fadeMs: 280 });
    const nextState = makeState(width, height);
    nextState.mode = "playing";
    setState(nextState);
    onSpawnWave(nextState.wave);
    hidePanels();
  }

  function triggerLoss(options = {}) {
    const state = getState();
    const shouldPlayGameOver = options.playGameOver === true;
    state.mode = "end";
    state.endReason = "lose";
    state.bulletsEnemy = [];
    state.bulletsPlayer = [];
    state.powerups = [];
    state.bossMinions = [];
    if (shouldPlayGameOver) {
      bgm.play("game_over", { fadeMs: 160 });
    } else {
      bgm.stop({ fadeMs: 220 });
    }
    showEndPanel();
  }

  function showContinuePrompt(options = {}) {
    const state = getState();
    const shouldPlayGameOver = options.playGameOver === true;
    if (!state.boss || state.mode !== "playing") {
      triggerLoss();
      return;
    }
    state.mode = "continue_prompt";
    state.continueTimer = continuePromptSeconds;
    clearInput();
    state.bulletsEnemy = [];
    state.bulletsPlayer = [];
    showContinuePromptPanel();
    if (continueCountdown) {
      continueCountdown.textContent = String(continuePromptSeconds);
    }
    if (shouldPlayGameOver) {
      bgm.play("game_over", { fadeMs: 160 });
    } else {
      bgm.stop({ fadeMs: 180 });
    }
  }

  async function chooseContinueYes() {
    const state = getState();
    if (state.mode !== "continue_prompt") {
      return;
    }
    hideContinuePrompt();
    state.mode = "playing";
    state.continueTimer = 0;
    await bgm.stop({ fadeMs: 0 });
    onRespawnBossCheckpoint();
    await bgm.play("boss", { fadeMs: 0 });
  }

  async function chooseContinueNo() {
    const state = getState();
    if (state.mode !== "continue_prompt") {
      return;
    }
    hideContinuePrompt();
    state.continueTimer = 0;
    await bgm.stop({ fadeMs: 120 });
    restart();
  }

  function restart() {
    const nextState = makeState(width, height);
    nextState.mode = "start";
    setState(nextState);
    showStartPanel();
  }

  return {
    startGame,
    triggerLoss,
    showContinuePrompt,
    chooseContinueYes,
    chooseContinueNo,
    restart,
  };
}
