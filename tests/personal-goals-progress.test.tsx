import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { PersonalGoalsProgress } from '../src/features/fantasy/PersonalGoalsProgress';
import { updateGoals } from '../src/features/fantasy/api';

jest.mock('../src/features/fantasy/api', () => ({
  updateGoals: jest.fn(),
}));

const mockedUpdateGoals = jest.mocked(updateGoals);
const queryClients: QueryClient[] = [];

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  queryClients.push(queryClient);
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('PersonalGoalsProgress', () => {
  afterEach(() => {
    cleanup();
    queryClients.forEach((queryClient) => queryClient.clear());
    queryClients.length = 0;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders unset state when no goals are configured', () => {
    const { getByText, getByRole } = renderWithClient(
      <PersonalGoalsProgress
        totalPoints={150}
        globalRank={45}
        targetPoints={null}
        targetRank={null}
      />
    );

    expect(getByText('Season Milestones')).toBeTruthy();
    expect(getByText('No personal milestones set for this season yet.')).toBeTruthy();
    expect(getByRole('button', { name: 'Set personal goals' })).toBeTruthy();
  });

  it('renders goals progress and achievement status when goals are configured', () => {
    const { getByText } = renderWithClient(
      <PersonalGoalsProgress
        totalPoints={600}
        globalRank={25}
        targetPoints={500}
        targetRank={50}
      />
    );

    expect(getByText('Points Target')).toBeTruthy();
    expect(getByText('Goal reached! 🎉')).toBeTruthy();
    expect(getByText('Global Rank Target')).toBeTruthy();
    expect(getByText('Target crushed! 🏆')).toBeTruthy();
  });

  it('opens dialog and submits updated goals', async () => {
    mockedUpdateGoals.mockResolvedValue({
      targetPoints: 750,
      targetRank: 100,
      totalPoints: 200,
      globalRank: 150,
    });

    const { getByRole, getByPlaceholderText } = renderWithClient(
      <PersonalGoalsProgress
        totalPoints={200}
        globalRank={150}
        targetPoints={null}
        targetRank={null}
      />
    );

    fireEvent.press(getByRole('button', { name: 'Set personal goals' }));

    const pointsInput = getByPlaceholderText('e.g. 500');
    const rankInput = getByPlaceholderText('e.g. 100');

    fireEvent.changeText(pointsInput, '750');
    fireEvent.changeText(rankInput, '100');

    fireEvent.press(getByRole('button', { name: 'Save Goals' }));

    await waitFor(() => {
      expect(mockedUpdateGoals).toHaveBeenCalledWith({
        targetPoints: 750,
        targetRank: 100,
      });
    });
  });
});
