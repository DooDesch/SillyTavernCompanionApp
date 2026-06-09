import { type ReactNode } from 'react';
import { View } from 'react-native';
import { AppText } from './AppText';
import { Icon, type IconName } from '@/theme/icons';
import { colors } from '@/theme/tokens';

export function SectionHeader({ title, icon }: { title: string; icon?: IconName }) {
  return (
    <View className="mb-2 mt-6 flex-row items-center gap-2 px-1">
      {icon ? <Icon name={icon} size={14} color={colors.textSubtle} /> : null}
      <AppText variant="label" color="subtle" style={{ textTransform: 'uppercase' }}>
        {title}
      </AppText>
    </View>
  );
}

/** A titled group with consistent vertical rhythm. Children are the rows/content. */
export function Section({
  title,
  icon,
  children,
}: {
  title?: string;
  icon?: IconName;
  children: ReactNode;
}) {
  return (
    <View>
      {title ? <SectionHeader title={title} icon={icon} /> : null}
      <View className="gap-2">{children}</View>
    </View>
  );
}
