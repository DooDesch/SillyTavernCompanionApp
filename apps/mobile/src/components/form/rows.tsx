import { useEffect, useState } from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, IconButton } from '@/components/ui';
import { colors, fonts } from '@/theme/tokens';
import { haptics } from '@/theme/haptics';

/** Switch row with optional caption, matching the QuickSettingsSheet pattern. */
export function ToggleRow({
  label,
  hint,
  value,
  onChange,
  onLongPress,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable onLongPress={onLongPress} delayLongPress={400} className="mb-3">
      <View className="flex-row items-center justify-between">
        <AppText variant="bodyLg" style={{ flex: 1, paddingRight: 8 }}>
          {label}
        </AppText>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ true: colors.accent, false: colors.surface3 }}
          thumbColor={colors.onAccent}
        />
      </View>
      {hint ? (
        <AppText variant="caption" color="subtle" style={{ marginTop: 2, paddingRight: 56 }}>
          {hint}
        </AppText>
      ) : null}
    </Pressable>
  );
}

/** Multiline text editor row (grammar, banned tokens, sequence breakers, negative prompt). */
export function TextAreaRow({
  label,
  hint,
  value,
  error,
  onChange,
  onLongPress,
}: {
  label: string;
  hint?: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  onLongPress?: () => void;
}) {
  return (
    <View className="mb-3">
      <Pressable onLongPress={onLongPress} delayLongPress={400}>
        <AppText variant="bodyLg">{label}</AppText>
        {hint ? (
          <AppText variant="caption" color="subtle" style={{ marginTop: 2 }}>
            {hint}
          </AppText>
        ) : null}
      </Pressable>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={colors.textSubtle}
        className={`mt-2 rounded-field border bg-surface-2 px-3 py-2.5 text-text ${error ? 'border-danger' : 'border-border'}`}
        style={{ fontFamily: fonts.regular, fontSize: 14, minHeight: 72, maxHeight: 160, textAlignVertical: 'top' }}
      />
      {error ? (
        <AppText variant="caption" color="danger" style={{ marginTop: 2 }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

/** Pill-style segmented selector (mirostat mode, names behavior, reasoning effort). */
export function SegmentedRow({
  label,
  hint,
  value,
  options,
  onChange,
  onLongPress,
}: {
  label: string;
  hint?: string;
  value: number | string;
  options: { value: number | string; label: string }[];
  onChange: (v: number | string) => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable onLongPress={onLongPress} delayLongPress={400} className="mb-3">
      <AppText variant="bodyLg">{label}</AppText>
      {hint ? (
        <AppText variant="caption" color="subtle" style={{ marginTop: 2 }}>
          {hint}
        </AppText>
      ) : null}
      <View className="mt-2 flex-row flex-wrap gap-1.5">
        {options.map((o) => (
          <Pressable
            key={String(o.value)}
            onPress={() => {
              haptics.selection();
              onChange(o.value);
            }}
            className={`rounded-field px-3 py-2 ${value === o.value ? 'bg-accent' : 'border border-border bg-surface-2'}`}
          >
            <AppText variant="label" color={value === o.value ? 'onAccent' : 'muted'}>
              {o.label}
            </AppText>
          </Pressable>
        ))}
      </View>
    </Pressable>
  );
}

/** Reorderable list (KoboldCpp sampler order) with up/down buttons. */
export function OrderListRow({
  label,
  hint,
  value,
  itemLabels,
  onChange,
  onLongPress,
}: {
  label: string;
  hint?: string;
  value: number[];
  itemLabels: Record<number, string>;
  onChange: (v: number[]) => void;
  onLongPress?: () => void;
}) {
  const { t } = useTranslation();
  const move = (index: number, dir: 1 | -1) => {
    const next = [...value];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap]!, next[index]!];
    onChange(next);
  };
  return (
    <View className="mb-3">
      <Pressable onLongPress={onLongPress} delayLongPress={400}>
        <AppText variant="bodyLg">{label}</AppText>
        {hint ? (
          <AppText variant="caption" color="subtle" style={{ marginTop: 2 }}>
            {hint}
          </AppText>
        ) : null}
      </Pressable>
      <View className="mt-2 gap-1">
        {value.map((id, i) => (
          <View key={id} className="flex-row items-center rounded-field border border-border bg-surface-2 py-0.5 pl-3 pr-1">
            <AppText variant="caption" color="subtle" style={{ width: 22 }}>
              {i + 1}.
            </AppText>
            <AppText variant="body" style={{ flex: 1 }}>
              {itemLabels[id] ?? String(id)}
            </AppText>
            <IconButton name="arrowUp" size="sm" accessibilityLabel={t('a11y.moveUp')} disabled={i === 0} haptic={false} onPress={() => move(i, -1)} />
            <IconButton name="arrowDown" size="sm" accessibilityLabel={t('a11y.moveDown')} disabled={i === value.length - 1} haptic={false} onPress={() => move(i, 1)} />
          </View>
        ))}
      </View>
    </View>
  );
}

/** Collapsible section header for the generation-settings screen. */
export function CollapsibleHeader({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onToggle();
      }}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      className="mt-4 flex-row items-center justify-between rounded-card bg-surface px-4 py-3 active:bg-surface-2"
    >
      <AppText variant="title">{title}</AppText>
      <IconButton
        name={open ? 'chevronUp' : 'chevronDown'}
        size="sm"
        accessibilityLabel={title}
        haptic={false}
        onPress={() => {
          haptics.selection();
          onToggle();
        }}
      />
    </Pressable>
  );
}

/** Long-press hint banner shown once at the top of the screen. */
export function ResetHint({ text }: { text: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 12000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <AppText variant="caption" color="subtle" style={{ marginTop: 6 }}>
      {text}
    </AppText>
  );
}
