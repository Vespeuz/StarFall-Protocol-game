export function createAudioSystem({
  getState,
  clamp,
  sleepMs,
  bgmVolumeSlider,
  bgmVolumeValue,
  sfxVolumeSlider,
  sfxVolumeValue,
  storageKeys,
  defaultVolumes,
}) {
  const { bgm: bgmStorageKey, sfx: sfxStorageKey } = storageKeys;
  const volumeChannels = {
    bgm: defaultVolumes.bgm,
    sfx: defaultVolumes.sfx,
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
      const state = getState();
      const mode = state ? state.mode : "uninitialized";
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
        this.log("Track fetch probe", {
          track: trackKey,
          src: track.src,
          status: response.status,
          ok: response.ok,
        });
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
        const state = getState();
        console.warn("[BGM] play() rejected", {
          track: trackKey,
          mode: state ? state.mode : "uninitialized",
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

  function setBgmVolume(nextValue) {
    volumeChannels.bgm = clamp(nextValue, 0, 1);
    bgm.applyMasterVolume();
    syncVolumeUi();
    persistVolume(bgmStorageKey, volumeChannels.bgm);
  }

  function setSfxVolume(nextValue) {
    volumeChannels.sfx = clamp(nextValue, 0, 1);
    syncVolumeUi();
    persistVolume(sfxStorageKey, volumeChannels.sfx);
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

  function initializeVolumes() {
    setBgmVolume(readPersistedVolume(bgmStorageKey, defaultVolumes.bgm));
    setSfxVolume(readPersistedVolume(sfxStorageKey, defaultVolumes.sfx));
  }

  return {
    bgm,
    sfx,
    ensureAudio,
    setBgmVolume,
    setSfxVolume,
    registerVolumeHandlers,
    initializeVolumes,
    volumeChannels,
  };
}
