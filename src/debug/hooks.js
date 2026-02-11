export function attachDebugHooks({ renderGameToText, advanceTime }) {
  window.render_game_to_text = renderGameToText;
  window.advanceTime = advanceTime;
}
