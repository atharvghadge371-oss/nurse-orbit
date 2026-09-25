import { useMemo } from "react";
import { Appearance, ColorSchemeName, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // Surfaces
  surface: "#FFFFFF",
  onSurface: "#0F172A",
  surfaceSecondary: "#F8FAFC",
  onSurfaceSecondary: "#334155",
  surfaceTertiary: "#F1F5F9",
  onSurfaceTertiary: "#475569",
  surfaceInverse: "#0F172A",
  onSurfaceInverse: "#F8FAFC",
  muted: "#64748B",

  // Brand: deep navy + royal blue accents
  brand: "#0A1931",
  onBrand: "#FFFFFF",
  brandPrimary: "#1E3A8A",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#0D9488",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#E0F2FE",
  onBrandTertiary: "#0369A1",

  // Status
  success: "#10B981",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  onWarning: "#FFFFFF",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#3B82F6",
  onInfo: "#FFFFFF",

  // Lines
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  divider: "#F1F5F9",
};

export type ThemeColors = typeof light;
export const defaultScheme = "light" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export function setColorScheme(scheme: ColorSchemeName) {
  Appearance.setColorScheme?.(scheme);
}
if (!themes.dark) setColorScheme(defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system === "dark" && themes.dark ? "dark" : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

export const colors = light;

// Common spacing scale from design guidelines
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 32, "3xl": 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };

// Mobile layout guardrails. Keep these in one place so screen-level layouts
// reserve enough room for the home indicator, tab bar, and comfortable touch
// targets instead of relying on a collection of hard-coded values.
export const minTouchTarget = 44;
export const tabBarBaseHeight = 64;

/** Bottom spacing for a standard pushed screen. */
export const screenContentBottomPadding = (bottomInset: number) =>
  Math.max(40, bottomInset + spacing.xl);

/** Bottom spacing for content shown behind the persistent tab bar. */
export const tabContentBottomPadding = (bottomInset: number) =>
  tabBarBaseHeight + bottomInset + spacing.xl;
