export function newPlayer(width, height) {
  return {
    x: width * 0.5,
    y: height - 56,
    w: 44,
    h: 28,
    speed: 340,
    vx: 0,
    lives: 3,
    shotCooldown: 0,
    shieldHits: 0,
    rapid: { active: false, duration: 0, level: 0 },
    spread: { active: false, duration: 0, level: 0 },
  };
}

export function makeState(width, height) {
  return {
    mode: "start",
    transitionAlpha: 0,
    revealTimer: 0,
    revealedClue: "",
    endReason: "",
    score: 0,
    wave: 1,
    enemies: [],
    enemyDir: 1,
    enemySpeed: 60,
    enemyDescend: 20,
    enemyShotTimer: 1.0,
    bulletsPlayer: [],
    bulletsEnemy: [],
    powerups: [],
    boss: null,
    bossMinions: [],
    waveDropCooldown: 0,
    waveKillsSinceDrop: 0,
    hitFx: {
      shakeTimer: 0,
      flashTimer: 0,
      flickerTimer: 0,
      cooldownTimer: 0,
    },
    continueTimer: 0,
    bossDefeatFx: null,
    player: newPlayer(width, height),
    loopTime: 0,
  };
}
