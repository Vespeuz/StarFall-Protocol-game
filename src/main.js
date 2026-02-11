import {
  GAME_TITLE,
  FRAME_DT,
  TOTAL_WAVES,
  CLASS_HIDDEN,
  CONTINUE_PROMPT_SECONDS,
  BOSS_LAYER_HP,
  createBossConfig,
  WAVE_DROP_PACING,
  PLAYER_HIT_FX,
  POWERUP_DURATION_SECONDS,
  BGM_VOLUME_STORAGE_KEY,
  SFX_VOLUME_STORAGE_KEY,
  DEFAULT_BGM_VOLUME,
  DEFAULT_SFX_VOLUME,
} from "./config/constants.js";
import { clamp, overlaps, pick, setHidden, sleepMs } from "./core/utils.js";
import { newPlayer, makeState } from "./core/state.js";
import { createAudioSystem } from "./systems/audio.js";
import { createInputState, onKeyChange, bindKeyboardListeners } from "./systems/input.js";
import { spawnWave as spawnWaveSystem, updateEnemyWave as updateEnemyWaveSystem } from "./systems/waves.js";
import {
  maybeDropPowerup as maybeDropPowerupSystem,
  maybeDropWavePowerup as maybeDropWavePowerupSystem,
  applyPowerup as applyPowerupSystem,
  updatePowerups as updatePowerupsSystem,
} from "./systems/powerups.js";
import {
  updateBullets as updateBulletsSystem,
  handleCollisions as handleCollisionsSystem,
} from "./systems/combat.js";
import {
  updateReveal as updateRevealSystem,
  updateContinuePrompt as updateContinuePromptSystem,
} from "./systems/reveal.js";
import { createScreenController } from "./ui/screens.js";
import { bindUiControls } from "./ui/controls.js";
import { attachDebugHooks } from "./debug/hooks.js";
import { runSanityChecks } from "./debug/sanity.js";
import {
  colorByPower,
  iconByPower,
  enemyWaveArt,
  playerShipSprite,
  eliteMinionSprite,
  bossLayerColors,
  BOSS_IMAGE_SRC,
} from "./render/sprites.js";
import { drawBackgroundLayer } from "./render/background.js";
import { createEntityRenderer } from "./render/entities.js";
import { createHudRenderer } from "./render/hud.js";
import { createSceneRenderer } from "./render/scene.js";

