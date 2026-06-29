export const defaultThemeColors = {
  darkText: "#f9fafb",
  lightText: "#101418",
  primary: "#22c55e",
  secondary: "#4ade80",
} as const;

type ThemeMode = "dark" | "light" | string | undefined;

type ThemeInput = {
  mode?: ThemeMode;
  primary?: string;
  secondary?: string;
  text?: string;
};

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function normalizeHexColor(value: unknown, fallback: string) {
  const normalized = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized.toLowerCase() : fallback;
}

export function hexToRgb(hex: string) {
  const normalized = normalizeHexColor(hex, "#000000").slice(1);
  return {
    blue: Number.parseInt(normalized.slice(4, 6), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    red: Number.parseInt(normalized.slice(0, 2), 16),
  };
}

export function rgbChannels(hex: string) {
  const { blue, green, red } = hexToRgb(hex);
  return `${red} ${green} ${blue}`;
}

export function hexToRgba(hex: string, opacity: number) {
  const { blue, green, red } = hexToRgb(hex);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export function mixHexColors(foreground: string, background: string, backgroundWeight: number) {
  const front = hexToRgb(foreground);
  const back = hexToRgb(background);
  const weight = Math.max(0, Math.min(1, backgroundWeight));
  const red = clampChannel(front.red * (1 - weight) + back.red * weight);
  const green = clampChannel(front.green * (1 - weight) + back.green * weight);
  const blue = clampChannel(front.blue * (1 - weight) + back.blue * weight);
  return `#${red.toString(16).padStart(2, "0")}${green
    .toString(16)
    .padStart(2, "0")}${blue.toString(16).padStart(2, "0")}`;
}

function relativeLuminance(hex: string) {
  const { blue, green, red } = hexToRgb(hex);
  const linear = [red, green, blue].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function contrastTextColor(background: string) {
  const luminance = relativeLuminance(background);
  const contrastWithDark = (luminance + 0.05) / 0.05;
  const contrastWithLight = 1.05 / (luminance + 0.05);
  return contrastWithDark >= contrastWithLight ? "#07100b" : "#ffffff";
}

export function contrastRatio(foreground: string, background: string) {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

export function automaticTextColor(mode?: ThemeMode) {
  return mode === "light" ? defaultThemeColors.lightText : defaultThemeColors.darkText;
}

export function createBusinessThemeTokens({ mode, primary, secondary, text }: ThemeInput) {
  const lightMode = mode === "light";
  const background = lightMode ? "#eef2f7" : "#070a0d";
  const normalizedPrimary = normalizeHexColor(primary, defaultThemeColors.primary);
  const normalizedSecondary = normalizeHexColor(secondary, defaultThemeColors.secondary);
  const normalizedText = normalizeHexColor(text, automaticTextColor(mode));

  return {
    "--primary": normalizedPrimary,
    "--primary-2": normalizedSecondary,
    "--secondary": normalizedSecondary,
    "--primary-rgb": rgbChannels(normalizedPrimary),
    "--secondary-rgb": rgbChannels(normalizedSecondary),
    "--primary-hover": mixHexColors(normalizedPrimary, lightMode ? "#000000" : "#ffffff", 0.12),
    "--primary-soft": hexToRgba(normalizedPrimary, 0.14),
    "--secondary-soft": hexToRgba(normalizedSecondary, 0.12),
    "--primary-border": hexToRgba(normalizedPrimary, 0.34),
    "--secondary-border": hexToRgba(normalizedSecondary, 0.28),
    "--on-primary": contrastTextColor(normalizedPrimary),
    "--on-secondary": contrastTextColor(normalizedSecondary),
    "--text": normalizedText,
    "--text-rgb": rgbChannels(normalizedText),
    "--text-secondary": mixHexColors(normalizedText, background, 0.28),
    "--text-muted": mixHexColors(normalizedText, background, 0.46),
    "--text-disabled": mixHexColors(normalizedText, background, 0.62),
    "--shadow-glow": `0 0 32px ${hexToRgba(normalizedPrimary, 0.22)}`,
  } as const;
}
