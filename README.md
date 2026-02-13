# Starfall Protocol
<img width="1919" height="907" alt="image" src="https://github.com/user-attachments/assets/d8656fdf-37f1-47e5-b14e-4ecf4a451dca" />

Retro-style browser space shooter built with plain HTML, CSS, and JavaScript (no framework).

## Overview

`Starfall Protocol` is a wave-based arcade shooter with:

- 4 enemy waves
- Stacking power-ups
- Multi-layer boss encounter with phase transitions
- Continue prompt flow during boss-stage deaths
- State-based background music

The game runs entirely on a single canvas and uses keyboard controls.

## Gameplay Features

- Start flow: `Embark` (audio unlock) -> `Play`
- Waves: progressively harder enemy formations and return fire
- Power-ups:
  - `Rapid Fire` (stacking duration + level)
  - `Spread Shot` (stacking duration + level)
  - `Shield` (hit-count based)
- Boss fight:
  - Multiple health layers (`BOSS_LAYER_HP`)
  - Entrance animation + grace period
  - Mutation and enraged phases
  - Layer-break visuals and phase banners
- Boss death/retry UX:
  - Arcade-style `Do you want to continue?` prompt
  - 10-second countdown
  - `Yes`: resume boss stage
  - `No` or timeout: return to start page

## Controls

- Move: `Arrow Left` / `Arrow Right`
- Shoot: `Space`
- Continue prompt:
  - `Y` or `Enter` -> Yes
  - `N` or `Escape` -> No
