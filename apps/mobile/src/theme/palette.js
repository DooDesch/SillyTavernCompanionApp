// Single source of truth for the design system's raw color + radius values.
// Consumed by BOTH tailwind.config.js (build-time className tokens) and
// src/theme/tokens.ts (runtime values for non-className APIs).
//
// Refined Dark (Cinema): deep near-black, one violet accent, fine borders, subtle depth.
// Dark-only for now - a light theme later is an additive change (a second value set),
// because every screen references semantic names, never raw hex.

const palette = {
  bg: '#0B0B0F', // app background (darkest)
  surface: '#15151C', // cards, headers, sheets
  surface2: '#1E1E28', // inputs, nested / pressed surfaces
  surface3: '#2A2A36', // hovered / highest surface
  border: '#23232E', // hairline dividers
  borderStrong: '#33333F', // emphasized borders

  text: '#F5F5F7', // primary text  (>= 12:1 on bg)
  textMuted: '#9A9AA8', // secondary text (>= 4.6:1 on surface)
  textSubtle: '#6B6B78', // placeholders, faint meta

  accent: '#7C5CFF', // single brand accent (violet)
  accentPressed: '#6A4AE0', // accent pressed state
  accentSoft: 'rgba(124,92,255,0.14)', // accent tint backgrounds
  onAccent: '#FFFFFF', // text/icons on accent

  danger: '#F26D6D',
  dangerSoft: 'rgba(242,109,109,0.14)',
  success: '#46C68A',
  warning: '#E0A458',

  userBubble: '#20283F', // user message bubble (cool tint)
  charBubble: '#211B30', // character message bubble (violet tint)

  scrim: 'rgba(0,0,0,0.6)', // modal / sheet backdrop
};

// Radius scale (custom names avoid colliding with Tailwind's core rounded-* utilities).
const radii = { field: 14, card: 18, sheet: 28, pill: 9999 };

module.exports = { palette, radii };
