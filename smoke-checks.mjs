import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const gamePath = path.join(root, "game.js");
const indexPath = path.join(root, "index.html");
const gameSource = fs.readFileSync(gamePath, "utf8");
const indexSource = fs.readFileSync(indexPath, "utf8");

function assertMatch(source, regex, message) {
  assert(regex.test(source), message);
}

// Start/Embark handler wiring should keep the same bridge flow.
assertMatch(
  gameSource,
  /startPageEmbarkBtn\.addEventListener\("click",\s*\(\)\s*=>\s*{\s*embarkBtn\.click\(\);\s*}\s*\)/s,
  "Embark UI bridge is not wired to the original Embark handler trigger."
);
assertMatch(
  gameSource,
  /startPageStartBtn\.addEventListener\("click",\s*\(\)\s*=>\s*{\s*startBtn\.click\(\);\s*}\s*\)/s,
  "Start UI bridge is not wired to the original Start handler trigger."
);

// Continue prompt must remain boss-only and preserve music/reset semantics.
assertMatch(
  gameSource,
  /if \(state\.boss && state\.mode === "playing"\)\s*{\s*showContinuePrompt\(\{ playGameOver: true \}\);\s*}\s*else\s*{\s*triggerLoss\(\{ playGameOver: true \}\);\s*}/s,
  "Boss-only continue prompt condition changed."
);
assertMatch(
  gameSource,
  /async function chooseContinueYes\(\)\s*{[\s\S]*await bgm\.stop\(\{ fadeMs: 0 \}\);[\s\S]*respawnAtBossCheckpoint\(\);[\s\S]*await bgm\.play\("boss", \{ fadeMs: 0 \}\);/s,
  "Continue Yes no longer resets and restarts boss music + checkpoint in-order."
);
assertMatch(
  gameSource,
  /async function chooseContinueNo\(\)\s*{[\s\S]*await bgm\.stop\(\{ fadeMs: 120 \}\);[\s\S]*restart\(\);/s,
  "Continue No no longer stops boss music before returning to start."
);
assertMatch(
  gameSource,
  /function respawnAtBossCheckpoint\(\)\s*{[\s\S]*resetBossToInitialPhase\(state\.boss\);[\s\S]*beginBossEntrance\(state\.boss, true\);/s,
  "Boss respawn reset/entrance sequence changed."
);
assertMatch(
  gameSource,
  /game_over:\s*\{\s*src:\s*"\.\/public\/assets\/audio\/game-over\.ogg",\s*loop:\s*false\s*\}/s,
  "game-over.ogg track is not registered as a one-shot BGM track."
);
assertMatch(
  gameSource,
  /function triggerLoss\(options = \{\}\)\s*{[\s\S]*if \(shouldPlayGameOver\)\s*{\s*bgm\.play\("game_over", \{ fadeMs: 160 \}\);/s,
  "Wave death flow does not play game_over track via triggerLoss."
);
assertMatch(
  gameSource,
  /function showContinuePrompt\(options = \{\}\)\s*{[\s\S]*if \(shouldPlayGameOver\)\s*{\s*bgm\.play\("game_over", \{ fadeMs: 160 \}\);/s,
  "Boss death continue prompt does not play game_over track."
);

// Ensure continue UI still exists.
assertMatch(indexSource, /id="continue-screen"/, "Continue popup markup missing.");
assertMatch(indexSource, /id="continue-yes-btn"/, "Continue Yes button missing.");
assertMatch(indexSource, /id="continue-no-btn"/, "Continue No button missing.");

console.log("Smoke checks passed.");
