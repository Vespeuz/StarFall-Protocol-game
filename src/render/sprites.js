export const colorByPower = {
  rapid_fire: "#f8f364",
  shield: "#5ef4ff",
  spread_shot: "#ff8ec4",
};

export const iconByPower = {
  rapid_fire: "R",
  shield: "O",
  spread_shot: "S",
};

export const enemyWaveArt = {
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

export const playerShipSprite = {
  colors: {
    w: "#e8edf5",
    s: "#aeb7c9",
    d: "#1c2332",
    n: "#0a111f",
    b: "#1e3d99",
    c: "#59d7ff",
  },
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

export const bossShipSprite = {
  colors: {
    n: "#0a1020",
    d: "#143048",
    m: "#1fc48f",
    h: "#7fffd7",
    c: "#f0fff8",
    p: "#1f7a64",
  },
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

export const bossMutatedSprite = {
  colors: {
    n: "#060912",
    d: "#10283a",
    m: "#1bb287",
    h: "#78ffd4",
    c: "#f4fff9",
    p: "#1a6d57",
    e: "#ff4f92",
  },
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

export const eliteMinionSprite = {
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

export const bossLayerColors = ["#66ffe0", "#53c0ff", "#9286ff", "#ff5f97"];

export const POWERUP_IMAGE_SOURCES = {
  rapid_fire: "./public/assets/images/rapid_fire.png",
  shield: "./public/assets/images/shield.png",
  spread_shot: "./public/assets/images/spread_shot.png",
};

export const PLAYER_IMAGE_SRC = "./public/assets/images/spaceship.png";
export const BOSS_IMAGE_SOURCES = {
  phase1: "./public/assets/images/boss_phase_1.png",
  phase2: "./public/assets/images/boss_phase_2.png",
  phase3: "./public/assets/images/boss_phase_3.png",
};

// Backward-compatible alias for any existing single-sprite wiring.
export const BOSS_IMAGE_SRC = BOSS_IMAGE_SOURCES.phase1;
