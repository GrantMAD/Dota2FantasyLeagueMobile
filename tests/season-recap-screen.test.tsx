import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { SeasonRecap } from '../src/features/season-recap/api';
import SeasonRecapScreen from '../app/season-recap';

const mockUseQuery = jest.fn();
const mockCaptureRef = jest.fn();
const mockIsSharingAvailable = jest.fn();
const mockShareAsync = jest.fn();
const mockSetQueryData = jest.fn();
const mockUpdateConsent = jest.fn();
let mockConsent = false;

jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useQueryClient: () => ({ setQueryData: mockSetQueryData }),
}));

jest.mock('../src/features/season-recap/api', () => ({
  getSeasonRecaps: jest.fn(),
  getSeasonRecapSharingConsent: jest.fn(),
  updateSeasonRecapSharingConsent: (...args: unknown[]) => mockUpdateConsent(...args),
}));

jest.mock('@/src/lib/auth', () => ({
  useAuth: () => ({ session: { user: { id: 'test-user' } } }),
}));

jest.mock('react-native-view-shot', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const MockViewShot = React.forwardRef<React.ComponentRef<typeof View>, { children: React.ReactNode }>(
    (props, ref) =>
      React.createElement(View, { ...props, ref }, props.children),
  );
  MockViewShot.displayName = 'MockViewShot';
  return {
    __esModule: true,
    default: MockViewShot,
    captureRef: (...args: unknown[]) => mockCaptureRef(...args),
  };
});

jest.mock('expo-sharing', () => ({
  isAvailableAsync: (...args: unknown[]) => mockIsSharingAvailable(...args),
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
}));

jest.mock('react-native-svg', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SvgXml: ({ xml }: { xml: string }) =>
      React.createElement(Text, { testID: 'season-recap-svg' }, xml),
  };
});

jest.mock('@/src/components/Screen', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Screen: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children),
  };
});

jest.mock('@/src/components/ScreenScrollView', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { ScrollView } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    ScreenScrollView: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement(ScrollView, props, children),
  };
});

const recap: SeasonRecap = {
  seasonId: 1,
  fantasySeasonId: 2,
  seasonName: 'Season 2025',
  startDate: '2025-08-01',
  endDate: '2026-06-01',
  totalPoints: 1234.5,
  finalGlobalRank: 8,
  bestGameweek: { gameweek: 4, points: 321.5 },
  rankProgression: { startingRank: 100, finalRank: 8 },
  topPlayer: { name: 'Top Player', points: 240.5 },
  transferCount: 12,
  bestLeagueRank: 3,
};

describe('season recap screen card sharing', () => {
  beforeEach(() => {
    mockConsent = false;
    mockUpdateConsent.mockClear();
    mockSetQueryData.mockImplementation((_key: readonly unknown[], value: boolean) => {
      mockConsent = value;
    });
    mockUseQuery.mockImplementation((options: { queryKey?: readonly unknown[] }) => {
      if (options.queryKey?.[0] === 'season-recap-sharing-consent') {
        return {
          data: mockConsent,
          isPending: false,
          isError: false,
          refetch: jest.fn(),
        };
      }
      return {
        data: [recap],
        isPending: false,
        isError: false,
        isRefetching: false,
        refetch: jest.fn(),
      };
    });
    mockUpdateConsent.mockResolvedValue(true);
    mockCaptureRef.mockResolvedValue('file:///recap.png');
    mockIsSharingAvailable.mockResolvedValue(true);
    mockShareAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  function renderScreen() {
    return render(<SeasonRecapScreen />);
  }

  it('shows the web-matched privacy disclosure and themeable card preview behind consent', async () => {
    const screen = renderScreen();
    await waitFor(() => expect(screen.getByTestId('season-recap-svg')).toBeTruthy());
    const textShare = screen.getByRole('button', { name: 'Share privacy-safe recap' });
    const cardShare = screen.getByRole('button', { name: 'Share / save recap card' });
    expect(textShare.props.accessibilityState.disabled).toBe(true);
    expect(cardShare.props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'What information is included?' }));
    expect(screen.getByText(/Included: season results and selected player statistics/)).toBeTruthy();
    expect(screen.getByText(/Excluded: manager name, account details, squad name, league name, and public links/)).toBeTruthy();

    await fireEvent.press(screen.getByText('Dire'));
    expect(screen.getByTestId('season-recap-svg').props.children).toContain('#fb7185');
    expect(screen.getByRole('button', { name: 'Share / save recap card' }).props.accessibilityState.disabled).toBe(true);
  });

  it('captures and opens the selected recap card in the native share sheet only after consent', async () => {
    mockConsent = true;
    const screen = renderScreen();
    await waitFor(() => expect(screen.getByTestId('season-recap-svg')).toBeTruthy());
    const cardShare = screen.getByRole('button', { name: 'Share / save recap card' });
    await waitFor(() => expect(cardShare.props.accessibilityState.disabled).toBe(false));
    await fireEvent.press(cardShare);
    await waitFor(() => expect(mockShareAsync).toHaveBeenCalledWith(
      'file:///recap.png',
      expect.objectContaining({
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: 'Season 2025 recap card',
      }),
    ));
    expect(mockCaptureRef).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ format: 'png', quality: 1, width: 1600, height: 1280 }),
    );
    await waitFor(() => expect(screen.getByText('Your recap card is ready to share or save.')).toBeTruthy());
  });

});
