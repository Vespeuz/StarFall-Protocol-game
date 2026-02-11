export function updateStars(starField, dt, width, height) {
  for (const star of starField) {
    star.y += star.speed * dt;
    if (star.y > height + 2) {
      star.y = -2;
      star.x = Math.random() * width;
    }
  }
}

export function updateHitFeedback(hitFx, dt) {
  if (!hitFx) {
    return;
  }
  hitFx.shakeTimer = Math.max(0, hitFx.shakeTimer - dt);
  hitFx.flashTimer = Math.max(0, hitFx.flashTimer - dt);
  hitFx.flickerTimer = Math.max(0, hitFx.flickerTimer - dt);
  hitFx.cooldownTimer = Math.max(0, hitFx.cooldownTimer - dt);
}
