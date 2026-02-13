export function createRuntimeContext({
  gameTitle,
  bossImageSrc,
  bossImageSources,
  playerImageSrc,
  powerupImageSources,
}) {
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");

  const elements = {
    startScreen: document.getElementById("start-screen"),
    endScreen: document.getElementById("end-screen"),
    startPageEmbarkWrap: document.getElementById("startpage-embark-wrap"),
    startPageStartWrap: document.getElementById("startpage-start-wrap"),
    startPageEmbarkBtn: document.getElementById("startpage-embark-btn"),
    startPageStartBtn: document.getElementById("startpage-start-btn"),
    embarkBtn: document.getElementById("embark-btn"),
    startBtn: document.getElementById("start-btn"),
    restartBtn: document.getElementById("restart-btn"),
    endTitle: document.getElementById("end-title"),
    endMessage: document.getElementById("end-message"),
    continueScreen: document.getElementById("continue-screen"),
    continueCountdown: document.getElementById("continue-countdown"),
    continueYesBtn: document.getElementById("continue-yes-btn"),
    continueNoBtn: document.getElementById("continue-no-btn"),
    bgmVolumeSlider: document.getElementById("bgm-volume-slider"),
    bgmVolumeValue: document.getElementById("bgm-volume-value"),
    sfxVolumeSlider: document.getElementById("sfx-volume-slider"),
    sfxVolumeValue: document.getElementById("sfx-volume-value"),
  };

  const dimensions = {
    WIDTH: canvas.width,
    HEIGHT: canvas.height,
  };

  document.title = gameTitle;

  const starField = Array.from({ length: 130 }, () => ({
    x: Math.random() * dimensions.WIDTH,
    y: Math.random() * dimensions.HEIGHT,
    r: Math.random() * 1.7 + 0.3,
    speed: Math.random() * 12 + 6,
  }));

  const normalizedBossImageSources =
    bossImageSources && typeof bossImageSources === "object"
      ? bossImageSources
      : {
          phase1: bossImageSrc,
          phase2: bossImageSrc,
          phase3: bossImageSrc,
        };

  const bossSprites = {};
  for (const [phase, src] of Object.entries(normalizedBossImageSources)) {
    const image = new Image();
    const sprite = {
      isReady: false,
      image,
      src,
    };
    image.addEventListener("load", () => {
      sprite.isReady = true;
    });
    image.addEventListener("error", () => {
      console.error("[BOSS] Failed to load boss sprite image", { phase, src });
    });
    image.src = src;
    bossSprites[phase] = sprite;
  }
  const bossSprite = bossSprites.phase1 || {
    isReady: false,
    image: new Image(),
    src: normalizedBossImageSources.phase1 || "",
  };
  const playerSpriteImage = new Image();
  const playerSprite = {
    isReady: false,
    image: playerSpriteImage,
  };
  playerSpriteImage.addEventListener("load", () => {
    playerSprite.isReady = true;
  });
  playerSpriteImage.addEventListener("error", () => {
    console.error("[PLAYER] Failed to load player sprite image", { src: playerImageSrc });
  });
  playerSpriteImage.src = playerImageSrc;

  const powerupSprites = {};
  for (const [type, src] of Object.entries(powerupImageSources || {})) {
    const image = new Image();
    const sprite = { isReady: false, image, src };
    image.addEventListener("load", () => {
      sprite.isReady = true;
    });
    image.addEventListener("error", () => {
      console.error("[POWERUP] Failed to load powerup sprite image", { type, src });
    });
    image.src = src;
    powerupSprites[type] = sprite;
  }

  return {
    canvas,
    ctx,
    elements,
    ...dimensions,
    starField,
    bossSprite,
    bossSprites,
    playerSprite,
    powerupSprites,
    refs: {
      rafId: null,
      deterministicMode: false,
    },
  };
}
