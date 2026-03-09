export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function calculateTargetWordCount(
  targetMinutes: number,
  manualWordCount?: number
): number {
  if (manualWordCount && manualWordCount > 0) {
    return Math.round(manualWordCount);
  }

  return Math.round(targetMinutes * 145);
}

export function estimateSceneCount(targetMinutes: number, targetWords: number): number {
  const fromLength = Math.round(targetWords / 260);
  const fromMinutes = Math.round(targetMinutes / 2);
  return clamp(Math.max(fromLength, fromMinutes), 3, 7);
}