(function () {
  "use strict";

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");

  const startScreen = document.getElementById("start-screen");
  const endScreen = document.getElementById("end-screen");
  const startPageEmbarkWrap = document.getElementById("startpage-embark-wrap");
  const startPageStartWrap = document.getElementById("startpage-start-wrap");
  const startPageEmbarkBtn = document.getElementById("startpage-embark-btn");
  const startPageStartBtn = document.getElementById("startpage-start-btn");
  const embarkBtn = document.getElementById("embark-btn");
  const startBtn = document.getElementById("start-btn");
  const restartBtn = document.getElementById("restart-btn");
  const endTitle = document.getElementById("end-title");
  const endMessage = document.getElementById("end-message");
  const continueScreen = document.getElementById("continue-screen");
  const continueCountdown = document.getElementById("continue-countdown");
  const continueYesBtn = document.getElementById("continue-yes-btn");
  const continueNoBtn = document.getElementById("continue-no-btn");
  const bgmVolumeSlider = document.getElementById("bgm-volume-slider");
  const bgmVolumeValue = document.getElementById("bgm-volume-value");
  const sfxVolumeSlider = document.getElementById("sfx-volume-slider");
  const sfxVolumeValue = document.getElementById("sfx-volume-value");

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const BOSS_CONFIG = createBossConfig(WIDTH);

  const input = createInputState();

  document.title = GAME_TITLE;

  const starField = Array.from({ length: 130 }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    r: Math.random() * 1.7 + 0.3,
    speed: Math.random() * 12 + 6,
  }));
  const bossSpriteImage = new Image();
  let isBossSpriteReady = false;
  bossSpriteImage.addEventListener("load", () => {
    isBossSpriteReady = true;
  });
  bossSpriteImage.addEventListener("error", () => {
    console.error("[BOSS] Failed to load boss sprite image", { src: BOSS_IMAGE_SRC });
  });
  bossSpriteImage.src = BOSS_IMAGE_SRC;

  const cluePrefixParts = ["hap", "pi"];
  const clueSuffixStore = { piece: "ness" };

  function composeFinalClue() {
    return `${cluePrefixParts.join("")}${clueSuffixStore.piece}`;
  }

  function applyBossScale(boss, scaleMultiplier) {
    const safeScale = Math.max(0.01, scaleMultiplier);
    boss.scaleMultiplier = safeScale;
    boss.w = BOSS_CONFIG.baseW * safeScale;
    boss.h = BOSS_CONFIG.baseH * safeScale;
  }

  function getPlayerHitbox() {
    const player = state.player;
    return {
      x: player.x,
      y: player.y,
      w: player.w,
      h: player.h,
    };
  }

  const audio = createAudioSystem({
    getState: () => state,
    clamp,
    sleepMs,
    bgmVolumeSlider,
    bgmVolumeValue,
    sfxVolumeSlider,
    sfxVolumeValue,
    storageKeys: {
      bgm: BGM_VOLUME_STORAGE_KEY,
      sfx: SFX_VOLUME_STORAGE_KEY,
    },
    defaultVolumes: {
      bgm: DEFAULT_BGM_VOLUME,
      sfx: DEFAULT_SFX_VOLUME,
    },
  });
  const {
    bgm,
    sfx,
    ensureAudio,
    setBgmVolume,
    setSfxVolume,
    registerVolumeHandlers,
    initializeVolumes,
    volumeChannels,
  } = audio;

  let state = makeState(WIDTH, HEIGHT);
  let rafId = null;
  let deterministicMode = false;
  const screenController = createScreenController({
    setHidden,
    elements: {
      startScreen,
      endScreen,
      continueScreen,
      startBtn,
      embarkBtn,
      startPageEmbarkWrap,
      startPageStartWrap,
      endTitle,
      endMessage,
    },
    getState: () => state,
  });
  const {
    hidePanels,
    lockStartFlow,
    unlockStartFlow,
    showStartPanel,
    showEndPanel,
    hideContinuePrompt,
    showContinuePromptPanel,
    syncStartPagePlayState,
  } = screenController;

  function spawnWave(waveNumber) {
    spawnWaveSystem(state, waveNumber, { clamp, TOTAL_WAVES, WAVE_DROP_PACING });
  }

  function spawnBoss() {
    bgm.play("boss", { fadeMs: 140 });
    state.boss = {
      x: BOSS_CONFIG.startX,
      y: BOSS_CONFIG.offscreenY,
      w: BOSS_CONFIG.baseW,
      h: BOSS_CONFIG.baseH,
      scaleMultiplier: 1,
      speed: BOSS_CONFIG.baseSpeed,
      dir: 1,
      shotTimer: BOSS_CONFIG.initialShotTimer,
      layers: BOSS_LAYER_HP.map((hp) => ({ max: hp, hp })),
      currentLayer: 0,
      nextLayer: null,
      evolutionLayerIndex: 2,
      evolving: false,
      evolutionTimer: 0,
      evolutionDuration: 0,
      mutationProgress: 0,
      mutated: false,
      enraged: false,
      invulnerable: false,
      transitionTimer: 0,
      layerBreakFxTimer: 0,
      flashTimer: 0,
      phaseBannerTimer: 1.2,
      shakeAmount: 0,
      flickerTimer: 0,
      flickerAlpha: 0,
      shieldTimer: 0,
      counterPunishTimer: 0,
      attackCycle: 0,
      burstShots: 0,
      burstInterval: 0,
      burstTimer: 0,
      windupTimer: 0,
      windupType: null,
      windupDuration: 0,
      pendingAttack: null,
      attackLockTimer: 0,
      minionSpawnTimer: BOSS_CONFIG.spawnMinionTimer,
      particles: [],
      phaseStartSnapshot: null,
      entranceActive: true,
      entranceTimer: BOSS_CONFIG.entranceDuration,
      entranceDuration: BOSS_CONFIG.entranceDuration,
      entranceTargetY: BOSS_CONFIG.entranceTargetY,
      graceActive: false,
      graceTimer: 0,
      graceDuration: BOSS_CONFIG.graceDuration,
      revealAlpha: BOSS_CONFIG.initialRevealAlpha,
    };
    state.bossMinions = [];
    state.bulletsEnemy = [];
    snapshotBossPhaseStart(state.boss);
    beginBossEntrance(state.boss, false);
  }

  function startGame() {
    ensureAudio();
    bgm.play("wave", { fadeMs: 280 });
    state = makeState(WIDTH, HEIGHT);
    state.mode = "playing";
    spawnWave(state.wave);
    hidePanels();
  }

  function triggerLoss(options = {}) {
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

  function clearGameplayInput() {
    input.left = false;
    input.right = false;
    input.shoot = false;
  }

  function showContinuePrompt(options = {}) {
    const shouldPlayGameOver = options.playGameOver === true;
    // Arcade continue prompt is intentionally boss-only.
    if (!state.boss || state.mode !== "playing") {
      triggerLoss();
      return;
    }
    state.mode = "continue_prompt";
    state.continueTimer = CONTINUE_PROMPT_SECONDS;
    clearGameplayInput();
    state.bulletsEnemy = [];
    state.bulletsPlayer = [];
    showContinuePromptPanel();
    if (continueCountdown) {
      continueCountdown.textContent = String(CONTINUE_PROMPT_SECONDS);
    }
    if (shouldPlayGameOver) {
      bgm.play("game_over", { fadeMs: 160 });
    } else {
      bgm.stop({ fadeMs: 180 });
    }
  }

  async function chooseContinueYes() {
    if (state.mode !== "continue_prompt") {
      return;
    }
    hideContinuePrompt();
    state.mode = "playing";
    state.continueTimer = 0;
    await bgm.stop({ fadeMs: 0 });
    respawnAtBossCheckpoint();
    await bgm.play("boss", { fadeMs: 0 });
  }

  async function chooseContinueNo() {
    if (state.mode !== "continue_prompt") {
      return;
    }
    hideContinuePrompt();
    state.continueTimer = 0;
    await bgm.stop({ fadeMs: 120 });
    restart();
  }

  function snapshotBossPhaseStart(boss) {
    if (!boss) {
      return;
    }
    const layer = boss.layers[boss.currentLayer];
    boss.phaseStartSnapshot = {
      layerIndex: boss.currentLayer,
      layerHp: layer ? layer.max : 0,
      x: BOSS_CONFIG.startX,
      y: BOSS_CONFIG.startY,
      dir: 1,
      shotTimer: boss.currentLayer <= 1 ? 0.68 : 0.86,
      minionSpawnTimer: boss.enraged ? 2.8 : 3.8,
      mutated: boss.mutated,
      enraged: boss.enraged,
    };
  }

  function resetBossTransientState(boss, options = {}) {
    // Clear transient attack/FX runtime fields without touching phase progression.
    const { resetAttackCycle = false, resetBurstInterval = false } = options;
    boss.invulnerable = false;
    boss.transitionTimer = 0;
    boss.layerBreakFxTimer = 0;
    boss.flashTimer = 0;
    boss.shieldTimer = 0;
    boss.counterPunishTimer = 0;
    if (resetAttackCycle) {
      boss.attackCycle = 0;
    }
    boss.burstShots = 0;
    if (resetBurstInterval) {
      boss.burstInterval = 0;
    }
    boss.burstTimer = 0;
    boss.windupTimer = 0;
    boss.windupType = null;
    boss.windupDuration = 0;
    boss.pendingAttack = null;
    boss.attackLockTimer = 0;
    boss.particles = [];
    state.bossMinions = [];
    state.bulletsEnemy = [];
  }

  function restoreBossPhaseStart(boss) {
    if (!boss || !boss.phaseStartSnapshot) {
      return;
    }
    const snap = boss.phaseStartSnapshot;
    boss.currentLayer = snap.layerIndex;
    boss.nextLayer = null;
    for (let i = 0; i < boss.layers.length; i++) {
      if (i < snap.layerIndex) {
        boss.layers[i].hp = 0;
      } else if (i === snap.layerIndex) {
        boss.layers[i].hp = snap.layerHp;
      } else {
        boss.layers[i].hp = boss.layers[i].max;
      }
    }
    boss.x = snap.x;
    boss.y = snap.y;
    boss.dir = snap.dir;
    boss.shotTimer = snap.shotTimer;
    boss.minionSpawnTimer = snap.minionSpawnTimer;
    boss.mutated = snap.mutated;
    boss.enraged = snap.enraged;
    boss.evolving = false;
    boss.evolutionTimer = 0;
    boss.evolutionDuration = 0;
    boss.mutationProgress = boss.mutated ? 1 : 0;
    resetBossTransientState(boss);
    boss.phaseBannerTimer = 1.1;
  }

  function resetBossToInitialPhase(boss) {
    if (!boss) {
      return;
    }
    boss.currentLayer = 0;
    boss.nextLayer = null;
    for (let i = 0; i < boss.layers.length; i++) {
      boss.layers[i].hp = boss.layers[i].max;
    }
    boss.mutated = false;
    boss.enraged = false;
    boss.evolving = false;
    boss.evolutionTimer = 0;
    boss.evolutionDuration = 0;
    boss.mutationProgress = 0;
    resetBossTransientState(boss, { resetAttackCycle: true, resetBurstInterval: true });
    applyBossScale(boss, 1);
    boss.speed = BOSS_CONFIG.baseSpeed;
    boss.dir = 1;
    boss.shotTimer = BOSS_CONFIG.initialShotTimer;
    boss.minionSpawnTimer = BOSS_CONFIG.retryMinionTimer;
    boss.phaseBannerTimer = BOSS_CONFIG.phaseBannerTimer;
    snapshotBossPhaseStart(boss);
  }

  function beginBossEntrance(boss, isRetry) {
    if (!boss) {
      return;
    }
    boss.entranceActive = true;
    boss.entranceDuration = isRetry ? BOSS_CONFIG.retryEntranceDuration : BOSS_CONFIG.entranceDuration;
    boss.entranceTimer = boss.entranceDuration;
    boss.entranceTargetY = BOSS_CONFIG.entranceTargetY;
    boss.graceActive = false;
    boss.graceTimer = 0;
    boss.graceDuration = BOSS_CONFIG.graceDuration;
    boss.revealAlpha = BOSS_CONFIG.entranceRevealAlpha;
    boss.invulnerable = true;
    boss.x = BOSS_CONFIG.startX;
    boss.y = -Math.max(Math.abs(BOSS_CONFIG.offscreenY), boss.h * 1.2);
    boss.shotTimer = BOSS_CONFIG.entranceShotTimer;
    boss.pendingAttack = null;
    boss.windupTimer = 0;
    boss.attackLockTimer = 0;
    boss.burstShots = 0;
    state.bulletsEnemy = [];
    state.bossMinions = [];
    boss.phaseBannerTimer = 1.45;
  }

  function maybeDropBossCombatPowerup(boss, chance = 0.3) {
    if (!boss || Math.random() >= chance) {
      return;
    }
    const dropX = clamp(
      boss.x + (Math.random() - 0.5) * Math.min(220, boss.w * 0.9),
      48,
      WIDTH - 48
    );
    const dropY = boss.y + boss.h * 0.35;
    maybeDropPowerup(dropX, dropY, state.wave + 3);
  }

  function respawnAtBossCheckpoint() {
    if (!state.boss || state.mode !== "playing") {
      triggerLoss();
      return;
    }
    state.player = newPlayer(WIDTH, HEIGHT);
    state.player.x = BOSS_CONFIG.startX;
    state.player.y = HEIGHT - 56;
    state.bulletsPlayer = [];
    state.bulletsEnemy = [];
    state.powerups = [];
    resetBossToInitialPhase(state.boss);
    beginBossEntrance(state.boss, true);
  }

  function triggerBossDefeat() {
    const defeatedBoss = state.boss;
    state.mode = "reveal";
    state.revealTimer = 0;
    state.transitionAlpha = 0;
    if (defeatedBoss) {
      const particleCount = 36;
      const particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: defeatedBoss.x + (Math.random() - 0.5) * defeatedBoss.w * 0.42,
          y: defeatedBoss.y + (Math.random() - 0.5) * defeatedBoss.h * 0.36,
          vx: (Math.random() - 0.5) * 260,
          vy: -90 - Math.random() * 250,
          size: 3 + Math.random() * 4,
          life: 0.9 + Math.random() * 0.5,
          color: pick(["#ffffff", "#9ef7ff", "#ff8cb8", "#ffd26f"]),
        });
      }
      state.bossDefeatFx = {
        x: defeatedBoss.x,
        y: defeatedBoss.y,
        w: defeatedBoss.w,
        h: defeatedBoss.h,
        timer: 0,
        duration: 1.35,
        completed: false,
        particles,
      };
    } else {
      state.bossDefeatFx = null;
    }
    state.boss = null;
    state.bulletsEnemy = [];
    state.bulletsPlayer = [];
    state.powerups = [];
    state.bossMinions = [];
    bgm.play("end", { fadeMs: 220 });
    sfx.bossDefeat();
  }

  function shootPlayer() {
    const player = state.player;
    const baseCd = 0.28;
    const rapidFactor = player.rapid.active ? 1 + player.rapid.level * 0.7 : 1;
    const cooldown = baseCd / rapidFactor;
    if (player.shotCooldown > 0) {
      return;
    }

    const spreadLevel = player.spread.active ? player.spread.level : 0;
    const bulletSpeed = 520;
    const angles = [0];
    if (spreadLevel >= 1) {
      angles.push(-0.2, 0.2);
    }
    if (spreadLevel >= 2) {
      angles.push(-0.35, 0.35);
    }
    if (spreadLevel >= 3) {
      angles.push(-0.5, 0.5);
    }

    for (const angle of angles) {
      state.bulletsPlayer.push({
        x: player.x,
        y: player.y - player.h * 0.6,
        w: 6,
        h: 16,
        vx: Math.sin(angle) * bulletSpeed,
        vy: -Math.cos(angle) * bulletSpeed,
      });
    }
    player.shotCooldown = cooldown;
    sfx.shoot();
  }

  function shootEnemy(sourceX, sourceY, speedMultiplier) {
    spawnHostileProjectile({
      x: sourceX,
      y: sourceY + 14,
      w: 6,
      h: 16,
      vx: 0,
      vy: 220 * speedMultiplier,
      damage: 1,
      source: "enemy_wave",
    });
  }

  function spawnHostileProjectile(projectile) {
    state.bulletsEnemy.push({
      x: projectile.x,
      y: projectile.y,
      w: projectile.w || 8,
      h: projectile.h || 16,
      vx: projectile.vx || 0,
      vy: projectile.vy || 0,
      damage: projectile.damage || 1,
      source: projectile.source || "boss",
    });
  }

  function fireBossSpread(boss, count, arc, speed, damage) {
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const angle = -arc + t * arc * 2;
      spawnHostileProjectile({
        x: boss.x,
        y: boss.y + boss.h * 0.34,
        w: 8,
        h: 18,
        vx: Math.sin(angle) * speed,
        vy: Math.cos(angle) * speed,
        damage,
        source: "boss_spread",
      });
    }
  }

  function fireBossAimedShot(boss, speed, damage, ox = 0) {
    const sx = boss.x + ox;
    const sy = boss.y + boss.h * 0.3;
    const dx = state.player.x - sx;
    const dy = state.player.y - sy;
    const length = Math.max(1, Math.hypot(dx, dy));
    spawnHostileProjectile({
      x: sx,
      y: sy,
      w: 9,
      h: 18,
      vx: (dx / length) * speed,
      vy: (dy / length) * speed,
      damage,
      source: "boss_aimed",
    });
  }

  function fireBossMutantLances(boss, speed, damage) {
    const leftX = boss.x - boss.w * 0.34;
    const rightX = boss.x + boss.w * 0.34;
    spawnHostileProjectile({
      x: leftX,
      y: boss.y + boss.h * 0.26,
      w: 10,
      h: 20,
      vx: -speed * 0.24,
      vy: speed,
      damage,
      source: "boss_lance",
    });
    spawnHostileProjectile({
      x: rightX,
      y: boss.y + boss.h * 0.26,
      w: 10,
      h: 20,
      vx: speed * 0.24,
      vy: speed,
      damage,
      source: "boss_lance",
    });
  }

  function fireBossConstrictor(boss, lanes, speed, damage) {
    for (let i = 1; i <= lanes; i++) {
      const x = (WIDTH / (lanes + 1)) * i;
      spawnHostileProjectile({
        x,
        y: boss.y + boss.h * 0.22,
        w: 8,
        h: 20,
        vx: 0,
        vy: speed,
        damage,
        source: "boss_constrictor",
      });
    }
  }

  function spawnBossMinion() {
    if (!state.boss) {
      return;
    }
    const boss = state.boss;
    state.bossMinions.push({
      x: clamp(
        boss.x + (Math.random() - 0.5) * (boss.w * 0.9),
        32,
        WIDTH - 32
      ),
      y: boss.y + boss.h * 0.32,
      w: 26,
      h: 22,
      hp: boss.enraged ? 26 : 18,
      speed: 88 + boss.currentLayer * 16 + (boss.enraged ? 22 : 0),
      shotTimer: 0.75 + Math.random() * 0.45,
      pulse: Math.random() * Math.PI * 2,
    });
  }

  function updateBossMinions(dt, paused) {
    for (let i = state.bossMinions.length - 1; i >= 0; i--) {
      const minion = state.bossMinions[i];
      if (!paused) {
        minion.y += minion.speed * dt;
        minion.x += Math.sin(state.loopTime * 3 + minion.pulse) * 18 * dt;
        minion.shotTimer -= dt;
        if (minion.shotTimer <= 0) {
          const dx = state.player.x - minion.x;
          const dy = state.player.y - minion.y;
          const len = Math.max(1, Math.hypot(dx, dy));
          const shotSpeed = 260 + (state.boss && state.boss.enraged ? 80 : 30);
          spawnHostileProjectile({
            x: minion.x,
            y: minion.y + minion.h * 0.3,
            w: 7,
            h: 14,
            vx: (dx / len) * shotSpeed,
            vy: (dy / len) * shotSpeed,
            damage: state.boss && state.boss.enraged ? 2 : 1,
            source: "boss_minion",
          });
          minion.shotTimer =
            0.6 + Math.random() * 0.35 - (state.boss ? state.boss.currentLayer * 0.06 : 0);
        }
      }

      if (minion.y - minion.h / 2 > HEIGHT + 40 || minion.hp <= 0) {
        state.bossMinions.splice(i, 1);
        continue;
      }

      if (
        overlaps(minion, {
          x: state.player.x,
          y: state.player.y,
          w: state.player.w,
          h: state.player.h,
        })
      ) {
        consumePlayerHit(1);
        state.bossMinions.splice(i, 1);
      }
    }
  }

  function spawnBossBreakParticles(boss, count) {
    for (let i = 0; i < count; i++) {
      boss.particles.push({
        x: boss.x + (Math.random() - 0.5) * boss.w * 0.4,
        y: boss.y + (Math.random() - 0.5) * boss.h * 0.4,
        vx: (Math.random() - 0.5) * 220,
        vy: (Math.random() - 0.5) * 220,
        life: 0.4 + Math.random() * 0.6,
        size: 2 + Math.random() * 3,
        color: pick(["#f6ffff", "#8dffe2", "#66d4ff", "#9f8bff"]),
      });
    }
  }

  function beginBossEvolution(boss) {
    boss.evolving = true;
    boss.evolutionDuration = 2.8;
    boss.evolutionTimer = 2.8;
    boss.transitionTimer = 2.8;
    boss.mutationProgress = 0;
    boss.invulnerable = true;
    boss.flickerTimer = 0;
    boss.flickerAlpha = 0;
    boss.shakeAmount = 0;
    state.bulletsEnemy = [];
    state.bossMinions = [];
    spawnBossBreakParticles(boss, 42);
  }

  function completeBossEvolution(boss) {
    boss.evolving = false;
    boss.mutated = true;
    boss.mutationProgress = 1;
    boss.transitionTimer = 0;
    boss.invulnerable = false;
    if (boss.nextLayer !== null) {
      boss.currentLayer = boss.nextLayer;
      boss.nextLayer = null;
    }
    applyBossScale(boss, 1.35);
    boss.speed += 36;
    boss.phaseBannerTimer = 1.3;
    boss.shotTimer = 0.2;
    fireBossMutantLances(boss, 320, 1);
    spawnBossBreakParticles(boss, 34);
    if (boss.currentLayer >= boss.layers.length - 1) {
      boss.enraged = true;
    }
    snapshotBossPhaseStart(boss);
  }

  function handleBossLayerBreak(boss) {
    boss.layerBreakFxTimer = 1.15;
    boss.flashTimer = 0.18;
    boss.phaseBannerTimer = 1.2;
    spawnBossBreakParticles(boss, 32);
    maybeDropPowerup(boss.x - 26, boss.y + 18, state.wave + 3);
    maybeDropPowerup(boss.x + 26, boss.y + 18, state.wave + 3);
    state.score += 400;

    if (boss.currentLayer >= boss.layers.length - 1) {
      triggerBossDefeat();
      return;
    }

    boss.nextLayer = boss.currentLayer + 1;
    boss.invulnerable = true;
    if (boss.nextLayer === boss.evolutionLayerIndex && !boss.mutated) {
      beginBossEvolution(boss);
    } else {
      boss.transitionTimer = 1.05;
    }
  }

  function damageBoss(rawDamage) {
    const boss = state.boss;
    if (!boss) {
      return false;
    }
    if (boss.evolving || boss.transitionTimer > 0 || boss.invulnerable) {
      return false;
    }
    if (boss.shieldTimer > 0) {
      if (boss.counterPunishTimer <= 0) {
        fireBossAimedShot(boss, 360 + (boss.enraged ? 90 : 0), boss.enraged ? 2 : 1);
        boss.counterPunishTimer = 0.2;
      }
      return false;
    }

    const layer = boss.layers[boss.currentLayer];
    const damage = rawDamage * (boss.enraged ? 1.45 : 1);
    layer.hp = Math.max(0, layer.hp - damage);
    boss.flashTimer = 0.14;

    if (layer.hp <= 0) {
      handleBossLayerBreak(boss);
    }
    return true;
  }

  function maybeDropPowerup(x, y, waveHint) {
    maybeDropPowerupSystem(state, x, y, waveHint, {
      clamp,
      pick,
    });
  }

  function maybeDropWavePowerup(x, y) {
    maybeDropWavePowerupSystem(state, x, y, {
      clamp,
      TOTAL_WAVES,
      WAVE_DROP_PACING,
      maybeDropPowerupFn: maybeDropPowerup,
    });
  }

  function triggerPlayerDamageFeedback() {
    const fx = state.hitFx;
    if (!fx || fx.cooldownTimer > 0) {
      return;
    }
    fx.shakeTimer = PLAYER_HIT_FX.shakeDuration;
    fx.flashTimer = PLAYER_HIT_FX.flashDuration;
    fx.flickerTimer = PLAYER_HIT_FX.flickerDuration;
    fx.cooldownTimer = PLAYER_HIT_FX.retriggerCooldown;
  }

  function applyPowerup(type) {
    applyPowerupSystem(state, type, {
      clamp,
      POWERUP_DURATION_SECONDS,
      onPickupSfx: () => sfx.pickup(),
    });
  }

  function consumePlayerHit(damage = 1) {
    const player = state.player;
    let pendingDamage = Math.max(1, Math.floor(damage));
    while (pendingDamage > 0 && player.shieldHits > 0) {
      player.shieldHits -= 1;
      pendingDamage -= 1;
    }
    if (pendingDamage <= 0) {
      return;
    }
    triggerPlayerDamageFeedback();
    player.lives -= pendingDamage;
    if (player.lives <= 0) {
      if (state.boss && state.mode === "playing") {
        showContinuePrompt({ playGameOver: true });
      } else {
        triggerLoss({ playGameOver: true });
      }
    }
  }

  function updatePlayer(dt) {
    const player = state.player;
    player.vx = 0;
    if (input.left) {
      player.vx = -player.speed;
    }
    if (input.right) {
      player.vx = player.speed;
    }
    player.x = clamp(player.x + player.vx * dt, player.w * 0.6, WIDTH - player.w * 0.6);

    player.shotCooldown = Math.max(0, player.shotCooldown - dt);
    if (input.shoot) {
      shootPlayer();
    }

    if (player.rapid.active) {
      player.rapid.duration = Math.max(0, player.rapid.duration - dt);
      if (player.rapid.duration <= 0) {
        player.rapid.active = false;
        player.rapid.level = 0;
      }
    }
    if (player.spread.active) {
      player.spread.duration = Math.max(0, player.spread.duration - dt);
      if (player.spread.duration <= 0) {
        player.spread.active = false;
        player.spread.level = 0;
      }
    }
  }

  function updateEnemyWave(dt) {
    updateEnemyWaveSystem(state, dt, {
      WIDTH,
      triggerLoss,
      shootEnemy,
      pick,
    });
  }

  function updateBoss(dt) {
    if (!state.boss) {
      return;
    }
    const boss = state.boss;
    for (let i = boss.particles.length - 1; i >= 0; i--) {
      const particle = boss.particles[i];
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.97;
      particle.vy *= 0.97;
      if (particle.life <= 0) {
        boss.particles.splice(i, 1);
      }
    }

    boss.layerBreakFxTimer = Math.max(0, boss.layerBreakFxTimer - dt);
    boss.flashTimer = Math.max(0, boss.flashTimer - dt);
    boss.shieldTimer = Math.max(0, boss.shieldTimer - dt);
    boss.counterPunishTimer = Math.max(0, boss.counterPunishTimer - dt);
    boss.phaseBannerTimer = Math.max(0, boss.phaseBannerTimer - dt);
    boss.attackLockTimer = Math.max(0, boss.attackLockTimer - dt);

    if (boss.entranceActive) {
      boss.entranceTimer = Math.max(0, boss.entranceTimer - dt);
      const progress = 1 - boss.entranceTimer / Math.max(0.001, boss.entranceDuration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const startY = -Math.max(170, boss.h * 1.2);
      boss.y = startY + (boss.entranceTargetY - startY) * eased;
      boss.x = WIDTH * 0.5 + Math.sin(state.loopTime * 1.5) * 8 * (1 - progress);
      boss.shakeAmount = 0.45 + (1 - progress) * 0.55;
      boss.revealAlpha = clamp(0.08 + progress * 0.92, 0.08, 1);
      updateBossMinions(dt, true);
      if (boss.entranceTimer <= 0) {
        boss.entranceActive = false;
        boss.graceActive = true;
        boss.graceTimer = boss.graceDuration;
        boss.shakeAmount = 0.35;
        state.bulletsEnemy = [];
      }
      return;
    }

    if (boss.graceActive) {
      boss.graceTimer = Math.max(0, boss.graceTimer - dt);
      boss.invulnerable = false;
      boss.shakeAmount = 0.15 + Math.sin(state.loopTime * 8) * 0.08;
      updateBossMinions(dt, true);
      if (boss.graceTimer <= 0) {
        boss.graceActive = false;
        boss.shotTimer = Math.max(0.75, boss.shotTimer);
        boss.shakeAmount = 0;
      }
      return;
    }

    boss.invulnerable = false;

    if (boss.evolving) {
      boss.evolutionTimer = Math.max(0, boss.evolutionTimer - dt);
      boss.mutationProgress =
        1 - boss.evolutionTimer / Math.max(0.001, boss.evolutionDuration);
      boss.shakeAmount = 2 + boss.mutationProgress * 4;
      boss.flickerTimer -= dt;
      if (boss.flickerTimer <= 0) {
        boss.flickerTimer = 0.05 + Math.random() * 0.22;
        boss.flickerAlpha = 0.1 + Math.random() * 0.22;
      }
      boss.x += Math.sin(state.loopTime * 7) * 18 * dt;
      boss.x = clamp(boss.x, boss.w * 0.55, WIDTH - boss.w * 0.55);
      updateBossMinions(dt, true);
      if (boss.evolutionTimer <= 0) {
        completeBossEvolution(boss);
      }
      return;
    }

    if (boss.transitionTimer > 0) {
      boss.transitionTimer = Math.max(0, boss.transitionTimer - dt);
      updateBossMinions(dt, true);
      if (boss.transitionTimer <= 0) {
        if (boss.nextLayer !== null) {
          boss.currentLayer = boss.nextLayer;
          boss.nextLayer = null;
        }
        boss.invulnerable = false;
        if (boss.currentLayer >= boss.layers.length - 1) {
          boss.enraged = true;
          boss.phaseBannerTimer = 1.4;
          boss.shakeAmount = 1.5;
        }
        boss.shotTimer = 0.74 - boss.currentLayer * 0.06;
        snapshotBossPhaseStart(boss);
      }
      return;
    }

    const phase = boss.currentLayer;
    const baseSpeeds = [132, 162, 194, 225];
    let moveSpeed = baseSpeeds[phase] || 225;
    if (boss.mutated) {
      moveSpeed += 24;
    }
    if (boss.enraged) {
      moveSpeed += 40;
      boss.shakeAmount = 1.1 + Math.sin(state.loopTime * 8) * 0.35;
    } else {
      boss.shakeAmount = 0;
    }

    boss.x += boss.dir * moveSpeed * dt;
    if (boss.mutated) {
      boss.y = 120 + Math.sin(state.loopTime * (boss.enraged ? 4.5 : 2.8)) * 12;
    } else {
      boss.y = 120;
    }
    if (boss.x - boss.w / 2 <= 70 || boss.x + boss.w / 2 >= WIDTH - 70) {
      boss.dir *= -1;
    }

    boss.burstTimer -= dt;
    if (boss.burstShots > 0 && boss.burstTimer <= 0) {
      const damage = boss.enraged ? 2 : 1;
      fireBossSpread(
        boss,
        boss.enraged ? 6 : 5,
        boss.enraged ? 0.56 : 0.42,
        boss.enraged ? 320 : 285,
        damage
      );
      boss.burstShots -= 1;
      boss.burstTimer = boss.burstInterval + (boss.enraged ? 0.03 : 0.05);
      boss.attackLockTimer = Math.max(boss.attackLockTimer, 0.08);
      maybeDropBossCombatPowerup(boss, boss.enraged ? 0.025 : 0.016);
      if (boss.burstShots <= 0 && phase >= 2) {
        boss.shieldTimer = boss.enraged ? 0.42 : 0.3;
        boss.shotTimer = Math.max(boss.shotTimer, boss.enraged ? 0.46 : 0.56);
      }
      return;
    }

    if (boss.windupTimer > 0) {
      boss.windupTimer = Math.max(0, boss.windupTimer - dt);
      if (boss.windupTimer <= 0 && boss.pendingAttack) {
        const fire = boss.pendingAttack;
        boss.pendingAttack = null;
        fire();
        maybeDropBossCombatPowerup(boss, phase >= 2 ? 0.055 : 0.034);
      }
      return;
    }

    if (boss.attackLockTimer > 0) {
      return;
    }

    boss.shotTimer -= dt;
    if (boss.shotTimer <= 0) {
      boss.attackCycle += 1;
      const damage = boss.enraged ? 2 : 1;
      if (phase === 0) {
        boss.windupType = "spread";
        boss.windupDuration = 0.22;
        boss.windupTimer = boss.windupDuration;
        boss.pendingAttack = () => {
          fireBossSpread(boss, 3, 0.2, 235, damage);
          boss.shotTimer = 0.9;
          boss.attackLockTimer = 0.12;
        };
      } else if (phase === 1) {
        boss.windupType = "mixed";
        boss.windupDuration = 0.28;
        boss.windupTimer = boss.windupDuration;
        boss.pendingAttack = () => {
          fireBossSpread(boss, 4, 0.34, 270, damage);
          if (boss.attackCycle % 4 === 0) {
            fireBossAimedShot(boss, 315, damage);
          }
          boss.shotTimer = 0.82;
          boss.attackLockTimer = 0.16;
        };
      } else if (phase === 2) {
        boss.windupType = "mutant";
        boss.windupDuration = 0.34;
        boss.windupTimer = boss.windupDuration;
        boss.pendingAttack = () => {
          if (boss.attackCycle % 2 === 0) {
            fireBossMutantLances(boss, 295, damage);
            fireBossSpread(boss, 5, 0.45, 300, damage);
            boss.shieldTimer = 0.28;
          } else {
            fireBossConstrictor(boss, 2, 255, damage);
            boss.burstShots = 2;
            boss.burstInterval = 0.16;
            boss.burstTimer = 0.05;
          }
          boss.shotTimer = 0.92;
          boss.attackLockTimer = 0.22;
        };
      } else {
        boss.windupType = "enraged";
        boss.windupDuration = 0.36;
        boss.windupTimer = boss.windupDuration;
        boss.pendingAttack = () => {
          if (boss.attackCycle % 2 === 0) {
            fireBossMutantLances(boss, 330, damage);
            fireBossSpread(boss, 6, 0.52, 325, damage);
            boss.shieldTimer = 0.36;
          } else {
            fireBossAimedShot(boss, 355, damage);
            boss.burstShots = 2;
            boss.burstInterval = 0.14;
            boss.burstTimer = 0.05;
          }
          boss.shotTimer = 0.76;
          boss.attackLockTimer = 0.28;
        };
      }
    }

    if (phase >= 2) {
      const minionCap = boss.enraged ? 2 : 1;
      boss.minionSpawnTimer -= dt;
      if (boss.minionSpawnTimer <= 0 && state.bossMinions.length < minionCap) {
        spawnBossMinion();
        boss.minionSpawnTimer = boss.enraged ? 4.8 : 6.2;
      }
    }
    updateBossMinions(dt, false);

    if (boss.mutated && Math.random() < dt * 10) {
      boss.particles.push({
        x: boss.x + (Math.random() - 0.5) * boss.w * 0.6,
        y: boss.y + (Math.random() - 0.5) * boss.h * 0.6,
        vx: (Math.random() - 0.5) * 38,
        vy: -20 - Math.random() * 46,
        life: 0.35 + Math.random() * 0.35,
        size: 2 + Math.random() * 2,
        color: boss.enraged ? "#ff6da9" : "#74ffe2",
      });
    }
  }

  function updatePowerups(dt) {
    updatePowerupsSystem(state, dt, {
      HEIGHT,
      overlaps,
      getPlayerHitbox,
      applyPowerupFn: applyPowerup,
    });
  }

  function updateBullets(dt) {
    updateBulletsSystem(state, dt, { WIDTH, HEIGHT });
  }

  function handleCollisions() {
    handleCollisionsSystem(state, {
      overlaps,
      getPlayerHitbox,
      consumePlayerHit,
      damageBoss,
      maybeDropPowerup,
      maybeDropWavePowerup,
      onEnemyExplosion: () => sfx.explosion(),
    });
  }

  function updatePlaying(dt) {
    if (!state.boss) {
      state.waveDropCooldown = Math.max(0, state.waveDropCooldown - dt);
    }
    updatePlayer(dt);
    updateEnemyWave(dt);
    updateBoss(dt);
    updatePowerups(dt);
    updateBullets(dt);
    handleCollisions();

    if (state.mode !== "playing") {
      return;
    }

    if (!state.boss && state.enemies.length === 0) {
      if (state.wave < TOTAL_WAVES) {
        state.wave += 1;
        spawnWave(state.wave);
      } else {
        spawnBoss();
      }
    }
  }

  function updateReveal(dt) {
    updateRevealSystem(state, dt, {
      clamp,
      composeFinalClue,
      showEndPanel,
    });
  }

  function updateContinuePrompt(dt) {
    updateContinuePromptSystem(state, dt, {
      continueCountdown,
      chooseContinueNo,
    });
  }

  function updateHitFeedback(dt) {
    const fx = state.hitFx;
    if (!fx) {
      return;
    }
    fx.shakeTimer = Math.max(0, fx.shakeTimer - dt);
    fx.flashTimer = Math.max(0, fx.flashTimer - dt);
    fx.flickerTimer = Math.max(0, fx.flickerTimer - dt);
    fx.cooldownTimer = Math.max(0, fx.cooldownTimer - dt);
  }

  function updateStars(dt) {
    for (const star of starField) {
      star.y += star.speed * dt;
      if (star.y > HEIGHT + 2) {
        star.y = -2;
        star.x = Math.random() * WIDTH;
      }
    }
  }

  function tick(dt) {
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

  function drawBackground() {
    drawBackgroundLayer({ ctx, width: WIDTH, height: HEIGHT, state, starField });
  }

  const entityRenderer = createEntityRenderer({
    ctx,
    getState: () => state,
    width: WIDTH,
    clamp,
    playerShipSprite,
    enemyWaveArt,
    eliteMinionSprite,
    colorByPower,
    iconByPower,
    bossSpriteImage,
    isBossSpriteReady: () => isBossSpriteReady,
  });

  const hudRenderer = createHudRenderer({
    ctx,
    getState: () => state,
    width: WIDTH,
    height: HEIGHT,
    totalWaves: TOTAL_WAVES,
    colorByPower,
    bossLayerColors,
    clamp,
  });

  const sceneRenderer = createSceneRenderer({
    ctx,
    getState: () => state,
    width: WIDTH,
    height: HEIGHT,
    clamp,
    playerHitFx: PLAYER_HIT_FX,
    drawBackground,
    drawPowerups: entityRenderer.drawPowerups,
    drawEnemies: entityRenderer.drawEnemies,
    drawBoss: entityRenderer.drawBoss,
    drawBossDefeatFx: hudRenderer.drawBossDefeatFx,
    drawBossMinions: entityRenderer.drawBossMinions,
    drawBullets: entityRenderer.drawBullets,
    drawPlayer: entityRenderer.drawPlayer,
    drawHud: hudRenderer.drawHud,
    drawRevealOverlay: hudRenderer.drawRevealOverlay,
  });

  function render() {
    sceneRenderer.render();
  }

  function gameLoop(now) {
    if (!gameLoop.lastTime) {
      gameLoop.lastTime = now;
    }
    const dt = (now - gameLoop.lastTime) / 1000;
    gameLoop.lastTime = now;
    if (!deterministicMode) {
      tick(dt);
    }
    render();
    rafId = requestAnimationFrame(gameLoop);
  }

  function restart() {
    state = makeState(WIDTH, HEIGHT);
    state.mode = "start";
    showStartPanel();
  }

  bindKeyboardListeners({
    getState: () => state,
    onContinueYes: () => {
      void chooseContinueYes();
    },
    onContinueNo: () => {
      void chooseContinueNo();
    },
    onRestartFromEnd: () => {
      restart();
    },
    onGameplayKeyChange: (code, down) => {
      onKeyChange(input, code, down);
    },
  });

  bindUiControls({
    embarkBtn,
    startBtn,
    restartBtn,
    continueYesBtn,
    continueNoBtn,
    startPageEmbarkBtn,
    startPageStartBtn,
    onEmbark: async () => {
      if (embarkBtn.disabled) {
        return;
      }
      embarkBtn.disabled = true;
      ensureAudio();
      const played = await bgm.play("start", { fadeMs: 0 });
      if (played) {
        unlockStartFlow();
        sfx.uiClick();
        return;
      }
      embarkBtn.disabled = false;
    },
    onStart: () => {
      sfx.uiClick();
      startGame();
    },
    onRestart: () => {
      sfx.uiClick();
      restart();
    },
    onContinueYes: () => {
      void chooseContinueYes();
    },
    onContinueNo: () => {
      void chooseContinueNo();
    },
  });

  function renderGameToText() {
    const payload = {
      coordinate_system: "origin top-left, +x right, +y down; units are canvas pixels",
      mode: state.mode,
      wave: state.wave,
      total_waves: TOTAL_WAVES,
      score: state.score,
      player: {
        x: Number(state.player.x.toFixed(1)),
        y: Number(state.player.y.toFixed(1)),
        vx: Number(state.player.vx.toFixed(1)),
        lives: state.player.lives,
        shield_hits: state.player.shieldHits,
      },
      active_powerups: {
        rapid_fire: state.player.rapid.active
          ? { level: state.player.rapid.level, duration_s: Number(state.player.rapid.duration.toFixed(2)) }
          : null,
        spread_shot: state.player.spread.active
          ? { level: state.player.spread.level, duration_s: Number(state.player.spread.duration.toFixed(2)) }
          : null,
      },
      enemies: {
        count: state.enemies.length,
        sample: state.enemies.slice(0, 8).map((enemy) => ({
          x: Number(enemy.x.toFixed(1)),
          y: Number(enemy.y.toFixed(1)),
        })),
      },
      boss: state.boss
        ? {
            x: Number(state.boss.x.toFixed(1)),
            y: Number(state.boss.y.toFixed(1)),
            current_layer: state.boss.currentLayer + 1,
            total_layers: state.boss.layers.length,
            active_layer_hp: Math.max(
              0,
              Number(state.boss.layers[state.boss.currentLayer].hp.toFixed(1))
            ),
            active_layer_hp_max: state.boss.layers[state.boss.currentLayer].max,
            layers_remaining: state.boss.layers.length - state.boss.currentLayer,
            evolving: state.boss.evolving,
            mutated: state.boss.mutated,
            enraged: state.boss.enraged,
            invulnerable: state.boss.invulnerable,
            entrance_active: state.boss.entranceActive,
            grace_active: state.boss.graceActive,
            minions: state.bossMinions.length,
          }
        : null,
      player_bullets: state.bulletsPlayer.length,
      enemy_bullets: state.bulletsEnemy.length,
      falling_powerups: state.powerups.map((p) => ({
        type: p.type,
        x: Number(p.x.toFixed(1)),
        y: Number(p.y.toFixed(1)),
      })),
      clue_visible: Boolean(state.revealedClue),
      continue_timer: state.mode === "continue_prompt" ? Number(state.continueTimer.toFixed(2)) : null,
      bgm_track: bgm.currentTrack || null,
      bgm_volume: Number(volumeChannels.bgm.toFixed(2)),
      sfx_volume: Number(volumeChannels.sfx.toFixed(2)),
    };
    return JSON.stringify(payload);
  }

  async function advanceTime(ms) {
    deterministicMode = true;
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i++) {
      tick(FRAME_DT);
    }
    render();
    return Promise.resolve();
  }

  attachDebugHooks({ renderGameToText, advanceTime });
  runSanityChecks({ enabled: false });
  initializeVolumes();
  registerVolumeHandlers();
  bgm.preloadAll();

  showStartPanel();
  syncStartPagePlayState();
  render();
  if (rafId) {
    cancelAnimationFrame(rafId);
  }
  rafId = requestAnimationFrame(gameLoop);
})();
