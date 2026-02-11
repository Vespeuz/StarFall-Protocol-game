export function bindUiControls({
  embarkBtn,
  startBtn,
  restartBtn,
  continueYesBtn,
  continueNoBtn,
  startPageEmbarkBtn,
  startPageStartBtn,
  onEmbark,
  onStart,
  onRestart,
  onContinueYes,
  onContinueNo,
}) {
  if (embarkBtn) {
    embarkBtn.addEventListener("click", onEmbark);
  }

  if (startBtn) {
    startBtn.addEventListener("click", onStart);
  }

  if (restartBtn) {
    restartBtn.addEventListener("click", onRestart);
  }

  if (continueYesBtn) {
    continueYesBtn.addEventListener("click", onContinueYes);
  }

  if (continueNoBtn) {
    continueNoBtn.addEventListener("click", onContinueNo);
  }

  if (startPageEmbarkBtn && embarkBtn) {
    startPageEmbarkBtn.addEventListener("click", () => {
      embarkBtn.click();
    });
  }

  if (startPageStartBtn && startBtn) {
    startPageStartBtn.addEventListener("click", () => {
      startBtn.click();
    });
  }
}
