export type BannerThemeId =
  | 'radiant-dawn'
  | 'dire-crimson'
  | 'abyssal-depths'
  | 'aegis-gold'
  | 'arcane-void'
  | 'phantom-veil';

export interface MobileBannerTheme {
  id: BannerThemeId;
  name: string;
  heroInspiration: string;
  description: string;
  accentColor: string;
  bgClass: string;
  badgeBg: string;
  badgeText: string;
  dotaRole: 'Carry' | 'Mid' | 'Offlane' | 'Support' | 'Hard Support' | 'Universal';
}

export const MOBILE_BANNER_THEMES: MobileBannerTheme[] = [
  {
    id: 'radiant-dawn',
    name: 'Radiant Dawn',
    heroInspiration: 'Dawnbreaker / Omniknight',
    description: 'Brimming with celestial sunlight and holy radiant vigor.',
    accentColor: '#34d399',
    bgClass: 'bg-emerald-950/80',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
    dotaRole: 'Offlane',
  },
  {
    id: 'dire-crimson',
    name: 'Dire Cataclysm',
    heroInspiration: 'Doom / Shadow Fiend',
    description: 'Forged in brimstone and souls devoured by the Dire abyss.',
    accentColor: '#f43f5e',
    bgClass: 'bg-rose-950/80',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-300',
    dotaRole: 'Mid',
  },
  {
    id: 'abyssal-depths',
    name: 'Abyssal Depths',
    heroInspiration: 'Slardar / Tidehunter',
    description: 'Sunken sea trench mysteries and crushing ravage surges.',
    accentColor: '#06b6d4',
    bgClass: 'bg-cyan-950/80',
    badgeBg: 'bg-cyan-500/20',
    badgeText: 'text-cyan-300',
    dotaRole: 'Hard Support',
  },
  {
    id: 'aegis-gold',
    name: 'Aegis Champion',
    heroInspiration: 'The International Champions',
    description: 'Immortalized in the golden luster of the Aegis of Champions.',
    accentColor: '#f59e0b',
    bgClass: 'bg-amber-950/80',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300',
    dotaRole: 'Carry',
  },
  {
    id: 'arcane-void',
    name: 'Arcane Void',
    heroInspiration: 'Invoker / Rubick',
    description: 'Mastery over the arcane weave and timeless cosmic spells.',
    accentColor: '#a855f7',
    bgClass: 'bg-purple-950/80',
    badgeBg: 'bg-purple-500/20',
    badgeText: 'text-purple-300',
    dotaRole: 'Universal',
  },
  {
    id: 'phantom-veil',
    name: 'Phantom Veil',
    heroInspiration: 'Phantom Assassin / Spectre',
    description: 'Silent strikes emerging from the Sisters of the Veil mist.',
    accentColor: '#10b981',
    bgClass: 'bg-teal-950/80',
    badgeBg: 'bg-teal-500/20',
    badgeText: 'text-teal-300',
    dotaRole: 'Support',
  },
];

export const DEFAULT_MOBILE_BANNER_THEME_ID: BannerThemeId = 'radiant-dawn';

export function getMobileBannerTheme(id?: string | null): MobileBannerTheme {
  const match = MOBILE_BANNER_THEMES.find((theme) => theme.id === id);
  return match || MOBILE_BANNER_THEMES[0];
}
