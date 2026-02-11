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
  const GAME_TITLE = "Starfall Protocol";
  const FRAME_DT = 1 / 60;
  const TOTAL_WAVES = 4;
  const CLASS_HIDDEN = "hidden";
  const CONTINUE_PROMPT_SECONDS = 10;
  const BOSS_LAYER_HP = [120, 130, 150, 170];
  const BOSS_CONFIG = {
    startX: WIDTH * 0.5,
    startY: 120,
    offscreenY: -170,
    baseW: 199,
    baseH: 112,
    baseSpeed: 130,
    initialShotTimer: 0.9,
    spawnMinionTimer: 3.6,
    retryMinionTimer: 4.2,
    phaseBannerTimer: 1.4,
    entranceDuration: 2.8,
    retryEntranceDuration: 2.25,
    entranceTargetY: 120,
    graceDuration: 1.25,
    initialRevealAlpha: 0.12,
    entranceRevealAlpha: 0.1,
    entranceShotTimer: 0.95,
  };
  const WAVE_DROP_PACING = {
    // Slightly lower than legacy pacing, with soft anti-streak control.
    baseChance: 3,
    waveChanceStep: 1.5,
    minChance: 3,
    maxChance: 7,

    minKillsBetweenDropsByWave: [0, 0, 0, 1, 1],
    cooldownSecondsByWave: [0, 0.1, 0.2, 0.3, 0.4],
  };
  const PLAYER_HIT_FX = {
    shakeDuration: 0.12,
    shakeAmplitude: 3,
    flashDuration: 0.1,
    flashAlpha: 0.28,
    flickerDuration: 0.16,
    retriggerCooldown: 0.11,
  };
  const POWERUP_DURATION_SECONDS = {
    rapid_fire: 10,
    spread_shot: 10,
  };

  const input = {
    left: false,
    right: false,
    shoot: false,
  };

  document.title = GAME_TITLE;

  const starField = Array.from({ length: 130 }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    r: Math.random() * 1.7 + 0.3,
    speed: Math.random() * 12 + 6,
  }));

  const colorByPower = {
    rapid_fire: "#f8f364",
    shield: "#5ef4ff",
    spread_shot: "#ff8ec4",
  };

  const iconByPower = {
    rapid_fire: "R",
    shield: "O",
    spread_shot: "S",
  };

  const enemyWaveArt = {
    wave1: {
      colors: {
        o: "#27163d",
        s: "#5a317e",
        m: "#8f3f8f",
        a: "#cf5f61",
        b: "#ffcf6c",
      },
      pattern: [
        "....bb....",
        "...babb...",
        "..bammba..",
        ".baommoab.",
        ".aomssmoa.",
        "..omssmo..",
        ".os....so.",
        "o.o....o.o",
        "..o....o..",
        ".o......o.",
      ],
    },
    wave2: {
      colors: {
        o: "#231338",
        s: "#4d2a74",
        m: "#7f3e96",
        a: "#ca5a5d",
        b: "#ffd56f",
      },
      pattern: [
        "...bb.bb..",
        "..bammmab.",
        ".bamsssmab",
        "baomsssmoa",
        ".aomsssmo.",
        "..ommmmo..",
        ".om.ssm.o.",
        "o..o..o..o",
        "..o.oo.o..",
        ".o......o.",
      ],
    },
    wave3: {
      colors: {
        o: "#2a001b",
        s: "#56002f",
        m: "#a50052",
        a: "#e31d4f",
        b: "#ff5da8",
      },
      pattern: [
        "..bbb.bb..",
        ".bbammbbb.",
        ".bamssmab.",
        "baomssmoab",
        "aomssssmoa",
        ".omssssmo.",
        "o..ommo..o",
        "...o..o...",
        "..o....o..",
        ".o......o.",
      ],
    },
    wave4: {
      colors: {
        o: "#220013",
        s: "#4a0028",
        m: "#8e0148",
        a: "#da1546",
        b: "#ff3f90",
      },
      pattern: [
        "..bb..bb..",
        ".bbammmbb.",
        "bammssmmab",
        "aomsssssmo",
        "omssssssmo",
        "aomsssssmo",
        ".oomm.mmoo",
        "..o.o.o.o.",
        ".o..o.o..o",
        "o........o",
      ],
    },
  };

  const playerShipSprite = {
    colors: {
      w: "#e8edf5",
      s: "#aeb7c9",
      d: "#1c2332",
      n: "#0a111f",
      b: "#1e3d99",
      c: "#59d7ff",
    },
    // 14 x 10, facing up, transparent background ('.')
    pattern: [
      "......ww......",
      ".....wccw.....",
      "....wsnnsw....",
      "...wsnbbnsw...",
      "..wsnbddbnsw..",
      ".wsnbddddbnsw.",
      "wsnbddbbddbnsw",
      ".dnnbbddbbnnd.",
      "..dnnnnnnnnd..",
      "...nn....nn...",
    ],
  };

  const bossShipSprite = {
    colors: {
      n: "#0a1020",
      d: "#143048",
      m: "#1fc48f",
      h: "#7fffd7",
      c: "#f0fff8",
      p: "#1f7a64",
    },
    // 16 x 16, facing down toward player, transparent background ('.')
    pattern: [
      "......nnnn......",
      ".....ndddn......",
      "....ndmmdn......",
      "...ndmhhmdn.....",
      "..ndmhcchmdn....",
      ".ndmhcccchmdn...",
      "ndmhhcccchhdmn..",
      "ndmmhdnnmhdmnn..",
      ".ndmhdnnmhdmn...",
      "..ndmdppdmnd....",
      ".ndmmdppdmmdn...",
      "ndmmdmppdmmmdn..",
      "nndmdmpppmdmdn..",
      ".nndmddddmdnn...",
      "..nnndnnndnn....",
      "...nn....nn.....",
    ],
  };

  const bossMutatedSprite = {
    colors: {
      n: "#060912",
      d: "#10283a",
      m: "#1bb287",
      h: "#78ffd4",
      c: "#f4fff9",
      p: "#1a6d57",
      e: "#ff4f92",
    },
    // 18 x 18, distorted/elongated mutated form ('.' transparent)
    pattern: [
      ".......nnnn.......",
      ".....nnndddnn.....",
      "....nnddmmddnn....",
      "...nndmhhhhmdnn...",
      "..nndmhhcchhmdnn..",
      ".nndmhhceecchmdnn.",
      "nndmhhccccechhmdnn",
      "nndmhhccnncchhmdnn",
      ".nndmhccnncchmdnn.",
      "..nndmcppppcmdnn..",
      ".nndmmcppppcmmdnn.",
      "nndmmdcppppcdmmdnn",
      "nndmdmcppppcdmddnn",
      ".nndmdcppppcdmdnn.",
      "..nndmddppddmdnn..",
      "...nndmddddmdnn...",
      "....nnndnnndnn....",
      ".....nn....nn.....",
    ],
  };

  const eliteMinionSprite = {
    colors: {
      n: "#0a1020",
      d: "#15364a",
      m: "#20ba8b",
      h: "#86ffe0",
    },
    pattern: [
      "..nnnn..",
      ".ndmmdn.",
      "ndmhhmdn",
      "ndmhhmdn",
      ".ndmmdn.",
      "..d..d..",
      ".d....d.",
      "d......d",
    ],
  };

  const bossLayerColors = ["#66ffe0", "#53c0ff", "#9286ff", "#ff5f97"];
  const BOSS_IMAGE_SRC = "./public/assets/images/boss.png";
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

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function applyBossScale(boss, scaleMultiplier) {
    const safeScale = Math.max(0.01, scaleMultiplier);
    boss.scaleMultiplier = safeScale;
    boss.w = BOSS_CONFIG.baseW * safeScale;
    boss.h = BOSS_CONFIG.baseH * safeScale;
  }

  function overlaps(a, b) {
    if (!a || !b) {
      return false;
    }
    return (
      a.x - a.w / 2 < b.x + b.w / 2 &&
      a.x + a.w / 2 > b.x - b.w / 2 &&
      a.y - a.h / 2 < b.y + b.h / 2 &&
      a.y + a.h / 2 > b.y - b.h / 2
    );
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function setHidden(element, hidden) {
    if (!element) {
      return;
    }
    element.classList.toggle(CLASS_HIDDEN, hidden);
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

  const BGM_VOLUME_STORAGE_KEY = "space_invader_bgm_volume";
  const SFX_VOLUME_STORAGE_KEY = "space_invader_sfx_volume";
  const DEFAULT_BGM_VOLUME = 0.6;
  const DEFAULT_SFX_VOLUME = 0.7;
  const volumeChannels = {
    bgm: DEFAULT_BGM_VOLUME,
    sfx: DEFAULT_SFX_VOLUME,
  };

  function readPersistedVolume(key, defaultValue) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) {
        return defaultValue;
      }
      const parsed = Number.parseFloat(raw);
      if (!Number.isFinite(parsed)) {
        return defaultValue;
      }
      return clamp(parsed, 0, 1);
    } catch {
      return defaultValue;
    }
  }

  function persistVolume(key, volume) {
    try {
      window.localStorage.setItem(key, String(volume));
    } catch {
      // Ignore localStorage failures to keep gameplay uninterrupted.
    }
  }

  function syncVolumeUi() {
    if (bgmVolumeSlider) {
      bgmVolumeSlider.value = String(Math.round(volumeChannels.bgm * 100));
    }
    if (bgmVolumeValue) {
      bgmVolumeValue.textContent = `${Math.round(volumeChannels.bgm * 100)}%`;
    }
    if (sfxVolumeSlider) {
      sfxVolumeSlider.value = String(Math.round(volumeChannels.sfx * 100));
    }
    if (sfxVolumeValue) {
      sfxVolumeValue.textContent = `${Math.round(volumeChannels.sfx * 100)}%`;
    }
  }

  function sleepMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const bgmTracks = {
    start: { src: "./public/assets/audio/Start.ogg", loop: true },
    wave: { src: "./public/assets/audio/Wave.ogg", loop: true },
    boss: { src: "./public/assets/audio/Boss Fight.ogg", loop: true },
    end: { src: "./public/assets/audio/End.ogg", loop: false },
    game_over: { src: "./public/assets/audio/game-over.ogg", loop: false },
  };

  const bgm = {
    currentAudio: null,
    currentTrack: "",
    transitionToken: 0,
    failedTracks: new Set(),
    log(message, payload) {
      const mode = typeof state !== "undefined" && state ? state.mode : "uninitialized";
      if (payload) {
        console.log(`[BGM] ${message}`, { mode, ...payload });
        return;
      }
      console.log(`[BGM] ${message}`, { mode });
    },
    async probeTrack(trackKey) {
      const track = bgmTracks[trackKey];
      if (!track || !window.fetch) {
        return;
      }
      try {
        const response = await fetch(track.src, { method: "GET", cache: "no-store" });
        this.log("Track fetch probe", { track: trackKey, src: track.src, status: response.status, ok: response.ok });
      } catch (error) {
        this.log("Track fetch probe failed", {
          track: trackKey,
          src: track.src,
          error: error && error.message ? error.message : String(error),
        });
      }
    },
    preloadAll() {
      for (const [trackKey, track] of Object.entries(bgmTracks)) {
        const preloadAudio = new Audio();
        preloadAudio.preload = "auto";
        preloadAudio.src = track.src;
        preloadAudio.addEventListener(
          "loadeddata",
          () => {
            this.log("Track loaded", { track: trackKey, src: track.src });
          },
          { once: true }
        );
        preloadAudio.addEventListener(
          "error",
          () => {
            this.log("Track load error", { track: trackKey, src: track.src });
          },
          { once: true }
        );
        preloadAudio.load();
        this.probeTrack(trackKey);
      }
    },
    async stop(options = {}) {
      const fadeMs = options.fadeMs || 0;
      const token = options.token;
      const audio = this.currentAudio;
      if (!audio) {
        this.currentTrack = "";
        return;
      }

      const originalVolume = audio.volume;
      if (fadeMs > 0 && !audio.paused) {
        const steps = Math.max(1, Math.floor(fadeMs / 40));
        for (let i = 1; i <= steps; i++) {
          if (typeof token === "number" && token !== this.transitionToken) {
            return;
          }
          audio.volume = originalVolume * (1 - i / steps);
          await sleepMs(fadeMs / steps);
        }
      }

      audio.pause();
      audio.currentTime = 0;
      audio.volume = originalVolume;
      if (this.currentAudio === audio) {
        this.currentAudio = null;
        this.currentTrack = "";
      }
    },
    async play(trackKey, options = {}) {
      const track = bgmTracks[trackKey];
      if (!track) {
        return false;
      }
      this.log("Attempting track play", { track: trackKey, src: track.src });
      if (
        this.currentTrack === trackKey &&
        this.currentAudio &&
        !this.currentAudio.paused
      ) {
        return true;
      }
      if (this.failedTracks.has(trackKey)) {
        return false;
      }

      const token = ++this.transitionToken;
      await this.stop({ fadeMs: options.fadeMs || 220, token });
      if (token !== this.transitionToken) {
        return false;
      }

      const nextAudio = new Audio(track.src);
      nextAudio.preload = "auto";
      nextAudio.loop = track.loop;
      nextAudio.volume = volumeChannels.bgm;
      nextAudio.addEventListener("loadeddata", () => {
        this.log("Active track loaded", { track: trackKey, src: track.src });
      });
      nextAudio.addEventListener(
        "error",
        () => {
          this.failedTracks.add(trackKey);
          this.log("Active track error", { track: trackKey, src: track.src });
        },
        { once: true }
      );

      this.currentAudio = nextAudio;
      this.currentTrack = trackKey;
      try {
        await nextAudio.play();
        if (token !== this.transitionToken) {
          nextAudio.pause();
          nextAudio.currentTime = 0;
          return false;
        }
        return true;
      } catch (error) {
        if (token !== this.transitionToken) {
          return false;
        }
        this.currentAudio = null;
        this.currentTrack = "";
        console.warn("[BGM] play() rejected", {
          track: trackKey,
          mode: state.mode,
          message: error && error.message ? error.message : String(error),
        });
        return false;
      }
    },
    applyMasterVolume() {
      if (this.currentAudio) {
        this.currentAudio.volume = volumeChannels.bgm;
      }
    },
  };

  let audioCtx = null;

  function ensureAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  function playTone(freq, duration, type, gainLevel, sweepTo) {
    if (!audioCtx) {
      return;
    }
    const effectiveGain = gainLevel * volumeChannels.sfx;
    if (effectiveGain <= 0) {
      return;
    }
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (typeof sweepTo === "number") {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, sweepTo), now + duration);
    }
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(effectiveGain, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  const sfx = {
    shoot() {
      playTone(620, 0.08, "square", 0.05, 460);
    },
    explosion() {
      playTone(220, 0.18, "sawtooth", 0.08, 70);
    },
    pickup() {
      playTone(340, 0.12, "triangle", 0.06, 680);
    },
    bossDefeat() {
      playTone(150, 0.36, "sawtooth", 0.09, 60);
      playTone(420, 0.28, "square", 0.05, 120);
    },
    uiClick() {
      playTone(500, 0.07, "square", 0.04, 700);
    },
  };

  function newPlayer() {
    return {
      x: WIDTH * 0.5,
      y: HEIGHT - 56,
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

  function makeState() {
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
      player: newPlayer(),
      loopTime: 0,
    };
  }

  let state = makeState();
  let rafId = null;
  let deterministicMode = false;

  function spawnWave(waveNumber) {
    const rows = 2 + waveNumber;
    const cols = 7 + waveNumber;
    const startX = 108;
    const startY = 86;
    const gapX = 72;
    const gapY = 56;
    const waveVisualMap = {
      1: "wave1",
      2: "wave2",
      3: "wave3",
      4: "wave4",
    };
    const visualVariant = waveVisualMap[waveNumber] || "wave4";
    state.enemies = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        state.enemies.push({
          x: startX + col * gapX,
          y: startY + row * gapY,
          w: 34,
          h: 24,
          alive: true,
          visualVariant,
          animPhase: Math.random() * Math.PI * 2,
          shotBias: 0.8 + Math.random() * 0.5,
        });
      }
    }
    state.enemyDir = 1;
    state.enemySpeed = 54 + waveNumber * 16;
    state.enemyShotTimer = Math.max(0.25, 1.15 - waveNumber * 0.17);
    const waveIndex = clamp(Math.floor(waveNumber), 1, TOTAL_WAVES);
    state.waveDropCooldown = 0;
    // Keep onboarding generous while still enforcing streak protection.
    state.waveKillsSinceDrop = WAVE_DROP_PACING.minKillsBetweenDropsByWave[waveIndex];
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
    state = makeState();
    state.mode = "playing";
    spawnWave(state.wave);
    hidePanels();
  }

  function hidePanels() {
    setHidden(startScreen, true);
    setHidden(endScreen, true);
    setHidden(continueScreen, true);
  }

  function lockStartFlow() {
    if (embarkBtn) {
      setHidden(embarkBtn, false);
      embarkBtn.disabled = false;
    }
    setHidden(startBtn, true);
    startBtn.disabled = true;
    syncStartPagePlayState();
  }

  function unlockStartFlow() {
    if (embarkBtn) {
      setHidden(embarkBtn, true);
      embarkBtn.disabled = true;
    }
    setHidden(startBtn, false);
    startBtn.disabled = false;
    syncStartPagePlayState();
  }

  function showStartPanel() {
    setHidden(startScreen, false);
    setHidden(endScreen, true);
    setHidden(continueScreen, true);
    lockStartFlow();
    syncStartPagePlayState();
  }

  function showEndPanel() {
    setHidden(endScreen, false);
    setHidden(startScreen, true);
    setHidden(continueScreen, true);
    if (state.endReason === "win") {
      endTitle.textContent = "Mission Complete";
      endMessage.textContent = `Final clue: ${state.revealedClue}`;
    } else {
      endTitle.textContent = "Mission Failed";
      endMessage.textContent = "The invasion reached your sector.";
    }
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
    setHidden(continueScreen, false);
    if (continueCountdown) {
      continueCountdown.textContent = String(CONTINUE_PROMPT_SECONDS);
    }
    if (shouldPlayGameOver) {
      bgm.play("game_over", { fadeMs: 160 });
    } else {
      bgm.stop({ fadeMs: 180 });
    }
  }

  function hideContinuePrompt() {
    setHidden(continueScreen, true);
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
    state.player = newPlayer();
    state.player.x = BOSS_CONFIG.startX;
    state.player.y = HEIGHT - 56;
    state.bulletsPlayer = [];
    state.bulletsEnemy = [];
    state.powerups = [];
    resetBossToInitialPhase(state.boss);
    beginBossEntrance(state.boss, true);
  }

  function triggerBossDefeat() {
    state.mode = "reveal";
    state.revealTimer = 0;
    state.transitionAlpha = 0;
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
    boss.flashTimer = 0;
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
    boss.flashTimer = 0;

    if (layer.hp <= 0) {
      handleBossLayerBreak(boss);
    }
    return true;
  }

  function maybeDropPowerup(x, y, waveHint) {
    const baseChance = 0.14;
    const scaledChance = clamp(baseChance + waveHint * 0.018, 0.14, 0.34);
    if (Math.random() > scaledChance) {
      return;
    }
    const type = pick(["rapid_fire", "shield", "spread_shot"]);
    state.powerups.push({
      x,
      y,
      w: 24,
      h: 24,
      vy: 82,
      type,
    });
  }

  function maybeDropWavePowerup(x, y) {
    if (state.boss || state.mode !== "playing") {
      return;
    }
    const waveIndex = clamp(Math.floor(state.wave), 1, TOTAL_WAVES);
    if (state.waveDropCooldown > 0) {
      return;
    }
    const minKills = WAVE_DROP_PACING.minKillsBetweenDropsByWave[waveIndex];
    if (state.waveKillsSinceDrop < minKills) {
      return;
    }
    const chance = clamp(
      WAVE_DROP_PACING.baseChance + waveIndex * WAVE_DROP_PACING.waveChanceStep,
      WAVE_DROP_PACING.minChance,
      WAVE_DROP_PACING.maxChance
    );
    if (Math.random() > chance) {
      return;
    }
    maybeDropPowerup(x, y, waveIndex);
    state.waveDropCooldown = WAVE_DROP_PACING.cooldownSecondsByWave[waveIndex];
    state.waveKillsSinceDrop = 0;
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
    const player = state.player;
    if (type === "rapid_fire") {
      player.rapid.active = true;
      player.rapid.duration += POWERUP_DURATION_SECONDS.rapid_fire;
      player.rapid.level = clamp(player.rapid.level + 1, 1, 3);
    } else if (type === "spread_shot") {
      player.spread.active = true;
      player.spread.duration += POWERUP_DURATION_SECONDS.spread_shot;
      player.spread.level = clamp(player.spread.level + 1, 1, 3);
    } else if (type === "shield") {
      player.shieldHits += 2;
    }
    sfx.pickup();
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
    if (!state.enemies.length) {
      return;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    for (const enemy of state.enemies) {
      if (!enemy.alive) {
        continue;
      }
      enemy.x += state.enemyDir * state.enemySpeed * dt;
      minX = Math.min(minX, enemy.x - enemy.w / 2);
      maxX = Math.max(maxX, enemy.x + enemy.w / 2);
    }

    if (minX <= 40 || maxX >= WIDTH - 40) {
      state.enemyDir *= -1;
      for (const enemy of state.enemies) {
        if (enemy.alive) {
          enemy.y += state.enemyDescend;
        }
      }
    }

    const reachesPlayer = state.enemies.some(
      (enemy) => enemy.alive && enemy.y + enemy.h / 2 >= state.player.y - 18
    );
    if (reachesPlayer) {
      triggerLoss();
      return;
    }

    state.enemyShotTimer -= dt;
    if (state.enemyShotTimer <= 0) {
      const alive = state.enemies.filter((enemy) => enemy.alive);
      if (alive.length > 0) {
        const shooter = pick(alive);
        shootEnemy(shooter.x, shooter.y, 1 + state.wave * 0.12);
      }
      state.enemyShotTimer = Math.max(0.22, 1.08 - state.wave * 0.15);
    }
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
    for (const p of state.powerups) {
      p.y += p.vy * dt;
    }
    state.powerups = state.powerups.filter((p) => p.y < HEIGHT + 40);

    for (let i = state.powerups.length - 1; i >= 0; i--) {
      const p = state.powerups[i];
      if (overlaps(p, getPlayerHitbox())) {
        state.powerups.splice(i, 1);
        applyPowerup(p.type);
      }
    }
  }

  function updateBullets(dt) {
    for (const b of state.bulletsPlayer) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    for (const b of state.bulletsEnemy) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    state.bulletsPlayer = state.bulletsPlayer.filter(
      (b) => b.y > -40 && b.y < HEIGHT + 40 && b.x > -40 && b.x < WIDTH + 40
    );
    state.bulletsEnemy = state.bulletsEnemy.filter(
      (b) => b.y > -40 && b.y < HEIGHT + 40 && b.x > -40 && b.x < WIDTH + 40
    );
  }

  function handleCollisions() {
    const playerBox = getPlayerHitbox();

    for (let i = state.bulletsEnemy.length - 1; i >= 0; i--) {
      const bullet = state.bulletsEnemy[i];
      if (overlaps(bullet, playerBox)) {
        state.bulletsEnemy.splice(i, 1);
        consumePlayerHit(bullet.damage || 1);
        if (state.mode !== "playing") {
          return;
        }
      }
    }

    for (let i = state.bulletsPlayer.length - 1; i >= 0; i--) {
      const bullet = state.bulletsPlayer[i];
      let hitSomething = false;

      if (state.boss) {
        for (let m = state.bossMinions.length - 1; m >= 0; m--) {
          const minion = state.bossMinions[m];
          if (overlaps(bullet, minion)) {
            minion.hp -= 8;
            hitSomething = true;
            if (minion.hp <= 0) {
              state.bossMinions.splice(m, 1);
              state.score += 150;
              maybeDropPowerup(minion.x, minion.y, state.wave + 2);
            }
            break;
          }
        }
        if (
          !hitSomething &&
          overlaps(bullet, {
            x: state.boss.x,
            y: state.boss.y,
            w: state.boss.w,
            h: state.boss.h,
          })
        ) {
          damageBoss(4);
          hitSomething = true;
        }
      } else {
        for (const enemy of state.enemies) {
          if (!enemy.alive) {
            continue;
          }
          if (overlaps(bullet, enemy)) {
            enemy.alive = false;
            state.score += 100;
            state.waveKillsSinceDrop += 1;
            maybeDropWavePowerup(enemy.x, enemy.y);
            sfx.explosion();
            hitSomething = true;
            break;
          }
        }
      }

      if (hitSomething) {
        state.bulletsPlayer.splice(i, 1);
      }
    }

    state.enemies = state.enemies.filter((enemy) => enemy.alive);
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
    state.revealTimer += dt;
    state.transitionAlpha = clamp(state.transitionAlpha + dt * 0.6, 0, 1);
    if (!state.revealedClue && state.revealTimer > 1.4) {
      state.revealedClue = composeFinalClue();
    }
    if (state.revealTimer > 4.6) {
      state.mode = "end";
      state.endReason = "win";
      showEndPanel();
    }
  }

  function updateContinuePrompt(dt) {
    state.continueTimer = Math.max(0, state.continueTimer - dt);
    if (continueCountdown) {
      continueCountdown.textContent = String(Math.ceil(state.continueTimer));
    }
    if (state.continueTimer <= 0) {
      void chooseContinueNo();
    }
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
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, "#04071d");
    gradient.addColorStop(1, "#0c1033");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    for (const star of starField) {
      ctx.fillStyle = `rgba(188, 225, 255, ${0.45 + (star.r % 1) * 0.5})`;
      ctx.fillRect(star.x, star.y, star.r, star.r);
    }

    if (state.boss) {
      const boss = state.boss;
      if (boss.entranceActive) {
        const t = 1 - boss.entranceTimer / Math.max(0.001, boss.entranceDuration);
        const pulse = 0.08 + Math.sin(state.loopTime * 4) * 0.03;
        ctx.fillStyle = `rgba(8, 12, 26, ${0.28 + pulse + (1 - t) * 0.2})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      } else if (boss.graceActive) {
        const glow = 0.07 + Math.sin(state.loopTime * 10) * 0.03;
        ctx.fillStyle = `rgba(120, 176, 255, ${glow})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      } else if (boss.evolving) {
        ctx.fillStyle = `rgba(132, 36, 92, ${0.12 + boss.flickerAlpha * 0.35})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      } else if (boss.enraged) {
        ctx.fillStyle = "rgba(96, 18, 52, 0.12)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      } else if (boss.mutated) {
        ctx.fillStyle = "rgba(24, 92, 78, 0.08)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }

      if (boss.evolving || boss.enraged) {
        const lines = boss.evolving ? 8 : 5;
        for (let i = 0; i < lines; i++) {
          const y = (state.loopTime * (boss.evolving ? 120 : 70) + i * 90) % HEIGHT;
          ctx.fillStyle = boss.evolving
            ? `rgba(178, 255, 228, ${0.05 + boss.flickerAlpha * 0.18})`
            : "rgba(255, 140, 186, 0.05)";
          ctx.fillRect(0, y, WIDTH, 2);
        }
      }

      if (boss.entranceActive) {
        for (let i = 0; i < 5; i++) {
          const y = (state.loopTime * 60 + i * 128) % HEIGHT;
          ctx.fillStyle = "rgba(90, 130, 188, 0.06)";
          ctx.fillRect(0, y, WIDTH, 3);
        }
      }
    }
  }

  function drawPlayer() {
    const p = state.player;
    const flickerAlpha =
      state.hitFx && state.hitFx.flickerTimer > 0
        ? (Math.sin(state.loopTime * 90) > 0 ? 0.28 : 1)
        : 1;
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = flickerAlpha;
    if (p.shieldHits > 0) {
      ctx.strokeStyle = "#60f7ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 34, 0, Math.PI * 2);
      ctx.stroke();
    }

    const pattern = playerShipSprite.pattern;
    const rows = pattern.length;
    const cols = pattern[0].length;
    const pixelSize = 3;
    const spriteW = cols * pixelSize;
    const spriteH = rows * pixelSize;
    const ox = p.x - spriteW * 0.5;
    const oy = p.y - spriteH * 0.5;

    for (let py = 0; py < rows; py++) {
      const row = pattern[py];
      for (let px = 0; px < cols; px++) {
        const token = row[px];
        if (token === ".") {
          continue;
        }
        const color = playerShipSprite.colors[token];
        if (!color) {
          continue;
        }
        ctx.fillStyle = color;
        ctx.fillRect(ox + px * pixelSize, oy + py * pixelSize, pixelSize, pixelSize);
      }
    }
    ctx.globalAlpha = prevAlpha;
  }

  function drawEnemies() {
    function drawEnemySprite(enemy) {
      const sprite = enemyWaveArt[enemy.visualVariant] || enemyWaveArt.wave1;
      const pattern = sprite.pattern;
      const rows = pattern.length;
      const cols = pattern[0].length;
      const pixelSize = 2;
      const spriteW = cols * pixelSize;
      const spriteH = rows * pixelSize;
      const bob = Math.sin(state.loopTime * 6 + enemy.animPhase) * 1.2;
      const ox = enemy.x - spriteW * 0.5;
      const oy = enemy.y - spriteH * 0.5 + bob;

      for (let py = 0; py < rows; py++) {
        const row = pattern[py];
        for (let px = 0; px < cols; px++) {
          const token = row[px];
          if (token === ".") {
            continue;
          }
          const color = sprite.colors[token];
          if (!color) {
            continue;
          }
          ctx.fillStyle = color;
          ctx.fillRect(ox + px * pixelSize, oy + py * pixelSize, pixelSize, pixelSize);
        }
      }
    }

    for (const enemy of state.enemies) {
      drawEnemySprite(enemy);
    }
  }

  function drawPixelSprite(sprite, centerX, centerY, pixelSize, alpha = 1) {
    const pattern = sprite.pattern;
    const rows = pattern.length;
    const cols = pattern[0].length;
    const spriteW = cols * pixelSize;
    const spriteH = rows * pixelSize;
    const ox = centerX - spriteW * 0.5;
    const oy = centerY - spriteH * 0.5;
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = clamp(alpha, 0, 1);
    for (let py = 0; py < rows; py++) {
      const row = pattern[py];
      for (let px = 0; px < cols; px++) {
        const token = row[px];
        if (token === ".") {
          continue;
        }
        const color = sprite.colors[token];
        if (!color) {
          continue;
        }
        ctx.fillStyle = color;
        ctx.fillRect(ox + px * pixelSize, oy + py * pixelSize, pixelSize, pixelSize);
      }
    }
    ctx.globalAlpha = prevAlpha;
  }

  function drawBossImage(centerX, centerY, width, height, alpha = 1) {
    if (!isBossSpriteReady) {
      return;
    }
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.drawImage(
      bossSpriteImage,
      centerX - width * 0.5,
      centerY - height * 0.5,
      width,
      height
    );
    ctx.globalAlpha = prevAlpha;
  }

  function drawBoss() {
    if (!state.boss) {
      return;
    }
    const b = state.boss;

    if (b.entranceActive) {
      const silhouetteAlpha = clamp(0.55 + (1 - b.revealAlpha) * 0.35, 0.35, 0.9);
      ctx.fillStyle = `rgba(4, 8, 20, ${silhouetteAlpha})`;
      ctx.fillRect(b.x - b.w * 0.55, b.y - b.h * 0.55, b.w * 1.1, b.h * 1.1);
    }

    if (b.windupTimer > 0 && b.windupDuration > 0) {
      const ratio = clamp(b.windupTimer / b.windupDuration, 0, 1);
      const cueColor =
        b.windupType === "enraged"
          ? "255, 92, 148"
          : b.windupType === "mutant"
            ? "112, 255, 218"
            : "174, 220, 255";
      ctx.strokeStyle = `rgba(${cueColor}, ${0.25 + (1 - ratio) * 0.45})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(
        b.x,
        b.y + b.h * 0.12,
        b.w * (0.25 + (1 - ratio) * 0.25),
        b.h * (0.12 + (1 - ratio) * 0.08),
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    if (b.shieldTimer > 0) {
      const shieldPulse = 0.55 + Math.sin(state.loopTime * 24) * 0.2;
      ctx.strokeStyle = `rgba(147, 228, 255, ${shieldPulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.w * 0.38, b.h * 0.34, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (b.evolving) {
      const progress = clamp(b.mutationProgress, 0, 1);
      const jitterX = (Math.random() - 0.5) * (3 + progress * 4);
      const jitterY = (Math.random() - 0.5) * (3 + progress * 4);
      const evolvingScale = 1 + progress * 0.45;
      drawBossImage(b.x, b.y, b.w, b.h, (1 - progress * 0.65) * (b.entranceActive ? b.revealAlpha : 1));
      drawBossImage(
        b.x + jitterX,
        b.y + jitterY,
        b.w * evolvingScale,
        b.h * evolvingScale,
        0.22 + progress * 0.78
      );
    } else if (b.mutated) {
      const mutatedScale = b.enraged ? 1.45 : 1.3;
      drawBossImage(
        b.x,
        b.y,
        b.w * mutatedScale,
        b.h * mutatedScale,
        b.entranceActive ? b.revealAlpha : 1
      );
    } else {
      drawBossImage(b.x, b.y, b.w, b.h, b.entranceActive ? b.revealAlpha : 1);
    }

    for (const particle of b.particles) {
      ctx.fillStyle = particle.color;
      ctx.fillRect(
        particle.x - particle.size * 0.5,
        particle.y - particle.size * 0.5,
        particle.size,
        particle.size
      );
    }
  }

  function drawBossMinions() {
    for (const minion of state.bossMinions) {
      const pulse = Math.sin(state.loopTime * 10 + minion.pulse);
      const pixelSize = pulse > 0 ? 4 : 3;
      drawPixelSprite(eliteMinionSprite, minion.x, minion.y, pixelSize, 1);
      if (state.boss && state.boss.enraged) {
        ctx.strokeStyle = "rgba(255, 138, 188, 0.45)";
        ctx.strokeRect(
          minion.x - minion.w * 0.5 - 2,
          minion.y - minion.h * 0.5 - 2,
          minion.w + 4,
          minion.h + 4
        );
      }
    }
  }

  function drawBullets() {
    ctx.fillStyle = "#ccfbff";
    for (const bullet of state.bulletsPlayer) {
      ctx.fillRect(bullet.x - bullet.w / 2, bullet.y - bullet.h / 2, bullet.w, bullet.h);
    }
    ctx.fillStyle = "#ffac58";
    for (const bullet of state.bulletsEnemy) {
      ctx.fillRect(bullet.x - bullet.w / 2, bullet.y - bullet.h / 2, bullet.w, bullet.h);
    }
  }

  function drawPowerups() {
    for (const p of state.powerups) {
      ctx.fillStyle = colorByPower[p.type];
      ctx.fillRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
      ctx.fillStyle = "#102033";
      ctx.font = 'bold 16px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.fillText(iconByPower[p.type], p.x, p.y + 5);
    }
  }

  function drawHud() {
    ctx.fillStyle = "#e8f5ff";
    ctx.font = '18px "Press Start 2P", monospace';
    ctx.textAlign = "left";
    ctx.fillText(`Lives: ${state.player.lives}`, 20, 30);
    ctx.fillText(`Score: ${state.score}`, 20, 56);
    ctx.fillText(`Wave: ${state.boss ? "Boss" : state.wave + "/" + TOTAL_WAVES}`, 20, 82);

    let x = 20;
    const y = 106;
    const active = [];
    if (state.player.rapid.active) {
      active.push({ key: "rapid_fire", label: `R ${state.player.rapid.level}`, t: state.player.rapid.duration });
    }
    if (state.player.spread.active) {
      active.push({
        key: "spread_shot",
        label: `S ${state.player.spread.level}`,
        t: state.player.spread.duration,
      });
    }
    if (state.player.shieldHits > 0) {
      active.push({ key: "shield", label: `O ${state.player.shieldHits}`, t: 1 });
    }

    for (const item of active) {
      ctx.fillStyle = "rgba(7, 15, 36, 0.8)";
      ctx.fillRect(x, y, 120, 22);
      ctx.strokeStyle = colorByPower[item.key];
      ctx.strokeRect(x, y, 120, 22);
      ctx.fillStyle = colorByPower[item.key];
      ctx.font = '13px "Press Start 2P", monospace';
      ctx.fillText(item.label, x + 8, y + 15);
      if (item.key !== "shield") {
        const width = clamp(item.t / 14, 0, 1) * 56;
        ctx.fillRect(x + 56, y + 8, width, 6);
      }
      x += 128;
    }

    if (state.boss) {
      const boss = state.boss;
      const pad = 170;
      const barW = WIDTH - pad * 2;
      const barH = 12;
      const overlap = 5;
      const stackBaseY = 18;

      for (let i = boss.layers.length - 1; i >= 0; i--) {
        const y = stackBaseY + (boss.layers.length - 1 - i) * overlap;
        const layer = boss.layers[i];
        const isActive = i === boss.currentLayer;
        const isBroken = i < boss.currentLayer;
        const ratio = isBroken ? 0 : isActive ? clamp(layer.hp / layer.max, 0, 1) : 1;
        const baseAlpha = isBroken ? 0.2 : isActive ? 0.95 : 0.6;
        ctx.fillStyle = `rgba(7, 12, 24, ${0.72 + (1 - baseAlpha) * 0.2})`;
        ctx.fillRect(pad, y, barW, barH);
        ctx.fillStyle = bossLayerColors[i] || "#ff6fa4";
        ctx.globalAlpha = baseAlpha;
        ctx.fillRect(pad, y, barW * ratio, barH);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = isActive ? "#f6ffff" : "rgba(210, 232, 255, 0.45)";
        ctx.strokeRect(pad, y, barW, barH);

        if (isActive && boss.layerBreakFxTimer > 0) {
          const crackAlpha = clamp(boss.layerBreakFxTimer / 1.15, 0, 1) * 0.42;
          ctx.fillStyle = `rgba(255,255,255,${crackAlpha})`;
          ctx.fillRect(pad, y, barW, barH);
          ctx.strokeStyle = `rgba(255,180,214,${crackAlpha})`;
          ctx.beginPath();
          const crackX = pad + barW * (1 - ratio);
          ctx.moveTo(crackX, y - 2);
          ctx.lineTo(crackX + 8, y + barH * 0.35);
          ctx.lineTo(crackX - 6, y + barH + 2);
          ctx.stroke();
        }
      }

      const remainingLayers = boss.layers.length - boss.currentLayer;
      ctx.fillStyle = "#f1fbff";
      ctx.font = '13px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.fillText(`BOSS LAYERS ${remainingLayers}`, WIDTH / 2, 12);

      const markerSize = 10;
      const markerGap = 6;
      const markerStartX =
        WIDTH / 2 - ((markerSize + markerGap) * boss.layers.length - markerGap) * 0.5;
      const markerY = stackBaseY + boss.layers.length * overlap + barH + 8;
      for (let i = 0; i < boss.layers.length; i++) {
        const alive = i >= boss.currentLayer;
        ctx.fillStyle = alive ? bossLayerColors[i] || "#ff6fa4" : "rgba(56,66,92,0.6)";
        ctx.fillRect(markerStartX + i * (markerSize + markerGap), markerY, markerSize, markerSize);
        ctx.strokeStyle = "rgba(220,236,255,0.5)";
        ctx.strokeRect(markerStartX + i * (markerSize + markerGap), markerY, markerSize, markerSize);
      }

      if (boss.phaseBannerTimer > 0) {
        const phaseText = boss.evolving
          ? "EVOLUTION"
          : boss.entranceActive
            ? "THREAT APPROACHING"
            : boss.graceActive
              ? "STABILIZE"
          : boss.enraged
            ? "ENRAGED CORE"
            : `PHASE ${boss.currentLayer + 1}`;
        const alpha = clamp(boss.phaseBannerTimer / 1.4, 0, 1);
        ctx.fillStyle = `rgba(10,15,36,${0.35 + alpha * 0.35})`;
        ctx.fillRect(WIDTH / 2 - 180, 76, 360, 26);
        ctx.fillStyle = `rgba(255,244,252,${0.5 + alpha * 0.5})`;
        ctx.font = '14px "Press Start 2P", monospace';
        ctx.textAlign = "center";
        ctx.fillText(phaseText, WIDTH / 2, 94);
      }

      if (boss.graceActive) {
        ctx.fillStyle = "rgba(186, 228, 255, 0.95)";
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = "center";
        const remain = Math.max(0, boss.graceTimer).toFixed(1);
        ctx.fillText(`GRACE ${remain}s`, WIDTH / 2, 120);
      }
    }
  }

  function drawRevealOverlay() {
    if (state.mode !== "reveal" && !(state.mode === "end" && state.endReason === "win")) {
      return;
    }
    const alpha = state.mode === "reveal" ? clamp(0.25 + state.transitionAlpha * 0.55, 0, 0.85) : 0.72;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (state.revealedClue) {
      ctx.fillStyle = "#111932";
      ctx.font = 'bold 52px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.fillText(state.revealedClue, WIDTH / 2, HEIGHT / 2);
    }
  }

  function render() {
    drawBackground();

    if (state.mode === "start") {
      return;
    }

    if (state.mode === "playing" || state.mode === "reveal" || state.mode === "continue_prompt") {
      const boss = state.boss;
      const bossShake =
        boss && (boss.evolving || boss.enraged || boss.layerBreakFxTimer > 0)
          ? Math.max(0, boss.shakeAmount || 0)
          : 0;
      const hitShake =
        state.hitFx && state.hitFx.shakeTimer > 0
          ? PLAYER_HIT_FX.shakeAmplitude * (state.hitFx.shakeTimer / PLAYER_HIT_FX.shakeDuration)
          : 0;
      const shake = Math.min(4, bossShake + hitShake);
      ctx.save();
      if (shake > 0.01) {
        const offsetX = (Math.random() - 0.5) * shake * 2;
        const offsetY = (Math.random() - 0.5) * shake * 2;
        ctx.translate(offsetX, offsetY);
      }
      drawPowerups();
      drawEnemies();
      drawBoss();
      drawBossMinions();
      drawBullets();
      drawPlayer();
      ctx.restore();

      if (boss && boss.evolving) {
        const flashAlpha = 0.05 + boss.flickerAlpha * 0.48;
        ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      } else if (boss && boss.mutated) {
        ctx.fillStyle = boss.enraged ? "rgba(255,60,132,0.06)" : "rgba(94,255,214,0.04)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }

      drawHud();

      if (state.hitFx && state.hitFx.flashTimer > 0) {
        const alpha =
          PLAYER_HIT_FX.flashAlpha *
          (state.hitFx.flashTimer / PLAYER_HIT_FX.flashDuration);
        ctx.fillStyle = `rgba(255, 82, 82, ${clamp(alpha, 0, 0.4)})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }
    }

    if (state.mode === "reveal") {
      drawRevealOverlay();
    }

    if (state.mode === "end") {
      if (state.endReason === "win") {
        drawRevealOverlay();
      }
      drawHud();
    }
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
    state = makeState();
    state.mode = "start";
    showStartPanel();
  }

  function onKeyChange(code, down) {
    if (code === "ArrowLeft") {
      input.left = down;
    }
    if (code === "ArrowRight") {
      input.right = down;
    }
    if (code === "Space") {
      input.shoot = down;
    }
  }

  window.addEventListener("keydown", (event) => {
    if (state.mode === "continue_prompt") {
      if (event.code === "KeyY" || event.code === "Enter") {
        void chooseContinueYes();
      } else if (event.code === "KeyN" || event.code === "Escape") {
        void chooseContinueNo();
      }
      return;
    }
    if (event.code === "Enter") {
      if (state.mode === "end") {
        restart();
      }
    }
    if (state.mode === "reveal") {
      return;
    }
    if (state.mode !== "playing") {
      return;
    }
    onKeyChange(event.code, true);
  });

  window.addEventListener("keyup", (event) => {
    if (state.mode !== "playing") {
      return;
    }
    onKeyChange(event.code, false);
  });

  if (embarkBtn) {
    embarkBtn.addEventListener("click", async () => {
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
    });
  }

  startBtn.addEventListener("click", () => {
    sfx.uiClick();
    startGame();
  });

  restartBtn.addEventListener("click", () => {
    sfx.uiClick();
    restart();
  });

  if (continueYesBtn) {
    continueYesBtn.addEventListener("click", () => {
      void chooseContinueYes();
    });
  }
  if (continueNoBtn) {
    continueNoBtn.addEventListener("click", () => {
      void chooseContinueNo();
    });
  }

  function syncStartPagePlayState() {
    if (!startPageEmbarkWrap || !startPageStartWrap) {
      return;
    }
    const readyToStart = !startBtn.disabled;
    startPageEmbarkWrap.classList.toggle("hidden", readyToStart);
    startPageStartWrap.classList.toggle("hidden", !readyToStart);
  }

  if (startPageEmbarkBtn) {
    startPageEmbarkBtn.addEventListener("click", () => {
      embarkBtn.click();
    });
  }

  if (startPageStartBtn) {
    startPageStartBtn.addEventListener("click", () => {
      startBtn.click();
    });
  }

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

  function setBgmVolume(nextValue) {
    volumeChannels.bgm = clamp(nextValue, 0, 1);
    bgm.applyMasterVolume();
    syncVolumeUi();
    persistVolume(BGM_VOLUME_STORAGE_KEY, volumeChannels.bgm);
  }

  function registerVolumeHandlers() {
    if (bgmVolumeSlider) {
      bgmVolumeSlider.addEventListener("input", () => {
        const parsed = Number.parseFloat(bgmVolumeSlider.value);
        if (!Number.isFinite(parsed)) {
          return;
        }
        setBgmVolume(parsed / 100);
      });
    }
    if (sfxVolumeSlider) {
      sfxVolumeSlider.addEventListener("input", () => {
        const parsed = Number.parseFloat(sfxVolumeSlider.value);
        if (!Number.isFinite(parsed)) {
          return;
        }
        setSfxVolume(parsed / 100);
      });
    }
  }

  function setSfxVolume(nextValue) {
    volumeChannels.sfx = clamp(nextValue, 0, 1);
    syncVolumeUi();
    persistVolume(SFX_VOLUME_STORAGE_KEY, volumeChannels.sfx);
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

  window.render_game_to_text = renderGameToText;
  window.advanceTime = advanceTime;
  setBgmVolume(readPersistedVolume(BGM_VOLUME_STORAGE_KEY, DEFAULT_BGM_VOLUME));
  setSfxVolume(readPersistedVolume(SFX_VOLUME_STORAGE_KEY, DEFAULT_SFX_VOLUME));
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
