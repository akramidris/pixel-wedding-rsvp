export function supportsTouchControls() {
  return window.matchMedia('(any-pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}
