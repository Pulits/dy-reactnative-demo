export const theme = {
  color: {
    bg: '#0F1115',
    surface: '#171A21',
    surfaceAlt: '#1F232C',
    border: '#2A2F3A',
    text: '#F2F4F8',
    textMuted: '#9AA3B2',
    accent: '#4C8DFF',
    success: '#3FB27F',
    warning: '#E0A33E',
  },
  space: (n: number): number => n * 8,
  radius: { sm: 8, md: 12, lg: 18 },
} as const;
