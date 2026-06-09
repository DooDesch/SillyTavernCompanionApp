import type { ColorValue } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, iconSize } from './tokens';

/**
 * Central semantic-name -> Feather-glyph map. Screens reference these names only —
 * never emoji, never a raw Feather string. Feather is a stroke-based set already
 * bundled with @expo/vector-icons (no new dependency, refined/consistent stroke).
 */
export const ICONS = {
  back: 'chevron-left',
  close: 'x',
  send: 'arrow-up',
  stop: 'square',
  plus: 'plus',
  copy: 'copy',
  edit: 'edit-2',
  note: 'edit-3',
  lore: 'book-open',
  tune: 'sliders',
  regenerate: 'rotate-ccw',
  refresh: 'refresh-cw',
  continue: 'corner-down-right',
  fastForward: 'chevrons-right',
  branch: 'git-branch',
  hide: 'eye-off',
  show: 'eye',
  delete: 'trash-2',
  speak: 'volume-2',
  attach: 'image',
  impersonate: 'feather',
  warning: 'alert-triangle',
  lock: 'lock',
  search: 'search',
  chevronLeft: 'chevron-left',
  chevronRight: 'chevron-right',
  chevronDown: 'chevron-down',
  chats: 'message-circle',
  characters: 'users',
  settings: 'settings',
  wifi: 'wifi',
  server: 'server',
  link: 'link',
  check: 'check',
  user: 'user',
  plusCircle: 'plus-circle',
  zap: 'zap',
  sparkles: 'star',
  globe: 'globe',
  trash: 'trash-2',
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = iconSize.md,
  color = colors.text,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
}) {
  return <Feather name={ICONS[name]} size={size} color={color} />;
}
