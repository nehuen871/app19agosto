import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@utn/design-tokens';
import { AppNavigation } from './AppNavigation';
import { newsStyles } from './news-styles';

export function BottomNavigation({ current }: { current: 'news' | 'calendar' | 'account' }) {
  const insets = useSafeAreaInsets();
  return <View style={[newsStyles.navigation, { paddingBottom: spacing.sm + insets.bottom, paddingLeft: spacing.md + insets.left, paddingRight: spacing.md + insets.right }]}><AppNavigation current={current} /></View>;
}
