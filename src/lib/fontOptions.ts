import type { CSSProperties } from "react";

export const FONT_OPTIONS = [
  {
    value: "system",
    label: "Current / System UI",
    family: '"AC Inter", sans-serif',
    weight: 400,
  },
  {
    value: "arial",
    label: "Arial",
    family: '"AC Arial", sans-serif',
    weight: 400,
  },
  {
    value: "microgramma-bold-extended",
    label: "Microgramma Bold Extended",
    family: '"AC Microgramma", sans-serif',
    weight: 400,
  },
  {
    value: "segoe-ui",
    label: "Segoe UI",
    family: '"AC Segoe UI", sans-serif',
    weight: 400,
  },
] as const;

export type FontStyleKey = (typeof FONT_OPTIONS)[number]["value"];

export function isFontStyleKey(value: unknown): value is FontStyleKey {
  return FONT_OPTIONS.some((option) => option.value === value);
}

export function getFontStyle(value: unknown): CSSProperties {
  const selected = FONT_OPTIONS.find((option) => option.value === value) ?? FONT_OPTIONS[0];
  return { fontFamily: selected.family, fontWeight: selected.weight };
}
