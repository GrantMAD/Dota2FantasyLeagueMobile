import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useMobileTheme } from '@/src/lib/theme';

const resources = [
  {
    id: 'learn',
    href: '/learn' as const,
    title: 'Learn Hub',
    description: 'Follow a curated path through fantasy basics and key actions.',
  },
  {
    id: 'guide',
    href: '/guide' as const,
    title: 'Interactive Guide',
    description: 'Launch a walkthrough for a specific screen or feature.',
  },
  {
    id: 'help',
    href: '/help' as const,
    title: 'Help Center',
    description: 'Find FAQ answers, support guidance, or report an issue.',
  },
] as const;

export function LearningResourcesNav({ currentPage }: { currentPage: (typeof resources)[number]['id'] }) {
  const { theme } = useMobileTheme();
  const light = theme === 'light';

  return (
    <View className="gap-3">
      <View>
        <Text className={`text-xs font-bold uppercase tracking-widest ${light ? 'text-slate-500' : 'text-slate-400'}`}>
          Need something else?
        </Text>
        <Text className={`mt-1 text-xl font-bold ${light ? 'text-slate-900' : 'text-white'}`}>
          Learning and support
        </Text>
      </View>
      {resources.map((resource) => {
        const isCurrent = currentPage === resource.id;
        const card = (
          <>
            <View className="flex-row items-center justify-between gap-2">
              <Text className={`flex-1 font-bold ${light ? 'text-slate-900' : 'text-slate-50'}`}>
                {resource.title}
              </Text>
              {isCurrent ? (
                <Text className={`text-[10px] font-semibold ${light ? 'text-slate-500' : 'text-slate-400'}`}>
                  Current page
                </Text>
              ) : null}
            </View>
            <Text className={`mt-1 text-xs leading-5 ${light ? 'text-slate-600' : 'text-slate-400'}`}>
              {resource.description}
            </Text>
          </>
        );

        return isCurrent ? (
          <View
            key={resource.id}
            accessibilityLabel={`${resource.title}, current page`}
            className={`rounded-xl border p-4 ${light ? 'border-teal-700/40 bg-teal-50' : 'border-brand-500/40 bg-slate-900'}`}
          >
            {card}
          </View>
        ) : (
          <Link key={resource.id} href={resource.href} asChild>
            <Pressable
              accessibilityRole="button"
              className={`min-h-16 rounded-xl border p-4 ${light ? 'border-slate-300 bg-white' : 'border-slate-800 bg-slate-900'}`}
            >
              {card}
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}
