export interface ThemeColors {
  bg: string;
  card: string;
  text: string;
  sub: string;
  border: string;
  accent: string;
  accentText: string;
  danger: string;
}

export const palette: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    bg: '#f4f6f5',
    card: '#ffffff',
    text: '#111827',
    sub: '#6b7280',
    border: '#e5e7eb',
    accent: '#15803d',
    accentText: '#ffffff',
    danger: '#dc2626',
  },
  dark: {
    bg: '#0d1210',
    card: '#161d1a',
    text: '#f3f4f6',
    sub: '#9ca3af',
    border: '#2b3430',
    accent: '#22c55e',
    accentText: '#052e16',
    danger: '#f87171',
  },
};
