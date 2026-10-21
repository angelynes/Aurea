/** Aurea has one look: warm cream, plum and gold. These are its built-in category and routine colors. */
export const CATEGORY_COLORS = ["#EFE4CC", "#E3DEEC", "#E1E9DD", "#F2E0D6", "#DFE7EE", "#EEDFE5", "#E8E3D6", "#F3EAD0"];
export const HABIT_COLOR = "#E9D7AE";

/** Built-in palettes of retired themes, slot for slot, so their colors can move to Aurea's. */
const RETIRED_CATEGORY_PALETTES: string[][] = [
  ["#EEE8F7", "#E5DCF5", "#F5E5F1", "#E6EEF9", "#F7EEDC", "#E2F0E9", "#ECE5F8", "#F8E8EF"], // lavender
  ["#ECEEEF", "#E5E9EA", "#EFECE7", "#E4ECE7", "#ECE9F0", "#F1E9E5", "#E4EBF0", "#F0EFE5"], // minimal
  ["#F9E4EC", "#F6DCE7", "#FCEBF2", "#F4E3EA", "#F8E5DD", "#EDE5F1", "#FAE8E4", "#F5DFE8"], // blush
  ["#DDF3F1", "#D2EEEB", "#E1EFF7", "#DCEEEA", "#E8F3DD", "#E3EAF6", "#D5F2EF", "#E8F5F3"], // aqua
  ["#DFE8D8", "#EDE3D0", "#E5E1EC", "#F1DFD3", "#DCE6E8", "#ECE6D7", "#E3EBE3", "#F2E8D2"], // sage (preview only)
  ["#F2DCCB", "#EBE0D2", "#E7DDE3", "#E0E6DA", "#F3E6CC", "#E2E3EA", "#F0D9D2", "#E9E1D5"], // clay (preview only)
  ["#DCE6EE", "#EDE5D3", "#E0E9E3", "#E6E0EC", "#F0E0D6", "#D9E8E8", "#E9E7DC", "#F2E9D2"], // tide (preview only)
  ["#F2DDE0", "#EEE3D4", "#E5E0EC", "#E2E8DE", "#F3E2D6", "#E0E6EE", "#EEDDE6", "#F2E9D3"], // rosé (preview only)
];
const RETIRED_HABIT_COLORS = new Set(["#c9b7f1", "#b8c2c4", "#f0bdd2", "#9eddd8", "#d9e4cf", "#efd2bf", "#d3e1ea", "#efd3d3"]);

/** A category color from a retired theme becomes the matching Aurea color; Aurea and custom colors stay. */
export function toAureaCategoryColor(color: string) {
  const lower = color.toLowerCase();
  if (CATEGORY_COLORS.some((item) => item.toLowerCase() === lower)) return color;
  const slot = RETIRED_CATEGORY_PALETTES.map((palette) => palette.findIndex((item) => item.toLowerCase() === lower)).find((index) => index >= 0);
  return slot == null ? color : CATEGORY_COLORS[slot];
}

/** A routine on a retired built-in color (or none) gets Aurea's routine color; custom colors stay. */
export function toAureaHabitColor(color?: string) {
  return !color || RETIRED_HABIT_COLORS.has(color.toLowerCase()) ? HABIT_COLOR : color;
}
