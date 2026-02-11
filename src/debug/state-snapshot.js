export function createStateSnapshotBuilder({ getState, totalWaves, getBgmTrack, getVolumeChannels }) {
  return function renderGameToText() {
    const state = getState();
    const volumeChannels = getVolumeChannels();
    const payload = {
      coordinate_system: "origin top-left, +x right, +y down; units are canvas pixels",
      mode: state.mode,
      wave: state.wave,
      total_waves: totalWaves,
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
      bgm_track: getBgmTrack() || null,
      bgm_volume: Number(volumeChannels.bgm.toFixed(2)),
      sfx_volume: Number(volumeChannels.sfx.toFixed(2)),
    };
    return JSON.stringify(payload);
  };
}
