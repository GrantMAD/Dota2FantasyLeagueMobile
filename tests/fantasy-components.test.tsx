import React from 'react';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type {
  FantasyContext,
  FantasyLineupEntry,
  FantasyPlayer,
  MarketPlayer,
  TransferSuggestionResult,
} from '../src/features/fantasy/api';
import { LineupEditor } from '../src/features/fantasy/LineupEditor';
import { SquadBuilder } from '../src/features/fantasy/SquadBuilder';
import { TransferMarket } from '../src/features/fantasy/TransferMarket';
import { ChipActivationPanel } from '../src/features/fantasy/ChipActivationPanel';
import { WildcardPanel } from '../src/features/fantasy/WildcardPanel';
import {
  activateChip,
  activateWildcard,
  getPlayerMarket,
  getTransferHistory,
  getTransferSuggestions,
  processTransfer,
  saveLineup,
} from '../src/features/fantasy/api';
import { getProfessionalTeams } from '../src/features/players/api';

jest.mock('../src/lib/theme', () => ({
  useMobileTheme: () => ({ colors: { onAccent: '#ffffff', placeholder: '#999999' } }),
}));

jest.mock('../src/features/fantasy/api', () => ({
  activateChip: jest.fn(),
  activateWildcard: jest.fn(),
  getPlayerMarket: jest.fn(),
  getTransferHistory: jest.fn(),
  getTransferSuggestions: jest.fn(),
  processTransfer: jest.fn(),
  saveLineup: jest.fn(),
}));

jest.mock('../src/features/players/api', () => ({
  getProfessionalTeams: jest.fn(),
}));

const mockedSaveLineup = jest.mocked(saveLineup);
const mockedProcessTransfer = jest.mocked(processTransfer);
const mockedActivateChip = jest.mocked(activateChip);
const mockedActivateWildcard = jest.mocked(activateWildcard);
const mockedGetPlayerMarket = jest.mocked(getPlayerMarket);
const mockedGetTransferHistory = jest.mocked(getTransferHistory);
const mockedGetTransferSuggestions = jest.mocked(getTransferSuggestions);
const mockedGetProfessionalTeams = jest.mocked(getProfessionalTeams);
let queryClients: QueryClient[] = [];

