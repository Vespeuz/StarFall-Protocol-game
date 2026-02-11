export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function overlaps(a, b) {
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

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function setHidden(element, hidden, className = "hidden") {
  if (!element) {
    return;
  }
  element.classList.toggle(className, hidden);
}

export function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
