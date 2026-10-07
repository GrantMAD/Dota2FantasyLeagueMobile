import { createContext, useContext, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import { vars } from 'nativewind';
import { getThemePreference, updateThemePreference, type ThemePreference } from '@/src/features/account/api';
import { useAuth } from '@/src/lib/auth';

const themeColors = {
  dark: {
    placeholder: '#94a3b8',
    onAccent: '#ffffff',
    tabBarBackground: '#020617',
    tabBarBorder: '#1e293b',
    tabBarActive: '#fb923c',
    tabBarInactive: '#94a3b8',
  },
  light: {
    placeholder: '#475569',
    onAccent: '#0f172a',
    tabBarBackground: '#ffffff',
    tabBarBorder: '#e2e8f0',
    tabBarActive: '#c2410c',
    tabBarInactive: '#64748b',
  },
} as const;

const themeVariables: Record<ThemePreference, ReturnType<typeof vars>> = {
  dark: vars({
    '--color-foreground': '248 250 252',
    '--color-on-accent': '248 250 252',
    '--color-switch-thumb': '255 255 255',
    '--color-slate-50': '248 250 252',
    '--color-slate-100': '241 245 249',
    '--color-slate-200': '226 232 240',
    '--color-slate-300': '203 213 225',
    '--color-slate-400': '148 163 184',
    '--color-slate-500': '100 116 139',
    '--color-slate-600': '71 85 105',
    '--color-slate-700': '51 65 85',
    '--color-slate-800': '30 41 59',
    '--color-slate-900': '15 23 42',
    '--color-slate-950': '2 6 23',
    '--color-brand-200': '254 215 170',
    '--color-brand-300': '253 186 116',
    '--color-brand-400': '251 146 60',
    '--color-brand-500': '249 115 22',
    '--color-brand-600': '234 88 12',
    '--color-amber-100': '254 243 199',
    '--color-amber-200': '253 230 138',
    '--color-amber-300': '252 211 77',
    '--color-amber-500': '245 158 11',
    '--color-amber-600': '217 119 6',
    '--color-amber-700': '180 83 9',
    '--color-amber-800': '146 64 14',
    '--color-amber-950': '69 26 3',
    '--color-cyan-200': '165 243 252',
    '--color-cyan-300': '103 232 249',
    '--color-cyan-400': '34 211 238',
    '--color-cyan-500': '6 182 212',
    '--color-cyan-700': '14 116 144',
    '--color-cyan-800': '21 94 117',
    '--color-cyan-900': '22 78 99',
    '--color-cyan-950': '8 51 68',
    '--color-emerald-300': '110 231 183',
    '--color-emerald-400': '52 211 153',
    '--color-emerald-500': '16 185 129',
    '--color-orange-300': '253 186 116',
    '--color-orange-500': '249 115 22',
    '--color-red-100': '254 226 226',
    '--color-red-200': '254 202 202',
    '--color-red-300': '252 165 165',
    '--color-red-900': '127 29 29',
    '--color-red-950': '69 10 10',
    '--color-sky-800': '7 89 133',
    '--color-sky-950': '8 47 73',
  }),
  light: vars({
    '--color-foreground': '15 23 42',
    '--color-on-accent': '15 23 42',
    '--color-switch-thumb': '255 255 255',
    '--color-slate-50': '71 85 105',
    '--color-slate-100': '51 65 85',
    '--color-slate-200': '30 41 59',
    '--color-slate-300': '51 65 85',
    '--color-slate-400': '71 85 105',
    '--color-slate-500': '100 116 139',
    '--color-slate-600': '148 163 184',
    '--color-slate-700': '203 213 225',
    '--color-slate-800': '226 232 240',
    '--color-slate-900': '255 255 255',
    '--color-slate-950': '248 250 252',
    '--color-brand-200': '154 52 18',
    '--color-brand-300': '194 65 12',
    '--color-brand-400': '194 65 12',
    '--color-brand-500': '251 146 60',
    '--color-brand-600': '194 65 12',
    '--color-amber-100': '120 53 15',
    '--color-amber-200': '146 64 14',
    '--color-amber-300': '180 83 9',
    '--color-amber-500': '254 243 199',
    '--color-amber-600': '254 243 199',
    '--color-amber-700': '252 211 77',
    '--color-amber-800': '253 230 138',
    '--color-amber-950': '255 251 235',
    '--color-cyan-200': '21 94 117',
    '--color-cyan-300': '14 116 144',
    '--color-cyan-400': '34 211 238',
    '--color-cyan-500': '207 250 254',
    '--color-cyan-700': '165 243 252',
    '--color-cyan-800': '207 250 254',
    '--color-cyan-900': '236 254 255',
    '--color-cyan-950': '236 254 255',
    '--color-emerald-300': '4 120 87',
    '--color-emerald-400': '52 211 153',
    '--color-emerald-500': '209 250 229',
    '--color-orange-300': '194 65 12',
    '--color-orange-500': '255 237 213',
    '--color-red-100': '127 29 29',
    '--color-red-200': '153 27 27',
    '--color-red-300': '185 28 28',
    '--color-red-900': '254 202 202',
    '--color-red-950': '254 242 242',
    '--color-sky-800': '186 230 253',
    '--color-sky-950': '240 249 255',
  }),
};

interface ThemeContextValue {
  theme: ThemePreference;
  colors: (typeof themeColors)[ThemePreference];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  setTheme: (theme: ThemePreference) => Promise<ThemePreference>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function MobileThemeProvider({ children }: { children: ReactNode }) {
  const { ready, session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? null;
  const queryKey = ['theme-preference', userId] as const;
  const preferenceQuery = useQuery({
    queryKey,
    queryFn: getThemePreference,
    enabled: ready && userId !== null,
    staleTime: 5 * 60_000,
  });
  const saveMutation = useMutation({
    mutationFn: updateThemePreference,
    onSuccess: (theme) => {
      queryClient.setQueryData(queryKey, theme);
      void queryClient.invalidateQueries({ queryKey: ['manager-profile'] });
    },
  });

  const value: ThemeContextValue = {
    theme: userId ? preferenceQuery.data ?? 'dark' : 'dark',
    colors: themeColors[userId ? preferenceQuery.data ?? 'dark' : 'dark'],
    isLoading: userId !== null && preferenceQuery.isPending,
    isSaving: saveMutation.isPending,
    error: saveMutation.error?.message ?? preferenceQuery.error?.message ?? null,
    setTheme: (theme) => saveMutation.mutateAsync(theme),
  };

  return (
    <ThemeContext.Provider value={value}>
      <View className="flex-1" style={themeVariables[value.theme]}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useMobileTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useMobileTheme must be used within MobileThemeProvider');
  return context;
}
