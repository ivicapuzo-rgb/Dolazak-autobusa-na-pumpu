import { Bus, Marka } from "./types";

function range(start: number, end: number): number[] {
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

// Solaris garažni brojevi (tačno prema spisku korisnika)
const SOLARIS: number[] = [
  ...range(3000, 3018),
  ...range(3021, 3026),
  ...range(3028, 3033),
  ...range(3036, 3040),
  3042,
  ...range(3044, 3057),
  ...range(3059, 3080),
  ...range(3083, 3086),
  3088,
  ...range(3090, 3114),
  ...range(3116, 3121),
  ...range(3123, 3124),
  ...range(3126, 3127),
  3131,
  3133,
];

// BMC garažni brojevi
const BMC: number[] = [...range(3290, 3359)];

function build(nums: number[], marka: Marka): Bus[] {
  return nums.map((n) => ({ broj: String(n), marka }));
}

export const SEED_BUSES: Bus[] = [
  ...build(SOLARIS, "Solaris"),
  ...build(BMC, "BMC"),
];
