import type { SliderField } from "../../gen/types.ts";

/// The label over a slider's thumb at `n`: the number with only the places it needs, then a no-break space and the unit.
export const said = (x: SliderField, n: number): string => {
  const t = String(Number(n.toFixed(6)));
  return x.unit ? `${t}\u00a0${x.unit}` : t;
};

/// Where the thumb sits along the track at `n`, from 0 to 1.
export const along = (x: SliderField, n: number): number => (x.max > x.min ? Math.min(1, Math.max(0, (n - x.min) / (x.max - x.min))) : 0);
