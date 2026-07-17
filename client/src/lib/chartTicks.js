// A fixed-step gridline loop (`for (v = 0; v <= max; v += step)`) is only
// safe when the caller can guarantee `max` stays small - audience figures
// don't: if they're entered as raw viewer counts rather than a
// millions-scale decimal, `max` can be in the hundreds of thousands, and a
// step of 2 would try to push hundreds of thousands of gridlines/SVG nodes,
// freezing the tab. This picks a "nice" step (1/2/5 x a power of ten) so the
// tick count stays bounded (~targetCount) no matter the input's magnitude.
export function niceTicks(maxValue, targetCount = 5) {
  if (!Number.isFinite(maxValue) || maxValue <= 0) return [0, 1];
  const rawStep = maxValue / targetCount;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;
  let niceResidual;
  if (residual > 5) niceResidual = 10;
  else if (residual > 2) niceResidual = 5;
  else if (residual > 1) niceResidual = 2;
  else niceResidual = 1;
  const step = niceResidual * magnitude;

  const ticks = [];
  const count = Math.ceil(maxValue / step) + 1;
  for (let i = 0; i < count; i++) ticks.push(Math.round(i * step * 1000) / 1000);
  return ticks;
}
