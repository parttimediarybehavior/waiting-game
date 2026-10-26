export function formatDuration(value) {
  if (value === null) return "—";
  const seconds = Math.round(value);
  if (seconds < 60) return `${seconds}\u00a0s`;
  const remainder = seconds % 60;
  return `${Math.floor(seconds / 60)}\u00a0min${remainder ? ` ${remainder}\u00a0s` : ""}`;
}
export const count = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
