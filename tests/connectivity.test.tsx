import React from 'react';
import * as Network from 'expo-network';
import { onlineManager } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  ConnectivityProvider,
  isNetworkOnline,
  NetworkStatusBanner,
} from '../src/lib/connectivity';
import { queryClient } from '../src/lib/query-client';

jest.mock('expo-network', () => ({
  addNetworkStateListener: jest.fn(),
  getNetworkStateAsync: jest.fn(),
}));

const getNetworkState = jest.mocked(Network.getNetworkStateAsync);
const addNetworkStateListener = jest.mocked(Network.addNetworkStateListener);
let networkStateListener: ((state: Network.NetworkState) => void) | null = null;

describe('mobile connectivity handling', () => {
  beforeEach(() => {
    networkStateListener = null;
    getNetworkState.mockReset().mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
    addNetworkStateListener.mockReset().mockImplementation((listener) => {
      networkStateListener = listener;
      return { remove: jest.fn() };
    });
  });

  afterEach(() => {
    onlineManager.setOnline(true);
  });

  it('distinguishes offline, online, and unknown network states', () => {
    expect(isNetworkOnline({ isConnected: false, isInternetReachable: false })).toBe(false);
    expect(isNetworkOnline({ isConnected: true, isInternetReachable: true })).toBe(true);
    expect(isNetworkOnline({})).toBeNull();
  });

  it('shows an offline notice and resumes query connectivity when the device reconnects', async () => {
    getNetworkState.mockResolvedValueOnce({
      isConnected: false,
      isInternetReachable: false,
    });
    const view = render(
      <ConnectivityProvider>
        <NetworkStatusBanner />
      </ConnectivityProvider>
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await waitFor(() => expect(view.getByText(/You are offline/)).toBeTruthy());
    expect(onlineManager.isOnline()).toBe(false);

    await act(async () => {
      networkStateListener?.({
        isConnected: true,
        isInternetReachable: true,
      });
    });
    await waitFor(() => expect(view.queryByText(/You are offline/)).toBeNull());
    expect(onlineManager.isOnline()).toBe(true);
  });

  it('surfaces network status errors and allows retrying the connection check', async () => {
    getNetworkState.mockRejectedValueOnce(new Error('Network probe failed'));
    const view = render(
      <ConnectivityProvider>
        <NetworkStatusBanner />
      </ConnectivityProvider>
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await waitFor(() => expect(view.getByText(/Network probe failed/)).toBeTruthy());
    getNetworkState.mockResolvedValueOnce({
      isConnected: true,
      isInternetReachable: true,
    });
    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: 'Retry' }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => expect(view.queryByText(/Connection status unavailable/)).toBeNull());
    expect(onlineManager.isOnline()).toBe(true);
  });

  it('keeps a network-listener registration failure visible after the initial check succeeds', async () => {
    addNetworkStateListener.mockImplementation(() => {
      throw new Error('Network listener failed');
    });
    const view = render(
      <ConnectivityProvider>
        <NetworkStatusBanner />
      </ConnectivityProvider>
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(view.getByText(/Network listener failed/)).toBeTruthy();
  });

  it('does not queue mutations for automatic execution after reconnection', () => {
    expect(queryClient.getDefaultOptions().mutations?.networkMode).toBe('always');
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false);
  });
});
