import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { parseNum } from './SliderRow';
import { fonts } from '@/theme/tokens';

/**
 * Preset stepper ( ‹ value › ) for values where a slider makes no sense (e.g. context
 * size powers of two). The arrows walk the `values` presets; tapping the value chip
 * opens an inline TextInput for arbitrary entry - a typed custom value steps to its
 * nearest preset neighbor on the next arrow tap.
 */
export function StepperRow({
  label,
  value,
  values,
  min = 1,
  onChange,
}: {
  label: string;
  value: number | null;
  values: number[];
  /** Lower clamp for typed values (seed needs -1; context size keeps the default 1). */
  min?: number;
  onChange: (v: number) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<string | null>(null);
  const shown = value ?? values[0]!;

  const stepTo = (dir: 1 | -1) => {
    if (dir === 1) {
      const next = values.find((v) => v > shown);
      if (next != null) onChange(next);
    } else {
      const prev = [...values].reverse().find((v) => v < shown);
      if (prev != null) onChange(prev);
    }
  };

  const commitTyped = (s: string) => {
    setEditing(null);
    const n = parseNum(s);
    if (n == null) return;
    onChange(Math.max(min, Math.round(n)));
  };

  const fmt = (v: number) => (v >= 1024 && v % 1024 === 0 ? `${v / 1024}k` : String(v));

  return (
    <View className="mb-3 flex-row items-center justify-between">
      <AppText variant="bodyLg" style={{ flex: 1 }}>
        {label}
      </AppText>
      <View className="flex-row items-center gap-1">
        <IconButton
          name="chevronLeft"
          size="sm"
          accessibilityLabel={t('a11y.decrease')}
          disabled={value != null && shown <= values[0]!}
          onPress={() => stepTo(-1)}
        />
        {editing !== null ? (
          <TextInput
            value={editing}
            onChangeText={setEditing}
            autoFocus
            keyboardType="number-pad"
            onBlur={() => commitTyped(editing)}
            onSubmitEditing={() => commitTyped(editing)}
            accessibilityLabel={t('a11y.editValue')}
            className="w-20 rounded-field border border-border bg-surface-2 text-center text-text"
            style={{ fontFamily: fonts.regular, fontSize: 15, height: 38, paddingVertical: 0 }}
          />
        ) : (
          <Pressable
            onPress={() => setEditing(value != null ? String(shown) : '')}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.editValue')}
            className="w-20 items-center rounded-field bg-surface-2 py-2 active:bg-surface-3"
          >
            <AppText variant="title">{value != null ? fmt(shown) : '–'}</AppText>
          </Pressable>
        )}
        <IconButton
          name="chevronRight"
          size="sm"
          accessibilityLabel={t('a11y.increase')}
          disabled={value != null && shown >= values[values.length - 1]!}
          onPress={() => stepTo(1)}
        />
      </View>
    </View>
  );
}
