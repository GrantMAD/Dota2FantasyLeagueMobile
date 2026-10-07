import React from 'react';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { FantasyContext, FantasyLineupEntry, FantasyPlayer, MarketPlayer } from '../src/features/fantasy/api';
import { LineupEditor } from '../src/features/fantasy/LineupEditor';
import { TransferMarket } from '../src/features/fantasy/TransferMarket';
import { ChipActivationPanel } from '../src/features/fantasy/ChipActivationPanel';
import { activateChip, getPlayerMarket, getTransferHistory, processTransfer, saveLineup } from '../src/features/fantasy/api';

jest.mock('../src/lib/theme', () => ({
  useMobileTheme: () => ({ colors: { onAccent: '#ffffff', placeholder: '#999999' } }),
}));

jest.mock('../src/features/fantasy/api', () => ({
  activateChip: jest.fn(),
  getPlayerMarket: jest.fn(),
  getTransferHistory: jest.fn(),
  processTransfer: jest.fn(),
  saveLineup: jest.fn(),
}));

const mockedSaveLineup = jest.mocked(saveLineup);
const mockedProcessTransfer = jest.mocked(processTransfer);
const mockedActivateChip = jest.mocked(activateChip);
const mockedGetPlayerMarket = jest.mocked(getPlayerMarket);
const mockedGetTransferHistory = jest.mocked(getTransferHistory);
let queryClients: QueryClient[] = [];

function createPlayer(id: number, role: string): FantasyPlayer {
  return {
    id,
    name: `Player ${id}`,
    in_game_name: null,
    primary_role: role,
    professional_teams: null,
    availability_status: 'available',
    availability_reason: null,
    current_price: 10,
    last_gw_points: 5,
    recent_points: 12,
  };
}

function createLineupEntry(
  player: FantasyPlayer,
  slot: string,
  isCaptain = false,
  isViceCaptain = false,
): FantasyLineupEntry {
  return {
    player_id: player.id,
    slot,
    is_starter: !slot.startsWith('bench'),
    is_captain: isCaptain,
    is_vice_captain: isViceCaptain,
    professional_players: player,
  };
}

const startingPlayers = [
  createPlayer(1, 'carry'),
  createPlayer(2, 'mid'),
  createPlayer(3, 'offlane'),
  createPlayer(4, 'support'),
  createPlayer(5, 'hard_support'),
];

function createContext(overrides: Partial<FantasyContext> = {}): FantasyContext {
  const lineup = [
    createLineupEntry(startingPlayers[0], 'carry', true),
    createLineupEntry(startingPlayers[1], 'mid', false, true),
    createLineupEntry(startingPlayers[2], 'offlane'),
    createLineupEntry(startingPlayers[3], 'support'),
    createLineupEntry(startingPlayers[4], 'hard_support'),
  ];
  return {
    fantasySeasonId: 12,
    seasonId: 3,
    budget: 100,
    freeTransfers: 1,
    totalPoints: 0,
    globalRank: null,
    gameweek: {
      id: 24,
      gameweekNumber: 7,
      deadline: null,
      status: 'upcoming',
      isLocked: false,
      hasUpcoming: true,
    },
    chips: {
      tripleCaptainUsed: false,
      tripleCaptainGameweekId: null,
      benchBoostUsed: false,
      benchBoostGameweekId: null,
      wildcardUsed: false,
      wildcardUsedGameweekId: null,
    },
    lineup,
    ownedPlayers: startingPlayers,
    ...overrides,
  };
}

function renderWithQueryClient(element: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  queryClients.push(queryClient);
  return render(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>);
}

function confirmAlertAction(buttonLabel: string) {
  const [, , buttons] = jest.mocked(Alert.alert).mock.calls.at(-1) ?? [];
  const button = buttons?.find((candidate) => candidate.text === buttonLabel);
  if (!button?.onPress) throw new Error(`Confirmation action ${buttonLabel} was not displayed.`);
  button.onPress();
}

