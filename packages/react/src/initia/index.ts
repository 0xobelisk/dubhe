/**
 * @0xobelisk/react/initia - Initia blockchain integration (Coming Soon)
 *
 * This module will provide React hooks and components for Initia blockchain development.
 * Currently under development.
 */

export const InitiaNotice = {
  message: 'Initia integration coming soon! Stay tuned for updates.',
  status: 'development',
  estimatedRelease: 'Q3 2024'
} as const;

// Placeholder exports for future Initia integration
export type InitiaConfig = {
  network: 'mainnet' | 'testnet' | 'devnet';
  rpcUrl?: string;
  chainId?: string;
};

export type InitiaState = {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  account: string | null;
  network: string | null;
};

// Placeholder hooks (will be implemented in future versions)
export function useInitia(): InitiaState {
  console.warn('useInitia is not yet implemented. Initia integration coming soon!');
  return {
    status: 'disconnected',
    account: null,
    network: null
  };
}

export function useInitiaConnection() {
  console.warn('useInitiaConnection is not yet implemented. Initia integration coming soon!');
  return {
    connect: () => Promise.reject(new Error('Initia integration not implemented yet')),
    disconnect: () => Promise.reject(new Error('Initia integration not implemented yet')),
    isConnecting: false
  };
}

export function useInitiaContract() {
  console.warn('useInitiaContract is not yet implemented. Initia integration coming soon!');
  return null;
}

// Re-export notice for easy access
export default InitiaNotice;