/** @type {import('tailwindcss').Config} */
const { palette, radii } = require('./src/theme/palette.js');

module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Semantic tokens (Refined Dark). Screens use these names only.
        bg: palette.bg,
        surface: palette.surface,
        'surface-2': palette.surface2,
        'surface-3': palette.surface3,
        border: palette.border,
        'border-strong': palette.borderStrong,
        text: palette.text,
        'text-muted': palette.textMuted,
        'text-subtle': palette.textSubtle,
        accent: palette.accent,
        'accent-pressed': palette.accentPressed,
        'accent-soft': palette.accentSoft,
        'on-accent': palette.onAccent,
        danger: palette.danger,
        'danger-soft': palette.dangerSoft,
        success: palette.success,
        warning: palette.warning,
        'user-bubble': palette.userBubble,
        'char-bubble': palette.charBubble,

        // Legacy aliases — keep old class names working during the migration.
        surface2: palette.surface2,
        muted: palette.textMuted,
        primary: palette.accent,
        user: palette.userBubble,
        char: palette.charBubble,
      },
      fontFamily: {
        // Default body font becomes Inter (regular). Headings/labels go through the
        // AppText primitive, which sets the exact Inter weight family via style.
        sans: ['Inter_400Regular', 'System', 'sans-serif'],
      },
      borderRadius: {
        // Custom names avoid colliding with Tailwind core rounded-* utilities.
        field: `${radii.field}px`,
        card: `${radii.card}px`,
        sheet: `${radii.sheet}px`,
        pill: `${radii.pill}px`,
      },
    },
  },
  plugins: [],
};
