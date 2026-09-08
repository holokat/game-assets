/** Shape-preserving Hermite curves. Keys retain their timing and extrema,
 * while through-motion has continuous velocity instead of stopping at each pose. */
export function createMotionCurve(times: readonly number[], values: readonly number[], loop = false): (time: number) => number {
  const count = times.length;
  const slopes = times.slice(1).map((time, i) => (values[i + 1]! - values[i]!) / (time - times[i]!));
  const tangents = new Array<number>(count).fill(0);
  const tangent = (left: number, right: number, leftSpan: number, rightSpan: number): number => {
    if (left * right <= 0) return 0;
    const w1 = 2 * rightSpan + leftSpan;
    const w2 = rightSpan + 2 * leftSpan;
    return (w1 + w2) / (w1 / left + w2 / right);
  };
  for (let i = 1; i < count - 1; i += 1) {
    tangents[i] = tangent(slopes[i - 1]!, slopes[i]!, times[i]! - times[i - 1]!, times[i + 1]! - times[i]!);
  }
  if (loop && Math.abs(values[0]! - values[count - 1]!) < 1e-5) {
    tangents[0] = tangents[count - 1] = tangent(slopes.at(-1)!, slopes[0]!, times[count - 1]! - times[count - 2]!, times[1]! - times[0]!);
  }
  return (time) => {
    if (time <= times[0]!) return values[0]!;
    if (time >= times[count - 1]!) return values[count - 1]!;
    let i = 0;
    while (i < count - 2 && time > times[i + 1]!) i += 1;
    const span = times[i + 1]! - times[i]!;
    const u = (time - times[i]!) / span;
    const u2 = u * u;
    const u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * values[i]! + (u3 - 2 * u2 + u) * span * tangents[i]!
      + (-2 * u3 + 3 * u2) * values[i + 1]! + (u3 - u2) * span * tangents[i + 1]!;
  };
}

export function motionSampleTimes(keys: readonly number[], fps = 60): number[] {
  const duration = keys.at(-1) ?? 0;
  const count = Math.ceil(duration * fps);
  return [...new Set([...keys, ...Array.from({ length: count + 1 }, (_, i) => i * duration / count)])].sort((a, b) => a - b);
}
