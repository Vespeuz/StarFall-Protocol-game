export function runSanityChecks({ enabled = false } = {}) {
  if (!enabled) {
    return;
  }
  const issues = [];
  if (typeof window.render_game_to_text !== "function") {
    issues.push("window.render_game_to_text missing");
  }
  if (typeof window.advanceTime !== "function") {
    issues.push("window.advanceTime missing");
  }
  if (issues.length > 0) {
    console.warn("[SANITY] Refactor sanity checks failed", issues);
    return;
  }
  console.log("[SANITY] Refactor sanity checks passed");
}