describe('fantasy management components', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    queryClients = [];
    mockedSaveLineup.mockReset();
    mockedProcessTransfer.mockReset();
    mockedActivateChip.mockReset();
    mockedGetPlayerMarket.mockReset();
    mockedGetTransferHistory.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      queryClients.forEach((queryClient) => queryClient.clear());
    });
    jest.restoreAllMocks();
  });

  it('saves the selected captain and vice-captain only after lineup edits', async () => {
    mockedSaveLineup.mockResolvedValue();
    const context = createContext();
    const view = renderWithQueryClient(<LineupEditor context={context} userId="manager-1" />);

    expect(view.getByRole('button', { name: 'Save lineup' }).props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(view.getAllByRole('button', { name: 'Captain' })[1]);
    expect(view.getByRole('button', { name: 'Save lineup' }).props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(view.getByRole('button', { name: 'Save lineup' }));

    await waitFor(() => expect(mockedSaveLineup).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(view.getByText('Lineup saved successfully.')).toBeTruthy());
    await waitFor(() => expect(queryClients[0].isMutating()).toBe(0));
    expect(mockedSaveLineup).toHaveBeenCalledWith({
      fantasySeasonId: 12,
      gameweekId: 24,
      lineup: expect.arrayContaining([
        expect.objectContaining({ playerId: 2, slot: 'mid', isCaptain: true, isViceCaptain: false }),
        expect.objectContaining({ playerId: 1, slot: 'carry', isCaptain: false, isViceCaptain: true }),
      ]),
    }, expect.any(Object));
  });

  it('requires confirmation before submitting a role-matched transfer', async () => {
    const incoming: MarketPlayer = {
      id: 10,
      name: 'Replacement Carry',
      in_game_name: null,
      primary_role: 'carry',
      availability_status: 'available',
      current_price: 10,
      recent_points: 8,
    };
    mockedGetPlayerMarket.mockResolvedValue([incoming]);
    mockedGetTransferHistory.mockResolvedValue([]);
    mockedProcessTransfer.mockResolvedValue({
      budget: 100,
      freeTransfersRemaining: 0,
      penaltyPoints: 0,
    });
    const view = renderWithQueryClient(<TransferMarket context={createContext()} userId="manager-1" />);

    await fireEvent.press(view.getByText('Player 1'));
    await waitFor(() => expect(view.getByText('Replacement Carry')).toBeTruthy());
    await fireEvent.press(view.getByText('Replacement Carry'));
    await fireEvent.press(view.getByRole('button', { name: 'Review transfer' }));

    expect(mockedProcessTransfer).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Confirm transfer',
      expect.stringContaining('Transfer out Player 1 and bring in Replacement Carry?'),
      expect.any(Array),
    );

    confirmAlertAction('Confirm transfer');
    await waitFor(() => expect(mockedProcessTransfer).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith(
      'Transfer completed',
      'Your squad has been updated. Penalty: 0 points.',
    ));
    await waitFor(() => expect(queryClients[0].isMutating()).toBe(0));
    expect(mockedProcessTransfer).toHaveBeenCalledWith({
      fantasySeasonId: 12,
      transfersIn: [10],
      transfersOut: [1],
    }, expect.any(Object));
  });

  it('requires explicit irreversible-action confirmation before activating a chip', async () => {
    mockedActivateChip.mockResolvedValue({ message: 'Triple Captain activated.', gameweekId: 24 });
    const view = renderWithQueryClient(<ChipActivationPanel context={createContext()} userId="manager-1" />);

    await fireEvent.press(view.getAllByRole('button', { name: 'Activate' })[0]);
    expect(mockedActivateChip).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Activate Triple Captain?',
      expect.stringContaining('This action cannot be undone.'),
      expect.any(Array),
    );

    confirmAlertAction('Activate chip');
    await waitFor(() => expect(mockedActivateChip).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith(
      'Chip activated',
      'Triple Captain activated.',
    ));
    await waitFor(() => expect(queryClients[0].isMutating()).toBe(0));
    expect(mockedActivateChip).toHaveBeenCalledWith({
      fantasySeasonId: 12,
      chip: 'triple-captain',
    }, expect.any(Object));
  });
});
