import {
  GAME_TITLE,
  FRAME_DT,
  TOTAL_WAVES,
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
import { createLoopSystem } from "./core/loop.js";
import { createRuntimeContext } from "./bootstrap/runtime.js";
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
import { updateStars, updateHitFeedback } from "./systems/world-effects.js";
import { createPlayerSystem } from "./systems/player.js";
import { createBossAttacksSystem } from "./systems/boss-attacks.js";
import { createBossSystem } from "./systems/boss.js";
import { createGameFlowSystem } from "./systems/game-flow.js";
import { createProgressionSystem } from "./systems/progression.js";
import { createScreenController } from "./ui/screens.js";
import { bindUiControls } from "./ui/controls.js";
import { attachDebugHooks } from "./debug/hooks.js";
import { runSanityChecks } from "./debug/sanity.js";
import { createStateSnapshotBuilder } from "./debug/state-snapshot.js";
import {
  colorByPower,
  iconByPower,
  enemyWaveArt,
  playerShipSprite,
  eliteMinionSprite,
  bossLayerColors,
  POWERUP_IMAGE_SOURCES,
  PLAYER_IMAGE_SRC,
  BOSS_IMAGE_SOURCES,
} from "./render/sprites.js";
import { drawBackgroundLayer } from "./render/background.js";
import { createEntityRenderer } from "./render/entities.js";
import { createHudRenderer } from "./render/hud.js";
import { createSceneRenderer } from "./render/scene.js";

(function () {
  "use strict";

  const runtime = createRuntimeContext({
    gameTitle: GAME_TITLE,
    bossImageSources: BOSS_IMAGE_SOURCES,
    playerImageSrc: PLAYER_IMAGE_SRC,
    powerupImageSources: POWERUP_IMAGE_SOURCES,
  });

  const {
    ctx,
    elements,
    WIDTH,
    HEIGHT,
    starField,
    bossSprites,
    playerSprite,
    powerupSprites,
    refs,
  } = runtime;

  const BOSS_CONFIG = createBossConfig(WIDTH);
  const input = createInputState();

  let state = makeState(WIDTH, HEIGHT);

  function getState() {
    return state;
  }

  function setState(nextState) {
    state = nextState;
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
    getState,
    clamp,
    sleepMs,
    bgmVolumeSlider: elements.bgmVolumeSlider,
    bgmVolumeValue: elements.bgmVolumeValue,
    sfxVolumeSlider: elements.sfxVolumeSlider,
    sfxVolumeValue: elements.sfxVolumeValue,
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
    registerVolumeHandlers,
    initializeVolumes,
    volumeChannels,
  } = audio;

  const screenController = createScreenController({
    setHidden,
    elements: {
      startScreen: elements.startScreen,
      endScreen: elements.endScreen,
      continueScreen: elements.continueScreen,
      startBtn: elements.startBtn,
      embarkBtn: elements.embarkBtn,
      startPageEmbarkWrap: elements.startPageEmbarkWrap,
      startPageStartWrap: elements.startPageStartWrap,
      endTitle: elements.endTitle,
      endMessage: elements.endMessage,
    },
    getState,
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

  const cluePrefixParts = ["hap", "pi"];
  const clueSuffixStore = { piece: "ness" };

  function composeFinalClue() {
    return `${cluePrefixParts.join("")}${clueSuffixStore.piece}`;
  }

  function spawnWave(waveNumber) {
    spawnWaveSystem(state, waveNumber, { clamp, TOTAL_WAVES, WAVE_DROP_PACING });
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

  function clearGameplayInput() {
    input.left = false;
    input.right = false;
    input.up = false;
    input.down = false;
    input.shoot = false;
  }

  let gameFlowSystem = null;

  const playerSystem = createPlayerSystem({
    getState,
    getInput: () => input,
    clamp,
    playerHitFx: PLAYER_HIT_FX,
    powerupDurationSeconds: POWERUP_DURATION_SECONDS,
    width: WIDTH,
    height: HEIGHT,
    onShootSfx: () => sfx.shoot(),
    onPickupSfx: () => sfx.pickup(),
    applyPowerup: applyPowerupSystem,
    onPlayerDeathInBoss: () => {
      if (gameFlowSystem) {
        gameFlowSystem.showContinuePrompt({ playGameOver: true });
      }
    },
    onPlayerDeathInWave: () => {
      if (gameFlowSystem) {
        gameFlowSystem.triggerLoss({ playGameOver: true });
      }
    },
  });

  const bossAttacks = createBossAttacksSystem({
    getState,
    clamp,
    overlaps,
    width: WIDTH,
    height: HEIGHT,
    pick,
    consumePlayerHit: playerSystem.consumePlayerHit,
    maybeDropPowerup,
  });

  const bossSystem = createBossSystem({
    getState,
    width: WIDTH,
    height: HEIGHT,
    bossConfig: BOSS_CONFIG,
    bossLayerHp: BOSS_LAYER_HP,
    clamp,
    pick,
    newPlayer,
    attacks: bossAttacks,
    maybeDropPowerup,
    bgm,
    onBossDefeatSfx: () => sfx.bossDefeat(),
    onLossFallback: () => {
      if (gameFlowSystem) {
        gameFlowSystem.triggerLoss();
      }
    },
  });

  gameFlowSystem = createGameFlowSystem({
    getState,
    setState,
    makeState,
    width: WIDTH,
    height: HEIGHT,
    continuePromptSeconds: CONTINUE_PROMPT_SECONDS,
    newPlayer,
    hidePanels,
    showEndPanel,
    showStartPanel,
    showContinuePromptPanel,
    hideContinuePrompt,
    continueCountdown: elements.continueCountdown,
    clearInput: clearGameplayInput,
    bgm,
    ensureAudio,
    onSpawnWave: spawnWave,
    onRespawnBossCheckpoint: () => bossSystem.respawnAtBossCheckpoint(),
  });

  function updateEnemyWave(dt) {
    updateEnemyWaveSystem(state, dt, {
      WIDTH,
      HEIGHT,
      triggerLoss: gameFlowSystem.triggerLoss,
      shootEnemy: bossAttacks.shootEnemy,
      pick,
    });
  }

  function updatePowerups(dt) {
    updatePowerupsSystem(state, dt, {
      HEIGHT,
      overlaps,
      getPlayerHitbox,
      applyPowerupFn: playerSystem.applyPowerupToPlayer,
    });
  }

  function updateBullets(dt) {
    updateBulletsSystem(state, dt, { WIDTH, HEIGHT });
  }

  function handleCollisions() {
    handleCollisionsSystem(state, {
      overlaps,
      getPlayerHitbox,
      consumePlayerHit: playerSystem.consumePlayerHit,
      damageBoss: bossSystem.damageBoss,
      maybeDropPowerup,
      maybeDropWavePowerup,
      onEnemyExplosion: () => sfx.explosion(),
    });
  }

  const progressionSystem = createProgressionSystem({
    getState,
    totalWaves: TOTAL_WAVES,
    updatePlayer: playerSystem.updatePlayer,
    updateEnemyWave,
    updateBoss: bossSystem.updateBoss,
    updatePowerups,
    updateBullets,
    handleCollisions,
    onSpawnWave: spawnWave,
    onSpawnBoss: () => bossSystem.spawnBoss(),
  });

  function updateReveal(dt) {
    updateRevealSystem(state, dt, {
      clamp,
      composeFinalClue,
      showEndPanel,
    });
  }

  function updateContinuePrompt(dt) {
    updateContinuePromptSystem(state, dt, {
      continueCountdown: elements.continueCountdown,
      chooseContinueNo: gameFlowSystem.chooseContinueNo,
    });
  }

  function drawBackground() {
    drawBackgroundLayer({ ctx, width: WIDTH, height: HEIGHT, state, starField });
  }

  const entityRenderer = createEntityRenderer({
    ctx,
    getState,
    width: WIDTH,
    clamp,
    playerShipSprite,
    enemyWaveArt,
    eliteMinionSprite,
    colorByPower,
    iconByPower,
    playerSpriteImage: playerSprite.image,
    isPlayerSpriteReady: () => playerSprite.isReady,
    powerupSprites,
    bossSprites,
  });

  const hudRenderer = createHudRenderer({
    ctx,
    getState,
    width: WIDTH,
    height: HEIGHT,
    totalWaves: TOTAL_WAVES,
    colorByPower,
    bossLayerColors,
    clamp,
  });

  const sceneRenderer = createSceneRenderer({
    ctx,
    getState,
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

  const loopSystem = createLoopSystem({
    getState,
    refs,
    frameDt: FRAME_DT,
    clamp,
    updateStars: (dt) => updateStars(starField, dt, WIDTH, HEIGHT),
    updateHitFeedback: (dt) => updateHitFeedback(state.hitFx, dt),
    updatePlaying: progressionSystem.updatePlaying,
    updateContinuePrompt,
    updateReveal,
    render: () => sceneRenderer.render(),
  });

  bindKeyboardListeners({
    getState,
    onContinueYes: () => {
      void gameFlowSystem.chooseContinueYes();
    },
    onContinueNo: () => {
      void gameFlowSystem.chooseContinueNo();
    },
    onRestartFromEnd: () => {
      gameFlowSystem.restart();
    },
    onGameplayKeyChange: (code, down) => {
      onKeyChange(input, code, down);
    },
  });

  bindUiControls({
    embarkBtn: elements.embarkBtn,
    startBtn: elements.startBtn,
    restartBtn: elements.restartBtn,
    continueYesBtn: elements.continueYesBtn,
    continueNoBtn: elements.continueNoBtn,
    startPageEmbarkBtn: elements.startPageEmbarkBtn,
    startPageStartBtn: elements.startPageStartBtn,
    onEmbark: async () => {
      if (elements.embarkBtn.disabled) {
        return;
      }
      elements.embarkBtn.disabled = true;
      ensureAudio();
      const played = await bgm.play("start", { fadeMs: 0 });
      if (played) {
        unlockStartFlow();
        sfx.uiClick();
        return;
      }
      elements.embarkBtn.disabled = false;
    },
    onStart: () => {
      sfx.uiClick();
      gameFlowSystem.startGame();
    },
    onRestart: () => {
      sfx.uiClick();
      gameFlowSystem.restart();
    },
    onContinueYes: () => {
      void gameFlowSystem.chooseContinueYes();
    },
    onContinueNo: () => {
      void gameFlowSystem.chooseContinueNo();
    },
  });

  const renderGameToText = createStateSnapshotBuilder({
    getState,
    totalWaves: TOTAL_WAVES,
    getBgmTrack: () => bgm.currentTrack,
    getVolumeChannels: () => volumeChannels,
  });

  attachDebugHooks({ renderGameToText, advanceTime: loopSystem.advanceTime });
  runSanityChecks({ enabled: false });
  initializeVolumes();
  registerVolumeHandlers();
  bgm.preloadAll();

  showStartPanel();
  syncStartPagePlayState();
  sceneRenderer.render();
  if (refs.rafId) {
    cancelAnimationFrame(refs.rafId);
  }
  refs.rafId = requestAnimationFrame(loopSystem.gameLoop);
})();
