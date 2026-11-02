import { fireEvent, render } from '@testing-library/react-native';
import { ProfileAchievements } from '@/src/features/account/ProfileAchievements';
import type { Achievement } from '@/src/features/account/achievementsData';

const achievements: Achievement[] = [
  {
    id: 'first-squad',
    title: 'First Squad',
    description: 'Created your first fantasy squad.',
    category: 'squad',
    tier: 'bronze',
    icon: 'shield',
    unlocked: false,
    progressText: '0/1 squad active',
    progressPercent: 0,
  },
];

describe('ProfileAchievements', () => {
  it('collapses and expands the badge list while keeping its summary visible', () => {
    const screen = render(<ProfileAchievements achievements={achievements} />);

    expect(screen.getByText('First Squad')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Collapse Achievements & Badges' }));

    expect(screen.queryByText('First Squad')).toBeNull();
    expect(screen.getByText('0 of 1 unlocked')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Expand Achievements & Badges' }));
    expect(screen.getByText('First Squad')).toBeTruthy();
  });
});
