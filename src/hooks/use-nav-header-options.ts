import { useTheme } from '@/hooks/use-theme';

/** Flat navigation bars in the page colour, with a purple back arrow (matches HeroHeader). */
export function useNavHeaderOptions() {
  const theme = useTheme();
  return {
    headerStyle: { backgroundColor: theme.hero },
    headerTintColor: theme.primary,
    headerTitleStyle: { color: theme.onHero, fontWeight: '800' },
    headerShadowVisible: false,
  } as const;
}
