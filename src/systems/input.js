export function createInputState() {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    shoot: false,
  };
}

export function onKeyChange(input, code, down) {
  if (code === "ArrowLeft" || code === "KeyA") {
    input.left = down;
  }
  if (code === "ArrowRight" || code === "KeyD") {
    input.right = down;
  }
  if (code === "ArrowUp" || code === "KeyW") {
    input.up = down;
  }
  if (code === "ArrowDown" || code === "KeyS") {
    input.down = down;
  }
  if (code === "Space") {
    input.shoot = down;
  }
}

export function bindKeyboardListeners({
  getState,
  onContinueYes,
  onContinueNo,
  onRestartFromEnd,
  onGameplayKeyChange,
}) {
  window.addEventListener("keydown", (event) => {
    const state = getState();
    if (state.mode === "continue_prompt") {
      if (event.code === "KeyY" || event.code === "Enter") {
        onContinueYes();
      } else if (event.code === "KeyN" || event.code === "Escape") {
        onContinueNo();
      }
      return;
    }
    if (event.code === "Enter") {
      if (state.mode === "end") {
        onRestartFromEnd();
      }
    }
    if (state.mode === "reveal") {
      return;
    }
    if (state.mode !== "playing") {
      return;
    }
    onGameplayKeyChange(event.code, true);
  });

  window.addEventListener("keyup", (event) => {
    const state = getState();
    if (state.mode !== "playing") {
      return;
    }
    onGameplayKeyChange(event.code, false);
  });
}
