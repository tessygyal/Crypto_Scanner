import { useTheme } from '@/hooks/use-theme';

/** Navy navigation bars to match the tab headers (see HeroHeader). */
export function useNavHeaderOptions() {
  const theme = useTheme();
  return {
    headerStyle: { backgroundColor: theme.hero },
    headerTintColor: theme.onHero,
    headerTitleStyle: { color: theme.onHero },
    headerShadowVisible: false,
  } as const;
}
