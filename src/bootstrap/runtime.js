export function createRuntimeContext({ gameTitle, bossImageSrc }) {
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

  const bossSpriteImage = new Image();
  const bossSprite = {
    isReady: false,
    image: bossSpriteImage,
  };

  bossSpriteImage.addEventListener("load", () => {
    bossSprite.isReady = true;
  });
  bossSpriteImage.addEventListener("error", () => {
    console.error("[BOSS] Failed to load boss sprite image", { src: bossImageSrc });
  });
  bossSpriteImage.src = bossImageSrc;

  return {
    canvas,
    ctx,
    elements,
    ...dimensions,
    starField,
    bossSprite,
    refs: {
      rafId: null,
      deterministicMode: false,
    },
  };
}
