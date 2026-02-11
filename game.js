(() => {
  import("./src/main.js").catch((error) => {
    console.error("[BOOT] Failed to load app module", error);
  });
})();