function createPlayer(id: number, role: string): FantasyPlayer {
  return {
    id,
    name: `Player ${id}`,
    in_game_name: null,
    primary_role: role,
    profile_image_url: null,
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

function createMarketPlayer(id: number, role: string, name = `Market Player ${id}`): MarketPlayer {
  return {
    id,
    name,
    in_game_name: null,
    primary_role: role,
    profile_image_url: null,
    availability_status: 'available',
    professional_teams: null,
    current_price: 10,
    recent_points: 12,
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
    defaultGameweekId: 24,
    availableGameweeks: [{
      id: 24,
      gameweekNumber: 7,
      deadline: null,
      status: 'upcoming',
      isLocked: false,
    }],
    chips: {
      tripleCaptainUsed: false,
      tripleCaptainGameweekId: null,
      benchBoostUsed: false,
      benchBoostGameweekId: null,
      wildcardUsed: false,
      wildcardUsedGameweekId: null,
      wildcardUsedGameweekNumber: null,
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

async function selectProfessionalTeam(view: ReturnType<typeof render>, teamName = 'Radiant') {
  await waitFor(() => {
    expect(view.getByRole('button', { name: 'Filter by professional team' })).toBeTruthy();
  });
  await fireEvent.press(view.getByRole('button', { name: 'Filter by professional team' }));
  await waitFor(() => {
    expect(view.getByRole('button', { name: teamName })).toBeTruthy();
  });
  await fireEvent.press(view.getByRole('button', { name: teamName }));
}

describe('fantasy management components', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    queryClients = [];
    mockedSaveLineup.mockReset();
    mockedProcessTransfer.mockReset();
    mockedActivateChip.mockReset();
    mockedActivateWildcard.mockReset();
    mockedGetPlayerMarket.mockReset();
    mockedGetTransferHistory.mockReset();
    mockedGetTransferSuggestions.mockReset().mockResolvedValue({
      gameweekNumber: 7,
      status: 'no_recommendations',
      completedGameweeks: 3,
      requiredGameweeks: 3,
      pricedRoleMatchedCandidates: 4,
      recommendations: [],
    });
    mockedGetProfessionalTeams.mockReset().mockResolvedValue([
      { id: 8, name: 'Radiant', logo_url: null },
      { id: 9, name: 'Dire', logo_url: null },
    ]);
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

    expect(view.getByText('C')).toBeTruthy();
    expect(view.getByText('VC')).toBeTruthy();
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

  it('shows player avatars in lineup slots and the player picker', async () => {
    const avatarPlayer = {
      ...startingPlayers[0],
      profile_image_url: 'https://images.example.test/carry.png',
    };
    const context = createContext({
      ownedPlayers: [avatarPlayer, ...startingPlayers.slice(1)],
    });
    const view = renderWithQueryClient(<LineupEditor context={context} userId="manager-1" />);

    expect(view.getByLabelText('Player 1 avatar')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Choose Bench 1 player' }));
    expect(view.getAllByLabelText('Player 1 avatar')).toHaveLength(2);
  });

  it('requires confirmation before saving within two hours of the deadline', async () => {
    mockedSaveLineup.mockResolvedValue();
    const deadline = new Date(Date.now() + 90 * 60 * 1000).toISOString();
    const context = createContext({
      gameweek: {
        id: 24,
        gameweekNumber: 7,
        deadline,
        status: 'active',
        isLocked: false,
        hasUpcoming: true,
      },
    });
    const view = renderWithQueryClient(<LineupEditor context={context} userId="manager-1" />);

    await fireEvent.press(view.getAllByRole('button', { name: 'Captain' })[1]);
    await fireEvent.press(view.getByRole('button', { name: 'Save lineup' }));

    expect(mockedSaveLineup).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Deadline approaching',
      expect.stringMatching(/Deadline is in 1h \d+m for Gameweek 7/),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Keep editing', style: 'cancel' }),
        expect.objectContaining({ text: 'Save lineup', onPress: expect.any(Function) }),
      ]),
    );

    await act(async () => confirmAlertAction('Save lineup'));
    await waitFor(() => expect(mockedSaveLineup).toHaveBeenCalledTimes(1));
  });

  it('does not submit if the deadline has passed since context loaded', async () => {
    const context = createContext({
      gameweek: {
        id: 24,
        gameweekNumber: 7,
        deadline: new Date(Date.now() - 60_000).toISOString(),
        status: 'active',
        isLocked: false,
        hasUpcoming: true,
      },
    });
    const view = renderWithQueryClient(<LineupEditor context={context} userId="manager-1" />);

    await fireEvent.press(view.getAllByRole('button', { name: 'Captain' })[1]);
    await fireEvent.press(view.getByRole('button', { name: 'Save lineup' }));

    expect(mockedSaveLineup).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Deadline passed',
      'This gameweek is now locked. Refresh your team to see the latest lineup status.',
    );
    expect(view.getByText('The gameweek deadline has passed. Refresh your team to check the locked lineup.')).toBeTruthy();
  });

  it('requires confirmation before submitting a role-matched transfer', async () => {
    const incoming: MarketPlayer = {
      id: 10,
      name: 'Replacement Carry',
      in_game_name: null,
      primary_role: 'carry',
      profile_image_url: null,
      availability_status: 'available',
      professional_teams: null,
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

    await selectProfessionalTeam(view);
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

  it('shows avatars and key details on outgoing player cards', async () => {
    const avatarPlayer = {
      ...startingPlayers[0],
      profile_image_url: 'https://images.example.test/carry.png',
      professional_teams: { id: 8, name: 'Radiant', slug: 'radiant' },
    };
    mockedGetPlayerMarket.mockResolvedValue([]);
    mockedGetTransferHistory.mockResolvedValue([]);
    mockedGetProfessionalTeams.mockResolvedValue([
      { id: 8, name: 'Radiant', logo_url: null },
    ]);
    const view = renderWithQueryClient(
      <TransferMarket
        context={createContext({ ownedPlayers: [avatarPlayer, ...startingPlayers.slice(1)] })}
        userId="manager-1"
      />,
    );

    expect(view.getByLabelText('Player 1 avatar')).toBeTruthy();
    expect(view.getByText('Radiant')).toBeTruthy();
    expect(view.getByText('carry')).toBeTruthy();
    expect(view.getAllByText('10.0M').length).toBeGreaterThan(0);
    await waitFor(() => expect(view.getByText('Choose a professional team above to see eligible replacement players.')).toBeTruthy());
    await fireEvent.press(view.getByRole('button', { name: /Sell Player 1/ }));
    expect(view.getByText('Selected')).toBeTruthy();
  });

  it('previews estimated bank and warns when no free transfers remain', async () => {
    const incoming: MarketPlayer = {
      id: 11,
      name: 'Higher Priced Carry',
      in_game_name: null,
      primary_role: 'carry',
      profile_image_url: null,
      availability_status: 'available',
      professional_teams: null,
      current_price: 12,
      recent_points: 8,
    };
    mockedGetPlayerMarket.mockResolvedValue([incoming]);
    mockedGetTransferHistory.mockResolvedValue([]);
    const view = renderWithQueryClient(
      <TransferMarket context={createContext({ freeTransfers: 0 })} userId="manager-1" />,
    );

    await selectProfessionalTeam(view);
    await fireEvent.press(view.getByText('Player 1'));
    await waitFor(() => expect(view.getByText('Higher Priced Carry')).toBeTruthy());
    await fireEvent.press(view.getByText('Higher Priced Carry'));

    expect(view.getByText('Estimated bank after swap: 98.0M')).toBeTruthy();
    expect(view.getByText(/No free transfers remain; a transfer hit may apply/)).toBeTruthy();
  });

  it('filters transfer candidates by professional team through the market query', async () => {
    const radiantPlayer = {
      ...createMarketPlayer(50, 'carry', 'Radiant Carry'),
      profile_image_url: 'https://images.example.test/radiant-carry.png',
      ownership_percentage: 42.5,
      professional_teams: { id: 8, name: 'Radiant', logo_url: null },
    };
    const direPlayer = {
      ...createMarketPlayer(51, 'carry', 'Dire Carry'),
      professional_teams: { id: 9, name: 'Dire', logo_url: null },
    };
    mockedGetPlayerMarket.mockImplementation(async (_search, teamId) =>
      teamId === 8 ? [radiantPlayer] : [radiantPlayer, direPlayer]
    );
    mockedGetTransferHistory.mockResolvedValue([]);

    const view = renderWithQueryClient(<TransferMarket context={createContext()} userId="manager-1" />);
    expect(view.getByText('Choose a professional team above to see eligible replacement players.')).toBeTruthy();
    expect(view.getByText('Choose a professional team below to view transfer recommendations.')).toBeTruthy();
    await waitFor(() => expect(view.getByRole('button', { name: 'Filter by professional team' })).toBeTruthy());
    expect(mockedGetPlayerMarket).not.toHaveBeenCalled();
    await fireEvent.press(view.getByRole('button', { name: 'Filter by professional team' }));
    expect(view.queryByText('All teams')).toBeNull();
    await waitFor(() => expect(view.getByRole('button', { name: 'Radiant' })).toBeTruthy());
    await fireEvent.press(view.getByRole('button', { name: 'Radiant' }));

    await waitFor(() => expect(mockedGetPlayerMarket).toHaveBeenCalledWith('', 8));
    await waitFor(() => expect(view.getByText('Radiant Carry')).toBeTruthy());
    expect(view.getByText('Radiant Carry')).toBeTruthy();
    expect(view.getByText('Sort by')).toBeTruthy();
    expect(view.getByRole('button', { name: /Price/ })).toBeTruthy();
    expect(view.getByRole('button', { name: /Recent form/ })).toBeTruthy();
    expect(view.getByRole('button', { name: /Ownership/ })).toBeTruthy();
    expect(view.getByText('42.5%')).toBeTruthy();
    expect(view.getByLabelText('Radiant Carry avatar')).toBeTruthy();
    expect(view.getAllByText('Radiant').length).toBeGreaterThan(0);
    expect(view.queryByText('Dire Carry')).toBeNull();
    expect(view.getByText('Clear')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Clear professional team filter' }));
    expect(view.getByText('Choose a professional team above to see eligible replacement players.')).toBeTruthy();
  });

  it('preselects the suggested outgoing and incoming players for review', async () => {
    const incoming = createMarketPlayer(10, 'carry', 'Suggested Replacement');
    mockedGetPlayerMarket.mockImplementation(async (search) =>
      search === 'Suggested Replacement' ? [incoming] : []
    );
    mockedGetTransferSuggestions.mockResolvedValue({
      gameweekNumber: 7,
      status: 'available',
      completedGameweeks: 3,
      requiredGameweeks: 3,
      pricedRoleMatchedCandidates: 4,
      recommendations: [{
        playerOutId: 1,
        playerOutName: 'Player 1',
        playerOutRole: 'carry',
        playerInId: 10,
        playerInName: 'Suggested Replacement',
        playerInRole: 'carry',
        playerInCurrentPrice: 10,
        budgetAfter: 100,
        reasons: ['The replacement has better recent form.'],
      }],
    } satisfies TransferSuggestionResult);
    mockedProcessTransfer.mockResolvedValue({
      budget: 100,
      freeTransfersRemaining: 0,
      penaltyPoints: 0,
    });
    mockedGetTransferHistory.mockResolvedValue([]);
    const view = renderWithQueryClient(<TransferMarket context={createContext()} userId="manager-1" />);

    await selectProfessionalTeam(view);
    await waitFor(() => expect(view.getByRole('button', { name: 'Select this swap' })).toBeTruthy());
    await fireEvent.press(view.getByRole('button', { name: 'Select this swap' }));
    await waitFor(() => expect(view.getByText('Selected as replacement')).toBeTruthy());
    expect(view.getAllByText('Suggested Replacement').length).toBeGreaterThan(0);
    await fireEvent.press(view.getByRole('button', { name: 'Review transfer' }));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Confirm transfer',
      expect.stringContaining('Transfer out Player 1 and bring in Suggested Replacement?'),
      expect.any(Array),
    );
    expect(mockedProcessTransfer).not.toHaveBeenCalled();
    await act(async () => confirmAlertAction('Confirm transfer'));
    await waitFor(() => expect(mockedProcessTransfer).toHaveBeenCalledWith({
      fantasySeasonId: 12,
      transfersIn: [10],
      transfersOut: [1],
    }, expect.any(Object)));
  });

  it('explains both missing gameweek history and missing priced replacements', async () => {
    mockedGetTransferSuggestions.mockResolvedValue({
      gameweekNumber: 3,
      status: 'insufficient_history',
      completedGameweeks: 1,
      requiredGameweeks: 3,
      pricedRoleMatchedCandidates: 0,
      recommendations: [],
    });
    mockedGetPlayerMarket.mockResolvedValue([]);
    mockedGetTransferHistory.mockResolvedValue([]);
    const view = renderWithQueryClient(<TransferMarket context={createContext()} userId="manager-1" />);

    await selectProfessionalTeam(view);
    await waitFor(() => expect(view.getByText('More scoring history is needed: 1 of 3 gameweeks are complete.')).toBeTruthy());
    expect(view.getByText('No available same-role replacements have a price recorded for the upcoming gameweek yet.')).toBeTruthy();
  });

  it('pins and selects the quick-added player in the squad builder without filtering other players', async () => {
    const quickAddPlayer = createMarketPlayer(20, 'carry', 'Quick Carry');
    const otherPlayer = createMarketPlayer(21, 'mid', 'Another Player');
    mockedGetPlayerMarket.mockImplementation(async (search) =>
      search === 'Quick Carry' ? [quickAddPlayer] : [otherPlayer]
    );

    const view = renderWithQueryClient(
      <SquadBuilder
        context={createContext({ ownedPlayers: startingPlayers.slice(0, 4) })}
        userId="manager-1"
        quickAddPlayerId={20}
        quickAddPlayerName="Quick Carry"
      />
    );

    await waitFor(() => expect(view.getByText('Selected for your squad')).toBeTruthy());
    expect(view.getByText('Quick Carry')).toBeTruthy();
    expect(view.getByText('Another Player')).toBeTruthy();
  });

  it('filters squad-building candidates by role', async () => {
    const carry = createMarketPlayer(30, 'carry', 'Market Carry');
    const hardSupport = createMarketPlayer(31, 'hard_support', 'Market Hard Support');
    mockedGetPlayerMarket.mockResolvedValue([carry, hardSupport]);

    const view = renderWithQueryClient(
      <SquadBuilder
        context={createContext({ ownedPlayers: startingPlayers.slice(0, 4) })}
        userId="manager-1"
      />,
    );
    await waitFor(() => expect(view.getByText('Market Carry')).toBeTruthy());
    await fireEvent.press(view.getByRole('button', { name: 'hard support' }));

    expect(view.getByText('Market Hard Support')).toBeTruthy();
    expect(view.queryByText('Market Carry')).toBeNull();
  });

  it('pins and preselects the quick-added player in the transfer market', async () => {
    const quickAddPlayer = createMarketPlayer(20, 'carry', 'Quick Carry');
    mockedGetPlayerMarket.mockImplementation(async (search) =>
      search === 'Quick Carry' ? [quickAddPlayer] : []
    );
    mockedGetTransferHistory.mockResolvedValue([]);

    const view = renderWithQueryClient(
      <TransferMarket
        context={createContext()}
        userId="manager-1"
        quickAddPlayerId={20}
        quickAddPlayerName="Quick Carry"
      />
    );

    await selectProfessionalTeam(view);
    await waitFor(() => expect(view.getByText('Selected as replacement')).toBeTruthy());
    expect(view.getByText('Quick Carry')).toBeTruthy();
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

  it('shows the used Wildcard gameweek and next-season availability', () => {
    const context = createContext({
      chips: {
        ...createContext().chips,
        wildcardUsed: true,
        wildcardUsedGameweekId: 18,
        wildcardUsedGameweekNumber: 4,
      },
    });
    const view = renderWithQueryClient(<WildcardPanel context={context} userId="manager-1" />);

    expect(view.getByText('Used in Gameweek 4. Your Wildcard is available again next season.')).toBeTruthy();
    expect(view.getByText('Used')).toBeTruthy();
  });

  it('includes the activated gameweek and next-season availability in the confirmation', async () => {
    mockedActivateWildcard.mockResolvedValue({ message: 'Wildcard activated.', gameweekId: 24 });
    const view = renderWithQueryClient(
      <WildcardPanel context={createContext()} userId="manager-1" />
    );

    await fireEvent.press(view.getByRole('button', { name: 'Activate Wildcard' }));
    confirmAlertAction('Activate Wildcard');

    await waitFor(() => expect(mockedActivateWildcard).toHaveBeenCalledWith({
      fantasySeasonId: 12,
    }, expect.any(Object)));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith(
      'Wildcard activated',
      'Wildcard activated. Used in Gameweek 7. Your Wildcard can be used once per season and is available again next season.',
    ));
  });
});
