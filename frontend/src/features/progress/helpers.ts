/** Signed delta for display: 2.1 → "+2.1", -1.4 → "-1.4", 0/null → null (hide). */
export function formatDelta(delta: number | null, unit = ''): string | null {
  if (delta === null || delta === 0) return null;
  const suffix = unit ? ` ${unit}` : '';
  return `${delta > 0 ? '+' : ''}${delta}${suffix}`;
}

/** Whether a body delta is moving toward less mass/fat (shown in brand color). */
export function isImprovement(delta: number | null): boolean {
  return delta !== null && delta < 0;
}
