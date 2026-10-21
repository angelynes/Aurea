import type { ThemeId } from "./types";

export const THEME_META: Record<ThemeId, {
  name: string;
  description: string;
  preview: string[];
  categoryColors: string[];
  habitColor: string;
}> = {
  aurea: {
    name: "Aurea",
    description: "Warm cream, plum and gold",
    preview: ["#3B3550", "#D9A441", "#E7DFD0", "#FBF8F3"],
    categoryColors: ["#EFE4CC", "#E3DEEC", "#E1E9DD", "#F2E0D6", "#DFE7EE", "#EEDFE5", "#E8E3D6", "#F3EAD0"],
    habitColor: "#E9D7AE",
  },
  sage: {
    name: "Sage",
    description: "Soft green, forest and clay",
    preview: ["#2F4A3F", "#C9895B", "#DDE3D6", "#F7F8F3"],
    categoryColors: ["#DFE8D8", "#EDE3D0", "#E5E1EC", "#F1DFD3", "#DCE6E8", "#ECE6D7", "#E3EBE3", "#F2E8D2"],
    habitColor: "#D9E4CF",
  },
  clay: {
    name: "Clay",
    description: "Terracotta, sand and espresso",
    preview: ["#4A2F27", "#C8664A", "#ECDCCF", "#FCF7F2"],
    categoryColors: ["#F2DCCB", "#EBE0D2", "#E7DDE3", "#E0E6DA", "#F3E6CC", "#E2E3EA", "#F0D9D2", "#E9E1D5"],
    habitColor: "#EFD2BF",
  },
  tide: {
    name: "Tide",
    description: "Misty blue, navy and amber",
    preview: ["#26394D", "#E0A458", "#D9E2E9", "#F6F8F9"],
    categoryColors: ["#DCE6EE", "#EDE5D3", "#E0E9E3", "#E6E0EC", "#F0E0D6", "#D9E8E8", "#E9E7DC", "#F2E9D2"],
    habitColor: "#D3E1EA",
  },
  rose: {
    name: "Rosé",
    description: "Blush, berry and coral",
    preview: ["#5A2E3A", "#D38B7F", "#EFDFE0", "#FCF7F6"],
    categoryColors: ["#F2DDE0", "#EEE3D4", "#E5E0EC", "#E2E8DE", "#F3E2D6", "#E0E6EE", "#EEDDE6", "#F2E9D3"],
    habitColor: "#EFD3D3",
  },
};

export const THEME_IDS = Object.keys(THEME_META) as ThemeId[];

/** Themes that were removed, mapped to their closest current theme. */
export const LEGACY_THEMES: Record<string, ThemeId> = { lavender: "aurea", neutral: "tide", blush: "rose", aqua: "tide" };

/** Built-in category colors of the removed themes, so they can move to the new palette's matching slot. */
export const LEGACY_CATEGORY_PALETTES: string[][] = [
  ["#EEE8F7", "#E5DCF5", "#F5E5F1", "#E6EEF9", "#F7EEDC", "#E2F0E9", "#ECE5F8", "#F8E8EF"],
  ["#ECEEEF", "#E5E9EA", "#EFECE7", "#E4ECE7", "#ECE9F0", "#F1E9E5", "#E4EBF0", "#F0EFE5"],
  ["#F9E4EC", "#F6DCE7", "#FCEBF2", "#F4E3EA", "#F8E5DD", "#EDE5F1", "#FAE8E4", "#F5DFE8"],
  ["#DDF3F1", "#D2EEEB", "#E1EFF7", "#DCEEEA", "#E8F3DD", "#E3EAF6", "#D5F2EF", "#E8F5F3"],
];

/** Slot of a built-in category color in any current or removed palette, or undefined for a custom color. */
export function paletteSlot(color: string, preferredTheme?: ThemeId) {
  const palettes = [...(preferredTheme ? [THEME_META[preferredTheme].categoryColors] : []), ...THEME_IDS.map((id) => THEME_META[id].categoryColors), ...LEGACY_CATEGORY_PALETTES];
  return palettes.map((palette) => palette.findIndex((item) => item.toLowerCase() === color.toLowerCase())).find((index) => index >= 0);
}
