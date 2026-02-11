export function createScreenController({
  setHidden,
  elements,
  getState,
}) {
  const {
    startScreen,
    endScreen,
    continueScreen,
    startBtn,
    embarkBtn,
    startPageEmbarkWrap,
    startPageStartWrap,
    endTitle,
    endMessage,
  } = elements;

  function hidePanels() {
    setHidden(startScreen, true);
    setHidden(endScreen, true);
    setHidden(continueScreen, true);
  }

  function lockStartFlow() {
    startBtn.disabled = true;
    startBtn.classList.add("hidden");
    embarkBtn.disabled = false;
    embarkBtn.classList.remove("hidden");
    syncStartPagePlayState();
  }

  function unlockStartFlow() {
    startBtn.disabled = false;
    startBtn.classList.remove("hidden");
    embarkBtn.disabled = true;
    embarkBtn.classList.add("hidden");
    syncStartPagePlayState();
  }

  function showStartPanel() {
    setHidden(startScreen, false);
    setHidden(endScreen, true);
    setHidden(continueScreen, true);
    lockStartFlow();
  }

  function showEndPanel() {
    const state = getState();
    setHidden(startScreen, true);
    setHidden(endScreen, false);
    setHidden(continueScreen, true);
    if (state.endReason === "win") {
      endTitle.textContent = "Mission Complete";
      endMessage.textContent = `Final clue: ${state.revealedClue}`;
    } else {
      endTitle.textContent = "Mission Failed";
      endMessage.textContent = "The invasion reached your sector.";
    }
  }

  function hideContinuePrompt() {
    setHidden(continueScreen, true);
  }

  function showContinuePromptPanel() {
    setHidden(continueScreen, false);
  }

  function syncStartPagePlayState() {
    if (!startPageEmbarkWrap || !startPageStartWrap) {
      return;
    }
    const readyToStart = !startBtn.disabled;
    startPageEmbarkWrap.classList.toggle("hidden", readyToStart);
    startPageStartWrap.classList.toggle("hidden", !readyToStart);
  }

  return {
    hidePanels,
    lockStartFlow,
    unlockStartFlow,
    showStartPanel,
    showEndPanel,
    hideContinuePrompt,
    showContinuePromptPanel,
    syncStartPagePlayState,
  };
}
